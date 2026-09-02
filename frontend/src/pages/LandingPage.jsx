import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';
import './LandingPage.css';

const LandingPage = () => {
  const { user } = useAuth();

  if (user) {
    if (user.role === 'faculty') return <Navigate to="/faculty/dashboard" replace />;
    if (user.role === 'coordinator') return <Navigate to="/coordinator/dashboard" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return (
    <div className="smartattend-landing">
      {/* Background Decorative Pattern */}
      <div className="landing-bg-grid" aria-hidden="true" />

      {/* Top Navigation */}
      <header className="smartattend-nav-wrapper">
        <nav className="smartattend-nav">
          <div className="smartattend-brand">
            <Logo size={32} />
          </div>

          <div className="smartattend-nav-links">
            <a href="#home" className="smartattend-nav-link active">Home</a>
            <a href="#features" className="smartattend-nav-link">Features</a>
            <a href="#about" className="smartattend-nav-link">About</a>
          </div>

          <div className="smartattend-nav-actions">
            <button className="icon-btn" title="Help" type="button" aria-label="Help">
              <span className="material-symbols-outlined">help</span>
            </button>
            <Link to="/login" className="btn-contact-sales">
              Log In
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="smartattend-main" id="home">
        <section className="smartattend-hero">
          {/* Left Column: Copy & Bento CTAs */}
          <div className="hero-left-column">
            <div className="hero-badge">NEXT GENERATION SYSTEM</div>
            <h1 className="hero-heading">Attendance. Reimagined.</h1>
            <p className="hero-description">
              Secure, seamless, and scalable attendance tracking designed for modern
              campuses and enterprise environments. Reduce administrative overhead
              with real-time analytics.
            </p>

            {/* Bento Style Portal Cards */}
            <div className="bento-portal-grid">
              {/* Faculty Portal */}
              <Link to="/login" className="bento-card group">
                <div className="bento-icon-wrapper faculty-icon">
                  <span className="material-symbols-outlined">school</span>
                </div>
                <h3 className="bento-card-title">Faculty Portal</h3>
                <span className="bento-card-subtitle">Manage classes &amp; sessions</span>
              </Link>

              {/* Student Portal */}
              <Link to="/login" className="bento-card group">
                <div className="bento-icon-wrapper student-icon">
                  <span className="material-symbols-outlined">badge</span>
                </div>
                <h3 className="bento-card-title">Student Portal</h3>
                <span className="bento-card-subtitle">View records &amp; check-in</span>
              </Link>

              {/* Admin Access */}
              <Link to="/login" className="bento-card group">
                <div className="bento-icon-wrapper admin-icon">
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                </div>
                <h3 className="bento-card-title">Admin Access</h3>
                <span className="bento-card-subtitle">System configuration</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Classroom Graphic & Floating Live Session Card */}
          <div className="hero-right-column">
            {/* Classroom Visual Banner */}
            <div className="classroom-image-card">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMzO9KqQoeIURXP_Ueu-Dr5QmVfFjTZh0L7GJnfc95icGbJMc5l1PHMwlfYpOTnafX4vRR_EMHxyqihVSsvHvaWkLkiA5hn5Q_JOb_HNQyEqRZt0ZYDaRpyDXr2nN6vYT2bp0egyuRraJlLT2-B51pkt1opoeU4pbxQroseTxA6Jn7dFM1NjQBwnYIL2D3gRNjtv9o3Q69XY58wtn1ZwfxKX0WOz-AvYYIqQqdMjCLv0cFxC01aXU5"
                alt="Modern academic lecture hall with natural light"
                className="classroom-img"
              />
              <div className="classroom-gradient-overlay" />
            </div>

            {/* Floating Glassmorphic Live Session Card */}
            <div className="floating-live-card">
              {/* Header */}
              <div className="live-card-header">
                <div className="live-status-pill">
                  <span className="live-pulsing-dot" />
                  <span className="live-status-label">Live Session</span>
                </div>
                <span className="live-course-name">CS 101 - Intro to Programming</span>
              </div>

              {/* QR Animation Container */}
              <div className="live-qr-viewport">
                <div className="mock-qr-matrix">
                  <div className="qr-grid-pattern">
                    <div className="qr-cell filled" />
                    <div className="qr-cell filled" />
                    <div className="qr-cell filled span-2" />
                    <div className="qr-cell filled span-2" />
                    <div className="qr-cell light" />
                    <div className="qr-cell filled" />
                    <div className="qr-cell filled" />
                    <div className="qr-cell light span-2" />
                    <div className="qr-cell filled" />
                    <div className="qr-cell filled span-2" />
                    <div className="qr-cell filled" />
                    <div className="qr-cell filled" />
                  </div>
                  {/* Glowing Laser Scan Bar */}
                  <div className="qr-scanning-laser" />
                </div>
              </div>

              {/* Footer Progress & Statistics */}
              <div className="live-card-footer">
                <div className="progress-label-row">
                  <span className="progress-caption">Attendance Rate</span>
                  <span className="progress-percentage">87%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: '87%' }} />
                </div>
                <div className="progress-details-row">
                  <span className="detail-meta">142/165 Students</span>
                  <span className="detail-meta">Ends in 05:23</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
