import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../common/Skeleton';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      axiosInstance.get(ENDPOINTS.ADMIN.DASHBOARD_STATS),
      axiosInstance.get(ENDPOINTS.ADMIN.BRANCHES).catch(() => ({ data: { data: [] } })),
    ])
      .then(([statsRes, branchesRes]) => {
        setStats(statsRes.data?.data || {});
        setBranches(branchesRes.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 0' }}>
        <Skeleton variant="card" height="120px" />
        <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="card" height="130px" />
          ))}
        </div>
      </div>
    );
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 0' }}>
      {/* 1. Welcome Card Header */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px 28px',
          border: '1px solid rgba(226,232,240,0.8)',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              }}
            >
              {initials}
            </div>
            <span
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#10B981',
                border: '2px solid #FFFFFF',
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                System Administration Terminal
              </span>
              <span
                style={{
                  background: '#DCFCE7',
                  color: '#15803D',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                Online
              </span>
            </div>
            <h1 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
              {user?.name || 'Administrator'}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
              Institutional attendance monitoring, role verifications, and compliance enforcement.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {stats?.pendingApprovals > 0 ? (
            <Link
              to="/admin/approvals"
              style={{
                background: '#D97706',
                color: '#FFFFFF',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(217,119,6,0.25)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                how_to_reg
              </span>
              {stats.pendingApprovals} Pending Approval{stats.pendingApprovals > 1 ? 's' : ''}
            </Link>
          ) : (
            <span
              style={{
                padding: '8px 14px',
                borderRadius: '12px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                fontSize: '12px',
                fontWeight: 700,
                color: '#15803D',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                verified
              </span>
              Registrations Up to Date
            </span>
          )}

          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            style={{
              background: '#F8FAFC',
              color: '#0F172A',
              border: '1px solid #CBD5E1',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748B' }}>
              group
            </span>
            Users Directory
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Grid Deck */}
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>
          Institutional Health & Metrics
        </span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>
          Real-time Sync Active
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Card: Pending Approvals */}
        <Link
          to="/admin/approvals"
          style={{
            textDecoration: 'none',
            background: stats?.pendingApprovals > 0 ? 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' : '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            border: stats?.pendingApprovals > 0 ? '1px solid #FCD34D' : '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: stats?.pendingApprovals > 0 ? '#92400E' : '#64748B' }}>
              Pending Approvals
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: stats?.pendingApprovals > 0 ? '#FDE68A' : '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stats?.pendingApprovals > 0 ? '#B45309' : '#64748B',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                how_to_reg
              </span>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: stats?.pendingApprovals > 0 ? '#B45309' : '#0F172A', lineHeight: 1 }}>
              {stats?.pendingApprovals || 0}
            </div>
            <span style={{ fontSize: '11px', color: stats?.pendingApprovals > 0 ? '#92400E' : '#94A3B8', marginTop: '4px', display: 'block', fontWeight: 500 }}>
              {stats?.pendingApprovals > 0 ? 'Awaiting verification' : 'All accounts verified'}
            </span>
          </div>
        </Link>

        {/* Card: Total Registered Users */}
        <Link
          to="/admin/users"
          style={{
            textDecoration: 'none',
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Total Active Users</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group</span>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{stats?.totalUsers || 0}</div>
            <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>Students, Faculty & Coordinators</span>
          </div>
        </Link>

        {/* Card: Students */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Enrolled Students</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>school</span>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563EB', lineHeight: 1 }}>{stats?.studentsCount || 0}</div>
            <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>Active student accounts</span>
          </div>
        </div>

        {/* Card: Faculty Members */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Faculty Members</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#6D28D9', lineHeight: 1 }}>{stats?.facultyCount || 0}</div>
            <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>Teaching & marking staff</span>
          </div>
        </div>

        {/* Card: Coordinators */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Branch Coordinators</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>supervisor_account</span>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#047857', lineHeight: 1 }}>{stats?.coordinatorCount || 0}</div>
            <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>Department overseers</span>
          </div>
        </div>

        {/* Card: Total Attendance Logged */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Attendance Records</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>fact_check</span>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{stats?.totalAttendance || 0}</div>
            <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>Total attendance entries</span>
          </div>
        </div>

        {/* Card: Student Feedbacks */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Class Feedbacks</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>star</span>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#D97706', lineHeight: 1 }}>{stats?.totalFeedbacks || 0}</div>
            <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>Student lecture reviews</span>
          </div>
        </div>

        {/* Card: Pending Leave Requests */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Pending Leaves</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: stats?.pendingLeaves > 0 ? '#FFF1F2' : '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stats?.pendingLeaves > 0 ? '#E11D48' : '#64748B',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                event_busy
              </span>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: stats?.pendingLeaves > 0 ? '#E11D48' : '#0F172A',
                lineHeight: 1,
              }}
            >
              {stats?.pendingLeaves || 0}
            </div>
            <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
              Awaiting faculty review
            </span>
          </div>
        </div>
      </div>

      {/* 3. Operational Hub & Departments Deck */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left: Quick Actions & Management Shortcuts */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard_customize</span>
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Administrative Controls
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Direct shortcuts to system modules
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              to="/admin/approvals"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '16px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                textDecoration: 'none',
                color: '#0F172A',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'background 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: '#D97706', fontSize: '22px' }}>how_to_reg</span>
                <div>
                  <div style={{ color: '#0F172A' }}>Registration Security Approvals</div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>Review & activate pending accounts</div>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ color: '#94A3B8', fontSize: '18px' }}>chevron_right</span>
            </Link>

            <Link
              to="/admin/users"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '16px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                textDecoration: 'none',
                color: '#0F172A',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '22px' }}>manage_accounts</span>
                <div>
                  <div style={{ color: '#0F172A' }}>User Directory & Status Control</div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>Activate or deactivate registered users</div>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ color: '#94A3B8', fontSize: '18px' }}>chevron_right</span>
            </Link>

            <Link
              to="/admin/defaulters"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '16px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                textDecoration: 'none',
                color: '#0F172A',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: '#EF4444', fontSize: '22px' }}>warning</span>
                <div>
                  <div style={{ color: '#0F172A' }}>Attendance Defaulters List (&lt;75%)</div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>Audit attendance shortage and eligibility</div>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ color: '#94A3B8', fontSize: '18px' }}>chevron_right</span>
            </Link>
          </div>
        </div>

        {/* Right: Departmental & Branch Structure */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_tree</span>
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Active Departments ({branches.length})
                </h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                  Institutional academic structures
                </p>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '3px 8px', borderRadius: '999px' }}>
              {stats?.totalBranches || branches.length} Configured
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {branches.map((b) => (
              <div
                key={b._id || b.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#EFF6FF',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '11px',
                    }}
                  >
                    {b.code || b.name?.slice(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{b.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      {b.classes?.length || 4} Year Classes • {b.sections?.length || 4} Sections
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#2563EB',
                    background: '#DBEAFE',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
