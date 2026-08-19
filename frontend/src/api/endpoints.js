const BASE = '/api/v1';

export const ENDPOINTS = {
  AUTH: {
    REGISTER: `${BASE}/auth/register`,
    LOGIN: `${BASE}/auth/login`,
    REFRESH: `${BASE}/auth/refresh`,
    LOGOUT: `${BASE}/auth/logout`,
    ME: `${BASE}/auth/me`,
    FORGOT_PASSWORD: `${BASE}/auth/forgot-password`,
    RESET_PASSWORD: (token) => `${BASE}/auth/reset-password/${token}`,
  },
  BRANCHES: {
    LIST: `${BASE}/branches`,
    CLASSES: (name) => `${BASE}/branches/${name}/classes`,
    SUBJECTS: (name, className) => `${BASE}/branches/${name}/classes/${className}/subjects`,
  },
  ADMIN: {
    DASHBOARD_STATS: `${BASE}/admin/dashboard-stats`,
    USERS: `${BASE}/admin/users`,
    TOGGLE_USER_STATUS: (id) => `${BASE}/admin/users/${id}/status`,
    BRANCHES: `${BASE}/admin/branches`,
  },
  LEAVE: {
    APPLY: `${BASE}/leave/apply`,
    MY_LEAVES: `${BASE}/leave/my-leaves`,
    PENDING: `${BASE}/leave/pending`,
    ALL: `${BASE}/leave/all`,
    REVIEW: (id) => `${BASE}/leave/${id}/review`,
  },
  FACULTY: {
    STUDENTS: `${BASE}/faculty/students`,
    ATTENDANCE: `${BASE}/faculty/attendance`,
    ATTENDANCE_BY_DATE_SUBJECT: (date, subject) => `${BASE}/faculty/attendance/${date}/${subject}`,
    DEFAULTERS: `${BASE}/faculty/defaulters`,
    NOTIFY_DEFAULTERS: `${BASE}/faculty/notify-defaulters`,
    FEEDBACK: `${BASE}/faculty/feedback`,
    FEEDBACK_HISTORY: `${BASE}/faculty/feedback-history`,
    DASHBOARD_STATS: `${BASE}/faculty/dashboard-stats`,
  },
  COORDINATOR: {
    STUDENTS: `${BASE}/coordinator/students`,
    TEACHERS: `${BASE}/coordinator/teachers`,
    FEEDBACK: `${BASE}/coordinator/feedback`,
  },
  STUDENT: {
    MY_ATTENDANCE: `${BASE}/student/my-attendance`,
    STATS: `${BASE}/student/stats`,
    ELIGIBILITY: `${BASE}/student/eligibility`,
  },
  HEALTH: `${BASE}/health`,
};

export default ENDPOINTS;
