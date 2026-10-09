namespace Mvo.Application.Features.Sections;

public record PrimaryImageDto(int MediaId, string Url, string? AltText);

public record GalleryImageDto(int Id, int MediaId, string Url, string? AltText, int Position);

public record SectionListItemDto(int Id, string Title, string SectionType, int DisplayOrder, bool IsPublished, int Version);

public record SectionContentDto(
    int Id,
    int PageId,
    string Title,
    string? Eyebrow,
    string? Introduction,
    string Description,
    string? AdditionalDescription,
    IReadOnlyList<string> Details,
    string SectionType,
    string SectionTypeName,
    bool HasPrimaryImage,
    bool HasGallery,
    int DisplayOrder,
    bool IsPublished,
    int Version,
    PrimaryImageDto? PrimaryImage,
    IReadOnlyList<GalleryImageDto> Gallery);
