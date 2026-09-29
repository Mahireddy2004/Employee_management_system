using System.Text;
using EmployeeManagement.Api.Data;
using EmployeeManagement.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add database context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseMySql(
        connectionString,
        new MySqlServerVersion(new Version(8, 0, 36))
    );
});

// Register application services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IReportService, ReportService>();

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key is missing from configuration.");

if (jwtKey.Length < 32)
{
    throw new InvalidOperationException("JWT Key must be at least 32 characters (256 bits) for HMAC-SHA256.");
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "EmployeeManagementApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "EmployeeManagementClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Configure CORS for frontend SPA communication (development & production)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? Array.Empty<string>();

        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrWhiteSpace(origin))
                return false;

            // Always permit localhost / loopback for local development and testing
            if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
            {
                if (uri.Host == "localhost" || uri.Host == "127.0.0.1")
                {
                    return true;
                }
            }

            // Allow all origins if wildcard is explicitly configured
            if (configuredOrigins.Any(o => o == "*"))
            {
                return true;
            }

            // Validate against explicitly configured production frontend origins
            foreach (var allowed in configuredOrigins)
            {
                if (string.Equals(allowed.TrimEnd('/'), origin.TrimEnd('/'), StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                if (Uri.TryCreate(allowed, UriKind.Absolute, out var allowedUri) &&
                    uri != null &&
                    string.Equals(allowedUri.Host, uri.Host, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .WithExposedHeaders("Content-Disposition");
    });
});

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Employee Management API",
        Version = "v1",
        Description = "Employee Management System REST API"
    });

    // Add JWT Bearer definition to Swagger UI
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT Bearer token only (without the 'Bearer ' prefix)."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // Global exception handling in production to avoid leaking sensitive internal details
    app.UseExceptionHandler(exceptionHandlerApp =>
    {
        exceptionHandlerApp.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                message = "An unexpected server error occurred. Please contact system administration."
            });
        });
    });
    app.UseHsts();
}

// Enable CORS for single-page frontend application
app.UseCors("AllowFrontend");

// Authentication must precede Authorization
app.UseAuthentication();
app.UseAuthorization();

// Route incoming HTTP requests to controllers
app.MapControllers();

// Health check endpoint for cloud monitoring and container probes
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
   .WithName("HealthCheck")
   .WithTags("Health")
   .AllowAnonymous();

// Database migration and seeding: strictly controlled per environment / configuration
// In Development: enabled by default for developer convenience.
// In Production: disabled by default for safety unless explicitly configured via environment variables.
var applyMigrationsOnStartup = builder.Configuration.GetValue<bool>(
    "Database:ApplyMigrationsOnStartup",
    app.Environment.IsDevelopment()
);

var seedDemoData = builder.Configuration.GetValue<bool>(
    "Database:SeedDemoData",
    app.Environment.IsDevelopment()
);

if (applyMigrationsOnStartup || seedDemoData)
{
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = services.GetRequiredService<AppDbContext>();

        if (applyMigrationsOnStartup)
        {
            await context.Database.MigrateAsync();
            logger.LogInformation("Database schema verified/migrated.");
        }

        if (seedDemoData)
        {
            await DatabaseSeeder.SeedAsync(context);
            logger.LogInformation("Development demo data seeded successfully.");
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Could not execute database migration or seeding on startup. Check MySQL server status and credentials in configuration.");
    }
}

app.Run();
