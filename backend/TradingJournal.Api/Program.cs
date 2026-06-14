using System.Reflection;
using System.Text.Json.Serialization;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.OpenApi.Models;
using Serilog;
using TradingJournal.Api.Services;
using TradingJournal.Application.Abstractions;
using TradingJournal.Application.Trades;
using TradingJournal.Infrastructure;
using TradingJournal.Infrastructure.Identity;
using TradingJournal.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration).WriteTo.Console());

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IUserContext, UserContext>();
builder.Services.AddValidatorsFromAssemblyContaining<UpsertTradeRequestValidator>();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Trading Journal API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            []
        }
    });
});

var app = builder.Build();

if (app.Configuration.GetValue("Database:EnsureCreatedOnStartup", true))
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.EnsureCreatedAsync();
        await db.EnsureIntradayTablesAsync(app.Logger);

        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        const string demoEmail = "trader@example.com";
        if (await userManager.FindByEmailAsync(demoEmail) is null)
        {
            var demo = new ApplicationUser { Email = demoEmail, UserName = demoEmail, FullName = "Demo Trader" };
            var result = await userManager.CreateAsync(demo, "Password123");
            if (!result.Succeeded)
                app.Logger.LogWarning("Demo seed failed: {Errors}", string.Join("; ", result.Errors.Select(e => e.Description)));
            else
                app.Logger.LogInformation("Demo account seeded: {Email}", demoEmail);
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning("Failed to ensure database created: {Message}", ex.Message);
    }
}

app.UseExceptionHandler(exApp => exApp.Run(async ctx =>
{
    var feature = ctx.Features.Get<IExceptionHandlerFeature>();
    var ex = feature?.Error;
    ctx.Response.ContentType = "application/json";
    ctx.Response.StatusCode = ex switch
    {
        UnauthorizedAccessException => StatusCodes.Status401Unauthorized,
        InvalidOperationException => StatusCodes.Status400BadRequest,
        _ => StatusCodes.Status500InternalServerError
    };
    await ctx.Response.WriteAsJsonAsync(new { error = ex?.Message ?? "An unexpected error occurred." });
}));

app.UseSerilogRequestLogging();
app.UseSwagger();
app.UseSwaggerUI();
app.UseStaticFiles();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger"));
app.Run();
