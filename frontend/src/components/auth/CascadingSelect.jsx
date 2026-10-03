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
  return Object.values(branchMap).flat();
};

const CascadingSelect = ({
  onBranchChange,
  onClassChange,
  onSectionChange,
  onSubjectsChange,
  onAssignedClassesChange,
  selectedBranch,
  selectedClass,
  selectedSection,
  selectedSubjects = [],
  assignedClasses = [],
  role,
}) => {
  const [branches, setBranches] = useState(DEFAULT_BRANCHES);
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState({ branches: false, classes: false, subjects: false });

  // Temp state for adding additional class
  const [tempBranch, setTempBranch] = useState('');
  const [tempClass, setTempClass] = useState('');
  const [tempSection, setTempSection] = useState('');

  useEffect(() => {
    setLoading((prev) => ({ ...prev, branches: true }));
    axiosInstance.get(ENDPOINTS.BRANCHES.LIST)
      .then(({ data }) => {
        if (data?.data && data.data.length > 0) setBranches(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading((prev) => ({ ...prev, branches: false })));
  }, []);

  const activeBranchName = role === 'faculty' ? (tempBranch || selectedBranch) : selectedBranch;
  const selectedBranchObj = branches.find((b) => b.name === activeBranchName || b.name?.includes(activeBranchName));
  const sections = selectedBranchObj?.sections?.length ? selectedBranchObj.sections : ['Section A', 'Section B', 'Section C', 'Section D'];

  useEffect(() => {
    const branchToFetch = selectedBranch || tempBranch;
    if (!branchToFetch) return;
    setLoading((prev) => ({ ...prev, classes: true }));
    axiosInstance.get(ENDPOINTS.BRANCHES.CLASSES(branchToFetch))
      .then(({ data }) => {
        if (data?.data && data.data.length > 0) setClasses(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading((prev) => ({ ...prev, classes: false })));
  }, [selectedBranch, tempBranch]);

  useEffect(() => {
    const branchForSub = selectedBranch || tempBranch;
    const classForSub = selectedClass || tempClass;
    const fallbacks = getFallbackSubjects(branchForSub, classForSub);
    if (!branchForSub) {
      setSubjects([]);
      return;
    }

    setLoading((prev) => ({ ...prev, subjects: true }));
    axiosInstance.get(ENDPOINTS.BRANCHES.SUBJECTS(branchForSub, classForSub))
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
  }, [selectedBranch, selectedClass, tempBranch, tempClass]);

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

  // Add assigned class to list
  const handleAddClass = () => {
    const b = tempBranch || selectedBranch;
    const c = tempClass || selectedClass;
    const s = tempSection || selectedSection;

    if (!b || !c || !s) return;

    const exists = assignedClasses.some(
      (ac) => ac.branch === b && ac.className === c && ac.section === s
    );

    if (!exists && onAssignedClassesChange) {
      const updated = [...assignedClasses, { branch: b, className: c, section: s }];
      onAssignedClassesChange(updated);
      // Auto set primary if it's the first one
      if (assignedClasses.length === 0) {
        onBranchChange(b);
        onClassChange(c);
        onSectionChange(s);
      }
      setTempClass('');
      setTempSection('');
    }
  };

  const handleRemoveClass = (index) => {
    if (!onAssignedClassesChange) return;
    const updated = assignedClasses.filter((_, i) => i !== index);
    onAssignedClassesChange(updated);
    if (updated.length > 0) {
      onBranchChange(updated[0].branch);
      onClassChange(updated[0].className);
      onSectionChange(updated[0].section);
    } else {
      onBranchChange('');
      onClassChange('');
      onSectionChange('');
    }
  };

  return (
    <div className="cascading-select">
      <div className="cascading-select__divider">
        <span>
          {role === 'coordinator'
            ? 'COORDINATOR CLASS (SINGLE CLASS)'
            : role === 'faculty'
            ? 'ASSIGNED TEACHING CLASSES'
            : 'ACADEMIC ENROLLMENT DETAILS'}
        </span>
      </div>

      {/* For Faculty: Multi-class selection tool */}
      {role === 'faculty' ? (
        <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
            Select the branch, class & section you teach, then click <strong>+ Add Class</strong> to include multiple classes:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>Branch</label>
              <select
                value={tempBranch || selectedBranch || ''}
                onChange={(e) => {
                  setTempBranch(e.target.value);
                  setTempClass('');
                  setTempSection('');
                }}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#fff' }}
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>Class / Year</label>
              <select
                value={tempClass || ''}
                onChange={(e) => setTempClass(e.target.value)}
                disabled={!tempBranch && !selectedBranch}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#fff' }}
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>Section</label>
              <select
                value={tempSection || ''}
                onChange={(e) => setTempSection(e.target.value)}
                disabled={!tempBranch && !selectedBranch}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#fff' }}
              >
                <option value="">Select Section</option>
                {sections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddClass}
            disabled={(!tempBranch && !selectedBranch) || !tempClass || !tempSection}
            style={{
              width: '100%',
              padding: '8px 14px',
              borderRadius: '10px',
              background: (!tempBranch && !selectedBranch) || !tempClass || !tempSection ? '#E2E8F0' : '#2563EB',
              color: (!tempBranch && !selectedBranch) || !tempClass || !tempSection ? '#94A3B8' : '#fff',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: (!tempBranch && !selectedBranch) || !tempClass || !tempSection ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_circle</span>
            Add Class to Teaching Schedule
          </button>

          {/* List of Added Classes */}
          <div style={{ marginTop: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
              Selected Classes ({assignedClasses.length}):
            </label>
            {assignedClasses.length === 0 ? (
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48', fontSize: '11px', fontWeight: 600 }}>
                ⚠️ Please add at least one class you will teach.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {assignedClasses.map((ac, idx) => (
                  <div
                    key={`${ac.branch}-${ac.className}-${ac.section}-${idx}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#1E40AF'
                    }}
                  >
                    <span>{ac.branch.split(' ')[0]} • {ac.className} ({ac.section})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveClass(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#DC2626', display: 'flex', alignItems: 'center' }}
                      title="Remove class"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Coordinator / Student Single Class Selection */
        <>
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
        </>
      )}

      {/* Subjects for Faculty and Coordinator */}
      {(role === 'faculty' || role === 'coordinator') && (
        <>
          <div className="form-group">
            <label htmlFor="subjectSelect">
              Subjects (You will teach & manage)
              {selectedBranch && (
                <span className="subject-hint"> — {selectedBranch.split(' ')[0]}</span>
              )}
            </label>
            <div className="input-icon">
              <span className="material-symbols-outlined input-icon__icon" aria-hidden="true">menu_book</span>
              <select
                id="subjectSelect"
                value=""
                onChange={(e) => handleAddSubject(e.target.value)}
                disabled={!selectedBranch && assignedClasses.length === 0}
              >
                <option value="" disabled>
                  {!selectedBranch && assignedClasses.length === 0
                    ? 'Select or Add a Branch/Class first'
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
            <label>Subjects Chosen</label>
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
