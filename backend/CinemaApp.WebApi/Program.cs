using System.Text;
using CinemaApp.Application.Interfaces;
using CinemaApp.Application.Services;
using CinemaApp.Data;
using CinemaApp.Domain.Interfaces;
using CinemaApp.Infrastructure.Data;
using CinemaApp.Infrastructure.Services;
using CinemaApp.WebApi.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<CinemaDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=cinema.db"));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var key = builder.Configuration["Jwt:Key"] ?? "CinemaAppSuperSecretKey2026AtLeast32Chars!!";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "CinemaApp",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "CinemaApp",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IMovieService, MovieService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<ISocialService, SocialService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IPaymentProvider, StubPaymentProvider>();
builder.Services.AddScoped<INotificationService, StubNotificationService>();
builder.Services.AddScoped<ICalendarExportService, CalendarExportService>();

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CinemaDbContext>();
    db.Database.EnsureCreated();
    await DbSeeder.SeedAsync(db);
    await DbSeeder.EnsureRandomSoldSeatsAsync(db);
}

try
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
catch { /* Swagger optional - skip if package incompatible */ }
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseStaticFiles();
app.MapControllers();
app.MapHub<CinemaHub>("/hubs/cinema");

app.Run();
