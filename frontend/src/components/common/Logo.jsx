const Logo = ({ size = 40, showText = true, tagline, className = '' }) => (
  <div className={`logo ${className}`} style={{ '--logo-size': `${size}px` }}>
    <span className="logo__badge" aria-hidden="true">
      <span
        className="material-symbols-outlined logo__icon"
        style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
      >
        school
      </span>
      <span className="logo__check" aria-hidden="true">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
          check_circle
        </span>
      </span>
    </span>
    {showText && (
      <span className="logo__text">
        <span className="logo__wordmark">Attend<span className="logo__wordmark-accent">IQ</span></span>
        {tagline && <span className="logo__tagline">{tagline}</span>}
      </span>
    )}
  </div>
);

export default Logo;
