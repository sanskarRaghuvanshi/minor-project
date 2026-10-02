import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Pagination from '../common/Pagination';
import Skeleton from '../common/Skeleton';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../utils/formatDate';
import usePolling from '../../hooks/usePolling';
import { LECTURE_SLOTS } from '../../utils/timetableSlots';

const MyAttendance = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { page, limit, total, totalPages, updateMeta, setPage, changeLimit } = usePagination();

  const fetchAttendance = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosInstance.get(ENDPOINTS.STUDENT.MY_ATTENDANCE, {
        params: {
          page, limit,
          subject: subject || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setData(res.data || []);
      updateMeta(res.meta);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [page, limit, subject, startDate, endDate, updateMeta]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);
  usePolling(() => fetchAttendance(true), 30000);

  const exportCSV = () => {
    const headers = 'Date,Period,TimeSlot,Subject,Status,Source\n';
    const rows = data.map((r) => {
      const slot = LECTURE_SLOTS.find((s) => s.slotNumber === r.slotNumber) || LECTURE_SLOTS[0];
      return `${formatDate(r.date)},Period ${r.slotNumber || 1},${r.timeSlot || slot.timeRange},${r.subject},${r.status},${r.source || 'manual'}`;
    }).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const filteredData = data.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const getSlotInfo = (r) => {
    const slot = LECTURE_SLOTS.find((s) => s.slotNumber === r.slotNumber);
    if (slot) return slot;
    return {
      slotNumber: r.slotNumber || 1,
      timeRange: r.timeSlot || '09:45 - 10:35',
    };
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '2px 10px', borderRadius: '100px', background: '#EFF6FF', color: '#1E50DE', border: '1px solid #DBEAFE', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1E50DE' }} />
              Student Records
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              8-Period Timetable Roll Calls
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            My Attendance History
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Comprehensive timeline of all marked lectures, labs, and QR check-ins.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          disabled={data.length === 0}
          style={{
            padding: '10px 18px', borderRadius: '12px', background: '#fff', color: '#0F172A',
            border: '1px solid #E2E8F0', cursor: data.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)', opacity: data.length === 0 ? 0.6 : 1
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563EB' }}>download</span>
          Export CSV
        </button>
      </div>

      {/* Filter Control Bar */}
      <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          
          {/* Subject Filter */}
          <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '20px' }}>menu_book</span>
            <div style={{ flex: 1 }}>
              <label htmlFor="ma-subject" style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Filter by Course</label>
              <input
                id="ma-subject"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setPage(1); }}
                placeholder="Type course name..."
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', fontWeight: 600, color: '#0F172A', width: '100%' }}
              />
            </div>
          </div>

          {/* Start Date */}
          <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '20px' }}>calendar_today</span>
            <div style={{ flex: 1 }}>
              <label htmlFor="ma-start" style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>From Date</label>
              <input
                id="ma-start"
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', fontWeight: 600, color: '#0F172A', width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* End Date */}
          <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '20px' }}>event</span>
            <div style={{ flex: 1 }}>
              <label htmlFor="ma-end" style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>To Date</label>
              <input
                id="ma-end"
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', fontWeight: 600, color: '#0F172A', width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[
              { id: 'all', label: 'All Sessions' },
              { id: 'present', label: 'Present' },
              { id: 'absent', label: 'Absent' },
              { id: 'excused', label: 'Excused' },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: isActive ? '#2563EB' : '#F1F5F9',
                    color: isActive ? '#fff' : '#64748B'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
            Showing {filteredData.length} of {total} record{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', borderRadius: '16px', background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48', marginBottom: '20px', fontSize: '13px', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid rgba(226,232,240,0.8)' }}>
          <Skeleton variant="card" height="260px" />
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '24px', padding: '48px 20px', textAlign: 'center', border: '1px solid rgba(226,232,240,0.8)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#CBD5E1', marginBottom: '12px' }}>event_busy</span>
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0F172A', fontWeight: 700 }}>No Attendance Records Found</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>Try adjusting your filters or date range.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px' }}>Date</th>
                  <th style={{ padding: '14px 16px' }}>Lecture Slot</th>
                  <th style={{ padding: '14px 16px' }}>Course / Subject</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Marking Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((r, idx) => {
                  const slotInfo = getSlotInfo(r);
                  const isPresent = r.status === 'present';
                  const isExcused = r.status === 'excused';

                  return (
                    <tr
                      key={r._id || idx}
                      style={{
                        borderBottom: idx !== filteredData.length - 1 ? '1px solid #F1F5F9' : 'none',
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Date */}
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {formatDate(r.date)}
                      </td>

                      {/* Period Time Slot */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '3px 8px', borderRadius: '8px', background: '#F1F5F9', color: '#334155',
                          fontSize: '11px', fontWeight: 700
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#2563EB' }}>schedule</span>
                          Period {slotInfo.slotNumber} ({slotInfo.timeRange})
                        </span>
                      </td>

                      {/* Subject */}
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A' }}>
                        {r.subject}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 800,
                          background: isPresent ? '#ECFDF5' : isExcused ? '#FEF3C7' : '#FFF1F2',
                          color: isPresent ? '#059669' : isExcused ? '#D97706' : '#E11D48',
                          border: `1px solid ${isPresent ? '#BBF7D0' : isExcused ? '#FDE68A' : '#FECDD3'}`
                        }}>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: isPresent ? '#059669' : isExcused ? '#D97706' : '#E11D48'
                          }} />
                          {r.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Source */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                            {r.source === 'qr' ? 'qr_code_scanner' : 'edit_note'}
                          </span>
                          {r.source === 'qr' ? 'Live QR Scan' : 'Roll Call'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid #F1F5F9' }}>
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
      )}
    </div>
  );
};

export default MyAttendance;
