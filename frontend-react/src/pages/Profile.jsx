import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDel } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getPosterOverride } from '../posterOverrides';
import { getDisplayTitleForString } from '../titleOverrides';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function Profile() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, onAuthChange } = useAuth();
  const { show: showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [lists, setLists] = useState([]);
  const [listItemsById, setListItemsById] = useState({});
  const [tab, setTab] = useState('tickets');
  const [displayName, setDisplayName] = useState('');
  const [ticketReceipt, setTicketReceipt] = useState(null);
  const [showTicketOverlay, setShowTicketOverlay] = useState(false);
  const ticketPdfRef = useRef(null);
  const profileTabsRef = useRef(null);
  const [profileIndicatorStyle, setProfileIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth?return=/profile');
      return;
    }
    apiGet('/profile', onAuthChange).then((p) => {
      setProfile(p);
      setDisplayName(p?.displayName || '');
    }).catch(() => setProfile(null));
    apiGet('/bookings/my', onAuthChange).then(setBookings).catch(() => setBookings([]));
    apiGet('/lists', onAuthChange).then((ls) => {
      setLists(ls);
      const want = ls.find((l) => l.type === 'WantToWatch' || l.name.toLowerCase().includes('хочу посмотреть'));
      if (want) {
        apiGet(`/lists/${want.id}/items`, onAuthChange)
          .then((items) => {
            setListItemsById((prev) => ({ ...prev, [want.id]: items }));
          })
          .catch(() => {});
      }
    }).catch(() => setLists([]));
  }, [isAuthenticated, navigate, onAuthChange]);

  useEffect(() => {
    const update = () => {
      if (!profileTabsRef.current) return;
      const el = profileTabsRef.current.querySelector(`.tab[data-tab="${tab}"]`);
      if (!el) return;
      const parentRect = profileTabsRef.current.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setProfileIndicatorStyle({ left: rect.left - parentRect.left, width: rect.width });
    };
    update();
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(update);
    });
    return () => cancelAnimationFrame(id);
  }, [tab]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    apiPut('/profile', { displayName }, onAuthChange).then(() => showToast('Сохранено', 'success')).catch((e) => showToast(e.message, 'error'));
  };

  const handleCancelBooking = (id) => {
    apiPost(`/bookings/${id}/cancel`, null, onAuthChange).then(() => {
      setBookings((prev) => prev.filter((b) => b.id !== id));
      showToast('Бронь отменена', 'success');
    }).catch((e) => showToast(e.message, 'error'));
  };

  const openTicketReceipt = (b) => {
    const start = new Date(b.startTime);
    const seats = (b.seats || []).map((s) => `Ряд ${s.row}, место ${s.number}`);
    const totalSeats = (b.seats || []).reduce((sum, s) => sum + Number(s.price || 0), 0);
    const foodList = b.food || [];
    const totalFood = foodList.reduce((sum, f) => sum + Number(f.price || 0), 0);
    const total = typeof b.totalPrice === 'number' ? b.totalPrice : totalSeats + totalFood;

    setTicketReceipt({
      bookingId: b.id,
      movieTitle: b.movieTitle,
      date: start.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      total,
      totalSeats,
      totalFood,
      seats,
      food: foodList.map((f) => ({
        name: f.name,
        qty: f.quantity,
        price: f.price,
      })),
    });
    setShowTicketOverlay(true);
  };

  const downloadTicketPdf = async () => {
    if (!ticketPdfRef.current || !ticketReceipt) return;
    try {
      const canvas = await html2canvas(ticketPdfRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = Math.min(pageW / imgW, pageH / imgH) * 0.95;
      const w = imgW * ratio;
      const h = imgH * ratio;
      pdf.addImage(imgData, 'PNG', (pageW - w) / 2, (pageH - h) / 2, w, h);
      pdf.save(`chek-ember-cinema-${ticketReceipt.bookingId}.pdf`);
      showToast('Чек сохранён в PDF', 'success');
    } catch {
      showToast('Не удалось создать PDF', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated) return null;

  const initials = user?.displayName?.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase() || '?';

  return (
    <div className="container">
      <div className="glass-card profile-header">
        <div className="profile-avatar-lg">{initials}</div>
        <div className="profile-info">
          <h2>{profile?.displayName || user?.displayName}</h2>
          <p>{profile?.email || user?.email}</p>
        </div>
      </div>
      <div className="tabs-bar-wrap" ref={profileTabsRef}>
        <div className="tabs">
          {['tickets', 'lists', 'settings'].map((t) => (
            <button key={t} type="button" className={`tab ${tab === t ? 'active' : ''}`} data-tab={t} onClick={() => setTab(t)}>
              {t === 'tickets' && 'Мои билеты'}
              {t === 'lists' && 'Хочу посмотреть'}
              {t === 'settings' && 'Настройки'}
            </button>
          ))}
        </div>
        <div className="home-tabs-indicator" style={profileIndicatorStyle} />
      </div>
      {tab === 'tickets' && (
        <div>
          {bookings.length === 0 ? <p>Нет бронирований</p> : bookings.map((b) => (
            <div key={b.id} className="glass-card booking-card">
              <div>
                <strong>{getDisplayTitleForString(b.movieTitle)}</strong>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  {new Date(b.startTime).toLocaleString('ru')} · {b.hallName}
                </p>
                <span className={`status status-${b.status.toLowerCase()}`}>{b.status === 'Paid' ? 'Оплачено' : b.status === 'Pending' ? 'Ожидает оплаты' : 'Отменено'}</span>
              </div>
              <div>
                <span style={{ marginRight: 12 }}>{b.totalPrice} BYN</span>
                {b.status === 'Paid' && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginRight: 8 }}
                    onClick={() => openTicketReceipt(b)}
                  >
                    Открыть чек
                  </button>
                )}
                {b.status === 'Pending' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleCancelBooking(b.id)}>Отменить</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'lists' && (
        <div>
          {lists.map((list) => {
            const items = listItemsById[list.id] || [];
            const isWant = list.type === 'WantToWatch' || list.name.toLowerCase().includes('хочу посмотреть');
            return (
              <div key={list.id} className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <strong>{list.name}</strong>
                    <span style={{ color: 'var(--color-text-secondary)', marginLeft: 8 }}>({list.itemCount})</span>
                  </div>
                </div>
                {isWant && items.length > 0 && (
                  <div className="movies-row">
                    {items.map((it) => (
                      <Link
                        key={it.id}
                        to={`/movie/${it.movieId}`}
                        className="movie-card"
                      >
                        <div className="movie-poster-wrap">
                          <img
                            className="movie-poster"
                            src={getPosterOverride({ title: it.movieTitle }) || it.posterUrl || 'https://picsum.photos/seed/list/400/600'}
                            alt={getDisplayTitleForString(it.movieTitle)}
                            loading="lazy"
                          />
                        </div>
                        <div className="movie-info-wrap">
                          <h3 className="movie-title">{getDisplayTitleForString(it.movieTitle)}</h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {tab === 'settings' && (
        <form onSubmit={handleSaveProfile} className="glass-card" style={{ maxWidth: 400, padding: 24 }}>
          <div className="form-group">
            <label>Имя</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary">Сохранить</button>
          <button type="button" className="btn btn-ghost" style={{ marginLeft: 12 }} onClick={handleLogout}>Выйти</button>
        </form>
      )}
      {showTicketOverlay && ticketReceipt && (
        <div className="receipt-backdrop">
          <header className="receipt-screen-header">
            <Link to="/" className="receipt-logo">Ember<span style={{ color: 'var(--color-primary)' }}>.</span></Link>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowTicketOverlay(false)}
            >
              Закрыть
            </button>
          </header>
          <div ref={ticketPdfRef} className="receipt-pdf-source" aria-hidden="true">
            <h2 className="receipt-pdf-title">Чек — Ember Cinema</h2>
            {ticketReceipt.movieTitle && (
              <p className="receipt-pdf-movie">{getDisplayTitleForString(ticketReceipt.movieTitle)}</p>
            )}
            <div className="receipt-pdf-meta">
              <div><span>Дата</span><strong>{ticketReceipt.date}</strong></div>
              <div><span>Время сеанса</span><strong>{ticketReceipt.time}</strong></div>
              <div><span>Бронирование</span><strong>#{ticketReceipt.bookingId}</strong></div>
            </div>
            <hr className="receipt-pdf-hr" />
            <div className="receipt-pdf-section">
              <p className="receipt-pdf-section-title">Билеты</p>
              {ticketReceipt.seats.map((s) => (
                <div key={s} className="receipt-pdf-row">
                  <span>{s}</span>
                  <span className="receipt-pdf-value">
                    {(ticketReceipt.totalSeats / ticketReceipt.seats.length).toFixed(2)} BYN
                  </span>
                </div>
              ))}
              <div className="receipt-pdf-row subtotal">
                <span>Сумма за билеты</span>
                <span className="receipt-pdf-value">{ticketReceipt.totalSeats.toFixed(2)} BYN</span>
              </div>
            </div>
            {ticketReceipt.food.length > 0 && (
              <>
                <hr className="receipt-pdf-hr" />
                <div className="receipt-pdf-section">
                  <p className="receipt-pdf-section-title">Еда и напитки</p>
                  {ticketReceipt.food.map((f) => (
                    <div key={f.name} className="receipt-pdf-row">
                      <span>{f.name} × {f.qty}</span>
                      <span className="receipt-pdf-value">{f.price.toFixed(2)} BYN</span>
                    </div>
                  ))}
                  <div className="receipt-pdf-row subtotal">
                    <span>Сумма за еду</span>
                    <span className="receipt-pdf-value">{ticketReceipt.totalFood.toFixed(2)} BYN</span>
                  </div>
                </div>
              </>
            )}
            <hr className="receipt-pdf-hr" />
            <div className="receipt-pdf-total-row">
              <span>ИТОГО</span>
              <span className="receipt-pdf-total">{ticketReceipt.total.toFixed(2)} BYN</span>
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
              <h2 className="receipt-title">Чек — Ember Cinema</h2>
              <div className="receipt-meta">
                <div>
                  <span>Дата</span>
                  <strong>{ticketReceipt.date}</strong>
                </div>
                <div>
                  <span>Время сеанса</span>
                  <strong>{ticketReceipt.time}</strong>
                </div>
                <div>
                  <span>Бронирование</span>
                  <strong>#{ticketReceipt.bookingId}</strong>
                </div>
              </div>
              {ticketReceipt.movieTitle && (
                <p className="receipt-movie">{getDisplayTitleForString(ticketReceipt.movieTitle)}</p>
              )}
              <hr className="receipt-hr" />
              <div className="receipt-section">
                <p className="receipt-section-title">Билеты</p>
                {ticketReceipt.seats.map((s) => (
                  <div key={s} className="receipt-row">
                    <span>{s}</span>
                    <span className="receipt-value">
                      {(ticketReceipt.totalSeats / ticketReceipt.seats.length).toFixed(2)} BYN
                    </span>
                  </div>
                ))}
                <div className="receipt-row subtotal">
                  <span>Сумма за билеты</span>
                  <span className="receipt-value">{ticketReceipt.totalSeats.toFixed(2)} BYN</span>
                </div>
              </div>
              {ticketReceipt.food.length > 0 && (
                <>
                  <hr className="receipt-hr" />
                  <div className="receipt-section">
                    <p className="receipt-section-title">Еда и напитки</p>
                    {ticketReceipt.food.map((f) => (
                      <div key={f.name} className="receipt-row">
                        <span>{f.name} × {f.qty}</span>
                        <span className="receipt-value">{f.price.toFixed(2)} BYN</span>
                      </div>
                    ))}
                    <div className="receipt-row subtotal">
                      <span>Сумма за еду</span>
                      <span className="receipt-value">{ticketReceipt.totalFood.toFixed(2)} BYN</span>
                    </div>
                  </div>
                </>
              )}
              <hr className="receipt-hr" />
              <div className="receipt-total-row">
                <span>ИТОГО</span>
                <span className="receipt-total">{ticketReceipt.total.toFixed(2)} BYN</span>
              </div>
              <div className="receipt-barcode" />
              <div className="receipt-footer">
                <p>Покажите этот чек при входе в зал.</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm receipt-pdf-btn"
                  onClick={downloadTicketPdf}
                >
                  Скачать PDF
                </button>
              </div>
            </section>
          </section>
        </div>
      )}
    </div>
  );
}
