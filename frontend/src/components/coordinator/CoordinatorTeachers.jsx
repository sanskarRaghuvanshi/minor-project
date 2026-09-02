import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../common/Pagination';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import SearchInput from '../common/SearchInput';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';

const CoordinatorTeachers = () => {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { page, limit, total, totalPages, updateMeta, setPage, changeLimit } = usePagination();
  const requestIdRef = useRef(0);

  const fetchTeachers = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.COORDINATOR.TEACHERS, {
        params: { page, limit, search: debouncedSearch || undefined },
      });
      if (requestId !== requestIdRef.current) return;
      setTeachers(res.data || []);
      updateMeta(res.meta);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.response?.data?.message || 'Failed to load teachers');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [page, limit, debouncedSearch, updateMeta]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  return (
    <div className="coordinator-teachers">
      <div className="dashboard-home__header">
        <h1>Teachers</h1>
        <p className="text-secondary">{user?.branch} - {user?.className} - {user?.section}</p>
      </div>

      <div style={{ marginBottom: '16px', maxWidth: '400px' }}>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search teachers..." loading={loading} />
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {loading ? (
        <Skeleton variant="card" height="300px" />
      ) : teachers.length === 0 ? (
        <EmptyState icon="👨‍🏫" title="No teachers found" message="No teachers are assigned to your class" />
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Branch</th><th>Class</th><th>Section</th><th>Subjects</th></tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t._id}>
                    <td>{t.name}</td>
                    <td>{t.email}</td>
                    <td>{t.branch}</td>
                    <td>{t.className}</td>
                    <td><span className="badge badge--info">{t.section || '-'}</span></td>
                    <td>
                      {(t.subjects || []).map((s) => (
                        <span key={s} className="badge badge--success" style={{ marginRight: '4px' }}>{s}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={changeLimit} />
        </>
      )}
    </div>
  );
};

export default CoordinatorTeachers;
