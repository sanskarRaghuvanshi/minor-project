import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';

const CascadingSelect = ({ onBranchChange, onClassChange, onSectionChange, onSubjectsChange, selectedBranch, selectedClass, selectedSection, selectedSubjects = [], role }) => {
  const [branches, setBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState({ branches: false, classes: false, subjects: false });

  useEffect(() => {
    setLoading((prev) => ({ ...prev, branches: true }));
    axiosInstance.get(ENDPOINTS.BRANCHES.LIST)
      .then(({ data }) => setBranches(data.data || []))
      .catch(() => {})
      .finally(() => setLoading((prev) => ({ ...prev, branches: false })));
  }, []);

  const selectedBranchObj = branches.find((b) => b.name === selectedBranch);
  const sections = selectedBranchObj?.sections || [];

  useEffect(() => {
    if (!selectedBranch) {
      setClasses([]);
      setSubjects([]);
      return;
    }
    setLoading((prev) => ({ ...prev, classes: true }));
    axiosInstance.get(ENDPOINTS.BRANCHES.CLASSES(selectedBranch))
      .then(({ data }) => setClasses(data.data || []))
      .catch(() => {})
      .finally(() => setLoading((prev) => ({ ...prev, classes: false })));
  }, [selectedBranch]);

  useEffect(() => {
    if (!selectedBranch || !selectedClass) {
      setSubjects([]);
      return;
    }
    setLoading((prev) => ({ ...prev, subjects: true }));
    axiosInstance.get(ENDPOINTS.BRANCHES.SUBJECTS(selectedBranch, selectedClass))
      .then(({ data }) => setSubjects(data.data || []))
      .catch(() => {})
      .finally(() => setLoading((prev) => ({ ...prev, subjects: false })));
  }, [selectedBranch, selectedClass]);

  const handleBranchChange = (value) => {
    onBranchChange(value);
    onClassChange('');
    onSectionChange('');
    onSubjectsChange([]);
  };

  const handleSubjectToggle = (subject) => {
    const updated = selectedSubjects.includes(subject)
      ? selectedSubjects.filter((s) => s !== subject)
      : [...selectedSubjects, subject];
    onSubjectsChange(updated);
  };

  return (
    <div className="cascading-select">
      <div className="form-group">
        <label htmlFor="branch">Branch</label>
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

      {selectedBranch && (
        <div className="form-group">
          <label htmlFor="class">Year</label>
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
      )}

      {role !== 'admin' && selectedBranch && sections.length > 0 && (
        <div className="form-group">
          <label htmlFor="section">Section</label>
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
      )}

      {(role === 'faculty' || role === 'coordinator') && selectedClass && subjects.length > 0 && (
        <div className="form-group">
          <label>Subjects (select one or more)</label>
          <div className="checkbox-group">
            {subjects.map((s) => (
              <label key={s} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedSubjects.includes(s)}
                  onChange={() => handleSubjectToggle(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CascadingSelect;
