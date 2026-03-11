/** Иконки по теме кинотеатра — SVG, единый стиль 24×24 */

export function IconClapperboard({ className, style, ...props }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="14" rx="1" />
      <path d="M3 8h18" />
      <path d="M3 12h18" />
      <rect x="10" y="17" width="4" height="4" rx="1" />
    </svg>
  );
}

export function IconSearch({ className, style, ...props }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

export function IconMic({ className, style, ...props }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

export function IconTicket({ className, style, ...props }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M4 5h16v4l-2 1.5 2 1.5v4H4v-4l2-1.5L4 9V5Z" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
