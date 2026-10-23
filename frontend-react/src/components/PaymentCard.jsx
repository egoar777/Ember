import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../context/useI18n';
import { getCardBrand, maskCardNumber } from '../utils/paymentCards';

export default function PaymentCard({ cardNumber, cardName, cardExpiry, compact = false }) {
  const { t } = useI18n();
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef(null);
  const highlightFrontRef = useRef(null);
  const highlightBackRef = useRef(null);
  const frameRef = useRef(null);

  const formattedNumber = useMemo(() => maskCardNumber(cardNumber), [cardNumber]);
  const brand = useMemo(() => getCardBrand(cardNumber), [cardNumber]);
  const holderName = useMemo(() => {
    const value = (cardName || '').trim();
    return value || 'EMBER USER';
  }, [cardName]);
  const expiry = useMemo(() => (cardExpiry || '00/00').trim(), [cardExpiry]);

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    }
    if (highlightFrontRef.current) {
      highlightFrontRef.current.style.transform = 'translate(0%, 0%)';
    }
    if (highlightBackRef.current) {
      highlightBackRef.current.style.transform = 'translate(0%, 0%)';
    }
  }, [isFlipped]);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const handleMouseMove = (event) => {
    if (window.innerWidth < 768 || !cardRef.current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 14;
    const baseRotateY = isFlipped ? 180 : 0;
    const highlightTransform = `translate(${((x - centerX) / centerX) * -20}%, ${((y - centerY) / centerY) * -20}%)`;

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      cardRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${baseRotateY + rotateY}deg)`;
      if (highlightFrontRef.current) {
        highlightFrontRef.current.style.transform = highlightTransform;
      }
      if (highlightBackRef.current) {
        highlightBackRef.current.style.transform = highlightTransform;
      }
    });
  };

  const handleMouseLeave = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    if (cardRef.current) {
      cardRef.current.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    }
    if (highlightFrontRef.current) {
      highlightFrontRef.current.style.transform = 'translate(0%, 0%)';
    }
    if (highlightBackRef.current) {
      highlightBackRef.current.style.transform = 'translate(0%, 0%)';
    }
  };

  return (
    <div className={`payment-card-panel${compact ? ' payment-card-panel--compact' : ''}`}>
      <div className="payment-card-ambient-light" />
      <div
        className="payment-card-scene"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <button
          ref={cardRef}
          type="button"
          className={`payment-card-object ${isFlipped ? 'is-flipped' : ''}`}
          onClick={() => setIsFlipped((value) => !value)}
          aria-label={isFlipped ? t('paymentCard.flipToFront') : t('paymentCard.flipToBack')}
        >
          <div className="payment-card-face payment-card-front">
            <div ref={highlightFrontRef} className="payment-card-specular-highlight" />
            <div className="payment-card-top-logo" aria-hidden="true">
              ember<span className="payment-card-top-logo-dot">.</span>
            </div>
            <div className="payment-card-header">
              <div className="payment-card-chip" />
              <svg
                className="payment-card-contactless-icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
            </div>

            <div className="payment-card-number">{formattedNumber}</div>

            <div className="payment-card-footer">
              <div className="payment-card-holder">
                <span className="payment-card-label">Card Holder</span>
                <span className="payment-card-value">{holderName}</span>
              </div>
              <div className="payment-card-expiry">
                <span className="payment-card-label">Expires</span>
                <span className="payment-card-value">{expiry}</span>
              </div>
              <div className="payment-card-brand">{brand}</div>
            </div>
          </div>

          <div className="payment-card-face payment-card-back">
            <div ref={highlightBackRef} className="payment-card-specular-highlight" />
            <div className="payment-card-magnetic-strip" />

            <div className="payment-card-cvv-section">
              <span className="payment-card-label">Security Code</span>
              <div className="payment-card-cvv-display">
                <span>•••</span>
                <span className="payment-card-cvv-caption">(CVV)</span>
              </div>
              <span className="payment-card-security-note">{t('paymentCard.cvvStored')}</span>
            </div>

            <div className="payment-card-footer payment-card-back-footer">
              <div className="payment-card-brand payment-card-brand-muted">{brand} PLATINUM</div>
            </div>
          </div>
        </button>
        {!compact && <div className="payment-card-action-hint">{t('paymentCard.clickFlip')}</div>}
      </div>
    </div>
  );
}
