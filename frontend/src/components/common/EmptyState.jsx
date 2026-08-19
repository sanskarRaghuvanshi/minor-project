const EmptyState = ({ icon = '📋', title = 'No data found', message = '', actionLabel, onAction }) => (
  <div className="empty-state" role="status">
    <div className="empty-state__icon" aria-hidden="true">{icon}</div>
    <h3 className="empty-state__title">{title}</h3>
    {message && <p className="empty-state__message">{message}</p>}
    {actionLabel && onAction && (
      <button className="btn btn--primary" onClick={onAction} type="button">
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
