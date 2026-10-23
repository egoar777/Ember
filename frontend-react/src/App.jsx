import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { VoiceProvider } from './context/VoiceContext';
import { I18nProvider } from './context/I18nContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Movie from './pages/Movie';
import Booking from './pages/Booking';
import ProfileLayout from './pages/profile/ProfileLayout';
import ProfileRootRedirect from './pages/profile/ProfileRootRedirect';
import ProfileTickets from './pages/profile/ProfileTickets';
import ProfileLists from './pages/profile/ProfileLists';
import ProfileSettings from './pages/profile/ProfileSettings';
import Exclusive from './pages/Exclusive';
import Auth from './pages/Auth';
import News from './pages/News';
import Admin from './pages/Admin';

function SplashScreen({ visible }) {
  return (
    <div className={`app-splash ${visible ? 'visible' : 'hidden'}`} aria-hidden={!visible}>
      <div className="app-splash-logo" role="presentation">
        {['e', 'm', 'b', 'e', 'r'].map((letter, index) => (
          <span key={`${letter}-${index}`} className="app-splash-letter" style={{ '--letter-index': index }}>
            {letter}
          </span>
        ))}
        <span className="app-splash-dot" />
      </div>
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <VoiceProvider>
              <SplashScreen visible={showSplash} />
              <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="catalog" element={<Catalog />} />
                <Route path="news" element={<News />} />
                <Route path="admin" element={<Admin />} />
                <Route path="movie/:id" element={<Movie />} />
                <Route path="booking" element={<Booking />} />
                <Route path="profile" element={<ProfileLayout />}>
                  <Route index element={<ProfileRootRedirect />} />
                  <Route path="tickets" element={<ProfileTickets />} />
                  <Route path="lists" element={<ProfileLists />} />
                  <Route path="settings" element={<ProfileSettings />} />
                </Route>
                <Route path="exclusive" element={<Exclusive />} />
              </Route>
              <Route path="auth" element={<Auth />} />
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </VoiceProvider>
          </ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}

export default App;
