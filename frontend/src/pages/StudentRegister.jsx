import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';
import './FacultyRegister.css';

const DEFAULT_BRANCHES = [
  {
    name: 'Computer Science',
    sections: ['A', 'B', 'C'],
    classes: [
      { name: 'First Year - Section A', subjects: ['Introduction to Algorithms', 'Calculus I', 'Programming in C'] },
      { name: 'Second Year - Section B', subjects: ['Data Structures', 'Database Systems', 'Operating Systems'] },
      { name: 'Third Year - Section A', subjects: ['Web Technologies', 'Computer Networks', 'Software Engineering'] },
      { name: 'Final Year - Section A', subjects: ['Cloud Computing', 'Machine Learning', 'Cyber Security'] },
    ],
  },
  {
    name: 'Engineering',
    sections: ['A', 'B'],
    classes: [
      { name: 'First Year - Core', subjects: ['Engineering Physics', 'Calculus', 'Engineering Mechanics'] },
      { name: 'Second Year - Core', subjects: ['Thermodynamics', 'Fluid Mechanics', 'Materials Science'] },
    ],
  },
  {
    name: 'Business Administration',
    sections: ['A', 'B'],
    classes: [
      { name: 'Undergraduate - Year 1', subjects: ['Principles of Management', 'Microeconomics', 'Business Communication'] },
      { name: 'Undergraduate - Year 2', subjects: ['Marketing Management', 'Financial Accounting', 'Organizational Behavior'] },
      { name: 'MBA - Year 1', subjects: ['Corporate Finance', 'Strategic Management', 'Operations Management'] },
    ],
  },
];

const StudentRegister = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    branch: '',
    className: '',
    section: '',
  });

  const [branches, setBranches] = useState(DEFAULT_BRANCHES);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axiosInstance
      .get(ENDPOINTS.BRANCHES.LIST)
      .then(({ data }) => {
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          setBranches(data.data);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_BRANCHES
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleBranchSelect = (e) => {
    const branchName = e.target.value;
    const selectedBranchObj = branches.find((b) => b.name === branchName);
    const branchClasses = selectedBranchObj?.classes || [];
    const branchSections = selectedBranchObj?.sections || ['A', 'B'];

    setAvailableClasses(branchClasses);
    setAvailableSections(branchSections);
    setForm((prev) => ({
      ...prev,
      branch: branchName,
      className: '',
      section: branchSections[0] || 'A',
    }));
    setError('');
  };

  const handleClassSelect = (e) => {
    const clsName = e.target.value;
    setForm((prev) => ({
      ...prev,
      className: clsName,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in your name, email, and password');
      return;
    }
    if (!form.branch) {
      setError('Please select your branch / department');
      return;
    }
    if (!form.className) {
      setError('Please select your class / year');
      return;
    }
    if (!form.section) {
      setError('Please select your section');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'student',
        branch: form.branch,
        className: form.className,
        section: form.section,
      };

      await register(payload);
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      const details = err.response?.data?.errors?.map((errItem) => errItem.msg).join('; ');
      setError(details ? `${msg}: ${details}` : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fac-reg-container">
      {/* Left Side: Illustration / Branding */}
      <div className="fac-reg-left-panel" style={{ backgroundColor: '#dae2f9' }}>
        <div className="fac-reg-glow-wrap">
          <div className="fac-reg-glow-1" style={{ backgroundColor: '#004ac6' }} />
          <div className="fac-reg-glow-2" style={{ backgroundColor: '#4f5b92' }} />
        </div>

        <div className="fac-reg-left-content">
          <h1 className="fac-reg-left-title" style={{ color: '#141b2c' }}>
            Empower Your Academic Journey
          </h1>
          <p className="fac-reg-left-desc" style={{ color: '#141b2c' }}>
            Track your real-time attendance, instant QR check-ins, leave applications, and never miss exam eligibility.
          </p>
        </div>

        <div className="fac-reg-img-card">
          <img
            src="https://lh3.googleusercontent.com/aida/AEtjO1Wdh4eT5wc9zLU85FfeZdJSTkzgJQeYjrDxsqnq2wi7ImRAVyYwOLfFb1wp_zJMDXgqy6w4x6d1RBeh0ceh6JZBky7c-9K_Jt4f_h7hbzjEEgWdfPTMhmkd4DxepziFZ9GUS5munYlKCcnGxkn2_lWQowcYNd8SRG7Np-BboRCHdzRgoYsVBlHU_IwCOlQxay-sJ59p7wMaaCMjEAlu2ttD6ODTLxulcnKL6hl4pWK0XsQxeFbU1pXo1hU"
            alt="Student Learning Experience"
            className="fac-reg-img"
          />
        </div>
      </div>

      {/* Right Side: Registration Form */}
      <div className="fac-reg-right-panel">
        <div className="fac-reg-card">
          {/* Logo & Header */}
          <div className="fac-reg-header-wrap">
            <div className="fac-reg-brand">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                school
              </span>
              <span className="fac-reg-brand-name">SmartAttend</span>
            </div>
            <h2 className="fac-reg-heading">Student Registration</h2>
            <p className="fac-reg-subheading">Create your institutional student account.</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="fac-reg-alert" role="alert" style={{ marginBottom: '1.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="fac-reg-form" noValidate>
            {/* Personal Info */}
            <div className="fac-reg-input-group">
              <label className="fac-reg-label" htmlFor="fullName">
                Full Name
              </label>
              <div className="fac-reg-input-box">
                <span className="material-symbols-outlined fac-reg-input-icon">person</span>
                <input
                  id="fullName"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Jane Smith"
                  required
                  className="fac-reg-input"
                />
              </div>
            </div>

            <div className="fac-reg-input-group">
              <label className="fac-reg-label" htmlFor="email">
                Student Email Address
              </label>
              <div className="fac-reg-input-box">
                <span className="material-symbols-outlined fac-reg-input-icon">mail</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jane.student@university.edu"
                  required
                  className="fac-reg-input"
                />
              </div>
            </div>

            <div className="fac-reg-input-group">
              <label className="fac-reg-label" htmlFor="password">
                Password
              </label>
              <div className="fac-reg-input-box">
                <span className="material-symbols-outlined fac-reg-input-icon">lock</span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="fac-reg-input"
                />
                <button
                  type="button"
                  className="fac-reg-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            <hr className="fac-reg-divider" />

            {/* Academic Assignment */}
            <div>
              <div className="fac-reg-academic-title">Academic Enrollment Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label className="fac-reg-select-label" htmlFor="branch">
                    Branch / Department
                  </label>
                  <select
                    id="branch"
                    name="branch"
                    value={form.branch}
                    onChange={handleBranchSelect}
                    className="fac-reg-select"
                    required
                  >
                    <option value="" disabled>
                      Select Branch
                    </option>
                    {branches.map((b) => (
                      <option key={b.name || b._id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fac-reg-grid-2">
                  <div>
                    <label className="fac-reg-select-label" htmlFor="class">
                      Class / Year
                    </label>
                    <select
                      id="class"
                      name="className"
                      value={form.className}
                      onChange={handleClassSelect}
                      disabled={!form.branch || availableClasses.length === 0}
                      className="fac-reg-select"
                      required
                    >
                      <option value="" disabled>
                        Select Class
                      </option>
                      {availableClasses.map((c) => {
                        const name = typeof c === 'string' ? c : c.name;
                        return (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="fac-reg-select-label" htmlFor="section">
                      Section
                    </label>
                    <select
                      id="section"
                      name="section"
                      value={form.section}
                      onChange={handleChange}
                      disabled={!form.branch || availableSections.length === 0}
                      className="fac-reg-select"
                      required
                    >
                      <option value="" disabled>
                        Select Section
                      </option>
                      {availableSections.map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ paddingTop: '0.5rem' }}>
              <button type="submit" className="fac-reg-submit-btn" disabled={loading}>
                {loading && <div className="fac-reg-spinner" />}
                <span>{loading ? 'Registering...' : 'Register Student Account'}</span>
              </button>
            </div>
          </form>

          {/* Footer Links */}
          <div className="fac-reg-footer">
            <p>
              Already have an account?
              <Link to="/login" className="fac-reg-footer-link">
                Log in
              </Link>
            </p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
              Registering as staff?{' '}
              <Link to="/register/faculty" className="fac-reg-footer-link">
                Faculty
              </Link>{' '}
              |{' '}
              <Link to="/register/coordinator" className="fac-reg-footer-link">
                Coordinator
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRegister;
