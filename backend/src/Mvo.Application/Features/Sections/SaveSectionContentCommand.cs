using FluentValidation;
using MediatR;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Domain;
using Mvo.Application.Features.Gallery;

namespace Mvo.Application.Features.Sections;

/// <summary>Which images a section shows. It decides the section type, so a section is built up instead of chosen up front.</summary>
public enum SectionMedia
{
    None,
    /// <summary>A main image and a gallery.</summary>
    Images,
    /// <summary>A before image (the primary image) and one after image (the gallery).</summary>
    BeforeAfter,
}

/// <summary>
/// Saves everything in a section at once: its texts, its points and its images. Text parts that are left empty are
/// removed from the section, and the chosen <see cref="SectionMedia"/> sets the section type.
/// </summary>
public record SaveSectionContentCommand(
    int PageId, int SectionId, int ExpectedVersion, string Title, string? Eyebrow, string? Introduction,
    string? Description, string? AdditionalDescription, IReadOnlyList<string> Details,
    SectionMedia Media, int? PrimaryMediaId, IReadOnlyList<int> GalleryMediaIds) : IRequest<SectionContentDto>;

public class SaveSectionContentValidator : AbstractValidator<SaveSectionContentCommand>
{
    public SaveSectionContentValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.SectionId).RequiredId();
        RuleFor(x => x.Title).RequiredText(SectionRules.TitleMax);
        RuleFor(x => x.Eyebrow).OptionalText(SectionRules.ShortTextMax);
        RuleFor(x => x.Introduction).OptionalText(SectionRules.LongTextMax);
        RuleFor(x => x.Description).OptionalText(SectionRules.LongTextMax);
        RuleFor(x => x.AdditionalDescription).OptionalText(SectionRules.LongTextMax);
        RuleFor(x => x.Details).NotNull().Must(d => d is null || d.Count <= SectionRules.DetailsMaxCount)
            .WithMessage($"A section can have at most {SectionRules.DetailsMaxCount} detail lines.");
        RuleForEach(x => x.Details).NotEmpty().MaximumLength(SectionRules.DetailMax);
        RuleFor(x => x.Media).IsInEnum();
        RuleFor(x => x.PrimaryMediaId).GreaterThan(0).When(x => x.PrimaryMediaId is not null);
        RuleFor(x => x.GalleryMediaIds).NotNull().Must(i => i is null || i.Count <= SectionRules.GalleryMaxImages)
            .WithMessage($"A gallery can hold at most {SectionRules.GalleryMaxImages} images.");
        RuleFor(x => x.GalleryMediaIds).Must(i => i is null || i.Distinct().Count() == i.Count)
            .WithMessage("The same image cannot be in the gallery twice.");
        RuleForEach(x => x.GalleryMediaIds).RequiredId();
        RuleFor(x => x.GalleryMediaIds).Must(i => i is null || i.Count <= 1).When(x => x.Media == SectionMedia.BeforeAfter)
            .WithMessage("A before/after section has exactly one after image.");
        RuleFor(x => x).Must(x => x.PrimaryMediaId is null && x.GalleryMediaIds is { Count: 0 }).When(x => x.Media == SectionMedia.None)
            .WithName("Media").WithMessage("A section without images cannot have a main image or a gallery.");
    }
}

public class SaveSectionContentHandler(IAppDbContext db, SectionContentLoader loader)
    : IRequestHandler<SaveSectionContentCommand, SectionContentDto>
{
    public async Task<SectionContentDto> Handle(SaveSectionContentCommand request, CancellationToken cancellationToken)
    {
        var section = await db.GetForUpdateAsync(request.PageId, request.SectionId, request.ExpectedVersion, true, true, cancellationToken);
        if (section.SectionTypeId == SectionTypeId.Profile)
            throw new ConflictException("Profile sections have a fixed design. Edit their text and image separately.");
        if (section.SectionTypeId == SectionTypeId.HomePart)
            throw new ConflictException("Home page parts have a fixed design. Save them with the home page editor.");

        var mediaIds = request.GalleryMediaIds.ToList();
        if (request.PrimaryMediaId is { } primaryId) mediaIds.Add(primaryId);
        await db.EnsureMediaExistsAsync(mediaIds.Distinct().ToList(), cancellationToken);

        section.SectionTypeId = request.Media switch
        {
            SectionMedia.Images => SectionTypeId.MasonryShowcase,
            SectionMedia.BeforeAfter => SectionTypeId.BeforeAfter,
            _ => SectionTypeId.TextBlock,
        };
        section.Title = request.Title.Trim();
        section.Eyebrow = Normalize(request.Eyebrow);
        section.Introduction = Normalize(request.Introduction);
        section.Description = request.Description?.Trim() ?? "";
        section.AdditionalDescription = Normalize(request.AdditionalDescription);

        db.SectionDetails.RemoveRange(section.Details);
        section.Details = request.Details
            .Select((text, index) => new SectionDetail { Text = text.Trim(), DisplayOrder = index + 1 })
            .ToList();

        if (section.PrimaryMediaId != request.PrimaryMediaId) section.PrimaryImageAltText = null;
        section.PrimaryMediaId = request.PrimaryMediaId;
        SetGallery(section, request.GalleryMediaIds);
        section.Version++;

        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await loader.LoadAsync(request.PageId, request.SectionId, cancellationToken);
    }

    /// <summary>Images that stay keep their row (and alternative text); the rest are removed and new ones added.</summary>
    private void SetGallery(ContentSection section, IReadOnlyList<int> mediaIds)
    {
        var wanted = mediaIds.ToHashSet();
        foreach (var removed in section.Gallery.Where(g => !wanted.Contains(g.MediaAssetId)).ToList())
        {
            section.Gallery.Remove(removed);
            db.GalleryImages.Remove(removed);
        }

        var position = 1;
        foreach (var mediaId in mediaIds)
        {
            var row = section.Gallery.FirstOrDefault(g => g.MediaAssetId == mediaId);
            if (row is null)
            {
                row = new GalleryImage { MediaAssetId = mediaId };
                section.Gallery.Add(row);
            }
            row.DisplayOrder = position++;
        }
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
