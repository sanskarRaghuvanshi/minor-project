import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../common/Pagination';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const AvatarColors = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];

const CoordinatorStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { page, limit, total, totalPages, updateMeta, setPage, changeLimit } = usePagination(1, 20);
  const requestIdRef = useRef(0);

  const fetchStudents = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.COORDINATOR.STUDENTS, {
        params: { page, limit, search: debouncedSearch || undefined },
      });
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

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Filter students based on filter tab
  const filteredStudents = students.filter((s) => {
    const pct = s.attendanceStats?.percentage ?? 0;
    const totalClasses = s.attendanceStats?.total ?? 0;

    if (filterTab === 'safe') return totalClasses > 0 && pct >= 75;
    if (filterTab === 'defaulter') return totalClasses > 0 && pct < 75;
    if (filterTab === 'unmarked') return totalClasses === 0;
    return true;
  });

  const safeCount = students.filter((s) => (s.attendanceStats?.total ?? 0) > 0 && (s.attendanceStats?.percentage ?? 0) >= 75).length;
  const defaulterCount = students.filter((s) => (s.attendanceStats?.total ?? 0) > 0 && (s.attendanceStats?.percentage ?? 0) < 75).length;

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
              Coordinator Portal
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
                groups
              </span>
              {user?.branch} • {user?.className}
              {user?.section ? ` - ${user.section}` : ''}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Student Directory
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Enrolled students and real-time attendance standing for your cohort.
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
              padding: '6px 12px',
              borderRadius: '12px',
              background: '#F1F5F9',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
              ENROLLED: <strong style={{ color: '#0F172A', fontSize: '13px' }}>{total}</strong>
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '12px',
              background: '#ECFDF5',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>
              SAFE (≥75%): <strong style={{ fontSize: '13px' }}>{safeCount}</strong>
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '12px',
              background: '#FEF2F2',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444' }}>
              DEFAULTERS: <strong style={{ fontSize: '13px' }}>{defaulterCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Control Card (Search & Filter Tabs) */}
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
          gap: '12px',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '380px' }}>
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search student by name or email..."
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

        {/* Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { key: 'all', label: `All Students (${students.length})` },
            { key: 'safe', label: `Safe ≥75% (${safeCount})` },
            { key: 'defaulter', label: `Defaulters <75% (${defaulterCount})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterTab(key)}
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                background: filterTab === key ? '#2563EB' : '#F1F5F9',
                color: filterTab === key ? '#fff' : '#64748B',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#DC2626',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* Main Content: Student Roster Container */}
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
            Loading students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>🎓</span>
            <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>No students found</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
              No students match the selected filter or search query
            </p>
          </div>
        ) : (
          <div>
            {filteredStudents.map((s, idx) => {
              const avatarColor = AvatarColors[idx % AvatarColors.length];
              const stats = s.attendanceStats || { total: 0, present: 0, percentage: 0 };
              const isSafe = stats.percentage >= 75;
              const hasRecords = stats.total > 0;

              return (
                <div
                  key={s._id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: idx < filteredStudents.length - 1 ? '1px solid #F1F5F9' : 'none',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    background: hasRecords && !isSafe ? '#FFFBFB' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Left: Index + Avatar + Name & Email */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', width: '22px' }}>
                      {(page - 1) * limit + idx + 1}
                    </span>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
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
                      {getInitials(s.name)}
                    </div>
                    <div>
                      <span style={{ display: 'block', fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                        {s.name}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                        {s.email}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Class & Section details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '8px',
                        background: '#F1F5F9',
                        color: '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {s.branch} • {s.className}
                    </span>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#E2E8F0',
                        color: '#334155',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      Sec {s.section || 'All'}
                    </span>
                  </div>

                  {/* Right: Attendance Stats & Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                        {stats.present} of {stats.total} Classes
                      </span>
                    </div>

                    {hasRecords ? (
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: isSafe ? '#ECFDF5' : '#FEF2F2',
                          color: isSafe ? '#059669' : '#EF4444',
                          border: isSafe ? '1px solid #A7F3D0' : '1px solid #FECACA',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: isSafe ? '#059669' : '#EF4444',
                          }}
                        />
                        {stats.percentage}% {isSafe ? '• Safe' : '• Defaulter'}
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#F8FAFC',
                          color: '#94A3B8',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        No Records
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
    </div>
  );
};

export default CoordinatorStudents;
