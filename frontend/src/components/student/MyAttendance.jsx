import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Pagination from '../common/Pagination';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../utils/formatDate';
import { STATUS_BADGE } from '../../utils/constants';
import usePolling from '../../hooks/usePolling';

const MyAttendance = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { page, limit, total, totalPages, updateMeta, setPage, changeLimit } = usePagination();

  const fetchAttendance = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.STUDENT.MY_ATTENDANCE, {
        params: {
          page, limit,
          subject: subject || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setData(res.data || []);
      updateMeta(res.meta);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [page, limit, subject, startDate, endDate, updateMeta]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);
  usePolling(() => fetchAttendance(true), 30000);

  const exportCSV = () => {
    const headers = 'Date,Subject,Status\n';
    const rows = data.map((r) => `${formatDate(r.date)},${r.subject},${r.status}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="my-attendance">
      <div className="dashboard-home__header">
        <h1>My Attendance</h1>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="date-filters">
          <div className="form-group">
            <label htmlFor="ma-subject">Subject</label>
            <input id="ma-subject" value={subject} onChange={(e) => { setSubject(e.target.value); setPage(1); }} placeholder="All subjects" />
          </div>
          <div className="form-group">
            <label htmlFor="ma-start">Start Date</label>
            <input id="ma-start" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
          </div>
          <div className="form-group">
            <label htmlFor="ma-end">End Date</label>
            <input id="ma-end" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
          </div>
          <div className="form-group" style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="btn btn--secondary" onClick={exportCSV} disabled={data.length === 0}>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {loading ? (
        <Skeleton variant="card" height="300px" />
      ) : data.length === 0 ? (
        <EmptyState icon="📋" title="No attendance records" message="No attendance has been marked for you yet" />
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r._id}>
                    <td>{formatDate(r.date)}</td>
                    <td><span className="badge badge--info">{r.subject}</span></td>
                    <td>
                      <span className={STATUS_BADGE[r.status]?.className || 'badge'}>
                        {STATUS_BADGE[r.status]?.label || r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={changeLimit}
          />
        </>
      )}
    </div>
  );
};

export default MyAttendance;
