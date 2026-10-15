using System.Text;
using System.Threading.RateLimiting;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Mvo.Api;
using Mvo.Api.Controllers;
using Mvo.Application;
using Mvo.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (jwt.Key.Length < 32)
    throw new InvalidOperationException("Jwt:Key must be configured with at least 32 characters (use user-secrets or environment variables).");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwt.Issuer,
        ValidateAudience = true,
        ValidAudience = jwt.Audience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1),
    });
builder.Services.AddAuthorization();

var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

// The quote form is public, so limit how often one visitor can send it. Caddy sits in front,
// so the visitor's address is the first entry in X-Forwarded-For.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy(ContactController.RateLimitPolicy, context =>
    {
        var forwarded = context.Request.Headers["X-Forwarded-For"].ToString().Split(',')[0].Trim();
        var client = string.IsNullOrEmpty(forwarded) ? context.Connection.RemoteIpAddress?.ToString() ?? "unknown" : forwarded;
        return RateLimitPartition.GetFixedWindowLimiter(client, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = builder.Configuration.GetValue("Contact:RequestsPerHour", 10),
            Window = TimeSpan.FromHours(1),
        });
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();
app.UseRateLimiter();

var media = app.Services.GetRequiredService<IOptions<MediaStorageOptions>>().Value;
Directory.CreateDirectory(Path.GetFullPath(media.RootPath));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.GetFullPath(media.RootPath)),
    RequestPath = media.PublicBasePath,
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await using (var scope = app.Services.CreateAsyncScope())
{
    if (app.Configuration.GetValue("Database:MigrateOnStartup", true))
        await scope.ServiceProvider.GetRequiredService<Mvo.Infrastructure.Persistence.AppDbContext>().Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<AdminSeeder>().SeedAsync(CancellationToken.None);
}

app.Run();

public partial class Program;
