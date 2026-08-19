import { useState } from 'react';
import Modal from '../common/Modal';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';

const FeedbackModal = ({ isOpen, onClose, date, subject, studentsPresent, onSkip }) => {
  const [form, setForm] = useState({
    topicCovered: '',
    remarks: '',
    rating: 0,
    studentsPresent: studentsPresent || 0,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [showSkipInput, setShowSkipInput] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();

  const validate = () => {
    const newErrors = {};
    if (!form.topicCovered.trim()) newErrors.topicCovered = 'Topic covered is required';
    else if (form.topicCovered.length > 200) newErrors.topicCovered = 'Max 200 characters';
    if (form.remarks && form.remarks.length > 500) newErrors.remarks = 'Max 500 characters';
    if (!form.rating) newErrors.rating = 'Rating is required';
    if (form.studentsPresent < 0) newErrors.studentsPresent = 'Must be non-negative';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await axiosInstance.post(ENDPOINTS.FACULTY.FEEDBACK, {
        subject,
        className: user.className,
        branch: user.branch,
        date,
        ...form,
      });
      addToast('Feedback submitted', 'success');
      onClose();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit feedback', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (!skipReason.trim()) return;
    onSkip(skipReason);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={undefined} title="Class Feedback" force>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="topicCovered">Topic Covered *</label>
          <textarea
            id="topicCovered"
            value={form.topicCovered}
            onChange={(e) => setForm((p) => ({ ...p, topicCovered: e.target.value }))}
            rows={2}
            maxLength={200}
            aria-invalid={!!errors.topicCovered}
            aria-describedby={errors.topicCovered ? 'topic-error' : undefined}
            required
          />
          {errors.topicCovered && <span id="topic-error" className="text-danger" style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.topicCovered}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="remarks">Remarks (optional)</label>
          <textarea
            id="remarks"
            value={form.remarks}
            onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
            rows={2}
            maxLength={500}
            aria-invalid={!!errors.remarks}
          />
        </div>
        <div className="form-group">
          <label>Rating *</label>
          <div className="rating-input" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`rating-star ${form.rating >= star ? 'rating-star--active' : ''}`}
                onClick={() => setForm((p) => ({ ...p, rating: star }))}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          {errors.rating && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.rating}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="studentsPresent">Students Present</label>
          <input
            id="studentsPresent"
            type="number"
            value={form.studentsPresent}
            onChange={(e) => setForm((p) => ({ ...p, studentsPresent: parseInt(e.target.value) || 0 }))}
            min={0}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
          {!showSkipInput ? (
            <button type="button" className="btn btn--ghost" onClick={() => setShowSkipInput(true)}>
              Skip
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
              <input
                placeholder="Reason for skipping"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn--secondary" onClick={handleSkip} disabled={!skipReason.trim()}>
                Confirm Skip
              </button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default FeedbackModal;
