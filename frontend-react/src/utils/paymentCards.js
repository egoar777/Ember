function normalizeCardNumber(cardNumber) {
  return String(cardNumber || '').replace(/\D/g, '').slice(0, 16);
}

const CYRILLIC_TO_LATIN = {
  А: 'A',
  Б: 'B',
  В: 'V',
  Г: 'G',
  Д: 'D',
  Е: 'E',
  Ё: 'E',
  Ж: 'ZH',
  З: 'Z',
  И: 'I',
  Й: 'I',
  К: 'K',
  Л: 'L',
  М: 'M',
  Н: 'N',
  О: 'O',
  П: 'P',
  Р: 'R',
  С: 'S',
  Т: 'T',
  У: 'U',
  Ф: 'F',
  Х: 'KH',
  Ц: 'TS',
  Ч: 'CH',
  Ш: 'SH',
  Щ: 'SHCH',
  Ъ: '',
  Ы: 'Y',
  Ь: '',
  Э: 'E',
  Ю: 'YU',
  Я: 'YA',
  І: 'I',
  Ї: 'I',
  Є: 'E',
  Ў: 'U',
};

export function transliterateCardHolderName(value) {
  return String(value || '')
    .toUpperCase()
    .split('')
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join('');
}

export function sanitizeCardHolderName(value) {
  return transliterateCardHolderName(value)
    .replace(/[^A-Z\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart();
}

export function isValidCardHolderName(value) {
  const normalized = sanitizeCardHolderName(value).trim();
  return /^[A-Z]+(?:[ '-][A-Z]+)*$/.test(normalized);
}

export function maskCardNumber(cardNumber) {
  const digits = normalizeCardNumber(cardNumber);
  if (!digits) return '0000 0000 0000 0000';
  const visibleStart = digits.slice(0, 4);
  const visibleEnd = digits.slice(-2);
  const hiddenCount = Math.max(0, digits.length - 6);
  const maskedDigits = `${visibleStart}${'•'.repeat(hiddenCount)}${visibleEnd}`.slice(0, digits.length);
  return maskedDigits.replace(/(.{4})/g, '$1 ').trim();
}

export function getCardBrand(cardNumber) {
  const digits = normalizeCardNumber(cardNumber);
  if (digits.startsWith('4')) return 'VISA';
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(digits)) return 'MASTERCARD';
  if (/^220[0-4]/.test(digits)) return 'MIR';
  return 'VISA';
}

function getCardsStorageKey(userId) {
  return `ember_cards_${userId}`;
}

function getSelectedCardStorageKey(userId) {
  return `ember_selected_card_${userId}`;
}

function getLegacyCardStorageKey(userId) {
  return `ember_card_${userId}`;
}

function createCardRecord(cardData, existingId) {
  const digits = normalizeCardNumber(cardData.cardNumber);
  return {
    id: existingId || `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    cardNumber: digits,
    maskedNumber: maskCardNumber(digits),
    cardName: sanitizeCardHolderName(cardData.cardName).trim(),
    cardExpiry: String(cardData.cardExpiry || '').trim(),
    brand: getCardBrand(digits),
    lastUsedAt: new Date().toISOString(),
  };
}

function parseCards(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeStoredCard(card) {
  const digits = normalizeCardNumber(card?.cardNumber);
  if (!digits) return null;

  return {
    id: card.id || `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    cardNumber: digits,
    maskedNumber: maskCardNumber(digits),
    cardName: sanitizeCardHolderName(card.cardName).trim(),
    cardExpiry: String(card.cardExpiry || '').trim(),
    brand: getCardBrand(digits),
    lastUsedAt: card.lastUsedAt || new Date().toISOString(),
  };
}

export function getSavedPaymentCards(userId) {
  if (!userId) return [];

  const cardsKey = getCardsStorageKey(userId);
  const legacyKey = getLegacyCardStorageKey(userId);
  const rawCards = localStorage.getItem(cardsKey);
  const cards = rawCards ? parseCards(rawCards) : [];

  if (cards.length > 0) {
    const normalizedCards = cards
      .map(normalizeStoredCard)
      .filter((card) => card?.cardNumber)
      .sort((a, b) => new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime());

    if (JSON.stringify(cards) !== JSON.stringify(normalizedCards)) {
      localStorage.setItem(cardsKey, JSON.stringify(normalizedCards));
    }

    return normalizedCards;
  }

  const rawLegacy = localStorage.getItem(legacyKey);
  if (!rawLegacy) return [];

  try {
    const legacy = JSON.parse(rawLegacy);
    if (!legacy?.cardNumber) return [];
    const migrated = [createCardRecord(legacy)];
    localStorage.setItem(cardsKey, JSON.stringify(migrated));
    localStorage.setItem(getSelectedCardStorageKey(userId), migrated[0].id);
    return migrated;
  } catch {
    return [];
  }
}

export function getPrimaryPaymentCard(userId) {
  const cards = getSavedPaymentCards(userId);
  if (cards.length === 0) return null;

  const selectedId = localStorage.getItem(getSelectedCardStorageKey(userId));
  return cards.find((card) => card.id === selectedId) || cards[0];
}

export function setPrimaryPaymentCard(userId, cardId) {
  if (!userId || !cardId) return;
  localStorage.setItem(getSelectedCardStorageKey(userId), cardId);
}

export function deletePaymentCard(userId, cardId) {
  if (!userId || !cardId) return [];

  const nextCards = getSavedPaymentCards(userId).filter((card) => card.id !== cardId);
  localStorage.setItem(getCardsStorageKey(userId), JSON.stringify(nextCards));

  const selectedKey = getSelectedCardStorageKey(userId);
  const selectedId = localStorage.getItem(selectedKey);
  if (!selectedId || selectedId === cardId) {
    if (nextCards[0]?.id) {
      localStorage.setItem(selectedKey, nextCards[0].id);
    } else {
      localStorage.removeItem(selectedKey);
    }
  }

  return nextCards;
}

export function savePaymentCard(userId, cardData) {
  if (!userId) return null;

  const cards = getSavedPaymentCards(userId);
  const digits = normalizeCardNumber(cardData.cardNumber);
  if (!digits) return null;

  const existing = cards.find((card) => normalizeCardNumber(card.cardNumber) === digits);
  const nextCard = createCardRecord(cardData, existing?.id);
  const nextCards = existing
    ? cards.map((card) => (card.id === existing.id ? { ...card, ...nextCard } : card))
    : [nextCard, ...cards];

  localStorage.setItem(getCardsStorageKey(userId), JSON.stringify(nextCards));
  localStorage.setItem(getSelectedCardStorageKey(userId), nextCard.id);
  localStorage.removeItem(getLegacyCardStorageKey(userId));
  return nextCard;
}
