using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Domain;

namespace Mvo.Application.Features.Projects;

public static class ProjectRules
{
    public const int TitleMax = 200;
    public const int SlugMax = 120;
    public const int LocationMax = 100;
    public const int SummaryMax = 500;
    public const int DescriptionMax = 4000;
    public const int MaxImages = 40;
    /// <summary>The Projekter page shows three projects at the top: the featured ones first, topped up with the newest.</summary>
    public const int MaxFeatured = 3;

    /// <summary>"Badeværelse i Valby" → "badevaerelse-i-valby".</summary>
    public static string Slugify(string title)
    {
        var text = title.Trim().ToLowerInvariant()
            .Replace("æ", "ae").Replace("ø", "oe").Replace("å", "aa").Replace("ß", "ss");
        var builder = new StringBuilder();
        foreach (var c in text.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            if (c is >= 'a' and <= 'z' or >= '0' and <= '9') builder.Append(c);
            else if (builder.Length > 0 && builder[^1] != '-') builder.Append('-');
        }
        var slug = builder.ToString().Trim('-');
        if (slug.Length > SlugMax - 4) slug = slug[..(SlugMax - 4)].Trim('-');
        return slug.Length == 0 ? "projekt" : slug;
    }

    /// <summary>Paragraphs of the description: split on blank lines, with single line breaks kept inside a paragraph.</summary>
    public static IReadOnlyList<string> Paragraphs(string description) =>
        description.Replace("\r\n", "\n").Split("\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public static async Task<string> UniqueSlugAsync(this IAppDbContext db, string title, CancellationToken cancellationToken)
    {
        var baseSlug = Slugify(title);
        var taken = await db.Projects.Where(p => p.Slug == baseSlug || p.Slug.StartsWith(baseSlug + "-"))
            .Select(p => p.Slug).ToListAsync(cancellationToken);
        if (!taken.Contains(baseSlug)) return baseSlug;
        var n = 2;
        while (taken.Contains($"{baseSlug}-{n}")) n++;
        return $"{baseSlug}-{n}";
    }

    public static async Task EnsureFeaturedRoomAsync(this IAppDbContext db, int? projectId, CancellationToken cancellationToken)
    {
        var others = await db.Projects.CountAsync(p => p.IsFeatured && p.Id != projectId, cancellationToken);
        if (others >= MaxFeatured)
            throw new ConflictException($"Der kan højst være {MaxFeatured} fremhævede projekter. Fjern fremhævningen fra et andet projekt først.");
    }

    /// <summary>Replaces the project's images with the given media, in that order. Rows for images that stay are kept.</summary>
    public static void SetImages(this Project project, IReadOnlyList<int> mediaIds, IAppDbContext db)
    {
        var wanted = mediaIds.ToHashSet();
        foreach (var removed in project.Images.Where(i => !wanted.Contains(i.MediaAssetId)).ToList())
        {
            project.Images.Remove(removed);
            db.ProjectImages.Remove(removed);
        }

        var position = 1;
        foreach (var mediaId in mediaIds)
        {
            var row = project.Images.FirstOrDefault(i => i.MediaAssetId == mediaId);
            if (row is null)
            {
                row = new ProjectImage { MediaAssetId = mediaId };
                project.Images.Add(row);
            }
            row.DisplayOrder = position++;
        }
    }
}
