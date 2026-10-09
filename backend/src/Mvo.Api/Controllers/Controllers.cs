using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mvo.Application.Domain;
using Mvo.Application.Features.Auth;
using Mvo.Application.Features.Gallery;
using Mvo.Application.Features.Media;
using Mvo.Application.Features.Pages;
using Mvo.Application.Features.Public;
using Mvo.Application.Features.Sections;

namespace Mvo.Api.Controllers;

public record LoginRequest(string Email, string Password);
public record UpdatePageTextRequest(int ExpectedVersion, string? Eyebrow, string Heading, string Introduction);
public record ReorderSectionsRequest(int ExpectedPageVersion, IReadOnlyList<int> OrderedSectionIds);
public record CreateSectionRequest(string Title, SectionTypeId SectionType);
public record UpdateSectionTextRequest(
    int ExpectedVersion, string Title, string? Eyebrow, string? Introduction,
    string Description, string? AdditionalDescription, IReadOnlyList<string>? Details);
public record SectionVisibilityRequest(int ExpectedVersion, bool IsPublished);
public record PrimaryImageRequest(int ExpectedVersion, int MediaId, string? AltText);
public record AddGalleryImagesRequest(int ExpectedVersion, IReadOnlyList<GalleryImageInput> Images);
public record ReplaceGalleryImageRequest(int ExpectedVersion, int MediaId, string? AltText);
public record ReorderGalleryRequest(int ExpectedVersion, IReadOnlyList<int> OrderedGalleryImageIds);

[ApiController]
[Route("api/pages")]
public class PublicPagesController(ISender sender) : ControllerBase
{
    [HttpGet("{slug}")]
    public async Task<PublicPageDto> Get(string slug, CancellationToken ct) => await sender.Send(new GetPublicPageQuery(slug), ct);
}

[ApiController]
[Route("api/admin/auth")]
public class AuthController(ISender sender) : ControllerBase
{
    [HttpPost("login")]
    public async Task<Mvo.Application.Abstractions.TokenResult> Login(LoginRequest request, CancellationToken ct) =>
        await sender.Send(new LoginCommand(request.Email, request.Password), ct);
}

[ApiController]
[Authorize]
[Route("api/admin/pages")]
public class AdminPagesController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<PageListItemDto>> List(CancellationToken ct) => await sender.Send(new GetPagesQuery(), ct);

    [HttpGet("{pageId:int}")]
    public async Task<PageDetailDto> Get(int pageId, CancellationToken ct) => await sender.Send(new GetPageQuery(pageId), ct);

    [HttpPut("{pageId:int}/text")]
    public async Task<PageDetailDto> UpdateText(int pageId, UpdatePageTextRequest r, CancellationToken ct) =>
        await sender.Send(new UpdatePageTextCommand(pageId, r.ExpectedVersion, r.Eyebrow, r.Heading, r.Introduction), ct);

    [HttpPut("{pageId:int}/sections/order")]
    public async Task<PageDetailDto> ReorderSections(int pageId, ReorderSectionsRequest r, CancellationToken ct) =>
        await sender.Send(new ReorderSectionsCommand(pageId, r.ExpectedPageVersion, r.OrderedSectionIds), ct);

    [HttpPost("{pageId:int}/sections")]
    public async Task<ActionResult<SectionContentDto>> CreateSection(int pageId, CreateSectionRequest r, CancellationToken ct)
    {
        var created = await sender.Send(new CreateSectionCommand(pageId, r.Title, r.SectionType), ct);
        return CreatedAtAction(nameof(GetSection), new { pageId, sectionId = created.Id }, created);
    }

    [HttpGet("{pageId:int}/sections/{sectionId:int}")]
    public async Task<SectionContentDto> GetSection(int pageId, int sectionId, CancellationToken ct) =>
        await sender.Send(new GetSectionContentQuery(pageId, sectionId), ct);

    [HttpPut("{pageId:int}/sections/{sectionId:int}/text")]
    public async Task<SectionContentDto> UpdateSectionText(int pageId, int sectionId, UpdateSectionTextRequest r, CancellationToken ct) =>
        await sender.Send(new UpdateSectionTextCommand(pageId, sectionId, r.ExpectedVersion, r.Title, r.Eyebrow, r.Introduction,
            r.Description, r.AdditionalDescription, r.Details ?? []), ct);

    [HttpPut("{pageId:int}/sections/{sectionId:int}/visibility")]
    public async Task<SectionContentDto> SetVisibility(int pageId, int sectionId, SectionVisibilityRequest r, CancellationToken ct) =>
        await sender.Send(new SetSectionVisibilityCommand(pageId, sectionId, r.ExpectedVersion, r.IsPublished), ct);

    [HttpDelete("{pageId:int}/sections/{sectionId:int}")]
    public async Task<IActionResult> DeleteSection(int pageId, int sectionId, [FromQuery] int expectedVersion, CancellationToken ct)
    {
        await sender.Send(new DeleteSectionCommand(pageId, sectionId, expectedVersion), ct);
        return NoContent();
    }

    [HttpPut("{pageId:int}/sections/{sectionId:int}/primary-image")]
    public async Task<SectionContentDto> SetPrimaryImage(int pageId, int sectionId, PrimaryImageRequest r, CancellationToken ct) =>
        await sender.Send(new SetPrimaryImageCommand(pageId, sectionId, r.ExpectedVersion, r.MediaId, r.AltText), ct);

    [HttpPost("{pageId:int}/sections/{sectionId:int}/gallery")]
    public async Task<SectionContentDto> AddGalleryImages(int pageId, int sectionId, AddGalleryImagesRequest r, CancellationToken ct) =>
        await sender.Send(new AddGalleryImagesCommand(pageId, sectionId, r.ExpectedVersion, r.Images), ct);

    [HttpPut("{pageId:int}/sections/{sectionId:int}/gallery/order")]
    public async Task<SectionContentDto> ReorderGallery(int pageId, int sectionId, ReorderGalleryRequest r, CancellationToken ct) =>
        await sender.Send(new ReorderGalleryCommand(pageId, sectionId, r.ExpectedVersion, r.OrderedGalleryImageIds), ct);

    [HttpPut("{pageId:int}/sections/{sectionId:int}/gallery/{galleryImageId:int}")]
    public async Task<SectionContentDto> ReplaceGalleryImage(int pageId, int sectionId, int galleryImageId, ReplaceGalleryImageRequest r, CancellationToken ct) =>
        await sender.Send(new ReplaceGalleryImageCommand(pageId, sectionId, r.ExpectedVersion, galleryImageId, r.MediaId, r.AltText), ct);

    [HttpDelete("{pageId:int}/sections/{sectionId:int}/gallery/{galleryImageId:int}")]
    public async Task<SectionContentDto> RemoveGalleryImage(int pageId, int sectionId, int galleryImageId, [FromQuery] int expectedVersion, CancellationToken ct) =>
        await sender.Send(new RemoveGalleryImageCommand(pageId, sectionId, expectedVersion, galleryImageId), ct);
}

[ApiController]
[Authorize]
[Route("api/admin/media")]
public class MediaController(ISender sender) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(ImageSignature.MaxBytes + 1024 * 1024)]
    public async Task<ActionResult<MediaDto>> Upload(IFormFile file, CancellationToken ct)
    {
        var dto = await sender.Send(new UploadMediaCommand(file.FileName, file.Length, file.OpenReadStream), ct);
        return StatusCode(StatusCodes.Status201Created, dto);
    }

    [HttpDelete("{mediaId:int}")]
    public async Task<IActionResult> Delete(int mediaId, CancellationToken ct)
    {
        await sender.Send(new DeleteMediaCommand(mediaId), ct);
        return NoContent();
    }
}
