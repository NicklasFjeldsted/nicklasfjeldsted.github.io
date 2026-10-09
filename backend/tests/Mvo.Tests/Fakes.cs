using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Domain;

namespace Mvo.Tests;

/// <summary>Reads work against the real database; every save fails.</summary>
public class FailingDb(IAppDbContext inner) : IAppDbContext
{
    public DbSet<ContentPage> Pages => inner.Pages;
    public DbSet<ContentSection> Sections => inner.Sections;
    public DbSet<SectionType> SectionTypes => inner.SectionTypes;
    public DbSet<SectionDetail> SectionDetails => inner.SectionDetails;
    public DbSet<MediaAsset> MediaAssets => inner.MediaAssets;
    public DbSet<GalleryImage> GalleryImages => inner.GalleryImages;
    public DbSet<AdminUser> AdminUsers => inner.AdminUsers;

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        throw new InvalidOperationException("Simulated persistence failure.");
}

public class RecordingStorage : IMediaStorage
{
    public List<string> Saved { get; } = [];
    public List<string> Deleted { get; } = [];

    public Task SaveAsync(string storedFileName, Stream content, CancellationToken cancellationToken)
    {
        Saved.Add(storedFileName);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(string storedFileName, CancellationToken cancellationToken)
    {
        Deleted.Add(storedFileName);
        return Task.CompletedTask;
    }

    public string GetUrl(string storedFileName) => "/media/" + storedFileName;
}
