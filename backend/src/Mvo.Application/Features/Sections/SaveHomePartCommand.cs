using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Domain;
using Mvo.Application.Features.Gallery;
using Mvo.Application.Features.Pages;

namespace Mvo.Application.Features.Sections;

/// <summary>A point of a home page part. Cards have a title (<see cref="Text"/>), a text and an icon; the hero's points only a text.</summary>
public record HomePartItemInput(string Text, string? Description, string? Icon);

/// <summary>
/// Saves one part of the home page at once. What a part holds depends on its key (see <see cref="HomePage"/>):
/// the hero has a heading, a text, points and a background image; the card parts have exactly four cards; the
/// services and projects parts only a heading.
/// </summary>
public record SaveHomePartCommand(
    int PageId, int SectionId, int ExpectedVersion, string? Eyebrow, string? Title, string? Description,
    IReadOnlyList<HomePartItemInput> Items, int? PrimaryMediaId) : IRequest<SectionContentDto>;

public class SaveHomePartValidator : AbstractValidator<SaveHomePartCommand>
{
    public SaveHomePartValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.SectionId).RequiredId();
        RuleFor(x => x.Eyebrow).OptionalText(SectionRules.ShortTextMax);
        RuleFor(x => x.Title).OptionalText(SectionRules.TitleMax);
        RuleFor(x => x.Description).OptionalText(SectionRules.ShortTextMax);
        RuleFor(x => x.Items).NotNull();
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Text).NotEmpty().MaximumLength(HomePage.CardTitleMax);
            item.RuleFor(i => i.Description).OptionalText(HomePage.CardTextMax);
            item.RuleFor(i => i.Icon).Must(i => i is null || HomePage.Icons.Contains(i)).WithMessage("Unknown icon.");
        });
        RuleFor(x => x.PrimaryMediaId).GreaterThan(0).When(x => x.PrimaryMediaId is not null);
    }
}

public class SaveHomePartHandler(IAppDbContext db, SectionContentLoader loader) : IRequestHandler<SaveHomePartCommand, SectionContentDto>
{
    public async Task<SectionContentDto> Handle(SaveHomePartCommand request, CancellationToken cancellationToken)
    {
        var section = await db.GetForUpdateAsync(request.PageId, request.SectionId, request.ExpectedVersion, false, true, cancellationToken);
        if (section.SectionTypeId != SectionTypeId.HomePart || section.Key is null)
            throw new ConflictException("This section is not a part of the home page.");

        var key = section.Key;
        EnsureFits(key, request);
        if (request.PrimaryMediaId is { } mediaId) await db.EnsureMediaExistsAsync([mediaId], cancellationToken);

        if (HomePage.HeadingParts.Contains(key))
        {
            section.Title = request.Title!.Trim();
            section.Eyebrow = string.IsNullOrWhiteSpace(request.Eyebrow) ? null : request.Eyebrow.Trim();
        }
        if (key == HomePage.Hero)
        {
            section.Description = request.Description!.Trim();
            if (section.PrimaryMediaId != request.PrimaryMediaId) section.PrimaryImageAltText = null;
            section.PrimaryMediaId = request.PrimaryMediaId;
        }

        db.SectionDetails.RemoveRange(section.Details);
        var cards = HomePage.CardParts.Contains(key);
        section.Details = request.Items
            .Select((item, index) => new SectionDetail
            {
                Text = item.Text.Trim(),
                Description = cards ? item.Description!.Trim() : null,
                Icon = cards ? item.Icon : null,
                DisplayOrder = index + 1,
            })
            .ToList();
        section.Version++;

        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await loader.LoadAsync(request.PageId, request.SectionId, cancellationToken);
    }

    /// <summary>The rules that depend on which part is saved, reported like the validator's.</summary>
    private static void EnsureFits(string key, SaveHomePartCommand request)
    {
        var errors = new List<ValidationFailure>();
        void Fail(string property, string message) => errors.Add(new ValidationFailure(property, message));

        if (HomePage.HeadingParts.Contains(key) && string.IsNullOrWhiteSpace(request.Title)) Fail(nameof(request.Title), "A heading is required.");
        if (key == HomePage.Hero)
        {
            if (string.IsNullOrWhiteSpace(request.Description)) Fail(nameof(request.Description), "A text is required.");
            if (request.Items.Count > HomePage.HeroPointsMax) Fail(nameof(request.Items), $"The top of the home page can have at most {HomePage.HeroPointsMax} points.");
        }
        else if (request.PrimaryMediaId is not null)
        {
            Fail(nameof(request.PrimaryMediaId), "Only the top of the home page has an image.");
        }

        if (HomePage.CardParts.Contains(key))
        {
            if (request.Items.Count != HomePage.CardCount) Fail(nameof(request.Items), $"This part has exactly {HomePage.CardCount} cards.");
            if (request.Items.Any(i => string.IsNullOrWhiteSpace(i.Description))) Fail(nameof(request.Items), "Every card needs a text.");
            if (request.Items.Any(i => i.Icon is null)) Fail(nameof(request.Items), "Every card needs an icon.");
        }
        else if (key != HomePage.Hero && request.Items.Count > 0)
        {
            Fail(nameof(request.Items), "This part of the home page has no points.");
        }

        if (errors.Count > 0) throw new ValidationException(errors);
    }
}
