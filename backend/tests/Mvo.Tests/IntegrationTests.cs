using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Features.Gallery;
using Mvo.Application.Features.Pages;
using Mvo.Application.Features.Public;
using Mvo.Application.Features.Sections;

namespace Mvo.Tests;

[Collection("host")]
public class PageAndTextTests(TestHost host)
{
    [Fact]
    public async Task Pages_and_sections_can_be_retrieved()
    {
        var section = await host.NewSectionAsync("Hentes");
        var pages = await host.SendAsync(new GetPagesQuery());
        pages.Should().Contain(p => p.Slug == "specialiseret-murerarbejde");

        var page = await host.SendAsync(new GetPageQuery(TestHost.ManagedPageId));
        page.Sections.Should().Contain(s => s.Id == section.Id);

        var loaded = await host.SendAsync(new GetSectionContentQuery(TestHost.ManagedPageId, section.Id));
        loaded.Title.Should().Be("Hentes");
    }

    [Fact]
    public async Task Section_text_update_persists_and_bumps_version()
    {
        var s = await host.NewSectionAsync();
        var updated = await host.SendAsync(new UpdateSectionTextCommand(
            s.PageId, s.Id, s.Version, "Ny titel", "Overskrift", "Intro", "Beskrivelse", "Mere", ["Et", "To"]));

        updated.Version.Should().BeGreaterThan(s.Version);
        var reloaded = await host.SendAsync(new GetSectionContentQuery(s.PageId, s.Id));
        reloaded.Title.Should().Be("Ny titel");
        reloaded.Details.Should().Equal("Et", "To");
    }

    [Fact]
    public async Task Stale_version_is_rejected_as_conflict()
    {
        var s = await host.NewSectionAsync();
        await host.SendAsync(new UpdateSectionTextCommand(s.PageId, s.Id, s.Version, "A", null, null, "d", null, []));

        var stale = () => host.SendAsync(new UpdateSectionTextCommand(s.PageId, s.Id, s.Version, "B", null, null, "d", null, []));
        await stale.Should().ThrowAsync<ConflictException>();
        (await host.SendAsync(new GetSectionContentQuery(s.PageId, s.Id))).Title.Should().Be("A");
    }

    [Fact]
    public async Task Section_cannot_be_modified_through_an_unrelated_page()
    {
        var s = await host.NewSectionAsync();
        var act = () => host.SendAsync(new UpdateSectionTextCommand(1, s.Id, s.Version, "Hijack", null, null, "d", null, []));
        await act.Should().ThrowAsync<NotFoundException>();
        (await host.SendAsync(new GetSectionContentQuery(s.PageId, s.Id))).Title.Should().Be(s.Title);
    }

    [Fact]
    public async Task Invalid_ids_yield_not_found_or_validation_errors()
    {
        var missing = () => host.SendAsync(new GetSectionContentQuery(TestHost.ManagedPageId, 999_999));
        await missing.Should().ThrowAsync<NotFoundException>();
        var invalid = () => host.SendAsync(new GetSectionContentQuery(0, -4));
        await invalid.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task Public_endpoint_returns_only_published_sections()
    {
        var s = await host.NewSectionAsync("Skjult");
        var before = await host.SendAsync(new GetPublicPageQuery("specialiseret-murerarbejde"));
        before.Sections.Should().NotContain(x => x.Title == "Skjult");

        await host.SendAsync(new SetSectionVisibilityCommand(s.PageId, s.Id, s.Version, true));
        var after = await host.SendAsync(new GetPublicPageQuery("specialiseret-murerarbejde"));
        after.Sections.Should().Contain(x => x.Title == "Skjult");
    }
}

[Collection("host")]
public class GalleryTests(TestHost host)
{
    private async Task<SectionContentDto> WithImagesAsync(int count)
    {
        var s = await host.NewSectionAsync();
        var inputs = new List<GalleryImageInput>();
        for (var i = 0; i < count; i++) inputs.Add(new GalleryImageInput(await host.NewMediaAsync(), $"Billede {i}"));
        return await host.SendAsync(new AddGalleryImagesCommand(s.PageId, s.Id, s.Version, inputs));
    }

    [Fact]
    public async Task Primary_image_can_be_set_and_replaced()
    {
        var s = await host.NewSectionAsync();
        var first = await host.NewMediaAsync();
        var second = await host.NewMediaAsync();

        s = await host.SendAsync(new SetPrimaryImageCommand(s.PageId, s.Id, s.Version, first, "Første"));
        s.PrimaryImage!.MediaId.Should().Be(first);
        s = await host.SendAsync(new SetPrimaryImageCommand(s.PageId, s.Id, s.Version, second, null));
        s.PrimaryImage!.MediaId.Should().Be(second);
    }

    [Fact]
    public async Task Gallery_images_are_added_in_order_with_sequential_positions()
    {
        var s = await WithImagesAsync(3);
        s.Gallery.Select(g => g.Position).Should().Equal(0, 1, 2);
        s.Gallery.Select(g => g.AltText).Should().Equal("Billede 0", "Billede 1", "Billede 2");
    }

    [Fact]
    public async Task Removing_an_image_closes_the_gap_and_keeps_the_asset()
    {
        var s = await WithImagesAsync(3);
        var removed = s.Gallery[1];
        s = await host.SendAsync(new RemoveGalleryImageCommand(s.PageId, s.Id, s.Version, removed.Id));

        s.Gallery.Select(g => g.Position).Should().Equal(0, 1);
        s.Gallery.Should().NotContain(g => g.Id == removed.Id);
        // the asset itself must still exist so it can be reused
        await host.SendAsync(new AddGalleryImagesCommand(s.PageId, s.Id, s.Version, [new GalleryImageInput(removed.MediaId, null)]));
    }

    [Fact]
    public async Task Replacing_an_image_keeps_its_position()
    {
        var s = await WithImagesAsync(3);
        var target = s.Gallery[1];
        var newMedia = await host.NewMediaAsync();

        s = await host.SendAsync(new ReplaceGalleryImageCommand(s.PageId, s.Id, s.Version, target.Id, newMedia, "Ny"));
        s.Gallery[1].MediaId.Should().Be(newMedia);
        s.Gallery.Select(g => g.Position).Should().Equal(0, 1, 2);
    }

    [Fact]
    public async Task Reordering_applies_the_requested_order_and_persists()
    {
        var s = await WithImagesAsync(4);
        var ids = s.Gallery.Select(g => g.Id).ToList();
        var order = new[] { ids[3], ids[0], ids[2], ids[1] };

        s = await host.SendAsync(new ReorderGalleryCommand(s.PageId, s.Id, s.Version, order));
        s.Gallery.Select(g => g.Id).Should().Equal(order);
        s.Gallery.Select(g => g.Position).Should().Equal(0, 1, 2, 3);

        var reloaded = await host.SendAsync(new GetSectionContentQuery(s.PageId, s.Id));
        reloaded.Gallery.Select(g => g.Id).Should().Equal(order);
    }

    [Fact]
    public async Task Reordering_with_missing_unknown_or_foreign_ids_is_rejected_and_changes_nothing()
    {
        var a = await WithImagesAsync(3);
        var b = await WithImagesAsync(2);
        var original = a.Gallery.Select(g => g.Id).ToList();

        var missingOne = () => host.SendAsync(new ReorderGalleryCommand(a.PageId, a.Id, a.Version, original.Take(2).ToList()));
        await missingOne.Should().ThrowAsync<Exception>();

        var foreign = () => host.SendAsync(new ReorderGalleryCommand(a.PageId, a.Id, a.Version, [original[0], original[1], b.Gallery[0].Id]));
        await foreign.Should().ThrowAsync<Exception>();

        var unknown = () => host.SendAsync(new ReorderGalleryCommand(a.PageId, a.Id, a.Version, [original[0], original[1], 999_999]));
        await unknown.Should().ThrowAsync<Exception>();

        (await host.SendAsync(new GetSectionContentQuery(a.PageId, a.Id))).Gallery.Select(g => g.Id).Should().Equal(original);
    }

    [Fact]
    public async Task One_gallery_is_unaffected_by_changes_to_another()
    {
        var a = await WithImagesAsync(3);
        var b = await WithImagesAsync(3);
        var bBefore = b.Gallery.Select(g => (g.Id, g.Position, g.MediaId)).ToList();

        var reversed = a.Gallery.Select(g => g.Id).Reverse().ToList();
        a = await host.SendAsync(new ReorderGalleryCommand(a.PageId, a.Id, a.Version, reversed));
        await host.SendAsync(new RemoveGalleryImageCommand(a.PageId, a.Id, a.Version, a.Gallery[0].Id));

        var bAfter = await host.SendAsync(new GetSectionContentQuery(b.PageId, b.Id));
        bAfter.Gallery.Select(g => (g.Id, g.Position, g.MediaId)).Should().Equal(bBefore);
        bAfter.Version.Should().Be(b.Version);
    }

    [Fact]
    public async Task Unknown_gallery_image_and_unknown_media_are_not_found()
    {
        var s = await WithImagesAsync(1);
        var badRemove = () => host.SendAsync(new RemoveGalleryImageCommand(s.PageId, s.Id, s.Version, 999_999));
        await badRemove.Should().ThrowAsync<NotFoundException>();
        var badMedia = () => host.SendAsync(new SetPrimaryImageCommand(s.PageId, s.Id, s.Version, 999_999, null));
        await badMedia.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task Persistence_failure_is_not_reported_as_success_and_leaves_data_unchanged()
    {
        var s = await WithImagesAsync(2);
        var order = s.Gallery.Select(g => g.Id).Reverse().ToList();

        await using var scope = host.Services.CreateAsyncScope();
        var failing = new FailingDb(scope.ServiceProvider.GetRequiredService<IAppDbContext>());
        var handler = ActivatorUtilities.CreateInstance<ReorderGalleryHandler>(scope.ServiceProvider, failing);

        var act = () => handler.Handle(new ReorderGalleryCommand(s.PageId, s.Id, s.Version, order), CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>();

        var reloaded = await host.SendAsync(new GetSectionContentQuery(s.PageId, s.Id));
        reloaded.Gallery.Select(g => g.Id).Should().Equal(s.Gallery.Select(g => g.Id));
        reloaded.Version.Should().Be(s.Version);
    }
}

[Collection("host")]
public class MediaAndHttpTests(TestHost host)
{
    private HttpClient Client() => host.CreateClient();

    private async Task<HttpClient> AdminClientAsync()
    {
        var client = Client();
        var response = await client.PostAsJsonAsync("/api/admin/auth/login", new { email = TestHost.AdminEmail, password = TestHost.AdminPassword });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var token = await response.Content.ReadFromJsonAsync<TokenResult>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token!.Token);
        return client;
    }

    [Theory]
    [InlineData("GET", "/api/admin/pages")]
    [InlineData("GET", "/api/admin/pages/2")]
    [InlineData("PUT", "/api/admin/pages/2/sections/1/text")]
    [InlineData("PUT", "/api/admin/pages/2/sections/1/primary-image")]
    [InlineData("POST", "/api/admin/pages/2/sections/1/gallery")]
    [InlineData("PUT", "/api/admin/pages/2/sections/1/gallery/order")]
    [InlineData("DELETE", "/api/admin/pages/2/sections/1/gallery/1?expectedVersion=1")]
    [InlineData("POST", "/api/admin/media")]
    public async Task Admin_endpoints_reject_unauthenticated_requests(string method, string url)
    {
        var response = await Client().SendAsync(new HttpRequestMessage(new HttpMethod(method), url));
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Bad_token_is_rejected()
    {
        var client = Client();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "not-a-token");
        (await client.GetAsync("/api/admin/pages")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Wrong_password_is_unauthorized()
    {
        var response = await Client().PostAsJsonAsync("/api/admin/auth/login", new { email = TestHost.AdminEmail, password = "wrong" });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Public_page_is_available_without_login()
    {
        var response = await Client().GetAsync("/api/pages/specialiseret-murerarbejde");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Client().GetAsync("/api/pages/findes-ikke")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Validation_errors_are_structured_per_field()
    {
        var client = await AdminClientAsync();
        var s = await host.NewSectionAsync();
        var response = await client.PutAsJsonAsync($"/api/admin/pages/{s.PageId}/sections/{s.Id}/text",
            new { expectedVersion = s.Version, title = "", description = "", details = Array.Empty<string>() });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Title").And.Contain("Description");
    }

    [Fact]
    public async Task Stale_version_over_http_is_409()
    {
        var client = await AdminClientAsync();
        var s = await host.NewSectionAsync();
        var body = new { expectedVersion = s.Version + 50, title = "x", description = "y", details = Array.Empty<string>() };
        (await client.PutAsJsonAsync($"/api/admin/pages/{s.PageId}/sections/{s.Id}/text", body)).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Upload_accepts_a_real_image_and_serves_it()
    {
        var client = await AdminClientAsync();
        var png = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 9, 9, 9, 9 };
        using var form = new MultipartFormDataContent { { new ByteArrayContent(png), "file", "foto.png" } };

        var response = await client.PostAsync("/api/admin/media", form);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var media = await response.Content.ReadFromJsonAsync<Mvo.Application.Features.Media.MediaDto>();
        (await Client().GetAsync(media!.Url)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Upload_rejects_a_disguised_file_by_content_not_name_or_content_type()
    {
        var client = await AdminClientAsync();
        var exe = "MZ\x90\0\x03\0\0\0\x04\0\0\0 not an image"u8.ToArray();
        var file = new ByteArrayContent(exe);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        using var form = new MultipartFormDataContent { { file, "file", "harmless.png" } };

        (await client.PostAsync("/api/admin/media", form)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Upload_failing_to_save_to_the_database_does_not_leave_a_file_behind()
    {
        await using var scope = host.Services.CreateAsyncScope();
        var storage = new RecordingStorage();
        var failing = new FailingDb(scope.ServiceProvider.GetRequiredService<IAppDbContext>());
        var handler = new Mvo.Application.Features.Media.UploadMediaHandler(failing, storage);
        var png = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4 };

        var act = () => handler.Handle(new Mvo.Application.Features.Media.UploadMediaCommand("a.png", png.Length, () => new MemoryStream(png)), CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>();
        storage.Saved.Should().HaveCount(1);
        storage.Deleted.Should().BeEquivalentTo(storage.Saved);
    }

    [Fact]
    public async Task Media_in_use_cannot_be_deleted()
    {
        var s = await host.NewSectionAsync();
        var mediaId = await host.NewMediaAsync();
        await host.SendAsync(new SetPrimaryImageCommand(s.PageId, s.Id, s.Version, mediaId, null));

        var act = () => host.SendAsync(new Mvo.Application.Features.Media.DeleteMediaCommand(mediaId));
        await act.Should().ThrowAsync<ConflictException>();
    }
}
