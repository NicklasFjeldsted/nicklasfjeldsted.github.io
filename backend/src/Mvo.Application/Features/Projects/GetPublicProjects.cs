using MediatR;
using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Features.Public;

namespace Mvo.Application.Features.Projects;

public record PublicProjectDto(
    string Id, string Slug, string Title, string Category, string Location, DateOnly CompletedOn, string Summary,
    IReadOnlyList<string> Description, IReadOnlyList<PublicImageDto> Images, bool Featured);

/// <summary>The visible projects for the Projekter page, newest first.</summary>
public record GetPublicProjectsQuery : IRequest<IReadOnlyList<PublicProjectDto>>;

public class GetPublicProjectsHandler(IAppDbContext db, IMediaStorage storage) : IRequestHandler<GetPublicProjectsQuery, IReadOnlyList<PublicProjectDto>>
{
    public async Task<IReadOnlyList<PublicProjectDto>> Handle(GetPublicProjectsQuery request, CancellationToken cancellationToken)
    {
        var rows = await db.Projects.AsNoTracking()
            .Where(p => p.IsPublished && p.Images.Any())
            .OrderByDescending(p => p.CompletedOn).ThenByDescending(p => p.Id)
            .Select(p => new
            {
                p.Id, p.Slug, p.Title, p.Category, p.Location, p.CompletedOn, p.Summary, p.Description, p.IsFeatured,
                Images = p.Images.OrderBy(i => i.DisplayOrder).Select(i => new { i.Id, i.MediaAsset.StoredFileName }).ToList(),
            })
            .ToListAsync(cancellationToken);

        return rows.Select(p => new PublicProjectDto(
            p.Id.ToString(), p.Slug, p.Title, p.Category, p.Location, p.CompletedOn, p.Summary, ProjectRules.Paragraphs(p.Description),
            p.Images.Select(i => new PublicImageDto(i.Id.ToString(), storage.GetUrl(i.StoredFileName), p.Title)).ToList(),
            p.IsFeatured)).ToList();
    }
}
