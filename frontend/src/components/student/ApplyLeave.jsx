import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';

const ApplyLeave = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '', documentUrl: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason) { setError('Start date, end date, and reason are required'); return; }
    if (new Date(form.startDate) > new Date(form.endDate)) { setError('Start date must be before end date'); return; }
    setLoading(true);
    try {
      const payload = { startDate: form.startDate, endDate: form.endDate, reason: form.reason };
      if (form.documentUrl) payload.documentUrl = form.documentUrl;
      await axiosInstance.post(ENDPOINTS.LEAVE.APPLY, payload);
      navigate('/student/my-leaves');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apply-leave">
      <div className="dashboard-home__header">
        <h1>Apply for Leave</h1>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          {error && <div className="alert alert--error" role="alert">{error}</div>}
          <div className="date-filters">
            <div className="form-group">
              <label htmlFor="startDate">Start Date</label>
              <input id="startDate" name="startDate" type="date" value={form.startDate} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="endDate">End Date</label>
              <input id="endDate" name="endDate" type="date" value={form.endDate} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="reason">Reason</label>
            <textarea id="reason" name="reason" value={form.reason} onChange={handleChange} rows={4} maxLength={500} placeholder="Explain the reason for leave..." required />
          </div>
          <div className="form-group">
            <label htmlFor="documentUrl">Document URL (optional)</label>
            <input id="documentUrl" name="documentUrl" value={form.documentUrl} onChange={handleChange} placeholder="Link to supporting document" />
          </div>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Leave Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApplyLeave;
