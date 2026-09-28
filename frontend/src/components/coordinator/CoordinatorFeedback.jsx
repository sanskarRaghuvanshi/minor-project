import { useState, useEffect, useCallback, useMemo } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../common/Pagination';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../utils/formatDate';

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const AvatarColors = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];

const CoordinatorFeedback = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const { page, limit, total, totalPages, updateMeta, setPage, changeLimit } = usePagination(1, 15);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.COORDINATOR.FEEDBACK, {
        params: {
          page,
          limit,
          subject: subject || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setData(res.data || []);
      updateMeta(res.meta);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load lecture feedback');
    } finally {
      setLoading(false);
    }
  }, [page, limit, subject, startDate, endDate, updateMeta]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // Client-side quick search filter on faculty name, topic, or remarks
  const filteredData = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (f) =>
        f.faculty?.name?.toLowerCase().includes(q) ||
        f.topicCovered?.toLowerCase().includes(q) ||
        f.remarks?.toLowerCase().includes(q) ||
        f.subject?.toLowerCase().includes(q)
    );
  }, [data, search]);

  // Aggregate summary metrics
  const avgRating = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    return Math.round((sum / data.length) * 10) / 10;
  }, [data]);

  const totalStudentsTaught = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.studentsPresent || 0), 0);
  }, [data]);

  const clearFilters = () => {
    setSubject('');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      {/* Top Header & Snapshot Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                padding: '2px 10px',
                borderRadius: '100px',
                background: '#EFF6FF',
                color: '#1E50DE',
                border: '1px solid #DBEAFE',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1E50DE' }} />
              Coordinator Portal
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
            <span
              style={{
                fontSize: '12px',
                color: '#475569',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#94A3B8' }}>
                analytics
              </span>
              {user?.branch} • {user?.className}
              {user?.section ? ` - ${user.section}` : ''}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Class Feedback Log
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Lecture logs, topics covered, and self-assessments submitted by teachers after every class.
          </p>
        </div>

        {/* Real-time Summary Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#fff',
            padding: '6px 8px',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            border: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '12px',
              background: '#EFF6FF',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>
              LECTURES LOGGED: <strong style={{ fontSize: '13px', color: '#1E3A8A' }}>{total}</strong>
            </span>
          </div>
          {avgRating > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '12px',
                background: '#FEF9C3',
              }}
            >
              <span style={{ color: '#D97706', fontSize: '14px' }}>★</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#854D0E' }}>
                AVG RATING: <strong style={{ fontSize: '13px' }}>{avgRating} / 5</strong>
              </span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '12px',
              background: '#ECFDF5',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#059669' }}>
              group
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#065F46' }}>
              ATTENDEES: <strong style={{ fontSize: '13px' }}>{totalStudentsTaught}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Control Card (Filters & Search) */}
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          border: '1px solid rgba(226,232,240,0.8)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'center' }}>
          {/* Quick Search */}
          <div style={{ position: 'relative' }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px',
                color: '#94A3B8',
              }}
            >
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teacher, topic or remarks..."
              style={{
                width: '100%',
                paddingLeft: '38px',
                paddingRight: '12px',
                paddingTop: '8px',
                paddingBottom: '8px',
                borderRadius: '12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                color: '#0F172A',
              }}
            />
          </div>

          {/* Subject Filter */}
          <div style={{ position: 'relative' }}>
            <input
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by Subject..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                color: '#0F172A',
              }}
            />
          </div>

          {/* Start Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: '#0F172A', width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* End Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: '#0F172A', width: '100%', cursor: 'pointer' }}
            />
          </div>
        </div>

        {(subject || search || startDate || endDate) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              onClick={clearFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#EF4444',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                filter_alt_off
              </span>
              Clear Active Filters
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#DC2626',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* Main Feedback Log Container */}
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          border: '1px solid rgba(226,232,240,0.8)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '32px', display: 'block', marginBottom: '8px', animation: 'spin 1s infinite' }}
            >
              sync
            </span>
            Loading lecture feedback...
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>💬</span>
            <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>No feedback logs found</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8' }}>
              Feedback submitted by class teachers following lecture roll-call will appear here.
            </p>
          </div>
        ) : (
          <div>
            {filteredData.map((f, idx) => {
              const avatarColor = AvatarColors[idx % AvatarColors.length];
              const stars = '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating);

              return (
                <div
                  key={f._id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: idx < filteredData.length - 1 ? '1px solid #F1F5F9' : 'none',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Left: Faculty Avatar + Name + Subject Chip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: '#EFF6FF',
                        color: avatarColor,
                        fontWeight: 800,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(f.faculty?.name || 'Faculty')}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '14px', color: '#0F172A' }}>
                          {f.faculty?.name || 'Class Teacher'}
                        </strong>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: '#EFF6FF',
                            color: '#1E40AF',
                            border: '1px solid #DBEAFE',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {f.subject}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                        {formatDate(f.date)}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Topic Covered & Remarks Preview */}
                  <div style={{ flex: 1, minWidth: '220px', maxWidth: '380px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#2563EB' }}>
                        topic
                      </span>
                      <strong style={{ fontSize: '13px', color: '#0F172A' }}>
                        {f.topicCovered}
                      </strong>
                    </div>
                    {f.remarks ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#64748B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={f.remarks}
                      >
                        &ldquo;{f.remarks}&rdquo;
                      </p>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
                        No additional remarks
                      </span>
                    )}
                  </div>

                  {/* Rating Stars & Student Count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '180px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>
                        Self Rating
                      </span>
                      <span style={{ color: '#EAB308', fontSize: '14px', letterSpacing: '2px', fontWeight: 700 }}>
                        {stars}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>
                        Turnout
                      </span>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '8px',
                          background: '#ECFDF5',
                          color: '#059669',
                          fontSize: '11px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          check
                        </span>
                        {f.studentsPresent} Present
                      </span>
                    </div>
                  </div>

                  {/* Detail View Action */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedFeedback(f)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        background: '#F1F5F9',
                        color: '#334155',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>View Log</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        open_in_new
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: '16px' }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={changeLimit}
        />
      </div>

      {/* ========================================================================= */}
      {/* Detailed Feedback Inspection Modal                                       */}
      {/* ========================================================================= */}
      {selectedFeedback && (
        <div
          onClick={() => setSelectedFeedback(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '600px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(226,232,240,0.8)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                    menu_book
                  </span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                    Lecture Session Log
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    {formatDate(selectedFeedback.date)} • {selectedFeedback.subject}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#fff',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Faculty & Metric Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                  fontSize: '12px',
                }}
              >
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>
                    Faculty Name
                  </span>
                  <strong style={{ color: '#0F172A', fontSize: '13px' }}>
                    {selectedFeedback.faculty?.name || 'Class Faculty'}
                  </strong>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>
                    Students Present
                  </span>
                  <strong style={{ color: '#059669', fontSize: '13px' }}>
                    {selectedFeedback.studentsPresent} Students
                  </strong>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>
                    Teacher Self-Rating
                  </span>
                  <span style={{ color: '#EAB308', fontSize: '13px', fontWeight: 700 }}>
                    {'★'.repeat(selectedFeedback.rating)}{'☆'.repeat(5 - selectedFeedback.rating)} ({selectedFeedback.rating}/5)
                  </span>
                </div>
              </div>

              {/* Topic Covered Box */}
              <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', marginBottom: '4px' }}>
                  Topic Covered in Lecture
                </span>
                <p style={{ margin: 0, fontSize: '14px', color: '#0F172A', fontWeight: 700 }}>
                  {selectedFeedback.topicCovered}
                </p>
              </div>

              {/* Remarks Box */}
              <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', marginBottom: '4px' }}>
                  Teacher Remarks & Observations
                </span>
                <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                  {selectedFeedback.remarks || 'No additional remarks provided for this session.'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                background: '#F8FAFC',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '12px',
                  background: '#2563EB',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinatorFeedback;
