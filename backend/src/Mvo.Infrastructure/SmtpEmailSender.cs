using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using Mvo.Application.Abstractions;

namespace Mvo.Infrastructure;

/// <summary>SMTP settings, from the "Mail" section (Mail__Host etc. in .env.production).</summary>
public class MailOptions
{
    /// <summary>SMTP server. Empty means mail is switched off and quote requests are only logged.</summary>
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public string? Username { get; set; }
    public string? Password { get; set; }

    /// <summary>"StartTls" (port 587), "SslOnConnect" (port 465), "None" or "Auto".</summary>
    public string Security { get; set; } = "StartTls";

    /// <summary>The sender address. Most providers require it to be the account you log in with.</summary>
    public string? FromAddress { get; set; }
    public string FromName { get; set; } = "Murerfirmaet MVO";

    /// <summary>Where new quote requests are sent. Defaults to <see cref="FromAddress"/>.</summary>
    public string? CompanyAddress { get; set; }
}

public class SmtpEmailSender(IOptions<MailOptions> options) : IEmailSender
{
    private readonly MailOptions settings = options.Value;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(settings.Host) && !string.IsNullOrWhiteSpace(settings.FromAddress);

    public string? CompanyAddress => string.IsNullOrWhiteSpace(settings.CompanyAddress) ? settings.FromAddress : settings.CompanyAddress;

    public Task SendToCompanyAsync(EmailMessage message, CancellationToken cancellationToken) =>
        SendAsync(CompanyAddress!, settings.FromName, message, cancellationToken);

    public async Task SendAsync(string to, string toName, EmailMessage message, CancellationToken cancellationToken)
    {
        if (!IsConfigured) throw new InvalidOperationException("Mail is not configured.");

        var mime = new MimeMessage { Subject = message.Subject };
        mime.From.Add(new MailboxAddress(settings.FromName, settings.FromAddress!));
        mime.To.Add(new MailboxAddress(toName, to));
        if (!string.IsNullOrWhiteSpace(message.ReplyTo)) mime.ReplyTo.Add(MailboxAddress.Parse(message.ReplyTo));

        var body = new BodyBuilder { TextBody = message.TextBody, HtmlBody = message.HtmlBody };
        foreach (var file in message.Attachments)
            body.Attachments.Add(file.FileName, file.Content, ContentType.Parse(file.ContentType));
        mime.Body = body.ToMessageBody();

        using var client = new SmtpClient { Timeout = 30_000 };
        await client.ConnectAsync(settings.Host!, settings.Port, SecurityFor(settings.Security), cancellationToken);
        if (!string.IsNullOrWhiteSpace(settings.Username))
            await client.AuthenticateAsync(settings.Username, settings.Password ?? "", cancellationToken);
        await client.SendAsync(mime, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }

    private static SecureSocketOptions SecurityFor(string value) => value.Trim().ToLowerInvariant() switch
    {
        "none" => SecureSocketOptions.None,
        "sslonconnect" or "ssl" => SecureSocketOptions.SslOnConnect,
        "auto" => SecureSocketOptions.Auto,
        _ => SecureSocketOptions.StartTls,
    };
}
