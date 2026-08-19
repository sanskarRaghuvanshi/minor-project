export const ATTENDANCE_THRESHOLD = 75;
export const ATTENDANCE_STATUSES = ['present', 'absent', 'excused'];

export const STATUS_BADGE = {
  present: { label: 'Present', className: 'badge badge--success' },
  absent: { label: 'Absent', className: 'badge badge--danger' },
  excused: { label: 'Excused', className: 'badge badge--warning' },
};

export const PERCENTAGE_COLOR = (pct) => {
  if (pct >= 75) return 'green';
  if (pct >= 60) return 'yellow';
  return 'red';
};

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
};
