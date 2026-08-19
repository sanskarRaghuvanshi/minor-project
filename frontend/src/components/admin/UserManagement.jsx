import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Pagination from '../common/Pagination';
import Skeleton from '../common/Skeleton';
import { usePagination } from '../../hooks/usePagination';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const { page, limit, total, totalPages, updateMeta, setPage } = usePagination();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.ADMIN.USERS, {
        params: { page, limit, search: search || undefined, role: roleFilter || undefined },
      });
      setUsers(res.data || []);
      updateMeta(res.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, updateMeta]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleStatus = async (id) => {
    try {
      await axiosInstance.patch(ENDPOINTS.ADMIN.TOGGLE_USER_STATUS(id));
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="user-management">
      <div className="dashboard-home__header">
        <h1>User Management</h1>
      </div>
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="date-filters">
          <div className="form-group">
            <label>Search</label>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Name or email..." />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? <Skeleton variant="card" height="300px" /> : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="badge badge--info">{u.role}</span></td>
                    <td>{u.branch} - {u.className}</td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge--success' : 'badge--danger'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn--secondary btn--sm" onClick={() => toggleStatus(u._id)}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
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

export default UserManagement;
