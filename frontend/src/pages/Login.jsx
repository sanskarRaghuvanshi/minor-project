import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
      const dest = user.role === 'faculty'
        ? '/faculty/dashboard'
        : user.role === 'coordinator'
          ? '/coordinator/dashboard'
          : user.role === 'student'
            ? '/student/dashboard'
            : '/admin/dashboard';
      navigate(from === '/' || from === '/login' || from === '/register' ? dest : from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-card__header">
          <h1>Welcome Back</h1>
          <p>Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="alert alert--error" role="alert">{error}</div>}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
              aria-required="true"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input">
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
                {showPassword ? '🙈' : '👁️'}
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
          <div className="auth-card__test-credits">
            <p><strong>Test Credentials:</strong></p>
            <p>Admin: admin@test.com / admin123</p>
            <p>Faculty: faculty@test.com / faculty123</p>
            <p>Student: student@test.com / student123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
