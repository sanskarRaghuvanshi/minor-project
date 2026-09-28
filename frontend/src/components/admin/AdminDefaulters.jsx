import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Pagination from '../common/Pagination';
import SearchInput from '../common/SearchInput';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';

const BRANCH_OPTIONS = ['CSE', 'IT', 'ECE', 'ME', 'CE'];
const CLASS_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const getBadgeClass = (pct) => {
  if (pct >= 75) return 'badge--success';
  if (pct >= 60) return 'badge--warning';
  return 'badge--danger';
};

const AdminDefaulters = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [className, setClassName] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const { page, limit, total, totalPages, updateMeta, setPage, changeLimit } = usePagination(1, 20);
  const requestIdRef = useRef(0);

  const fetchDefaulters = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.ADMIN.DEFAULTERS, {
        params: {
          page,
          limit,
          threshold: 75,
          search: debouncedSearch || undefined,
          branch: branch || undefined,
          className: className || undefined,
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
  }, [page, limit, debouncedSearch, branch, className, updateMeta]);

  useEffect(() => { fetchDefaulters(); }, [fetchDefaulters]);

  const handleBranchChange = (e) => { setBranch(e.target.value); setPage(1); };
  const handleClassChange = (e) => { setClassName(e.target.value); setPage(1); };
  const handleSearch = (v) => { setSearch(v); setPage(1); };

  return (
    <div className="defaulters-page">
      <div className="dashboard-home__header">
        <h1>⚠️ Defaulters</h1>
        <p className="text-secondary">
          Students with overall attendance below <strong>75%</strong>
          {total > 0 && <span className="badge badge--danger" style={{ marginLeft: '10px' }}>{total} student{total !== 1 ? 's' : ''}</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '160px', marginBottom: 0 }}>
            <label htmlFor="adm-def-branch">Branch</label>
            <select id="adm-def-branch" value={branch} onChange={handleBranchChange}>
              <option value="">All Branches</option>
              {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '160px', marginBottom: 0 }}>
            <label htmlFor="adm-def-class">Year / Class</label>
            <select id="adm-def-class" value={className} onChange={handleClassChange}>
              <option value="">All Years</option>
              {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Search name or email..."
            loading={loading}
            style={{ flex: 2, minWidth: '220px' }}
          />
        </div>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {loading ? (
        <Skeleton variant="card" height="320px" />
      ) : data.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="No defaulters found"
          message="All students are above the 75% attendance threshold for the selected filters"
        />
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Branch</th>
                  <th>Year</th>
                  <th>Section</th>
                  <th>Present</th>
                  <th>Total</th>
                  <th>Overall %</th>
                  <th>Subjects Below 75%</th>
                  <th>Classes Needed</th>
                </tr>
              </thead>
              <tbody>
                {data.map((student, idx) => (
                  <tr key={student._id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>{student.name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{student.email}</td>
                    <td>
                      {student.branch
                        ? <span className="badge badge--info">{student.branch}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{student.className || '—'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{student.section || '—'}</td>
                    <td>{student.presentClasses}</td>
                    <td>{student.totalClasses}</td>
                    <td>
                      <span className={`badge ${getBadgeClass(student.percentage)}`}>
                        {student.percentage}%
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(student.subjectsBelowThreshold || []).map((s) => (
                          <span
                            key={s.subject}
                            className="subject-chip"
                            title={`${s.percentage}%`}
                          >
                            {s.subject} — {s.percentage}%
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {student.neededFor75 > 0
                        ? <span className="badge badge--warning">+{student.neededFor75}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
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

export default AdminDefaulters;
