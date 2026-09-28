import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';
import { LECTURE_SLOTS } from '../../utils/timetableSlots';

const FacultySettings = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [branch, setBranch] = useState(user?.branch || '');
  const [className, setClassName] = useState(user?.className || '');
  const [section, setSection] = useState(user?.section || '');
  const [subjects, setSubjects] = useState(user?.subjects || []);
  const [newSubject, setNewSubject] = useState('');
  const [saving, setSaving] = useState(false);

  // Available subjects from the branch/class config
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch subjects when branch or className changes
  const fetchAvailableSubjects = useCallback(async () => {
    const b = branch.trim();
    const c = className.trim();
    if (!b || !c) {
      setAvailableSubjects([]);
      return;
    }
    setLoadingSubjects(true);
    try {
      const { data } = await axiosInstance.get(ENDPOINTS.BRANCHES.SUBJECTS(b, c));
      setAvailableSubjects(data.data || []);
    } catch {
      setAvailableSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  }, [branch, className]);

  useEffect(() => {
    fetchAvailableSubjects();
  }, [fetchAvailableSubjects]);

  // Filtered list: only subjects not already added
  const filteredSuggestions = availableSubjects.filter(
    (s) => !subjects.includes(s)
  );

  const handleAddSubject = (e) => {
    e?.preventDefault();
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    if (subjects.includes(trimmed)) {
      addToast?.('Subject already added', 'warning');
      return;
    }
    setSubjects([...subjects, trimmed]);
    setNewSubject('');
  };

  const handleRemoveSubject = (subjToRemove) => {
    setSubjects(subjects.filter((s) => s !== subjToRemove));
  };

  const handleSelectSubject = (subj) => {
    if (!subjects.includes(subj)) {
      setSubjects([...subjects, subj]);
    }
    setDropdownOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast?.('Name cannot be empty', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        branch: branch.trim(),
        className: className.trim(),
        section: section.trim(),
        subjects,
      };

      const { data } = await axiosInstance.put(ENDPOINTS.AUTH.UPDATE_PROFILE, payload);
      const updatedUser = data.data.user;

      updateUser?.({
        ...user,
        ...updatedUser,
      });

      addToast?.('Teacher settings saved successfully!', 'success');
    } catch (err) {
      addToast?.(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'FA';

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '2px 10px', borderRadius: '100px', background: '#EFF6FF', color: '#1E50DE', border: '1px solid #DBEAFE', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1E50DE' }} />
              Settings Terminal
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              Faculty Profile & Preferences
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Teacher Settings
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Manage your teaching assignments, section, courses, and department details.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 22px', borderRadius: '12px', background: '#2563EB', color: '#fff',
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            transition: 'all 0.15s'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
          {saving ? 'Saving Changes...' : 'Save Settings'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Personal & Academic Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Faculty Profile Card */}
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '20px' }}>person</span>
              Profile Details
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', background: '#2563EB',
                color: '#fff', fontWeight: 700, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)', flexShrink: 0
              }}>
                {initials}
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '15px', color: '#0F172A' }}>{user?.name}</strong>
                <span style={{ fontSize: '12px', color: '#64748B' }}>{user?.email}</span>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: '#EFF6FF', color: '#1E50DE', fontSize: '10px', fontWeight: 800, marginLeft: '8px' }}>
                  FACULTY
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                  Registered Email (Fixed)
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: '13px', color: '#94A3B8', outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed' }}
                />
              </div>
            </div>
          </div>

          {/* Academic Assignment Card */}
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '20px' }}>school</span>
              Class & Section Assignment
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                  Branch / Department
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Computer Science and Engineering"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                    Class / Year
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. B.Tech III Year"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                    Section / Batch
                  </label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. CIT-4 or Section A"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Teaching Subjects & Timetable Reference */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Courses & Subjects Manager */}
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '20px' }}>menu_book</span>
              Assigned Courses / Subjects
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#94A3B8' }}>
              These subjects will be available for you when marking roll calls or launching QR sessions.
            </p>

            {/* Select from available subjects */}
            {availableSubjects.length > 0 && (
              <div style={{ marginBottom: '12px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                  Pick from your branch subjects
                </label>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#F8FAFC',
                    border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left'
                  }}
                >
                  <span style={{ color: filteredSuggestions.length === 0 ? '#94A3B8' : '#0F172A' }}>
                    {filteredSuggestions.length === 0
                      ? 'All subjects already added ✓'
                      : `${filteredSuggestions.length} subject${filteredSuggestions.length > 1 ? 's' : ''} available — click to pick`}
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748B', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    expand_more
                  </span>
                </button>

                {dropdownOpen && filteredSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', zIndex: 20,
                    background: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.12)', maxHeight: '220px', overflowY: 'auto'
                  }}>
                    {filteredSuggestions.map((subj) => (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => handleSelectSubject(subj)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                          padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer', fontSize: '13px', color: '#0F172A', textAlign: 'left',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#EFF6FF'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#2563EB' }}>add_circle</span>
                        {subj}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {loadingSubjects && (
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                Loading subjects from branch config...
              </p>
            )}

            {/* OR type manually */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                Or add custom subject manually
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubject();
                    }
                  }}
                  placeholder="Type subject name and press Enter..."
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            {/* Subject Tags */}
            {subjects.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #E2E8F0' }}>
                No subjects configured. Add your first subject above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {subjects.map((s) => (
                  <div
                    key={s}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 12px', borderRadius: '10px',
                      background: '#EFF6FF', border: '1px solid #DBEAFE', color: '#1E50DE',
                      fontSize: '12px', fontWeight: 700
                    }}
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#94A3B8' }}
                      title="Remove subject"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timetable Period Reference */}
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '20px' }}>schedule</span>
              Configured 8-Period Timetable
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#94A3B8' }}>
              Standard college lecture slots active across all sessions
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              {LECTURE_SLOTS.map((slot) => (
                <div
                  key={slot.id}
                  style={{
                    padding: '8px 12px', borderRadius: '10px', background: '#F8FAFC',
                    border: '1px solid #F1F5F9', fontSize: '11px'
                  }}
                >
                  <strong style={{ display: 'block', color: '#0F172A' }}>Period {slot.slotNumber}</strong>
                  <span style={{ color: '#64748B', fontWeight: 500 }}>{slot.timeRange}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultySettings;
