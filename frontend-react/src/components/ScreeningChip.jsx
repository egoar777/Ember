import { Link } from 'react-router-dom';
import { useI18n } from '../context/useI18n';
import CurrencySymbol from './CurrencySymbol';
import {
  getStartsSoonMinutes,
  isCheapestScreening,
  isFewSeats,
} from '../utils/screeningUi';

export default function ScreeningChip({ screening, dayScreenings }) {
  const { t } = useI18n();
  const startsSoonMin = getStartsSoonMinutes(screening.startTime);
  const fewSeats = isFewSeats(screening);
  const cheapest = isCheapestScreening(screening, dayScreenings);
  const note = screening.pricingNote?.trim();

  return (
    <Link to={`/booking?screeningId=${screening.id}`} className="screening-chip">
      <span className="screening-chip__time">{screening._timeStr}</span>
      <span className="screening-chip__meta">
        {screening.hallName}
        {screening.format ? ` · ${screening.format}` : ''}
      </span>
      {screening.language ? (
        <span className="screening-chip__lang">
          {t('movie.langSession')}: {screening.language}
        </span>
      ) : null}
      <div className="screening-chip__footer">
        <span className="screening-chip__price">
          {Number(screening.basePrice).toFixed(2)} <CurrencySymbol />
        </span>
      </div>
      {(fewSeats || startsSoonMin != null || cheapest || note || screening.isPremiere || screening.isExclusive) && (
        <div className="screening-chip__badges">
          {screening.isPremiere && (
            <span className="screening-chip__badge screening-chip__badge--accent">{t('movie.screeningPremiere')}</span>
          )}
          {screening.isExclusive && (
            <span className="screening-chip__badge screening-chip__badge--accent">{t('movie.screeningExclusive')}</span>
          )}
          {fewSeats && (
            <span className="screening-chip__badge screening-chip__badge--warn">{t('movie.screeningFewSeats')}</span>
          )}
          {startsSoonMin != null && (
            <span className="screening-chip__badge">{t('movie.screeningStartsSoon', { minutes: startsSoonMin })}</span>
          )}
          {cheapest && (
            <span className="screening-chip__badge screening-chip__badge--deal">{t('movie.screeningBestPrice')}</span>
          )}
          {note && <span className="screening-chip__badge screening-chip__badge--muted">{note}</span>}
        </div>
      )}
    </Link>
  );
}
