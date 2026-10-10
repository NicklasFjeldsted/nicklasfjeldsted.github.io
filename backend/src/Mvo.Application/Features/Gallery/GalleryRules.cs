using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Domain;

namespace Mvo.Application.Features.Gallery;

public static class GalleryRules
{
    public static string? NormalizeAlt(string? altText) => string.IsNullOrWhiteSpace(altText) ? null : altText.Trim();

    public static void EnsureHasGallery(this ContentSection section)
    {
        if (!section.SectionType.HasGallery)
            throw new ConflictException($"Sections of type {section.SectionType.DisplayName} do not have a gallery.");
    }

    public static async Task EnsureMediaExistsAsync(this IAppDbContext db, IReadOnlyCollection<int> mediaIds, CancellationToken cancellationToken)
    {
        var found = await db.MediaAssets.Where(m => mediaIds.Contains(m.Id)).Select(m => m.Id).ToListAsync(cancellationToken);
        var missing = mediaIds.Except(found).ToList();
        if (missing.Count != 0)
            throw new NotFoundException($"Media {string.Join(", ", missing)} was not found.");
    }
}
