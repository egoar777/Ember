import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom';
import { ProfileCabinetProvider } from '../../context/ProfileCabinetContext';
import { useProfileCabinet } from '../../context/useProfileCabinet';
import { useI18n } from '../../context/useI18n';
function profileSubpageTitle(pathname, t) {
  if (pathname.startsWith('/profile/tickets')) return t('nav.myTickets');
  if (pathname.startsWith('/profile/lists')) return t('nav.wantToWatch');
  return '';
}

export default function ProfileLayout() {
  return (
    <ProfileCabinetProvider>
      <ProfileLayoutInner />
    </ProfileCabinetProvider>
  );
}

function ProfileLayoutInner() {
  const { t } = useI18n();
  const location = useLocation();
  const pathname = location.pathname;
  const subTitle = profileSubpageTitle(pathname, t);
  const isProfileRoot = pathname === '/profile' || pathname === '/profile/';
  const isSettingsHub = pathname === '/profile/settings' || pathname.startsWith('/profile/settings/');

  const { isAuthenticated } = useProfileCabinet();

  if (!isAuthenticated) {
    return <Navigate to="/auth?return=/profile/settings" replace />;
  }

  return (
    <div className="profile-page">
      <div className="profile-page-glow profile-page-glow-left" aria-hidden="true" />
      {!isSettingsHub && (
        <div className="profile-page-glow profile-page-glow-right" aria-hidden="true" />
      )}
      {!isSettingsHub && (
        <div className="profile-page-wordmark" aria-hidden="true">
          ember<span>.</span>
        </div>
      )}
      <div className="container profile-page-shell">
        {!isSettingsHub && !isProfileRoot && (
          <header className="profile-subpage-toolbar">
            <h1 className="profile-subpage-title">{subTitle}</h1>
            <NavLink to="/profile/settings" className="profile-subpage-cabinet-link">
              {t('nav.profileSettings')}
            </NavLink>
          </header>
        )}

        <Outlet />
      </div>
    </div>
  );
}
