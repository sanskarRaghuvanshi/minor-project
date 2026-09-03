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
      await register(form);
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      const details = err.response?.data?.errors?.map((e) => e.msg).join('; ');
      setError(details ? `${msg}: ${details}` : msg);
    } finally {
      setLoading(false);
    }
  };

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
