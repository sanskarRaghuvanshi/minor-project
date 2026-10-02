import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import Logo from '../components/common/Logo';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errorObj, setErrorObj] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorObj(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setErrorObj({ message: 'Email and password are required' });
      return;
    }
    setLoading(true);
    setErrorObj(null);
    try {
      const user = await login(form.email, form.password);
      const dest = user.role === 'faculty'
        ? '/faculty/dashboard'
        : user.role === 'coordinator'
          ? '/coordinator/dashboard'
          : user.role === 'student'
            ? '/student/dashboard'
            : '/admin/dashboard';
      navigate(from === '/' || from === '/login' || from === '/register' ? dest : from, { replace: true });
    } catch (err) {
      const errorCode = err.response?.data?.errorCode;
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setErrorObj({ message, errorCode });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <Logo size={48} tagline="Smart student attendance management" />
        <div className="auth-card__header">
          <h1>Welcome Back</h1>
          <p>Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {errorObj && errorObj.errorCode === 'PENDING_APPROVAL' ? (
            <div
              style={{
                background: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px',
                color: '#92400E',
                fontSize: '0.875rem',
                lineHeight: 1.45,
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
              role="alert"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px', flexShrink: 0, color: '#D97706' }}>
                hourglass_top
              </span>
              <div>
                <strong style={{ display: 'block', marginBottom: '2px', color: '#78350F' }}>
                  Account Pending Approval
                </strong>
                {errorObj.message}
              </div>
            </div>
          ) : errorObj && errorObj.errorCode === 'REJECTED_APPROVAL' ? (
            <div
              style={{
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px',
                color: '#991B1B',
                fontSize: '0.875rem',
                lineHeight: 1.45,
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
              role="alert"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px', flexShrink: 0, color: '#DC2626' }}>
                cancel
              </span>
              <div>
                <strong style={{ display: 'block', marginBottom: '2px', color: '#7F1D1D' }}>
                  Registration Rejected
                </strong>
                {errorObj.message}
              </div>
            </div>
          ) : errorObj?.message ? (
            <div className="alert alert--error" role="alert">
              {errorObj.message}
            </div>
          ) : null}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-icon">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">mail</span>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                autoComplete="email"
                required
                aria-required="true"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input input-icon">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">lock</span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                aria-required="true"
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined" aria-hidden="true">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right', marginTop: '8px' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.875rem' }}>Forgot Password?</Link>
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? <span className="btn__spinner" /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="auth-card__footer">
          <p>Don&apos;t have an account? <Link to="/register/student">Register</Link></p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
