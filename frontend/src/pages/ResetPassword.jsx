import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';
import AuthLayout from '../components/auth/AuthLayout';
import Logo from '../components/common/Logo';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.password || form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      await axiosInstance.post(ENDPOINTS.AUTH.RESET_PASSWORD(token), { password: form.password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <Logo size={48} tagline="Smart student attendance management" />
        <div className="auth-card__header">
          <h1>Reset Password</h1>
          <p>Enter your new password</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="alert alert--error" role="alert">{error}</div>}
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <div className="input-icon">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">lock</span>
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Min 6 chars, at least one letter & one number" required minLength={6} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-icon">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">lock</span>
              <input id="confirmPassword" name="confirmPassword" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Repeat your password" required />
            </div>
          </div>
          <div className="form-group">
            <label className="checkbox-label" style={{ background: 'none', padding: 0 }}>
              <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} /> Show passwords
            </label>
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <div className="auth-card__footer">
          <p><Link to="/login">Back to Sign In</Link></p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
