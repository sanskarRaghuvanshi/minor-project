import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import Pagination from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const getCategory = (pct) => {
  if (pct < 65) return 'critical';
  if (pct < 75) return 'borderline';
  return 'ok';
};

const AvatarColors = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#DC2626'];

const Defaulters = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sending, setSending] = useState(null);
  const [toast, setToast] = useState(null);
  const debouncedSearch = useDebounce(search, 300);
  const { page, limit, total, totalPages, updateMeta, setPage } = usePagination(1, 20);
  const requestIdRef = useRef(0);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const fetchDefaulters = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.FACULTY.DEFAULTERS, {
        params: {
          page, limit, threshold: 75,
          subject: subject || undefined,
          search: debouncedSearch || undefined,
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
  }, [page, limit, subject, debouncedSearch, updateMeta]);

  useEffect(() => { fetchDefaulters(); }, [fetchDefaulters]);

  const sendAlert = async (student) => {
    setSending(student._id);
    try {
      const payload = { studentIds: [student._id] };
      if (subject) payload.subject = subject;
      await axiosInstance.post(ENDPOINTS.FACULTY.NOTIFY_DEFAULTERS, payload);
      showToast(`Notice dispatched for ${student.name}`);
      addToast?.(`Alert sent to ${student.name}`, 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send notice';
      showToast(msg);
      addToast?.(msg, 'error');
    } finally {
      setSending(null);
    }
  };

  const notifyAll = async () => {
    if (!data.length) return;
    setSending('all');
    try {
      const payload = { studentIds: data.map((s) => s._id) };
      if (subject) payload.subject = subject;
      const { data: res } = await axiosInstance.post(ENDPOINTS.FACULTY.NOTIFY_DEFAULTERS, payload);
      const sentCount = res.data?.sent ?? data.length;
      showToast(`Notices dispatched for ${sentCount} students`);
      addToast?.(`Alerts sent to ${sentCount} defaulter(s)`, 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send notices';
      showToast(msg);
      addToast?.(msg, 'error');
    } finally {
      setSending(null);
    }
  };

  const filteredData = data.filter((s) => {
    if (filter === 'critical') return s.percentage < 65;
    if (filter === 'borderline') return s.percentage >= 65 && s.percentage < 75;
    return true;
  });

  const criticalCount = data.filter((s) => s.percentage < 65).length;
  const borderlineCount = data.filter((s) => s.percentage >= 65 && s.percentage < 75).length;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '2px 10px', borderRadius: '100px', background: '#FEE2E2', color: '#DC2626', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626', display: 'inline-block', animation: 'pulse 1s infinite' }} />
              Below 75% Threshold
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>• {user?.className || 'Your Class'}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em' }}>Attendance Defaulters</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            Students with attendance below 75% threshold.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={notifyAll}
            disabled={sending === 'all' || !data.length}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
              borderRadius: '12px', background: '#2563EB', color: '#fff',
              border: 'none', cursor: data.length ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600,
              boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
              opacity: sending === 'all' || !data.length ? 0.6 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
              {sending === 'all' ? 'hourglass_top' : 'send'}
            </span>
            {sending === 'all' ? 'Sending All...' : 'Notify All'}
          </button>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '14px 16px', marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '360px' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#94A3B8' }}>search</span>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search student name..."
            style={{
              width: '100%', paddingLeft: '40px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px',
              borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0',
              fontSize: '13px', color: '#1E293B', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: `All Defaulters (${total})` },
            { key: 'critical', label: `Critical < 65% (${criticalCount})` },
            { key: 'borderline', label: `Borderline 65–74% (${borderlineCount})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600, transition: 'all 0.15s',
                background: filter === key ? '#2563EB' : '#F1F5F9',
                color: filter === key ? '#fff' : '#475569',
                boxShadow: filter === key ? '0 1px 3px rgba(37,99,235,0.3)' : 'none',
              }}
            >{label}</button>
          ))}
          {user?.subjects?.length > 0 && (
            <select
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setPage(1); }}
              style={{ padding: '6px 10px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px', background: '#fff', color: '#475569', outline: 'none', cursor: 'pointer' }}
            >
              <option value="">All Subjects</option>
              {user.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '12px', padding: '12px 16px', color: '#DC2626', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Defaulters List */}
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>hourglass_empty</span>
            Loading defaulters...
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>🎉</span>
            <p style={{ margin: 0, fontWeight: 600, color: '#475569' }}>No defaulters found</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>All students are above the 75% threshold</p>
          </div>
        ) : (
          <div>
            {filteredData.map((student, idx) => {
              const pct = student.percentage ?? 0;
              const category = getCategory(pct);
              const isCritical = category === 'critical';
              const avatarBg = AvatarColors[idx % AvatarColors.length];

              return (
                <div
                  key={student._id}
                  style={{
                    padding: '16px 20px', borderBottom: idx < filteredData.length - 1 ? '1px solid #F1F5F9' : 'none',
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                    background: isCritical ? 'rgba(254,242,242,0.4)' : 'transparent',
                    transition: 'background 0.15s'
                  }}
                >
                  {/* Avatar + Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: isCritical ? '#FEE2E2' : '#EFF6FF',
                      color: isCritical ? '#DC2626' : avatarBg,
                      fontWeight: 700, fontSize: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {getInitials(student.name)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '14px' }}>{student.name}</span>
                        <span style={{ padding: '1px 7px', borderRadius: '5px', background: '#F1F5F9', color: '#475569', fontSize: '11px', fontWeight: 600 }}>
                          {student.email?.split('@')[0] || '—'}
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                        {student.branch || user?.branch} • {student.className || user?.className}
                        {student.section ? ` - ${student.section}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ flex: 1, minWidth: '180px', maxWidth: '300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12px' }}>
                      <span style={{ fontWeight: 700, color: isCritical ? '#DC2626' : '#F59E0B' }}>{pct.toFixed(1)}%</span>
                      <span style={{ color: '#64748B', fontWeight: 500 }}>{student.presentClasses} / {student.totalClasses} classes</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', borderRadius: '100px', background: '#F1F5F9', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '100px',
                        width: `${Math.min(pct, 100)}%`,
                        background: isCritical ? '#EF4444' : '#F59E0B',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>

                  {/* Badge + Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700,
                      background: isCritical ? '#FEE2E2' : '#FEF3C7',
                      color: isCritical ? '#DC2626' : '#92400E',
                      display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
                      {isCritical ? 'Critical' : 'Borderline'}
                    </span>
                    <button
                      type="button"
                      onClick={() => sendAlert(student)}
                      disabled={sending === student._id}
                      style={{
                        padding: '6px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                        background: isCritical ? '#EF4444' : '#F1F5F9',
                        color: isCritical ? '#fff' : '#475569',
                        opacity: sending === student._id ? 0.6 : 1
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>mail</span>
                      {sending === student._id ? 'Sending...' : 'Send Notice'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: '16px' }}>
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          background: '#0F172A', color: '#fff', padding: '12px 16px', borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(15,23,42,0.2)', display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '13px', fontWeight: 500, animation: 'slideIn 0.2s ease'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#10B981' }}>check_circle</span>
          {toast}
        </div>
      )}
    </div>
  );
};

export default Defaulters;
