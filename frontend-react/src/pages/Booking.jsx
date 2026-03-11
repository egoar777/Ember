import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { apiGet, apiPost } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getFoodImageUrl } from '../foodImageOverrides';
import { getDisplayTitleForString } from '../titleOverrides';

export default function Booking() {
  const [searchParams] = useSearchParams();
  const screeningIdParam = searchParams.get('screeningId');
  const movieIdParam = searchParams.get('movieId');
  const navigate = useNavigate();
  const { user, isAuthenticated, onAuthChange } = useAuth();
  const { show: showToast } = useToast();

  const [screeningId, setScreeningId] = useState(screeningIdParam ? parseInt(screeningIdParam, 10) : null);
  const [layout, setLayout] = useState(null);
  const [foodMenu, setFoodMenu] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState(new Map());
  const [foodQty, setFoodQty] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [promoCode, setPromoCode] = useState('');
  // GOAT. Мечтай по-крупному имеет id 3 в сидере; только для него подчёркиваем детские ряды
  const isGoatMovie = movieIdParam && Number(movieIdParam) === 3;
  const receiptCardRef = useRef(null);
  const receiptPdfRef = useRef(null);

  const cardStorageKey = user ? `ember_card_${user.id}` : null;

  useEffect(() => {
    if (movieIdParam && !screeningIdParam) {
      apiGet(`/movies/${movieIdParam}/screenings`, onAuthChange).then((list) => {
        if (list?.[0]) setScreeningId(list[0].id);
      });
    }
  }, [movieIdParam, screeningIdParam, searchParams, onAuthChange]);

  useEffect(() => {
    if (!cardStorageKey) return;
    try {
      const raw = localStorage.getItem(cardStorageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.cardNumber) setCardNumber(data.cardNumber);
      if (data.cardName) setCardName(data.cardName);
      if (data.cardExpiry) setCardExpiry(data.cardExpiry);
      // CVV всегда просим ввести заново из соображений безопасности
    } catch {
      // игнорируем ошибки чтения
    }
  }, [cardStorageKey]);

  useEffect(() => {
    if (!screeningId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiGet(`/screenings/${screeningId}/seats`, onAuthChange).then(setLayout).catch(() => setLayout(null)).finally(() => setLoading(false));
    apiGet('/food', onAuthChange).then(setFoodMenu).catch(() => setFoodMenu([]));
  }, [screeningId, onAuthChange]);

  const toggleSeat = (seat) => {
    if (seat.status !== 'Available') return;
    setSelectedSeats((prev) => {
      const next = new Map(prev);
      if (next.has(seat.seatTemplateId)) next.delete(seat.seatTemplateId);
      else next.set(seat.seatTemplateId, seat);
      return next;
    });
  };

  const seatsByRow = layout?.seats?.reduce((acc, s) => {
    (acc[s.row] = acc[s.row] || []).push(s);
    return acc;
  }, {}) || {};
  const totalSeats = selectedSeats.size ? [...selectedSeats.values()].reduce((sum, s) => sum + Number(s.price), 0) : 0;
  const totalFood = foodMenu.reduce((sum, f) => sum + (f.price * (foodQty[f.id] || 0)), 0);
  const promoNormalized = promoCode.trim().toUpperCase();
  const promoDiscountRate = promoNormalized === 'MCBBY' ? 0.1 : 0;
  const discount = Math.round((totalSeats + totalFood) * promoDiscountRate * 100) / 100;
  const total = Math.max(0, totalSeats + totalFood - discount);

  const handlePay = async () => {
    if (selectedSeats.size === 0) {
      showToast('Выберите хотя бы одно место', 'error');
      return;
    }
    if (!cardNumber.trim() || !cardName.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      showToast('Заполните данные карты', 'error');
      return;
    }
    const seatsArray = [...selectedSeats.values()];
    const seatTotal = seatsArray.reduce((sum, s) => sum + Number(s.price), 0);
    const foodItems = foodMenu.filter((f) => foodQty[f.id] > 0);
    const foodTotal = foodItems.reduce((sum, f) => sum + (f.price * (foodQty[f.id] || 0)), 0);
    const promoNormalizedLocal = promoCode.trim().toUpperCase();
    const promoDiscountRateLocal = promoNormalizedLocal === 'MCBBY' ? 0.1 : 0;
    const discountLocal = Math.round((seatTotal + foodTotal) * promoDiscountRateLocal * 100) / 100;
    const totalLocal = Math.max(0, seatTotal + foodTotal - discountLocal);

    setSubmitting(true);
    try {
      const createdBooking = await apiPost('/bookings', {
        screeningId,
        seatTemplateIds: [...selectedSeats.keys()],
        foodItems: foodItems.map((f) => ({ foodItemId: f.id, quantity: foodQty[f.id] })),
      }, onAuthChange);
      const confirmed = await apiPost(`/bookings/${createdBooking.id}/confirm-payment`, null, onAuthChange);
      const start = confirmed && confirmed.startTime ? new Date(confirmed.startTime) : new Date();
      setReceipt({
        bookingId: confirmed.id,
        movieTitle: confirmed.movieTitle,
        date: start.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        total: totalLocal,
        totalSeats: seatTotal,
        totalFood: foodTotal,
        seats: seatsArray.map((s) => `Ряд ${s.row}, место ${s.number}`),
        food: foodItems.map((f) => ({
          name: f.name,
          qty: foodQty[f.id],
          price: f.price * foodQty[f.id],
        })),
      });
      if (cardStorageKey) {
        try {
          localStorage.setItem(cardStorageKey, JSON.stringify({
            cardNumber,
            cardName,
            cardExpiry,
          }));
        } catch {
          // игнорируем ошибки сохранения
        }
      }
      setSuccess(true);
    } catch (e) {
      showToast('Ошибка: ' + e.message, 'error');
      // После ошибки обновляем схему зала и снимаем выделение,
      // чтобы пользователь видел актуально занятые места.
      try {
        const updatedLayout = await apiGet(`/screenings/${screeningId}/seats`, onAuthChange);
        setLayout(updatedLayout);
        setSelectedSeats(new Map());
      } catch {
        // игнорируем вторичную ошибку загрузки
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    await handlePay();
    // если оплата прошла успешно, success станет true и покажется чек
    if (!submitting) {
      setShowPaymentModal(false);
    }
  };

  const downloadReceiptPdf = async () => {
    if (!receiptPdfRef.current || !receipt) return;
    try {
      const canvas = await html2canvas(receiptPdfRef.current, {
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
      pdf.save(`chek-ember-cinema-${receipt.bookingId}.pdf`);
      showToast('Чек сохранён в PDF', 'success');
    } catch (e) {
      showToast('Не удалось создать PDF', 'error');
    }
  };

  // Блокируем скролл основной страницы, пока открыт экран чека
  useEffect(() => {
    if (success && receipt) {
      const prev = document.body.style.overflow;
      document.body.dataset.prevOverflow = prev;
      document.body.style.overflow = 'hidden';
    } else if (document.body.style.overflow === 'hidden') {
      document.body.style.overflow = document.body.dataset.prevOverflow || '';
    }
    return () => {
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = document.body.dataset.prevOverflow || '';
      }
    };
  }, [success, receipt]);

  if (success && receipt) {
    return (
      <div className="receipt-backdrop">
        <header className="receipt-screen-header">
          <Link to="/" className="receipt-logo">Ember<span style={{ color: 'var(--color-primary)' }}>.</span></Link>
          <Link to="/profile" className="btn btn-primary btn-sm">Личный кабинет</Link>
        </header>
        {/* Скрытый блок только для PDF: от «Чек — Ember Cinema» до штрихкода, без кнопок */}
        <div ref={receiptPdfRef} className="receipt-pdf-source" aria-hidden="true">
          <h2 className="receipt-pdf-title">Чек — Ember Cinema</h2>
          {receipt.movieTitle && (
            <p className="receipt-pdf-movie">{getDisplayTitleForString(receipt.movieTitle)}</p>
          )}
          <div className="receipt-pdf-meta">
            <div><span>Дата</span><strong>{receipt.date}</strong></div>
            <div><span>Время сеанса</span><strong>{receipt.time}</strong></div>
            <div><span>Бронирование</span><strong>#{receipt.bookingId}</strong></div>
          </div>
          <hr className="receipt-pdf-hr" />
          <div className="receipt-pdf-section">
            <p className="receipt-pdf-section-title">Билеты</p>
            {receipt.seats.map((s) => (
              <div key={s} className="receipt-pdf-row">
                <span>{s}</span>
                <span className="receipt-pdf-value">{(receipt.totalSeats / receipt.seats.length).toFixed(2)} BYN</span>
              </div>
            ))}
            <div className="receipt-pdf-row subtotal">
              <span>Сумма за билеты</span>
              <span className="receipt-pdf-value">{receipt.totalSeats.toFixed(2)} BYN</span>
            </div>
          </div>
          {receipt.food.length > 0 && (
            <>
              <hr className="receipt-pdf-hr" />
              <div className="receipt-pdf-section">
                <p className="receipt-pdf-section-title">Еда и напитки</p>
                {receipt.food.map((f) => (
                  <div key={f.name} className="receipt-pdf-row">
                    <span>{f.name} × {f.qty}</span>
                    <span className="receipt-pdf-value">{f.price.toFixed(2)} BYN</span>
                  </div>
                ))}
                <div className="receipt-pdf-row subtotal">
                  <span>Сумма за еду</span>
                  <span className="receipt-pdf-value">{receipt.totalFood.toFixed(2)} BYN</span>
                </div>
              </div>
            </>
          )}
          <hr className="receipt-pdf-hr" />
          <div className="receipt-pdf-total-row">
            <span>ИТОГО</span>
            <span className="receipt-pdf-total">{receipt.total.toFixed(2)} BYN</span>
          </div>
          <div className="receipt-pdf-barcode">
            {(() => {
              const seed = receipt.bookingId;
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
          <div className="receipt-printer-mask" />
          <section className="receipt-slot">
            <div className="receipt-printer-text">
              <span className="receipt-printer-line-primary">спасибо за оплату</span>
              <span className="receipt-printer-line-secondary">приятного просмотра</span>
            </div>
            <span className="receipt-printer-light" />
          </section>
          <section ref={receiptCardRef} className="receipt-card receipt-slide">
            <h2 className="receipt-title">Чек — Ember Cinema</h2>

            <div className="receipt-meta">
              <div>
                <span>Дата</span>
                <strong>{receipt.date}</strong>
              </div>
              <div>
                <span>Время сеанса</span>
                <strong>{receipt.time}</strong>
              </div>
              <div>
                <span>Бронирование</span>
                <strong>#{receipt.bookingId}</strong>
              </div>
            </div>

            {receipt.movieTitle && (
              <p className="receipt-movie">{getDisplayTitleForString(receipt.movieTitle)}</p>
            )}

            <hr className="receipt-hr" />

            <div className="receipt-section">
              <p className="receipt-section-title">Билеты</p>
              {receipt.seats.map((s) => (
                <div key={s} className="receipt-row">
                  <span>{s}</span>
                  <span className="receipt-value">
                    {(receipt.totalSeats / receipt.seats.length).toFixed(2)} BYN
                  </span>
                </div>
              ))}
              <div className="receipt-row subtotal">
                <span>Сумма за билеты</span>
                <span className="receipt-value">{receipt.totalSeats.toFixed(2)} BYN</span>
              </div>
            </div>

            {receipt.food.length > 0 && (
              <>
                <hr className="receipt-hr" />
                <div className="receipt-section">
                  <p className="receipt-section-title">Еда и напитки</p>
                  {receipt.food.map((f) => (
                    <div key={f.name} className="receipt-row">
                      <span>{f.name} × {f.qty}</span>
                      <span className="receipt-value">{f.price.toFixed(2)} BYN</span>
                    </div>
                  ))}
                  <div className="receipt-row subtotal">
                    <span>Сумма за еду</span>
                    <span className="receipt-value">{receipt.totalFood.toFixed(2)} BYN</span>
                  </div>
                </div>
              </>
            )}

            <hr className="receipt-hr" />

            <div className="receipt-total-row">
              <span>ИТОГО</span>
              <span className="receipt-total">{receipt.total.toFixed(2)} BYN</span>
            </div>

            <div className="receipt-barcode" />

            <div className="receipt-footer">
              <p>Покажите этот чек при входе в зал.</p>
              <button type="button" className="btn btn-secondary btn-sm receipt-pdf-btn" onClick={downloadReceiptPdf}>
                Скачать PDF
              </button>
              <Link to="/profile" className="btn btn-primary btn-block">В мои билеты</Link>
            </div>
          </section>
        </section>
      </div>
    );
  }
  if (!screeningId && !movieIdParam) {
    return (
      <div className="container">
        <p>Выберите сеанс на странице фильма.</p>
        <Link to="/catalog" className="btn btn-primary">В каталог</Link>
      </div>
    );
  }
  if (loading || !layout) return <div className="container"><p>Загрузка...</p></div>;

  return (
    <div className="container">
      <h1 style={{ marginBottom: 24 }}>Бронирование</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
        <div>
          <div className={`seat-map ${isGoatMovie ? 'seat-map-goat' : ''}`}>
            <div className="screen-indicator" />
            {Object.entries(seatsByRow).sort((a, b) => a[0] - b[0]).map(([row, seats]) => {
              const rowNumber = Number(row);
              const isChildRow = isGoatMovie && rowNumber > 0 && rowNumber <= 2;
              return (
              <div key={row} className={`seat-row ${isChildRow ? 'seat-row-child' : ''}`}>
                <span className="seat-row-label">{row}</span>
                {seats.sort((a, b) => a.number - b.number).map((s) => (
                  <button
                    key={s.seatTemplateId}
                    type="button"
                    className={`seat ${s.status === 'Sold' || s.status === 'Reserved' ? 'seat-sold' : ''} ${s.type === 'VIP' ? 'seat-vip' : ''} ${s.type === 'Child' ? 'seat-child' : ''} ${selectedSeats.has(s.seatTemplateId) ? 'seat-selected' : ''}`}
                    onClick={() => toggleSeat(s)}
                    disabled={s.status === 'Sold' || s.status === 'Reserved'}
                  >
                    {s.number}
                  </button>
                ))}
              </div>
            );})}
            <div className="seat-legend">
              <span className="seat-legend-item"><span className="seat-legend-box" style={{ background: 'var(--color-surface)' }} /> Свободно</span>
              <span className="seat-legend-item"><span className="seat-legend-box" style={{ background: 'var(--color-primary)' }} /> Выбрано</span>
              <span className="seat-legend-item"><span className="seat-legend-box seat-legend-sold" /> Занято</span>
              <span className="seat-legend-item"><span className="seat-legend-box seat-legend-vip" /> VIP</span>
              <span className="seat-legend-item"><span className="seat-legend-box seat-legend-child" /> Детская зона</span>
            </div>
          </div>
          <h3 style={{ marginTop: 32, marginBottom: 16 }}>Еда и напитки</h3>
          <div className="food-grid">
            {foodMenu.map((f) => (
              <div key={f.id} className="glass-card food-card">
                <img
                  src={getFoodImageUrl(f)}
                  alt={f.name}
                  referrerPolicy="no-referrer"
                  className={f.name?.toLowerCase().includes('кока-кола') ? 'food-image-cola' : ''}
                />
                <h4>{f.name}</h4>
                <div className="price">{f.price} BYN</div>
                <div className="qty-control">
                  <button type="button" className="qty-btn" onClick={() => setFoodQty((q) => ({ ...q, [f.id]: Math.max(0, (q[f.id] || 0) - 1) }))}>−</button>
                  <span>{foodQty[f.id] || 0}</span>
                  <button type="button" className="qty-btn" onClick={() => setFoodQty((q) => ({ ...q, [f.id]: (q[f.id] || 0) + 1 }))}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card order-summary">
          <h3>Ваш заказ</h3>
          {selectedSeats.size > 0 && (
            <div className="order-line">
              <span>Места ({selectedSeats.size})</span>
              <span>{totalSeats} BYN</span>
            </div>
          )}
          {foodMenu.filter((f) => foodQty[f.id] > 0).map((f) => (
            <div key={f.id} className="order-line">
              <span>{f.name} × {foodQty[f.id]}</span>
              <span>{f.price * foodQty[f.id]} BYN</span>
            </div>
          ))}
          <div className="order-total">
            <span>Итого</span>
            <span>{total} BYN</span>
          </div>
          {discount > 0 && (
            <div className="order-line" style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <span>Скидка по промокоду {promoNormalized}</span>
              <span>−{discount} BYN</span>
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary btn-lg btn-block"
            style={{ marginTop: 16 }}
            disabled={submitting || selectedSeats.size === 0}
            onClick={() => setShowPaymentModal(true)}
          >
            Оплатить
          </button>
        </div>
      </div>
      {showPaymentModal && (
        <div className="modal-backdrop active">
          <div className="modal">
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>Оплата банковской картой</h2>
            <p style={{ marginTop: 0, marginBottom: 20, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Введите данные карты и при желании промокод. Оплата безопасно моделируется внутри приложения.
            </p>
            <form onSubmit={handleSubmitPayment} className="payment-form">
              <label className="payment-field">
                <span>Номер карты</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                />
              </label>
              <div className="payment-row">
                <label className="payment-field">
                  <span>Срок действия</span>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    required
                  />
                </label>
                <label className="payment-field">
                  <span>CVC</span>
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="payment-field">
                <span>Держатель карты</span>
                <input
                  type="text"
                  placeholder="ИМЯ ФАМИЛИЯ"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                />
              </label>
              <label className="payment-field">
                <span>Промокод (необязательно)</span>
                <input
                  type="text"
                  placeholder="Введите промокод"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
              </label>
              <div className="payment-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={submitting}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  Оплатить {total} BYN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
