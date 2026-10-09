using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Features.Sections;

namespace Mvo.Application.Features.Pages;

public record PageListItemDto(int Id, string Slug, string Name, bool IsManaged, int SectionCount);

public record PageDetailDto(
    int Id, string Slug, string Name, string? Eyebrow, string Heading, string Introduction, int Version,
    IReadOnlyList<SectionListItemDto> Sections);

public record GetPagesQuery : IRequest<IReadOnlyList<PageListItemDto>>;

public class GetPagesHandler(IAppDbContext db) : IRequestHandler<GetPagesQuery, IReadOnlyList<PageListItemDto>>
{
    public async Task<IReadOnlyList<PageListItemDto>> Handle(GetPagesQuery request, CancellationToken cancellationToken) =>
        await db.Pages.AsNoTracking().OrderBy(p => p.Id)
            .Select(p => new PageListItemDto(p.Id, p.Slug, p.Name, p.IsManaged, p.Sections.Count))
            .ToListAsync(cancellationToken);
}

public record GetPageQuery(int PageId) : IRequest<PageDetailDto>;

public class GetPageValidator : AbstractValidator<GetPageQuery>
{
    public GetPageValidator() => RuleFor(x => x.PageId).RequiredId();
}

public class GetPageHandler(IAppDbContext db) : IRequestHandler<GetPageQuery, PageDetailDto>
{
    public async Task<PageDetailDto> Handle(GetPageQuery request, CancellationToken cancellationToken)
    {
        var page = await db.Pages.AsNoTracking()
            .Where(p => p.Id == request.PageId)
            .Select(p => new
            {
                p.Id, p.Slug, p.Name, p.Eyebrow, p.Heading, p.Introduction, p.Version,
                Sections = p.Sections.OrderBy(s => s.DisplayOrder)
                    .Select(s => new { s.Id, s.Title, Type = s.SectionTypeId, s.DisplayOrder, s.IsPublished, s.Version })
                    .ToList(),
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException($"Page {request.PageId} was not found.");

        var sections = page.Sections
            .Select(s => new SectionListItemDto(s.Id, s.Title, s.Type.ToString(), s.DisplayOrder, s.IsPublished, s.Version))
            .ToList();

        return new PageDetailDto(page.Id, page.Slug, page.Name, page.Eyebrow, page.Heading, page.Introduction, page.Version, sections);
    }
}

public record UpdatePageTextCommand(int PageId, int ExpectedVersion, string? Eyebrow, string Heading, string Introduction)
    : IRequest<PageDetailDto>;

public class UpdatePageTextValidator : AbstractValidator<UpdatePageTextCommand>
{
    public UpdatePageTextValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.Eyebrow).OptionalText(SectionRules.ShortTextMax);
        RuleFor(x => x.Heading).RequiredText(SectionRules.TitleMax);
        RuleFor(x => x.Introduction).RequiredText(SectionRules.LongTextMax);
    }
}

public class UpdatePageTextHandler(IAppDbContext db, IMediator mediator) : IRequestHandler<UpdatePageTextCommand, PageDetailDto>
{
    public async Task<PageDetailDto> Handle(UpdatePageTextCommand request, CancellationToken cancellationToken)
    {
        var page = await db.Pages.FirstOrDefaultAsync(p => p.Id == request.PageId, cancellationToken)
            ?? throw new NotFoundException($"Page {request.PageId} was not found.");

        if (!page.IsManaged) throw new ConflictException("This page is not managed by the content system.");
        if (page.Version != request.ExpectedVersion)
            throw new ConflictException("The page was changed by someone else. Reload it and try again.");

        page.Eyebrow = string.IsNullOrWhiteSpace(request.Eyebrow) ? null : request.Eyebrow.Trim();
        page.Heading = request.Heading.Trim();
        page.Introduction = request.Introduction.Trim();
        page.Version++;

        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await mediator.Send(new GetPageQuery(page.Id), cancellationToken);
    }
}
