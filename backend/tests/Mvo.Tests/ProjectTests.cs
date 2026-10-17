using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Mvo.Application.Common;
using Mvo.Application.Features.Media;
using Mvo.Application.Features.Projects;
using Mvo.Infrastructure.Persistence;

namespace Mvo.Tests;

[Collection("host")]
public class ProjectTests(TestHost host)
{
    private static ProjectInput Input(IReadOnlyList<int> mediaIds, string title = "Badeværelse i Valby", bool featured = false, bool published = true) =>
        new(title, "bathroom", "Valby", new DateOnly(2026, 8, 20), "Kort tekst", "Første afsnit.\n\nAndet afsnit.", featured, published, mediaIds);

    private async Task UnfeatureAllAsync()
    {
        await using var scope = host.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Projects.ExecuteUpdateAsync(p => p.SetProperty(x => x.IsFeatured, false));
    }

    [Fact]
    public async Task Project_is_created_with_slug_and_images_in_order()
    {
        var a = await host.NewMediaAsync();
        var b = await host.NewMediaAsync();
        var project = await host.SendAsync(new CreateProjectCommand(Input([b, a], "Badeværelse på Østerbro")));

        project.Slug.Should().StartWith("badevaerelse-paa-oesterbro");
        project.Images.Select(i => i.MediaId).Should().Equal(b, a);
        project.Version.Should().Be(1);
    }

    [Fact]
    public async Task Same_title_gets_a_unique_slug()
    {
        var m = await host.NewMediaAsync();
        var first = await host.SendAsync(new CreateProjectCommand(Input([m], "Samme titel")));
        var second = await host.SendAsync(new CreateProjectCommand(Input([m], "Samme titel")));
        second.Slug.Should().NotBe(first.Slug).And.StartWith(first.Slug);
    }

    [Fact]
    public async Task Update_replaces_text_and_images_and_keeps_the_slug()
    {
        var a = await host.NewMediaAsync();
        var b = await host.NewMediaAsync();
        var created = await host.SendAsync(new CreateProjectCommand(Input([a])));

        var updated = await host.SendAsync(new UpdateProjectCommand(created.Id, created.Version, Input([b, a], "Ny titel")));

        updated.Title.Should().Be("Ny titel");
        updated.Slug.Should().Be(created.Slug);
        updated.Images.Select(i => i.MediaId).Should().Equal(b, a);
        updated.Version.Should().Be(created.Version + 1);

        var stale = () => host.SendAsync(new UpdateProjectCommand(created.Id, created.Version, Input([a])));
        await stale.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Public_list_has_only_visible_projects_with_paragraphs()
    {
        var m = await host.NewMediaAsync();
        var visible = await host.SendAsync(new CreateProjectCommand(Input([m], "Synligt projekt")));
        var hidden = await host.SendAsync(new CreateProjectCommand(Input([m], "Skjult projekt", published: false)));

        var list = await host.SendAsync(new GetPublicProjectsQuery());

        list.Should().Contain(p => p.Slug == visible.Slug);
        list.Should().NotContain(p => p.Slug == hidden.Slug);
        list.First(p => p.Slug == visible.Slug).Description.Should().Equal("Første afsnit.", "Andet afsnit.");
    }

    [Fact]
    public async Task A_visible_project_needs_an_image_and_a_known_category()
    {
        var noImages = () => host.SendAsync(new CreateProjectCommand(Input([])));
        await noImages.Should().ThrowAsync<ValidationException>();

        var m = await host.NewMediaAsync();
        var badCategory = () => host.SendAsync(new CreateProjectCommand(Input([m]) with { Category = "rumraket" }));
        await badCategory.Should().ThrowAsync<ValidationException>();

        var draft = await host.SendAsync(new CreateProjectCommand(Input([], published: false)));
        draft.Images.Should().BeEmpty();
    }

    [Fact]
    public async Task At_most_three_projects_can_be_featured()
    {
        await UnfeatureAllAsync();
        var m = await host.NewMediaAsync();
        for (var i = 0; i < ProjectRules.MaxFeatured; i++)
            await host.SendAsync(new CreateProjectCommand(Input([m], $"Fremhævet {i}", featured: true)));

        var fourth = () => host.SendAsync(new CreateProjectCommand(Input([m], "Fjerde", featured: true)));
        await fourth.Should().ThrowAsync<ConflictException>();
        await UnfeatureAllAsync();
    }

    [Fact]
    public async Task Images_used_by_a_project_show_in_the_library_and_cannot_be_deleted()
    {
        var m = await host.NewMediaAsync();
        var project = await host.SendAsync(new CreateProjectCommand(Input([m], "Arkivprojekt")));

        var detail = await host.SendAsync(new GetMediaDetailQuery(m));
        detail.Usages.Should().ContainSingle(u => u.Kind == "Project" && u.ProjectId == project.Id && u.SectionTitle == "Arkivprojekt" && u.Position == 1);

        var delete = () => host.SendAsync(new DeleteMediaCommand(m));
        await delete.Should().ThrowAsync<ConflictException>();

        await host.SendAsync(new DeleteProjectCommand(project.Id, project.Version));
        (await host.SendAsync(new GetMediaDetailQuery(m))).Usages.Should().BeEmpty();
        await host.SendAsync(new DeleteMediaCommand(m));
    }

    [Fact]
    public async Task Public_projects_endpoint_needs_no_login()
    {
        var response = await host.CreateClient().GetAsync("/api/projects");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await response.Content.ReadFromJsonAsync<List<PublicProjectDto>>()).Should().NotBeNull();
    }

    [Theory]
    [InlineData("Badeværelse i Valby", "badevaerelse-i-valby")]
    [InlineData("  Café & terrasse!! ", "cafe-terrasse")]
    [InlineData("???", "projekt")]
    public void Slugs_are_readable(string title, string slug) => ProjectRules.Slugify(title).Should().Be(slug);
}
