using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Mvo.Application.Domain;
using Mvo.Application.Features.Media;
using Mvo.Application.Features.Sections;
using Testcontainers.MySql;

namespace Mvo.Tests;

public class TestHost : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string AdminEmail = "admin@example.test";
    public const string AdminPassword = "Test-password-123!";

    private readonly MySqlContainer container = new MySqlBuilder().WithImage("mysql:8.4").Build();
    private readonly string mediaRoot = Path.Combine(Path.GetTempPath(), "mvo-tests-" + Guid.NewGuid().ToString("N"));

    public async Task InitializeAsync() => await container.StartAsync();

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await container.DisposeAsync();
        if (Directory.Exists(mediaRoot)) Directory.Delete(mediaRoot, true);
    }

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Mvo", container.GetConnectionString());
        builder.UseSetting("Jwt:Key", "test-signing-key-test-signing-key-1234567890");
        builder.UseSetting("Media:RootPath", mediaRoot);
        builder.UseSetting("Admin:Email", AdminEmail);
        builder.UseSetting("Admin:Password", AdminPassword);
    }

    public async Task<T> SendAsync<T>(IRequest<T> request)
    {
        await using var scope = Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(request);
    }

    public async Task SendAsync(IRequest request)
    {
        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<ISender>().Send(request);
    }

    public const int ManagedPageId = 2;

    public Task<SectionContentDto> NewSectionAsync(string title = "Test", SectionTypeId type = SectionTypeId.MasonryShowcase) =>
        SendAsync(new CreateSectionCommand(ManagedPageId, title, type));

    public async Task<int> NewMediaAsync(string? name = null, string fileName = "billede.png")
    {
        var png = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4, 5, 6 };
        var media = await SendAsync(new UploadMediaCommand(fileName, png.Length, () => new MemoryStream(png), name));
        return media.Id;
    }
}

[CollectionDefinition("host")]
public class HostCollection : ICollectionFixture<TestHost>;
