using FluentValidation;

namespace Mvo.Application.Features.Sections;

public static class SectionRules
{
    public const int TitleMax = 200;
    public const int ShortTextMax = 500;
    public const int LongTextMax = 4000;
    public const int AltTextMax = 300;
    public const int DetailMax = 300;
    public const int DetailsMaxCount = 20;
    public const int GalleryMaxImages = 40;

    public static IRuleBuilderOptions<T, string> RequiredText<T>(this IRuleBuilder<T, string> rule, int max) =>
        rule.NotEmpty().MaximumLength(max);

    public static IRuleBuilderOptions<T, string?> OptionalText<T>(this IRuleBuilder<T, string?> rule, int max) =>
        rule.MaximumLength(max);

    public static IRuleBuilderOptions<T, int> RequiredId<T>(this IRuleBuilder<T, int> rule) => rule.GreaterThan(0);
}
