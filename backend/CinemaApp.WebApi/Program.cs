using System.Text;
using CinemaApp.WebApi.Services;
using CinemaApp.Application.Interfaces;
using CinemaApp.Application.Services;
using CinemaApp.Data;
using CinemaApp.Domain.Interfaces;
using CinemaApp.Infrastructure.Data;
using CinemaApp.Infrastructure.Services;
using CinemaApp.WebApi.Filters;
using CinemaApp.WebApi.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Data.Common;
using System.IO;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: false)
    .AddEnvironmentVariables();

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Configure Jwt:Key with at least 32 bytes using user secrets, environment variables or appsettings.Local.json.");

builder.Services.AddDbContext<CinemaDbContext>(options =>
{
    var configuredConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    var sqlite = new SqliteConnectionStringBuilder(configuredConnectionString ?? string.Empty);

    if (string.IsNullOrWhiteSpace(sqlite.DataSource))
        sqlite.DataSource = "cinema.db";

    if (!Path.IsPathRooted(sqlite.DataSource))
        sqlite.DataSource = Path.Combine(builder.Environment.ContentRootPath, sqlite.DataSource);

    options.UseSqlite(sqlite.ConnectionString);
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var key = jwtKey;
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "CinemaApp",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "CinemaApp",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            NameClaimType = "sub",
            RoleClaimType = "role"
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddDataProtection();
builder.Services.AddScoped<BookingIdentity>();

builder.Services.AddHttpClient<IGoogleAuthService, GoogleAuthService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IMovieService, MovieService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<ISocialService, SocialService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IPaymentProvider, StubPaymentProvider>();
builder.Services.AddScoped<INotificationService, StubNotificationService>();
builder.Services.AddScoped<ICalendarExportService, CalendarExportService>();

builder.Services.AddHttpClient<MooonCinemaSyncService>(client =>
{
    client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "CinemaAppMooonSync/1.0");
    client.Timeout = TimeSpan.FromSeconds(90);
});
builder.Services.AddScoped<IMooonCinemaSyncService, MooonCinemaSyncService>();

builder.Services.AddMemoryCache();

builder.Services.AddControllers(options => options.Filters.Add<ApiExceptionFilter>());
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
            ?? ["http://localhost:5173", "http://127.0.0.1:5173"];
        policy.WithOrigins(origins).AllowAnyMethod().AllowAnyHeader().AllowCredentials();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CinemaDbContext>();
    db.Database.EnsureCreated();
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Users", "GoogleSubjectId", "ALTER TABLE Users ADD COLUMN GoogleSubjectId TEXT NULL;");
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Users", "BonusBalance", "ALTER TABLE Users ADD COLUMN BonusBalance INTEGER NOT NULL DEFAULT 0;");
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Users", "TotalSpent", "ALTER TABLE Users ADD COLUMN TotalSpent NUMERIC NOT NULL DEFAULT 0;");
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Users", "TicketsPurchased", "ALTER TABLE Users ADD COLUMN TicketsPurchased INTEGER NOT NULL DEFAULT 0;");
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Bookings", "BonusPointsUsed", "ALTER TABLE Bookings ADD COLUMN BonusPointsUsed INTEGER NOT NULL DEFAULT 0;");
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Bookings", "BonusPointsEarned", "ALTER TABLE Bookings ADD COLUMN BonusPointsEarned INTEGER NOT NULL DEFAULT 0;");
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Bookings", "PromoCode", "ALTER TABLE Bookings ADD COLUMN PromoCode TEXT;");
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Movies", "ExternalMooonEventId", "ALTER TABLE Movies ADD COLUMN ExternalMooonEventId INTEGER NULL;");
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Movies", "IsArchived", "ALTER TABLE Movies ADD COLUMN IsArchived INTEGER NOT NULL DEFAULT 0;");
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Screenings", "IsCancelled", "ALTER TABLE Screenings ADD COLUMN IsCancelled INTEGER NOT NULL DEFAULT 0;");
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Screenings", "CancelledAt", "ALTER TABLE Screenings ADD COLUMN CancelledAt TEXT NULL;");
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Comments", "IsHidden", "ALTER TABLE Comments ADD COLUMN IsHidden INTEGER NOT NULL DEFAULT 0;");
    await EnsureColumnAsync(db.Database.GetDbConnection(), "Reviews", "IsHidden", "ALTER TABLE Reviews ADD COLUMN IsHidden INTEGER NOT NULL DEFAULT 0;");
    await EnsureNewsTableAsync(db);
    await DbSeeder.SeedAsync(db);
    await DbSeeder.EnsureHallBrandingAsync(db);
    await DbSeeder.RebuildFutureScreeningsScheduleAsync(db);
    await DbSeeder.EnsureRandomSoldSeatsAsync(db);
    await DbSeeder.EnsurePseudoMovieReviewsAsync(db);
    await DbSeeder.EnsureNewsItemsAsync(db);
    await DbSeeder.EnsureAdminUserAsync(db, builder.Configuration["Seed:AdminEmail"], builder.Configuration["Seed:AdminPassword"]);

    var uploadsDir = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "uploads", "news");
    Directory.CreateDirectory(uploadsDir);

    if (builder.Configuration.GetValue("Mooon:Enabled", true) && builder.Configuration.GetValue("Mooon:SyncOnStartup", true))
        try
        {
            var mooonSync = scope.ServiceProvider.GetRequiredService<IMooonCinemaSyncService>();
            var syncResult = await mooonSync.SyncFromMooonAsync();
            app.Logger.LogInformation(
                "Синхронизация mooon: событий {Events}, обновлено {Upserted}, архив {Archived}, сеансов {Screenings}",
                syncResult.RemoteFilmEvents,
                syncResult.Upserted,
                syncResult.Archived,
                syncResult.ScreeningsAddedForMovies);
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning(ex, "Синхронизация афиши mooon при старте не выполнена — каталог может быть неполным.");
        }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseStaticFiles();
app.MapControllers();
app.MapHub<CinemaHub>("/hubs/cinema");

app.Run();

static async Task EnsureNewsTableAsync(CinemaDbContext db)
{
    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS "NewsItems" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_NewsItems" PRIMARY KEY AUTOINCREMENT,
            "Title" TEXT NOT NULL,
            "Text" TEXT NOT NULL,
            "Type" TEXT NOT NULL,
            "Badge" TEXT NOT NULL,
            "ImageUrl" TEXT NULL,
            "DisplayDate" TEXT NOT NULL,
            "CreatedAt" TEXT NOT NULL,
            "IsPublished" INTEGER NOT NULL DEFAULT 1
        );
        """);
}

static async Task EnsureColumnAsync(DbConnection connection, string tableName, string columnName, string alterSql)
{
    await connection.OpenAsync();
    await using var checkCommand = connection.CreateCommand();
    checkCommand.CommandText = $"PRAGMA table_info({tableName});";
    await using var reader = await checkCommand.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        if (string.Equals(reader["name"]?.ToString(), columnName, StringComparison.OrdinalIgnoreCase))
        {
            await reader.DisposeAsync();
            await connection.CloseAsync();
            return;
        }
    }
    await reader.DisposeAsync();

    await using var alterCommand = connection.CreateCommand();
    alterCommand.CommandText = alterSql;
    await alterCommand.ExecuteNonQueryAsync();
    await connection.CloseAsync();
}
