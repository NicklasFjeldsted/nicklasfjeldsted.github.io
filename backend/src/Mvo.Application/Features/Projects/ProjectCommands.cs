using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;
using Mvo.Application.Domain;
using Mvo.Application.Features.Contact;
using Mvo.Application.Features.Gallery;
using Mvo.Application.Features.Sections;

namespace Mvo.Application.Features.Projects;

public record ProjectListItemDto(
    int Id, string Slug, string Title, string Category, string Location, DateOnly CompletedOn,
    bool IsFeatured, bool IsPublished, string? CoverUrl, int ImageCount);

public record ProjectImageDto(int MediaId, string Url, string Name);

public record ProjectDto(
    int Id, string Slug, string Title, string Category, string Location, DateOnly CompletedOn, string Summary, string Description,
    bool IsFeatured, bool IsPublished, int Version, IReadOnlyList<ProjectImageDto> Images);

/// <summary>Everything the admin edits on a project. It is saved in one go.</summary>
public record ProjectInput(
    string Title, string Category, string Location, DateOnly CompletedOn, string Summary, string Description,
    bool IsFeatured, bool IsPublished, IReadOnlyList<int> MediaIds);

public class ProjectInputValidator : AbstractValidator<ProjectInput>
{
    public ProjectInputValidator()
    {
        RuleFor(x => x.Title).Must(t => !string.IsNullOrWhiteSpace(t)).WithMessage("Projektet skal have en titel.")
            .MaximumLength(ProjectRules.TitleMax);
        RuleFor(x => x.Category).Must(c => c is not null && QuoteCategories.Labels.ContainsKey(c)).WithMessage("Vælg en kategori.");
        RuleFor(x => x.Location).Must(l => !string.IsNullOrWhiteSpace(l)).WithMessage("Skriv hvor opgaven blev lavet.")
            .MaximumLength(ProjectRules.LocationMax);
        RuleFor(x => x.CompletedOn).InclusiveBetween(new DateOnly(1990, 1, 1), new DateOnly(2100, 12, 31)).WithMessage("Vælg hvornår opgaven blev afsluttet.");
        RuleFor(x => x.Summary).Must(s => !string.IsNullOrWhiteSpace(s)).WithMessage("Skriv en kort tekst om projektet.")
            .MaximumLength(ProjectRules.SummaryMax);
        RuleFor(x => x.Description).NotNull().MaximumLength(ProjectRules.DescriptionMax);
        RuleFor(x => x.MediaIds).NotNull()
            .Must(i => i is null || i.Count <= ProjectRules.MaxImages).WithMessage($"Et projekt kan højst have {ProjectRules.MaxImages} billeder.")
            .Must(i => i is null || i.Distinct().Count() == i.Count).WithMessage("Det samme billede kan ikke være med to gange.");
        RuleForEach(x => x.MediaIds).GreaterThan(0);
        RuleFor(x => x).Must(x => !x.IsPublished || x.MediaIds is { Count: > 0 })
            .OverridePropertyName("MediaIds").WithMessage("Tilføj mindst ét billede, før projektet vises på hjemmesiden.");
    }
}

public record GetProjectsQuery : IRequest<IReadOnlyList<ProjectListItemDto>>;

public class GetProjectsHandler(IAppDbContext db, IMediaStorage storage) : IRequestHandler<GetProjectsQuery, IReadOnlyList<ProjectListItemDto>>
{
    public async Task<IReadOnlyList<ProjectListItemDto>> Handle(GetProjectsQuery request, CancellationToken cancellationToken)
    {
        var rows = await db.Projects.AsNoTracking()
            .OrderByDescending(p => p.CompletedOn).ThenByDescending(p => p.Id)
            .Select(p => new
            {
                p.Id, p.Slug, p.Title, p.Category, p.Location, p.CompletedOn, p.IsFeatured, p.IsPublished,
                Cover = p.Images.OrderBy(i => i.DisplayOrder).Select(i => i.MediaAsset.StoredFileName).FirstOrDefault(),
                ImageCount = p.Images.Count,
            })
            .ToListAsync(cancellationToken);

        return rows.Select(p => new ProjectListItemDto(
            p.Id, p.Slug, p.Title, p.Category, p.Location, p.CompletedOn, p.IsFeatured, p.IsPublished,
            p.Cover is null ? null : storage.GetUrl(p.Cover), p.ImageCount)).ToList();
    }
}

public record GetProjectQuery(int ProjectId) : IRequest<ProjectDto>;

public class GetProjectValidator : AbstractValidator<GetProjectQuery>
{
    public GetProjectValidator() => RuleFor(x => x.ProjectId).RequiredId();
}

public class GetProjectHandler(ProjectLoader loader) : IRequestHandler<GetProjectQuery, ProjectDto>
{
    public Task<ProjectDto> Handle(GetProjectQuery request, CancellationToken cancellationToken) => loader.LoadAsync(request.ProjectId, cancellationToken);
}

public record CreateProjectCommand(ProjectInput Project) : IRequest<ProjectDto>;

public class CreateProjectValidator : AbstractValidator<CreateProjectCommand>
{
    public CreateProjectValidator() => RuleFor(x => x.Project).NotNull().SetValidator(new ProjectInputValidator());
}

public class CreateProjectHandler(IAppDbContext db, ProjectLoader loader) : IRequestHandler<CreateProjectCommand, ProjectDto>
{
    public async Task<ProjectDto> Handle(CreateProjectCommand request, CancellationToken cancellationToken)
    {
        var input = request.Project;
        if (input.IsFeatured) await db.EnsureFeaturedRoomAsync(null, cancellationToken);
        await db.EnsureMediaExistsAsync(input.MediaIds, cancellationToken);

        var project = new Project { Slug = await db.UniqueSlugAsync(input.Title, cancellationToken), CreatedUtc = DateTime.UtcNow };
        project.Apply(input);
        project.SetImages(input.MediaIds, db);

        db.Projects.Add(project);
        await db.SaveChangesAsync(cancellationToken);
        return await loader.LoadAsync(project.Id, cancellationToken);
    }
}

public record UpdateProjectCommand(int ProjectId, int ExpectedVersion, ProjectInput Project) : IRequest<ProjectDto>;

public class UpdateProjectValidator : AbstractValidator<UpdateProjectCommand>
{
    public UpdateProjectValidator()
    {
        RuleFor(x => x.ProjectId).RequiredId();
        RuleFor(x => x.Project).NotNull().SetValidator(new ProjectInputValidator());
    }
}

public class UpdateProjectHandler(IAppDbContext db, ProjectLoader loader) : IRequestHandler<UpdateProjectCommand, ProjectDto>
{
    public async Task<ProjectDto> Handle(UpdateProjectCommand request, CancellationToken cancellationToken)
    {
        var project = await db.GetProjectForUpdateAsync(request.ProjectId, request.ExpectedVersion, cancellationToken);
        var input = request.Project;
        if (input.IsFeatured && !project.IsFeatured) await db.EnsureFeaturedRoomAsync(project.Id, cancellationToken);
        await db.EnsureMediaExistsAsync(input.MediaIds, cancellationToken);

        project.Apply(input);
        project.SetImages(input.MediaIds, db);
        project.Version++;

        await db.SaveWithConcurrencyAsync(cancellationToken);
        return await loader.LoadAsync(project.Id, cancellationToken);
    }
}

public record DeleteProjectCommand(int ProjectId, int ExpectedVersion) : IRequest;

public class DeleteProjectValidator : AbstractValidator<DeleteProjectCommand>
{
    public DeleteProjectValidator() => RuleFor(x => x.ProjectId).RequiredId();
}

/// <summary>Deletes the project. Its images stay in the image library.</summary>
public class DeleteProjectHandler(IAppDbContext db) : IRequestHandler<DeleteProjectCommand>
{
    public async Task Handle(DeleteProjectCommand request, CancellationToken cancellationToken)
    {
        var project = await db.GetProjectForUpdateAsync(request.ProjectId, request.ExpectedVersion, cancellationToken);
        db.Projects.Remove(project);
        await db.SaveWithConcurrencyAsync(cancellationToken);
    }
}

public static class ProjectAccess
{
    public static async Task<Project> GetProjectForUpdateAsync(this IAppDbContext db, int projectId, int expectedVersion, CancellationToken cancellationToken)
    {
        var project = await db.Projects.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken)
            ?? throw new NotFoundException($"Project {projectId} was not found.");
        if (project.Version != expectedVersion)
            throw new ConflictException("Projektet er ændret af en anden. Genindlæs det og prøv igen.");
        return project;
    }

    public static void Apply(this Project project, ProjectInput input)
    {
        project.Title = input.Title.Trim();
        project.Category = input.Category;
        project.Location = input.Location.Trim();
        project.CompletedOn = input.CompletedOn;
        project.Summary = input.Summary.Trim();
        project.Description = (input.Description ?? "").Trim();
        project.IsFeatured = input.IsFeatured;
        project.IsPublished = input.IsPublished;
    }
}

public class ProjectLoader(IAppDbContext db, IMediaStorage storage)
{
    public async Task<ProjectDto> LoadAsync(int projectId, CancellationToken cancellationToken)
    {
        var p = await db.Projects.AsNoTracking()
            .Where(p => p.Id == projectId)
            .Select(p => new
            {
                p.Id, p.Slug, p.Title, p.Category, p.Location, p.CompletedOn, p.Summary, p.Description, p.IsFeatured, p.IsPublished, p.Version,
                Images = p.Images.OrderBy(i => i.DisplayOrder).Select(i => new { i.MediaAssetId, i.MediaAsset.StoredFileName, i.MediaAsset.Name }).ToList(),
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException($"Project {projectId} was not found.");

        return new ProjectDto(
            p.Id, p.Slug, p.Title, p.Category, p.Location, p.CompletedOn, p.Summary, p.Description, p.IsFeatured, p.IsPublished, p.Version,
            p.Images.Select(i => new ProjectImageDto(i.MediaAssetId, storage.GetUrl(i.StoredFileName), i.Name)).ToList());
    }
}
