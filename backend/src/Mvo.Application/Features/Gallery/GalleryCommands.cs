using FluentValidation;
using MediatR;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Domain;
using Mvo.Application.Features.Sections;

namespace Mvo.Application.Features.Gallery;

public record GalleryImageInput(int MediaId, string? AltText);

public record SetPrimaryImageCommand(int PageId, int SectionId, int ExpectedVersion, int MediaId, string? AltText)
    : IRequest<SectionContentDto>;

public class SetPrimaryImageValidator : AbstractValidator<SetPrimaryImageCommand>
{
    public SetPrimaryImageValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.SectionId).RequiredId();
        RuleFor(x => x.MediaId).RequiredId();
        RuleFor(x => x.AltText).OptionalText(SectionRules.AltTextMax);
    }
}

public class SetPrimaryImageHandler(IAppDbContext db, SectionContentLoader loader)
    : IRequestHandler<SetPrimaryImageCommand, SectionContentDto>
{
    public async Task<SectionContentDto> Handle(SetPrimaryImageCommand request, CancellationToken cancellationToken)
    {
        var section = await db.GetForUpdateAsync(request.PageId, request.SectionId, request.ExpectedVersion, false, false, cancellationToken);
        if (!section.SectionType.HasPrimaryImage)
            throw new ConflictException($"Sections of type {section.SectionType.DisplayName} do not have a primary image.");

        var media = await db.GetMediaAsync(request.MediaId, cancellationToken);

        section.PrimaryMediaId = media.Id;
        section.PrimaryImageAltText = string.IsNullOrWhiteSpace(request.AltText) ? null : request.AltText.Trim();
        section.Version++;

        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await loader.LoadAsync(request.PageId, request.SectionId, cancellationToken);
    }
}

public record AddGalleryImagesCommand(int PageId, int SectionId, int ExpectedVersion, IReadOnlyList<GalleryImageInput> Images)
    : IRequest<SectionContentDto>;

public class AddGalleryImagesValidator : AbstractValidator<AddGalleryImagesCommand>
{
    public AddGalleryImagesValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.SectionId).RequiredId();
        RuleFor(x => x.Images).NotEmpty().Must(i => i is null || i.Count <= SectionRules.GalleryMaxImages)
            .WithMessage($"At most {SectionRules.GalleryMaxImages} images can be added at once.");
        RuleFor(x => x.Images).Must(i => i is null || i.Select(x => x.MediaId).Distinct().Count() == i.Count)
            .WithMessage("The same image cannot be added twice.");
        RuleForEach(x => x.Images).ChildRules(image =>
        {
            image.RuleFor(i => i.MediaId).RequiredId();
            image.RuleFor(i => i.AltText).OptionalText(SectionRules.AltTextMax);
        });
    }
}

public class AddGalleryImagesHandler(IAppDbContext db, SectionContentLoader loader)
    : IRequestHandler<AddGalleryImagesCommand, SectionContentDto>
{
    public async Task<SectionContentDto> Handle(AddGalleryImagesCommand request, CancellationToken cancellationToken)
    {
        var section = await db.GetForUpdateAsync(request.PageId, request.SectionId, request.ExpectedVersion, true, false, cancellationToken);
        section.EnsureHasGallery();

        if (section.Gallery.Count + request.Images.Count > SectionRules.GalleryMaxImages)
            throw new ConflictException($"A gallery can hold at most {SectionRules.GalleryMaxImages} images.");

        var mediaIds = request.Images.Select(i => i.MediaId).ToList();
        await db.EnsureMediaExistsAsync(mediaIds, cancellationToken);

        var alreadyInGallery = section.Gallery.Select(g => g.MediaAssetId).Intersect(mediaIds).ToList();
        if (alreadyInGallery.Count != 0)
            throw new ConflictException("One or more of the images are already in this gallery.");

        var position = section.Gallery.Count;
        foreach (var input in request.Images)
        {
            section.Gallery.Add(new GalleryImage
            {
                MediaAssetId = input.MediaId,
                AltText = GalleryRules.NormalizeAlt(input.AltText),
                DisplayOrder = ++position,
            });
        }
        section.Version++;

        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await loader.LoadAsync(request.PageId, request.SectionId, cancellationToken);
    }
}

public record RemoveGalleryImageCommand(int PageId, int SectionId, int ExpectedVersion, int GalleryImageId)
    : IRequest<SectionContentDto>;

public class RemoveGalleryImageValidator : AbstractValidator<RemoveGalleryImageCommand>
{
    public RemoveGalleryImageValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.SectionId).RequiredId();
        RuleFor(x => x.GalleryImageId).RequiredId();
    }
}

public class RemoveGalleryImageHandler(IAppDbContext db, SectionContentLoader loader)
    : IRequestHandler<RemoveGalleryImageCommand, SectionContentDto>
{
    public async Task<SectionContentDto> Handle(RemoveGalleryImageCommand request, CancellationToken cancellationToken)
    {
        var section = await db.GetForUpdateAsync(request.PageId, request.SectionId, request.ExpectedVersion, true, false, cancellationToken);

        var image = section.Gallery.FirstOrDefault(g => g.Id == request.GalleryImageId)
            ?? throw new NotFoundException($"Gallery image {request.GalleryImageId} was not found in section {request.SectionId}.");

        section.Gallery.Remove(image);
        db.GalleryImages.Remove(image);

        var position = 1;
        foreach (var remaining in section.Gallery.OrderBy(g => g.DisplayOrder)) remaining.DisplayOrder = position++;
        section.Version++;

        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await loader.LoadAsync(request.PageId, request.SectionId, cancellationToken);
    }
}

public record ReplaceGalleryImageCommand(int PageId, int SectionId, int ExpectedVersion, int GalleryImageId, int MediaId, string? AltText)
    : IRequest<SectionContentDto>;

public class ReplaceGalleryImageValidator : AbstractValidator<ReplaceGalleryImageCommand>
{
    public ReplaceGalleryImageValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.SectionId).RequiredId();
        RuleFor(x => x.GalleryImageId).RequiredId();
        RuleFor(x => x.MediaId).RequiredId();
        RuleFor(x => x.AltText).OptionalText(SectionRules.AltTextMax);
    }
}

public class ReplaceGalleryImageHandler(IAppDbContext db, SectionContentLoader loader)
    : IRequestHandler<ReplaceGalleryImageCommand, SectionContentDto>
{
    public async Task<SectionContentDto> Handle(ReplaceGalleryImageCommand request, CancellationToken cancellationToken)
    {
        var section = await db.GetForUpdateAsync(request.PageId, request.SectionId, request.ExpectedVersion, true, false, cancellationToken);

        var image = section.Gallery.FirstOrDefault(g => g.Id == request.GalleryImageId)
            ?? throw new NotFoundException($"Gallery image {request.GalleryImageId} was not found in section {request.SectionId}.");

        await db.EnsureMediaExistsAsync([request.MediaId], cancellationToken);
        if (section.Gallery.Any(g => g.Id != image.Id && g.MediaAssetId == request.MediaId))
            throw new ConflictException("That image is already in this gallery.");

        image.MediaAssetId = request.MediaId;
        image.AltText = GalleryRules.NormalizeAlt(request.AltText);
        section.Version++;

        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await loader.LoadAsync(request.PageId, request.SectionId, cancellationToken);
    }
}

public record ReorderGalleryCommand(int PageId, int SectionId, int ExpectedVersion, IReadOnlyList<int> OrderedGalleryImageIds)
    : IRequest<SectionContentDto>;

public class ReorderGalleryValidator : AbstractValidator<ReorderGalleryCommand>
{
    public ReorderGalleryValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.SectionId).RequiredId();
        RuleFor(x => x.OrderedGalleryImageIds).NotNull();
        RuleForEach(x => x.OrderedGalleryImageIds).RequiredId();
        RuleFor(x => x.OrderedGalleryImageIds).Must(ids => ids is null || ids.Distinct().Count() == ids.Count)
            .WithMessage("The ordering contains duplicate image ids.");
    }
}

public class ReorderGalleryHandler(IAppDbContext db, SectionContentLoader loader)
    : IRequestHandler<ReorderGalleryCommand, SectionContentDto>
{
    public async Task<SectionContentDto> Handle(ReorderGalleryCommand request, CancellationToken cancellationToken)
    {
        var section = await db.GetForUpdateAsync(request.PageId, request.SectionId, request.ExpectedVersion, true, false, cancellationToken);

        if (!section.Gallery.Select(g => g.Id).ToHashSet().SetEquals(request.OrderedGalleryImageIds))
            throw new ValidationException("The ordering must contain exactly the images of this gallery.");

        var position = 1;
        foreach (var id in request.OrderedGalleryImageIds)
            section.Gallery.First(g => g.Id == id).DisplayOrder = position++;
        section.Version++;

        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await loader.LoadAsync(request.PageId, request.SectionId, cancellationToken);
    }
}
