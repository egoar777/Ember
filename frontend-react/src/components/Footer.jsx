import { Link } from 'react-router-dom';
import { useI18n } from '../context/useI18n';
import EmberLogo from './EmberLogo';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand-shell">
          <div className="footer-brand-card">
            <div className="footer-brand-card__decor" aria-hidden="true">
              <span className="footer-brand-card__ring footer-brand-card__ring--left" />
              <span className="footer-brand-card__ring footer-brand-card__ring--right" />
              <span className="footer-brand-card__strip" />
            </div>
            <Link to="/" className="footer-logo">
              <EmberLogo size="lg" />
            </Link>
            <p className="footer-tagline">{t('footer.tagline')}</p>
          </div>
        </div>
        <div className="footer-links-shell">
          <div className="footer-col">
            <h4>{t('footer.navTitle')}</h4>
            <Link to="/">{t('footer.home')}</Link>
            <Link to="/catalog">{t('footer.showtimes')}</Link>
            <Link to="/news">{t('footer.news')}</Link>
          </div>
          <div className="footer-col">
            <h4>{t('footer.sectionsTitle')}</h4>
            <Link to="/exclusive">{t('footer.exclusive')}</Link>
            <Link to="/profile/settings">{t('footer.account')}</Link>
            <Link to="/booking">{t('footer.booking')}</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>{t('footer.rights')}</span>
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
          {t('footer.tmdb')}
        </a>
      </div>
    </footer>
  );
}
