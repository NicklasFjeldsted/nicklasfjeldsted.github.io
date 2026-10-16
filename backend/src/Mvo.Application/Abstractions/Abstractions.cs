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

public record EmailAttachment(string FileName, string ContentType, byte[] Content);

public record EmailMessage(string Subject, string TextBody, string HtmlBody, string? ReplyTo, IReadOnlyList<EmailAttachment> Attachments);

/// <summary>Sends mail through the configured SMTP server.</summary>
public interface IEmailSender
{
    /// <summary>False when no SMTP server is configured; mails are then only logged.</summary>
    bool IsConfigured { get; }

    /// <summary>The company's own inbox address, used as reply-to on mails to customers.</summary>
    string? CompanyAddress { get; }

    Task SendToCompanyAsync(EmailMessage message, CancellationToken cancellationToken);
    Task SendAsync(string to, string toName, EmailMessage message, CancellationToken cancellationToken);
}
