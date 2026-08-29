import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CascadingSelect from '../components/auth/CascadingSelect';

const StudentRegister = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student',
    branch: '', className: '', section: '',
  });
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
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-card__header">
          <h1>Student Registration</h1>
          <p>Create your student account</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="alert alert--error" role="alert">{error}</div>}
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Jane Doe" required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="student@institute.edu" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 6 chars, at least one letter &amp; one number" required minLength={6} />
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
            {loading ? 'Registering...' : 'Register as Student'}
          </button>
        </form>
        <div className="auth-card__footer">
          <p>Already have an account? <Link to="/login">Sign In</Link></p>
          <p><Link to="/register/faculty">Register as Faculty</Link></p>
        </div>
      </div>
    </div>
  );
};

export default StudentRegister;
