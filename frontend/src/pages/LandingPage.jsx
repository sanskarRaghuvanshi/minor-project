import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import Logo from '../components/common/Logo';
import './LandingPage.css';

const LandingPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  if (user) {
    if (user.role === 'faculty') return <Navigate to="/faculty/dashboard" replace />;
    if (user.role === 'coordinator') return <Navigate to="/coordinator/dashboard" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return (
    <div className="attendiq-landing">
      {/* ===== Top Navigation Bar ===== */}
      <header className="attendiq-header">
        <div className="attendiq-header__container">
          {/* Brand Logo */}
          <Link to="/" className="attendiq-brand">
            <Logo size={38} tagline="SMART ATTENDANCE SYSTEM" />
          </Link>

          {/* Center Navigation Links */}
          <nav className="attendiq-nav">
            <a
              href="#home"
              className={`attendiq-nav__link ${activeTab === 'home' ? 'attendiq-nav__link--active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              Home
            </a>
            <a
              href="#features"
              className={`attendiq-nav__link ${activeTab === 'features' ? 'attendiq-nav__link--active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              Features
            </a>
            <a
              href="#about"
              className={`attendiq-nav__link ${activeTab === 'about' ? 'attendiq-nav__link--active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              About
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="attendiq-header__actions">
            <button
              type="button"
              className="attendiq-theme-toggle"
              title="Light theme active"
              aria-label="Theme toggle"
            >
              <span className="material-symbols-outlined">wb_sunny</span>
            </button>

            <Link to="/login" className="attendiq-btn attendiq-btn--outline">
              Log In
            </Link>

            <Link to="/register/student" className="attendiq-btn attendiq-btn--primary">
              Sign Up <span className="attendiq-btn__arrow">→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Hero Canvas Section ===== */}
      <main className="attendiq-hero-section" id="home">
        <div className="attendiq-hero-container">
          {/* ===== Left Column: Copy & Actions ===== */}
          <div className="attendiq-hero__content">
            {/* Pill Eyebrow */}
            <div className="attendiq-eyebrow">
              <span className="attendiq-eyebrow__dash" aria-hidden="true">—</span>
              <span className="attendiq-eyebrow__text">SMART ATTENDANCE SYSTEM</span>
            </div>

            {/* Main Headline */}
            <h1 className="attendiq-hero__title">
              Attendance<br />
              Made <span className="attendiq-hero__title-accent">Simple.</span>
            </h1>

            {/* Description */}
            <p className="attendiq-hero__description">
              A secure and efficient attendance management system for modern campuses.
              Simplify tracking, reduce administrative work, and get real-time insights.
            </p>

            {/* CTA Buttons */}
            <div className="attendiq-hero__cta-group">
              <Link to="/login" className="attendiq-cta attendiq-cta--primary">
                Log In <span className="attendiq-cta__arrow">→</span>
              </Link>
              <Link to="/register/student" className="attendiq-cta attendiq-cta--secondary">
                Sign Up
              </Link>
            </div>

            {/* Feature Highlights Row */}
            <div className="attendiq-features-row">
              {/* Feature 1: Secure */}
              <div className="attendiq-feature-item">
                <div className="attendiq-feature-icon attendiq-feature-icon--blue">
                  <span className="material-symbols-outlined">shield</span>
                </div>
                <div className="attendiq-feature-text">
                  <h4 className="attendiq-feature-title">Secure</h4>
                  <p className="attendiq-feature-sub">Your data is safe with us</p>
                </div>
              </div>

              {/* Feature 2: Real-time */}
              <div className="attendiq-feature-item">
                <div className="attendiq-feature-icon attendiq-feature-icon--purple">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <div className="attendiq-feature-text">
                  <h4 className="attendiq-feature-title">Real-time</h4>
                  <p className="attendiq-feature-sub">Instant attendance tracking</p>
                </div>
              </div>

              {/* Feature 3: Insightful */}
              <div className="attendiq-feature-item">
                <div className="attendiq-feature-icon attendiq-feature-icon--green">
                  <span className="material-symbols-outlined">bar_chart</span>
                </div>
                <div className="attendiq-feature-text">
                  <h4 className="attendiq-feature-title">Insightful</h4>
                  <p className="attendiq-feature-sub">Data-driven decisions</p>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Right Column: Curved Classroom Visual & Phone Mockup ===== */}
          <div className="attendiq-hero__visual">
            {/* Background Curved Classroom Mask Container */}
            <div className="attendiq-visual-backdrop">
              <img
                src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80"
                alt="Modern bright university classroom"
                className="attendiq-classroom-photo"
              />
              <div className="attendiq-backdrop-glow-border" aria-hidden="true" />
            </div>

            {/* Hand-drawn Annotation: "Just Scan and Attend" with Curved Arrow */}
            <div className="attendiq-annotation">
              <span className="attendiq-annotation__text">
                Just Scan<br />and Attend
              </span>
              <svg
                className="attendiq-annotation__arrow"
                width="84"
                height="60"
                viewBox="0 0 84 60"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 8 C 20 28, 45 46, 74 38"
                  stroke="#1E50DE"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeDasharray="none"
                />
                <path
                  d="M62 30 L 76 38 L 68 49"
                  stroke="#1E50DE"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Smartphone 3D Mockup */}
            <div className="attendiq-phone-mockup">
              {/* Outer Phone Frame */}
              <div className="attendiq-phone-chassis">
                {/* Dynamic Island Pill */}
                <div className="attendiq-phone-notch">
                  <span className="attendiq-notch-lens" />
                </div>

                {/* Inside Screen Content */}
                <div className="attendiq-phone-screen">
                  {/* Top Scan Bar */}
                  <div className="attendiq-phone-header">
                    <span className="material-symbols-outlined attendiq-phone-icon">
                      chevron_left
                    </span>
                    <span className="attendiq-phone-title">Scan QR Code</span>
                    <span className="material-symbols-outlined attendiq-phone-icon">
                      bolt
                    </span>
                  </div>

                  {/* QR Code Viewfinder Box */}
                  <div className="attendiq-viewfinder-container">
                    <div className="attendiq-viewfinder">
                      {/* 4 Cyan Corner Brackets */}
                      <span className="attendiq-corner attendiq-corner--tl" />
                      <span className="attendiq-corner attendiq-corner--tr" />
                      <span className="attendiq-corner attendiq-corner--bl" />
                      <span className="attendiq-corner attendiq-corner--br" />

                      {/* Animated Neon Laser Scan Beam */}
                      <div className="attendiq-laser-beam" />

                      {/* Real crisp QR code */}
                      <div className="attendiq-qr-inner">
                        <QRCodeSVG
                          value="https://attendiq.edu/session/live-verify-token-2026"
                          size={136}
                          level="H"
                          fgColor="#0F172A"
                          bgColor="#FFFFFF"
                          includeMargin={false}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Status Underneath Viewfinder */}
                  <div className="attendiq-phone-footer">
                    <div className="attendiq-phone-status-title">Scanning...</div>
                    <div className="attendiq-phone-status-sub">Marking your attendance</div>
                  </div>
                </div>
              </div>

              {/* Phone Desk Shadow & Reflection */}
              <div className="attendiq-phone-shadow" aria-hidden="true" />
            </div>

            {/* Realistic Bottom Foreground Plant Leaf Decor */}
            <div className="attendiq-plant-decor" aria-hidden="true">
              <svg width="220" height="180" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M-30 180 C 10 140, 50 110, 85 90 C 110 75, 125 50, 105 30 C 80 8, 30 50, 0 110 Z"
                  fill="url(#leafGrad1)"
                  opacity="0.88"
                />
                <path
                  d="M-40 180 C 30 150, 80 130, 140 120 C 175 114, 185 90, 160 75 C 130 55, 75 95, 20 150 Z"
                  fill="url(#leafGrad2)"
                  opacity="0.75"
                />
                <path
                  d="M10 180 C 60 160, 110 150, 170 155 C 195 157, 205 140, 185 130 C 155 115, 100 135, 45 170 Z"
                  fill="url(#leafGrad1)"
                  opacity="0.6"
                />
                <defs>
                  <linearGradient id="leafGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#14532D" />
                    <stop offset="50%" stopColor="#16A34A" />
                    <stop offset="100%" stopColor="#4ADE80" />
                  </linearGradient>
                  <linearGradient id="leafGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#064E3B" />
                    <stop offset="60%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
