using System.Net;
using System.Text;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;

namespace Mvo.Application.Features.Contact;

/// <summary>The categories in the quote form. Keys match the frontend (quote-categories.constants.ts).</summary>
public static class QuoteCategories
{
    public static readonly IReadOnlyDictionary<string, string> Labels = new Dictionary<string, string>
    {
        ["bathroom"] = "Badeværelse",
        ["tiles"] = "Fliser og klinker",
        ["masonry"] = "Murerarbejde",
        ["plaster"] = "Puds og facade",
        ["renovation"] = "Renovering",
        ["repair"] = "Reparationer og småopgaver",
        ["other"] = "Andet",
    };
}

public record QuoteAttachment(string FileName, long Length, Func<Stream> OpenStream);

public record SubmitQuoteRequestCommand(
    string Name, string Phone, string? Email, string Category, string? Message, IReadOnlyList<QuoteAttachment> Attachments) : IRequest;

public static class QuoteLimits
{
    public const int MaxFiles = 5;
    public const long MaxFileBytes = 10 * 1024 * 1024;
    public const long MaxTotalBytes = 20 * 1024 * 1024;
    public static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".pdf"];
}

public class SubmitQuoteRequestValidator : AbstractValidator<SubmitQuoteRequestCommand>
{
    public SubmitQuoteRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100).Must(NoLineBreaks);
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(30).Matches(@"^[0-9+()\s-]{6,}$");
        RuleFor(x => x.Email).MaximumLength(200).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Category).Must(c => QuoteCategories.Labels.ContainsKey(c)).WithMessage("Unknown category.");
        RuleFor(x => x.Message).MaximumLength(5000);
        RuleFor(x => x.Attachments).Must(a => a.Count <= QuoteLimits.MaxFiles)
            .WithMessage($"At most {QuoteLimits.MaxFiles} files.");
        RuleFor(x => x.Attachments).Must(a => a.Sum(f => f.Length) <= QuoteLimits.MaxTotalBytes)
            .WithMessage("The files are too large in total.");
        RuleForEach(x => x.Attachments).ChildRules(f =>
        {
            f.RuleFor(a => a.Length).GreaterThan(0).LessThanOrEqualTo(QuoteLimits.MaxFileBytes);
            f.RuleFor(a => a.FileName).NotEmpty().MaximumLength(255)
                .Must(n => QuoteLimits.AllowedExtensions.Contains(Path.GetExtension(n).ToLowerInvariant()))
                .WithMessage("Only images (JPG, PNG, WebP, HEIC) and PDF files are allowed.");
        });
    }

    private static bool NoLineBreaks(string value) => !value.Contains('\n') && !value.Contains('\r');
}

public class SubmitQuoteRequestHandler(IEmailSender mail, ILogger<SubmitQuoteRequestHandler> logger)
    : IRequestHandler<SubmitQuoteRequestCommand>
{
    public async Task Handle(SubmitQuoteRequestCommand request, CancellationToken cancellationToken)
    {
        var quote = Normalize(request);
        var summary = QuoteMails.LogSummary(quote);

        if (!mail.IsConfigured)
        {
            // No SMTP yet: keep the request in the log so it is not lost.
            logger.LogWarning("Mail is not configured; quote request was not emailed. {Summary}", summary);
            return;
        }

        var attachments = await ReadAttachmentsAsync(request.Attachments, cancellationToken);
        try
        {
            await mail.SendToCompanyAsync(QuoteMails.ForCompany(quote, attachments), cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Could not email quote request to the company. {Summary}", summary);
            throw new ServiceUnavailableException("The request could not be sent. Please call us instead.");
        }

        if (quote.Email is null) return;
        try
        {
            await mail.SendAsync(quote.Email, quote.Name, QuoteMails.ForCustomer(quote, mail.CompanyAddress), cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // The company has the request; a missing receipt should not fail the submission.
            logger.LogWarning(ex, "Could not send quote confirmation to the customer.");
        }
    }

    private static QuoteDetails Normalize(SubmitQuoteRequestCommand r) => new(
        r.Name.Trim(), r.Phone.Trim(), string.IsNullOrWhiteSpace(r.Email) ? null : r.Email.Trim(),
        QuoteCategories.Labels[r.Category], string.IsNullOrWhiteSpace(r.Message) ? null : r.Message.Trim(),
        r.Attachments.Select(a => Path.GetFileName(a.FileName)).ToList());

    private static async Task<List<EmailAttachment>> ReadAttachmentsAsync(IReadOnlyList<QuoteAttachment> files, CancellationToken ct)
    {
        var result = new List<EmailAttachment>(files.Count);
        foreach (var file in files)
        {
            await using var stream = file.OpenStream();
            using var buffer = new MemoryStream();
            await stream.CopyToAsync(buffer, ct);
            result.Add(new EmailAttachment(Path.GetFileName(file.FileName), ContentTypeFor(file.FileName), buffer.ToArray()));
        }
        return result;
    }

    private static string ContentTypeFor(string fileName) => Path.GetExtension(fileName).ToLowerInvariant() switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        ".heic" => "image/heic",
        ".pdf" => "application/pdf",
        _ => "application/octet-stream",
    };
}

public record QuoteDetails(string Name, string Phone, string? Email, string Category, string? Message, IReadOnlyList<string> FileNames);

/// <summary>The Danish mail texts sent when a quote request comes in.</summary>
public static class QuoteMails
{
    public static EmailMessage ForCompany(QuoteDetails q, IReadOnlyList<EmailAttachment> attachments)
    {
        var rows = Rows(q);
        var text = new StringBuilder("Ny forespørgsel på et uforpligtende tilbud fra hjemmesiden.\n\n");
        foreach (var (label, value) in rows) text.Append(label).Append(": ").Append(value).Append('\n');
        if (q.Email is not null) text.Append("\nDu kan svare direkte på denne mail for at skrive til kunden.\n");

        var html = new StringBuilder("<p>Ny forespørgsel på et uforpligtende tilbud fra hjemmesiden.</p>");
        html.Append(Table(rows));
        if (q.Email is not null) html.Append("<p>Du kan svare direkte på denne mail for at skrive til kunden.</p>");

        return new EmailMessage($"Ny tilbudsforespørgsel: {q.Category} – {q.Name}", text.ToString(), Wrap(html.ToString()), q.Email, attachments);
    }

    public static EmailMessage ForCustomer(QuoteDetails q, string? companyAddress)
    {
        var rows = Rows(q);
        var intro = $"Hej {q.Name}\n\nTak for din forespørgsel. Vi har modtaget dine oplysninger og vender tilbage hurtigst muligt " +
                    "med et gratis og uforpligtende tilbud.\n\nDet har du sendt til os:\n";
        var text = new StringBuilder(intro);
        foreach (var (label, value) in rows) text.Append(label).Append(": ").Append(value).Append('\n');
        text.Append("\nHar du spørgsmål i mellemtiden, er du velkommen til at ringe på 52 60 51 05.\n\nVenlig hilsen\nMurerfirmaet MVO ApS\n");

        var html = new StringBuilder($"<p>Hej {E(q.Name)}</p>")
            .Append("<p>Tak for din forespørgsel. Vi har modtaget dine oplysninger og vender tilbage hurtigst muligt med et gratis og uforpligtende tilbud.</p>")
            .Append("<p>Det har du sendt til os:</p>")
            .Append(Table(rows))
            .Append("<p>Har du spørgsmål i mellemtiden, er du velkommen til at ringe på <a href=\"tel:+4552605105\">52 60 51 05</a>.</p>")
            .Append("<p>Venlig hilsen<br>Murerfirmaet MVO ApS</p>");

        return new EmailMessage("Tak for din forespørgsel – Murerfirmaet MVO", text.ToString(), Wrap(html.ToString()), companyAddress, []);
    }

    public static string LogSummary(QuoteDetails q) =>
        string.Join(" | ", Rows(q).Select(r => $"{r.Label}: {r.Value.Replace('\n', ' ')}"));

    private static List<(string Label, string Value)> Rows(QuoteDetails q)
    {
        var rows = new List<(string, string)> { ("Navn", q.Name), ("Telefon", q.Phone) };
        if (q.Email is not null) rows.Add(("E-mail", q.Email));
        rows.Add(("Opgave", q.Category));
        rows.Add(("Besked", q.Message ?? "(ingen besked)"));
        if (q.FileNames.Count > 0) rows.Add(("Vedhæftede filer", string.Join(", ", q.FileNames)));
        return rows;
    }

    private static string Table(IEnumerable<(string Label, string Value)> rows)
    {
        var sb = new StringBuilder("<table cellpadding=\"6\" style=\"border-collapse:collapse\">");
        foreach (var (label, value) in rows)
            sb.Append("<tr><td style=\"vertical-align:top;font-weight:bold\">").Append(E(label)).Append("</td><td>")
              .Append(E(value).Replace("\n", "<br>")).Append("</td></tr>");
        return sb.Append("</table>").ToString();
    }

    private static string Wrap(string body) =>
        $"<!doctype html><html><body style=\"font-family:Arial,sans-serif;font-size:15px;color:#1d1d1d\">{body}</body></html>";

    private static string E(string value) => WebUtility.HtmlEncode(value);
}
