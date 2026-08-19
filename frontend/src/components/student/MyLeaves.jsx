import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Pagination from '../common/Pagination';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../utils/formatDate';

const MyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const { page, limit, total, totalPages, updateMeta, setPage } = usePagination();

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.LEAVE.MY_LEAVES, { params: { page, limit } });
      setLeaves(res.data || []);
      updateMeta(res.meta);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, limit, updateMeta]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const statusBadge = (s) => {
    if (s === 'approved') return 'badge--success';
    if (s === 'rejected') return 'badge--danger';
    return 'badge--warning';
  };

  return (
    <div className="my-leaves">
      <div className="dashboard-home__header">
        <h1>My Leaves</h1>
        <Link to="/student/apply-leave" className="btn btn--primary">Apply Leave</Link>
      </div>
      {loading ? <Skeleton variant="card" height="300px" /> : leaves.length === 0 ? (
        <EmptyState icon="📋" title="No leave requests" message="You haven't applied for any leave yet" />
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Start Date</th><th>End Date</th><th>Reason</th><th>Status</th><th>Reviewed By</th></tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id}>
                    <td>{formatDate(l.startDate)}</td>
                    <td>{formatDate(l.endDate)}</td>
                    <td>{l.reason}</td>
                    <td><span className={`badge ${statusBadge(l.status)}`}>{l.status}</span></td>
                    <td>{l.reviewedBy?.name || '—'}</td>
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

export default MyLeaves;
