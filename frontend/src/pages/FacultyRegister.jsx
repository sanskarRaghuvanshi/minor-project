import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CascadingSelect from '../components/auth/CascadingSelect';

const FacultyRegister = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'faculty',
    branch: '', className: '', section: '', subjects: [],
  });
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
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-card__header">
          <h1>Faculty Registration</h1>
          <p>Create your faculty account</p>
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
                Class Coordinator
              </button>
            </div>
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '6px' }}>
              {form.role === 'coordinator'
                ? 'Coordinators review leave requests, see class teachers and students, and receive class feedback.'
                : 'Faculty mark attendance, track defaulters and submit class feedback.'}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Dr. John Doe" required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="faculty@institute.edu" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 6 chars, at least one letter &amp; one number" required minLength={6} />
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
            {loading ? 'Registering...' : form.role === 'coordinator' ? 'Register as Coordinator' : 'Register as Faculty'}
          </button>
        </form>
        <div className="auth-card__footer">
          <p>Already have an account? <Link to="/login">Sign In</Link></p>
          <p><Link to="/register/student">Register as Student</Link></p>
        </div>
      </div>
    </div>
  );
};

export default FacultyRegister;
