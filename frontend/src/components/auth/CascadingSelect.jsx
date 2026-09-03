import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';

const DEFAULT_BRANCHES = [
  { name: 'Computer Science & Engineering', sections: ['Section A', 'Section B', 'Section C', 'Section D'] },
  { name: 'Information Technology', sections: ['Section A', 'Section B', 'Section C'] },
  { name: 'Electronics & Communication', sections: ['Section A', 'Section B'] },
  { name: 'Mechanical Engineering', sections: ['Section A', 'Section B'] },
  { name: 'Civil Engineering', sections: ['Section A', 'Section B'] },
];

const DEFAULT_CLASSES = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const DEFAULT_SUBJECTS = ['Data Structures & Algorithms', 'Database Management Systems', 'Operating Systems', 'Computer Networks', 'Software Engineering', 'Web Technologies'];

const CascadingSelect = ({ onBranchChange, onClassChange, onSectionChange, onSubjectsChange, selectedBranch, selectedClass, selectedSection, selectedSubjects = [], role }) => {
  const [branches, setBranches] = useState(DEFAULT_BRANCHES);
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState({ branches: false, classes: false, subjects: false });

  useEffect(() => {
    setLoading((prev) => ({ ...prev, branches: true }));
    axiosInstance.get(ENDPOINTS.BRANCHES.LIST)
      .then(({ data }) => {
        if (data?.data && data.data.length > 0) setBranches(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading((prev) => ({ ...prev, branches: false })));
  }, []);

  const selectedBranchObj = branches.find((b) => b.name === selectedBranch || b.name?.includes(selectedBranch));
  const sections = selectedBranchObj?.sections?.length ? selectedBranchObj.sections : ['Section A', 'Section B', 'Section C', 'Section D'];

  useEffect(() => {
    if (!selectedBranch) return;
    setLoading((prev) => ({ ...prev, classes: true }));
    axiosInstance.get(ENDPOINTS.BRANCHES.CLASSES(selectedBranch))
      .then(({ data }) => {
        if (data?.data && data.data.length > 0) setClasses(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading((prev) => ({ ...prev, classes: false })));
  }, [selectedBranch]);

  useEffect(() => {
    if (!selectedBranch || !selectedClass) return;
    setLoading((prev) => ({ ...prev, subjects: true }));
    axiosInstance.get(ENDPOINTS.BRANCHES.SUBJECTS(selectedBranch, selectedClass))
      .then(({ data }) => {
        if (data?.data && data.data.length > 0) setSubjects(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading((prev) => ({ ...prev, subjects: false })));
  }, [selectedBranch, selectedClass]);

  const handleBranchChange = (value) => {
    onBranchChange(value);
    onClassChange('');
    onSectionChange('');
    onSubjectsChange([]);
  };

  const handleAddSubject = (subject) => {
    if (!subject) return;
    if (!selectedSubjects.includes(subject)) {
      onSubjectsChange([...selectedSubjects, subject]);
    }
  };

  const handleRemoveSubject = (subject) => {
    onSubjectsChange(selectedSubjects.filter((s) => s !== subject));
  };

  return (
    <div className="cascading-select">
      <div className="cascading-select__divider">
        <span>ACADEMIC ENROLLMENT DETAILS</span>
      </div>

      {/* Branch / Department */}
      <div className="form-group">
        <label htmlFor="branch">Branch / Department</label>
        <div className="input-icon">
          <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">account_balance</span>
          <select
            id="branch"
            value={selectedBranch || ''}
            onChange={(e) => handleBranchChange(e.target.value)}
            disabled={loading.branches}
            required
          >
            <option value="">Select Branch</option>
            {branches.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Class / Year & Section Grid Row */}
      <div className="form-row-grid">
        <div className="form-group">
          <label htmlFor="class">Class / Year</label>
          <div className="input-icon">
            <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">school</span>
            <select
              id="class"
              value={selectedClass || ''}
              onChange={(e) => { onClassChange(e.target.value); onSubjectsChange([]); }}
              disabled={loading.classes}
              required
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {role !== 'admin' && (
          <div className="form-group">
            <label htmlFor="section">Section</label>
            <div className="input-icon">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">groups</span>
              <select
                id="section"
                value={selectedSection || ''}
                onChange={(e) => onSectionChange && onSectionChange(e.target.value)}
                required
              >
                <option value="">Select Section</option>
                {sections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Subjects for Faculty and Coordinator */}
      {(role === 'faculty' || role === 'coordinator') && (
        <>
          {/* Subjects (You will manage) Dropdown */}
          <div className="form-group">
            <label htmlFor="subjectSelect">Subjects (You will manage)</label>
            <div className="input-icon">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">menu_book</span>
              <select
                id="subjectSelect"
                value=""
                onChange={(e) => handleAddSubject(e.target.value)}
              >
                <option value="" disabled>Choose Subject</option>
                {subjects.map((s) => (
                  <option key={s} value={s} disabled={selectedSubjects.includes(s)}>
                    {s} {selectedSubjects.includes(s) ? '(Added)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Chosen Tags Box */}
          <div className="form-group">
            <label>Subject Chosen</label>
            <div className="input-icon subject-chosen-box">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">sell</span>
              <div className="subject-tags-container">
                {selectedSubjects.length === 0 ? (
                  <span className="subject-placeholder">No subject chosen</span>
                ) : (
                  selectedSubjects.map((s) => (
                    <span key={s} className="subject-chip">
                      {s}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(s)}
                        className="subject-chip__remove"
                        aria-label={`Remove ${s}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CascadingSelect;
