const Skeleton = ({ variant = 'text', width, height, count = 1, className = '' }) => {
  const style = {
    width: width || (variant === 'card' ? '100%' : '100%'),
    height: height || (variant === 'card' ? '200px' : variant === 'avatar' ? '48px' : '16px'),
  };

  return (
    <div className={`skeleton-wrapper ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`skeleton skeleton--${variant}`}
          style={i > 0 ? { ...style, marginTop: '8px' } : style}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="skeleton-table" role="status" aria-label="Loading table">
    <div className="skeleton-table__header">
      {Array.from({ length: cols }, (_, i) => (
        <div key={i} className="skeleton skeleton--text" style={{ height: '20px' }} />
      ))}
    </div>
    {Array.from({ length: rows }, (_, r) => (
      <div key={r} className="skeleton-table__row">
        {Array.from({ length: cols }, (_, c) => (
          <div key={c} className="skeleton skeleton--text" style={{ height: '16px', width: `${60 + Math.random() * 40}%` }} />
        ))}
      </div>
    ))}
  </div>
);

export default Skeleton;
