import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Skeleton from '../common/Skeleton';

const ROLE_TABS = [
  { key: 'all', label: 'All Registrations', icon: 'groups' },
  { key: 'student', label: 'Students', icon: 'school' },
  { key: 'faculty', label: 'Faculty', icon: 'person_outline' },
  { key: 'coordinator', label: 'Coordinators', icon: 'supervisor_account' },
];

const AdminApprovals = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeRole, setActiveRole] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [branches, setBranches] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [notification, setNotification] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, user: null, reason: '' });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  // Load branches
  useEffect(() => {
    axiosInstance
      .get(ENDPOINTS.BRANCHES.LIST)
      .then(({ data }) => setBranches(data.data || []))
      .catch(() => {});
  }, []);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        role: activeRole !== 'all' ? activeRole : undefined,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        search: search.trim() || undefined,
      };
      const { data } = await axiosInstance.get(ENDPOINTS.ADMIN.PENDING_APPROVALS, { params });
      setPendingUsers(data.data || []);
      setMeta(data.meta || { total: 0, totalPages: 1 });
      setSelectedUserIds(new Set());
    } catch {
      setNotification({ type: 'error', message: 'Failed to load pending approvals' });
    } finally {
      setLoading(false);
    }
  }, [page, activeRole, selectedBranch, search]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (user) => {
    setActionLoading(true);
    try {
      const { data } = await axiosInstance.post(ENDPOINTS.ADMIN.APPROVE_USER(user._id));
      setNotification({
        type: 'success',
        message: data.message || `Account for ${user.name} approved successfully!`,
      });
      fetchPending();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to approve user.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.user) return;
    setActionLoading(true);
    try {
      const { data } = await axiosInstance.post(ENDPOINTS.ADMIN.REJECT_USER(rejectModal.user._id), {
        reason: rejectModal.reason,
      });
      setNotification({
        type: 'success',
        message: data.message || `Account for ${rejectModal.user.name} was rejected.`,
      });
      setRejectModal({ open: false, user: null, reason: '' });
      fetchPending();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to reject user.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedUserIds.size === 0) return;
    setActionLoading(true);
    try {
      const { data } = await axiosInstance.post(ENDPOINTS.ADMIN.BULK_APPROVE, {
        userIds: Array.from(selectedUserIds),
      });
      setNotification({
        type: 'success',
        message: data.message || `Successfully approved ${selectedUserIds.size} users.`,
      });
      setSelectedUserIds(new Set());
      fetchPending();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Bulk approval failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectUser = (id) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === pendingUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(pendingUsers.map((u) => u._id)));
    }
  };

  return (
    <div style={{ padding: '24px 0', maxWidth: '1200px', margin: '0 auto' }}>
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
              Registration Approvals
            </h1>
            <span
              style={{
                background: meta.total > 0 ? '#FEF3C7' : '#F1F5F9',
                color: meta.total > 0 ? '#B45309' : '#64748B',
                fontWeight: 700,
                fontSize: '0.8rem',
                padding: '4px 10px',
                borderRadius: '999px',
              }}
            >
              {meta.total} Pending Verification
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.925rem', margin: 0 }}>
            Review and grant access to newly registered students, teachers, and coordinators.
          </p>
        </div>

        {selectedUserIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn--primary"
              disabled={actionLoading}
              onClick={handleBulkApprove}
              style={{
                background: '#16A34A',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                done_all
              </span>
              Approve Selected ({selectedUserIds.size})
            </button>
          </div>
        )}
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

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '16px 20px',
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
                setActiveRole(tab.key);
                setPage(1);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                border: activeRole === tab.key ? '1px solid #2563EB' : '1px solid #E2E8F0',
                background: activeRole === tab.key ? '#EFF6FF' : '#FFFFFF',
                color: activeRole === tab.key ? '#1D4ED8' : '#64748B',
                fontWeight: activeRole === tab.key ? 700 : 500,
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

        {/* Search & Branch Filter */}
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
              placeholder="Search by student/faculty name or email..."
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
              minWidth: '180px',
            }}
          >
            <option value="all">All Departments / Branches</option>
            {branches.map((b) => (
              <option key={b._id || b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pending Registrations Table */}
      {loading ? (
        <Skeleton variant="card" height="360px" />
      ) : pendingUsers.length === 0 ? (
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
              width: '72px',
              height: '72px',
              borderRadius: '24px',
              background: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>
              verified_user
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            All Clear! No Pending Approvals
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
            There are currently no new registration requests awaiting verification for the selected filter.
          </p>
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
                  <th style={{ padding: '16px 20px', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.size === pendingUsers.length && pendingUsers.length > 0}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                  <th style={{ padding: '16px 20px' }}>User Details</th>
                  <th style={{ padding: '16px 20px' }}>Role</th>
                  <th style={{ padding: '16px 20px' }}>Branch / Class / Sec</th>
                  <th style={{ padding: '16px 20px' }}>Registered On</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => {
                  const isSelected = selectedUserIds.has(user._id);
                  const roleBg =
                    user.role === 'student'
                      ? '#EFF6FF'
                      : user.role === 'faculty'
                      ? '#F5F3FF'
                      : '#FEF3C7';
                  const roleColor =
                    user.role === 'student'
                      ? '#1D4ED8'
                      : user.role === 'faculty'
                      ? '#6D28D9'
                      : '#B45309';

                  return (
                    <tr
                      key={user._id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: isSelected ? '#F0FDF4' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUser(user._id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '12px',
                              background: '#E2E8F0',
                              color: '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                            }}
                          >
                            {user.name?.slice(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.925rem' }}>
                              {user.name}
                            </div>
                            <div style={{ color: '#64748B', fontSize: '0.825rem' }}>{user.email}</div>
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
                            {user.role === 'student' ? 'school' : user.role === 'faculty' ? 'person' : 'supervisor_account'}
                          </span>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '0.875rem', color: '#1E293B', fontWeight: 500 }}>
                          {user.branch} - {user.className}
                        </div>
                        {user.section && (
                          <div style={{ fontSize: '0.775rem', color: '#64748B' }}>
                            Section {user.section}
                          </div>
                        )}
                        {user.subjects && user.subjects.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                            {user.subjects.join(', ')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#64748B', fontSize: '0.85rem' }}>
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleApprove(user)}
                            style={{
                              background: '#16A34A',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '10px',
                              fontSize: '0.825rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              check
                            </span>
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setRejectModal({ open: true, user, reason: '' })}
                            style={{
                              background: '#FFF1F2',
                              color: '#E11D48',
                              border: '1px solid #FECDD3',
                              padding: '6px 14px',
                              borderRadius: '10px',
                              fontSize: '0.825rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              close
                            </span>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.875rem',
                color: '#64748B',
              }}
            >
              <span>
                Showing page {meta.page} of {meta.totalPages} ({meta.total} total)
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
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    cursor: page >= meta.totalPages ? 'not-allowed' : 'pointer',
                    opacity: page >= meta.totalPages ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                  person_cancel
                </span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0F172A' }}>
                  Reject Registration
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                  {rejectModal.user?.name} ({rejectModal.user?.email})
                </p>
              </div>
            </div>

            <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '16px' }}>
              Are you sure you want to reject this registration request? The user will be unable to log in and will see the reason specified below.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="rejectionReason"
                style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}
              >
                Rejection Reason (Optional)
              </label>
              <textarea
                id="rejectionReason"
                rows={3}
                placeholder="e.g. Unrecognized roll number, duplicate account, or incorrect branch selected."
                value={rejectModal.reason}
                onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  padding: '10px 14px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={actionLoading}
                onClick={() => setRejectModal({ open: false, user: null, reason: '' })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                disabled={actionLoading}
                onClick={handleReject}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 600,
                }}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;
