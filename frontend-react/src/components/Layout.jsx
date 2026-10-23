import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import VoiceOverlay from './VoiceOverlay';
import ScrollToTop from './ScrollToTop';

export default function Layout() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const isMovieDetail = /^\/movie\/\d+$/.test(pathname);
  const isBooking = pathname.startsWith('/booking');

  return (
    <>
    <div className="bg-glow" />
    <ScrollToTop />
    <Header />
      <main
        className={`main${isHome ? ' main--home' : ''}${isMovieDetail ? ' main--movie-detail' : ''}${isBooking ? ' main--booking' : ''}`}
      >
        <Outlet />
      </main>
      <Footer />
      <VoiceOverlay />
    </>
  );
}
