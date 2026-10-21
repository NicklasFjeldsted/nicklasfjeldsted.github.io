namespace Mvo.Application.Domain;

public enum SectionTypeId
{
    MasonryShowcase = 1,
    TextBlock = 2,
    BeforeAfter = 3,
    Profile = 4,
    /// <summary>A fixed part of the home page; <see cref="ContentSection.Key"/> says which.</summary>
    HomePart = 5,
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
    /// <summary>The page has a fixed design: its sections can be edited but not added, removed, hidden or reordered.</summary>
    public bool HasFixedLayout { get; set; }
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
    /// <summary>Names a fixed part of a page with a fixed design (for example the home page's "hero"), so the site can find it.</summary>
    public string? Key { get; set; }
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
    /// <summary>Text under the point, for points shown as a card with a title and text.</summary>
    public string? Description { get; set; }
    /// <summary>Name of the icon shown with the point (one of <c>HomePage.Icons</c>).</summary>
    public string? Icon { get; set; }
    public int DisplayOrder { get; set; }
}

public class MediaAsset
{
    public int Id { get; set; }
    public string StoredFileName { get; set; } = "";
    public string OriginalFileName { get; set; } = "";
    /// <summary>Display name shown and searched in the image library. Not the file name on disk.</summary>
    public string Name { get; set; } = "";
    /// <summary>Suggested alternative text when the image is used somewhere new.</summary>
    public string? DefaultAltText { get; set; }
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

/// <summary>A finished job shown on the Projekter page.</summary>
public class Project
{
    public int Id { get; set; }
    /// <summary>Address of the project page (/projekter/{slug}). Set from the title when the project is created and kept after that, so links keep working.</summary>
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    /// <summary>One of the quote form's categories (QuoteCategories).</summary>
    public string Category { get; set; } = "";
    public string Location { get; set; } = "";
    public DateOnly CompletedOn { get; set; }
    public string Summary { get; set; } = "";
    /// <summary>Full description; paragraphs are separated by blank lines.</summary>
    public string Description { get; set; } = "";
    public bool IsFeatured { get; set; }
    public bool IsPublished { get; set; }
    public DateTime CreatedUtc { get; set; }
    public int Version { get; set; } = 1;
    public List<ProjectImage> Images { get; set; } = [];
}

public class ProjectImage
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public int MediaAssetId { get; set; }
    public MediaAsset MediaAsset { get; set; } = null!;
    public int DisplayOrder { get; set; }
}
