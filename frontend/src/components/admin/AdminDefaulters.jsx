import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Skeleton from '../common/Skeleton';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';

const CLASS_OPTIONS = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];

const AdminDefaulters = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [className, setClassName] = useState('');
  const [branches, setBranches] = useState([]);
  const debouncedSearch = useDebounce(search, 350);
  const { page, limit, total, totalPages, updateMeta, setPage } = usePagination(1, 20);
  const requestIdRef = useRef(0);

  useEffect(() => {
    axiosInstance
      .get(ENDPOINTS.BRANCHES.LIST)
      .then(({ data: res }) => setBranches(res.data || []))
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    fetchDefaulters();
  }, [fetchDefaulters]);

  const handleExportCSV = () => {
    if (data.length === 0) return;
    const headers = ['Name', 'Email', 'Department', 'Class', 'Section', 'Present', 'Total', 'Percentage', 'Classes Needed'];
    const rows = data.map((d) => [
      `"${d.name}"`,
      `"${d.email}"`,
      `"${d.branch || ''}"`,
      `"${d.className || ''}"`,
      `"${d.section || ''}"`,
      d.presentClasses,
      d.totalClasses,
      `${d.percentage}%`,
      d.neededFor75 || 0,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_defaulters_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const criticalCount = data.filter((d) => d.percentage < 60).length;
  const warningCount = data.filter((d) => d.percentage >= 60 && d.percentage < 75).length;

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
              Attendance Defaulters Audit
            </h1>
            <span
              style={{
                background: total > 0 ? '#FFF1F2' : '#F0FDF4',
                color: total > 0 ? '#E11D48' : '#15803D',
                fontWeight: 700,
                fontSize: '0.8rem',
                padding: '4px 12px',
                borderRadius: '999px',
                border: total > 0 ? '1px solid #FECDD3' : '1px solid #BBF7D0',
              }}
            >
              {total} Below 75% Criteria
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.925rem', margin: 0 }}>
            Institutional compliance monitoring for students falling below the statutory 75% attendance threshold.
          </p>
        </div>

        {data.length > 0 && (
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #CBD5E1',
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16A34A' }}>
              download
            </span>
            Export Defaulters CSV
          </button>
        )}
      </div>

      {/* Summary KPI Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '18px 20px',
            border: '1px solid rgba(226,232,240,0.8)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FFF1F2', color: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>warning</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Total Defaulters</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#E11D48' }}>{total}</div>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '18px 20px',
            border: '1px solid rgba(226,232,240,0.8)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>error</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Critical Shortage (&lt;60%)</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626' }}>{criticalCount}</div>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '18px 20px',
            border: '1px solid rgba(226,232,240,0.8)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>schedule</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Warning Zone (60-74%)</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706' }}>{warningCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '18px 20px',
          marginBottom: '24px',
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 2, minWidth: '240px', position: 'relative' }}>
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
            placeholder="Search defaulter by student name or email..."
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
          value={branch}
          onChange={(e) => {
            setBranch(e.target.value);
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
          <option value="">All Departments</option>
          {branches.map((b) => (
            <option key={b._id || b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={className}
          onChange={(e) => {
            setClassName(e.target.value);
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
            minWidth: '160px',
          }}
        >
          <option value="">All Years</option>
          {CLASS_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Defaulters Table Deck */}
      {loading ? (
        <Skeleton variant="card" height="360px" />
      ) : data.length === 0 ? (
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
              background: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>
              verified
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            No Attendance Defaulters!
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
            All students in the selected department and year meet or exceed the statutory 75% attendance threshold.
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
                  <th style={{ padding: '16px 20px' }}>Student Details</th>
                  <th style={{ padding: '16px 20px' }}>Department & Class</th>
                  <th style={{ padding: '16px 20px' }}>Attendance Ratio</th>
                  <th style={{ padding: '16px 20px' }}>Overall Percentage</th>
                  <th style={{ padding: '16px 20px' }}>Subjects Below 75%</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Recovery Target</th>
                </tr>
              </thead>
              <tbody>
                {data.map((student) => {
                  const isCritical = student.percentage < 60;
                  const initials = student.name
                    ? student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'ST';

                  return (
                    <tr
                      key={student._id}
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
                              background: isCritical ? '#FEE2E2' : '#FEF3C7',
                              color: isCritical ? '#DC2626' : '#D97706',
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
                              {student.name}
                            </div>
                            <div style={{ color: '#64748B', fontSize: '0.825rem' }}>{student.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '0.875rem', color: '#1E293B', fontWeight: 500 }}>
                          {student.branch || '—'}
                        </div>
                        <div style={{ fontSize: '0.775rem', color: '#64748B' }}>
                          {student.className || '—'} {student.section ? `(${student.section})` : ''}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '0.875rem', color: '#1E293B', fontWeight: 600 }}>
                          {student.presentClasses} / {student.totalClasses} classes
                        </div>
                        <div
                          style={{
                            width: '120px',
                            height: '6px',
                            background: '#E2E8F0',
                            borderRadius: '999px',
                            marginTop: '6px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, student.percentage)}%`,
                              height: '100%',
                              background: isCritical ? '#EF4444' : '#F59E0B',
                              borderRadius: '999px',
                            }}
                          />
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: isCritical ? '#FFF1F2' : '#FFFBEB',
                            color: isCritical ? '#E11D48' : '#D97706',
                            border: `1px solid ${isCritical ? '#FECDD3' : '#FCD34D'}`,
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '999px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isCritical ? '#E11D48' : '#D97706',
                            }}
                          />
                          {student.percentage}%
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {(student.subjectsBelowThreshold || []).map((s) => (
                            <span
                              key={s.subject}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                color: '#475569',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '8px',
                              }}
                            >
                              <span>{s.subject}</span>
                              <span style={{ color: '#E11D48', fontWeight: 700 }}>{s.percentage}%</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        {student.neededFor75 > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FCD34D',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: '999px',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                              trending_up
                            </span>
                            +{student.neededFor75} to 75%
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>—</span>
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
                Showing page {page} of {totalPages} ({total} defaulters)
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

export default AdminDefaulters;
