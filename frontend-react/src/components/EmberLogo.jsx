export default function EmberLogo({ size = 'lg', className = '' }) {
  return (
    <span className={`ember-logo ember-logo--${size} ${className}`.trim()}>
      ember<span className="ember-logo__dot">.</span>
    </span>
  );
}
