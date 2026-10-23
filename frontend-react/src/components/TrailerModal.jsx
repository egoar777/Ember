import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../context/useI18n';
import ModalCornerClose from './ModalCornerClose';

function toSafeEmbedUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return null;

    const host = parsed.hostname.toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      if (host.includes('youtu.be')) {
        const videoId = parsed.pathname.replace('/', '').trim();
        if (!videoId) return null;
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return `${parsed.origin}${parsed.pathname}?autoplay=1&rel=0`;
      }
      const videoId = parsed.searchParams.get('v');
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }

    if (host.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean).pop();
      if (!id) return null;
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
  } catch {
    return null;
  }
  return null;
}

export default function TrailerModal({ open, onClose, trailerUrl, title }) {
  const { t } = useI18n();
  const location = useLocation();
  const openRouteRef = useRef('');
  const embedUrl = toSafeEmbedUrl(trailerUrl);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      openRouteRef.current = '';
      return;
    }

    const currentRoute = `${location.pathname}${location.search}`;
    if (!openRouteRef.current) {
      openRouteRef.current = currentRoute;
      return;
    }

    if (openRouteRef.current !== currentRoute) {
      onClose();
      openRouteRef.current = '';
    }
  }, [open, location.pathname, location.search, onClose]);

  if (!open || !embedUrl) return null;

  return (
    <div
      className="modal-backdrop modal-backdrop--glass trailer-modal-backdrop active"
      onClick={onClose}
      role="presentation"
    >
      <ModalCornerClose onClose={onClose} ariaLabel={t('movieCard.closeTrailer')} />
      <div
        className="trailer-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('movieCard.trailerModalAria', { title })}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="trailer-modal__frame-wrap">
          <iframe
            className="trailer-modal__frame"
            src={embedUrl}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  );
}
