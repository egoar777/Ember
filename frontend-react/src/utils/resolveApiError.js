/** Коды ошибок API → ключи apiErrors.* */
const API_ERROR_I18N = {
  screening_not_found: 'screeningNotFound',
  movie_archived: 'movieArchived',
  screening_already_started_or_ended: 'screeningStartedOrEnded',
  screening_already_started: 'screeningStarted',
  seats_invalid: 'seatsInvalid',
  seat_unavailable: 'seatUnavailable',
  booking_not_found: 'bookingNotFound',
  booking_access_denied: 'bookingAccessDenied',
  booking_not_pending_payment: 'bookingNotPendingPayment',
  booking_no_payment_reference: 'bookingNoPaymentReference',
  payment_verification_failed: 'paymentFailed',
  payment_init_failed: 'paymentInitFailed',
  seat_not_found: 'seatNotFound',
  seat_not_in_booking: 'seatNotInBooking',
  food_not_found: 'foodNotFound',
  empty_cart: 'emptyCart',
  booking_not_pending: 'bookingNotPending',
  email_already_registered: 'emailRegistered',
  invalid_credentials: 'invalidCredentials',
  invalid_refresh_token: 'invalidToken',
  google_auth_failed: 'googleAuthFailed',
  use_google_login: 'useGoogleLogin',
  list_not_found: 'listNotFound',
  item_already_in_list: 'itemAlreadyInList',
  item_not_found: 'itemNotFound',
  movie_not_found: 'movieNotFound',
  screening_cancelled: 'screeningCancelled',
  news_not_found: 'newsNotFound',
  comment_not_found: 'commentNotFound',
  review_not_found: 'reviewNotFound',
  notification_not_found: 'notificationNotFound',
  user_not_identified: 'unauthorized',
  generic: 'generic',
};

/** Старые текстовые ответы (EN/RU) → ключ i18n */
const LEGACY_MESSAGE_KEYS = {
  'Screening has already started.': 'screeningStarted',
  'Screening has already started or ended.': 'screeningStartedOrEnded',
  'Screening not found.': 'screeningNotFound',
  'Сеанс уже начался.': 'screeningStarted',
  'Сеанс уже начался или завершился.': 'screeningStartedOrEnded',
  'Сеанс не найден.': 'screeningNotFound',
  'Seat not found for this screening.': 'seatNotFound',
  'Место не найдено для этого сеанса.': 'seatNotFound',
  'Seat not in this booking.': 'seatNotInBooking',
  'Место не входит в это бронирование.': 'seatNotInBooking',
  'Food item not found.': 'foodNotFound',
  'Позиция меню не найдена.': 'foodNotFound',
  'Cannot pay for an empty cart.': 'emptyCart',
  'Нельзя оплатить пустую корзину.': 'emptyCart',
  'Booking not found.': 'bookingNotFound',
  'Бронирование не найдено.': 'bookingNotFound',
  'Booking is not in pending state.': 'bookingNotPending',
  'Бронирование не в статусе ожидания.': 'bookingNotPending',
  'Booking does not belong to this user.': 'bookingAccessDenied',
  'Бронирование принадлежит другому пользователю.': 'bookingAccessDenied',
  'Payment verification failed.': 'paymentFailed',
  'Не удалось подтвердить оплату.': 'paymentFailed',
  'Invalid email or password.': 'invalidCredentials',
  'Неверный email или пароль.': 'invalidCredentials',
  'Email is already registered.': 'emailRegistered',
  'Этот email уже зарегистрирован.': 'emailRegistered',
  'Invalid or expired refresh token.': 'invalidToken',
  'Недействительный или просроченный токен.': 'invalidToken',
  'Этот фильм снят с проката и недоступен для бронирования.': 'movieArchived',
  'Одно или несколько мест недоступны для этого сеанса.': 'seatsInvalid',
  'Bad Request': 'generic',
  'Not Found': 'generic',
  Unauthorized: 'unauthorized',
  'Internal Server Error': 'generic',
};

function looksLikeEnglish(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const cyrillic = (trimmed.match(/[а-яёА-ЯЁіўІЎ]/g) || []).length;
  const latin = (trimmed.match(/[a-zA-Z]/g) || []).length;
  return latin > 0 && cyrillic === 0;
}

function translateKey(t, keySuffix, params) {
  const fullKey = `apiErrors.${keySuffix}`;
  const translated = t(fullKey, params || {});
  if (translated !== fullKey) return translated;
  return t('apiErrors.generic');
}

/**
 * @param {string|undefined} message
 * @param {(key: string, vars?: object) => string} t
 * @param {{ code?: string, params?: object }} [meta]
 */
export function resolveApiError(message, t, meta = {}) {
  const { code, params } = meta;

  if (code) {
    const keySuffix = API_ERROR_I18N[code];
    if (keySuffix) return translateKey(t, keySuffix, params);
  }

  const raw = (message || '').trim();
  if (raw) {
    const legacyKey = LEGACY_MESSAGE_KEYS[raw];
    if (legacyKey) return translateKey(t, legacyKey, params);
    if (!looksLikeEnglish(raw)) return raw;
  }

  return t('apiErrors.generic');
}

/** @param {Error & { code?: string, params?: object }} err */
export function resolveApiErrorFromException(err, t) {
  return resolveApiError(err?.message, t, { code: err?.code, params: err?.params });
}
