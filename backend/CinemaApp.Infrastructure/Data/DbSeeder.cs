using CinemaApp.Application.Services;
using CinemaApp.Application;
using CinemaApp.Data;
using CinemaApp.Domain.Entities;
using CinemaApp.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CinemaApp.Infrastructure.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(CinemaDbContext db)
    {
        if (await db.Movies.AnyAsync())
        {
            var nowUtc = DateTime.UtcNow;
            if (!await db.Screenings.AnyAsync(s => s.StartTime > nowUtc))
                await SeedUpcomingScreeningsAsync(db, nowUtc);

            await EnsureHallBrandingAsync(db);
            await EnsureFoodImageUrlsAsync(db);
            return;
        }

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
            new() { Name = EmberHallNames.Premium, TotalRows = 10, SeatsPerRow = 16 },
            new() { Name = EmberHallNames.Classic, TotalRows = 8, SeatsPerRow = 12 },
            new() { Name = EmberHallNames.Lounge, TotalRows = 5, SeatsPerRow = 8 },
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
                    else if (EmberHallNames.IsLoungeHall(hall.Name) || row >= hall.TotalRows - 1)
                    {
                        seatType = SeatType.VIP;
                        multiplier = 1.5m;
                    }
                    db.SeatTemplates.Add(new SeatTemplate
                    {
                        HallId = hall.Id,
                        Row = row,
                        Number = seat,
                        Type = seatType,
                        PriceMultiplier = multiplier
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
                AddScreeningsForMovieDay(screenings, movie, halls, day, d == 0);
        }
        db.Screenings.AddRange(screenings);

        // Цены в белорусских рублях (BYN), ориентир на кинотеатры РБ
        var foodItems = new List<FoodItem>
        {
            new() { Name = "Попкорн (большой)", Description = "Классический солёный попкорн", Price = 8.50m, Category = "Попкорн", ImageUrl = "/food/ember-popcorn.png" },
            new() { Name = "Попкорн карамельный", Description = "Сладкий карамельный попкорн", Price = 9.50m, Category = "Попкорн", ImageUrl = "/food/popcorn-caramel.png" },
            new() { Name = "Кока-Кола 0.5л", Description = "Прохладительный напиток", Price = 3.50m, Category = "Напитки", ImageUrl = "/food/cola.png" },
            new() { Name = "Минеральная вода", Description = "Негазированная вода 0.5л", Price = 2.50m, Category = "Напитки", ImageUrl = "/food/water.png" },
            new() { Name = "Начос с сыром", Description = "Кукурузные чипсы с сырным соусом", Price = 7.00m, Category = "Снеки", ImageUrl = "/food/nachos-ember.png" },
            new() { Name = "Хот-дог классический", Description = "Сосиска в булке с горчицей и кетчупом", Price = 6.00m, Category = "Еда", ImageUrl = "/food/hotdog-ember.png" },
            new() { Name = "Мороженое пломбир", Description = "Ванильное мороженое в вафельном стаканчике", Price = 4.50m, Category = "Десерты", ImageUrl = "/food/icecream.png" },
            new() { Name = "Комбо «Премиум»", Description = "Большой попкорн + 2 напитка + начос", Price = 19.00m, Category = "Комбо", ImageUrl = "/food/combo-premium.png" },
        };
        db.FoodItems.AddRange(foodItems);

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

    private static async Task<List<Hall>> EnsureHallsAndSeatTemplatesAsync(CinemaDbContext db)
    {
        var halls = await db.Halls.ToListAsync();
        if (halls.Count == 0)
        {
            halls =
            [
                new() { Name = EmberHallNames.Premium, TotalRows = 10, SeatsPerRow = 16 },
                new() { Name = EmberHallNames.Classic, TotalRows = 8, SeatsPerRow = 12 },
                new() { Name = EmberHallNames.Lounge, TotalRows = 5, SeatsPerRow = 8 },
            ];
            db.Halls.AddRange(halls);
            await db.SaveChangesAsync();
            halls = await db.Halls.ToListAsync();
        }

        if (!await db.SeatTemplates.AnyAsync())
        {
            foreach (var hall in halls)
            {
                for (int row = 1; row <= hall.TotalRows; row++)
                {
                    for (int seat = 1; seat <= hall.SeatsPerRow; seat++)
                    {
                        var seatType = SeatType.Standard;
                        var multiplier = 1.0m;
                        if (row <= 2)
                        {
                            seatType = SeatType.Child;
                            multiplier = 0.8m;
                        }
                        else if (EmberHallNames.IsLoungeHall(hall.Name) || row >= hall.TotalRows - 1)
                        {
                            seatType = SeatType.VIP;
                            multiplier = 1.5m;
                        }
                        db.SeatTemplates.Add(new SeatTemplate
                        {
                            HallId = hall.Id,
                            Row = row,
                            Number = seat,
                            Type = seatType,
                            PriceMultiplier = multiplier
                        });
                    }
                }
            }
            await db.SaveChangesAsync();
        }

        return await db.Halls.ToListAsync();
    }

    /// <summary>
    /// Добавляет недостающие будущие сеансы (как в полном сидере) только для указанных фильмов, у которых ещё нет будущих показов.
    /// </summary>
    public static async Task<int> EnsureUpcomingScreeningsForMovieIdsAsync(
        CinemaDbContext db,
        DateTime nowUtc,
        IReadOnlyCollection<int> movieIds)
    {
        if (movieIds.Count == 0) return 0;

        var idSet = movieIds.ToHashSet();
        var halls = await EnsureHallsAndSeatTemplatesAsync(db);

        var withFuture = await db.Screenings
            .Where(s => idSet.Contains(s.MovieId) && s.StartTime > nowUtc)
            .Select(s => s.MovieId)
            .Distinct()
            .ToListAsync();
        var needScreeningsIds = idSet.Except(withFuture).ToHashSet();
        if (needScreeningsIds.Count == 0) return 0;

        var movies = await db.Movies
            .AsNoTracking()
            .Where(m => needScreeningsIds.Contains(m.Id) && !m.IsArchived)
            .ToListAsync();
        if (movies.Count == 0) return 0;

        var startDay = nowUtc.Date.AddDays(1);
        var screenings = new List<Screening>();
        for (int d = 0; d < 7; d++)
        {
            var day = startDay.AddDays(d);
            foreach (var movie in movies)
                AddScreeningsForMovieDay(screenings, movie, halls, day, d == 0);
        }

        db.Screenings.AddRange(screenings);
        await db.SaveChangesAsync();
        await PopulateSeatStatusesForNewScreeningsAsync(db, screenings);
        return screenings.Count;
    }

    /// <summary>
    /// Переименовывает залы mooon-стиля в брендинг Ember.
    /// </summary>
    public static async Task EnsureHallBrandingAsync(CinemaDbContext db)
    {
        var halls = await db.Halls.ToListAsync();
        var changed = false;
        foreach (var hall in halls)
        {
            var renamed = EmberHallNames.LegacyRename(hall.Name);
            if (renamed != null && hall.Name != renamed)
            {
                hall.Name = renamed;
                changed = true;
            }
        }

        if (changed)
            await db.SaveChangesAsync();
    }

    private static readonly Dictionary<string, string> FoodImageByName = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Попкорн (большой)"] = "/food/ember-popcorn.png",
        ["Попкорн карамельный"] = "/food/popcorn-caramel.png",
        ["Кока-Кола 0.5л"] = "/food/cola.png",
        ["Минеральная вода"] = "/food/water.png",
        ["Начос с сыром"] = "/food/nachos-ember.png",
        ["Хот-дог классический"] = "/food/hotdog-ember.png",
        ["Мороженое пломбир"] = "/food/icecream.png",
        ["Комбо «Премиум»"] = "/food/combo-premium.png",
    };

    public static async Task EnsureFoodImageUrlsAsync(CinemaDbContext db)
    {
        var items = await db.FoodItems.ToListAsync();
        var changed = false;
        foreach (var item in items)
        {
            if (!FoodImageByName.TryGetValue(item.Name, out var url))
                continue;
            if (item.ImageUrl == url)
                continue;
            item.ImageUrl = url;
            changed = true;
        }

        if (changed)
            await db.SaveChangesAsync();
    }

    /// <summary>
    /// Удаляет будущие сеансы без бронирований и заполняет расписание заново.
    /// </summary>
    public static async Task<int> RebuildFutureScreeningsScheduleAsync(CinemaDbContext db)
    {
        var nowUtc = DateTime.UtcNow;
        var protectedStatuses = new[] { BookingStatus.Pending, BookingStatus.Paid };

        var toRemove = await db.Screenings
            .Where(s => s.StartTime > nowUtc)
            .Where(s => !s.Bookings.Any(b => protectedStatuses.Contains(b.Status)))
            .ToListAsync();

        if (toRemove.Count == 0)
            return 0;

        var ids = toRemove.Select(s => s.Id).ToList();
        var seatStatuses = await db.ScreeningSeatStatuses.Where(ss => ids.Contains(ss.ScreeningId)).ToListAsync();
        db.ScreeningSeatStatuses.RemoveRange(seatStatuses);
        db.Screenings.RemoveRange(toRemove);
        await db.SaveChangesAsync();

        var movies = await db.Movies.AsNoTracking().Where(m => !m.IsArchived).ToListAsync();
        if (movies.Count == 0) return toRemove.Count;

        var halls = await EnsureHallsAndSeatTemplatesAsync(db);
        var startDay = nowUtc.Date;
        if (startDay <= nowUtc)
            startDay = startDay.AddDays(1);

        var screenings = new List<Screening>();
        for (var d = 0; d < 7; d++)
        {
            var day = startDay.AddDays(d);
            var dayEnd = day.AddDays(1);
            foreach (var movie in movies)
            {
                var hasDayScreening = await db.Screenings.AnyAsync(s =>
                    s.MovieId == movie.Id
                    && s.StartTime >= day
                    && s.StartTime < dayEnd
                    && s.StartTime > nowUtc);
                if (hasDayScreening) continue;

                AddScreeningsForMovieDay(screenings, movie, halls, day, d == 0);
            }
        }

        if (screenings.Count == 0)
            return toRemove.Count;

        db.Screenings.AddRange(screenings);
        await db.SaveChangesAsync();
        await PopulateSeatStatusesForNewScreeningsAsync(db, screenings);
        return toRemove.Count;
    }

    private static async Task SeedUpcomingScreeningsAsync(CinemaDbContext db, DateTime nowUtc)
    {
        var halls = await EnsureHallsAndSeatTemplatesAsync(db);

        var movies = await db.Movies.AsNoTracking().Where(m => !m.IsArchived).ToListAsync();
        if (movies.Count == 0) return;

        var startDay = nowUtc.Date.AddDays(1);
        var screenings = new List<Screening>();
        for (int d = 0; d < 7; d++)
        {
            var day = startDay.AddDays(d);
            foreach (var movie in movies)
                AddScreeningsForMovieDay(screenings, movie, halls, day, d == 0);
        }
        db.Screenings.AddRange(screenings);
        await db.SaveChangesAsync();
        await PopulateSeatStatusesForNewScreeningsAsync(db, screenings);
    }

    /// <summary>
    /// 4 сеанса в день: разное время, один язык на слот, русский — днём и вечером, белорусский ~2 раза в неделю.
    /// </summary>
    private static void AddScreeningsForMovieDay(
        List<Screening> screenings,
        Movie movie,
        IReadOnlyList<Hall> halls,
        DateTime day,
        bool premiereDay)
    {
        var premium = halls.FirstOrDefault(h => EmberHallNames.IsPremiumHall(h.Name)) ?? halls[0];
        var classic = halls.FirstOrDefault(h =>
            h.Name.Contains("Classic", StringComparison.OrdinalIgnoreCase)
            || h.Name.Contains("Стандарт", StringComparison.OrdinalIgnoreCase)) ?? halls[Math.Min(1, halls.Count - 1)];
        var lounge = halls.FirstOrDefault(h => EmberHallNames.IsLoungeHall(h.Name))
            ?? halls[Math.Min(2, halls.Count - 1)];

        var dayIndex = (int)(day.Date - DateTime.UnixEpoch.Date).TotalDays;
        var belarusianDay = day.DayOfWeek is DayOfWeek.Wednesday or DayOfWeek.Saturday
            && (movie.Id + dayIndex) % 2 == 0;

        var matineeMinute = (movie.Id + dayIndex) % 2 == 0 ? 30 : 45;
        AddScreeningSlot(
            screenings, movie, lounge, day, 12, matineeMinute,
            ScreeningLanguageLabels.Russian,
            11 + (movie.Id % 3) * 2m,
            isPremiere: false, isExclusive: false);

        if (belarusianDay)
        {
            AddScreeningSlot(
                screenings, movie, lounge, day, 17, 15,
                ScreeningLanguageLabels.Belarusian,
                10 + (movie.Id % 3) * 2m,
                isPremiere: false, isExclusive: false);
        }
        else
        {
            AddScreeningSlot(
                screenings, movie, classic, day, 15, 30,
                ScreeningLanguageLabels.OriginalSubtitles,
                8 + (movie.Id % 3) * 2m,
                isPremiere: false, isExclusive: false);
        }

        var primeHour = 19 + (movie.Id % 2);
        AddScreeningSlot(
            screenings, movie, premium, day, primeHour, 30,
            ScreeningLanguageLabels.Russian,
            14 + (movie.Id % 3) * 2m,
            isPremiere: premiereDay,
            isExclusive: movie.IsExclusive);

        var lateHour = 21 + (movie.Id % 2);
        var lateMinute = (movie.Id * 7 + dayIndex) % 2 == 0 ? 15 : 45;
        AddScreeningSlot(
            screenings, movie, classic, day, lateHour, lateMinute,
            ScreeningLanguageLabels.Russian,
            12 + (movie.Id % 3) * 2m,
            isPremiere: false, isExclusive: false);
    }

    private static void AddScreeningSlot(
        List<Screening> screenings,
        Movie movie,
        Hall hall,
        DateTime day,
        int hour,
        int minute,
        string language,
        decimal basePrice,
        bool isPremiere,
        bool isExclusive)
    {
        var start = day.Date.AddHours(hour).AddMinutes(minute);
        screenings.Add(new Screening
        {
            MovieId = movie.Id,
            HallId = hall.Id,
            StartTime = start,
            EndTime = start.AddMinutes(movie.Duration),
            Language = language,
            Format = EmberHallNames.FormatForHall(hall.Name),
            BasePrice = basePrice,
            IsPremiere = isPremiere,
            IsExclusive = isExclusive,
        });
    }

    private static async Task PopulateSeatStatusesForNewScreeningsAsync(
        CinemaDbContext db,
        IReadOnlyList<Screening> screenings)
    {
        if (screenings.Count == 0) return;

        var newScreeningIds = screenings.Select(s => s.Id).ToList();
        var allScreenings = await db.Screenings
            .Include(s => s.Hall)
                .ThenInclude(h => h.SeatTemplates)
            .Where(s => newScreeningIds.Contains(s.Id))
            .ToListAsync();

        foreach (var screening in allScreenings)
        {
            var templates = screening.Hall.SeatTemplates.ToList();
            if (templates.Count == 0) continue;

            if (await db.ScreeningSeatStatuses.AnyAsync(ss => ss.ScreeningId == screening.Id))
                continue;

            var statuses = new List<ScreeningSeatStatus>();
            foreach (var seat in templates)
            {
                var status = new ScreeningSeatStatus
                {
                    ScreeningId = screening.Id,
                    SeatTemplateId = seat.Id,
                    Status = SeatStatus.Available,
                };
                statuses.Add(status);
                db.ScreeningSeatStatuses.Add(status);
            }

            var maxSold = Math.Min(10, statuses.Count);
            var minSold = Math.Min(2, maxSold);
            if (maxSold > 0)
            {
                var toSell = Random.Shared.Next(minSold, maxSold + 1);
                foreach (var ss in statuses.OrderBy(_ => Random.Shared.Next()).Take(toSell))
                    ss.Status = SeatStatus.Sold;
            }
        }

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// 2–3 демонстрационных отзыва на каждый фильм (отдельные тестовые пользователи).
    /// Идемпотентно: не добавляет, если уже достаточно отзывов.
    /// </summary>
    public static async Task EnsurePseudoMovieReviewsAsync(CinemaDbContext db)
    {
        const string reviewerEmailPrefix = "pseudo-reviewer-";
        var reviewerNames = new[]
        {
            "Анна К.", "Максим Л.", "Елена С.", "Дмитрий В.", "Ольга М.",
            "Игорь П.", "Ксения Р.", "Артём Т.", "Наталья Ж.", "Сергей Н.",
            "Мария Д.", "Виктор Б.",
        };

        const string pseudoHash = "!reviewer";

        var reviewers = await db.Users
            .Where(u => u.Email.StartsWith(reviewerEmailPrefix))
            .OrderBy(u => u.Id)
            .ToListAsync();

        if (reviewers.Count < reviewerNames.Length)
        {
            var taken = reviewers.Select(u => u.Email).ToHashSet(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < reviewerNames.Length; i++)
            {
                var email = $"{reviewerEmailPrefix}{i + 1}@ember.local";
                if (taken.Contains(email)) continue;
                db.Users.Add(new User
                {
                    Email = email,
                    PasswordHash = pseudoHash,
                    DisplayName = reviewerNames[i],
                    Role = UserRole.User,
                });
                taken.Add(email);
            }

            await db.SaveChangesAsync();
            reviewers = await db.Users
                .Where(u => u.Email.StartsWith(reviewerEmailPrefix))
                .OrderBy(u => u.Id)
                .ToListAsync();
        }

        if (reviewers.Count == 0) return;

        var movies = await db.Movies.AsNoTracking().Select(m => new { m.Id, m.Title }).ToListAsync();
        var templates = new[]
        {
            "Сходили на «{0}» в Ember — звук и проекция отличные, персонал вежливый.",
            "«{0}» смотрится легко, после середины сюжет не отпускает до финала.",
            "Для «{0}» ожидания в целом оправдались; есть сильные сцены, рекомендую.",
            "Не шедевр, но «{0}» посмотреть можно: визуал хороший, местами чуть затянуто.",
            "После «{0}» остались хорошие эмоции — удобные кресла, сеанс прошёл комфортно.",
            "«{0}»: сценарий местами предсказуем, но игра актёров и картинка вытягивают.",
            "Хороший вариант для большого экрана; «{0}» лучше смотреть в зале, не дома.",
            "«{0}» — ровная работа: без провалов, финал логичный.",
            "Мне «{0}» зашло больше, чем ожидала: атмосфера и музыка очень к месту.",
            "«{0}» для любителей жанра — внимания к деталям много, местами можно ускорить темп.",
            "Спокойный, цельный фильм. «{0}» оставляет приятное послевкусие.",
            "Из плюсов «{0}» — картинка и монтаж; минус — пара сцен можно было короче.",
            "Оценка «на троечку с плюсом»: «{0}» смотрится, но второй раз не пошёл бы.",
            "Семьёй на «{0}» — нормально; дети не скучали, взрослым тоже было интересно.",
            "«{0}» понравился: в зале не шумели, сеанс в Ember как раз в тему.",
        };

        var newReviews = new List<Review>();
        foreach (var movie in movies)
        {
            var targetCount = 2 + (movie.Id % 2);
            var existingCount = await db.Reviews.CountAsync(r => r.MovieId == movie.Id);
            if (existingCount >= targetCount) continue;

            var need = targetCount - existingCount;
            var usedReviewerIds = await db.Reviews
                .Where(r => r.MovieId == movie.Id)
                .Select(r => r.UserId)
                .ToListAsync();

            for (var n = 0; n < need; n++)
            {
                User? reviewer = null;
                foreach (var offset in Enumerable.Range(0, reviewers.Count))
                {
                    var cand = reviewers[(movie.Id + n + offset) % reviewers.Count];
                    if (!usedReviewerIds.Contains(cand.Id))
                    {
                        reviewer = cand;
                        break;
                    }
                }

                reviewer ??= reviewers[(movie.Id + n) % reviewers.Count];

                var template = templates[(movie.Id * 3 + n * 5) % templates.Length];
                var title = string.IsNullOrWhiteSpace(movie.Title) ? "фильм" : movie.Title;
                var text = string.Format(template, title);
                var daysAgo = Random.Shared.Next(2, 55);
                var created = DateTime.UtcNow.Date.AddDays(-daysAgo).AddHours(Random.Shared.Next(10, 22));

                newReviews.Add(new Review
                {
                    UserId = reviewer.Id,
                    MovieId = movie.Id,
                    Text = text,
                    CreatedAt = created,
                    Likes = Random.Shared.Next(0, 42),
                    Dislikes = Random.Shared.Next(0, 6),
                });
                usedReviewerIds.Add(reviewer.Id);
            }
        }

        if (newReviews.Count > 0)
        {
            db.Reviews.AddRange(newReviews);
            await db.SaveChangesAsync();
        }
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

    public static async Task EnsureNewsItemsAsync(CinemaDbContext db)
    {
        if (await db.NewsItems.AnyAsync())
            return;

        db.NewsItems.AddRange(
            new NewsItem
            {
                Type = "sale",
                Badge = "Акция",
                ImageUrl = "/images/news-combo.jpg",
                Title = "Купи комбо x3 — получи плед в подарок",
                DisplayDate = "15 декабря",
                Text = "Зима — время тёплых историй, большого экрана и особого уюта. Ember и партнёры запускают совместную акцию: покупайте комбо-сеты и получайте фирменный плед в подарок.",
            },
            new NewsItem
            {
                Type = "news",
                Badge = "Новость",
                ImageUrl = "/images/news-refund.jpg",
                Title = "Теперь билеты можно вернуть онлайн бонусами +10%",
                DisplayDate = "03 декабря",
                Text = "Если ваши планы поменялись, вы можете оформить возврат билета в личном кабинете. Сумма вернётся на бонусный счёт с дополнительными 10% сверху.",
            },
            new NewsItem
            {
                Type = "sale",
                Badge = "Акция",
                ImageUrl = "/images/news-visa.jpg",
                Title = "Миксуй выходные с Ember и Visa",
                DisplayDate = "01 октября",
                Text = "При покупке двух и более билетов по картам Visa в выходные дни — второй билет за наш счёт. Подробные условия акции смотрите на сайте.",
            });

        await db.SaveChangesAsync();
    }

    public static async Task EnsureAdminUserAsync(CinemaDbContext db, string? email, string? password)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return;
        email = email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email)) return;

        db.Users.Add(new User
        {
            Email = email,
            PasswordHash = PasswordHashing.Hash(password),
            DisplayName = "Администратор",
            Role = UserRole.Admin,
            BonusBalance = 9_999_999,
        });
        await db.SaveChangesAsync();
    }
}
