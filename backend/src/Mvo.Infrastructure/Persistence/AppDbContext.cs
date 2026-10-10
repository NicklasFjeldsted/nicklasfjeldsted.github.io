using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Domain;

namespace Mvo.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<ContentPage> Pages => Set<ContentPage>();
    public DbSet<ContentSection> Sections => Set<ContentSection>();
    public DbSet<SectionType> SectionTypes => Set<SectionType>();
    public DbSet<SectionDetail> SectionDetails => Set<SectionDetail>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<GalleryImage> GalleryImages => Set<GalleryImage>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SectionType>(e =>
        {
            e.ToTable("SectionType");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.Name).HasMaxLength(50).IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Name).IsUnique();
            e.HasData(
                new SectionType { Id = SectionTypeId.MasonryShowcase, Name = nameof(SectionTypeId.MasonryShowcase), DisplayName = "Murerarbejde med billeder", HasPrimaryImage = true, HasGallery = true },
                new SectionType { Id = SectionTypeId.TextBlock, Name = nameof(SectionTypeId.TextBlock), DisplayName = "Tekstblok", HasPrimaryImage = false, HasGallery = false });
        });

        modelBuilder.Entity<ContentPage>(e =>
        {
            e.ToTable("ContentPage");
            e.HasKey(x => x.Id);
            e.Property(x => x.Slug).HasMaxLength(100).IsRequired();
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Eyebrow).HasMaxLength(500);
            e.Property(x => x.Heading).HasMaxLength(200).IsRequired();
            e.Property(x => x.Introduction).HasMaxLength(4000).IsRequired();
            e.Property(x => x.Version).IsConcurrencyToken();
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasData(
                new ContentPage { Id = 1, Slug = "forside", Name = "Forside", IsManaged = false, Heading = "Forside", Introduction = "" },
                new ContentPage
                {
                    Id = 2,
                    Slug = "specialiseret-murerarbejde",
                    Name = "Specialiseret murerarbejde",
                    IsManaged = true,
                    Eyebrow = "Specialiseret murerarbejde",
                    Heading = "Pladsholder: Overskrift til siden",
                    Introduction = "Pladsholdertekst. Her beskriver murerne kort, hvilke krævende opgaver de påtager sig, og hvad der kendetegner deres håndværk. Teksten erstattes via administrationen.",
                });
        });

        modelBuilder.Entity<MediaAsset>(e =>
        {
            e.ToTable("MediaAsset");
            e.HasKey(x => x.Id);
            e.Property(x => x.StoredFileName).HasMaxLength(100).IsRequired();
            e.Property(x => x.OriginalFileName).HasMaxLength(255).IsRequired();
            e.Property(x => x.ContentType).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.StoredFileName).IsUnique();
        });

        modelBuilder.Entity<ContentSection>(e =>
        {
            e.ToTable("ContentSection");
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Eyebrow).HasMaxLength(500);
            e.Property(x => x.Introduction).HasMaxLength(4000);
            e.Property(x => x.Description).HasMaxLength(4000).IsRequired();
            e.Property(x => x.AdditionalDescription).HasMaxLength(4000);
            e.Property(x => x.PrimaryImageAltText).HasMaxLength(300);
            e.Property(x => x.Version).IsConcurrencyToken();
            e.HasOne(x => x.Page).WithMany(p => p.Sections).HasForeignKey(x => x.PageId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.SectionType).WithMany().HasForeignKey(x => x.SectionTypeId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.PrimaryMedia).WithMany().HasForeignKey(x => x.PrimaryMediaId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.PageId, x.DisplayOrder });
        });

        modelBuilder.Entity<SectionDetail>(e =>
        {
            e.ToTable("SectionDetail");
            e.HasKey(x => x.Id);
            e.Property(x => x.Text).HasMaxLength(300).IsRequired();
            e.HasOne<ContentSection>().WithMany(s => s.Details).HasForeignKey(x => x.SectionId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.SectionId, x.DisplayOrder });
        });

        modelBuilder.Entity<GalleryImage>(e =>
        {
            e.ToTable("GalleryImage");
            e.HasKey(x => x.Id);
            e.Property(x => x.AltText).HasMaxLength(300);
            e.HasOne<ContentSection>().WithMany(s => s.Gallery).HasForeignKey(x => x.SectionId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.MediaAsset).WithMany().HasForeignKey(x => x.MediaAssetId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.SectionId, x.DisplayOrder });
            e.HasIndex(x => new { x.SectionId, x.MediaAssetId }).IsUnique();
        });

        modelBuilder.Entity<AdminUser>(e =>
        {
            e.ToTable("AdminUser");
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).HasMaxLength(254).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
        });
    }
}
