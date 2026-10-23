import { Navigate, useSearchParams } from 'react-router-dom';

const LEGACY = ['tickets', 'lists', 'settings'];

/** /profile → настройки; поддержка старых ссылок ?tab= */
export default function ProfileRootRedirect() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  if (tab && LEGACY.includes(tab)) {
    return <Navigate to={`/profile/${tab}`} replace />;
  }
  return <Navigate to="/profile/settings" replace />;
}
