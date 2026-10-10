using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Domain;

namespace Mvo.Application.Features.Media;

public record MediaDto(int Id, string Url, string OriginalFileName, string ContentType, long SizeBytes);

public static class ImageSignature
{
    public const long MaxBytes = 10 * 1024 * 1024;
    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

    public static bool IsAllowedExtension(string fileName) =>
        AllowedExtensions.Contains(Path.GetExtension(fileName).ToLowerInvariant());

    public static (string ContentType, string Extension)? Detect(ReadOnlySpan<byte> header)
    {
        if (header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF) return ("image/jpeg", ".jpg");
        if (header.Length >= 8 && header[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
            return ("image/png", ".png");
        if (header.Length >= 12 && header[..4].SequenceEqual("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8))
            return ("image/webp", ".webp");
        return null;
    }
}

public record UploadMediaCommand(string FileName, long Length, Func<Stream> OpenStream) : IRequest<MediaDto>;

public class UploadMediaValidator : AbstractValidator<UploadMediaCommand>
{
    public UploadMediaValidator()
    {
        RuleFor(x => x.FileName).NotEmpty().MaximumLength(255)
            .Must(ImageSignature.IsAllowedExtension).WithMessage("Only JPEG, PNG and WebP images are allowed.");
        RuleFor(x => x.Length).GreaterThan(0).LessThanOrEqualTo(ImageSignature.MaxBytes)
            .WithMessage("Images must be between 1 byte and 10 MB.");
    }
}

public class UploadMediaHandler(IAppDbContext db, IMediaStorage storage) : IRequestHandler<UploadMediaCommand, MediaDto>
{
    public async Task<MediaDto> Handle(UploadMediaCommand request, CancellationToken cancellationToken)
    {
        await using var stream = request.OpenStream();

        var header = new byte[12];
        var read = await stream.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken);
        var detected = ImageSignature.Detect(header.AsSpan(0, read))
            ?? throw new ValidationException("The file is not a valid JPEG, PNG or WebP image.");

        stream.Position = 0;
        var storedFileName = $"{Guid.NewGuid():N}{detected.Extension}";
        await storage.SaveAsync(storedFileName, stream, cancellationToken);

        var asset = new MediaAsset
        {
            StoredFileName = storedFileName,
            OriginalFileName = Path.GetFileName(request.FileName),
            ContentType = detected.ContentType,
            SizeBytes = request.Length,
            CreatedUtc = DateTime.UtcNow,
        };

        try
        {
            db.MediaAssets.Add(asset);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await storage.DeleteAsync(storedFileName, CancellationToken.None);
            throw;
        }

        return new MediaDto(asset.Id, storage.GetUrl(asset.StoredFileName), asset.OriginalFileName, asset.ContentType, asset.SizeBytes);
    }
}

public record DeleteMediaCommand(int MediaId) : IRequest;

public class DeleteMediaValidator : AbstractValidator<DeleteMediaCommand>
{
    public DeleteMediaValidator() => RuleFor(x => x.MediaId).GreaterThan(0);
}

public class DeleteMediaHandler(IAppDbContext db, IMediaStorage storage) : IRequestHandler<DeleteMediaCommand>
{
    public async Task Handle(DeleteMediaCommand request, CancellationToken cancellationToken)
    {
        var asset = await db.MediaAssets.FirstOrDefaultAsync(m => m.Id == request.MediaId, cancellationToken)
            ?? throw new NotFoundException($"Media {request.MediaId} was not found.");

        var inUse = await db.Sections.AnyAsync(s => s.PrimaryMediaId == asset.Id, cancellationToken)
            || await db.GalleryImages.AnyAsync(g => g.MediaAssetId == asset.Id, cancellationToken);
        if (inUse) throw new ConflictException("The image is still used on the website and cannot be deleted.");

        db.MediaAssets.Remove(asset);
        await db.SaveChangesAsync(cancellationToken);

        await storage.DeleteAsync(asset.StoredFileName, CancellationToken.None);
    }
}
