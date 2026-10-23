import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useProfileCabinet } from '../../context/useProfileCabinet';
import { useI18n } from '../../context/useI18n';
import PaymentCard from '../../components/PaymentCard';
import CurrencySymbol from '../../components/CurrencySymbol';
import { setPrimaryPaymentCard, sanitizeCardHolderName } from '../../utils/paymentCards';
import { formatCardNumberInput, formatExpiryInput } from '../../hooks/useProfileCabinetState';

function levelVisualClass(lvl) {
  if (lvl === 'Premium') return 'premium';
  if (lvl === 'Gold') return 'gold';
  if (lvl === 'Silver') return 'silver';
  return 'standard';
}

export default function ProfileSettings() {
  const { t, locale, setLocale, locales } = useI18n();
  const [pendingLocale, setPendingLocale] = useState(locale);

  useEffect(() => {
    setPendingLocale(locale);
  }, [locale]);
  const {
    user,
    profile,
    level,
    loyaltySummary,
    loyaltyTicketDiscountPercent,
    bonusEarnMultiplier,
    bonusBalance,
    ticketsPurchased,
    totalSpent,
    levelProgress,
    displayName,
    setDisplayName,
    avatarPreview,
    setAvatarPreview,
    avatarInputRef,
    activeCard,
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
    handleSaveProfile,
    handleLogout,
    handleDeleteCard,
    handleAddCard,
    handleAvatarChange,
    initials,
    paidBookingsCount,
    wantToWatchCount,
  } = useProfileCabinet();

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setLocale(pendingLocale);
    handleSaveProfile(e);
  };

  return (
    <>
      <div className="profile-tab-panel profile-settings-layout">
        <div className="profile-settings-col profile-settings-col--left">
          <section className="glass-card ui-glass-panel profile-cabinet-overview">
            <div className="profile-overview-main">
              <div className="profile-avatar-lg profile-avatar-lg--compact">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={profile?.displayName || user?.displayName || t('profile.cabinetAvatarAlt')}
                    className="profile-avatar-image"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="profile-info profile-info--compact">
                <span className="profile-kicker">{t('nav.personalCabinet')}</span>
                <h2 className="profile-overview-name">{profile?.displayName || user?.displayName}</h2>
                <p className="profile-overview-email">{profile?.email || user?.email}</p>
                <div className="profile-badge-row">
                  <span className={`profile-level-badge ${levelVisualClass(level)}`}>{level}</span>
                  <span className="profile-balance-pill">
                    {bonusBalance} {t('profile.bonusPillSuffix')}
                  </span>
                </div>
              </div>
            </div>
            <div className="profile-overview-stats">
              <div className="profile-hero-stat">
                <span>{t('profile.paidBookings')}</span>
                <strong>{paidBookingsCount}</strong>
              </div>
              <div className="profile-hero-stat">
                <span>{t('nav.wantToWatch')}</span>
                <strong>{wantToWatchCount}</strong>
              </div>
              <div className="profile-hero-stat">
                <span>{t('profile.savedCards')}</span>
                <strong>{savedCards.length}</strong>
              </div>
              <div className="profile-hero-stat">
                <span>{t('profile.spent')}</span>
                <strong>
                  {totalSpent.toFixed(2)} <CurrencySymbol />
                </strong>
              </div>
            </div>
          </section>

        <section className="glass-card ui-glass-panel profile-card-section">
          <div className="profile-section-head">
            <div className="profile-section-head-text">
              <h3>{t('profile.linkedCard')}</h3>
              <p className="ui-field-hint">{t('profile.linkedCardDesc')}</p>
            </div>
            <div className="profile-card-actions">
              {activeCard && <span className="primary-card-badge">{t('profile.primaryCard')}</span>}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddCardModal(true)}>
                {t('profile.addCard')}
              </button>
            </div>
          </div>
          <div
            className={`profile-card-body${savedCards.length > 0 ? ' profile-card-body--with-list' : ''}`}
          >
            <div className="profile-card-showcase">
              {activeCard?.cardNumber ? (
                <div className="profile-card-preview profile-card-preview--hero">
                  <PaymentCard
                    cardNumber={activeCard.cardNumber}
                    cardName={activeCard.cardName || profile?.displayName || user?.displayName}
                    cardExpiry={activeCard.cardExpiry}
                  />
                </div>
              ) : (
                <div className="profile-card-empty">
                  <strong>{t('profile.noCard')}</strong>
                  <p>{t('profile.noCardHint')}</p>
                  <Link to="/catalog" className="btn btn-secondary btn-sm">
                    {t('profile.goCatalog')}
                  </Link>
                </div>
              )}
            </div>
            {savedCards.length > 0 && (
              <div className="profile-saved-cards-footer">
                <div className="profile-saved-cards-list">
                  {savedCards.map((card) => (
                    <div key={card.id} className={`saved-payment-card-row ${activeCardId === card.id ? 'active' : ''}`}>
                      <button
                        type="button"
                        className={`saved-payment-card ${activeCardId === card.id ? 'active' : ''}`}
                        onClick={() => {
                          setActiveCardId(card.id);
                          if (user?.id) setPrimaryPaymentCard(user.id, card.id);
                        }}
                      >
                        <div className="saved-payment-card-art" />
                        <div className="saved-payment-card-meta">
                          <div className="saved-payment-card-title-row">
                            <strong>{card.brand}</strong>
                            {activeCardId === card.id && (
                              <span className="saved-payment-card-badge">{t('profile.primary')}</span>
                            )}
                          </div>
                          <span>{card.maskedNumber}</span>
                          <small>{card.cardExpiry}</small>
                        </div>
                      </button>
                      <button type="button" className="saved-payment-card-delete" onClick={() => setCardPendingDelete(card)}>
                        {t('profile.delete')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

          <section className="glass-card ui-glass-panel profile-quick-links" aria-labelledby="profile-quick-links-title">
            <h3 id="profile-quick-links-title" className="catalog-filter-field-label">
              {t('profile.quickLinks')}
            </h3>
            <nav className="profile-quick-links-nav">
              <NavLink to="/profile/tickets" className="profile-quick-link">
                <span className="profile-quick-link-label">{t('profile.quickTickets')}</span>
                {paidBookingsCount > 0 && (
                  <span className="profile-quick-link-badge">{paidBookingsCount}</span>
                )}
              </NavLink>
              <NavLink to="/profile/lists" className="profile-quick-link">
                <span className="profile-quick-link-label">{t('profile.quickWatchlist')}</span>
                {wantToWatchCount > 0 && (
                  <span className="profile-quick-link-badge">{wantToWatchCount}</span>
                )}
              </NavLink>
              <NavLink to="/catalog" className="profile-quick-link">
                <span className="profile-quick-link-label">{t('profile.quickCatalog')}</span>
              </NavLink>
              <NavLink to="/exclusive" className="profile-quick-link">
                <span className="profile-quick-link-label">{t('profile.quickExclusive')}</span>
              </NavLink>
            </nav>
          </section>
        </div>

        <aside className="profile-settings-col profile-settings-col--right">
        <form onSubmit={handleFormSubmit} className="glass-card ui-glass-panel profile-settings-form">
            <div className="profile-avatar-settings" aria-labelledby="profile-avatar-heading">
              <h3 id="profile-avatar-heading" className="catalog-filter-field-label profile-avatar-settings-label">
                {t('profile.avatarPhoto')}
              </h3>
              <div className="profile-avatar-settings-row">
                <div className="profile-avatar-preview">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={t('profile.avatarAlt')} className="profile-avatar-preview-image" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="profile-avatar-controls">
                  <p className="ui-field-hint">{t('profile.avatarHint')}</p>
                  <div className="profile-avatar-buttons">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => avatarInputRef.current?.click()}>
                      {t('profile.choosePhoto')}
                    </button>
                    {avatarPreview && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAvatarPreview('')}>
                        {t('profile.removePhoto')}
                      </button>
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="profile-avatar-input"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="catalog-filter-field-label" htmlFor="profile-display-name">
                {t('profile.name')}
              </label>
              <input
                id="profile-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="profile-settings-form-foot">
              <div className="form-group catalog-filter-field profile-locale-field">
                <span className="catalog-filter-field-label" id="profile-locale-label">
                  {t('profile.language')}
                </span>
                <p className="ui-field-hint">{t('profile.languageHint')}</p>
                <div className="profile-locale-stack" role="radiogroup" aria-labelledby="profile-locale-label">
                  {locales.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      role="radio"
                      aria-checked={pendingLocale === l.code}
                      className={`profile-locale-option${pendingLocale === l.code ? ' active' : ''}`}
                      onClick={() => setPendingLocale(l.code)}
                    >
                      {t(l.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="profile-settings-actions">
                <button type="submit" className="btn btn-primary">
                  {t('profile.save')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                  {t('profile.logout')}
                </button>
              </div>
            </div>
          </form>

          <section className="glass-card ui-glass-panel profile-loyalty-card">
            <div className="profile-section-head">
              <div className="profile-section-head-text">
                <h3>{t('profile.bonusesLevel')}</h3>
                <p className="ui-field-hint">{t('profile.bonusesDesc')}</p>
              </div>
              <span className={`profile-level-badge ${levelVisualClass(level)}`}>{level}</span>
            </div>
            <div className="profile-level-progress-card">
              <div className="profile-level-progress-head">
                <strong>
                  {t('profile.currentLevel')}: {level}
                </strong>
                <span>{levelProgress.percent}%</span>
              </div>
              <div className="profile-level-progress-track" aria-hidden="true">
                <div
                  className={`profile-level-progress-fill ${levelVisualClass(level)}`}
                  style={{ width: `${levelProgress.percent}%` }}
                />
              </div>
              <p className="profile-level-progress-hint">
                {levelProgress.summary ??
                  <>До Premium осталось {levelProgress.premiumSpentLeft} <CurrencySymbol /> или {levelProgress.premiumTicketsLeft} бил.</>}
              </p>
              {loyaltySummary && (
                <p className="profile-loyalty-api-summary" style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                  {loyaltySummary}
                </p>
              )}
            </div>
            <div className="profile-loyalty-grid">
              <div className="profile-loyalty-item">
                <span>{t('profile.bonuses')}</span>
                <strong>{bonusBalance}</strong>
              </div>
              <div className="profile-loyalty-item">
                <span>{t('profile.tickets')}</span>
                <strong>{ticketsPurchased}</strong>
              </div>
              <div className="profile-loyalty-item">
                <span>{t('profile.spent')}</span>
                <strong>{totalSpent.toFixed(2)} <CurrencySymbol /></strong>
              </div>
              <div className="profile-loyalty-item">
                <span>{t('profile.ticketDiscount')}</span>
                <strong>{loyaltyTicketDiscountPercent}%</strong>
              </div>
              <div className="profile-loyalty-item profile-loyalty-item--bonus-earn">
                <span>{t('profile.bonusEarn')}</span>
                <strong>10% × {Number(bonusEarnMultiplier).toFixed(2)}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {cardPendingDelete && (
        <div className="modal-backdrop modal-backdrop--glass active">
          <div className="modal modal--glass confirm-modal" style={{ maxWidth: 420 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>{t('profile.deleteCardTitle')}</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20 }}>
              {t('receipt.cardPrefix')} <strong>{cardPendingDelete.maskedNumber}</strong> {t('profile.deleteCardBodyAfterMask')}
            </p>
            <div className="payment-actions" style={{ marginTop: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCardPendingDelete(null)}>
                {t('profile.cancel')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => handleDeleteCard(cardPendingDelete.id)}>
                {t('profile.deleteCardConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddCardModal && (
        <div className="modal-backdrop modal-backdrop--glass active">
          <div className="modal modal--glass" style={{ maxWidth: 460 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>{t('profile.addCardTitle')}</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20 }}>{t('profile.addCardHint')}</p>
            <form onSubmit={handleAddCard} className="payment-form">
              <label className="payment-field">
                <span>{t('profile.cardNumber')}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={newCardNumber}
                  onChange={(e) => setNewCardNumber(formatCardNumberInput(e.target.value))}
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
                    value={newCardExpiry}
                    onChange={(e) => setNewCardExpiry(formatExpiryInput(e.target.value))}
                    required
                  />
                </label>
                <label className="payment-field">
                  <span>{t('profile.holder')}</span>
                  <input
                    type="text"
                    placeholder={t('booking.cardNamePh')}
                    value={newCardName}
                    onChange={(e) => setNewCardName(sanitizeCardHolderName(e.target.value))}
                    required
                  />
                </label>
              </div>
              <div className="payment-actions" style={{ marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddCardModal(false);
                    setNewCardNumber('');
                    setNewCardName('');
                    setNewCardExpiry('');
                  }}
                >
                  {t('profile.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('profile.saveCard')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
