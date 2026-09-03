import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CascadingSelect from '../components/auth/CascadingSelect';
import AuthLayout from '../components/auth/AuthLayout';
import Logo from '../components/common/Logo';

const FacultyRegister = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'faculty',
    branch: '', className: '', section: '', subjects: [],
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

  const handleRoleChange = (role) => {
    setForm((prev) => ({ ...prev, role, subjects: [] }));
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
      const dest = form.role === 'coordinator' ? '/coordinator/dashboard' : '/faculty/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      const details = err.response?.data?.errors?.map((e) => e.msg).join('; ');
      setError(details ? `${msg}: ${details}` : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout pageType={form.role}>
      <div className="auth-card">
        <Logo size={48} tagline="Smart student attendance management" />
        <div className="auth-card__header">
          <h1>{form.role === 'coordinator' ? 'Coordinator Registration' : 'Faculty Registration'}</h1>
          <p>{form.role === 'coordinator' ? 'Create your administrative account to manage your institution.' : 'Create your institutional faculty account.'}</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="alert alert--error" role="alert">{error}</div>}

          <div className="form-group">
            <label>Account Type</label>
            <div className="role-toggle" role="group" aria-label="Account type">
              <button
                type="button"
                className={`role-toggle__btn ${form.role === 'faculty' ? 'role-toggle__btn--active' : ''}`}
                onClick={() => handleRoleChange('faculty')}
                aria-pressed={form.role === 'faculty'}
              >
                Faculty
              </button>
              <button
                type="button"
                className={`role-toggle__btn ${form.role === 'coordinator' ? 'role-toggle__btn--active' : ''}`}
                onClick={() => handleRoleChange('coordinator')}
                aria-pressed={form.role === 'coordinator'}
              >
                Coordinator
              </button>
            </div>
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '6px' }}>
              {form.role === 'coordinator'
                ? 'Coordinators review leave requests, manage subjects & classes, and oversee academic progress.'
                : 'Faculty mark attendance, track defaulters, and communicate with students.'}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-icon">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">person</span>
              <input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Enter your full name" required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-icon">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">mail</span>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter your email" required />
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
            role={form.role}
            selectedBranch={form.branch}
            selectedClass={form.className}
            selectedSection={form.section}
            selectedSubjects={form.subjects}
            onBranchChange={(v) => setForm((prev) => ({ ...prev, branch: v }))}
            onClassChange={(v) => setForm((prev) => ({ ...prev, className: v }))}
            onSectionChange={(v) => setForm((prev) => ({ ...prev, section: v }))}
            onSubjectsChange={(v) => setForm((prev) => ({ ...prev, subjects: v }))}
          />
          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? 'Registering...' : form.role === 'coordinator' ? 'Register Coordinator Account' : 'Register Faculty Account'}
          </button>
        </form>
        <div className="auth-card__footer">
          <p>Already have an account? <Link to="/login">Log in</Link></p>
          <p>Registering as student? <Link to="/register/student">Student Registration</Link></p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default FacultyRegister;
