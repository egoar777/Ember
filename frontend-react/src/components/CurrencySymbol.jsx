export default function CurrencySymbol({ className = '', title = 'BYN' }) {
  const mergedClassName = ['currency-symbol', className].filter(Boolean).join(' ');

  return (
    <span
      className={mergedClassName}
      role="img"
      aria-label={title}
    />
  );
}
