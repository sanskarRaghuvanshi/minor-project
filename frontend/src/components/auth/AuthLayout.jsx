const FEATURES = [
  {
    icon: 'group',
    color: 'blue',
    title: 'Simplify Your Workflow',
    desc: 'Manage classes and attendance effortlessly in one place.',
  },
  {
    icon: 'verified_user',
    color: 'green',
    title: 'Secure & Trusted',
    desc: 'Enterprise-grade security to keep your data safe and private.',
  },
  {
    icon: 'monitoring',
    color: 'purple',
    title: 'Insightful Reports',
    desc: 'Get real-time insights and analytics to track academic progress.',
  },
  {
    icon: 'notifications',
    color: 'orange',
    title: 'Stay Connected',
    desc: 'Communicate and collaborate easily with students and staff.',
  },
];

const AuthLayout = ({ children }) => (
  <div className="auth-split">
    <div className="auth-split__promo">
      <div className="auth-split__blob auth-split__blob--1" aria-hidden="true" />
      <div className="auth-split__blob auth-split__blob--2" aria-hidden="true" />

      <span className="auth-split__badge">
        <span className="material-symbols-outlined" aria-hidden="true">school</span>
        SMARTER EDUCATION, BETTER TOMORROW
      </span>

      <h1 className="auth-split__title">
        Empowering Educators,<br />
        <span>Building Futures</span>
      </h1>

      <p className="auth-split__subtitle">
        Join AttendIQ and simplify attendance management, focus more on teaching,
        and inspire every student.
      </p>

      <ul className="auth-split__features">
        {FEATURES.map((f) => (
          <li key={f.title} className="auth-feature">
            <span className={`auth-feature__icon auth-feature__icon--${f.color}`} aria-hidden="true">
              <span className="material-symbols-outlined">{f.icon}</span>
            </span>
            <span className="auth-feature__body">
              <span className="auth-feature__title">{f.title}</span>
              <span className="auth-feature__desc">{f.desc}</span>
            </span>
          </li>
        ))}
      </ul>

      <blockquote className="auth-split__quote">
        “Great teachers don&apos;t just teach, they <strong>shape the future</strong>.” ⭐
      </blockquote>
    </div>

    <div className="auth-split__form-panel">
      <div className="auth-split__form-inner">
        {children}
      </div>
    </div>
  </div>
);

export default AuthLayout;
