import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { dictForLocale } from '../i18n/translations';
import { useI18n } from '../context/useI18n';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { apiGet, apiPost, apiDel, apiUpload } from '../api/client';
import { isAdminUser } from '../utils/isAdmin';
import { resolveApiErrorFromException } from '../utils/resolveApiError';
import { resolveNewsImageUrl } from '../utils/resolveNewsImageUrl';

const EMPTY_FORM = {
  title: '',
  text: '',
  type: 'news',
  badge: '',
  image: '',
  displayDate: '',
};

export default function News() {
  const { locale, t } = useI18n();
  const { user, onAuthChange } = useAuth();
  const { show: showToast } = useToast();
  const [mode, setMode] = useState('all');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const imageInputRef = useRef(null);
  const tabsBarRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const fallbackItems = useMemo(() => dictForLocale(locale).newsPageItems || [], [locale]);
  const isAdmin = isAdminUser(user);

  const loadNews = useCallback(() => {
    const path = isAdmin ? '/admin/news' : '/news';
    apiGet(path, onAuthChange)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems(fallbackItems));
  }, [isAdmin, onAuthChange, fallbackItems]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const filtered = items.filter((n) => {
    if (mode === 'all') return true;
    if (mode === 'news') return n.type === 'news';
    if (mode === 'sale') return n.type === 'sale';
    return true;
  });

  useEffect(() => {
    const update = () => {
      if (!tabsBarRef.current) return;
      const el = tabsBarRef.current.querySelector(`.home-tab[data-tab="${mode}"]`);
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
  }, [mode]);

  const np = dictForLocale(locale).newsPage || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.text.trim()) return;
    setSubmitting(true);
    try {
      await apiPost('/admin/news', form, onAuthChange);
      setForm(EMPTY_FORM);
      setImagePreview('');
      showToast(t('admin.newsCreated'), 'success');
      loadNews();
    } catch (err) {
      showToast(resolveApiErrorFromException(err, t), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.newsDeleteConfirm'))) return;
    try {
      await apiDel(`/admin/news/${id}`, onAuthChange);
      showToast(t('admin.newsDeleted'), 'success');
      loadNews();
    } catch (err) {
      showToast(resolveApiErrorFromException(err, t), 'error');
    }
  };

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(t('admin.newsImageInvalid'), 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiUpload('/admin/news/upload-image', formData, onAuthChange);
      setForm((f) => ({ ...f, image: result.url }));
      showToast(t('admin.newsImageUploaded'), 'success');
    } catch (err) {
      setImagePreview('');
      showToast(resolveApiErrorFromException(err, t), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const clearImage = () => {
    setForm((f) => ({ ...f, image: '' }));
    setImagePreview('');
  };

  const displayImage = imagePreview || (form.image ? resolveNewsImageUrl(form.image) : '');

  return (
    <div className="container">
      {isAdmin && (
        <section className="ui-glass-panel admin-news-form">
          <h2 className="section-title">{t('admin.addNewsTitle')}</h2>
          <form className="admin-news-form-grid" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('admin.newsFieldTitle')}</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>{t('admin.newsFieldType')}</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="news">{t('admin.newsTypeNews')}</option>
                <option value="sale">{t('admin.newsTypeSale')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('admin.newsFieldBadge')}</label>
              <input value={form.badge} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} placeholder={t('admin.newsBadgePlaceholder')} />
            </div>
            <div className="form-group">
              <label>{t('admin.newsFieldDate')}</label>
              <input value={form.displayDate} onChange={(e) => setForm((f) => ({ ...f, displayDate: e.target.value }))} placeholder={t('admin.newsDatePlaceholder')} />
            </div>
            <div className="form-group admin-news-form-wide admin-news-image-field">
              <label>{t('admin.newsFieldImage')}</label>
              <div className="admin-news-image-picker">
                {displayImage ? (
                  <div className="admin-news-image-preview-wrap">
                    <img src={displayImage} alt="" className="admin-news-image-preview" />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={clearImage}>
                      {t('admin.newsImageRemove')}
                    </button>
                  </div>
                ) : (
                  <div className="admin-news-image-placeholder">{t('admin.newsImagePlaceholder')}</div>
                )}
                <div className="admin-news-image-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={uploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    {uploadingImage ? t('admin.newsImageUploading') : t('admin.newsImagePick')}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="profile-avatar-input"
                    onChange={handleImagePick}
                  />
                </div>
                <input
                  value={form.image}
                  onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                  placeholder="/uploads/news/…"
                  className="admin-news-image-url"
                />
              </div>
            </div>
            <div className="form-group admin-news-form-wide">
              <label>{t('admin.newsFieldText')}</label>
              <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} rows={4} required />
            </div>
            <div className="admin-news-form-wide">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {t('admin.newsPublish')}
              </button>
            </div>
          </form>
        </section>
      )}

      <header className="news-page-header">
        <h1 className="news-page-title">{np.title}</h1>
        <div className="home-tabs-bar" ref={tabsBarRef}>
          <ul className="home-tabs-list">
            <li className="home-tab-item">
              <button type="button" className={`home-tab ${mode === 'all' ? 'active' : ''}`} data-tab="all" onClick={() => setMode('all')}>
                {np.tabAll}
              </button>
            </li>
            <li className="home-tab-item">
              <button
                type="button"
                className={`home-tab ${mode === 'news' ? 'active' : ''}`}
                data-tab="news"
                onClick={() => setMode('news')}
              >
                {np.tabNews}
              </button>
            </li>
            <li className="home-tab-item">
              <button
                type="button"
                className={`home-tab ${mode === 'sale' ? 'active' : ''}`}
                data-tab="sale"
                onClick={() => setMode('sale')}
              >
                {np.tabSales}
              </button>
            </li>
          </ul>
          <div className="home-tabs-indicator" style={indicatorStyle} />
        </div>
      </header>

      <section className="news-page-grid">
        {filtered.map((n) => (
          <article key={n.id} className="news-card news-card-large">
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
              <span className={`news-badge ${n.type === 'sale' ? 'news-badge-sale' : 'news-badge-news'}`}>{n.badge}</span>
              <span className="news-date">{n.date}</span>
              {isAdmin && (
                <button type="button" className="admin-inline-delete" onClick={() => handleDelete(n.id)}>
                  {t('admin.delete')}
                </button>
              )}
            </div>
            <h2 className="news-title">{n.title}</h2>
            <p className="news-text">{n.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
