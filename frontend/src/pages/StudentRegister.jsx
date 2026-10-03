import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CascadingSelect from '../components/auth/CascadingSelect';
import AuthLayout from '../components/auth/AuthLayout';
import Logo from '../components/common/Logo';

const StudentRegister = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student',
    branch: '', className: '', section: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedUser, setSubmittedUser] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.branch || !form.className || !form.section) {
      setError('All required fields must be filled');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await register(form);
      if (result?.pendingApproval) {
        setSubmittedUser(result.user || form);
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      const details = err.response?.data?.errors?.map((e) => e.msg).join('; ');
      setError(details ? `${msg}: ${details}` : msg);
    } finally {
      setLoading(false);
    }
  };

  if (submittedUser) {
    return (
      <AuthLayout pageType="student">
        <div className="auth-card" style={{ maxWidth: '520px', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>
              hourglass_top
            </span>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            Registration Submitted!
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.925rem', marginBottom: '24px', lineHeight: 1.5 }}>
            Your student account is pending administrator approval for security verification.
          </p>

          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '16px 20px',
              textAlign: 'left',
              marginBottom: '24px',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#64748B' }}>Full Name</span>
              <span style={{ fontWeight: 600, color: '#1E293B' }}>{submittedUser.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#64748B' }}>Email</span>
              <span style={{ fontWeight: 600, color: '#1E293B' }}>{submittedUser.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#64748B' }}>Program & Section</span>
              <span style={{ fontWeight: 600, color: '#1E293B' }}>
                {submittedUser.branch} - {submittedUser.className} ({submittedUser.section})
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B' }}>Approval Status</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#FEF3C7',
                  color: '#92400E',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '999px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  schedule
                </span>
                Pending Admin Review
              </span>
            </div>
          </div>

          <div
            style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '24px',
              fontSize: '0.825rem',
              color: '#1E40AF',
              lineHeight: 1.5,
              textAlign: 'left',
              display: 'flex',
              gap: '10px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', flexShrink: 0 }}>
              shield
            </span>
            <div>
              Once an administrator approves your account, you will be able to sign in with your email and password.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to="/login" className="btn btn--primary btn--full" style={{ justifyContent: 'center' }}>
              Go to Login
            </Link>
            <button
              type="button"
              className="btn btn--secondary btn--full"
              style={{ justifyContent: 'center' }}
              onClick={() => {
                setSubmittedUser(null);
                setForm({
                  name: '',
                  email: '',
                  password: '',
                  role: 'student',
                  branch: '',
                  className: '',
                  section: '',
                });
              }}
            >
              Register Another Account
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout pageType="student">
      <div className="auth-card">
        <Logo size={48} tagline="Smart student attendance management" />
        <div className="auth-card__header">
          <h1>Student Registration</h1>
          <p>Create your institutional student account.</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="alert alert--error" role="alert">{error}</div>}
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-icon">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">person</span>
              <input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email">Student Email Address</label>
            <div className="input-icon">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">mail</span>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="student@institution.edu" required />
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
                placeholder="Min 6 chars, at least one letter & one number"
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>
          <CascadingSelect
            role="student"
            selectedBranch={form.branch}
            selectedClass={form.className}
            selectedSection={form.section}
            selectedSubjects={[]}
            onBranchChange={(v) => setForm((prev) => ({ ...prev, branch: v }))}
            onClassChange={(v) => setForm((prev) => ({ ...prev, className: v }))}
            onSectionChange={(v) => setForm((prev) => ({ ...prev, section: v }))}
            onSubjectsChange={() => {}}
          />
          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? 'Registering...' : 'Register Student Account'}
          </button>
        </form>
        <div className="auth-card__footer">
          <p>Already have an account? <Link to="/login">Log in</Link></p>
          <p>Registering as staff? <Link to="/register/faculty">Faculty</Link></p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default StudentRegister;
