import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      const dest =
        user.role === 'faculty'
          ? '/faculty/dashboard'
          : user.role === 'coordinator'
            ? '/coordinator/dashboard'
            : user.role === 'student'
              ? '/student/dashboard'
              : '/admin/dashboard';
      navigate(from === '/' || from === '/login' || from === '/register' ? dest : from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please verify your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        {/* Left Side: Illustration Area */}
        <div className="login-left-panel">
          <div className="login-left-bg-radial" />
          
          <div className="login-illustration-wrap">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyWrynyWt9ZA1I-7EIHH7HGXtGbbmbH6_oQkIu-U9OzxFoOoumjdxNFcGC_xOirRC0t2AgVheBPo6mqx383dSO5C1J3rkQgxFSDe7WhJl1f45nY340PjwYk354kox3672d-pmRFdahKeIsMH3lAabwKHZYIIM0CS-OVJ5y8l2VBCKzPGzOrkn6LfHZ1BUWCur4n4mMFx-zaCF1t0g84nfDGACV4zGRkkjg_PYrEEwu9LovzqGDpFZU"
              alt="Smart Attendance System Educational Illustration"
              className="login-illustration-img"
            />
          </div>

          <div className="login-left-caption">
            <h2>Streamline Your Attendance</h2>
            <p>The intelligent way to manage institutional attendance and track progress effortlessly.</p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="login-right-panel">
          <div className="login-content-box">
            {/* Brand Logo */}
            <div className="login-brand-logo">
              <div className="login-brand-icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  how_to_reg
                </span>
              </div>
              <h1 className="login-brand-title">SmartAttend</h1>
            </div>

            {/* Header */}
            <div className="login-header-group">
              <h2>Welcome back</h2>
              <p>Please enter your details to sign in.</p>
            </div>

            {/* Error message */}
            {error && (
              <div className="login-alert" role="alert" style={{ marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  error
                </span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="login-form" noValidate>
              {/* Email Input */}
              <div className="floating-label-group">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder=" "
                  autoComplete="email"
                  required
                  className="floating-label-input"
                />
                <label className="floating-label" htmlFor="email">
                  Email Address
                </label>
              </div>

              {/* Password Input */}
              <div className="floating-label-group">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder=" "
                  autoComplete="current-password"
                  required
                  className="floating-label-input"
                />
                <label className="floating-label" htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Options */}
              <div className="login-options-row">
                <label className="remember-me-label" htmlFor="remember-me">
                  <input
                    id="remember-me"
                    name="rememberMe"
                    type="checkbox"
                    checked={form.rememberMe}
                    onChange={handleChange}
                    className="remember-me-checkbox"
                  />
                  <span>Remember me</span>
                </label>

                <Link to="/forgot-password" className="forgot-password-link">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading && <div className="login-spinner" />}
                <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              </button>

              {/* Social Login Divider */}
              <div className="login-divider-wrap">
                <div className="login-divider-line" />
                <span className="login-divider-text">Or continue with</span>
              </div>

              {/* Social Login Buttons */}
              <div className="login-social-grid">
                <button type="button" className="login-social-btn">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKR_MmU4gmqYcVVhSkHkiSLSZZ-DvmHWy4Gc7Sx64rmTK4imsADE4Mw8wECvo7Wh8wUZyqbUTfEk3K73PTIj02YBVQAhujvsVkViphum-TfF-mn-n-fy_-10k7ueSX9gBrDn9yCZVsQQ9xuhZ9WCH5CSsF7zLBoZGCl5jFBTguIig_1zdaB0XQ09jqrM0qJ1OvrscDC8udNY9YNGSkRURgoZ2mundwLkjnsEU9QcRmNd6kw6wQpjix"
                    alt="Google logo"
                    className="social-logo-icon"
                  />
                  Google
                </button>
                <button type="button" className="login-social-btn">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                  >
                    download
                  </span>
                  Apple
                </button>
              </div>
            </form>

            {/* Footer / Register Link */}
            <p className="login-footer-text">
              Don't have an account?{' '}
              <Link to="/register/student" className="login-footer-link">
                Register as Student
              </Link>
            </p>
            <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', textAlign: 'center', color: '#575e71' }}>
              Staff Registration:{' '}
              <Link to="/register/faculty" className="login-footer-link">
                Faculty
              </Link>{' '}
              |{' '}
              <Link to="/register/coordinator" className="login-footer-link">
                Coordinator
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
