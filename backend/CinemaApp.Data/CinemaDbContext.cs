using CinemaApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CinemaApp.Data;

public class CinemaDbContext : DbContext
{
    public CinemaDbContext(DbContextOptions<CinemaDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Movie> Movies => Set<Movie>();
    public DbSet<Genre> Genres => Set<Genre>();
    public DbSet<Hall> Halls => Set<Hall>();
    public DbSet<SeatTemplate> SeatTemplates => Set<SeatTemplate>();
    public DbSet<Screening> Screenings => Set<Screening>();
    public DbSet<ScreeningSeatStatus> ScreeningSeatStatuses => Set<ScreeningSeatStatus>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<FoodItem> FoodItems => Set<FoodItem>();
    public DbSet<BookingFoodItem> BookingFoodItems => Set<BookingFoodItem>();
    public DbSet<UserList> UserLists => Set<UserList>();
    public DbSet<UserListItem> UserListItems => Set<UserListItem>();
    public DbSet<UserActivity> UserActivities => Set<UserActivity>();
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(256);
            e.Property(u => u.DisplayName).HasMaxLength(100);
        });

        modelBuilder.Entity<Movie>(e =>
        {
            e.HasMany(m => m.Genres)
                .WithMany(g => g.Movies)
                .UsingEntity("MovieGenres");
            e.HasIndex(m => m.Year);
            e.HasIndex(m => m.AverageRating);
            e.Property(m => m.Title).HasMaxLength(500);
        });

        modelBuilder.Entity<Genre>(e =>
        {
            e.HasIndex(g => g.Slug).IsUnique();
            e.Property(g => g.Name).HasMaxLength(100);
            e.Property(g => g.Slug).HasMaxLength(100);
        });

        modelBuilder.Entity<SeatTemplate>(e =>
        {
            e.HasOne(s => s.Hall)
                .WithMany(h => h.SeatTemplates)
                .HasForeignKey(s => s.HallId);
            e.HasIndex(s => new { s.HallId, s.Row, s.Number }).IsUnique();
        });

        modelBuilder.Entity<Screening>(e =>
        {
            e.HasOne(s => s.Movie).WithMany(m => m.Screenings).HasForeignKey(s => s.MovieId);
            e.HasOne(s => s.Hall).WithMany(h => h.Screenings).HasForeignKey(s => s.HallId);
            e.HasIndex(s => s.StartTime);
            e.Property(s => s.BasePrice).HasPrecision(10, 2);
        });

        modelBuilder.Entity<ScreeningSeatStatus>(e =>
        {
            e.HasOne(ss => ss.Screening).WithMany(s => s.SeatStatuses).HasForeignKey(ss => ss.ScreeningId);
            e.HasOne(ss => ss.SeatTemplate).WithMany().HasForeignKey(ss => ss.SeatTemplateId);
            e.HasOne(ss => ss.Booking).WithMany(b => b.Seats).HasForeignKey(ss => ss.BookingId).IsRequired(false);
            e.HasIndex(ss => new { ss.ScreeningId, ss.SeatTemplateId }).IsUnique();
        });

        modelBuilder.Entity<Booking>(e =>
        {
            e.HasOne(b => b.User).WithMany(u => u.Bookings).HasForeignKey(b => b.UserId);
            e.HasOne(b => b.Screening).WithMany(s => s.Bookings).HasForeignKey(b => b.ScreeningId);
            e.Property(b => b.TotalPrice).HasPrecision(10, 2);
        });

        modelBuilder.Entity<BookingFoodItem>(e =>
        {
            e.HasOne(bf => bf.Booking).WithMany(b => b.FoodItems).HasForeignKey(bf => bf.BookingId);
            e.HasOne(bf => bf.FoodItem).WithMany().HasForeignKey(bf => bf.FoodItemId);
        });

        modelBuilder.Entity<FoodItem>(e =>
        {
            e.Property(f => f.Price).HasPrecision(10, 2);
            e.Property(f => f.Name).HasMaxLength(200);
        });

        modelBuilder.Entity<UserList>(e =>
        {
            e.HasOne(l => l.User).WithMany(u => u.Lists).HasForeignKey(l => l.UserId);
        });

        modelBuilder.Entity<UserListItem>(e =>
        {
            e.HasOne(li => li.UserList).WithMany(l => l.Items).HasForeignKey(li => li.UserListId);
            e.HasOne(li => li.Movie).WithMany().HasForeignKey(li => li.MovieId);
            e.HasIndex(li => new { li.UserListId, li.MovieId }).IsUnique();
        });

        modelBuilder.Entity<UserActivity>(e =>
        {
            e.HasOne(a => a.User).WithMany(u => u.Activities).HasForeignKey(a => a.UserId);
            e.HasOne(a => a.Movie).WithMany().HasForeignKey(a => a.MovieId);
            e.HasIndex(a => new { a.UserId, a.Timestamp });
        });

        modelBuilder.Entity<Rating>(e =>
        {
            e.HasOne(r => r.User).WithMany(u => u.Ratings).HasForeignKey(r => r.UserId);
            e.HasOne(r => r.Movie).WithMany(m => m.Ratings).HasForeignKey(r => r.MovieId);
            e.HasIndex(r => new { r.UserId, r.MovieId }).IsUnique();
        });

        modelBuilder.Entity<Review>(e =>
        {
            e.HasOne(r => r.User).WithMany(u => u.Reviews).HasForeignKey(r => r.UserId);
            e.HasOne(r => r.Movie).WithMany(m => m.Reviews).HasForeignKey(r => r.MovieId);
        });

        modelBuilder.Entity<Comment>(e =>
        {
            e.HasOne(c => c.Movie).WithMany(m => m.Comments).HasForeignKey(c => c.MovieId);
            e.HasOne(c => c.User).WithMany(u => u.Comments).HasForeignKey(c => c.UserId);
            e.HasOne(c => c.ParentComment).WithMany(c => c.Replies).HasForeignKey(c => c.ParentCommentId).IsRequired(false);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.HasOne(n => n.User).WithMany(u => u.Notifications).HasForeignKey(n => n.UserId);
            e.HasIndex(n => new { n.UserId, n.IsRead });
        });
    }
}
