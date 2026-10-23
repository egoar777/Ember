import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useProfileCabinet } from '../../context/useProfileCabinet';
import { useI18n } from '../../context/useI18n';
import { resolveApiErrorFromException } from '../../utils/resolveApiError';
import { useToast } from '../../context/useToast';
import { dateLocaleForUi } from '../../i18n/localeUi';
import { getDisplayTitleForString } from '../../titleOverrides';
import CurrencySymbol from '../../components/CurrencySymbol';
import MoviePoster from '../../components/MoviePoster';
import ConfirmModal from '../../components/ConfirmModal';

export default function ProfileTickets() {
  const { t, locale } = useI18n();
  const { show: showToast } = useToast();
  const dateLocale = dateLocaleForUi(locale);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const {
    handleCancelBooking,
    handlePruneBookings,
    openTicketReceipt,
    downloadTicketPdf,
    ticketReceipt,
    showTicketOverlay,
    setShowTicketOverlay,
    ticketPdfRef,
    bookings,
  } = useProfileCabinet();

  useEffect(() => {
    if (!showTicketOverlay) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowTicketOverlay(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTicketOverlay, setShowTicketOverlay]);

  const handleConfirmClear = () => {
    if (bookings.length <= 3) {
      showToast(t('tickets.clearListNone'), 'info');
      setShowClearConfirm(false);
      return;
    }
    setClearing(true);
    handlePruneBookings(3)
      .then((removed) => {
        setShowClearConfirm(false);
        if (removed > 0) showToast(t('tickets.clearListDone'), 'success');
        else showToast(t('tickets.clearListNone'), 'info');
      })
      .catch((err) => showToast(resolveApiErrorFromException(err, t), 'error'))
      .finally(() => setClearing(false));
  };

  return (
    <>
      {bookings.length > 3 && (
        <div className="profile-tickets-toolbar">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowClearConfirm(true)}
          >
            {t('tickets.clearList')}
          </button>
        </div>
      )}

      <div className="profile-tab-panel profile-tickets-panel">
        {bookings.length === 0 ? (
          <div className="glass-card profile-empty-state">
            <p>{t('tickets.none')}</p>
          </div>
        ) : (
          bookings.map((b) => {
            const movieTitle = getDisplayTitleForString(b.movieTitle);
            const posterMovie = {
              id: b.movieId,
              title: b.movieTitle,
              posterUrl: b.posterUrl,
            };

            return (
              <div key={b.id} className="glass-card booking-card profile-booking-card">
                <div className="profile-booking-main">
                  {b.movieId > 0 ? (
                    <Link to={`/movie/${b.movieId}`} className="profile-booking-poster-link">
                      <MoviePoster movie={posterMovie} className="profile-booking-poster" alt={movieTitle} />
                    </Link>
                  ) : (
                    <MoviePoster movie={posterMovie} className="profile-booking-poster" alt={movieTitle} />
                  )}
                  <div className="profile-booking-copy">
                    {b.movieId > 0 ? (
                      <Link to={`/movie/${b.movieId}`} className="profile-booking-title-link">
                        <strong>{movieTitle}</strong>
                      </Link>
                    ) : (
                      <strong>{movieTitle}</strong>
                    )}
                    <p className="profile-booking-meta">
                      {new Date(b.startTime).toLocaleString(dateLocale)} · {b.hallName}
                    </p>
                    <span className={`status status-${b.status.toLowerCase()}`}>
                      {b.status === 'Paid'
                        ? t('tickets.paid')
                        : b.status === 'Pending'
                          ? t('tickets.pending')
                          : t('tickets.cancelled')}
                    </span>
                  </div>
                </div>
                <div className="profile-booking-actions">
                  <span className="profile-booking-price">
                    {b.totalPrice} <CurrencySymbol />
                  </span>
                  {b.status === 'Paid' && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openTicketReceipt(b)}>
                      {t('tickets.openReceipt')}
                    </button>
                  )}
                  {b.status === 'Pending' && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleCancelBooking(b.id)}>
                      {t('tickets.cancel')}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        open={showClearConfirm}
        title={t('tickets.clearListTitle')}
        message={t('tickets.clearListBody')}
        confirmLabel={t('tickets.clearListConfirm')}
        cancelLabel={t('profile.cancel')}
        onConfirm={handleConfirmClear}
        onCancel={() => !clearing && setShowClearConfirm(false)}
      />

      {showTicketOverlay &&
        ticketReceipt &&
        createPortal(
          <div
            className="receipt-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowTicketOverlay(false);
            }}
          >
          <header className="receipt-screen-header">
            <Link to="/" className="receipt-logo">
              Ember<span style={{ color: 'var(--color-primary)' }}>.</span>
            </Link>
            <button
              type="button"
              className="receipt-close-btn"
              onClick={() => setShowTicketOverlay(false)}
              aria-label={t('receipt.closeAria')}
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <div ref={ticketPdfRef} className="receipt-pdf-source" aria-hidden="true">
            <h2 className="receipt-pdf-title">{t('receipt.title')}</h2>
            {ticketReceipt.movieTitle && (
              <p className="receipt-pdf-movie">{getDisplayTitleForString(ticketReceipt.movieTitle)}</p>
            )}
            <div className="receipt-pdf-meta">
              <div>
                <span>{t('receipt.date')}</span>
                <strong>{ticketReceipt.date}</strong>
              </div>
              <div>
                <span>{t('receipt.sessionTime')}</span>
                <strong>{ticketReceipt.time}</strong>
              </div>
              <div>
                <span>{t('receipt.booking')}</span>
                <strong>#{ticketReceipt.bookingId}</strong>
              </div>
            </div>
            <hr className="receipt-pdf-hr" />
            <div className="receipt-pdf-section">
              <p className="receipt-pdf-section-title">{t('receipt.tickets')}</p>
              {ticketReceipt.seats.map((s) => (
                <div key={s} className="receipt-pdf-row">
                  <span>{s}</span>
                  <span className="receipt-pdf-value">
                    {(ticketReceipt.totalSeats / ticketReceipt.seats.length).toFixed(2)} <CurrencySymbol />
                  </span>
                </div>
              ))}
              <div className="receipt-pdf-row subtotal">
                <span>{t('receipt.subtotalTickets')}</span>
                <span className="receipt-pdf-value">{ticketReceipt.totalSeats.toFixed(2)} <CurrencySymbol /></span>
              </div>
            </div>
            {ticketReceipt.food.length > 0 && (
              <>
                <hr className="receipt-pdf-hr" />
                <div className="receipt-pdf-section">
                  <p className="receipt-pdf-section-title">{t('receipt.food')}</p>
                  {ticketReceipt.food.map((f) => (
                    <div key={f.name} className="receipt-pdf-row">
                      <span>
                        {f.name} × {f.qty}
                      </span>
                      <span className="receipt-pdf-value">{f.price.toFixed(2)} <CurrencySymbol /></span>
                    </div>
                  ))}
                  <div className="receipt-pdf-row subtotal">
                    <span>{t('receipt.subtotalFood')}</span>
                    <span className="receipt-pdf-value">{ticketReceipt.totalFood.toFixed(2)} <CurrencySymbol /></span>
                  </div>
                </div>
              </>
            )}
            <hr className="receipt-pdf-hr" />
            <div className="receipt-pdf-total-row">
              <span>{t('receipt.total')}</span>
              <span className="receipt-pdf-total">{ticketReceipt.total.toFixed(2)} <CurrencySymbol /></span>
            </div>
            <div className="receipt-pdf-barcode">
              {(() => {
                const seed = ticketReceipt.bookingId;
                const bars = [];
                for (let i = 0; i < 48; i++) {
                  const w = (seed + i * 7) % 3 === 0 ? 3 : (seed + i) % 2 === 0 ? 2 : 4;
                  bars.push(<span key={i} className="receipt-pdf-barcode-bar" style={{ width: w }} />);
                }
                return bars;
              })()}
            </div>
          </div>

          <section className="receipt-container">
            <section className="receipt-card">
              <h2 className="receipt-title">{t('receipt.title')}</h2>
              <div className="receipt-meta">
                <div>
                  <span>{t('receipt.date')}</span>
                  <strong>{ticketReceipt.date}</strong>
                </div>
                <div>
                  <span>{t('receipt.sessionTime')}</span>
                  <strong>{ticketReceipt.time}</strong>
                </div>
                <div>
                  <span>{t('receipt.booking')}</span>
                  <strong>#{ticketReceipt.bookingId}</strong>
                </div>
              </div>
              {ticketReceipt.movieTitle && (
                <p className="receipt-movie">{getDisplayTitleForString(ticketReceipt.movieTitle)}</p>
              )}
              <hr className="receipt-hr" />
              <div className="receipt-section">
                <p className="receipt-section-title">{t('receipt.tickets')}</p>
                {ticketReceipt.seats.map((s) => (
                  <div key={s} className="receipt-row">
                    <span>{s}</span>
                    <span className="receipt-value">
                      {(ticketReceipt.totalSeats / ticketReceipt.seats.length).toFixed(2)} <CurrencySymbol />
                    </span>
                  </div>
                ))}
                <div className="receipt-row subtotal">
                  <span>{t('receipt.subtotalTickets')}</span>
                  <span className="receipt-value">{ticketReceipt.totalSeats.toFixed(2)} <CurrencySymbol /></span>
                </div>
              </div>
              {ticketReceipt.food.length > 0 && (
                <>
                  <hr className="receipt-hr" />
                  <div className="receipt-section">
                    <p className="receipt-section-title">{t('receipt.food')}</p>
                    {ticketReceipt.food.map((f) => (
                      <div key={f.name} className="receipt-row">
                        <span>
                          {f.name} × {f.qty}
                        </span>
                        <span className="receipt-value">{f.price.toFixed(2)} <CurrencySymbol /></span>
                      </div>
                    ))}
                    <div className="receipt-row subtotal">
                      <span>{t('receipt.subtotalFood')}</span>
                      <span className="receipt-value">{ticketReceipt.totalFood.toFixed(2)} <CurrencySymbol /></span>
                    </div>
                  </div>
                </>
              )}
              <hr className="receipt-hr" />
              <div className="receipt-total-row">
                <span>{t('receipt.total')}</span>
                <span className="receipt-total">{ticketReceipt.total.toFixed(2)} <CurrencySymbol /></span>
              </div>
              <div className="receipt-barcode">
                {(() => {
                  const seed = ticketReceipt.bookingId;
                  const bars = [];
                  for (let i = 0; i < 48; i++) {
                    const w = (seed + i * 7) % 3 === 0 ? 3 : (seed + i) % 2 === 0 ? 2 : 4;
                    bars.push(<span key={i} className="receipt-pdf-barcode-bar" style={{ width: w }} />);
                  }
                  return bars;
                })()}
              </div>
              <div className="receipt-footer">
                <p>{t('receipt.footer')}</p>
                <button type="button" className="btn btn-secondary btn-sm receipt-pdf-btn" onClick={downloadTicketPdf}>
                  {t('receipt.downloadPdf')}
                </button>
              </div>
            </section>
          </section>
        </div>,
          document.body
        )}
    </>
  );
}
