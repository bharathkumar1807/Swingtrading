using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using TradingJournal.Application.Abstractions;
using TradingJournal.Application.Analytics;
using TradingJournal.Application.Exports;
using TradingJournal.Application.Imports;
using TradingJournal.Application.Trades;
using TradingJournal.Infrastructure.Auth;
using TradingJournal.Infrastructure.Files;
using TradingJournal.Infrastructure.Identity;
using TradingJournal.Infrastructure.Persistence;
using TradingJournal.Infrastructure.Services;

namespace TradingJournal.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection("Jwt"));
        var jwt = configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            var provider = configuration.GetValue<string>("Database:Provider") ?? "SqlServer";
            if (provider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase))
            {
                options.UseNpgsql(NormalizePostgresConnectionString(configuration.GetConnectionString("PostgreSqlConnection")));
                return;
            }

            options.UseSqlServer(configuration.GetConnectionString("SqlServerConnection"));
        });

        services.AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = false;
            })
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ValidIssuer = jwt.Issuer,
                    ValidAudience = jwt.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey))
                };
            });

        services.AddAuthorization();
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IFileStorage, LocalFileStorage>();
        services.AddScoped<TradeService>();
        services.AddScoped<AnalyticsService>();
        services.AddScoped<ExportService>();
        services.AddScoped<StatementImportService>();
        services.AddHostedService<AnalyticsReviewWorker>();
        return services;
    }

    private static string? NormalizePostgresConnectionString(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || !Uri.TryCreate(connectionString, UriKind.Absolute, out var uri))
        {
            return connectionString;
        }

        if (uri.Scheme is not ("postgres" or "postgresql"))
        {
            return connectionString;
        }

        var userInfo = uri.UserInfo.Split(':', 2);
        var username = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(0) ?? string.Empty);
        var password = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(1) ?? string.Empty);
        var database = uri.AbsolutePath.TrimStart('/');
        var port = uri.Port > 0 ? uri.Port : 5432;
        return $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
    }
}
