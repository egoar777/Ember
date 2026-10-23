const FEW_SEATS_MIN = 8;
const FEW_SEATS_RATIO = 0.12;
const STARTS_SOON_MS = 90 * 60 * 1000;

export function screeningSeatCounts(screening) {
  const available = screening.availableSeatsCount ?? screening.AvailableSeatsCount;
  const total = screening.totalSeatsCount ?? screening.TotalSeatsCount;
  return { available, total };
}

export function isFewSeats(screening) {
  const { available, total } = screeningSeatCounts(screening);
  if (available == null || total == null || total <= 0) return false;
  const threshold = Math.max(FEW_SEATS_MIN, Math.ceil(total * FEW_SEATS_RATIO));
  return available <= threshold;
}

export function getStartsSoonMinutes(startTime) {
  const ms = new Date(startTime).getTime() - Date.now();
  if (ms <= 0 || ms > STARTS_SOON_MS) return null;
  return Math.max(1, Math.ceil(ms / 60000));
}

export function dayMinPrice(screenings) {
  if (!screenings?.length) return null;
  return Math.min(...screenings.map((s) => Number(s.basePrice)));
}

export function isCheapestScreening(screening, screenings) {
  if (!screenings || screenings.length < 2) return false;
  const min = dayMinPrice(screenings);
  return Number(screening.basePrice) === min;
}
