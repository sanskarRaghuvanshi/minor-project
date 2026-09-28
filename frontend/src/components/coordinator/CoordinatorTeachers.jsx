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

const CoordinatorTeachers = () => {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { page, limit, total, totalPages, updateMeta, setPage, changeLimit } = usePagination(1, 12);
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

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Aggregate total unique subjects taught across teachers
  const allSubjects = Array.from(
    new Set(teachers.flatMap((t) => t.subjects || []))
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
                school
              </span>
              {user?.branch} • {user?.className}
              {user?.section ? ` - ${user.section}` : ''}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Faculty Directory
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Assigned teachers and course allocations for your cohort.
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
              background: '#EFF6FF',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>
              TEACHERS: <strong style={{ fontSize: '13px', color: '#1E3A8A' }}>{total}</strong>
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '12px',
              background: '#F8FAFC',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#64748B' }}>
              menu_book
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
              SUBJECTS: <strong style={{ fontSize: '13px', color: '#0F172A' }}>{allSubjects.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Control Card (Search Bar) */}
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
            placeholder="Search teacher by name or email..."
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

        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
          Showing {teachers.length} of {total} assigned teachers
        </span>
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

      {/* Main Content: Faculty Roster */}
      {loading ? (
        <Skeleton variant="card" height="320px" />
      ) : teachers.length === 0 ? (
        <EmptyState
          icon="👨‍🏫"
          title="No teachers found"
          message="No faculty members match your search criteria for this cohort"
        />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            {teachers.map((t, idx) => {
              const avatarColor = AvatarColors[idx % AvatarColors.length];
              const teacherSubjects = t.subjects || [];

              return (
                <div
                  key={t._id}
                  style={{
                    background: '#fff',
                    borderRadius: '20px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                    border: '1px solid rgba(226,232,240,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                >
                  {/* Top: Avatar, Name, Email, Total Classes badge */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '14px',
                            background: '#EFF6FF',
                            color: avatarColor,
                            fontWeight: 800,
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(37,99,235,0.1)',
                          }}
                        >
                          {getInitials(t.name)}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                            {t.name}
                          </h3>
                          <span style={{ fontSize: '12px', color: '#64748B', display: 'block', marginTop: '1px' }}>
                            {t.email}
                          </span>
                        </div>
                      </div>

                      {/* Total Classes Marked Pill */}
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '8px',
                          background: '#F1F5F9',
                          color: '#334155',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#2563EB' }}>
                          checklist
                        </span>
                        {t.totalClasses || 0} classes
                      </span>
                    </div>

                    {/* Department & Section Line */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#475569',
                        fontWeight: 600,
                        padding: '8px 12px',
                        background: '#F8FAFC',
                        borderRadius: '10px',
                        marginBottom: '12px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#94A3B8' }}>
                        domain
                      </span>
                      <span>
                        {t.branch} • {t.className}
                      </span>
                      <span style={{ marginLeft: 'auto', background: '#E2E8F0', padding: '1px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, color: '#334155' }}>
                        Sec {t.section || 'All'}
                      </span>
                    </div>

                    {/* Assigned Courses / Subjects */}
                    <div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: '#94A3B8',
                          letterSpacing: '0.04em',
                          marginBottom: '6px',
                        }}
                      >
                        Assigned Subjects ({teacherSubjects.length})
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {teacherSubjects.length === 0 ? (
                          <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
                            No specific subjects assigned
                          </span>
                        ) : (
                          teacherSubjects.map((s) => (
                            <span
                              key={s}
                              style={{
                                padding: '3px 10px',
                                borderRadius: '8px',
                                background: '#EFF6FF',
                                color: '#1E40AF',
                                border: '1px solid #DBEAFE',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              {s}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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

export default CoordinatorTeachers;
