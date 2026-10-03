import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Skeleton from '../common/Skeleton';
import { usePagination } from '../../hooks/usePagination';

const ROLE_TABS = [
  { key: '', label: 'All Users', icon: 'groups' },
  { key: 'student', label: 'Students', icon: 'school' },
  { key: 'faculty', label: 'Faculty', icon: 'person' },
  { key: 'coordinator', label: 'Coordinators', icon: 'supervisor_account' },
  { key: 'admin', label: 'Admins', icon: 'shield_person' },
];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [notification, setNotification] = useState(null);
  const { page, limit, total, totalPages, updateMeta, setPage } = usePagination(1, 15);

  useEffect(() => {
    axiosInstance
      .get(ENDPOINTS.ADMIN.BRANCHES)
      .then(({ data }) => setBranches(data.data || []))
      .catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.ADMIN.USERS, {
        params: {
          page,
          limit,
          search: search.trim() || undefined,
          role: roleFilter || undefined,
          branch: selectedBranch || undefined,
        },
      });
      setUsers(res.data || []);
      updateMeta(res.meta);
    } catch {
      setNotification({ type: 'error', message: 'Failed to fetch user directory.' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, selectedBranch, updateMeta]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleStatus = async (user) => {
    if (user.role === 'admin') {
      setNotification({ type: 'error', message: 'Admin accounts cannot be deactivated.' });
      return;
    }
    setActionLoadingId(user._id);
    try {
      const { data } = await axiosInstance.patch(ENDPOINTS.ADMIN.TOGGLE_USER_STATUS(user._id));
      setNotification({
        type: 'success',
        message: data.message || `User status updated successfully.`,
      });
      fetchUsers();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to toggle user status.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 0' }}>
      {/* Header Deck */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              User Directory & Access Control
            </h1>
            <span
              style={{
                background: '#EFF6FF',
                color: '#1D4ED8',
                fontWeight: 700,
                fontSize: '0.8rem',
                padding: '4px 12px',
                borderRadius: '999px',
              }}
            >
              {total} Total Users
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.925rem', margin: 0 }}>
            Manage institutional user accounts, role allocations, and active login permissions.
          </p>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: notification.type === 'success' ? '#DCFCE7' : '#FEE2E2',
            color: notification.type === 'success' ? '#166534' : '#991B1B',
            border: `1px solid ${notification.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
            fontSize: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {notification.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              close
            </span>
          </button>
        </div>
      )}

      {/* Filters Deck */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '18px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Role Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setRoleFilter(tab.key);
                setPage(1);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                border: roleFilter === tab.key ? '1px solid #2563EB' : '1px solid #E2E8F0',
                background: roleFilter === tab.key ? '#EFF6FF' : '#FFFFFF',
                color: roleFilter === tab.key ? '#1D4ED8' : '#64748B',
                fontWeight: roleFilter === tab.key ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Branch Select */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
                fontSize: '20px',
              }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search by name or email address..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <select
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid #CBD5E1',
              fontSize: '0.875rem',
              color: '#334155',
              background: '#FFFFFF',
              outline: 'none',
              minWidth: '200px',
            }}
          >
            <option value="">All Departments</option>
            {branches.map((b) => (
              <option key={b._id || b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <Skeleton variant="card" height="360px" />
      ) : users.length === 0 ? (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '24px',
            padding: '60px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: '#F1F5F9',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
              person_off
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            No Users Found
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 16px' }}>
            No user accounts match the selected filters or search keyword.
          </p>
          {(search || roleFilter || selectedBranch) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setSelectedBranch('');
                setPage(1);
              }}
              className="btn btn--secondary"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '16px 20px' }}>User Details</th>
                  <th style={{ padding: '16px 20px' }}>Role</th>
                  <th style={{ padding: '16px 20px' }}>Department & Class</th>
                  <th style={{ padding: '16px 20px' }}>Status</th>
                  <th style={{ padding: '16px 20px' }}>Registered</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleBg =
                    u.role === 'student'
                      ? '#EFF6FF'
                      : u.role === 'faculty'
                      ? '#F5F3FF'
                      : u.role === 'coordinator'
                      ? '#ECFDF5'
                      : '#F1F5F9';
                  const roleColor =
                    u.role === 'student'
                      ? '#1D4ED8'
                      : u.role === 'faculty'
                      ? '#6D28D9'
                      : u.role === 'coordinator'
                      ? '#047857'
                      : '#334155';

                  const initials = u.name
                    ? u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'U';

                  return (
                    <tr
                      key={u._id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '12px',
                              background: '#E2E8F0',
                              color: '#1E293B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.925rem' }}>
                              {u.name}
                            </div>
                            <div style={{ color: '#64748B', fontSize: '0.825rem' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: roleBg,
                            color: roleColor,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '999px',
                            textTransform: 'capitalize',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                            {u.role === 'student'
                              ? 'school'
                              : u.role === 'faculty'
                              ? 'person'
                              : u.role === 'coordinator'
                              ? 'supervisor_account'
                              : 'shield_person'}
                          </span>
                          {u.role}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '0.875rem', color: '#1E293B', fontWeight: 500 }}>
                          {u.branch || '—'}
                        </div>
                        {u.className && (
                          <div style={{ fontSize: '0.775rem', color: '#64748B' }}>
                            {u.className} {u.section ? `(${u.section})` : ''}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: u.isActive ? '#DCFCE7' : '#FEE2E2',
                            color: u.isActive ? '#15803D' : '#991B1B',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '999px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: u.isActive ? '#16A34A' : '#DC2626',
                            }}
                          />
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', color: '#64748B', fontSize: '0.825rem' }}>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            disabled={actionLoadingId === u._id}
                            onClick={() => toggleStatus(u)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              border: u.isActive ? '1px solid #FECDD3' : '1px solid #BBF7D0',
                              background: u.isActive ? '#FFF1F2' : '#F0FDF4',
                              color: u.isActive ? '#E11D48' : '#15803D',
                              fontSize: '0.825rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              {u.isActive ? 'block' : 'check_circle'}
                            </span>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.875rem',
                color: '#64748B',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <span>
                Showing page {page} of {totalPages} ({total} users)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    opacity: page <= 1 ? 0.5 : 1,
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: page >= totalPages ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
