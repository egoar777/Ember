import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/client';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../context/useI18n';
import { dictForLocale } from '../i18n/translations';
import MovieCard from '../components/MovieCard';
import HeroPreview from '../components/HeroPreview';
import BelarusianDubbingBanner from '../components/BelarusianDubbingBanner';
import LoadingState from '../components/LoadingState';
import { dedupeMovies } from '../utils/dedupeMovies';
import { resolveNewsImageUrl } from '../utils/resolveNewsImageUrl';
import { isKidsMovie } from '../utils/movieAgeRating';

function popularityScore(movie) {
  const count = movie.ratingCount ?? 0;
  const rating = movie.averageRating ?? 0;
  return count * 100 + rating;
}

function sortByPopularity(movies) {
  return [...movies].sort((a, b) => popularityScore(b) - popularityScore(a));
}

export default function Home() {
  const { onAuthChange } = useAuth();
  const { t, locale } = useI18n();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [afishaFilter, setAfishaFilter] = useState('all');
  const tabsBarRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const [newsItems, setNewsItems] = useState([]);
  const homeLabels = useMemo(() => dictForLocale(locale).home || {}, [locale]);
  const fallbackNews = useMemo(() => dictForLocale(locale).homeNews || [], [locale]);

  useEffect(() => {
    apiGet('/news?limit=3', onAuthChange)
      .then((data) => setNewsItems(Array.isArray(data) && data.length ? data : fallbackNews))
      .catch(() => setNewsItems(fallbackNews));
  }, [locale, onAuthChange, fallbackNews]);

  const localizeCollection = useCallback(
    (c) => {
      const slugKeys = {
        popular: 'home.colPopular',
        plus: 'home.colPlus',
        kids: 'home.colKids',
        'for-you': null,
        'top-rated': null,
      };
      const key = slugKeys[c.slug];
      return { ...c, title: key ? t(key) : c.title };
    },
    [t]
  );

  useEffect(() => {
    const fetchFallback = () =>
      Promise.all([
        apiGet('/movies?sortBy=rating&page=1&pageSize=15', onAuthChange),
        apiGet('/movies?featured=true&pageSize=10', onAuthChange),
        apiGet('/movies?forKids=true&pageSize=10', onAuthChange),
      ]).then(([popularRes, plusRes, kidsRes]) => {
        const popular = sortByPopularity(popularRes?.items || []);
        const plus = plusRes?.items || [];
        const kids = kidsRes?.items || [];
        setCollections(
          [
            { slug: 'popular', title: '', movies: dedupeMovies(popular) },
            { slug: 'plus', title: '', movies: dedupeMovies(plus.length ? plus : popular) },
            { slug: 'kids', title: '', movies: dedupeMovies(kids) },
          ].map(localizeCollection)
        );
      });

    apiGet('/ai/recommendations/home', onAuthChange)
      .then((data) => {
        const list = data || [];
        if (list.length > 0) {
          setCollections(
            (list || [])
              .filter((c) => c.slug !== 'exclusive' && c.slug !== 'premieres')
              .map((c) => ({
                ...c,
                movies: c.slug === 'popular'
                  ? sortByPopularity(dedupeMovies(c.movies || []))
                  : dedupeMovies(c.movies || []),
              }))
              .map(localizeCollection)
          );
          setLoading(false);
          return;
        }
        return fetchFallback();
      })
      .catch(() => fetchFallback().catch(() => setCollections([])))
      .finally(() => setLoading(false));
  }, [onAuthChange, localizeCollection]);

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
      <HeroPreview />

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
                {homeLabels.tabAll}
              </button>
            </li>
            <li className="home-tab-item">
              <button
                type="button"
                className={`home-tab ${afishaFilter === 'plus' ? 'active' : ''}`}
                data-tab="plus"
                onClick={() => setAfishaFilter('plus')}
              >
                {homeLabels.tabPlus}
              </button>
            </li>
            <li className="home-tab-item">
              <button
                type="button"
                className={`home-tab ${afishaFilter === 'kids' ? 'active' : ''}`}
                data-tab="kids"
                onClick={() => setAfishaFilter('kids')}
              >
                {homeLabels.tabKids}
              </button>
            </li>
          </ul>
          <Link to="/catalog" className="home-tabs-link">
            {homeLabels.fullSchedule}
          </Link>
          <div className="home-tabs-indicator" style={indicatorStyle} />
        </div>
        <div className="home-tabs-divider" />

        {loading && <LoadingState fullScreen />}
        {(() => {
          const slugMap = {
            all: 'popular',
            plus: 'plus',
            kids: 'kids',
          };
          const activeSlug = slugMap[afishaFilter] || 'popular';
          const col = collections.find((c) => c.slug === activeSlug)
            ?? (afishaFilter === 'all' ? collections[0] : null);
          if (!col) return null;
          let movies = dedupeMovies(col.movies || []);
          if (afishaFilter === 'all') {
            movies = sortByPopularity(movies);
          } else if (afishaFilter === 'kids') {
            movies = movies.filter(isKidsMovie);
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
            <h2 className="section-title">{homeLabels.newsTitle}</h2>
            <Link to="/news" className="section-link">
              {homeLabels.allNews}
            </Link>
          </div>
          <div className="news-row">
            {newsItems.slice(0, 3).map((n) => (
              <article key={n.id} className="news-card">
                {n.image && (
                  <img
                    src={resolveNewsImageUrl(n.image)}
                    alt={n.title}
                    onError={(e) => {
                      if (e.currentTarget.src.endsWith('/images/news-combo.jpg')) return;
                      e.currentTarget.src = '/images/news-combo.jpg';
                    }}
                  />
                )}
                <div className="news-badge-row">
                  <span
                    className={`news-badge ${n.badge === homeLabels.badgeSale ? 'news-badge-sale' : 'news-badge-news'}`}
                  >
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

        <BelarusianDubbingBanner />

        <section className="home-extra-section">
          <div className="home-extra-block">
            <h3 className="home-extra-title">{homeLabels.payTitle}</h3>
            <div className="home-extra-logos">
              <svg className="home-extra-logo home-extra-logo-img home-extra-logo-img-lg" viewBox="0 0 80 40" aria-label="VISA" role="img" title="VISA">
                <path d="M36.6755 27.9508H32.5956L35.1455 12.28H39.2258L36.6755 27.9508ZM29.1633 12.28L25.2737 23.0585L24.8135 20.7374L24.8139 20.7383L23.4411 13.691C23.4411 13.691 23.2751 12.28 21.5057 12.28H15.0755L15 12.5454C15 12.5454 16.9664 12.9545 19.2677 14.3365L22.8123 27.9512H27.0632L33.5542 12.28H29.1633ZM61.2538 27.9508H65L61.7337 12.2796H58.4541C56.9396 12.2796 56.5707 13.4474 56.5707 13.4474L50.4858 27.9508H54.7388L55.5894 25.623H60.7759L61.2538 27.9508ZM56.7643 22.4075L58.908 16.5431L60.114 22.4075H56.7643ZM50.8048 16.0485L51.3871 12.6833C51.3871 12.6833 49.5905 12 47.7176 12C45.6929 12 40.8849 12.8849 40.8849 17.1878C40.8849 21.2363 46.5279 21.2866 46.5279 23.4131C46.5279 25.5396 41.4663 25.1586 39.7959 23.8176L39.1893 27.3362C39.1893 27.3362 41.0111 28.2211 43.7944 28.2211C46.5786 28.2211 50.7788 26.7796 50.7788 22.856C50.7788 18.7815 45.0851 18.4022 45.0851 16.6307C45.0855 14.8588 49.0589 15.0864 50.8048 16.0485Z" fill="#1A1F71" />
              </svg>
              <img className="home-extra-logo home-extra-logo-img home-extra-logo-img-md" src="/mastercard-logo-52.svg" alt="Mastercard" title="Mastercard" />
              <img className="home-extra-logo home-extra-logo-img home-extra-logo-img-lg" src="/belcard.png" alt="Belkart" title="Belkart" />
            </div>
          </div>
          <hr className="home-extra-hr" />
          <div className="home-extra-block">
            <h3 className="home-extra-title">{homeLabels.partnersTitle}</h3>
            <div className="home-extra-logos">
              <img className="home-extra-logo home-extra-logo-img home-extra-logo-img-sm" src="/Coca-Cola_logo.svg" alt="Coca-Cola" title="Coca-Cola" />
              <svg className="home-extra-logo home-extra-logo-img home-extra-logo-img-lg" viewBox="0 0 80 40" aria-label="VISA" role="img" title="VISA">
                <path d="M36.6755 27.9508H32.5956L35.1455 12.28H39.2258L36.6755 27.9508ZM29.1633 12.28L25.2737 23.0585L24.8135 20.7374L24.8139 20.7383L23.4411 13.691C23.4411 13.691 23.2751 12.28 21.5057 12.28H15.0755L15 12.5454C15 12.5454 16.9664 12.9545 19.2677 14.3365L22.8123 27.9512H27.0632L33.5542 12.28H29.1633ZM61.2538 27.9508H65L61.7337 12.2796H58.4541C56.9396 12.2796 56.5707 13.4474 56.5707 13.4474L50.4858 27.9508H54.7388L55.5894 25.623H60.7759L61.2538 27.9508ZM56.7643 22.4075L58.908 16.5431L60.114 22.4075H56.7643ZM50.8048 16.0485L51.3871 12.6833C51.3871 12.6833 49.5905 12 47.7176 12C45.6929 12 40.8849 12.8849 40.8849 17.1878C40.8849 21.2363 46.5279 21.2866 46.5279 23.4131C46.5279 25.5396 41.4663 25.1586 39.7959 23.8176L39.1893 27.3362C39.1893 27.3362 41.0111 28.2211 43.7944 28.2211C46.5786 28.2211 50.7788 26.7796 50.7788 22.856C50.7788 18.7815 45.0851 18.4022 45.0851 16.6307C45.0855 14.8588 49.0589 15.0864 50.8048 16.0485Z" fill="#1A1F71" />
              </svg>
              <img className="home-extra-logo home-extra-logo-img home-extra-logo-img-lg" src="/alivaria.svg" alt="Alivaria" title="Alivaria" />
              <img className="home-extra-logo home-extra-logo-img" src="/bnb.svg" alt="BNB Bank" title="BNB Bank" />
              <img className="home-extra-logo home-extra-logo-img home-extra-logo-img-lg" src="/priorbank.svg" alt="Priorbank" title="Priorbank" />
              <img className="home-extra-logo home-extra-logo-img home-extra-logo-img-lg" src="/mcb-logo-white.png" alt="MCB" title="MCB" />
              <img className="home-extra-logo home-extra-logo-img" src="/logo_roast_by.webp" alt="ROAST" title="ROAST" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
