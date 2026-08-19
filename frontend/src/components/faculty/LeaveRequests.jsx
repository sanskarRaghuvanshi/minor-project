import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Pagination from '../common/Pagination';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../utils/formatDate';

const LeaveRequests = () => {
  const [tab, setTab] = useState('pending');
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const { page, limit, total, totalPages, updateMeta, setPage } = usePagination();

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'pending' ? ENDPOINTS.LEAVE.PENDING : ENDPOINTS.LEAVE.ALL;
      const params = { page, limit };
      const { data: res } = await axiosInstance.get(endpoint, { params });
      setLeaves(res.data || []);
      updateMeta(res.meta);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tab, page, limit, updateMeta]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const review = async (id, status) => {
    try {
      await axiosInstance.patch(ENDPOINTS.LEAVE.REVIEW(id), { status });
      fetchLeaves();
    } catch (err) { console.error(err); }
  };

  const statusBadge = (s) => {
    if (s === 'approved') return 'badge--success';
    if (s === 'rejected') return 'badge--danger';
    return 'badge--warning';
  };

  return (
    <div className="leave-requests">
      <div className="dashboard-home__header">
        <h1>Leave Requests</h1>
        <div className="tabs">
          <button className={`btn ${tab === 'pending' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => { setTab('pending'); setPage(1); }}>Pending</button>
          <button className={`btn ${tab === 'all' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => { setTab('all'); setPage(1); }}>All</button>
        </div>
      </div>
      {loading ? <Skeleton variant="card" height="300px" /> : leaves.length === 0 ? (
        <EmptyState icon="📋" title="No leave requests" message="No leave requests found" />
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Student</th><th>Email</th><th>Start</th><th>End</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id}>
                    <td>{l.student?.name}</td>
                    <td>{l.student?.email}</td>
                    <td>{formatDate(l.startDate)}</td>
                    <td>{formatDate(l.endDate)}</td>
                    <td>{l.reason}</td>
                    <td><span className={`badge ${statusBadge(l.status)}`}>{l.status}</span></td>
                    <td>
                      {l.status === 'pending' ? (
                        <>
                          <button className="btn btn--success btn--sm" onClick={() => review(l._id, 'approved')} style={{ marginRight: '8px' }}>Approve</button>
                          <button className="btn btn--danger btn--sm" onClick={() => review(l._id, 'rejected')}>Reject</button>
                        </>
                      ) : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default LeaveRequests;
