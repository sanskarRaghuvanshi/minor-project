import { useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await axiosInstance.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
      setMessage('If that email is registered, a password reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-card__header">
          <h1>Forgot Password</h1>
          <p>Enter your email to receive a reset link</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="alert alert--error" role="alert">{error}</div>}
          {message && <div className="alert alert--success" role="alert">{message}</div>}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" required />
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <div className="auth-card__footer">
          <p><Link to="/login">Back to Sign In</Link></p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
