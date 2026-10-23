import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDel, getAuth, setAuth } from '../api/client';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { resolveApiErrorFromException } from '../utils/resolveApiError';
import { useI18n } from '../context/useI18n';
import {
  deletePaymentCard,
  getSavedPaymentCards,
  getPrimaryPaymentCard,
  isValidCardHolderName,
  savePaymentCard,
} from '../utils/paymentCards';

export const PREMIUM_SPENT_THRESHOLD = 200;
export const PREMIUM_TICKETS_THRESHOLD = 10;

export function formatCardNumberInput(value) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

export function formatExpiryInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Состояние и действия личного кабинета (билеты, списки, настройки). */
export function useProfileCabinetState() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, onAuthChange } = useAuth();
  const { show: showToast } = useToast();
  const { t } = useI18n();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [lists, setLists] = useState([]);
  const [listItemsById, setListItemsById] = useState({});
  const [displayName, setDisplayName] = useState('');
  const [ticketReceipt, setTicketReceipt] = useState(null);
  const [showTicketOverlay, setShowTicketOverlay] = useState(false);
  const [savedCards, setSavedCards] = useState([]);
  const [activeCardId, setActiveCardId] = useState('');
  const [cardPendingDelete, setCardPendingDelete] = useState(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardName, setNewCardName] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const ticketPdfRef = useRef(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth?return=/profile/settings');
      return;
    }
    apiGet('/profile', onAuthChange)
      .then((p) => {
        setProfile(p);
        setDisplayName(p?.displayName || '');
        setAvatarPreview(p?.avatarUrl || '');
        const currentAuth = getAuth();
        const syncedUser = {
          ...(currentAuth.user || {}),
          ...p,
        };
        setAuth({ ...currentAuth, user: syncedUser });
        onAuthChange(syncedUser);
      })
      .catch(() => setProfile(null));
    apiGet('/bookings/my', onAuthChange).then(setBookings).catch(() => setBookings([]));
    apiGet('/lists', onAuthChange)
      .then((ls) => {
        setLists(ls);
        const want = ls.find((l) => l.type === 'WantToWatch' || l.name.toLowerCase().includes('хочу посмотреть'));
        if (want) {
          apiGet(`/lists/${want.id}/items`, onAuthChange)
            .then((items) => {
              setListItemsById((prev) => ({ ...prev, [want.id]: items }));
            })
            .catch(() => {});
        }
      })
      .catch(() => setLists([]));
  }, [isAuthenticated, navigate, onAuthChange]);

  // Synchronize saved cards from browser storage after a purchase or account change.
  useEffect(() => {
    if (!user?.id) {
      setSavedCards([]);
      setActiveCardId('');
      return;
    }
    const cards = getSavedPaymentCards(user.id);
    const primaryCard = getPrimaryPaymentCard(user.id);
    setSavedCards(cards);
    setActiveCardId(primaryCard?.id || cards[0]?.id || '');
  }, [user?.id, showTicketOverlay, bookings.length]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    apiPut('/profile', { displayName, avatarUrl: avatarPreview || '' }, onAuthChange)
      .then((updatedProfile) => {
        setProfile(updatedProfile);
        const currentAuth = getAuth();
        const updatedUser = {
          ...(currentAuth.user || {}),
          ...updatedProfile,
        };
        setAuth({ ...currentAuth, user: updatedUser });
        onAuthChange(updatedUser);
        showToast('Сохранено', 'success');
      })
      .catch((err) => showToast(resolveApiErrorFromException(err, t), 'error'));
  };

  const handleCancelBooking = (id) => {
    apiPost(`/bookings/${id}/cancel`, null, onAuthChange)
      .then(() => {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        showToast('Бронь отменена', 'success');
      })
      .catch((err) => showToast(resolveApiErrorFromException(err, t), 'error'));
  };

  const handlePruneBookings = (keepCount = 3) => {
    return apiPost(`/bookings/prune-history?keep=${keepCount}`, null, onAuthChange)
      .then((data) => {
        if (Array.isArray(data?.bookings)) {
          setBookings(data.bookings);
        } else {
          return apiGet('/bookings/my', onAuthChange).then(setBookings);
        }
        return data?.removed ?? 0;
      });
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
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
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

  const handleDeleteCard = (cardId) => {
    if (!user?.id) return;
    const nextCards = deletePaymentCard(user.id, cardId);
    const nextPrimary = getPrimaryPaymentCard(user.id);
    setSavedCards(nextCards);
    setActiveCardId(nextPrimary?.id || nextCards[0]?.id || '');
    setCardPendingDelete(null);
    showToast('Карта удалена', 'success');
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!newCardNumber.trim() || !newCardName.trim() || !newCardExpiry.trim()) {
      showToast('Заполните данные карты', 'error');
      return;
    }
    if (!isValidCardHolderName(newCardName)) {
      showToast('Имя держателя карты должно быть указано латиницей', 'error');
      return;
    }

    const savedCard = savePaymentCard(user.id, {
      cardNumber: newCardNumber,
      cardName: newCardName,
      cardExpiry: newCardExpiry,
    });
    const nextCards = getSavedPaymentCards(user.id);
    setSavedCards(nextCards);
    setActiveCardId(savedCard?.id || nextCards[0]?.id || '');
    setShowAddCardModal(false);
    setNewCardNumber('');
    setNewCardName('');
    setNewCardExpiry('');
    showToast('Карта добавлена', 'success');
  };

  const reloadListItems = async (listId) => {
    const items = await apiGet(`/lists/${listId}/items`, onAuthChange);
    setListItemsById((prev) => ({ ...prev, [listId]: items }));
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, itemCount: items.length } : l))
    );
    return items;
  };

  const handleRemoveListItem = async (listId, itemId) => {
    try {
      await apiDel(`/lists/${listId}/items/${itemId}`, onAuthChange);
      await reloadListItems(listId);
      showToast(t('lists.removed'), 'success');
    } catch (e) {
      showToast(resolveApiErrorFromException(e, t), 'error');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Выберите изображение JPG, PNG или WEBP', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        showToast('Не удалось прочитать изображение', 'error');
        return;
      }
      setAvatarPreview(result);
    };
    reader.onerror = () => showToast('Не удалось загрузить изображение', 'error');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const loyaltyProfile = {
    ...(profile || user || {}),
    bonusBalance: user?.bonusBalance ?? profile?.bonusBalance,
    totalSpent: user?.totalSpent ?? profile?.totalSpent,
    ticketsPurchased: user?.ticketsPurchased ?? profile?.ticketsPurchased,
    level: user?.level ?? profile?.level,
  };
  const level = loyaltyProfile.level || 'Standard';
  const loyaltySummary = loyaltyProfile.loyaltySummary || '';
  const loyaltyTicketDiscountPercent = Number(loyaltyProfile.loyaltyTicketDiscountPercent ?? 0);
  const bonusEarnMultiplier = Number(loyaltyProfile.bonusEarnMultiplier ?? 1);
  const totalSpent = Number(loyaltyProfile.totalSpent || 0);
  const ticketsPurchased = Number(loyaltyProfile.ticketsPurchased || 0);
  const bonusBalance = Number(loyaltyProfile.bonusBalance || 0);
  const wantToWatchList = lists.find((list) => list.type === 'WantToWatch' || list.name.toLowerCase().includes('хочу посмотреть'));
  const wantToWatchCount = wantToWatchList
    ? listItemsById[wantToWatchList.id]?.length ?? wantToWatchList.itemCount ?? 0
    : 0;
  const paidBookingsCount = bookings.filter((booking) => booking.status === 'Paid').length;
  const levelProgress = useMemo(() => {
    if (level === 'Premium') {
      return {
        percent: 100,
        summary: 'Максимальный уровень достигнут',
      };
    }

    const spentProgress = Math.min(totalSpent / PREMIUM_SPENT_THRESHOLD, 1);
    const ticketsProgress = Math.min(ticketsPurchased / PREMIUM_TICKETS_THRESHOLD, 1);
    const percent = Math.round(Math.max(spentProgress, ticketsProgress) * 100);
    const spentLeft = Math.max(0, PREMIUM_SPENT_THRESHOLD - totalSpent);
    const ticketsLeft = Math.max(0, PREMIUM_TICKETS_THRESHOLD - ticketsPurchased);

    return {
      percent,
      summary: null,
      premiumSpentLeft: spentLeft.toFixed(2),
      premiumTicketsLeft: ticketsLeft,
    };
  }, [level, ticketsPurchased, totalSpent]);

  const initials =
    user?.displayName?.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase() || '?';
  const activeCard = savedCards.find((card) => card.id === activeCardId) || savedCards[0] || null;

  return {
    isAuthenticated,
    user,
    profile,
    setProfile,
    bookings,
    lists,
    listItemsById,
    displayName,
    setDisplayName,
    ticketReceipt,
    showTicketOverlay,
    setShowTicketOverlay,
    savedCards,
    activeCardId,
    setActiveCardId,
    cardPendingDelete,
    setCardPendingDelete,
    showAddCardModal,
    setShowAddCardModal,
    newCardNumber,
    setNewCardNumber,
    newCardName,
    setNewCardName,
    newCardExpiry,
    setNewCardExpiry,
    avatarPreview,
    setAvatarPreview,
    ticketPdfRef,
    avatarInputRef,
    level,
    loyaltySummary,
    loyaltyTicketDiscountPercent,
    bonusEarnMultiplier,
    totalSpent,
    ticketsPurchased,
    bonusBalance,
    wantToWatchList,
    wantToWatchCount,
    paidBookingsCount,
    levelProgress,
    initials,
    activeCard,
    handleSaveProfile,
    handleCancelBooking,
    handlePruneBookings,
    openTicketReceipt,
    downloadTicketPdf,
    handleLogout,
    handleDeleteCard,
    handleAddCard,
    handleAvatarChange,
    handleRemoveListItem,
  };
}
