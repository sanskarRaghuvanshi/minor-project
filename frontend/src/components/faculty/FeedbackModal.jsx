import { useState } from 'react';
import Modal from '../common/Modal';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';

const RATING_LABELS = {
  1: { label: 'Poor / Low Engagement', color: '#EF4444', emoji: '😞' },
  2: { label: 'Fair / Needs Improvement', color: '#F59E0B', emoji: '😐' },
  3: { label: 'Good / Standard Delivery', color: '#3B82F6', emoji: '🙂' },
  4: { label: 'Very Good / High Interaction', color: '#10B981', emoji: '😊' },
  5: { label: 'Outstanding Lecture!', color: '#8B5CF6', emoji: '🌟' },
};

const FeedbackModal = ({ isOpen, onClose, date, subject, studentsPresent, onSkip }) => {
  const [form, setForm] = useState({
    topicCovered: '',
    remarks: '',
    rating: 5,
    studentsPresent: studentsPresent || 0,
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [showSkipInput, setShowSkipInput] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();

  const validate = () => {
    const newErrors = {};
    if (!form.topicCovered.trim()) newErrors.topicCovered = 'Please describe the topic covered in this class';
    else if (form.topicCovered.length > 200) newErrors.topicCovered = 'Maximum 200 characters allowed';
    if (form.remarks && form.remarks.length > 500) newErrors.remarks = 'Maximum 500 characters allowed';
    if (!form.rating) newErrors.rating = 'Please select a session rating';
    if (form.studentsPresent < 0) newErrors.studentsPresent = 'Must be a non-negative number';
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
        className: user?.className,
        branch: user?.branch,
        date,
        ...form,
      });
      addToast?.('Class feedback submitted successfully!', 'success');
      onClose();
    } catch (err) {
      addToast?.(err.response?.data?.message || 'Failed to submit feedback', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (!skipReason.trim()) return;
    onSkip?.(skipReason);
    onClose();
  };

  const activeRating = hoverRating || form.rating;
  const ratingInfo = RATING_LABELS[activeRating] || RATING_LABELS[5];

  return (
    <Modal isOpen={isOpen} onClose={undefined} title="" force>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '14px', background: '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E50DE', flexShrink: 0
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>rate_review</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                Class Feedback Log
              </h2>
              <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#EFF6FF', color: '#1E50DE', fontSize: '10px', fontWeight: 800 }}>
                ATTENDANCE SAVED
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
              {subject ? `${subject} • ` : ''}{date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          
          {/* 1. Topic Covered */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="topicCovered" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.04em' }}>
                Topic Covered in Lecture *
              </label>
              <span style={{ fontSize: '11px', color: form.topicCovered.length > 180 ? '#EF4444' : '#94A3B8', fontWeight: 600 }}>
                {form.topicCovered.length}/200
              </span>
            </div>
            <textarea
              id="topicCovered"
              value={form.topicCovered}
              onChange={(e) => setForm((p) => ({ ...p, topicCovered: e.target.value }))}
              rows={2}
              maxLength={200}
              placeholder="e.g. Binary Search Trees & AVL Rotations with live code walkthrough..."
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '12px',
                background: '#F8FAFC', border: errors.topicCovered ? '1px solid #EF4444' : '1px solid #E2E8F0',
                fontSize: '13px', color: '#0F172A', outline: 'none', boxSizing: 'border-box',
                resize: 'none', transition: 'border-color 0.15s'
              }}
            />
            {errors.topicCovered && (
              <span style={{ color: '#EF4444', fontSize: '11px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                {errors.topicCovered}
              </span>
            )}
          </div>

          {/* 2. Interactive Star Rating */}
          <div style={{
            marginBottom: '18px', padding: '14px 16px', borderRadius: '16px',
            background: '#F8FAFC', border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.04em' }}>
                Lecture Engagement Rating *
              </label>
              <span style={{
                fontSize: '11px', fontWeight: 700, color: ratingInfo.color,
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <span>{ratingInfo.emoji}</span>
                <span>{ratingInfo.label}</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isHighlighted = (hoverRating || form.rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setForm((p) => ({ ...p, rating: star }))}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'transform 0.15s ease'
                    }}
                    aria-label={`${star} star rating`}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '32px',
                        color: isHighlighted ? '#F59E0B' : '#CBD5E1',
                        fontVariationSettings: isHighlighted ? "'FILL' 1" : "'FILL' 0",
                        filter: isHighlighted ? 'drop-shadow(0 2px 4px rgba(245,158,11,0.3))' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      star
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.rating && (
              <span style={{ color: '#EF4444', fontSize: '11px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                {errors.rating}
              </span>
            )}
          </div>

          {/* 3. Remarks (Optional) */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="remarks" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em' }}>
                Additional Remarks (Optional)
              </label>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                {form.remarks.length}/500
              </span>
            </div>
            <textarea
              id="remarks"
              value={form.remarks}
              onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
              rows={2}
              maxLength={500}
              placeholder="Any student queries, lab observations, or topics carried over to next period..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '12px',
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                fontSize: '13px', color: '#0F172A', outline: 'none', boxSizing: 'border-box',
                resize: 'none'
              }}
            />
          </div>

          {/* 4. Students Present Count */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="studentsPresent" style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
              Confirmed Students Present
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                position: 'relative', width: '100%', display: 'flex', alignItems: 'center'
              }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', color: '#2563EB', fontSize: '18px' }}>groups</span>
                <input
                  id="studentsPresent"
                  type="number"
                  value={form.studentsPresent}
                  onChange={(e) => setForm((p) => ({ ...p, studentsPresent: parseInt(e.target.value) || 0 }))}
                  min={0}
                  style={{
                    width: '100%', padding: '10px 14px 10px 38px', borderRadius: '12px',
                    background: '#F8FAFC', border: '1px solid #E2E8F0',
                    fontSize: '13px', fontWeight: 700, color: '#0F172A', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* 5. Modal Footer Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
            
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 22px', borderRadius: '12px', background: '#2563EB', color: '#fff',
                border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                transition: 'all 0.15s'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>

            {!showSkipInput ? (
              <button
                type="button"
                onClick={() => setShowSkipInput(true)}
                style={{
                  padding: '10px 18px', borderRadius: '12px', background: 'transparent',
                  color: '#64748B', border: '1px solid #E2E8F0', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600, transition: 'background 0.15s'
                }}
              >
                Skip for now
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                <input
                  placeholder="Reason for skipping feedback..."
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '10px',
                    background: '#F8FAFC', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={!skipReason.trim()}
                  style={{
                    padding: '8px 14px', borderRadius: '10px',
                    background: skipReason.trim() ? '#475569' : '#CBD5E1', color: '#fff',
                    border: 'none', cursor: skipReason.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap'
                  }}
                >
                  Confirm Skip
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default FeedbackModal;
