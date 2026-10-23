import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api/client';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { useI18n } from '../context/useI18n';
import { isAdminUser } from '../utils/isAdmin';
import { resolveApiErrorFromException } from '../utils/resolveApiError';
import LoadingState from '../components/LoadingState';
import RolloutSelect from '../components/ui/RolloutSelect';
import { dateLocaleForUi } from '../i18n/localeUi';

const EMPTY_FILTERS = { title: '', date: '', time: '', language: '' };

function matchesLocalDate(iso, dateValue) {
  if (!dateValue) return true;
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}` === dateValue;
}

function matchesLocalTime(iso, timeValue) {
  if (!timeValue) return true;
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}` === timeValue;
}

export default function Admin() {
  const { user, onAuthChange } = useAuth();
  const { show: showToast } = useToast();
  const { t, locale } = useI18n();
  const dateLocale = dateLocaleForUi(locale);

  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const loadScreenings = useCallback(() => {
    setLoading(true);
    apiGet('/admin/screenings?includeCancelled=true', onAuthChange)
      .then(setScreenings)
      .catch(() => setScreenings([]))
      .finally(() => setLoading(false));
  }, [onAuthChange]);

  useEffect(() => {
    if (isAdminUser(user)) loadScreenings();
  }, [user, loadScreenings]);

  const languageOptions = useMemo(() => {
    const langs = new Set();
    screenings.forEach((s) => {
      if (s.language?.trim()) langs.add(s.language.trim());
    });
    return Array.from(langs).sort((a, b) => a.localeCompare(b, locale));
  }, [screenings, locale]);

  const languageSelectOptions = useMemo(
    () => [
      { value: '', label: t('admin.filterAllLanguages') },
      ...languageOptions.map((lang) => ({ value: lang, label: lang })),
    ],
    [languageOptions, t],
  );

  const filteredScreenings = useMemo(() => {
    const q = appliedFilters.title.trim().toLowerCase();
    return screenings.filter((s) => {
      if (q && !s.movieTitle.toLowerCase().includes(q)) return false;
      if (!matchesLocalDate(s.startTime, appliedFilters.date)) return false;
      if (!matchesLocalTime(s.startTime, appliedFilters.time)) return false;
      if (appliedFilters.language && (s.language || '') !== appliedFilters.language) return false;
      return true;
    });
  }, [screenings, appliedFilters]);

  const hasActiveFilters = Boolean(
    appliedFilters.title.trim() || appliedFilters.date || appliedFilters.time || appliedFilters.language,
  );

  const hasPendingFilters =
    draftFilters.title !== appliedFilters.title
    || draftFilters.date !== appliedFilters.date
    || draftFilters.time !== appliedFilters.time
    || draftFilters.language !== appliedFilters.language;

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
  };

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const updateDraft = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdminUser(user)) return <Navigate to="/" replace />;

  const handleCancel = async (id) => {
    if (!window.confirm(t('admin.cancelConfirm'))) return;
    setBusyId(id);
    try {
      await apiPost(`/admin/screenings/${id}/cancel`, {}, onAuthChange);
      showToast(t('admin.cancelSuccess'), 'success');
      loadScreenings();
    } catch (e) {
      showToast(resolveApiErrorFromException(e, t), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container admin-page">
      <header className="admin-page-header">
        <h1 className="catalog-page-title">{t('admin.title')}</h1>
        <p className="admin-page-lead">{t('admin.lead')}</p>
      </header>

      <section className="ui-glass-panel admin-panel">
        <div className="admin-panel-head">
          <h2 className="section-title">{t('admin.screeningsTitle')}</h2>
          {!loading && screenings.length > 0 && hasActiveFilters && (
            <span className="admin-filter-count">
              {t('admin.filterResults', { count: filteredScreenings.length, total: screenings.length })}
            </span>
          )}
        </div>

        {!loading && screenings.length > 0 && (
          <form
            className="admin-filters"
            role="search"
            aria-label={t('admin.filtersAria')}
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters();
            }}
          >
            <div className="catalog-filter-field admin-filter-field">
              <label className="catalog-filter-field-label" htmlFor="admin-filter-title">
                {t('admin.filterTitle')}
              </label>
              <input
                id="admin-filter-title"
                type="search"
                className="catalog-filter-select admin-filter-control"
                placeholder={t('admin.filterTitlePh')}
                value={draftFilters.title}
                onChange={(e) => updateDraft('title', e.target.value)}
              />
            </div>
            <div className="catalog-filter-field admin-filter-field">
              <label className="catalog-filter-field-label" htmlFor="admin-filter-date">
                {t('admin.filterDate')}
              </label>
              <input
                id="admin-filter-date"
                type="date"
                className="catalog-filter-select admin-filter-control"
                value={draftFilters.date}
                onChange={(e) => updateDraft('date', e.target.value)}
              />
            </div>
            <div className="catalog-filter-field admin-filter-field">
              <label className="catalog-filter-field-label" htmlFor="admin-filter-time">
                {t('admin.filterTime')}
              </label>
              <input
                id="admin-filter-time"
                type="time"
                className="catalog-filter-select admin-filter-control"
                value={draftFilters.time}
                onChange={(e) => updateDraft('time', e.target.value)}
              />
            </div>
            <div className="catalog-filter-field admin-filter-field">
              <label id="admin-filter-language-label" className="catalog-filter-field-label" htmlFor="admin-filter-language">
                {t('admin.filterLanguage')}
              </label>
              <RolloutSelect
                id="admin-filter-language"
                value={draftFilters.language}
                onChange={(value) => updateDraft('language', value)}
                options={languageSelectOptions}
                variant="catalog"
                aria-labelledby="admin-filter-language-label"
              />
            </div>
            <div className="admin-filter-actions">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!hasPendingFilters && !hasActiveFilters}
              >
                {t('admin.filterApply')}
              </button>
              {hasActiveFilters && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>
                  {t('admin.filterReset')}
                </button>
              )}
            </div>
          </form>
        )}

        {loading ? (
          <LoadingState label={t('admin.loading')} />
        ) : screenings.length === 0 ? (
          <p className="admin-empty">{t('admin.noScreenings')}</p>
        ) : hasActiveFilters && filteredScreenings.length === 0 ? (
          <p className="admin-empty">{t('admin.noScreeningsFiltered')}</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.colMovie')}</th>
                  <th>{t('admin.colHall')}</th>
                  <th>{t('admin.colStart')}</th>
                  <th>{t('admin.colLanguage')}</th>
                  <th>{t('admin.colStatus')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredScreenings.map((s) => (
                  <tr key={s.id} className={s.isCancelled ? 'admin-row-cancelled' : ''}>
                    <td>{s.movieTitle}</td>
                    <td>{s.hallName}</td>
                    <td>
                      {new Date(s.startTime).toLocaleString(dateLocale, {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{s.language || '—'}</td>
                    <td>
                      {s.isCancelled ? (
                        <span className="admin-badge admin-badge-cancelled">{t('admin.statusCancelled')}</span>
                      ) : (
                        <span className="admin-badge admin-badge-active">{t('admin.statusActive')}</span>
                      )}
                    </td>
                    <td className="admin-actions-cell">
                      {!s.isCancelled && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={busyId === s.id}
                          onClick={() => handleCancel(s.id)}
                        >
                          {t('admin.cancelScreening')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
