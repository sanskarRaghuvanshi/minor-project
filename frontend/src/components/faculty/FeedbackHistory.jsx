import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Pagination from '../common/Pagination';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../utils/formatDate';

const FeedbackHistory = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { page, limit, total, totalPages, updateMeta, setPage, changeLimit } = usePagination(1, 20);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.FACULTY.FEEDBACK_HISTORY, {
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
      setError(err.response?.data?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [page, limit, subject, startDate, endDate, updateMeta]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <div className="feedback-history">
      <div className="dashboard-home__header">
        <h1>Feedback History</h1>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
            <label htmlFor="fh-subject">Subject</label>
            <input id="fh-subject" value={subject} onChange={(e) => { setSubject(e.target.value); setPage(1); }} placeholder="Filter by subject" />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
            <label htmlFor="fh-start">Start Date</label>
            <input id="fh-start" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
            <label htmlFor="fh-end">End Date</label>
            <input id="fh-end" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {loading ? (
        <Skeleton variant="card" height="300px" />
      ) : data.length === 0 ? (
        <EmptyState icon="📝" title="No feedback yet" message="Submit feedback after marking attendance to see it here" />
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Topic</th>
                  <th>Rating</th>
                  <th>Students Present</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {data.map((f) => (
                  <tr key={f._id}>
                    <td>{formatDate(f.date)}</td>
                    <td><span className="badge badge--info">{f.subject}</span></td>
                    <td>{f.topicCovered}</td>
                    <td>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</td>
                    <td>{f.studentsPresent}</td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.remarks || '-'}</td>
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

export default FeedbackHistory;
