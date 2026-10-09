using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Domain;

namespace Mvo.Application.Features.Sections;

public static class SectionAccess
{
    public static async Task<ContentSection> GetForUpdateAsync(
        this IAppDbContext db, int pageId, int sectionId, int expectedVersion, bool includeGallery, bool includeDetails,
        CancellationToken cancellationToken)
    {
        IQueryable<ContentSection> query = db.Sections.Include(s => s.SectionType);
        if (includeGallery) query = query.Include(s => s.Gallery);
        if (includeDetails) query = query.Include(s => s.Details);

        var section = await query.FirstOrDefaultAsync(s => s.Id == sectionId && s.PageId == pageId, cancellationToken)
            ?? throw new NotFoundException($"Section {sectionId} was not found on page {pageId}.");

        if (section.Version != expectedVersion)
            throw new ConflictException("The section was changed by someone else. Reload it and try again.");

        return section;
    }

    public static async Task<MediaAsset> GetMediaAsync(this IAppDbContext db, int mediaId, CancellationToken cancellationToken) =>
        await db.MediaAssets.FirstOrDefaultAsync(m => m.Id == mediaId, cancellationToken)
        ?? throw new NotFoundException($"Media {mediaId} was not found.");

    public static async Task SaveWithConcurrencyAsync(this IAppDbContext db, CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("The content was changed by someone else. Reload it and try again.");
        }
    }
}
