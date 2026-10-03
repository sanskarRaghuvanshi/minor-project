import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Pagination from '../common/Pagination';
import Skeleton from '../common/Skeleton';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../utils/formatDate';

const MyLeaves = () => {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const { page, limit, total, totalPages, updateMeta, setPage, changeLimit } = usePagination();

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.LEAVE.MY_LEAVES, { params: { page, limit } });
      setLeaves(res.data || []);
      updateMeta(res.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, updateMeta]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const getStatusBadge = (status) => {
    if (status === 'approved') {
      return { bg: '#ECFDF5', color: '#059669', border: '#BBF7D0', label: 'APPROVED' };
    }
    if (status === 'rejected') {
      return { bg: '#FFF1F2', color: '#E11D48', border: '#FECDD3', label: 'REJECTED' };
    }
    return { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A', label: 'PENDING' };
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '2px 10px', borderRadius: '100px', background: '#EFF6FF', color: '#1E50DE', border: '1px solid #DBEAFE', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1E50DE' }} />
              Absence Registry
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              Leave History
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            My Leave Applications
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Track the approval status and faculty remarks on submitted absence requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/student/apply-leave')}
          style={{
            padding: '10px 18px', borderRadius: '12px', background: '#2563EB', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Apply New Leave
        </button>
      </div>

      {loading ? (
        <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid rgba(226,232,240,0.8)' }}>
          <Skeleton variant="card" height="260px" />
        </div>
      ) : leaves.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '24px', padding: '48px 20px', textAlign: 'center', border: '1px solid rgba(226,232,240,0.8)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#CBD5E1', marginBottom: '12px' }}>flight_takeoff</span>
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0F172A', fontWeight: 700 }}>No Leave Requests Submitted</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#94A3B8' }}>You have not submitted any leave applications yet.</p>
          <button
            type="button"
            onClick={() => navigate('/student/apply-leave')}
            style={{
              padding: '8px 16px', borderRadius: '10px', background: '#2563EB', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700
            }}
          >
            Apply for Leave
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px' }}>Duration</th>
                  <th style={{ padding: '14px 16px' }}>Reason</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Reviewed By</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l, idx) => {
                  const badge = getStatusBadge(l.status);
                  return (
                    <tr
                      key={l._id}
                      style={{
                        borderBottom: idx !== leaves.length - 1 ? '1px solid #F1F5F9' : 'none',
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap', fontWeight: 600, color: '#0F172A' }}>
                        {formatDate(l.startDate)} &rarr; {formatDate(l.endDate)}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', maxWidth: '300px' }}>
                        {l.reason}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 800,
                          background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: badge.color }} />
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', color: '#64748B', fontWeight: 600 }}>
                        {l.reviewedBy?.name || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid #F1F5F9' }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={changeLimit}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLeaves;
