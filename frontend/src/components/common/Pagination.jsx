const Pagination = ({ page, totalPages, total, limit, onPageChange, onLimitChange }) => {
  if (totalPages <= 1 && total <= limit) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="pagination" role="navigation" aria-label="Pagination">
      <span className="pagination__info">
        {startItem}–{endItem} of {total}
      </span>
      <div className="pagination__controls">
        <button
          className="pagination__btn"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          aria-label="First page"
          type="button"
        >
          ««
        </button>
        <button
          className="pagination__btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          type="button"
        >
          «
        </button>
        {getPageNumbers(page, totalPages).map((p, i) => (
          <button
            key={p === '...' ? `ellipsis-${i}` : p}
            className={`pagination__btn pagination__btn--${p === page ? 'active' : ''}`}
            onClick={() => p !== '...' && onPageChange(p)}
            disabled={p === '...'}
            aria-label={p === '...' ? 'More pages' : `Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
            type="button"
          >
            {p}
          </button>
        ))}
        <button
          className="pagination__btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          type="button"
        >
          »
        </button>
        <button
          className="pagination__btn"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          aria-label="Last page"
          type="button"
        >
          »»
        </button>
      </div>
      <div className="pagination__limit">
        <label htmlFor="items-per-page">Per page:</label>
        <select
          id="items-per-page"
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="pagination__select"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i += 1) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i += 1) pages.push(i);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
}

export default Pagination;
