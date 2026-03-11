import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { useToast } from '../context/ToastContext';
import { apiGet } from '../api/client';
import { getDisplayTitleForString } from '../titleOverrides';
import { IconClapperboard, IconSearch, IconMic } from './Icons';

export default function Header() {
  const { user, isAuthenticated, logout, onAuthChange } = useAuth();
  const navigate = useNavigate();
  const { isListening, startListening, stopListening } = useVoice();
  const { show: showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith('/auth');

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q || isSearching) return;
    const qLower = q.toLowerCase();
    setIsSearching(true);
    try {
      const params = new URLSearchParams({ search: q, pageSize: '20' });
      const r = await apiGet(`/movies?${params}`, onAuthChange);
      let items = r?.items ?? r?.Items ?? [];
      if (items.length === 0) {
        const allParams = new URLSearchParams({ pageSize: '50' });
        const allRes = await apiGet(`/movies?${allParams}`, onAuthChange);
        const all = allRes?.items ?? allRes?.Items ?? [];
        items = all.filter((m) => {
          const t = (m.title ?? m.Title ?? '').toLowerCase();
          const o = (m.originalTitle ?? m.OriginalTitle ?? '').toLowerCase();
          const display = getDisplayTitleForString(m.title ?? m.Title ?? '').toLowerCase();
          return t.includes(qLower) || o.includes(qLower) || display.includes(qLower);
        });
      }
      if (items.length >= 1) {
        const first = items[0];
        const id = first.id ?? first.Id;
        navigate(`/movie/${id}`);
        showToast(`Открыт: ${getDisplayTitleForString(first.title ?? first.Title)}`, 'success');
      } else {
        navigate(`/catalog?search=${encodeURIComponent(q)}`);
        showToast('Ничего не найдено', 'info');
      }
    } catch (err) {
      try {
        const allParams = new URLSearchParams({ pageSize: '50' });
        const allRes = await apiGet(`/movies?${allParams}`, onAuthChange);
        const all = allRes?.items ?? allRes?.Items ?? [];
        const items = all.filter((m) => {
          const t = (m.title ?? m.Title ?? '').toLowerCase();
          const o = (m.originalTitle ?? m.OriginalTitle ?? '').toLowerCase();
          const display = getDisplayTitleForString(m.title ?? m.Title ?? '').toLowerCase();
          return t.includes(qLower) || o.includes(qLower) || display.includes(qLower);
        });
        if (items.length >= 1) {
          const first = items[0];
          const id = first.id ?? first.Id;
          navigate(`/movie/${id}`);
          showToast(`Открыт: ${getDisplayTitleForString(first.title ?? first.Title)}`, 'success');
          return;
        }
      } catch {
        // ignore
      }
      navigate(`/catalog?search=${encodeURIComponent(q)}`);
      showToast('Ошибка поиска', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase()
    : '';

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          Ember<span style={{ color: 'var(--color-primary)' }}>.</span>
        </Link>
        {!isAuthPage && (
          <>
            <form className="search-box" onSubmit={handleSearch} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
              <button type="submit" className="search-icon-wrap" aria-label="Искать" style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconSearch style={{ width: 18, height: 18 }} />
              </button>
              <input
                type="text"
                placeholder="Поиск фильмов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
              <button
                type="button"
                className={`voice-btn ${isListening ? 'listening' : ''}`}
                title="Голосовой поиск"
                onClick={() => (isListening ? stopListening() : startListening())}
                aria-label="Голосовой поиск"
              >
                <IconMic style={{ width: 18, height: 18 }} />
              </button>
            </form>
            <div className="header-actions">
              {isAuthenticated ? (
                <Link to="/profile" className="user-avatar" title={user?.displayName}>
                  {initials}
                </Link>
              ) : (
                <Link to="/auth" className="btn btn-primary btn-sm">
                  Войти
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
