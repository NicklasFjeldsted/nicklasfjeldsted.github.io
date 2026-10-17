using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Mvo.Application.Common;
using Mvo.Application.Features.Media;
using Mvo.Application.Features.Projects;
using Mvo.Application.Features.Sections;

namespace Mvo.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;
        services.AddMediatR(c => c.RegisterServicesFromAssembly(assembly));
        services.AddValidatorsFromAssembly(assembly);
        services.AddTransient(typeof(MediatR.IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        services.AddScoped<SectionContentLoader>();
        services.AddScoped<MediaDetailLoader>();
        services.AddScoped<ProjectLoader>();
        return services;
    }
}
