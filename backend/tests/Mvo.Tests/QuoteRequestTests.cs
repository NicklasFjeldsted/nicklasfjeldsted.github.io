using System.Net;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Features.Contact;

namespace Mvo.Tests;

public class RecordingEmailSender(bool configured = true, bool failCompany = false, bool failCustomer = false) : IEmailSender
{
    public List<EmailMessage> ToCompany { get; } = [];
    public List<(string To, EmailMessage Message)> ToCustomers { get; } = [];

    public bool IsConfigured => configured;
    public string? CompanyAddress => "firma@example.test";

    public Task SendToCompanyAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        if (failCompany) throw new IOException("SMTP down");
        ToCompany.Add(message);
        return Task.CompletedTask;
    }

    public Task SendAsync(string to, string toName, EmailMessage message, CancellationToken cancellationToken)
    {
        if (failCustomer) throw new IOException("SMTP down");
        ToCustomers.Add((to, message));
        return Task.CompletedTask;
    }
}

public class QuoteRequestTests
{
    private static SubmitQuoteRequestCommand Quote(string? email = "kunde@example.test", params QuoteAttachment[] files) =>
        new("Jens <b>Hansen</b>", "52 60 51 05", email, "bathroom", "Nyt badeværelse\npå 6 m²", files);

    private static QuoteAttachment File(string name, string content = "data") =>
        new(name, Encoding.UTF8.GetByteCount(content), () => new MemoryStream(Encoding.UTF8.GetBytes(content)));

    private static Task Handle(IEmailSender mail, SubmitQuoteRequestCommand command) =>
        new SubmitQuoteRequestHandler(mail, NullLogger<SubmitQuoteRequestHandler>.Instance).Handle(command, CancellationToken.None);

    [Fact]
    public async Task Sends_the_request_to_the_company_and_a_receipt_to_the_customer()
    {
        var mail = new RecordingEmailSender();
        await Handle(mail, Quote(files: File("bad.jpg")));

        var company = mail.ToCompany.Should().ContainSingle().Subject;
        company.Subject.Should().Be("Ny tilbudsforespørgsel: Badeværelse – Jens <b>Hansen</b>");
        company.ReplyTo.Should().Be("kunde@example.test");
        company.TextBody.Should().Contain("Telefon: 52 60 51 05").And.Contain("Opgave: Badeværelse");
        company.HtmlBody.Should().Contain("Jens &lt;b&gt;Hansen&lt;/b&gt;").And.NotContain("<b>Hansen");
        company.Attachments.Should().ContainSingle(a => a.FileName == "bad.jpg" && a.ContentType == "image/jpeg");

        var (to, receipt) = mail.ToCustomers.Should().ContainSingle().Subject;
        to.Should().Be("kunde@example.test");
        receipt.ReplyTo.Should().Be("firma@example.test");
        receipt.TextBody.Should().Contain("Nyt badeværelse");
        receipt.Attachments.Should().BeEmpty();
    }

    [Fact]
    public async Task Without_an_email_only_the_company_is_notified()
    {
        var mail = new RecordingEmailSender();
        await Handle(mail, Quote(email: " "));
        mail.ToCompany.Should().ContainSingle().Which.ReplyTo.Should().BeNull();
        mail.ToCustomers.Should().BeEmpty();
    }

    [Fact]
    public async Task Without_smtp_configured_nothing_is_sent_and_the_request_succeeds()
    {
        var mail = new RecordingEmailSender(configured: false);
        await Handle(mail, Quote());
        mail.ToCompany.Should().BeEmpty();
    }

    [Fact]
    public async Task A_failing_company_mail_tells_the_visitor_it_was_not_sent()
    {
        var act = () => Handle(new RecordingEmailSender(failCompany: true), Quote());
        await act.Should().ThrowAsync<ServiceUnavailableException>();
    }

    [Fact]
    public async Task A_failing_receipt_does_not_fail_the_request()
    {
        var mail = new RecordingEmailSender(failCustomer: true);
        await Handle(mail, Quote());
        mail.ToCompany.Should().ContainSingle();
    }

    [Theory]
    [InlineData("", "52605105", "bathroom")]
    [InlineData("Jens", "", "bathroom")]
    [InlineData("Jens", "ring mig", "bathroom")]
    [InlineData("Jens", "52605105", "pool")]
    [InlineData("Jens\r\nBcc: x@y.z", "52605105", "bathroom")]
    public void Rejects_missing_or_bad_fields(string name, string phone, string category)
    {
        var result = new SubmitQuoteRequestValidator().Validate(new SubmitQuoteRequestCommand(name, phone, null, category, null, []));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Rejects_bad_emails_and_files()
    {
        var validator = new SubmitQuoteRequestValidator();
        validator.Validate(Quote(email: "ikke-en-mail")).IsValid.Should().BeFalse();
        validator.Validate(Quote(files: File("virus.exe"))).IsValid.Should().BeFalse();
        validator.Validate(Quote(files: Enumerable.Range(0, 6).Select(i => File($"{i}.jpg")).ToArray())).IsValid.Should().BeFalse();
        validator.Validate(Quote(files: new QuoteAttachment("stor.jpg", QuoteLimits.MaxFileBytes + 1, () => Stream.Null))).IsValid.Should().BeFalse();
        validator.Validate(Quote(files: [File("a.pdf"), File("b.HEIC")])).IsValid.Should().BeTrue();
    }
}

[Collection("host")]
public class QuoteEndpointTests(TestHost host)
{
    private static MultipartFormDataContent Form(params (string Key, string Value)[] fields)
    {
        var form = new MultipartFormDataContent();
        foreach (var (key, value) in fields) form.Add(new StringContent(value), key);
        return form;
    }

    [Fact]
    public async Task Valid_request_is_accepted_and_invalid_one_is_rejected()
    {
        using var client = host.CreateClient();
        var ok = await client.PostAsync("/api/contact/quote",
            Form(("name", "Jens"), ("phone", "52605105"), ("category", "tiles"), ("message", "Fliser i køkken")));
        ok.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var bad = await client.PostAsync("/api/contact/quote", Form(("name", "Jens"), ("category", "tiles")));
        bad.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Honeypot_submissions_are_silently_dropped()
    {
        using var client = host.CreateClient();
        var response = await client.PostAsync("/api/contact/quote", Form(("website", "http://spam"), ("name", "")));
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
