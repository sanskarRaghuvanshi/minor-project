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

const BRANCH_YEAR_SUBJECTS = {
  'Computer Science': {
    '1st Year': ['Programming in C', 'Engineering Physics', 'Basic Electrical Engineering', 'Mathematics-I', 'Engineering Drawing'],
    '2nd Year': ['Data Structures & Algorithms', 'Object Oriented Programming', 'Discrete Mathematics', 'Digital Electronics', 'Computer Architecture'],
    '3rd Year': ['Database Management Systems', 'Operating Systems', 'Computer Networks', 'Software Engineering', 'Theory of Computation', 'Design & Analysis of Algorithms'],
    '4th Year': ['Artificial Intelligence & ML', 'Cloud Computing', 'Compiler Design', 'Cyber Security', 'Information Retrieval', 'Web Technologies'],
  },
  'Information Technology': {
    '1st Year': ['Programming in C', 'Engineering Chemistry', 'Basic Electronics', 'Mathematics-I', 'Environmental Science'],
    '2nd Year': ['Data Structures', 'Python Programming', 'Object Oriented Systems', 'Digital Logic', 'Formal Languages'],
    '3rd Year': ['Database Systems', 'Operating Systems', 'Computer Networks', 'Web Technologies', 'Software Project Management'],
    '4th Year': ['Machine Learning', 'Big Data Analytics', 'Information Security', 'Internet of Things (IoT)', 'Mobile App Development'],
  },
  'Electronics': {
    '1st Year': ['Engineering Physics', 'Basic Electrical', 'Programming in C', 'Mathematics-I', 'Engineering Mechanics'],
    '2nd Year': ['Electronic Devices & Circuits', 'Signals & Systems', 'Network Theory', 'Digital System Design', 'Electromagnetic Fields'],
    '3rd Year': ['Analog & Digital Communication', 'Microprocessors & Microcontrollers', 'Control Systems', 'VLSI Design', 'Linear Integrated Circuits'],
    '4th Year': ['Embedded Systems', 'Wireless Communications', 'Optical Fiber Communication', 'Digital Signal Processing', 'Robotics & Automation'],
  },
  'Mechanical': {
    '1st Year': ['Engineering Mechanics', 'Engineering Graphics', 'Basic Electrical', 'Mathematics-I', 'Workshop Practice'],
    '2nd Year': ['Thermodynamics', 'Strength of Materials', 'Fluid Mechanics', 'Manufacturing Processes', 'Kinematics of Machinery'],
    '3rd Year': ['Heat & Mass Transfer', 'Design of Machine Elements', 'Dynamics of Machinery', 'Industrial Engineering', 'CAD/CAM'],
    '4th Year': ['Automobile Engineering', 'Power Plant Engineering', 'Mechatronics', 'Refrigeration & Air Conditioning', 'Finite Element Analysis'],
  },
  'Civil': {
    '1st Year': ['Engineering Physics', 'Engineering Mechanics', 'Basic Electrical', 'Mathematics-I', 'Environmental Engineering'],
    '2nd Year': ['Fluid Mechanics', 'Surveying', 'Strength of Materials', 'Building Materials & Construction', 'Engineering Geology'],
    '3rd Year': ['Structural Analysis', 'Geotechnical Engineering', 'Transportation Engineering', 'Design of RC Structures', 'Hydrology & Water Resources'],
    '4th Year': ['Design of Steel Structures', 'Construction Planning & Management', 'Environmental Impact Assessment', 'Earthquake Engineering', 'Town Planning'],
  },
};

const getFallbackSubjects = (branchStr, classStr) => {
  if (!branchStr) return [];
  let foundKey = Object.keys(BRANCH_YEAR_SUBJECTS).find((key) =>
    branchStr.toLowerCase().includes(key.toLowerCase())
  );
  if (!foundKey) foundKey = 'Computer Science';
  const branchMap = BRANCH_YEAR_SUBJECTS[foundKey];

  if (classStr && branchMap[classStr]) {
    return branchMap[classStr];
  }
  // Default to all branch subjects if class not selected yet
  return Object.values(branchMap).flat();
};

const CascadingSelect = ({ onBranchChange, onClassChange, onSectionChange, onSubjectsChange, selectedBranch, selectedClass, selectedSection, selectedSubjects = [], role }) => {
  const [branches, setBranches] = useState(DEFAULT_BRANCHES);
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [subjects, setSubjects] = useState([]);
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
    const fallbacks = getFallbackSubjects(selectedBranch, selectedClass);
    if (!selectedBranch) {
      setSubjects([]);
      return;
    }

    setLoading((prev) => ({ ...prev, subjects: true }));
    axiosInstance.get(ENDPOINTS.BRANCHES.SUBJECTS(selectedBranch, selectedClass))
      .then(({ data }) => {
        if (data?.data && data.data.length > 0) {
          setSubjects(data.data);
        } else {
          setSubjects(fallbacks);
        }
      })
      .catch(() => {
        setSubjects(fallbacks);
      })
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
            <label htmlFor="subjectSelect">
              Subjects (You will manage)
              {selectedBranch && selectedClass && (
                <span className="subject-hint"> — {selectedBranch.split(' ')[0]} ({selectedClass})</span>
              )}
            </label>
            <div className="input-icon">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">menu_book</span>
              <select
                id="subjectSelect"
                value=""
                onChange={(e) => handleAddSubject(e.target.value)}
                disabled={!selectedBranch || subjects.length === 0}
              >
                <option value="" disabled>
                  {!selectedBranch
                    ? 'Select Branch first'
                    : subjects.length === 0
                    ? 'Loading subjects...'
                    : 'Choose Subject'}
                </option>
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
