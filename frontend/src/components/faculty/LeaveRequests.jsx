import { useState, useEffect, useCallback, useMemo } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import Pagination from '../common/Pagination';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../utils/formatDate';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const AvatarColors = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];

const LeaveRequests = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState('pending');
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [search, setSearch] = useState('');
  const { page, limit, total, totalPages, updateMeta, setPage, changeLimit } = usePagination(1, 15);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'pending' ? ENDPOINTS.LEAVE.PENDING : ENDPOINTS.LEAVE.ALL;
      const params = { page, limit };
      const { data: res } = await axiosInstance.get(endpoint, { params });
      setLeaves(res.data || []);
      updateMeta(res.meta);
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
    } finally {
      setLoading(false);
    }
  }, [tab, page, limit, updateMeta]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const review = async (id, status) => {
    setSubmittingId(id);
    try {
      const { data: res } = await axiosInstance.patch(ENDPOINTS.LEAVE.REVIEW(id), { status });
      addToast?.(res.message || `Leave request ${status} successfully`, 'success');
      
      // If modal was open for this leave, update its state or close
      if (selectedLeave?._id === id) {
        setSelectedLeave((prev) => (prev ? { ...prev, status } : null));
      }
      fetchLeaves();
    } catch (err) {
      addToast?.(err.response?.data?.message || 'Failed to review leave request', 'error');
    } finally {
      setSubmittingId(null);
    }
  };

  const isPdf = (url) => url?.toLowerCase().endsWith('.pdf');
  const isImage = (url) => /\.(jpe?g|png|webp|gif)$/i.test(url || '');
  const getFullUrl = (url) => (url?.startsWith('http') ? url : `${API_BASE}${url}`);

  const downloadDocument = async (url, filename = 'leave-proof') => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      addToast?.('Document downloaded successfully', 'success');
    } catch (err) {
      console.error('Failed to download document:', err);
      addToast?.('Failed to download document', 'error');
    }
  };

  const calculateDays = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const filteredLeaves = useMemo(() => {
    if (!search) return leaves;
    const q = search.toLowerCase();
    return leaves.filter(
      (l) =>
        l.student?.name?.toLowerCase().includes(q) ||
        l.student?.email?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q)
    );
  }, [leaves, search]);

  const pendingCount = useMemo(
    () => (tab === 'pending' ? total : leaves.filter((l) => l.status === 'pending').length),
    [tab, total, leaves]
  );

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      {/* Top Header & Snapshot Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                padding: '2px 10px',
                borderRadius: '100px',
                background: '#EFF6FF',
                color: '#1E50DE',
                border: '1px solid #DBEAFE',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1E50DE' }} />
              {user?.role === 'coordinator' ? 'Coordinator Portal' : 'Faculty Portal'}
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
            <span
              style={{
                fontSize: '12px',
                color: '#475569',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#94A3B8' }}>
                event_available
              </span>
              {user?.branch} • {user?.className}
              {user?.section ? ` - ${user.section}` : ''}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Leave Applications
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Review, preview medical/supporting documents, and approve student leave requests.
          </p>
        </div>

        {/* Real-time Counter Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#fff',
            padding: '6px 8px',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            border: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '12px',
              background: '#FFFBEB',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309' }}>
              PENDING: <strong style={{ fontSize: '13px', color: '#92400E' }}>{pendingCount}</strong>
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '12px',
              background: '#F1F5F9',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
              TOTAL: <strong style={{ fontSize: '13px', color: '#0F172A' }}>{total}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Control Card (Filter Tabs & Search Input) */}
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          border: '1px solid rgba(226,232,240,0.8)',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setTab('pending');
              setPage(1);
            }}
            style={{
              padding: '8px 18px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: tab === 'pending' ? '#2563EB' : '#F1F5F9',
              color: tab === 'pending' ? '#fff' : '#64748B',
              boxShadow: tab === 'pending' ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              pending_actions
            </span>
            Pending Review
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('all');
              setPage(1);
            }}
            style={{
              padding: '8px 18px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: tab === 'all' ? '#2563EB' : '#F1F5F9',
              color: tab === 'all' ? '#fff' : '#64748B',
              boxShadow: tab === 'all' ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              history
            </span>
            All History
          </button>
        </div>

        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '340px' }}>
          <span
            className="material-symbols-outlined"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '18px',
              color: '#94A3B8',
            }}
          >
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student or reason..."
            style={{
              width: '100%',
              paddingLeft: '38px',
              paddingRight: '12px',
              paddingTop: '8px',
              paddingBottom: '8px',
              borderRadius: '12px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
              color: '#0F172A',
            }}
          />
        </div>
      </div>

      {/* Main Leave Requests Container */}
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          border: '1px solid rgba(226,232,240,0.8)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '32px', display: 'block', marginBottom: '8px', animation: 'spin 1s infinite' }}
            >
              sync
            </span>
            Loading leave applications...
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>📋</span>
            <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>No leave requests found</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8' }}>
              {tab === 'pending'
                ? 'All student leave applications have been reviewed.'
                : 'No historical leave records match your search.'}
            </p>
          </div>
        ) : (
          <div>
            {filteredLeaves.map((l, idx) => {
              const avatarColor = AvatarColors[idx % AvatarColors.length];
              const days = calculateDays(l.startDate, l.endDate);
              const isPending = l.status === 'pending';
              const isApproved = l.status === 'approved';
              const isRejected = l.status === 'rejected';
              const hasDoc = Boolean(l.documentUrl);

              return (
                <div
                  key={l._id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: idx < filteredLeaves.length - 1 ? '1px solid #F1F5F9' : 'none',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    background: isPending ? '#FFFDF8' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Left: Index + Avatar + Name + Class */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: '#EFF6FF',
                        color: avatarColor,
                        fontWeight: 800,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(l.student?.name)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '14px', color: '#0F172A' }}>{l.student?.name}</strong>
                        <span
                          style={{
                            padding: '1px 8px',
                            borderRadius: '6px',
                            background: '#F1F5F9',
                            color: '#475569',
                            fontSize: '10px',
                            fontWeight: 700,
                          }}
                        >
                          Sec {l.student?.section || 'A'}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>{l.student?.email}</span>
                    </div>
                  </div>

                  {/* Middle Left: Date Duration & Days Count */}
                  <div style={{ minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#2563EB' }}>
                        date_range
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        {formatDate(l.startDate)} → {formatDate(l.endDate)}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                      Duration: <strong style={{ color: '#2563EB' }}>{days} {days === 1 ? 'Day' : 'Days'}</strong>
                    </span>
                  </div>

                  {/* Middle: Reason */}
                  <div style={{ flex: 1, minWidth: '180px', maxWidth: '300px' }}>
                    <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>
                      Reason
                    </span>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: '#334155',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={l.reason}
                    >
                      {l.reason}
                    </p>
                  </div>

                  {/* Document Proof Button */}
                  <div>
                    {hasDoc ? (
                      <button
                        type="button"
                        onClick={() => setSelectedLeave(l)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '10px',
                          background: '#EFF6FF',
                          color: '#1E40AF',
                          border: '1px solid #DBEAFE',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 700,
                          transition: 'all 0.15s',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          {isPdf(l.documentUrl) ? 'picture_as_pdf' : 'visibility'}
                        </span>
                        <span>Preview Proof</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
                        No proof attached
                      </span>
                    )}
                  </div>

                  {/* Status & Review Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px', justifyContent: 'flex-end' }}>
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => review(l._id, 'approved')}
                          disabled={submittingId === l._id}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            background: '#ECFDF5',
                            color: '#059669',
                            border: '1px solid #A7F3D0',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 3px rgba(5,150,105,0.1)',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            check
                          </span>
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => review(l._id, 'rejected')}
                          disabled={submittingId === l._id}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            background: '#FEF2F2',
                            color: '#EF4444',
                            border: '1px solid #FECACA',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            close
                          </span>
                          Reject
                        </button>
                      </>
                    ) : (
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: isApproved ? '#ECFDF5' : '#FEF2F2',
                          color: isApproved ? '#059669' : '#EF4444',
                          border: isApproved ? '1px solid #A7F3D0' : '1px solid #FECACA',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          {isApproved ? 'check_circle' : 'cancel'}
                        </span>
                        {isApproved ? 'APPROVED' : 'REJECTED'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: '16px' }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={changeLimit}
        />
      </div>

      {/* ========================================================================= */}
      {/* Interactive Document Inspection & In-Modal Decision Modal               */}
      {/* ========================================================================= */}
      {selectedLeave && (
        <div
          onClick={() => setSelectedLeave(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '780px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(226,232,240,0.8)',
              overflow: 'hidden',
              animation: 'modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                    verified_user
                  </span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                    Document Proof & Leave Details
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Applicant: <strong>{selectedLeave.student?.name}</strong> ({selectedLeave.student?.email})
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedLeave.documentUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      downloadDocument(
                        getFullUrl(selectedLeave.documentUrl),
                        `leave-proof-${selectedLeave.student?.name?.replace(/\s+/g, '_') || 'doc'}`
                      )
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: '#EFF6FF',
                      color: '#1E40AF',
                      border: '1px solid #DBEAFE',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      download
                    </span>
                    Download Proof
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedLeave(null)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#fff',
                    border: '1px solid #CBD5E1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748B',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    close
                  </span>
                </button>
              </div>
            </div>

            {/* Modal Body: Details + Document Viewport */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Info Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  fontSize: '12px',
                }}
              >
                <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>
                    Leave Duration
                  </span>
                  <strong style={{ color: '#0F172A', fontSize: '13px' }}>
                    {formatDate(selectedLeave.startDate)} → {formatDate(selectedLeave.endDate)}
                  </strong>
                  <span style={{ display: 'block', color: '#2563EB', fontWeight: 700, marginTop: '2px' }}>
                    {calculateDays(selectedLeave.startDate, selectedLeave.endDate)} Days Total
                  </span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>
                    Current Status
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      marginTop: '4px',
                      background:
                        selectedLeave.status === 'approved'
                          ? '#ECFDF5'
                          : selectedLeave.status === 'rejected'
                          ? '#FEF2F2'
                          : '#FFFBEB',
                      color:
                        selectedLeave.status === 'approved'
                          ? '#059669'
                          : selectedLeave.status === 'rejected'
                          ? '#EF4444'
                          : '#D97706',
                    }}
                  >
                    {selectedLeave.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Stated Reason Box */}
              <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', marginBottom: '4px' }}>
                  Student Explanation & Reason
                </span>
                <p style={{ margin: 0, fontSize: '13px', color: '#1E293B', lineHeight: '1.5', fontWeight: 500 }}>
                  {selectedLeave.reason}
                </p>
              </div>

              {/* Document Display Viewport */}
              <div
                style={{
                  background: '#0F172A',
                  borderRadius: '16px',
                  padding: '16px',
                  minHeight: '260px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {selectedLeave.documentUrl ? (
                  isImage(selectedLeave.documentUrl) ? (
                    <img
                      src={getFullUrl(selectedLeave.documentUrl)}
                      alt="Supporting document proof"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '440px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      }}
                    />
                  ) : isPdf(selectedLeave.documentUrl) ? (
                    <div style={{ textAlign: 'center', color: '#fff', padding: '20px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#EF4444', marginBottom: '8px', display: 'block' }}>
                        picture_as_pdf
                      </span>
                      <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>
                        PDF Document Attached
                      </p>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <a
                          href={getFullUrl(selectedLeave.documentUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '8px 16px',
                            borderRadius: '10px',
                            background: '#2563EB',
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            open_in_new
                          </span>
                          Open in Full View
                        </a>
                        <button
                          type="button"
                          onClick={() => downloadDocument(getFullUrl(selectedLeave.documentUrl), 'leave-proof.pdf')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '10px',
                            background: '#334155',
                            color: '#fff',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            download
                          </span>
                          Download PDF
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#fff' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '42px', color: '#94A3B8', display: 'block', marginBottom: '8px' }}>
                        attach_file
                      </span>
                      <a
                        href={getFullUrl(selectedLeave.documentUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#60A5FA', fontSize: '13px', fontWeight: 700 }}
                      >
                        Download & View Attached File
                      </a>
                    </div>
                  )
                ) : (
                  <div style={{ textAlign: 'center', color: '#64748B' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '36px', display: 'block', marginBottom: '4px' }}>
                      hide_image
                    </span>
                    <span style={{ fontSize: '12px' }}>No document or image attached to this leave request</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer / Decision Bar */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #E2E8F0',
                background: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  background: '#fff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close Preview
              </button>

              {selectedLeave.status === 'pending' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => review(selectedLeave._id, 'rejected')}
                    disabled={submittingId === selectedLeave._id}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      border: '1px solid #FECACA',
                      background: '#FEF2F2',
                      color: '#EF4444',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      close
                    </span>
                    {submittingId === selectedLeave._id ? 'Processing...' : 'Reject Request'}
                  </button>

                  <button
                    type="button"
                    onClick={() => review(selectedLeave._id, 'approved')}
                    disabled={submittingId === selectedLeave._id}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 10px rgba(5,150,105,0.3)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      check_circle
                    </span>
                    {submittingId === selectedLeave._id ? 'Approving...' : 'Approve & Excuse Attendance'}
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                  This application has already been reviewed ({selectedLeave.status}).
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
