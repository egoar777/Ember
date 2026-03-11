using CinemaApp.Data;
using CinemaApp.Domain.Entities;
using CinemaApp.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace CinemaApp.Infrastructure.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(CinemaDbContext db)
    {
        if (await db.Movies.AnyAsync())
            return;

        var genres = new List<Genre>
        {
            new() { Name = "Боевик", Slug = "action" },
            new() { Name = "Комедия", Slug = "comedy" },
            new() { Name = "Драма", Slug = "drama" },
            new() { Name = "Фантастика", Slug = "sci-fi" },
            new() { Name = "Ужасы", Slug = "horror" },
            new() { Name = "Триллер", Slug = "thriller" },
            new() { Name = "Мелодрама", Slug = "romance" },
            new() { Name = "Анимация", Slug = "animation" },
            new() { Name = "Документальный", Slug = "documentary" },
            new() { Name = "Приключения", Slug = "adventure" },
        };
        db.Genres.AddRange(genres);

        // Афиша по мотивам кинопространств mooon (mooon.by). Постеры/баннеры — заглушки.
        var movies = new List<Movie>
        {
            new()
            {
                Title = "Наследник", OriginalTitle = "The Heir", Year = 2026, Duration = 115,
                AgeRating = "18+", Countries = "Россия", Director = "—",
                Cast = "—",
                Description = "Состояние клана Редфеллоу исчисляется миллиардами. Беккет мечтает всё это унаследовать, хотя глава рода отрёкся от него до рождения. На пути к заветной жизни — семь претендентов. Чтобы ускорить свою очередь, Беккету придётся устранить конкурентов так дерзко и изобретательно, чтобы избежать наказания.",
                AverageRating = 7.8, RatingCount = 4200,
                PosterUrl = "https://picsum.photos/seed/heir/400/600",
                BackgroundUrl = "https://picsum.photos/seed/heirbg/1920/1080",
                TrailerUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ",
                Platforms = "2D,Cinema", IsExclusive = true,
                Genres = new List<Genre>()
            },
            new()
            {
                Title = "Грозовой перевал", OriginalTitle = "Wuthering Heights", Year = 2026, Duration = 140,
                AgeRating = "18+", Countries = "Россия", Director = "—",
                Cast = "—",
                Description = "Хозяин поместья подбирает на дороге сироту Хитклиффа. Тот находит дом и неразлучную подругу — Кэтрин. После смерти хозяина власть переходит к её брату Хиндли, и Хитклифф остаётся в поместье лишь прислугой. Страсть, месть и роковая любовь разворачиваются на фоне суровых вересковых пустошей.",
                AverageRating = 7.5, RatingCount = 3100,
                PosterUrl = "https://picsum.photos/seed/wuthering/400/600",
                BackgroundUrl = "https://picsum.photos/seed/wutheringbg/1920/1080",
                Platforms = "2D,Cinema", IsExclusive = false,
                Genres = new List<Genre>()
            },
            new()
            {
                Title = "GOAT. Мечтай по-крупному", OriginalTitle = "GOAT", Year = 2026, Duration = 105,
                AgeRating = "6+", Countries = "Россия", Director = "—",
                Cast = "—",
                Description = "Козлёнок Уилл мечтает стать чемпионом в звероболе — жёстком контактном спорте, где правят самые большие и сильные. Команда поначалу не верит в «мелочь», но Уилл готов доказать, что мечтать по-крупному может каждый.",
                AverageRating = 7.2, RatingCount = 5800,
                PosterUrl = "/goat-banner.jpg",
                BackgroundUrl = "/goat-banner.jpg",
                TrailerUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ",
                Platforms = "3D,2D,Cinema", IsExclusive = true,
                Genres = new List<Genre>()
            },
            new()
            {
                Title = "Горничная", OriginalTitle = "The Maid", Year = 2026, Duration = 140,
                AgeRating = "18+", Countries = "США", Director = "—",
                Cast = "—",
                Description = "Милли хочет начать жизнь с чистого листа и с радостью соглашается работать горничной в роскошном особняке семьи Винчестер. За закрытыми дверями и странными правилами скрывается нечто зловещее. Чем ближе она к разгадке, тем яснее: её собственные тайны тоже не останутся в тени.",
                AverageRating = 8.0, RatingCount = 6700,
                PosterUrl = "https://picsum.photos/seed/krasavitsa/400/600",
                BackgroundUrl = "https://picsum.photos/seed/krasavitsabg/1920/1080",
                Platforms = "2D,Cinema", IsExclusive = false,
                Genres = new List<Genre>()
            },
            new()
            {
                Title = "Крик 7", OriginalTitle = "Scream 7", Year = 2026, Duration = 125,
                AgeRating = "18+", Countries = "США", Director = "—",
                Cast = "—",
                Description = "Новая глава культовой франшизы. Маска Призрака снова в деле — кровавая охота возобновляется. Героям предстоит столкнуться с прошлым и выжить в кошмаре, который не прощает ошибок.",
                AverageRating = 7.9, RatingCount = 15200,
                PosterUrl = "https://picsum.photos/seed/kish/400/600",
                BackgroundUrl = "https://picsum.photos/seed/kishbg/1920/1080",
                Platforms = "2D,Cinema", IsExclusive = true,
                Genres = new List<Genre>()
            },
            new()
            {
                Title = "Королева ринга", OriginalTitle = "The Queen of the Ring", Year = 2025, Duration = 135,
                AgeRating = "16+", Countries = "США", Director = "—",
                Cast = "—",
                Description = "Дочь шахтёра из Западной Виргинии открывает в себе талант к боксу и поднимается до вершин женского бокса. За победой в ринге скрывается тяжёлая борьба в личной жизни. История силы духа и победы над обстоятельствами.",
                AverageRating = 7.6, RatingCount = 4900,
                PosterUrl = "https://picsum.photos/seed/queenring/400/600",
                BackgroundUrl = "https://picsum.photos/seed/queenringbg/1920/1080",
                Platforms = "2D,Cinema", IsExclusive = false,
                Genres = new List<Genre>()
            },
            new()
            {
                Title = "Кутюр", OriginalTitle = "Couture", Year = 2026, Duration = 115,
                AgeRating = "12+", Countries = "Франция", Director = "—",
                Cast = "—",
                Description = "Парижский Дом высокой моды готовится к самому важному показу сезона. Молодая портниха Лена внезапно получает шанс войти в закрытый мир кутюрье, где каждая строчка решает судьбу коллекции. Балансируя между вдохновением и безжалостными дедлайнами, интригами коллег и давлением модной индустрии, Лена должна найти собственный стиль и доказать, что за блеском подиума стоит настоящая страсть к ремеслу.",
                AverageRating = 7.4, RatingCount = 2100,
                PosterUrl = "/poster-cutur.webp",
                BackgroundUrl = "/hero-cutur.webp",
                Platforms = "2D,Cinema", IsExclusive = false,
                Genres = new List<Genre>()
            },
            new()
            {
                Title = "На помощь!", OriginalTitle = "Help Me!", Year = 2026, Duration = 120,
                AgeRating = "16+", Countries = "США", Director = "Сэм Рэйми",
                Cast = "Рэйчел Макадамс, Дилан О’Брайен, Брюс Кэмпбелл",
                Description = "Офисная сотрудница Линда ненавидит своего босса Брэдли Престона. Страдающая от его постоянных издевательств девушка находится на грани нервного срыва и уже готова уволиться, но всё же отправляется с ним в командировку. В результате авиакатастрофы единственными выжившими на необитаемом острове оказываются только Линда и её босс.",
                AverageRating = 7.3, RatingCount = 2300,
                PosterUrl = "/poster-help.webp",
                BackgroundUrl = "/hero-help.webp",
                Platforms = "2D,Cinema", IsExclusive = false,
                Genres = new List<Genre>()
            },
            new()
            {
                Title = "Валадар пярсцёнкаў: Дзве вежы", OriginalTitle = "The Lord of the Rings: The Two Towers", Year = 2026, Duration = 235,
                AgeRating = "12+", Countries = "США, Новая Зеландия", Director = "Питер Джексон",
                Cast = "Элайджа Вуд, Иэн Маккеллен, Вигго Мортенсен",
                Description = "Звяртаем вашу ўвагу: дэманструецца рэжысёрская версія фільма ў беларускім дубляжы. Брацтва распалася, аднак Пярсцёнак Улады мусіць быць знішчаны. Сэм і Фрода вымушаныя даверыцца Голуму, які ўзяўся правесці іх да брамы Мордара. Велізарная армія Сарумана набліжаецца — сябры брацтва і іхнія саюзнікі гатовыя прыняць бой. Бітва за Серадзем'е працягваецца.",
                AverageRating = 8.9, RatingCount = 125000,
                PosterUrl = "/poster-bel.webp",
                BackgroundUrl = "/hero-bel.webp",
                Platforms = "2D,Cinema", IsExclusive = false,
                Genres = new List<Genre>()
            },
        };

        movies[0].Genres.Add(genres[5]); movies[0].Genres.Add(genres[1]);   // Наследник: триллер, комедия
        movies[1].Genres.Add(genres[2]); movies[1].Genres.Add(genres[6]);   // Грозовой перевал: драма, мелодрама
        movies[2].Genres.Add(genres[7]); movies[2].Genres.Add(genres[0]);   // GOAT: анимация, боевик
        movies[3].Genres.Add(genres[5]);                                    // Горничная: триллер
        movies[4].Genres.Add(genres[4]);                                    // Крик 7: ужасы
        movies[5].Genres.Add(genres[2]);                                    // Королева ринга: драма
        movies[6].Genres.Add(genres[2]);                                    // Кутюр: драма
        movies[7].Genres.Add(genres[5]);                                    // На помощь!: триллер
        movies[8].Genres.Add(genres[2]); movies[8].Genres.Add(genres[3]); movies[8].Genres.Add(genres[9]);   // Валадар пярсцёнкаў: драма, фэнтези, приключения

        db.Movies.AddRange(movies);

        var halls = new List<Hall>
        {
            new() { Name = "Зал 1 — IMAX", TotalRows = 10, SeatsPerRow = 16 },
            new() { Name = "Зал 2 — Стандарт", TotalRows = 8, SeatsPerRow = 12 },
            new() { Name = "Зал 3 — VIP", TotalRows = 5, SeatsPerRow = 8 },
        };
        db.Halls.AddRange(halls);
        await db.SaveChangesAsync();

        foreach (var hall in halls)
        {
            for (int row = 1; row <= hall.TotalRows; row++)
            {
                for (int seat = 1; seat <= hall.SeatsPerRow; seat++)
                {
                    var seatType = SeatType.Standard;
                    var multiplier = 1.0m;
                    // Передние ряды — детская зона
                    if (row <= 2)
                    {
                        seatType = SeatType.Child;
                        multiplier = 0.8m;
                    }
                    // Задние ряды и VIP-зал — VIP-зона
                    else if (hall.Name.Contains("VIP") || row >= hall.TotalRows - 1)
                    {
                        seatType = SeatType.VIP;
                        multiplier = 1.5m;
                    }
                    db.SeatTemplates.Add(new SeatTemplate
                    {
                        HallId = hall.Id, Row = row, Number = seat,
                        Type = seatType, PriceMultiplier = multiplier
                    });
                }
            }
        }
        await db.SaveChangesAsync();

        var now = DateTime.UtcNow.Date.AddDays(1);
        var screenings = new List<Screening>();
        for (int d = 0; d < 7; d++)
        {
            var day = now.AddDays(d);
            foreach (var movie in movies)
            {
                var hall = halls[movie.Id % halls.Count];
                screenings.Add(new Screening
                {
                    MovieId = movie.Id, HallId = hall.Id,
                    StartTime = day.AddHours(10 + (movie.Id % 4) * 3),
                    EndTime = day.AddHours(10 + (movie.Id % 4) * 3).AddMinutes(movie.Duration),
                    Language = "Русский", Format = hall.Name.Contains("IMAX") ? "IMAX" : "2D",
                    BasePrice = 12 + (movie.Id % 3) * 2m, IsPremiere = d == 0, IsExclusive = movie.IsExclusive
                });
                screenings.Add(new Screening
                {
                    MovieId = movie.Id, HallId = halls[(movie.Id + 1) % halls.Count].Id,
                    StartTime = day.AddHours(14 + (movie.Id % 3) * 2),
                    EndTime = day.AddHours(14 + (movie.Id % 3) * 2).AddMinutes(movie.Duration),
                    Language = "Оригинал (субтитры)", Format = "2D",
                    BasePrice = 8 + (movie.Id % 3) * 2m, IsPremiere = false, IsExclusive = false
                });
            }
        }
        db.Screenings.AddRange(screenings);

        // Цены в белорусских рублях (BYN), ориентир на кинотеатры РБ
        var foodItems = new List<FoodItem>
        {
            new() { Name = "Попкорн (большой)", Description = "Классический солёный попкорн", Price = 8.50m, Category = "Попкорн", ImageUrl = "https://picsum.photos/seed/popcorn1/200/200" },
            new() { Name = "Попкорн карамельный", Description = "Сладкий карамельный попкорн", Price = 9.50m, Category = "Попкорн", ImageUrl = "https://picsum.photos/seed/popcorn2/200/200" },
            new() { Name = "Кока-Кола 0.5л", Description = "Прохладительный напиток", Price = 3.50m, Category = "Напитки", ImageUrl = "https://picsum.photos/seed/cola/200/200" },
            new() { Name = "Минеральная вода", Description = "Негазированная вода 0.5л", Price = 2.50m, Category = "Напитки", ImageUrl = "https://picsum.photos/seed/water/200/200" },
            new() { Name = "Начос с сыром", Description = "Кукурузные чипсы с сырным соусом", Price = 7.00m, Category = "Снеки", ImageUrl = "https://picsum.photos/seed/nachos/200/200" },
            new() { Name = "Хот-дог классический", Description = "Сосиска в булке с горчицей и кетчупом", Price = 6.00m, Category = "Еда", ImageUrl = "https://picsum.photos/seed/hotdog/200/200" },
            new() { Name = "Мороженое пломбир", Description = "Ванильное мороженое в вафельном стаканчике", Price = 4.50m, Category = "Десерты", ImageUrl = "https://picsum.photos/seed/icecream/200/200" },
            new() { Name = "Комбо «Премиум»", Description = "Большой попкорн + 2 напитка + начос", Price = 19.00m, Category = "Комбо", ImageUrl = "https://picsum.photos/seed/combo/200/200" },
        };
        db.FoodItems.AddRange(foodItems);

        var adminHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes("admin123")));
        db.Users.Add(new User
        {
            Email = "admin@cinema.ru", PasswordHash = adminHash,
            DisplayName = "Администратор", Role = UserRole.Admin
        });
        var demoHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes("demo123")));
        db.Users.Add(new User
        {
            Email = "demo@cinema.ru", PasswordHash = demoHash,
            DisplayName = "Демо Пользователь", Role = UserRole.User
        });

        await db.SaveChangesAsync();

        var allScreenings = await db.Screenings
            .Include(s => s.Hall)
                .ThenInclude(h => h.SeatTemplates)
            .ToListAsync();

        foreach (var screening in allScreenings)
        {
            var templates = screening.Hall.SeatTemplates.ToList();
            if (templates.Count == 0) continue;

            // Сначала создаём статусы для всех мест как свободные
            var statuses = new List<ScreeningSeatStatus>();
            foreach (var seat in templates)
            {
                var status = new ScreeningSeatStatus
                {
                    ScreeningId = screening.Id,
                    SeatTemplateId = seat.Id,
                    Status = SeatStatus.Available
                };
                statuses.Add(status);
                db.ScreeningSeatStatuses.Add(status);
            }

            // Затем помечаем случайный небольшой набор мест (2–10) как уже проданные другими людьми
            var maxSold = Math.Min(10, statuses.Count);
            var minSold = Math.Min(2, maxSold);
            if (maxSold > 0)
            {
                var toSell = Random.Shared.Next(minSold, maxSold + 1);
                var soldStatuses = statuses
                    .OrderBy(_ => Random.Shared.Next())
                    .Take(toSell);
                foreach (var ss in soldStatuses)
                {
                    ss.Status = SeatStatus.Sold;
                }
            }
        }
        await db.SaveChangesAsync();
    }

    public static async Task EnsureRandomSoldSeatsAsync(CinemaDbContext db)
    {
        // Полностью очищаем текущие статусы мест и расставляем занятые заново:
        // для каждого сеанса делаем все места свободными, затем случайные 2–10 мест помечаем как проданные.
        var screenings = await db.Screenings
            .Include(s => s.Hall)
                .ThenInclude(h => h.SeatTemplates)
            .Include(s => s.SeatStatuses)
            .ToListAsync();

        foreach (var screening in screenings)
        {
            var templates = screening.Hall.SeatTemplates.ToList();
            if (templates.Count == 0) continue;

            // если статусы ещё не созданы, создадим
            if (screening.SeatStatuses == null || screening.SeatStatuses.Count == 0)
            {
                foreach (var seat in templates)
                {
                    db.ScreeningSeatStatuses.Add(new ScreeningSeatStatus
                    {
                        ScreeningId = screening.Id,
                        SeatTemplateId = seat.Id,
                        Status = SeatStatus.Available
                    });
                }
                await db.SaveChangesAsync();
            }

            var statuses = await db.ScreeningSeatStatuses
                .Where(ss => ss.ScreeningId == screening.Id)
                .ToListAsync();
            if (statuses.Count == 0) continue;

            // Сбрасываем все места в свободные
            foreach (var ss in statuses)
            {
                ss.Status = SeatStatus.Available;
                ss.LockedUntil = null;
                ss.BookingId = null;
            }

            // Случайно выбираем небольшой набор мест (2–10) которые будут помечены как уже занятые
            var maxSold = Math.Min(10, statuses.Count);
            var minSold = Math.Min(2, maxSold);
            if (maxSold > 0)
            {
                var toSell = Random.Shared.Next(minSold, maxSold + 1);
                var soldStatuses = statuses
                    .OrderBy(_ => Random.Shared.Next())
                    .Take(toSell);
                foreach (var ss in soldStatuses)
                {
                    ss.Status = SeatStatus.Sold;
                }
            }
        }

        await db.SaveChangesAsync();
    }
}
