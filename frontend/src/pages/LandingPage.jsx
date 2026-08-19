import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: '✅', title: 'Quick Attendance', desc: 'Mark attendance for entire class in under 30 seconds with bulk actions.' },
  { icon: '📊', title: 'Real-time Stats', desc: 'View attendance statistics with beautiful visual indicators and progress bars.' },
  { icon: '⚠️', title: 'Defaulter Alerts', desc: 'Automatically identify students below 75% and send email notifications.' },
  { icon: '📝', title: 'Feedback System', desc: 'Submit class feedback with ratings and track teaching history.' },
  { icon: '🎯', title: 'Eligibility Check', desc: 'Know exactly how many classes needed to reach 75% attendance.' },
  { icon: '🌙', title: 'Dark Mode', desc: 'Work comfortably with built-in dark mode that respects system preferences.' },
];

const LandingPage = () => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={user.role === 'faculty' ? '/faculty/dashboard' : '/student/dashboard'} replace />;
  }
  return (
  <div className="landing">
    <header className="landing__header">
      <div className="landing__nav">
        <h1 className="landing__logo">Smart Attendance</h1>
        <div className="landing__actions">
          <Link to="/login" className="btn btn--ghost">Log In</Link>
          <Link to="/register/student" className="btn btn--primary">Get Started</Link>
        </div>
      </div>
    </header>
    <main>
      <section className="hero">
        <div className="hero__content">
          <h2 className="hero__title">Track Attendance,<br />Boost Performance</h2>
          <p className="hero__subtitle">
            A modern attendance management system for educational institutions.
            Mark, track, and analyze student attendance effortlessly.
          </p>
          <div className="hero__actions">
            <Link to="/register/student" className="btn btn--primary btn--lg">Student Registration</Link>
            <Link to="/register/faculty" className="btn btn--secondary btn--lg">Faculty Registration</Link>
          </div>
        </div>
      </section>
      <section className="features" aria-label="Features">
        <div className="features__grid">
          {features.map((f) => (
            <article key={f.title} className="feature-card card">
              <span className="feature-card__icon" aria-hidden="true">{f.icon}</span>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
    <footer className="landing__footer">
      <p>&copy; {new Date().getFullYear()} Smart Attendance System. All rights reserved.</p>
    </footer>
  </div>
  );
};

export default LandingPage;
