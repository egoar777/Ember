import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import VoiceOverlay from './VoiceOverlay';
import ScrollToTop from './ScrollToTop';

export default function Layout() {
  return (
    <>
      <div className="bg-glow" />
      <ScrollToTop />
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <Footer />
      <VoiceOverlay />
    </>
  );
}
