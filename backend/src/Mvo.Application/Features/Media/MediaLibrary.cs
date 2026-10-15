using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Features.Gallery;
using Mvo.Application.Features.Sections;

namespace Mvo.Application.Features.Media;

public enum MediaUsageFilter { All, Used, Unused }

public enum MediaSort { Newest, Oldest, Name }

public record MediaLibraryItemDto(
    int Id, string Url, string Name, string OriginalFileName, string ContentType, long SizeBytes,
    DateTime CreatedUtc, string? DefaultAltText, int UsageCount);

public record MediaLibraryPageDto(IReadOnlyList<MediaLibraryItemDto> Items, int Total);

/// <summary>Where an image is shown: as a section's primary image or at a position in its gallery.</summary>
public record MediaUsageDto(int PageId, string PageName, int SectionId, string SectionTitle, string SectionType, string Kind, int? Position);

public record MediaDetailDto(
    int Id, string Url, string Name, string OriginalFileName, string ContentType, long SizeBytes,
    DateTime CreatedUtc, string? DefaultAltText, IReadOnlyList<MediaUsageDto> Usages);

public record GetMediaLibraryQuery(string? Search, MediaUsageFilter Filter, MediaSort Sort, int Skip, int Take)
    : IRequest<MediaLibraryPageDto>;

public class GetMediaLibraryValidator : AbstractValidator<GetMediaLibraryQuery>
{
    public const int MaxTake = 200;

    public GetMediaLibraryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.Filter).IsInEnum();
        RuleFor(x => x.Sort).IsInEnum();
        RuleFor(x => x.Skip).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Take).InclusiveBetween(1, MaxTake);
    }
}

public class GetMediaLibraryHandler(IAppDbContext db, IMediaStorage storage) : IRequestHandler<GetMediaLibraryQuery, MediaLibraryPageDto>
{
    public async Task<MediaLibraryPageDto> Handle(GetMediaLibraryQuery request, CancellationToken cancellationToken)
    {
        var rows = db.MediaAssets.AsNoTracking().Select(m => new
        {
            m.Id, m.StoredFileName, m.Name, m.OriginalFileName, m.ContentType, m.SizeBytes, m.CreatedUtc, m.DefaultAltText,
            UsageCount = db.Sections.Count(s => s.PrimaryMediaId == m.Id) + db.GalleryImages.Count(g => g.MediaAssetId == m.Id),
        });

        // Every word must match the name, original file name or alt text (the database collation ignores case).
        foreach (var word in (request.Search ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            rows = rows.Where(m => m.Name.Contains(word) || m.OriginalFileName.Contains(word) || (m.DefaultAltText != null && m.DefaultAltText.Contains(word)));

        rows = request.Filter switch
        {
            MediaUsageFilter.Used => rows.Where(m => m.UsageCount > 0),
            MediaUsageFilter.Unused => rows.Where(m => m.UsageCount == 0),
            _ => rows,
        };

        rows = request.Sort switch
        {
            MediaSort.Oldest => rows.OrderBy(m => m.CreatedUtc).ThenBy(m => m.Id),
            MediaSort.Name => rows.OrderBy(m => m.Name).ThenBy(m => m.Id),
            _ => rows.OrderByDescending(m => m.CreatedUtc).ThenByDescending(m => m.Id),
        };

        var total = await rows.CountAsync(cancellationToken);
        var page = await rows.Skip(request.Skip).Take(request.Take).ToListAsync(cancellationToken);

        var items = page.Select(m => new MediaLibraryItemDto(
            m.Id, storage.GetUrl(m.StoredFileName), m.Name, m.OriginalFileName, m.ContentType, m.SizeBytes,
            DateTime.SpecifyKind(m.CreatedUtc, DateTimeKind.Utc), m.DefaultAltText, m.UsageCount)).ToList();
        return new MediaLibraryPageDto(items, total);
    }
}

public record GetMediaDetailQuery(int MediaId) : IRequest<MediaDetailDto>;

public class GetMediaDetailValidator : AbstractValidator<GetMediaDetailQuery>
{
    public GetMediaDetailValidator() => RuleFor(x => x.MediaId).RequiredId();
}

public class GetMediaDetailHandler(MediaDetailLoader loader) : IRequestHandler<GetMediaDetailQuery, MediaDetailDto>
{
    public Task<MediaDetailDto> Handle(GetMediaDetailQuery request, CancellationToken cancellationToken) =>
        loader.LoadAsync(request.MediaId, cancellationToken);
}

public record UpdateMediaCommand(int MediaId, string Name, string? DefaultAltText) : IRequest<MediaDetailDto>;

public class UpdateMediaValidator : AbstractValidator<UpdateMediaCommand>
{
    public UpdateMediaValidator()
    {
        RuleFor(x => x.MediaId).RequiredId();
        RuleFor(x => x.Name).Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Billedet skal have et navn.")
            .MaximumLength(MediaRules.NameMaxLength);
        RuleFor(x => x.DefaultAltText).OptionalText(SectionRules.AltTextMax);
    }
}

public class UpdateMediaHandler(IAppDbContext db, MediaDetailLoader loader) : IRequestHandler<UpdateMediaCommand, MediaDetailDto>
{
    public async Task<MediaDetailDto> Handle(UpdateMediaCommand request, CancellationToken cancellationToken)
    {
        var asset = await db.MediaAssets.FirstOrDefaultAsync(m => m.Id == request.MediaId, cancellationToken)
            ?? throw new NotFoundException($"Media {request.MediaId} was not found.");

        asset.Name = request.Name.Trim();
        asset.DefaultAltText = GalleryRules.NormalizeAlt(request.DefaultAltText);
        await db.SaveChangesAsync(cancellationToken);

        return await loader.LoadAsync(asset.Id, cancellationToken);
    }
}

public class MediaDetailLoader(IAppDbContext db, IMediaStorage storage)
{
    public async Task<MediaDetailDto> LoadAsync(int mediaId, CancellationToken cancellationToken)
    {
        var asset = await db.MediaAssets.AsNoTracking().FirstOrDefaultAsync(m => m.Id == mediaId, cancellationToken)
            ?? throw new NotFoundException($"Media {mediaId} was not found.");

        var primaries = await db.Sections.AsNoTracking()
            .Where(s => s.PrimaryMediaId == mediaId)
            .Select(s => new { s.PageId, PageName = s.Page.Name, s.Id, s.Title, s.SectionTypeId })
            .ToListAsync(cancellationToken);

        var galleryRows = await db.GalleryImages.AsNoTracking()
            .Where(g => g.MediaAssetId == mediaId)
            .Select(g => new
            {
                g.SectionId,
                Section = db.Sections.Where(s => s.Id == g.SectionId)
                    .Select(s => new { s.PageId, PageName = s.Page.Name, s.Title, s.SectionTypeId }).First(),
                Position = db.GalleryImages.Count(o => o.SectionId == g.SectionId && o.DisplayOrder < g.DisplayOrder) + 1,
            })
            .ToListAsync(cancellationToken);

        var usages = primaries
            .Select(p => new MediaUsageDto(p.PageId, p.PageName, p.Id, p.Title, p.SectionTypeId.ToString(), "Primary", null))
            .Concat(galleryRows.Select(g => new MediaUsageDto(
                g.Section.PageId, g.Section.PageName, g.SectionId, g.Section.Title, g.Section.SectionTypeId.ToString(), "Gallery", g.Position)))
            .OrderBy(u => u.PageName).ThenBy(u => u.SectionTitle).ThenBy(u => u.Position ?? 0)
            .ToList();

        return new MediaDetailDto(
            asset.Id, storage.GetUrl(asset.StoredFileName), asset.Name, asset.OriginalFileName, asset.ContentType, asset.SizeBytes,
            DateTime.SpecifyKind(asset.CreatedUtc, DateTimeKind.Utc), asset.DefaultAltText, usages);
    }
}
