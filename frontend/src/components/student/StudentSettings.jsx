import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';
import { LECTURE_SLOTS } from '../../utils/timetableSlots';

const StudentSettings = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [branch, setBranch] = useState(user?.branch || '');
  const [className, setClassName] = useState(user?.className || '');
  const [section, setSection] = useState(user?.section || '');
  const [saving, setSaving] = useState(false);

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
      };

      const { data } = await axiosInstance.put(ENDPOINTS.AUTH.UPDATE_PROFILE, payload);
      const updatedUser = data.data.user;

      updateUser?.({
        ...user,
        ...updatedUser,
      });

      addToast?.('Student profile updated successfully!', 'success');
    } catch (err) {
      addToast?.(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ST';

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '2px 10px', borderRadius: '100px', background: '#EFF6FF', color: '#1E50DE', border: '1px solid #DBEAFE', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1E50DE' }} />
              Student Terminal
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              Profile & Academic Info
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Account Settings
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Manage your personal profile, department, and enrolled section details.
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
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Personal Profile Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Student Profile Card */}
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
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: '#ECFDF5', color: '#059669', fontSize: '10px', fontWeight: 800, marginLeft: '8px' }}>
                  STUDENT
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                  Full Name
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
                  Registered Institutional Email (Fixed)
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

          {/* Academic Enrollment Card */}
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '20px' }}>school</span>
              Academic Enrollment
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                  Branch / Major
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

        {/* Right Column: Standard Timetable & Student Guidance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 8-Period Timetable Reference */}
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '20px' }}>schedule</span>
              Standard 8-Period Timetable
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#94A3B8' }}>
              Daily lecture slots for attendance roll calls and QR scanning sessions.
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

          {/* Attendance Policy Notice */}
          <div style={{ background: '#EFF6FF', borderRadius: '24px', padding: '24px', border: '1px solid #DBEAFE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#1E50DE', fontSize: '20px' }}>info</span>
              <strong style={{ fontSize: '14px', color: '#1E50DE' }}>Attendance Quota Guidelines</strong>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
              Students must maintain a minimum of <strong>75% overall attendance</strong> across all subjects to remain eligible for mid-term and final examinations.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#475569', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              Safe Zone: &ge; 75%
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', marginLeft: '8px' }} />
              Defaulter Alert: &lt; 75%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSettings;
