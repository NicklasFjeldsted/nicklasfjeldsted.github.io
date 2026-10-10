using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;

namespace Mvo.Application.Features.Public;

public record PublicImageDto(string Id, string Url, string Alt);

public record PublicSectionDto(
    string Id, string Title, string? Eyebrow, string? Introduction, string Description, string? AdditionalDescription,
    IReadOnlyList<string> Details, PublicImageDto? PrimaryImage, IReadOnlyList<PublicImageDto> Gallery, int DisplayOrder);

public record PublicPageDto(string? Eyebrow, string Heading, string Introduction, IReadOnlyList<PublicSectionDto> Sections);

public record GetPublicPageQuery(string Slug) : IRequest<PublicPageDto>;

public class GetPublicPageValidator : AbstractValidator<GetPublicPageQuery>
{
    public GetPublicPageValidator() => RuleFor(x => x.Slug).NotEmpty().MaximumLength(100);
}

public class GetPublicPageHandler(IAppDbContext db, IMediaStorage storage) : IRequestHandler<GetPublicPageQuery, PublicPageDto>
{
    public async Task<PublicPageDto> Handle(GetPublicPageQuery request, CancellationToken cancellationToken)
    {
        var page = await db.Pages.AsNoTracking()
            .Where(p => p.Slug == request.Slug && p.IsManaged)
            .Select(p => new
            {
                p.Eyebrow, p.Heading, p.Introduction,
                Sections = p.Sections.Where(s => s.IsPublished).OrderBy(s => s.DisplayOrder)
                    .Select(s => new
                    {
                        s.Id, s.Title, s.Eyebrow, s.Introduction, s.Description, s.AdditionalDescription, s.DisplayOrder,
                        s.PrimaryImageAltText,
                        PrimaryId = s.PrimaryMediaId,
                        PrimaryFile = s.PrimaryMedia != null ? s.PrimaryMedia.StoredFileName : null,
                        Details = s.Details.OrderBy(d => d.DisplayOrder).Select(d => d.Text).ToList(),
                        Gallery = s.Gallery.OrderBy(g => g.DisplayOrder)
                            .Select(g => new { g.Id, g.MediaAsset.StoredFileName, g.AltText }).ToList(),
                    }).ToList(),
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException($"Page '{request.Slug}' was not found.");

        var sections = page.Sections.Select(s => new PublicSectionDto(
            s.Id.ToString(), s.Title, s.Eyebrow, s.Introduction, s.Description, s.AdditionalDescription, s.Details,
            s.PrimaryFile is null ? null : new PublicImageDto($"primary-{s.Id}", storage.GetUrl(s.PrimaryFile), s.PrimaryImageAltText ?? s.Title),
            s.Gallery.Select(g => new PublicImageDto(g.Id.ToString(), storage.GetUrl(g.StoredFileName), g.AltText ?? s.Title)).ToList(),
            s.DisplayOrder)).ToList();

        return new PublicPageDto(page.Eyebrow, page.Heading, page.Introduction, sections);
    }
}
