using FluentAssertions;
using Mvo.Application.Features.Gallery;
using Mvo.Application.Features.Media;
using Mvo.Application.Features.Pages;
using Mvo.Application.Features.Sections;

namespace Mvo.Tests;

public class ValidatorTests
{
    [Fact]
    public void UpdateSectionText_requires_title_and_description()
    {
        var result = new UpdateSectionTextValidator().Validate(
            new UpdateSectionTextCommand(1, 1, 1, "", null, null, "", null, []));
        result.Errors.Select(e => e.PropertyName).Should().Contain(["Title", "Description"]);
    }

    [Fact]
    public void UpdateSectionText_rejects_too_many_or_too_long_details()
    {
        var details = Enumerable.Repeat(new string('x', 301), 21).ToList();
        var result = new UpdateSectionTextValidator().Validate(
            new UpdateSectionTextCommand(1, 1, 1, "t", null, null, "d", null, details));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void UpdatePageText_rejects_invalid_ids()
    {
        new UpdatePageTextValidator().Validate(new UpdatePageTextCommand(0, 1, null, "h", "i"))
            .IsValid.Should().BeFalse();
    }

    [Fact]
    public void ReorderGallery_rejects_duplicate_ids()
    {
        new ReorderGalleryValidator().Validate(new ReorderGalleryCommand(1, 1, 1, [5, 5, 6]))
            .IsValid.Should().BeFalse();
    }

    [Fact]
    public void ReorderGallery_rejects_non_positive_ids()
    {
        new ReorderGalleryValidator().Validate(new ReorderGalleryCommand(1, 1, 1, [0, 2]))
            .IsValid.Should().BeFalse();
    }

    [Fact]
    public void AddGalleryImages_rejects_empty_list_and_too_long_alt_text()
    {
        var v = new AddGalleryImagesValidator();
        v.Validate(new AddGalleryImagesCommand(1, 1, 1, [])).IsValid.Should().BeFalse();
        v.Validate(new AddGalleryImagesCommand(1, 1, 1, [new GalleryImageInput(1, new string('a', 301))])).IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData("virus.exe")]
    [InlineData("noextension")]
    [InlineData("script.svg")]
    public void Upload_rejects_disallowed_extensions(string name)
    {
        new UploadMediaValidator().Validate(new UploadMediaCommand(name, 100, () => Stream.Null))
            .IsValid.Should().BeFalse();
    }

    [Fact]
    public void Upload_rejects_empty_and_oversized_files()
    {
        var v = new UploadMediaValidator();
        v.Validate(new UploadMediaCommand("a.png", 0, () => Stream.Null)).IsValid.Should().BeFalse();
        v.Validate(new UploadMediaCommand("a.png", ImageSignature.MaxBytes + 1, () => Stream.Null)).IsValid.Should().BeFalse();
        v.Validate(new UploadMediaCommand("a.png", 100, () => Stream.Null)).IsValid.Should().BeTrue();
    }

    [Fact]
    public void ImageSignature_detects_real_formats_and_rejects_disguised_files()
    {
        ImageSignature.Detect([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0])!.Value.ContentType.Should().Be("image/jpeg");
        ImageSignature.Detect([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0])!.Value.ContentType.Should().Be("image/png");
        ImageSignature.Detect("RIFF\0\0\0\0WEBP"u8)!.Value.ContentType.Should().Be("image/webp");
        ImageSignature.Detect("MZ\x90\0\x03\0\0\0\x04\0\0\0"u8).Should().BeNull();
        ImageSignature.Detect("<svg xmlns=...>"u8).Should().BeNull();
    }
}
