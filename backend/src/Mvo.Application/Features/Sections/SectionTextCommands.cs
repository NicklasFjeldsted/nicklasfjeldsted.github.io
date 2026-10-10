using FluentValidation;
using MediatR;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Domain;

namespace Mvo.Application.Features.Sections;

public record UpdateSectionTextCommand(
    int PageId, int SectionId, int ExpectedVersion, string Title, string? Eyebrow, string? Introduction,
    string Description, string? AdditionalDescription, IReadOnlyList<string> Details) : IRequest<SectionContentDto>;

public class UpdateSectionTextValidator : AbstractValidator<UpdateSectionTextCommand>
{
    public UpdateSectionTextValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.SectionId).RequiredId();
        RuleFor(x => x.Title).RequiredText(SectionRules.TitleMax);
        RuleFor(x => x.Eyebrow).OptionalText(SectionRules.ShortTextMax);
        RuleFor(x => x.Introduction).OptionalText(SectionRules.LongTextMax);
        RuleFor(x => x.Description).RequiredText(SectionRules.LongTextMax);
        RuleFor(x => x.AdditionalDescription).OptionalText(SectionRules.LongTextMax);
        RuleFor(x => x.Details).NotNull().Must(d => d is null || d.Count <= SectionRules.DetailsMaxCount)
            .WithMessage($"A section can have at most {SectionRules.DetailsMaxCount} detail lines.");
        RuleForEach(x => x.Details).NotEmpty().MaximumLength(SectionRules.DetailMax);
    }
}

public class UpdateSectionTextHandler(IAppDbContext db, SectionContentLoader loader)
    : IRequestHandler<UpdateSectionTextCommand, SectionContentDto>
{
    public async Task<SectionContentDto> Handle(UpdateSectionTextCommand request, CancellationToken cancellationToken)
    {
        var section = await db.GetForUpdateAsync(request.PageId, request.SectionId, request.ExpectedVersion, false, true, cancellationToken);

        section.Title = request.Title.Trim();
        section.Eyebrow = Normalize(request.Eyebrow);
        section.Introduction = Normalize(request.Introduction);
        section.Description = request.Description.Trim();
        section.AdditionalDescription = Normalize(request.AdditionalDescription);

        db.SectionDetails.RemoveRange(section.Details);
        section.Details = request.Details
            .Select((text, index) => new SectionDetail { Text = text.Trim(), DisplayOrder = index + 1 })
            .ToList();
        section.Version++;

        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await loader.LoadAsync(request.PageId, request.SectionId, cancellationToken);
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public record SetSectionVisibilityCommand(int PageId, int SectionId, int ExpectedVersion, bool IsPublished)
    : IRequest<SectionContentDto>;

public class SetSectionVisibilityValidator : AbstractValidator<SetSectionVisibilityCommand>
{
    public SetSectionVisibilityValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.SectionId).RequiredId();
    }
}

public class SetSectionVisibilityHandler(IAppDbContext db, SectionContentLoader loader)
    : IRequestHandler<SetSectionVisibilityCommand, SectionContentDto>
{
    public async Task<SectionContentDto> Handle(SetSectionVisibilityCommand request, CancellationToken cancellationToken)
    {
        var section = await db.GetForUpdateAsync(request.PageId, request.SectionId, request.ExpectedVersion, false, false, cancellationToken);
        section.IsPublished = request.IsPublished;
        section.Version++;
        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await loader.LoadAsync(request.PageId, request.SectionId, cancellationToken);
    }
}
