import { useLocation } from 'react-router-dom';

const PROMO_DATA = {
  student: {
    badge: 'SMART ATTENDANCE, SMARTER FUTURE',
    title: 'Your Journey Starts',
    titleHighlight: 'Here',
    subtitle: 'Join AttendIQ and experience a smarter way to manage attendance, learn better, and grow every day.',
    features: [
      { icon: 'person', color: 'blue', title: 'Easy & Seamless Registration', desc: 'Create your student account in just a few simple steps.' },
      { icon: 'verified_user', color: 'green', title: 'Secure & Reliable', desc: 'Your data is protected with enterprise-grade security.' },
      { icon: 'monitoring', color: 'purple', title: 'Track & Improve', desc: 'Monitor your attendance and academic progress in real-time.' },
      { icon: 'notifications', color: 'orange', title: 'Stay Notified', desc: 'Get instant alerts and important updates anytime, anywhere.' },
    ],
    quote: 'Every day is a step toward your goals. Let AttendIQ be a part of your success. 🌟',
    quoteHighlight: 'your success. 🌟',
    quotePre: 'Every day is a step toward your goals. Let AttendIQ be a part of ',
  },
  coordinator: {
    badge: 'SMARTER EDUCATION, BETTER TOMORROW',
    title: 'Empowering Education, Driving',
    titleHighlight: 'Excellence',
    subtitle: 'As a coordinator, you have complete control to manage students, teachers, subjects, classes, and attendance — all in one place.',
    features: [
      { icon: 'groups', color: 'blue', title: 'Centralized Control', desc: 'Manage students, teachers, classes, subjects, and attendance from one dashboard.' },
      { icon: 'verified_user', color: 'green', title: 'Secure & Reliable', desc: 'Enterprise-grade security to keep your institution data safe and private.' },
      { icon: 'monitoring', color: 'purple', title: 'Insights & Reports', desc: 'Get real-time analytics and reports to make data-driven decisions.' },
      { icon: 'notifications', color: 'orange', title: 'Smart Notifications', desc: 'Send important alerts and updates instantly to students and teachers.' },
    ],
    quotePre: 'Great coordinators don\'t just manage, they build a culture of ',
    quoteHighlight: 'success. 🌟',
  },
  faculty: {
    badge: 'SMARTER EDUCATION, BETTER TOMORROW',
    title: 'Empowering Educators, Building',
    titleHighlight: 'Futures',
    subtitle: 'Join AttendIQ and simplify attendance management, focus more on teaching, and inspire every student.',
    features: [
      { icon: 'person', color: 'blue', title: 'Simplify Your Workflow', desc: 'Manage classes and attendance effortlessly in one place.' },
      { icon: 'verified_user', color: 'green', title: 'Secure & Trusted', desc: 'Enterprise-grade security to keep your data safe and private.' },
      { icon: 'monitoring', color: 'purple', title: 'Insightful Reports', desc: 'Get real-time insights and analytics to track academic progress.' },
      { icon: 'notifications', color: 'orange', title: 'Stay Connected', desc: 'Communicate and collaborate easily with students and staff.' },
    ],
    quotePre: 'Great educators don\'t just teach, they ',
    quoteHighlight: 'shape the future. 🌟',
  },
};

const AuthLayout = ({ children, pageType }) => {
  const location = useLocation();

  let currentType = pageType;
  if (!currentType) {
    if (location.pathname.includes('/register/student')) currentType = 'student';
    else if (location.pathname.includes('/register/faculty')) currentType = 'faculty';
    else currentType = 'faculty';
  }

  const promo = PROMO_DATA[currentType] || PROMO_DATA.faculty;

  return (
    <div className="auth-split">
      {/* Background Dots Pattern */}
      <div className="auth-split__dots-pattern" aria-hidden="true">
        <svg width="120" height="120" fill="currentColor">
          <pattern id="auth-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2.5" />
          </pattern>
          <rect width="120" height="120" fill="url(#auth-dots)" />
        </svg>
      </div>

      {/* Promo Side (Desktop) */}
      <div className="auth-split__promo">
        {/* Floating Paper Airplane Vector */}
        <svg className="auth-split__paper-airplane" viewBox="0 0 260 200" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="M10,180 C80,180 90,80 180,60 C210,50 220,70 240,40" strokeWidth="2" strokeDasharray="6 6" />
          <path d="M190 110 L193 118 L201 121 L193 124 L190 132 L187 124 L179 121 L187 118 Z" fill="#93C5FD" stroke="none" opacity="0.7" />
          <g transform="translate(215, 15) rotate(-10) scale(0.95)">
            <polygon points="0,25 35,0 28,35 18,24" fill="#2563EB" stroke="none"/>
            <polygon points="35,0 28,35 15,18" fill="#3B82F6" stroke="none"/>
            <polygon points="0,25 15,18 35,0" fill="#93C5FD" stroke="none"/>
          </g>
        </svg>

        {/* Badge */}
        <span className="auth-split__badge">
          <span className="material-symbols-outlined" aria-hidden="true">school</span>
          {promo.badge}
        </span>

        {/* Heading */}
        <h1 className="auth-split__title">
          {promo.title}<br />
          <span className="auth-split__title-highlight">{promo.titleHighlight}</span>
        </h1>

        {/* Subtitle */}
        <p className="auth-split__subtitle">{promo.subtitle}</p>

        {/* Features List */}
        <ul className="auth-split__features">
          {promo.features.map((f) => (
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

        {/* Illustration & Quote Box */}
        <div className="auth-split__bottom-section">
          {/* Clean Self-contained SVG Illustration */}
          <div className="auth-illustration-svg-container" aria-hidden="true">
            <svg viewBox="0 0 440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto max-h-28">
              {/* Plant in Pot */}
              <g transform="translate(10, 20)">
                <path d="M25 65 C5 45 0 20 25 5 C50 20 45 45 25 65 Z" fill="#34D399"/>
                <path d="M25 65 Q5 35 15 10" stroke="#059669" strokeWidth="2.5" fill="none"/>
                <path d="M25 65 Q45 35 35 10" stroke="#059669" strokeWidth="2.5" fill="none"/>
                <rect x="12" y="65" width="26" height="22" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2"/>
              </g>

              {/* Stack of Books & Graduation Cap */}
              <g transform="translate(65, 25)">
                {/* Books */}
                <rect x="0" y="48" width="80" height="12" rx="2" fill="#F59E0B"/>
                <rect x="5" y="34" width="88" height="12" rx="2" fill="#06B6D4"/>
                <rect x="2" y="20" width="94" height="12" rx="2" fill="#2563EB"/>
                {/* Mortarboard Cap */}
                <g transform="translate(10, -25)">
                  <polygon points="45,5 88,24 45,43 2,24" fill="#1E293B"/>
                  <path d="M22 32 v14 c0 9 46 9 46 0 v-14" fill="#334155"/>
                  <path d="M45 24 L18 38 L18 56" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="18" cy="58" r="3" fill="#F59E0B"/>
                </g>
              </g>

              {/* Laptop with AttendIQ Logo Screen */}
              <g transform="translate(180, 10)">
                <rect x="0" y="0" width="140" height="85" rx="8" fill="#FFFFFF" stroke="#1E293B" strokeWidth="3.5"/>
                <circle cx="70" cy="30" r="14" fill="#2563EB"/>
                <path d="M70 20 L58 27 L70 34 L82 27 Z" fill="#FFFFFF"/>
                <text x="70" y="55" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="800" fontFamily="sans-serif">AttendIQ</text>
                <text x="70" y="68" textAnchor="middle" fill="#94A3B8" fontSize="6" fontWeight="500" fontFamily="sans-serif">Smart student attendance management</text>
                {/* Laptop Base */}
                <path d="M-15 85 L155 85 C155 85 150 93 140 93 L0 93 C-10 93 -15 85 -15 85 Z" fill="#94A3B8"/>
              </g>

              {/* Calendar / Checklist */}
              <g transform="translate(355, 30)">
                <rect x="0" y="0" width="45" height="55" rx="6" fill="#FFFFFF" stroke="#BFDBFE" strokeWidth="2"/>
                <rect x="0" y="0" width="45" height="12" rx="4" fill="#3B82F6"/>
                <circle cx="22.5" cy="34" r="10" fill="#DBEAFE"/>
                <path d="M17 34 L21 38 L28 30" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </svg>
          </div>

          {/* Quote Card */}
          <blockquote className="auth-split__quote">
            <div className="quote-badge">“</div>
            <p>
              {promo.quotePre}
              <span className="quote-highlight">{promo.quoteHighlight}</span>
            </p>
          </blockquote>
        </div>

      </div>

      {/* Form Panel Side */}
      <div className="auth-split__form-panel">
        <div className="auth-split__form-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
