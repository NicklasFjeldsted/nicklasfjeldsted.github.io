using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Mvo.Application.Abstractions;
using Mvo.Application.Domain;
using Mvo.Infrastructure.Persistence;

namespace Mvo.Infrastructure;

public class MediaStorageOptions
{
    public string RootPath { get; set; } = "media";
    public string PublicBasePath { get; set; } = "/media";
}

public class JwtOptions
{
    public string Issuer { get; set; } = "mvo-api";
    public string Audience { get; set; } = "mvo-admin";
    public string Key { get; set; } = "";
    public int LifetimeMinutes { get; set; } = 120;
}

public class AdminSeedOptions
{
    public string? Email { get; set; }
    public string? Password { get; set; }
}

public class LocalMediaStorage(IOptions<MediaStorageOptions> options) : IMediaStorage
{
    private readonly string root = Path.GetFullPath(options.Value.RootPath);
    private readonly string basePath = options.Value.PublicBasePath.TrimEnd('/');

    public async Task SaveAsync(string storedFileName, Stream content, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(root);
        await using var file = File.Create(PathFor(storedFileName));
        await content.CopyToAsync(file, cancellationToken);
    }

    public Task DeleteAsync(string storedFileName, CancellationToken cancellationToken)
    {
        var path = PathFor(storedFileName);
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }

    public string GetUrl(string storedFileName) => $"{basePath}/{storedFileName}";

    private string PathFor(string storedFileName)
    {
        var path = Path.GetFullPath(Path.Combine(root, storedFileName));
        if (!path.StartsWith(root, StringComparison.Ordinal)) throw new InvalidOperationException("Invalid media file name.");
        return path;
    }
}

public class PasswordVerifier : IPasswordVerifier
{
    private readonly PasswordHasher<AdminUser> hasher = new();

    public bool Verify(string passwordHash, string password) =>
        hasher.VerifyHashedPassword(new AdminUser(), passwordHash, password) != PasswordVerificationResult.Failed;

    public string Hash(string password) => hasher.HashPassword(new AdminUser(), password);
}

public class TokenIssuer(IOptions<JwtOptions> options) : ITokenIssuer
{
    public TokenResult Issue(AdminUser user)
    {
        var jwt = options.Value;
        var expires = DateTime.UtcNow.AddMinutes(jwt.LifetimeMinutes);
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            jwt.Issuer, jwt.Audience,
            [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Email, user.Email), new Claim(ClaimTypes.Role, "Admin")],
            expires: expires, signingCredentials: credentials);
        return new TokenResult(new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}

public class AdminSeeder(AppDbContext db, PasswordVerifier passwords, IOptions<AdminSeedOptions> options)
{
    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        var seed = options.Value;
        if (string.IsNullOrWhiteSpace(seed.Email) || string.IsNullOrWhiteSpace(seed.Password)) return;
        if (await db.AdminUsers.AnyAsync(cancellationToken)) return;

        db.AdminUsers.Add(new AdminUser { Email = seed.Email.Trim().ToLowerInvariant(), PasswordHash = passwords.Hash(seed.Password) });
        await db.SaveChangesAsync(cancellationToken);
    }
}

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql("Server=localhost;Database=mvo", new MySqlServerVersion(new Version(8, 4, 0)))
            .Options;
        return new AppDbContext(options);
    }
}

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Mvo")
            ?? throw new InvalidOperationException("Connection string 'Mvo' is not configured.");

        services.AddDbContext<AppDbContext>(o => o.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.Configure<MediaStorageOptions>(configuration.GetSection("Media"));
        services.Configure<JwtOptions>(configuration.GetSection("Jwt"));
        services.Configure<AdminSeedOptions>(configuration.GetSection("Admin"));

        services.AddSingleton<IMediaStorage, LocalMediaStorage>();
        services.AddSingleton<PasswordVerifier>();
        services.AddSingleton<IPasswordVerifier>(sp => sp.GetRequiredService<PasswordVerifier>());
        services.AddSingleton<ITokenIssuer, TokenIssuer>();
        services.AddScoped<AdminSeeder>();
        return services;
    }
}
