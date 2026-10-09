using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Domain;

namespace Mvo.Application.Features.Sections;

public class SectionContentLoader(IAppDbContext db, IMediaStorage storage)
{
    public async Task<SectionContentDto> LoadAsync(int pageId, int sectionId, CancellationToken cancellationToken)
    {
        var row = await db.Sections.AsNoTracking()
            .Where(s => s.Id == sectionId && s.PageId == pageId)
            .Select(s => new
            {
                s.Id, s.PageId, s.Title, s.Eyebrow, s.Introduction, s.Description, s.AdditionalDescription,
                s.DisplayOrder, s.IsPublished, s.Version, s.PrimaryImageAltText,
                TypeId = s.SectionTypeId, TypeName = s.SectionType.DisplayName,
                s.SectionType.HasPrimaryImage, s.SectionType.HasGallery,
                PrimaryMediaId = s.PrimaryMediaId,
                PrimaryFile = s.PrimaryMedia != null ? s.PrimaryMedia.StoredFileName : null,
                Details = s.Details.OrderBy(d => d.DisplayOrder).Select(d => d.Text).ToList(),
                Gallery = s.Gallery.OrderBy(g => g.DisplayOrder)
                    .Select(g => new { g.Id, g.MediaAssetId, g.MediaAsset.StoredFileName, g.AltText, g.DisplayOrder }).ToList(),
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException($"Section {sectionId} was not found on page {pageId}.");

        var primary = row.PrimaryMediaId is int mediaId && row.PrimaryFile is not null
            ? new PrimaryImageDto(mediaId, storage.GetUrl(row.PrimaryFile), row.PrimaryImageAltText)
            : null;

        var gallery = row.Gallery
            .Select((g, index) => new GalleryImageDto(g.Id, g.MediaAssetId, storage.GetUrl(g.StoredFileName), g.AltText, index + 1))
            .ToList();

        return new SectionContentDto(
            row.Id, row.PageId, row.Title, row.Eyebrow, row.Introduction, row.Description, row.AdditionalDescription,
            row.Details, row.TypeId.ToString(), row.TypeName, row.HasPrimaryImage, row.HasGallery,
            row.DisplayOrder, row.IsPublished, row.Version, primary, gallery);
    }
}
