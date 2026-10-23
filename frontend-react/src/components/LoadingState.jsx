import { useI18n } from '../context/useI18n';

function stripTrailingDots(text) {
  return String(text || '')
    .replace(/[.…\u2026]+$/u, '')
    .trim();
}

export default function LoadingState({ label, className = '', fullScreen = false }) {
  const { t } = useI18n();
  const raw = label ?? t('common.loading');
  const text = stripTrailingDots(raw);

  return (
    <div
      className={`page-loading${fullScreen ? ' page-loading--fullscreen' : ''}${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      aria-label={raw}
    >
      <p className="page-loading-text">
        {text}
        <span className="page-loading-dots" aria-hidden="true">
          <span className="page-loading-dot">.</span>
          <span className="page-loading-dot">.</span>
          <span className="page-loading-dot">.</span>
        </span>
      </p>
    </div>
  );
}
