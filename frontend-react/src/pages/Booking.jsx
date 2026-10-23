import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDel, getAuth, setAuth } from '../api/client';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { getDisplayTitleForString } from '../titleOverrides';
import { useI18n } from '../context/useI18n';
import { dateLocaleForUi } from '../i18n/localeUi';
import { formatDurationMinutes } from '../utils/formatDuration';
import { getSavedPaymentCards, getPrimaryPaymentCard, isValidCardHolderName, sanitizeCardHolderName, savePaymentCard, setPrimaryPaymentCard } from '../utils/paymentCards';
import CurrencySymbol from '../components/CurrencySymbol';
import LoadingState from '../components/LoadingState';
import MovieBackdrop from '../components/MovieBackdrop';
import AgeRestrictionModal from '../components/AgeRestrictionModal';
import { isAdultRestrictedMovie, parseMovieAge } from '../utils/movieAgeRating';
import { resolveApiErrorFromException } from '../utils/resolveApiError';
import { isAdminUser } from '../utils/isAdmin';
import { getFoodImageUrl, isColaFoodItem } from '../utils/foodImages';

function formatCardNumberInput(value) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiryInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function getSeatCapacity(seat) {
  const rawCapacity = Number(seat?.capacity ?? seat?.seatCapacity ?? seat?.places ?? seat?.persons ?? seat?.people);
  if (Number.isFinite(rawCapacity) && rawCapacity > 0) return rawCapacity;

  const type = String(seat?.type ?? seat?.seatType ?? seat?.name ?? '').toLowerCase();
  if (
    type.includes('double') ||
    type.includes('duo') ||
    type.includes('couple') ||
    type.includes('sofa') ||
    type.includes('love') ||
    type.includes('pair') ||
    type.includes('two') ||
    type.includes('2') ||
    type.includes('диван') ||
    type.includes('двух')
  ) {
    return 2;
  }
  return 1;
}

/** Первый/последний ряд и LoveSeat — на схеме парами (как в зале). */
function shouldRenderSeatPairs(rowNumber, maxRowNumber, seats) {
  if (rowNumber === 1 || rowNumber === maxRowNumber) return true;
  return seats.some((s) => {
    const type = String(s?.type ?? s?.seatType ?? '').toLowerCase();
    return type.includes('love') || getSeatCapacity(s) >= 2;
  });
}

function groupCartSeatsForDisplay(cartSeats, maxRowNumber) {
  if (!cartSeats?.length) return [];

  const byRow = cartSeats.reduce((acc, s) => {
    (acc[s.row] = acc[s.row] || []).push(s);
    return acc;
  }, {});

  const groups = [];
  Object.keys(byRow)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((rowNumber) => {
      const sorted = byRow[rowNumber].slice().sort((a, b) => a.number - b.number);
      const pairMode = shouldRenderSeatPairs(rowNumber, maxRowNumber, sorted);
      buildSeatDisplayGroups(sorted, pairMode).forEach((g) => {
        groups.push({
          ...g,
          price: Number(g.seats[0]?.price) || 0,
        });
      });
    });

  return groups;
}

function buildSeatDisplayGroups(sortedSeats, pairMode) {
  if (!pairMode) {
    return sortedSeats.map((s) => ({
      seats: [s],
      labelFrom: s.number,
      labelTo: s.number,
      capacity: 1,
    }));
  }
  const groups = [];
  for (let i = 0; i < sortedSeats.length; i += 2) {
    const a = sortedSeats[i];
    const b = sortedSeats[i + 1];
    if (b) {
      groups.push({ seats: [a, b], labelFrom: a.number, labelTo: b.number, capacity: 2 });
    } else {
      groups.push({ seats: [a], labelFrom: a.number, labelTo: a.number, capacity: 1 });
    }
  }
  return groups;
}

function isSeatBlockedOnMap(seat, cartSeatIds) {
  if (cartSeatIds.has(seat.seatTemplateId)) return false;
  const status = String(seat?.status ?? '');
  return status === 'Sold' || status === 'Reserved';
}

function formatSeatGroupMeta(t, row, labelFrom, labelTo, capacity) {
  const isPair = capacity >= 2 && labelTo > labelFrom;
  return {
    seatAria: isPair
      ? t('booking.seatAriaRange', { row, from: labelFrom, to: labelTo })
      : capacity >= 2
        ? t('booking.seatAriaDouble', { row, num: labelFrom })
        : t('booking.seatAria', { row, num: labelFrom }),
    seatDataLabel: isPair
      ? t('booking.seatDataLabelRange', { row, from: labelFrom, to: labelTo })
      : t('booking.seatDataLabel', { row, num: labelFrom }),
    seatNumberText: isPair ? `${labelFrom}–${labelTo}` : String(labelFrom),
  };
}

function formatLangBadge(language) {
  if (!language) return 'RU';
  const s = String(language).trim();
  if (s.length <= 4) return s.toUpperCase();
  const lower = s.toLowerCase();
  if (lower.includes('рус') || lower.includes('russ')) return 'RU';
  if (lower.includes('eng') || lower.includes('анг')) return 'EN';
  return s.slice(0, 2).toUpperCase();
}

const SEAT_TYPE_META = {
  single: { title: 'seatSingleTitle', sub: 'seatSingleSub', icon: 'seat-type-icon-single', factor: 1 },
  love: { title: 'seatLoveTitle', sub: 'seatLoveSub', icon: 'seat-type-icon-love', factor: 2 },
  vipSingle: { title: 'seatVipSingleTitle', sub: 'seatVipSingleSub', icon: 'seat-type-icon-single-vip', factor: 1.5 },
  vipSofa: { title: 'seatVipSofaTitle', sub: 'seatVipSofaSub', icon: 'seat-type-icon-sofa', factor: 2 },
};

const SEAT_TYPE_ORDER = ['single', 'love', 'vipSingle', 'vipSofa'];

function resolveSeatTypeKey(seat, rowNumber, maxRowNumber) {
  const type = String(seat?.type ?? seat?.seatType ?? '').toLowerCase();

  if (type.includes('loveseat') || type.includes('love')) return 'love';

  const isLastRow = rowNumber === maxRowNumber;
  const isFirstRow = rowNumber === 1;

  if (type.includes('vip')) {
    return isLastRow ? 'vipSofa' : 'vipSingle';
  }

  if (isLastRow) return 'vipSofa';
  if (isFirstRow || getSeatCapacity(seat) >= 2) return 'love';

  return 'single';
}

/** Минимальные цены по типам; всегда все 4 категории. */
function buildSeatTypeCatalog(seats, maxRowNumber) {
  if (!seats?.length) return [];

  const mins = {};

  for (const seat of seats) {
    const key = resolveSeatTypeKey(seat, seat.row, maxRowNumber);
    const price = Number(seat.price) || 0;
    if (price > 0 && (mins[key] == null || price < mins[key])) {
      mins[key] = price;
    }
  }

  const priced = seats.map((s) => Number(s.price)).filter((p) => p > 0);
  const standardPrices = seats
    .filter((s) => {
      const t = String(s.type ?? s.seatType ?? '').toLowerCase();
      return t.includes('standard');
    })
    .map((s) => Number(s.price))
    .filter((p) => p > 0);

  let baseUnit =
    (standardPrices.length ? Math.min(...standardPrices) : null) ??
    mins.single ??
    (priced.length ? Math.min(...priced) : null);

  if (baseUnit == null || baseUnit <= 0) {
    baseUnit = 18;
  }

  return SEAT_TYPE_ORDER.map((key) => ({
    key,
    price: mins[key] ?? baseUnit * (SEAT_TYPE_META[key]?.factor ?? 1),
  }));
}

/** API отдаёт UTC; без суффикса Z браузер может трактовать строку как локальное время и сбрасывать корзину. */
function parseLockedUntilMs(iso) {
  if (iso == null || iso === '') return null;
  const s = String(iso).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s) && !/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    return new Date(`${s}Z`).getTime();
  }
  return new Date(s).getTime();
}

export default function Booking() {
  const [searchParams] = useSearchParams();
  const screeningIdParam = searchParams.get('screeningId');
  const movieIdParam = searchParams.get('movieId');
  const navigate = useNavigate();
  const { user, isAuthenticated, onAuthChange } = useAuth();
  const isAdmin = isAdminUser(user);
  const { show: showToast } = useToast();
  const { t, locale: uiLocale } = useI18n();
  const dateLoc = dateLocaleForUi(uiLocale);

  const [screeningId, setScreeningId] = useState(screeningIdParam ? parseInt(screeningIdParam, 10) : null);
  const [resolvingScreening, setResolvingScreening] = useState(Boolean(movieIdParam && !screeningIdParam));
  const [layout, setLayout] = useState(null);
  const [cartId, setCartId] = useState(null);
  const [cart, setCart] = useState(null);
  const cartOpRef = useRef(Promise.resolve());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savedCards, setSavedCards] = useState([]);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState('');
  const [paymentMode, setPaymentMode] = useState('new');
  const [loyalty, setLoyalty] = useState(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [bonusPointsToUse, setBonusPointsToUse] = useState('');
  const receiptCardRef = useRef(null);
  const receiptPdfRef = useRef(null);
  const [holdRemainingMs, setHoldRemainingMs] = useState(0);
  const [showExtendPrompt, setShowExtendPrompt] = useState(false);
  const [ageGatePassed, setAgeGatePassed] = useState(false);
  const [foodMenu, setFoodMenu] = useState([]);

  const cartSeatIds = new Set((cart?.seats || []).map((s) => s.seatTemplateId));

  const getCartFoodQty = (foodItemId) => {
    const line = (cart?.food || []).find((f) => f.foodItemId === foodItemId);
    return line?.quantity || 0;
  };

  const changeFoodQty = (foodItemId, nextQty) => {
    const quantity = Math.max(0, nextQty);
    if (!cartId) {
      showToast(t('booking.pickSeat'), 'error');
      return;
    }
    cartOp(() => apiPost(`/cart/${cartId}/food`, { foodItemId, quantity }, onAuthChange));
  };

  const refreshSeatLayout = () => {
    if (!screeningId) return Promise.resolve();
    return apiGet(`/screenings/${screeningId}/seats`, onAuthChange).then(setLayout).catch(() => {});
  };

  const cartOp = (fn) => {
    const p = cartOpRef.current.then(async () => {
      try {
        const result = await fn();
        if (result) {
          setCart(result);
          setCartId(result.bookingId);
          await refreshSeatLayout();
        }
        return result;
      } catch (e) {
        showToast(t('booking.errorPrefix', { msg: resolveApiErrorFromException(e, t) }), 'error');
        await refreshSeatLayout();
        return null;
      }
    });
    cartOpRef.current = p.catch(() => {});
    return p;
  };

  useEffect(() => {
    if (movieIdParam && !screeningIdParam) {
      setResolvingScreening(true);
      apiGet(`/movies/${movieIdParam}/screenings`, onAuthChange)
        .then((list) => {
          if (list?.[0]) {
            setScreeningId(list[0].id);
            return;
          }
          setScreeningId(null);
        })
        .catch(() => {
          setScreeningId(null);
        })
        .finally(() => setResolvingScreening(false));
    }
  }, [movieIdParam, screeningIdParam, searchParams, onAuthChange]);

  useEffect(() => {
    if (!user?.id) {
      setSavedCards([]);
      setSelectedSavedCardId('');
      setPaymentMode('new');
      return;
    }

    const cards = getSavedPaymentCards(user.id);
    const primaryCard = getPrimaryPaymentCard(user.id);
    setSavedCards(cards);
    setSelectedSavedCardId(primaryCard?.id || cards[0]?.id || '');
    setPaymentMode(cards.length > 0 ? 'saved' : 'new');
    if (primaryCard) {
      setCardNumber(primaryCard.cardNumber || '');
      setCardName(primaryCard.cardName || '');
      setCardExpiry(primaryCard.cardExpiry || '');
    }
  }, [user?.id]);

  useEffect(() => {
    if (!screeningId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiGet(`/screenings/${screeningId}/seats`, onAuthChange).then(setLayout).catch(() => setLayout(null)).finally(() => setLoading(false));
  }, [screeningId, onAuthChange]);

  useEffect(() => {
    apiGet('/food', onAuthChange).then(setFoodMenu).catch(() => setFoodMenu([]));
  }, [onAuthChange]);

  useEffect(() => {
    setAgeGatePassed(false);
    if (!layout?.ageRating) return;
    if (!isAdultRestrictedMovie({ ageRating: layout.ageRating })) {
      setAgeGatePassed(true);
    }
  }, [layout?.screeningId, layout?.ageRating]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoyalty(null);
      return;
    }
    apiGet('/profile', onAuthChange).then(setLoyalty).catch(() => setLoyalty(null));
  }, [isAuthenticated, onAuthChange]);

  useEffect(() => {
    if (!showPaymentModal) {
      setCardCvv('');
    }
  }, [showPaymentModal]);

  useEffect(() => {
    if (!showPaymentModal) return undefined;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [showPaymentModal]);

  useEffect(() => {
    if (!cart?.lockedUntil) {
      setHoldRemainingMs(0);
      setShowExtendPrompt(false);
      return;
    }

    const deadline = parseLockedUntilMs(cart.lockedUntil);
    if (deadline == null || Number.isNaN(deadline)) {
      setHoldRemainingMs(0);
      setShowExtendPrompt(false);
      return;
    }
    const update = () => {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setHoldRemainingMs(0);
        setShowExtendPrompt(false);
        setCart(null);
        setCartId(null);
        apiGet(`/screenings/${screeningId}/seats`, onAuthChange).then(setLayout).catch(() => {});
        showToast(t('booking.holdExpired'), 'error');
        return;
      }
      setHoldRemainingMs(diff);
      if (diff <= 60_000) {
        setShowExtendPrompt(true);
      }
    };

    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [cart?.lockedUntil, screeningId, onAuthChange, showToast, t]);

  useEffect(() => {
    if (!showPaymentModal || !user?.id) return;

    const cards = getSavedPaymentCards(user.id);
    const primaryCard = getPrimaryPaymentCard(user.id);
    setSavedCards(cards);
    setSelectedSavedCardId(primaryCard?.id || cards[0]?.id || '');
    setPaymentMode(cards.length > 0 ? 'saved' : 'new');

    if (primaryCard) {
      setCardNumber(primaryCard.cardNumber || '');
      setCardName(primaryCard.cardName || '');
      setCardExpiry(primaryCard.cardExpiry || '');
    }
  }, [showPaymentModal, user?.id]);

  const toggleSeat = (seat) => {
    const isInCart = cartSeatIds.has(seat.seatTemplateId);
    if (seat.status !== 'Available' && !isInCart) return;

    cartOp(async () => {
      let activeCartId = cartId;
      if (!activeCartId) {
        const newCart = await apiPost('/cart', { screeningId }, onAuthChange);
        activeCartId = newCart.bookingId;
        setCartId(activeCartId);
      }
      if (isInCart) {
        return await apiDel(`/cart/${activeCartId}/seats/${seat.seatTemplateId}`, onAuthChange);
      }
      return await apiPost(`/cart/${activeCartId}/seats`, { seatTemplateId: seat.seatTemplateId }, onAuthChange);
    });
  };

  const toggleSeatGroup = (group) => {
    const seats = group.seats;
    const allInCart = seats.every((s) => cartSeatIds.has(s.seatTemplateId));

    if (!allInCart && seats.some((s) => isSeatBlockedOnMap(s, cartSeatIds))) {
      return;
    }

    cartOp(async () => {
      let activeCartId = cartId;
      if (!activeCartId) {
        const newCart = await apiPost('/cart', { screeningId }, onAuthChange);
        activeCartId = newCart.bookingId;
        setCartId(activeCartId);
      }
      if (allInCart) {
        let last = null;
        for (const s of seats) {
          if (cartSeatIds.has(s.seatTemplateId)) {
            last = await apiDel(`/cart/${activeCartId}/seats/${s.seatTemplateId}`, onAuthChange);
          }
        }
        return last;
      }
      let last = null;
      for (const s of seats) {
        if (!cartSeatIds.has(s.seatTemplateId) && s.status === 'Available') {
          last = await apiPost(`/cart/${activeCartId}/seats`, { seatTemplateId: s.seatTemplateId }, onAuthChange);
        }
      }
      return last;
    });
  };

  const seatsByRow = layout?.seats?.reduce((acc, s) => {
    (acc[s.row] = acc[s.row] || []).push(s);
    return acc;
  }, {}) || {};
  const rowNumbers = Object.keys(seatsByRow).map((r) => Number(r)).filter((n) => !Number.isNaN(n));
  const maxRowNumber = rowNumbers.length ? Math.max(...rowNumbers) : 0;
  const selectedSavedCard = savedCards.find((card) => card.id === selectedSavedCardId) || null;

  useEffect(() => {
    if (!selectedSavedCard) return;
    setCardNumber(selectedSavedCard.cardNumber || '');
    setCardName(selectedSavedCard.cardName || '');
    setCardExpiry(selectedSavedCard.cardExpiry || '');
  }, [selectedSavedCard]);

  const selectedSeatsSorted = cart?.seats || [];
  const holdMinutes = holdRemainingMs > 0 ? Math.floor(holdRemainingMs / 60000) : 0;
  const holdSeconds = holdRemainingMs > 0 ? Math.floor((holdRemainingMs % 60000) / 1000) : 0;

  const handleExtendHold = () => {
    if (!cartId) return;
    cartOp(() => apiPost(`/cart/${cartId}/extend-hold`, null, onAuthChange));
    setShowExtendPrompt(false);
  };
  const totalFood = cart?.foodTotal || 0;
  const discount = cart?.promoDiscount || 0;
  const loyaltyDiscount = cart?.loyaltyDiscount ?? 0;
  const loyaltyDiscountPercent = cart?.loyaltyDiscountPercent ?? 0;
  const maxBonusToUse = cart?.bonusPointsAvailable || 0;
  const appliedBonusPoints = cart?.bonusPointsUsed || 0;
  const total = cart?.total || 0;
  const earnedBonusesPreview = cart?.earnedBonusesPreview || 0;

  const syncPromoToServer = () => {
    if (!cartId) return;
    const code = promoCode.trim() || null;
    if ((code || null) !== (cart?.promoCode || null)) {
      cartOp(() => apiPost(`/cart/${cartId}/promo`, { promoCode: code }, onAuthChange));
    }
  };

  const syncBonusToServer = (value) => {
    if (!cartId) return;
    const pts = Math.max(0, parseInt(value, 10) || 0);
    cartOp(() => apiPost(`/cart/${cartId}/bonuses`, { bonusPoints: pts }, onAuthChange));
  };

  const handlePay = async () => {
    if (!cartId || (cart?.seats?.length || 0) === 0) {
      showToast(t('booking.pickSeat'), 'error');
      return;
    }

    if (!isAdmin) {
      const isUsingSavedCard = paymentMode === 'saved' && selectedSavedCard;
      const activeCardNumber = isUsingSavedCard ? selectedSavedCard.cardNumber : cardNumber;
      const activeCardName = isUsingSavedCard ? selectedSavedCard.cardName : cardName;
      const activeCardExpiry = isUsingSavedCard ? selectedSavedCard.cardExpiry : cardExpiry;

      if (!activeCardNumber.trim() || !activeCardName.trim() || !activeCardExpiry.trim() || !cardCvv.trim()) {
        showToast(isUsingSavedCard ? t('booking.needCvv') : t('booking.fillCard'), 'error');
        return;
      }
      if (!isValidCardHolderName(activeCardName)) {
        showToast(t('booking.cardHolderLatin'), 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await apiPost(`/cart/${cartId}/pay`, null, onAuthChange);
      const c = result.cart;
      const start = c.startTime ? new Date(c.startTime) : new Date();
      setReceipt({
        bookingId: c.bookingId,
        movieTitle: c.movieTitle,
        date: start.toLocaleDateString(dateLoc, { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: start.toLocaleTimeString(dateLoc, { hour: '2-digit', minute: '2-digit' }),
        total: c.total,
        totalSeats: c.seatTotal,
        totalFood: c.foodTotal,
        discount: c.promoDiscount,
        bonusPointsUsed: result.cart.bonusPointsUsed,
        bonusPointsEarned: result.bonusPointsEarned,
        seats: c.seats.map((s) => t('booking.seatLine', { row: s.row, num: s.number })),
        food: (c.food || []).map((f) => ({
          name: f.name,
          qty: f.quantity,
          price: f.totalPrice,
        })),
      });

      if (!isAdmin && user?.id) {
        const isUsingSavedCard = paymentMode === 'saved' && selectedSavedCard;
        const activeCardNumber = isUsingSavedCard ? selectedSavedCard.cardNumber : cardNumber;
        const activeCardName = isUsingSavedCard ? selectedSavedCard.cardName : cardName;
        const activeCardExpiry = isUsingSavedCard ? selectedSavedCard.cardExpiry : cardExpiry;

        const savedCard = savePaymentCard(user.id, {
          cardNumber: activeCardNumber,
          cardName: activeCardName,
          cardExpiry: activeCardExpiry,
        });
        const nextCards = getSavedPaymentCards(user.id);
        setSavedCards(nextCards);
        if (savedCard?.id) {
          setSelectedSavedCardId(savedCard.id);
          setPrimaryPaymentCard(user.id, savedCard.id);
        }
        const nextLoyalty = {
          ...(loyalty || {}),
          bonusBalance: result.newBonusBalance,
          level: result.loyaltyLevel || loyalty?.level || 'Standard',
        };
        setLoyalty(nextLoyalty);
        const currentAuth = getAuth();
        const syncedUser = { ...(currentAuth.user || {}), ...nextLoyalty };
        setAuth({ ...currentAuth, user: syncedUser });
        onAuthChange(syncedUser);
      } else if (isAdmin && user?.id) {
        const nextLoyalty = {
          ...(loyalty || {}),
          bonusBalance: result.newBonusBalance,
          level: result.loyaltyLevel || loyalty?.level || 'Standard',
        };
        setLoyalty(nextLoyalty);
        const currentAuth = getAuth();
        const syncedUser = { ...(currentAuth.user || {}), ...nextLoyalty };
        setAuth({ ...currentAuth, user: syncedUser });
        onAuthChange(syncedUser);
      }
      setSuccess(true);
    } catch (e) {
      showToast(t('booking.errorPrefix', { msg: resolveApiErrorFromException(e, t) }), 'error');
      try {
        const updatedLayout = await apiGet(`/screenings/${screeningId}/seats`, onAuthChange);
        setLayout(updatedLayout);
        setCart(null);
        setCartId(null);
      } catch {
        // ignore secondary error
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
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
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
      showToast(t('booking.pdfSaved'), 'success');
    } catch {
      showToast(t('booking.pdfFail'), 'error');
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
          <Link to="/profile/settings" className="btn btn-primary btn-sm">{t('booking.receiptProfileLink')}</Link>
        </header>
        {/* Скрытый блок только для PDF: от «Чек — Ember Cinema» до штрихкода, без кнопок */}
        <div ref={receiptPdfRef} className="receipt-pdf-source" aria-hidden="true">
          <h2 className="receipt-pdf-title">{t('receipt.title')}</h2>
          {receipt.movieTitle && (
            <p className="receipt-pdf-movie">{getDisplayTitleForString(receipt.movieTitle)}</p>
          )}
          <div className="receipt-pdf-meta">
            <div><span>{t('receipt.date')}</span><strong>{receipt.date}</strong></div>
            <div><span>{t('receipt.sessionTime')}</span><strong>{receipt.time}</strong></div>
            <div><span>{t('receipt.booking')}</span><strong>#{receipt.bookingId}</strong></div>
          </div>
          <hr className="receipt-pdf-hr" />
          <div className="receipt-pdf-section">
            <p className="receipt-pdf-section-title">{t('receipt.tickets')}</p>
            {receipt.seats.map((s) => (
              <div key={s} className="receipt-pdf-row">
                <span>{s}</span>
                <span className="receipt-pdf-value">{(receipt.totalSeats / receipt.seats.length).toFixed(2)} <CurrencySymbol /></span>
              </div>
            ))}
            <div className="receipt-pdf-row subtotal">
              <span>{t('receipt.subtotalTickets')}</span>
              <span className="receipt-pdf-value">{receipt.totalSeats.toFixed(2)} <CurrencySymbol /></span>
            </div>
          </div>
          {receipt.food.length > 0 && (
            <>
              <hr className="receipt-pdf-hr" />
              <div className="receipt-pdf-section">
                <p className="receipt-pdf-section-title">{t('receipt.food')}</p>
                {receipt.food.map((f) => (
                  <div key={f.name} className="receipt-pdf-row">
                    <span>{f.name} × {f.qty}</span>
                    <span className="receipt-pdf-value">{f.price.toFixed(2)} <CurrencySymbol /></span>
                  </div>
                ))}
                <div className="receipt-pdf-row subtotal">
                  <span>{t('receipt.subtotalFood')}</span>
                  <span className="receipt-pdf-value">{receipt.totalFood.toFixed(2)} <CurrencySymbol /></span>
                </div>
              </div>
            </>
          )}
          <hr className="receipt-pdf-hr" />
          <div className="receipt-pdf-total-row">
            <span>{t('receipt.total')}</span>
            <span className="receipt-pdf-total">{receipt.total.toFixed(2)} <CurrencySymbol /></span>
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
              <span className="receipt-printer-line-primary">{t('booking.printerThanks')}</span>
              <span className="receipt-printer-line-secondary">{t('booking.printerEnjoy')}</span>
            </div>
            <span className="receipt-printer-light" />
          </section>
          <section ref={receiptCardRef} className="receipt-card receipt-slide">
            <h2 className="receipt-title">{t('receipt.title')}</h2>

            <div className="receipt-meta">
              <div>
                <span>{t('receipt.date')}</span>
                <strong>{receipt.date}</strong>
              </div>
              <div>
                <span>{t('receipt.sessionTime')}</span>
                <strong>{receipt.time}</strong>
              </div>
              <div>
                <span>{t('receipt.booking')}</span>
                <strong>#{receipt.bookingId}</strong>
              </div>
            </div>

            {receipt.movieTitle && (
              <p className="receipt-movie">{getDisplayTitleForString(receipt.movieTitle)}</p>
            )}

            <hr className="receipt-hr" />

            <div className="receipt-section">
              <p className="receipt-section-title">{t('receipt.tickets')}</p>
              {receipt.seats.map((s) => (
                <div key={s} className="receipt-row">
                  <span>{s}</span>
                  <span className="receipt-value">
                    {(receipt.totalSeats / receipt.seats.length).toFixed(2)} <CurrencySymbol />
                  </span>
                </div>
              ))}
              <div className="receipt-row subtotal">
                <span>{t('receipt.subtotalTickets')}</span>
                <span className="receipt-value">{receipt.totalSeats.toFixed(2)} <CurrencySymbol /></span>
              </div>
            </div>

            {receipt.food.length > 0 && (
              <>
                <hr className="receipt-hr" />
                <div className="receipt-section">
                  <p className="receipt-section-title">{t('receipt.food')}</p>
                  {receipt.food.map((f) => (
                    <div key={f.name} className="receipt-row">
                      <span>{f.name} × {f.qty}</span>
                      <span className="receipt-value">{f.price.toFixed(2)} <CurrencySymbol /></span>
                    </div>
                  ))}
                  <div className="receipt-row subtotal">
                    <span>{t('receipt.subtotalFood')}</span>
                    <span className="receipt-value">{receipt.totalFood.toFixed(2)} <CurrencySymbol /></span>
                  </div>
                </div>
              </>
            )}

            <hr className="receipt-hr" />

            <div className="receipt-total-row">
              <span>{t('receipt.total')}</span>
              <span className="receipt-total">{receipt.total.toFixed(2)} <CurrencySymbol /></span>
            </div>

            <div className="receipt-barcode">
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

            <div className="receipt-footer">
              <p>{t('receipt.footer')}</p>
              <button type="button" className="btn btn-secondary btn-sm receipt-pdf-btn" onClick={downloadReceiptPdf}>
                {t('receipt.downloadPdf')}
              </button>
              <Link to="/profile/tickets" className="btn btn-receipt-tickets-outline btn-block">
                {t('booking.toMyTickets')}
              </Link>
            </div>
          </section>
        </section>
      </div>
    );
  }
  if (!screeningId && !movieIdParam) {
    return (
      <section className="booking-empty-screen">
        <div className="booking-empty-logo" aria-hidden="true">
          ember<span>.</span>
        </div>
        <div className="container booking-empty-container">
          <div className="booking-empty-card">
            <span className="booking-empty-kicker">{t('booking.emptyKicker')}</span>
            <h1>{t('booking.emptyTitle')}</h1>
            <p>{t('booking.emptyText')}</p>
            <Link to="/catalog" className="btn btn-primary btn-lg btn-block booking-empty-button">
              {t('booking.toCatalog')}
            </Link>
          </div>
        </div>
      </section>
    );
  }
  if (!screeningId && movieIdParam) {
    if (resolvingScreening) {
      return <LoadingState fullScreen />;
    }
    return (
      <section className="booking-empty-screen">
        <div className="booking-empty-logo" aria-hidden="true">
          ember<span>.</span>
        </div>
        <div className="container booking-empty-container">
          <div className="booking-empty-card">
            <span className="booking-empty-kicker">{t('booking.emptyKicker')}</span>
            <h1>{t('booking.noScreeningsTitle')}</h1>
            <p>{t('booking.noScreeningsText')}</p>
            <div style={{ display: 'grid', gap: 12 }}>
              <Link to="/catalog" className="btn btn-primary btn-lg btn-block booking-empty-button">
                {t('booking.toCatalog')}
              </Link>
              <Link to={`/movie/${movieIdParam}`} className="btn btn-secondary btn-lg btn-block booking-empty-button">
                {t('booking.backToMovie')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }
  if (loading) {
    return <LoadingState fullScreen />;
  }
  if (!layout) {
    return (
      <div className="container">
        <p>{t('booking.layoutError')}</p>
      </div>
    );
  }

  const movieTitleRaw = cart?.movieTitle || layout?.movieTitle;
  const displayMovieTitle = movieTitleRaw ? getDisplayTitleForString(movieTitleRaw) : '';
  const screeningHall = cart?.hallName || layout?.name;
  const screeningStartRaw = cart?.startTime || layout?.startTime;
  const screeningStart = screeningStartRaw ? new Date(screeningStartRaw) : null;
  const screeningDateLabel = screeningStart
    ? screeningStart.toLocaleDateString(dateLoc, { day: '2-digit', month: '2-digit' })
    : '—';
  const screeningTimeLabel = screeningStart
    ? screeningStart.toLocaleTimeString(dateLoc, { hour: '2-digit', minute: '2-digit' })
    : '—';
  const bookingMovieId = layout?.movieId ?? (movieIdParam ? parseInt(movieIdParam, 10) : null);
  const durationLabel = layout?.duration ? formatDurationMinutes(layout.duration) : '';
  const ageBadge = layout?.ageRating || '12+';
  const langBadge = formatLangBadge(layout?.language);
  const formatBadge = layout?.format || '2D';
  const heroMovie = {
    id: bookingMovieId,
    title: movieTitleRaw,
    posterUrl: layout?.posterUrl,
    backgroundUrl: layout?.backgroundUrl,
  };

  const seatTypeCatalog = buildSeatTypeCatalog(layout?.seats || [], maxRowNumber);

  const removeSeatGroupFromCart = (group) => {
    if (!layout?.seats) return;
    const layoutSeats = group.seats
      .map((s) => layout.seats.find((ls) => ls.seatTemplateId === s.seatTemplateId))
      .filter(Boolean);
    if (layoutSeats.length === 0) return;
    if (layoutSeats.length > 1) {
      toggleSeatGroup({ seats: layoutSeats, labelFrom: group.labelFrom, labelTo: group.labelTo, capacity: group.capacity });
      return;
    }
    toggleSeat(layoutSeats[0]);
  };

  const cartSeatGroups = groupCartSeatsForDisplay(selectedSeatsSorted, maxRowNumber);

  const getCartSeatMeta = (cartSeat) => {
    const layoutSeat = layout.seats.find((s) => s.seatTemplateId === cartSeat.seatTemplateId);
    const typeKey = layoutSeat ? resolveSeatTypeKey(layoutSeat, cartSeat.row, maxRowNumber) : 'single';
    return SEAT_TYPE_META[typeKey] || SEAT_TYPE_META.single;
  };

  return (
    <div className="booking-page">
      <section className="booking-hero">
        <MovieBackdrop movie={heroMovie} className="booking-hero-bg" eager />
        <div className="booking-hero-overlay" aria-hidden="true" />
        <div className="container booking-hero-inner">
          <div className="booking-hero-head">
            <h1 className="booking-hero-title">{displayMovieTitle}</h1>
            {durationLabel && (
              <p className="booking-hero-duration">
                <span className="booking-hero-duration-icon" aria-hidden="true">◷</span>
                {durationLabel}
              </p>
            )}
          </div>
          <div className="booking-badges">
            <span className="booking-badge">{ageBadge}</span>
            <span className="booking-badge">{langBadge}</span>
            <span className="booking-badge">{formatBadge}</span>
          </div>
          <div className="booking-info-cards">
            <div className="booking-info-card">
              <span className="booking-info-card-label">{t('booking.dateLabel')}</span>
              <strong className="booking-info-card-value">{screeningDateLabel}</strong>
            </div>
            <div className="booking-info-card">
              <span className="booking-info-card-label">{t('booking.sessionLabel')}</span>
              <strong className="booking-info-card-value">{screeningTimeLabel}</strong>
            </div>
            <div className="booking-info-card">
              <span className="booking-info-card-label">{t('booking.hallLabel')}</span>
              <strong className="booking-info-card-value">{screeningHall || '—'}</strong>
            </div>
          </div>
          {bookingMovieId && (
            <Link to={`/movie/${bookingMovieId}`} className="btn btn-secondary btn-sm booking-hero-details-btn">
              {t('booking.moreDetails')}
            </Link>
          )}
        </div>
      </section>

      <div className="booking-body">
        <div className="container">
          <div className="booking-layout">
            <div className="booking-main">
              <div className="booking-seat-section">
                <div className="seat-map">
                  <p className="screen-size-disclaimer" role="note">
                    {t('booking.screenSizeDisclaimer')}
                  </p>
                  <div className="screen-indicator" aria-hidden="true" />
                  {Object.entries(seatsByRow).sort((a, b) => a[0] - b[0]).map(([row, seats]) => {
                    const rowNumber = Number(row);
                    return (
                      <div key={row} className="seat-row">
                        <span className="seat-row-label">{row}</span>
                        {(() => {
                          const isFirstRow = rowNumber === 1;
                          const isLastRow = rowNumber === maxRowNumber;
                          const sortedSeats = seats.slice().sort((a, b) => a.number - b.number);
                          const pairMode = shouldRenderSeatPairs(rowNumber, maxRowNumber, sortedSeats);
                          const displayGroups = buildSeatDisplayGroups(sortedSeats, pairMode);

                          return displayGroups.map((group) => {
                            const { labelFrom, labelTo, capacity } = group;
                            const { seatAria, seatDataLabel, seatNumberText } = formatSeatGroupMeta(
                              t,
                              rowNumber,
                              labelFrom,
                              labelTo,
                              capacity
                            );
                            const groupSelected = group.seats.every((s) => cartSeatIds.has(s.seatTemplateId));
                            const groupPartial =
                              !groupSelected && group.seats.some((s) => cartSeatIds.has(s.seatTemplateId));
                            const groupSold = group.seats.some((s) => isSeatBlockedOnMap(s, cartSeatIds));
                            const seatType = String(group.seats[0]?.type ?? group.seats[0]?.seatType ?? '').toLowerCase();
                            let isVip = seatType === 'vip' || seatType.includes('vip');
                            if (isLastRow) isVip = true;
                            const capacityClass = capacity >= 2 ? 'seat-capacity-2' : 'seat-capacity-1';
                            const sizeClass = isFirstRow
                              ? 'seat-large-front'
                              : isLastRow
                                ? 'seat-large-back'
                                : '';
                            const groupKey = group.seats.map((s) => s.seatTemplateId).join('-');

                            return (
                              <button
                                key={groupKey}
                                type="button"
                                className={`seat ${capacityClass} ${sizeClass} ${groupSold ? 'seat-sold' : ''} ${isVip ? 'seat-vip' : ''} ${groupSelected || groupPartial ? 'seat-selected' : ''}`}
                                onClick={() => (group.seats.length > 1 ? toggleSeatGroup(group) : toggleSeat(group.seats[0]))}
                                disabled={groupSold}
                                aria-label={seatAria}
                                data-seat-row={rowNumber}
                                data-seat-number={labelFrom}
                                data-seat-label={seatDataLabel}
                              >
                                <span className="seat-number" aria-hidden="true">
                                  {seatNumberText}
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    );
                  })}
                  <div className="seat-legend">
                    <span className="seat-legend-item">
                      <span className="seat-legend-box seat-legend-free" />
                      {t('booking.legendFree')}
                    </span>
                    <span className="seat-legend-item">
                      <span className="seat-legend-box seat-legend-selected" />
                      {t('booking.legendSelected')}
                    </span>
                    <span className="seat-legend-item">
                      <span className="seat-legend-box seat-legend-sold" />
                      {t('booking.legendSold')}
                    </span>
                  </div>
                </div>
                {(cart?.lockedUntil && holdRemainingMs > 0) || (showExtendPrompt && cart?.lockedUntil && holdRemainingMs > 0) ? (
                  <div className="seat-hold-wrap">
                    {cart?.lockedUntil && holdRemainingMs > 0 && (
                      <div className="seat-hold-bar">
                        <span className="seat-hold-label">{t('booking.holdKeeping')}</span>
                        <span className="seat-hold-timer">
                          {holdMinutes}:{holdSeconds.toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                    {showExtendPrompt && cart?.lockedUntil && holdRemainingMs > 0 && (
                      <div className="seat-hold-warning">
                        <span className="seat-hold-warning-text">{t('booking.holdEnding')}</span>
                        <button type="button" className="seat-hold-warning-btn" onClick={handleExtendHold}>
                          {t('booking.extendHold')}
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {foodMenu.length > 0 && (
                <section className="booking-food-section">
                  <h3 className="booking-food-title">{t('booking.foodSection')}</h3>
                  {!cartId && (
                    <p className="booking-food-hint">{t('booking.foodAfterSeats')}</p>
                  )}
                  <div className="food-grid">
                    {foodMenu.map((f) => {
                      const qty = getCartFoodQty(f.id);
                      return (
                        <div key={f.id} className="glass-card food-card">
                          <img
                            src={getFoodImageUrl(f)}
                            alt={f.name}
                            className={isColaFoodItem(f.name) ? 'food-image-cola' : ''}
                          />
                          <h4>{f.name}</h4>
                          <div className="price">
                            {Number(f.price).toFixed(2)} <CurrencySymbol />
                          </div>
                          <div className="qty-control">
                            <button
                              type="button"
                              className="qty-btn"
                              disabled={!cartId || qty === 0}
                              onClick={() => changeFoodQty(f.id, qty - 1)}
                              aria-label={t('booking.foodDecrease', { name: f.name })}
                            >
                              −
                            </button>
                            <span>{qty}</span>
                            <button
                              type="button"
                              className="qty-btn"
                              disabled={!cartId}
                              onClick={() => changeFoodQty(f.id, qty + 1)}
                              aria-label={t('booking.foodIncrease', { name: f.name })}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            <aside className="booking-order-aside">
              <div className="booking-sidebar-panel">
                <h3 className="booking-sidebar-title">{t('booking.ticketsTitle')}</h3>
                {cartSeatGroups.length === 0 ? (
                  <p className="booking-sidebar-empty">{t('booking.noTicketsYet')}</p>
                ) : (
                  <div className="booking-ticket-list">
                    {cartSeatGroups.map((group) => {
                      const lead = group.seats[0];
                      const meta = getCartSeatMeta(lead);
                      const groupKey = group.seats.map((s) => s.seatTemplateId).join('-');
                      const isPair = group.capacity >= 2 && group.labelTo > group.labelFrom;
                      return (
                        <div key={groupKey} className="booking-ticket-card">
                          <div className={`booking-ticket-icon seat-type-icon ${meta.icon}`} aria-hidden="true" />
                          <div className="booking-ticket-main">
                            <div className="booking-ticket-type">{t(`booking.${meta.title}`)}</div>
                            <div className="booking-ticket-meta">
                              <span>{t('booking.rowShort', { row: lead.row })}</span>
                              <span>
                                {isPair
                                  ? t('booking.seatsShortRange', { from: group.labelFrom, to: group.labelTo })
                                  : t('booking.seatShort', { num: group.labelFrom })}
                              </span>
                            </div>
                          </div>
                          <div className="booking-ticket-price">
                            {Number(group.price).toFixed(2)} <CurrencySymbol />
                          </div>
                          <button
                            type="button"
                            className="booking-ticket-remove"
                            onClick={() => removeSeatGroupFromCart(group)}
                            aria-label={t('booking.removeSeat')}
                          >
                            <span aria-hidden="true">×</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(cart?.food || []).filter((f) => f.quantity > 0).map((f) => (
                  <div key={f.foodItemId} className="booking-sidebar-line booking-sidebar-line-muted">
                    <span>{f.name} × {f.quantity}</span>
                    <span>{Number(f.totalPrice).toFixed(2)} <CurrencySymbol /></span>
                  </div>
                ))}

                {totalFood > 0 && (
                  <div className="booking-sidebar-line booking-sidebar-line-muted">
                    <span>{t('booking.foodSubtotal')}</span>
                    <span>{Number(totalFood).toFixed(2)} <CurrencySymbol /></span>
                  </div>
                )}

                {loyaltyDiscount > 0 && (
                  <div className="booking-sidebar-line booking-sidebar-line-muted">
                    <span>
                      {t('booking.loyaltyOff', {
                        level: cart?.loyaltyLevel || t('booking.levelFallback'),
                        pct: loyaltyDiscountPercent,
                      })}
                    </span>
                    <span>−{Number(loyaltyDiscount).toFixed(2)} <CurrencySymbol /></span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="booking-sidebar-line booking-sidebar-line-muted">
                    <span>{t('booking.promoOff', { code: cart?.promoCode || '' })}</span>
                    <span>−{Number(discount).toFixed(2)} <CurrencySymbol /></span>
                  </div>
                )}
                {appliedBonusPoints > 0 && (
                  <div className="booking-sidebar-line booking-sidebar-line-muted">
                    <span>{t('booking.bonusSpent')}</span>
                    <span>−{appliedBonusPoints} <CurrencySymbol /></span>
                  </div>
                )}
                <div className="booking-sidebar-total">
                  <span>{t('booking.orderTotal')}</span>
                  <span>{Number(total).toFixed(2)} <CurrencySymbol /></span>
                </div>
                {isAuthenticated && cart && (
                  <div className="booking-sidebar-bonus">
                    <div className="booking-sidebar-line booking-sidebar-line-muted">
                      <span>{t('booking.bonusAvail')}</span>
                      <span>{maxBonusToUse}</span>
                    </div>
                    <div className="booking-sidebar-line booking-sidebar-line-muted">
                      <span>{t('booking.bonusAfterPay')}</span>
                      <span>+{earnedBonusesPreview}</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-lg btn-block booking-sidebar-pay"
                  disabled={submitting || (cart?.seats?.length || 0) === 0}
                  onClick={() => setShowPaymentModal(true)}
                >
                  {t('booking.pay')}
                </button>
              </div>

              <div className="booking-sidebar-panel booking-seat-types-panel">
                <h3 className="booking-sidebar-title">{t('booking.seatTypesTitle')}</h3>
                <div className="seat-types-panel">
                  {seatTypeCatalog.map(({ key: typeKey, price }) => {
                    const meta = SEAT_TYPE_META[typeKey];
                    return (
                      <div key={typeKey} className="seat-type-row">
                        <div className={`seat-type-icon ${meta.icon}`} aria-hidden="true" />
                        <div className="seat-type-text">
                          <div className="seat-type-title">{t(`booking.${meta.title}`)}</div>
                          <div className="seat-type-subtitle">{t(`booking.${meta.sub}`)}</div>
                        </div>
                        <div className="seat-type-price">
                          {t('booking.seatTypePriceFrom', { price: price.toFixed(2) })} <CurrencySymbol />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>

          <section className="booking-faq">
            <div className="booking-notes">
              <div className="booking-notes-body">
                <p className="booking-notes-main">
                  <strong>{t('booking.noteTicketsStrong')}</strong>
                  {t('booking.noteTicketsRest')}
                </p>
              </div>
              <div className="booking-notes-body">
                <p>
                  <strong>{t('booking.noteChildStrong')}</strong>
                  {t('booking.noteChildRest')}
                </p>
              </div>
              <div className="booking-notes-body">
                <p>
                  <strong>{t('booking.noteFamilyStrong')}</strong>
                  {t('booking.noteFamilyRest')}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
      {showPaymentModal && (
        <div className="modal-backdrop modal-backdrop--lock active" onWheel={(e) => e.stopPropagation()}>
          <div className="modal modal--payment" onClick={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>
              {isAdmin ? t('booking.adminPaymentTitle') : t('booking.paymentTitle')}
            </h2>
            <p style={{ marginTop: 0, marginBottom: 20, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              {isAdmin ? t('booking.adminPaymentHint') : t('booking.paymentHint')}
            </p>
            <form onSubmit={handleSubmitPayment} className="payment-form">
              {isAdmin && (
                <div className="payment-loyalty-box payment-admin-box">
                  <strong>{t('booking.adminUnlimitedFunds')}</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    {t('booking.adminNoCardNeeded')}
                  </p>
                </div>
              )}
              {isAuthenticated && cart && !isAdmin && (
                <div className="payment-loyalty-box">
                  <div className="payment-loyalty-row">
                    <strong>{t('booking.yourBonuses')}</strong>
                    <span>{maxBonusToUse}</span>
                  </div>
                  <label className="payment-field">
                    <span>{t('booking.useBonuses')}</span>
                    <div className="payment-loyalty-input-group">
                      <input
                        type="number"
                        min="0"
                        max={maxBonusToUse}
                        placeholder="0"
                        value={bonusPointsToUse}
                        onChange={(e) => {
                          const nextValue = e.target.value.replace(/\D/g, '');
                          if (!nextValue) {
                            setBonusPointsToUse('');
                            return;
                          }
                          setBonusPointsToUse(String(Math.min(maxBonusToUse, Number(nextValue))));
                        }}
                        onBlur={(e) => syncBonusToServer(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm payment-loyalty-use-all"
                        onClick={() => {
                          const val = maxBonusToUse > 0 ? String(maxBonusToUse) : '';
                          setBonusPointsToUse(val);
                          syncBonusToServer(val);
                        }}
                        disabled={maxBonusToUse === 0}
                      >
                        {t('booking.useAllBonuses')}
                      </button>
                    </div>
                  </label>
                  <div className="payment-loyalty-hint">
                    {t('booking.bonusUseHint', { max: maxBonusToUse, earn: earnedBonusesPreview })}
                  </div>
                </div>
              )}
              {!isAdmin && savedCards.length > 0 && (
                <div className="saved-payment-cards">
                  <div className="saved-payment-cards-header">
                    <span>{t('booking.savedCards')}</span>
                    <button
                      type="button"
                      className={`btn btn-sm ${paymentMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPaymentMode('new')}
                    >
                      {t('booking.payOtherCard')}
                    </button>
                  </div>
                  <div className="saved-payment-cards-list">
                    {savedCards.map((savedCard) => (
                      <button
                        key={savedCard.id}
                        type="button"
                        className={`saved-payment-card ${selectedSavedCardId === savedCard.id && paymentMode === 'saved' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedSavedCardId(savedCard.id);
                          setPaymentMode('saved');
                        }}
                      >
                        <div className="saved-payment-card-art" />
                        <div className="saved-payment-card-meta">
                          <strong>{savedCard.brand}</strong>
                          <span>{savedCard.maskedNumber}</span>
                          <small>{savedCard.cardExpiry}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isAdmin && (paymentMode !== 'saved' || !selectedSavedCard) ? (
                <>
                  <label className="payment-field">
                    <span>{t('profile.cardNumber')}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumberInput(e.target.value))}
                      required
                    />
                  </label>
                  <div className="payment-row">
                    <label className="payment-field">
                      <span>{t('profile.expiry')}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiryInput(e.target.value))}
                        required
                      />
                    </label>
                    <label className="payment-field">
                      <span>{t('profile.holder')}</span>
                      <input
                        type="text"
                        placeholder={t('booking.cardNamePh')}
                        value={cardName}
                        onChange={(e) => setCardName(sanitizeCardHolderName(e.target.value))}
                        required
                      />
                    </label>
                  </div>
                </>
              ) : null}

              <div className="payment-row">
                {!isAdmin && (
                  <label className="payment-field">
                    <span>{t('booking.cvc')}</span>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      required
                    />
                  </label>
                )}
                <label className="payment-field">
                  <span>{t('booking.promoLabel')}</span>
                  <input
                    type="text"
                    placeholder={t('booking.promoPlaceholder')}
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    onBlur={syncPromoToServer}
                  />
                </label>
              </div>
              <div className="payment-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={submitting}
                >
                  {t('profile.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {isAdmin ? t('booking.adminPay') : t('booking.payWithTotal', { amount: Number(total).toFixed(2) })} {!isAdmin && <CurrencySymbol />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <AgeRestrictionModal
        open={isAdultRestrictedMovie({ ageRating: layout?.ageRating }) && !ageGatePassed && !showPaymentModal}
        minAge={parseMovieAge(layout?.ageRating) ?? 18}
        onConfirm={() => setAgeGatePassed(true)}
        onReject={() => navigate(bookingMovieId ? `/movie/${bookingMovieId}` : '/catalog')}
      />
    </div>
  );
}
