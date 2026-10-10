using Microsoft.EntityFrameworkCore;
using Mvo.Application.Domain;

namespace Mvo.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<ContentPage> Pages { get; }
    DbSet<ContentSection> Sections { get; }
    DbSet<SectionType> SectionTypes { get; }
    DbSet<SectionDetail> SectionDetails { get; }
    DbSet<MediaAsset> MediaAssets { get; }
    DbSet<GalleryImage> GalleryImages { get; }
    DbSet<AdminUser> AdminUsers { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}

public interface IMediaStorage
{
    Task SaveAsync(string storedFileName, Stream content, CancellationToken cancellationToken);
    Task DeleteAsync(string storedFileName, CancellationToken cancellationToken);
    string GetUrl(string storedFileName);
}

public interface IPasswordVerifier
{
    bool Verify(string passwordHash, string password);
}

public interface ITokenIssuer
{
    TokenResult Issue(AdminUser user);
}

public record TokenResult(string Token, DateTime ExpiresUtc);
