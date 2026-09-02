import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import Pagination from '../common/Pagination';
import SearchInput from '../common/SearchInput';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import Modal from '../common/Modal';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';

const Defaulters = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selected, setSelected] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const { page, limit, total, totalPages, updateMeta, setPage, changeLimit } = usePagination(1, 20);
  const requestIdRef = useRef(0);

  const fetchDefaulters = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.FACULTY.DEFAULTERS, {
        params: {
          page, limit, subject: subject || undefined, search: debouncedSearch || undefined, threshold: 75,
        },
      });
      if (requestId !== requestIdRef.current) return;
      setData(res.data || []);
      updateMeta(res.meta);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.response?.data?.message || 'Failed to load defaulters');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [page, limit, subject, debouncedSearch, updateMeta]);

  useEffect(() => { fetchDefaulters(); }, [fetchDefaulters]);

  const toggleSelect = (email) => {
    setSelected((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]));
  };

  const toggleSelectAll = () => {
    if (selected.length === data.length) setSelected([]);
    else setSelected(data.map((d) => d.email));
  };

  const handleSendAlerts = async () => {
    if (selected.length === 0) return;
    setSending(true);
    try {
      const { data: res } = await axiosInstance.post(ENDPOINTS.FACULTY.NOTIFY_DEFAULTERS, {
        studentIds: data.filter((d) => selected.includes(d.email)).map((d) => d._id),
        subject: subject || undefined,
      });
      addToast(`Sent: ${res.data.sentCount}, Failed: ${res.data.failedCount}`, res.data.failedCount > 0 ? 'warning' : 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send alerts', 'error');
    } finally {
      setSending(false);
      setShowConfirm(false);
      setSelected([]);
    }
  };

  const subjects = user?.subjects || [];

  return (
    <div className="defaulters-page">
      <div className="dashboard-home__header">
        <h1>Defaulters</h1>
        <p className="text-secondary">Students below 75% attendance threshold</p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label htmlFor="def-subject">Filter by Subject</label>
            <select id="def-subject" value={subject} onChange={(e) => { setSubject(e.target.value); setPage(1); }}>
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search name/email..."
            loading={loading}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn btn--danger"
            disabled={selected.length === 0}
            onClick={() => setShowConfirm(true)}
          >
            Send Alert ({selected.length})
          </button>
        </div>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {loading ? (
        <Skeleton variant="card" height="300px" />
      ) : data.length === 0 ? (
        <EmptyState icon="🎉" title="No defaulters" message="All students are above the 75% threshold" />
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selected.length === data.length && data.length > 0}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Present</th>
                  <th>Total</th>
                  <th>Percentage</th>
                  <th>Needed for 75%</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) =>
                  (d.subjectsBelowThreshold || []).map((s, idx) => (
                    <tr key={`${d.email}-${s.subject}`}>
                      {idx === 0 && (
                        <>
                          <td rowSpan={(d.subjectsBelowThreshold || []).length}>
                            <input
                              type="checkbox"
                              checked={selected.includes(d.email)}
                              onChange={() => toggleSelect(d.email)}
                              aria-label={`Select ${d.name}`}
                            />
                          </td>
                          <td rowSpan={(d.subjectsBelowThreshold || []).length}>{d.name}</td>
                          <td rowSpan={(d.subjectsBelowThreshold || []).length} style={{ color: 'var(--text-secondary)' }}>{d.email}</td>
                        </>
                      )}
                      <td><span className="badge badge--info">{s.subject}</span></td>
                      <td>{s.present}</td>
                      <td>{s.total}</td>
                      <td>
                        <span className={`badge ${s.percentage >= 75 ? 'badge--success' : s.percentage >= 60 ? 'badge--warning' : 'badge--danger'}`}>
                          {s.percentage}%
                        </span>
                      </td>
                      <td>{s.needed}</td>
                    </tr>
                  ))
                )}
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

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Alert">
        <p>Send attendance warning emails to {selected.length} student(s)?</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="button" className="btn btn--danger" onClick={handleSendAlerts} disabled={sending}>
            {sending ? 'Sending...' : 'Yes, Send'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
};

export default Defaulters;
