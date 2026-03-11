import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { VoiceProvider } from './context/VoiceContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Movie from './pages/Movie';
import Booking from './pages/Booking';
import Profile from './pages/Profile';
import Exclusive from './pages/Exclusive';
import Auth from './pages/Auth';
import News from './pages/News';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <VoiceProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="catalog" element={<Catalog />} />
                <Route path="news" element={<News />} />
                <Route path="movie/:id" element={<Movie />} />
                <Route path="booking" element={<Booking />} />
                <Route path="profile" element={<Profile />} />
                <Route path="exclusive" element={<Exclusive />} />
              </Route>
              <Route path="auth" element={<Auth />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </VoiceProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
