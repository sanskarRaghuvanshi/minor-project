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

const CoordinatorStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { page, limit, total, totalPages, updateMeta, setPage, changeLimit } = usePagination();
  const requestIdRef = useRef(0);

  const fetchStudents = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.COORDINATOR.STUDENTS, {
        params: { page, limit, search: debouncedSearch || undefined },
      });
      // A faster-typing user can have an older request resolve after a newer
      // one — only apply the response if nothing newer has since been fired.
      if (requestId !== requestIdRef.current) return;
      setStudents(res.data || []);
      updateMeta(res.meta);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.response?.data?.message || 'Failed to load students');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [page, limit, debouncedSearch, updateMeta]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  return (
    <div className="coordinator-students">
      <div className="dashboard-home__header">
        <h1>Students</h1>
        <p className="text-secondary">{user?.branch} - {user?.className} - {user?.section}</p>
      </div>

      <div style={{ marginBottom: '16px', maxWidth: '400px' }}>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search students..." loading={loading} />
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {loading ? (
        <Skeleton variant="card" height="300px" />
      ) : students.length === 0 ? (
        <EmptyState icon="🎓" title="No students found" message="No students are assigned to your class" />
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Branch</th><th>Class</th><th>Section</th></tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id}>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>{s.branch}</td>
                    <td>{s.className}</td>
                    <td><span className="badge badge--info">{s.section || '-'}</span></td>
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

export default CoordinatorStudents;
