import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';

const ApplyLeave = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '', documentUrl: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB');
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      const { data } = await axiosInstance.post(ENDPOINTS.LEAVE.UPLOAD_DOCUMENT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((p) => ({ ...p, documentUrl: data.data.documentUrl }));
      addToast?.('Supporting document uploaded', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload document';
      setError(msg);
      addToast?.(msg, 'error');
      e.target.value = '';
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setError('Start date, end date, and reason are required');
      return;
    }
    if (new Date(form.startDate) > new Date(form.endDate)) {
      setError('Start date must be before or equal to end date');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      };
      if (form.documentUrl) payload.documentUrl = form.documentUrl;
      await axiosInstance.post(ENDPOINTS.LEAVE.APPLY, payload);
      addToast?.('Leave application submitted for faculty review!', 'success');
      navigate('/student/my-leaves');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit leave request';
      setError(msg);
      addToast?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '2px 10px', borderRadius: '100px', background: '#EFF6FF', color: '#1E50DE', border: '1px solid #DBEAFE', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1E50DE' }} />
              Student Services
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              Official Absence Request
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Apply for Leave
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Submit an excused leave request to your faculty advisor and department coordinator.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/student/my-leaves')}
          style={{
            padding: '10px 18px', borderRadius: '12px', background: '#fff', color: '#0F172A',
            border: '1px solid #E2E8F0', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563EB' }}>format_list_bulleted</span>
          View My Leaves
        </button>
      </div>

      <div style={{ maxWidth: '720px' }}>
        <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
          <form onSubmit={handleSubmit} noValidate>
            
            {error && (
              <div style={{ padding: '14px 18px', borderRadius: '16px', background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48', marginBottom: '20px', fontSize: '13px', fontWeight: 600 }}>
                {error}
              </div>
            )}

            {/* Date Range Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label htmlFor="startDate" style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                  Leave Start Date *
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label htmlFor="endDate" style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                  Leave End Date *
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Reason Textarea */}
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="reason" style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                Reason for Absence *
              </label>
              <textarea
                id="reason"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                rows={4}
                maxLength={500}
                placeholder="Detail the medical or official reason for requesting leave..."
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            {/* Document Upload */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="document" style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                Supporting Document (Optional — Medical Certificate / Official Letter, Max 5MB)
              </label>
              <div style={{ padding: '14px 16px', borderRadius: '14px', background: '#F8FAFC', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <input
                  id="document"
                  name="document"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={handleFileChange}
                  disabled={uploading}
                  style={{ fontSize: '12px', color: '#64748B' }}
                />
                {uploading && <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>Uploading...</span>}
                {form.documentUrl && !uploading && (
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                    Attached
                  </span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px', borderRadius: '14px', background: '#2563EB', color: '#fff',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                transition: 'all 0.15s'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
              {loading ? 'Submitting Application...' : 'Submit Leave Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;
