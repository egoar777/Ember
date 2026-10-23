import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useVoice } from '../context/useVoice';
import { useToast } from '../context/useToast';
import { useI18n } from '../context/useI18n';
import { useAdaptiveSurfaceTone } from '../hooks/useAdaptiveSurfaceTone';
import { useMovieSearchCatalog } from '../hooks/useMovieSearchCatalog';
import { rankMoviesForSearch, getMovieDisplayTitle } from '../utils/movieSearch';
import { searchMoviesCatalog, navigateFromSearchResults } from '../utils/movieSearchNavigate';
import { normalizeSearchQuery } from '../utils/searchQuery';
import { isAdminUser } from '../utils/isAdmin';
import { IconSearch, IconMic } from './Icons';
import MoviePoster from './MoviePoster';
import ConfirmModal from './ConfirmModal';
import EmberLogo from './EmberLogo';
import { MenuContainer, MenuOrbItem, FluidMenuAvatarTrigger } from './ui/fluid-menu';
import { Ticket, Heart, Settings, LogOut, X, Shield } from 'lucide-react';

export default function Header() {
  const { user, isAuthenticated, logout, onAuthChange } = useAuth();
  const navigate = useNavigate();
  const { isListening, startListening, stopListening } = useVoice();
  const { show: showToast } = useToast();
  const { t } = useI18n();
  const { catalog } = useMovieSearchCatalog();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const easterEggTimeoutRef = useRef(null);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith('/auth');
  const isHome = location.pathname === '/';
  const isMovieDetail = /^\/movie\/\d+$/.test(location.pathname);
  const isBooking = location.pathname.startsWith('/booking');
  const overlayHeaderRoute = isHome || isMovieDetail || isBooking;
  const [overlayHeaderSolid, setOverlayHeaderSolid] = useState(false);
  const adaptiveSearchTone = overlayHeaderRoute && !overlayHeaderSolid && !isAuthPage;
  const searchTone = useAdaptiveSurfaceTone(searchRef, adaptiveSearchTone);

  const suggestions = useMemo(() => {
    const q = normalizeSearchQuery(searchQuery);
    if (q.length < 2) return [];
    return rankMoviesForSearch(catalog, q, 8);
  }, [catalog, searchQuery]);

  useEffect(() => {
    if (!overlayHeaderRoute) {
      setOverlayHeaderSolid(false);
      return;
    }
    const onScroll = () => {
      const threshold = isBooking ? 140 : 56;
      setOverlayHeaderSolid(window.scrollY > threshold);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overlayHeaderRoute, isBooking]);

  useEffect(() => {
    return () => {
      if (easterEggTimeoutRef.current) {
        clearTimeout(easterEggTimeoutRef.current);
      }
      document.body.classList.remove('screen-wobble');
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!searchRef.current?.contains(e.target)) {
        setSuggestionsOpen(false);
        setActiveSuggestion(-1);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const suggestionsVisible = suggestionsOpen && suggestions.length > 0;

  useEffect(() => {
    if (!suggestionsVisible) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [suggestionsVisible]);

  useEffect(() => {
    const list = suggestionsRef.current;
    if (!list || !suggestionsVisible) return undefined;

    const onWheel = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = list;
      if (scrollHeight <= clientHeight) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
        e.preventDefault();
      }
      e.stopPropagation();
    };

    list.addEventListener('wheel', onWheel, { passive: false });
    return () => list.removeEventListener('wheel', onWheel);
  }, [suggestionsVisible, suggestions.length]);

  const triggerScreenWobble = () => {
    if (easterEggTimeoutRef.current) {
      clearTimeout(easterEggTimeoutRef.current);
    }

    document.body.classList.remove('screen-wobble');
    void document.body.offsetWidth;
    document.body.classList.add('screen-wobble');

    easterEggTimeoutRef.current = setTimeout(() => {
      document.body.classList.remove('screen-wobble');
      easterEggTimeoutRef.current = null;
    }, 2200);
  };

  const runSearch = useCallback(
    async (rawQuery, { voice = false } = {}) => {
      const q = voice ? rawQuery : normalizeSearchQuery(rawQuery);
      if (!q || isSearching) return;

      if (q === '67') {
        triggerScreenWobble();
      }

      setIsSearching(true);
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);

      try {
        const { items, query } = await searchMoviesCatalog(q, onAuthChange, { voice });
        navigateFromSearchResults(items, query, navigate, showToast, t);
      } catch {
        navigate(`/catalog?search=${encodeURIComponent(q)}`);
        showToast(t('header.toastSearchError'), 'error');
      } finally {
        setIsSearching(false);
      }
    },
    [isSearching, navigate, onAuthChange, showToast, t]
  );

  const handleSearch = async (e) => {
    e.preventDefault();
    await runSearch(searchQuery);
  };

  const openSuggestion = (movie) => {
    const id = movie.id ?? movie.Id;
    if (!id) return;
    setSearchQuery('');
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    navigate(`/movie/${id}`);
    showToast(t('header.toastOpened', { title: getMovieDisplayTitle(movie) }), 'success');
  };

  const onSearchKeyDown = (e) => {
    if (!suggestionsOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault();
      openSuggestion(suggestions[activeSuggestion].movie);
    } else if (e.key === 'Escape') {
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    }
  };

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '';

  return (
    <header
      className={`header${overlayHeaderRoute && !overlayHeaderSolid ? ' header--home-transparent' : ''}`}
    >
      <div className="header-inner">
        <Link to="/" className="logo">
          <EmberLogo size="sm" />
        </Link>
        {!isAuthPage && (
          <>
            <form
              ref={searchRef}
              className={`search-box search-box--tone-${searchTone}`}
              onSubmit={handleSearch}
              style={{ marginLeft: 'auto', marginRight: 'auto' }}
              role="search"
            >
              <button
                type="submit"
                className="search-icon-wrap"
                aria-label={t('header.searchAria')}
                style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}
              >
                <IconSearch style={{ width: 18, height: 18 }} />
              </button>
              <input
                type="text"
                role="searchbox"
                placeholder={t('header.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSuggestionsOpen(true);
                  setActiveSuggestion(-1);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setSuggestionsOpen(true);
                }}
                onKeyDown={onSearchKeyDown}
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={suggestionsOpen && suggestions.length > 0}
                aria-controls="header-search-suggestions"
                className={searchQuery ? 'search-box-input--has-clear' : ''}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  aria-label={t('header.clearSearch')}
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestionsOpen(false);
                    setActiveSuggestion(-1);
                  }}
                >
                  <X size={16} strokeWidth={2.25} aria-hidden />
                </button>
              )}
              <button
                type="button"
                className={`voice-btn ${isListening ? 'listening' : ''}`}
                title={t('header.voiceTitle')}
                onClick={() => (isListening ? stopListening() : startListening())}
                aria-label={t('header.voiceAria')}
              >
                <IconMic style={{ width: 18, height: 18 }} />
              </button>

              {suggestionsVisible && (
                <ul
                  id="header-search-suggestions"
                  ref={suggestionsRef}
                  className="search-suggestions"
                  role="listbox"
                  aria-label={t('header.searchSuggestionsAria')}
                >
                  {suggestions.map(({ movie }, index) => {
                    const genres = (movie.genres || movie.Genres || []).slice(0, 2).join(', ');
                    return (
                      <li key={movie.id ?? movie.Id} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={activeSuggestion === index}
                          className={`search-suggestion-item${activeSuggestion === index ? ' active' : ''}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => openSuggestion(movie)}
                        >
                          <span className="search-suggestion-poster" aria-hidden="true">
                            <MoviePoster
                              movie={movie}
                              className="search-suggestion-poster-img"
                              alt=""
                            />
                          </span>
                          <span className="search-suggestion-text">
                            <span className="search-suggestion-title">{getMovieDisplayTitle(movie)}</span>
                            {genres ? (
                              <span className="search-suggestion-meta">{movie.year} · {genres}</span>
                            ) : (
                              <span className="search-suggestion-meta">{movie.year}</span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </form>
            <div className="header-actions">
              {isAuthenticated ? (
                <>
                  <Link to="/profile/settings" className="header-bonus-pill" title={t('header.bonusTitle')}>
                    <span className="header-bonus-value">{user?.bonusBalance ?? 0}</span>
                    <span className="header-bonus-label">{t('profile.bonusPillSuffix')}</span>
                  </Link>
                  <MenuContainer
                    triggerClassName="fluid-menu-trigger--avatar"
                    userLabel={user?.displayName || ''}
                    getTriggerAriaLabel={(expanded, label) =>
                      expanded ? t('menu.close') : label ? t('menu.openWithUser', { name: label }) : t('menu.open')
                    }
                  >
                    <FluidMenuAvatarTrigger avatarUrl={user?.avatarUrl} initials={initials} />
                    <MenuOrbItem
                      title={t('nav.myTickets')}
                      ariaLabel={t('nav.myTickets')}
                      icon={<Ticket size={18} strokeWidth={1.5} />}
                      onClick={() => navigate('/profile/tickets')}
                    />
                    <MenuOrbItem
                      title={t('nav.wantToWatch')}
                      ariaLabel={t('nav.wantToWatch')}
                      icon={<Heart size={18} strokeWidth={1.5} />}
                      onClick={() => navigate('/profile/lists')}
                    />
                    {isAdminUser(user) && (
                      <MenuOrbItem
                        title={t('nav.admin')}
                        ariaLabel={t('nav.admin')}
                        icon={<Shield size={18} strokeWidth={1.5} />}
                        onClick={() => navigate('/admin')}
                      />
                    )}
                    <MenuOrbItem
                      title={t('header.settingsTitle')}
                      ariaLabel={t('header.settingsTitle')}
                      icon={<Settings size={18} strokeWidth={1.5} />}
                      onClick={() => navigate('/profile/settings')}
                    />
                    <MenuOrbItem
                      title={t('header.logoutTitle')}
                      ariaLabel={t('header.logoutAria')}
                      accent
                      icon={<LogOut size={18} strokeWidth={1.5} />}
                      onClick={() => setLogoutConfirmOpen(true)}
                    />
                  </MenuContainer>
                </>
              ) : (
                <Link to="/auth" className="btn btn-primary btn-sm">
                  {t('header.login')}
                </Link>
              )}
            </div>
          </>
        )}
      </div>
      <ConfirmModal
        open={logoutConfirmOpen}
        title={t('header.logoutConfirmTitle')}
        message={t('header.logoutConfirmMessage')}
        confirmLabel={t('header.logoutConfirmAction')}
        cancelLabel={t('profile.cancel')}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          logout();
          navigate('/');
        }}
      />
    </header>
  );
}
