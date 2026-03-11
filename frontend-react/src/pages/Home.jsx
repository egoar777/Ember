import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/client';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';
import { getPosterOverride } from '../posterOverrides';

const SLUG_TO_SECTION = {
  popular: 'popular-row',
  premieres: 'premieres-row',
  exclusive: 'exclusive-row',
  'for-you': 'for-you-row',
  'top-rated': 'top-rated-row',
};

export default function Home() {
  const { user, onAuthChange } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [afishaFilter, setAfishaFilter] = useState('all');
  const tabsBarRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const newsItems = [
    {
      id: 1,
      badge: 'Акция',
      title: 'Купи комбо x3 — получи плед в подарок',
      date: '15 декабря',
      text: 'Зима — время тёплых историй, большого экрана и особого уюта. Ember и партнёры запускают совместную акцию для гостей кинопространства.',
      image: '/images/news-combo.jpg',
    },
    {
      id: 2,
      badge: 'Новость',
      title: 'Возврат билетов бонусами +10%',
      date: '03 декабря',
      text: 'Если планы изменились, вы можете быстро и выгодно вернуть билет — сумма вернётся на бонусный счёт с дополнительными 10%.',
      image: '/images/news-refund.jpg',
    },
    {
      id: 3,
      badge: 'Новость',
      title: 'Выходные в Ember с Visa',
      date: '01 октября',
      text: 'Покупайте 2+ билета в выходные — второй билет оплачивает Visa. Подробности акции и партнёров смотрите на странице условий.',
      image: '/images/news-visa.jpg',
    },
  ];

  useEffect(() => {
    apiGet('/ai/recommendations/home', onAuthChange)
      .then((data) => {
        const list = data || [];
        if (list.length > 0) {
          setCollections(list);
          setLoading(false);
          return;
        }
        // Если рекомендации пустые — показываем популярные, премьеры и эксклюзивы
        return Promise.all([
          apiGet('/movies?sortBy=year&page=1&pageSize=10', onAuthChange),
          apiGet('/movies?isPremiere=true&pageSize=10', onAuthChange),
          apiGet('/movies?exclusive=true&pageSize=10', onAuthChange),
        ]).then(([popularRes, premieresRes, exclusiveRes]) => {
          const popular = popularRes?.items || [];
          const premieres = premieresRes?.items || [];
          const exclusive = exclusiveRes?.items || [];
          setCollections([
            { slug: 'popular', title: 'Самые популярные фильмы', movies: popular },
            { slug: 'premieres', title: 'Премьеры', movies: premieres },
            { slug: 'exclusive', title: 'Эксклюзив', movies: exclusive.length ? exclusive : popular },
          ]);
        });
      })
      .catch(() => {
        return Promise.all([
          apiGet('/movies?sortBy=year&page=1&pageSize=10', onAuthChange),
          apiGet('/movies?isPremiere=true&pageSize=10', onAuthChange),
          apiGet('/movies?exclusive=true&pageSize=10', onAuthChange),
        ]).then(([popularRes, premieresRes, exclusiveRes]) => {
          const popular = popularRes?.items || [];
          const premieres = premieresRes?.items || [];
          const exclusive = exclusiveRes?.items || [];
          setCollections([
            { slug: 'popular', title: 'Самые популярные фильмы', movies: popular },
            { slug: 'premieres', title: 'Премьеры', movies: premieres },
            { slug: 'exclusive', title: 'Эксклюзив', movies: exclusive.length ? exclusive : popular },
          ]);
        }).catch(() => setCollections([]));
      })
      .finally(() => setLoading(false));
  }, [onAuthChange]);

  useEffect(() => {
    const update = () => {
      if (!tabsBarRef.current) return;
      const el = tabsBarRef.current.querySelector(`.home-tab[data-tab="${afishaFilter}"]`);
      if (!el) return;
      const parentRect = tabsBarRef.current.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setIndicatorStyle({
        left: rect.left - parentRect.left,
        width: rect.width,
      });
    };
    update();
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(update);
    });
    return () => cancelAnimationFrame(id);
  }, [afishaFilter, collections.length]);

  return (
    <>
      <section className="hero">
        <div className="hero-slide active">
          <img className="hero-bg" src="/home-hero-bg.jpg" alt="" />
          <div className="hero-overlay" />
          <div className="hero-content">
            <h2 className="hero-title">Добро пожаловать</h2>
            <div className="hero-actions">
              <Link to="/catalog" className="btn btn-primary">Смотреть каталог</Link>
            </div>
          </div>
          <div className="hero-scroll-hint">
            <div className="hero-scroll-icon">↓</div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="home-tabs-bar" ref={tabsBarRef}>
          <ul className="home-tabs-list">
            <li className="home-tab-item">
              <button
                type="button"
                className={`home-tab ${afishaFilter === 'all' ? 'active' : ''}`}
                data-tab="all"
                onClick={() => setAfishaFilter('all')}
              >
                Все
              </button>
            </li>
            <li className="home-tab-item">
              <button
                type="button"
                className={`home-tab ${afishaFilter === 'premieres' ? 'active' : ''}`}
                data-tab="premieres"
                onClick={() => setAfishaFilter('premieres')}
              >
                Премьеры
              </button>
            </li>
            <li className="home-tab-item">
              <button
                type="button"
                className={`home-tab ${afishaFilter === 'plus' ? 'active' : ''}`}
                data-tab="plus"
                onClick={() => setAfishaFilter('plus')}
              >
                Ember+
              </button>
            </li>
            <li className="home-tab-item">
              <button
                type="button"
                className={`home-tab ${afishaFilter === 'kids' ? 'active' : ''}`}
                data-tab="kids"
                onClick={() => setAfishaFilter('kids')}
              >
                Детям
              </button>
            </li>
            <li className="home-tab-item">
              <button
                type="button"
                className={`home-tab ${afishaFilter === 'exclusive' ? 'active' : ''}`}
                data-tab="exclusive"
                onClick={() => setAfishaFilter('exclusive')}
              >
                Эксклюзивно
              </button>
            </li>
          </ul>
          <Link to="/catalog" className="home-tabs-link">Вся афиша →</Link>
          <div className="home-tabs-indicator" style={indicatorStyle} />
        </div>
        <div className="home-tabs-divider" />

        {loading && (
          <div className="section">
            <div className="movies-row">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton" style={{ width: 180, height: 270 }} />
              ))}
            </div>
          </div>
        )}
        {(() => {
          const slugMap = { all: 'popular', premieres: 'premieres', plus: 'exclusive', exclusive: 'exclusive', kids: 'popular' };
          const activeSlug = slugMap[afishaFilter] || 'popular';
          const col = collections.find((c) => c.slug === activeSlug) || collections[0];
          if (!col) return null;
          let movies = col.movies || [];
          if (afishaFilter === 'kids') {
            movies = movies.filter((m) => typeof m.ageRating === 'string' && (m.ageRating.startsWith('0') || m.ageRating.startsWith('6') || m.ageRating.startsWith('12')));
          }
          return (
            <div key={col.slug} className="section">
              <div className="movies-row">
                {movies.map((m) => (
                  <MovieCard key={m.id} movie={m} />
                ))}
              </div>
            </div>
          );
        })()}

        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Новости</h2>
            <Link to="/news" className="section-link">Все новости →</Link>
          </div>
          <div className="news-row">
            {newsItems.slice(0, 3).map((n) => (
              <article key={n.id} className="news-card">
                {n.image && <img src={n.image} alt={n.title} />}
                <div className="news-badge-row">
                  <span className={`news-badge ${n.badge === 'Акция' ? 'news-badge-sale' : 'news-badge-news'}`}>
                    {n.badge}
                  </span>
                  <span className="news-date">{n.date}</span>
                </div>
                <h3 className="news-title">{n.title}</h3>
                <p className="news-text">{n.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-extra-section">
          <div className="home-extra-block">
            <h3 className="home-extra-title">Платёжные системы</h3>
            <div className="home-extra-logos">
              <svg className="home-extra-logo home-extra-logo-img home-extra-logo-img-lg" viewBox="0 0 80 40" aria-label="VISA" role="img" title="VISA">
                <path d="M36.6755 27.9508H32.5956L35.1455 12.28H39.2258L36.6755 27.9508ZM29.1633 12.28L25.2737 23.0585L24.8135 20.7374L24.8139 20.7383L23.4411 13.691C23.4411 13.691 23.2751 12.28 21.5057 12.28H15.0755L15 12.5454C15 12.5454 16.9664 12.9545 19.2677 14.3365L22.8123 27.9512H27.0632L33.5542 12.28H29.1633ZM61.2538 27.9508H65L61.7337 12.2796H58.4541C56.9396 12.2796 56.5707 13.4474 56.5707 13.4474L50.4858 27.9508H54.7388L55.5894 25.623H60.7759L61.2538 27.9508ZM56.7643 22.4075L58.908 16.5431L60.114 22.4075H56.7643ZM50.8048 16.0485L51.3871 12.6833C51.3871 12.6833 49.5905 12 47.7176 12C45.6929 12 40.8849 12.8849 40.8849 17.1878C40.8849 21.2363 46.5279 21.2866 46.5279 23.4131C46.5279 25.5396 41.4663 25.1586 39.7959 23.8176L39.1893 27.3362C39.1893 27.3362 41.0111 28.2211 43.7944 28.2211C46.5786 28.2211 50.7788 26.7796 50.7788 22.856C50.7788 18.7815 45.0851 18.4022 45.0851 16.6307C45.0855 14.8588 49.0589 15.0864 50.8048 16.0485Z" fill="#1A1F71" />
              </svg>
              <img className="home-extra-logo home-extra-logo-img home-extra-logo-img-md" src="/mastercard-logo-52.svg" alt="Mastercard" title="Mastercard" />
              <img className="home-extra-logo home-extra-logo-img home-extra-logo-img-lg" src="/belcard.png" alt="Белкарт" title="Белкарт" />
            </div>
          </div>
          <hr className="home-extra-hr" />
          <div className="home-extra-block">
            <h3 className="home-extra-title">Наши партнёры</h3>
            <div className="home-extra-logos">
              <img className="home-extra-logo home-extra-logo-img home-extra-logo-img-sm" src="/Coca-Cola_logo.svg" alt="Coca-Cola" title="Coca-Cola" />
              <svg className="home-extra-logo home-extra-logo-img home-extra-logo-img-lg" viewBox="0 0 80 40" aria-label="VISA" role="img" title="VISA">
                <path d="M36.6755 27.9508H32.5956L35.1455 12.28H39.2258L36.6755 27.9508ZM29.1633 12.28L25.2737 23.0585L24.8135 20.7374L24.8139 20.7383L23.4411 13.691C23.4411 13.691 23.2751 12.28 21.5057 12.28H15.0755L15 12.5454C15 12.5454 16.9664 12.9545 19.2677 14.3365L22.8123 27.9512H27.0632L33.5542 12.28H29.1633ZM61.2538 27.9508H65L61.7337 12.2796H58.4541C56.9396 12.2796 56.5707 13.4474 56.5707 13.4474L50.4858 27.9508H54.7388L55.5894 25.623H60.7759L61.2538 27.9508ZM56.7643 22.4075L58.908 16.5431L60.114 22.4075H56.7643ZM50.8048 16.0485L51.3871 12.6833C51.3871 12.6833 49.5905 12 47.7176 12C45.6929 12 40.8849 12.8849 40.8849 17.1878C40.8849 21.2363 46.5279 21.2866 46.5279 23.4131C46.5279 25.5396 41.4663 25.1586 39.7959 23.8176L39.1893 27.3362C39.1893 27.3362 41.0111 28.2211 43.7944 28.2211C46.5786 28.2211 50.7788 26.7796 50.7788 22.856C50.7788 18.7815 45.0851 18.4022 45.0851 16.6307C45.0855 14.8588 49.0589 15.0864 50.8048 16.0485Z" fill="#1A1F71" />
              </svg>
              <img className="home-extra-logo home-extra-logo-img home-extra-logo-img-lg" src="/alivaria.svg" alt="Аліварыя" title="Аліварыя" />
              <img className="home-extra-logo home-extra-logo-img" src="/bnb.svg" alt="БЕЛАРУСКІ НАРОДНЫ БАНК" title="БЕЛАРУСКІ НАРОДНЫ БАНК" />
              <img className="home-extra-logo home-extra-logo-img home-extra-logo-img-lg" src="/priorbank.svg" alt="Приорбанк" title="Приорбанк" />
              <img className="home-extra-logo home-extra-logo-img home-extra-logo-img-lg" src="/mcb-logo-white.png" alt="МКП" title="МКП" />
              <img className="home-extra-logo home-extra-logo-img" src="/logo_roast_by.webp" alt="ROAST" title="ROAST" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
