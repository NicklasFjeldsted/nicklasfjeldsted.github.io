using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Domain;
using Mvo.Application.Features.Pages;

namespace Mvo.Application.Features.Sections;

public record CreateSectionCommand(int PageId, string Title, SectionTypeId SectionType) : IRequest<SectionContentDto>;

public class CreateSectionValidator : AbstractValidator<CreateSectionCommand>
{
    public CreateSectionValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.Title).RequiredText(SectionRules.TitleMax);
        RuleFor(x => x.SectionType).IsInEnum();
    }
}

public class CreateSectionHandler(IAppDbContext db, SectionContentLoader loader)
    : IRequestHandler<CreateSectionCommand, SectionContentDto>
{
    public async Task<SectionContentDto> Handle(CreateSectionCommand request, CancellationToken cancellationToken)
    {
        var page = await db.Pages.FirstOrDefaultAsync(p => p.Id == request.PageId, cancellationToken)
            ?? throw new NotFoundException($"Page {request.PageId} was not found.");
        if (!page.IsManaged) throw new ConflictException("This page is not managed by the content system.");

        var lastOrder = await db.Sections.Where(s => s.PageId == page.Id)
            .Select(s => (int?)s.DisplayOrder).MaxAsync(cancellationToken) ?? 0;

        var section = new ContentSection
        {
            PageId = page.Id,
            SectionTypeId = request.SectionType,
            Title = request.Title.Trim(),
            Description = "",
            DisplayOrder = lastOrder + 1,
            IsPublished = false,
        };
        db.Sections.Add(section);
        page.Version++;

        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await loader.LoadAsync(page.Id, section.Id, cancellationToken);
    }
}

public record DeleteSectionCommand(int PageId, int SectionId, int ExpectedVersion) : IRequest;

public class DeleteSectionValidator : AbstractValidator<DeleteSectionCommand>
{
    public DeleteSectionValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.SectionId).RequiredId();
    }
}

public class DeleteSectionHandler(IAppDbContext db) : IRequestHandler<DeleteSectionCommand>
{
    public async Task Handle(DeleteSectionCommand request, CancellationToken cancellationToken)
    {
        var section = await db.GetForUpdateAsync(request.PageId, request.SectionId, request.ExpectedVersion, true, true, cancellationToken);

        db.GalleryImages.RemoveRange(section.Gallery);
        db.SectionDetails.RemoveRange(section.Details);
        db.Sections.Remove(section);

        var siblings = await db.Sections.Where(s => s.PageId == request.PageId && s.Id != section.Id)
            .OrderBy(s => s.DisplayOrder).ToListAsync(cancellationToken);
        for (var i = 0; i < siblings.Count; i++) siblings[i].DisplayOrder = i + 1;

        await db.SaveWithConcurrencyAsync(cancellationToken);
    }
}

public record ReorderSectionsCommand(int PageId, int ExpectedPageVersion, IReadOnlyList<int> OrderedSectionIds)
    : IRequest<PageDetailDto>;

public class ReorderSectionsValidator : AbstractValidator<ReorderSectionsCommand>
{
    public ReorderSectionsValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.OrderedSectionIds).NotEmpty();
        RuleForEach(x => x.OrderedSectionIds).RequiredId();
        RuleFor(x => x.OrderedSectionIds).Must(ids => ids.Distinct().Count() == ids.Count)
            .WithMessage("The ordering contains duplicate section ids.");
    }
}

public class ReorderSectionsHandler(IAppDbContext db, IMediator mediator)
    : IRequestHandler<ReorderSectionsCommand, PageDetailDto>
{
    public async Task<PageDetailDto> Handle(ReorderSectionsCommand request, CancellationToken cancellationToken)
    {
        var page = await db.Pages.Include(p => p.Sections).FirstOrDefaultAsync(p => p.Id == request.PageId, cancellationToken)
            ?? throw new NotFoundException($"Page {request.PageId} was not found.");
        if (page.Version != request.ExpectedPageVersion)
            throw new ConflictException("The page was changed by someone else. Reload it and try again.");

        if (!page.Sections.Select(s => s.Id).ToHashSet().SetEquals(request.OrderedSectionIds))
            throw new ValidationException(nameof(request.OrderedSectionIds) + " must contain exactly the sections of this page.");

        var position = 1;
        foreach (var id in request.OrderedSectionIds)
            page.Sections.First(s => s.Id == id).DisplayOrder = position++;
        page.Version++;

        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await mediator.Send(new GetPageQuery(page.Id), cancellationToken);
    }
}
