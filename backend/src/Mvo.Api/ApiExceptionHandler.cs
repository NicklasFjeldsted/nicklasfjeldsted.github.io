using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Mvo.Application.Common;

namespace Mvo.Api;

public class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        var problem = exception switch
        {
            ValidationException v => ValidationProblem(v),
            NotFoundException n => new ProblemDetails { Status = 404, Title = "Not found", Detail = n.Message },
            ConflictException c => new ProblemDetails { Status = 409, Title = "Conflict", Detail = c.Message },
            UnauthorizedLoginException u => new ProblemDetails { Status = 401, Title = "Unauthorized", Detail = u.Message },
            _ => null,
        };

        if (problem is null)
        {
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
            problem = new ProblemDetails { Status = 500, Title = "Server error", Detail = "The request could not be completed. Nothing was saved." };
        }

        context.Response.StatusCode = problem.Status!.Value;
        await context.Response.WriteAsJsonAsync(problem, problem.GetType(), cancellationToken: cancellationToken);
        return true;
    }

    private static ProblemDetails ValidationProblem(ValidationException exception)
    {
        var errors = exception.Errors
            .GroupBy(e => e.PropertyName)
            .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
        var problem = new ValidationProblemDetails(errors) { Status = 400, Title = "Validation failed" };
        return problem;
    }
}
