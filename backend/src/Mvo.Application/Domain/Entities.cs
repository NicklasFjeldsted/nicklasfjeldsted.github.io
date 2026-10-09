namespace Mvo.Application.Domain;

public enum SectionTypeId
{
    MasonryShowcase = 1,
    TextBlock = 2,
}

public class SectionType
{
    public SectionTypeId Id { get; set; }
    public string Name { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public bool HasPrimaryImage { get; set; }
    public bool HasGallery { get; set; }
}

public class ContentPage
{
    public int Id { get; set; }
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public bool IsManaged { get; set; }
    public string? Eyebrow { get; set; }
    public string Heading { get; set; } = "";
    public string Introduction { get; set; } = "";
    public int Version { get; set; } = 1;
    public List<ContentSection> Sections { get; set; } = [];
}

public class ContentSection
{
    public int Id { get; set; }
    public int PageId { get; set; }
    public ContentPage Page { get; set; } = null!;
    public SectionTypeId SectionTypeId { get; set; }
    public SectionType SectionType { get; set; } = null!;
    public string Title { get; set; } = "";
    public string? Eyebrow { get; set; }
    public string? Introduction { get; set; }
    public string Description { get; set; } = "";
    public string? AdditionalDescription { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsPublished { get; set; }
    public int? PrimaryMediaId { get; set; }
    public MediaAsset? PrimaryMedia { get; set; }
    public string? PrimaryImageAltText { get; set; }
    public int Version { get; set; } = 1;
    public List<GalleryImage> Gallery { get; set; } = [];
    public List<SectionDetail> Details { get; set; } = [];
}

public class SectionDetail
{
    public int Id { get; set; }
    public int SectionId { get; set; }
    public string Text { get; set; } = "";
    public int DisplayOrder { get; set; }
}

public class MediaAsset
{
    public int Id { get; set; }
    public string StoredFileName { get; set; } = "";
    public string OriginalFileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public DateTime CreatedUtc { get; set; }
}

public class GalleryImage
{
    public int Id { get; set; }
    public int SectionId { get; set; }
    public int MediaAssetId { get; set; }
    public MediaAsset MediaAsset { get; set; } = null!;
    public string? AltText { get; set; }
    public int DisplayOrder { get; set; }
}

public class AdminUser
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
}
