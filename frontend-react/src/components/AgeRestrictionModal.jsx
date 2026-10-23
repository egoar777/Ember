import { useEffect, useState } from 'react';
import { useI18n } from '../context/useI18n';

export default function AgeRestrictionModal(props) {
  return props.open ? <AgeRestrictionDialog key={props.minAge} {...props} /> : null;
}

function AgeRestrictionDialog({ open, minAge = 18, onConfirm, onReject }) {
  const { t } = useI18n();
  const [step, setStep] = useState('confirm');

  useEffect(() => {
    if (!open) return undefined;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [open]);

  if (!open) return null;

  const isDenied = step === 'denied';

  return (
    <div
      className="modal-backdrop modal-backdrop--age modal-backdrop--lock active"
      role="presentation"
    >
      <div
        className={`modal age-restriction-modal${isDenied ? ' age-restriction-modal--denied' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="age-restriction-title"
        aria-describedby={isDenied ? 'age-restriction-privacy' : 'age-restriction-desc'}
        onClick={(e) => e.stopPropagation()}
      >
        {isDenied ? (
          <>
            <h2 id="age-restriction-title" className="age-restriction-modal__title">
              {t('movie.ageDeniedTitle')}
            </h2>
            <p className="age-restriction-modal__message age-restriction-modal__denied-lead">
              {t('movie.ageDeniedMessage', { age: minAge })}
            </p>
            <div id="age-restriction-privacy" className="age-restriction-modal__privacy">
              <h3 className="age-restriction-modal__privacy-title">{t('movie.agePrivacyTitle')}</h3>
              <p>{t('movie.agePrivacyText')}</p>
            </div>
            <button
              type="button"
              className="btn btn-primary age-restriction-modal__ok"
              onClick={() => onReject?.()}
            >
              {t('movie.ageDeniedBack')}
            </button>
          </>
        ) : (
          <>
            <h2 id="age-restriction-title" className="age-restriction-modal__title">
              {t('movie.ageWarningTitle')}
            </h2>
            <p id="age-restriction-desc" className="age-restriction-modal__message">
              {t('movie.ageWarningMessage', { age: minAge })}
            </p>
            <p className="age-restriction-modal__question">{t('movie.ageWarningQuestion', { age: minAge })}</p>
            <div className="age-restriction-modal__actions">
              <button
                type="button"
                className="btn btn-primary age-restriction-modal__yes"
                onClick={() => onConfirm?.()}
              >
                {t('movie.ageWarningYes', { age: minAge })}
              </button>
              <button
                type="button"
                className="btn btn-secondary age-restriction-modal__no"
                onClick={() => setStep('denied')}
              >
                {t('movie.ageWarningNo', { age: minAge })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
