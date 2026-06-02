import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../contexts/UsersContext';
import UserManagement from './UserManagement';
import Audit from './Audit';
import CenterManagement from './CenterManagement';
import PendingApprovals from './PendingApprovals';
import EditRequestsApproval from './EditRequestsApproval';
import ApprovalRequests from './ApprovalRequests';
import MyRequests from './MyRequests';
import Dashboard from './Dashboard';
import AuditUserDashboard from './AuditUserDashboard';
import { API_URL } from '../config';
import './Admin.css';

const Admin = () => {
  const navigate = useNavigate();
  const { users } = useUsers();
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');

  const isAdmin      = loggedUser.Role === 'Admin';
  const isAuditUser  = loggedUser.Role === 'Audit User';
  const isLegacyUser = loggedUser.Role === 'User';

  const [activeTab, setActiveTab] = useState(
    isAdmin ? 'Dashboard' : isAuditUser ? 'Dashboard' : 'Audit'
  );

  // ── Admin dropdowns ──
  const [umDropOpen,    setUmDropOpen]    = useState(false);
  const [umSubOption,   setUmSubOption]   = useState('');
  const umRef = useRef(null);

  const [auditDropOpen,    setAuditDropOpen]    = useState(false);
  const [auditSubOption,   setAuditSubOption]   = useState('');
  const auditRef = useRef(null);

  const [reqDropOpen,   setReqDropOpen]   = useState(false);
  const [reqSubOption,  setReqSubOption]  = useState('');
  const reqRef = useRef(null);

  // ── Audit User dropdowns ──
  const [auAuditDropOpen,  setAuAuditDropOpen]  = useState(false);
  const [auAuditSubOption, setAuAuditSubOption] = useState('');
  const auAuditRef = useRef(null);

  const [auUserDropOpen,  setAuUserDropOpen]  = useState(false);
  const [auUserSubOption, setAuUserSubOption] = useState('');
  const auUserRef = useRef(null);

  const [approvalCount,    setApprovalCount]    = useState(0);
  const [pendingCount,     setPendingCount]      = useState(0);
  const [editRequestCount, setEditRequestCount]  = useState(0);
  const totalReqCount = pendingCount + editRequestCount + approvalCount;

  // Close all on outside click
  useEffect(() => {
    const handler = (e) => {
      if (umRef.current       && !umRef.current.contains(e.target))       setUmDropOpen(false);
      if (auditRef.current    && !auditRef.current.contains(e.target))    setAuditDropOpen(false);
      if (reqRef.current      && !reqRef.current.contains(e.target))      setReqDropOpen(false);
      if (auAuditRef.current  && !auAuditRef.current.contains(e.target))  setAuAuditDropOpen(false);
      if (auUserRef.current   && !auUserRef.current.contains(e.target))   setAuUserDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (isAdmin) { loadPendingCount(); loadEditRequestCount(); loadApprovalCount(); }
  }, []);

  const loadApprovalCount    = async () => { try { const r=await fetch(`${API_URL}/api/pending-approvals/count`); if(r.ok){const d=await r.json();setApprovalCount(d.count||0);} } catch(e){} };
  const loadEditRequestCount = async () => { try { const r=await fetch(`${API_URL}/api/audit-reports/edit-requests/pending`); if(r.ok){const d=await r.json();setEditRequestCount(d.length||0);} } catch(e){} };
  const loadPendingCount     = async () => { try { const r=await fetch(`${API_URL}/api/audit-reports/pending/count`); if(r.ok){const d=await r.json();setPendingCount(d.count||0);} } catch(e){setPendingCount(0);} };
  const refreshAllCounts = () => { loadPendingCount(); loadEditRequestCount(); loadApprovalCount(); };

  useEffect(() => {
    if (!loggedUser?.username) { alert('Unauthorized! Please login first.'); navigate('/'); return; }
    if (!['Admin','Audit User','User'].includes(loggedUser.Role)) { alert('Unauthorized!'); navigate('/'); }
  }, [navigate, loggedUser]);

  const closeAll = () => {
    setUmDropOpen(false); setAuditDropOpen(false); setReqDropOpen(false);
    setAuAuditDropOpen(false); setAuUserDropOpen(false);
  };

  if (users.length === 0) return <div className="admin-container">Loading users...</div>;

  // Reusable dropdown panel
  const DropPanel = ({ items, activeKey, onSelect }) => (
    <div className="tab-dropdown-panel">
      {items.map(item => (
        <button key={item.key}
          className={`tab-dropdown-item ${activeKey === item.key ? 'tab-dropdown-item--active' : ''}`}
          style={{ '--dd-color': item.color }}
          onClick={() => onSelect(item.key)}
        >
          <span className="tab-dd-icon">{item.icon}</span>
          <span className="tab-dd-label">{item.label}</span>
          {item.count > 0 && (
            <span style={{ background:item.color, color:'white', borderRadius:'50%', width:18, height:18, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:'bold', marginLeft:4 }}>{item.count}</span>
          )}
          {activeKey === item.key && <span className="tab-dd-check">✓</span>}
        </button>
      ))}
    </div>
  );

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>
          {isAdmin ? 'Admin Dashboard' : isAuditUser ? 'Audit Dashboard' : 'User Dashboard'} - Welcome, {loggedUser.firstname}
        </h1>
        <button onClick={() => { localStorage.removeItem('loggedUser'); navigate('/'); }}>Logout</button>
      </header>

      <div className="tabs">

        {/* ════ ADMIN TABS ════ */}
        {isAdmin && (
          <>
            <button className={activeTab==='Dashboard' ? 'active' : ''} onClick={() => { setActiveTab('Dashboard'); closeAll(); }}>
              📊 Dashboard
            </button>

            {/* User Management ▼ */}
            <div className="tab-dropdown-wrap" ref={umRef}>
              <button className={`tab-dropdown-btn ${activeTab==='User Management' ? 'active' : ''}`}
                onClick={() => { if(activeTab!=='User Management') setUmSubOption(''); setActiveTab('User Management'); setUmDropOpen(o=>!o); setAuditDropOpen(false); setReqDropOpen(false); }}>
                👥 User Management
                <span className="tab-dropdown-caret">{umDropOpen && activeTab==='User Management' ? '▲' : '▼'}</span>
              </button>
              {umDropOpen && activeTab==='User Management' && (
                <DropPanel
                  items={[
                    { key:'create', icon:'➕', label:'Create User',  color:'#11998e', count:0 },
                    { key:'view',   icon:'👁️', label:'View Users',   color:'#2196f3', count:0 },
                    { key:'modify', icon:'✏️', label:'Modify User',  color:'#f7971e', count:0 },
                  ]}
                  activeKey={umSubOption}
                  onSelect={(k) => { setUmSubOption(k); setUmDropOpen(false); }}
                />
              )}
            </div>

            {/* Center Management */}
            <button className={activeTab==='Center Management' ? 'active' : ''} onClick={() => { setActiveTab('Center Management'); closeAll(); }}>
              🏢 Center Management
            </button>

            {/* Audit ▼ */}
            <div className="tab-dropdown-wrap" ref={auditRef}>
              <button className={`tab-dropdown-btn ${activeTab==='Audit' ? 'active' : ''}`}
                onClick={() => { if(activeTab!=='Audit') setAuditSubOption(''); setActiveTab('Audit'); setAuditDropOpen(o=>!o); setUmDropOpen(false); setReqDropOpen(false); }}>
                📋 Audit
                <span className="tab-dropdown-caret">{auditDropOpen && activeTab==='Audit' ? '▲' : '▼'}</span>
              </button>
              {auditDropOpen && activeTab==='Audit' && (
                <DropPanel
                  items={[
                    { key:'create',  icon:'➕', label:'Create Report', color:'#667eea', count:0 },
                    { key:'view',    icon:'📊', label:'View Reports',  color:'#2196f3', count:0 },
                    { key:'history', icon:'📜', label:'History',       color:'#ff6f00', count:0 },
                  ]}
                  activeKey={auditSubOption}
                  onSelect={(k) => { setAuditSubOption(k); setAuditDropOpen(false); }}
                />
              )}
            </div>

            {/* Requests ▼ */}
            <div className="tab-dropdown-wrap" ref={reqRef}>
              <button className={`tab-dropdown-btn ${activeTab==='Requests' ? 'active' : ''}`}
                onClick={() => { if(activeTab!=='Requests'){setReqSubOption('');refreshAllCounts();} setActiveTab('Requests'); setReqDropOpen(o=>!o); setUmDropOpen(false); setAuditDropOpen(false); }}>
                📨 Requests
                {totalReqCount > 0 && (
                  <span style={{ marginLeft:6, background:'#e91e63', color:'white', borderRadius:'50%', width:20, height:20, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:'bold' }}>{totalReqCount}</span>
                )}
                <span className="tab-dropdown-caret">{reqDropOpen && activeTab==='Requests' ? '▲' : '▼'}</span>
              </button>
              {reqDropOpen && activeTab==='Requests' && (
                <DropPanel
                  items={[
                    { key:'pending',  icon:'⏳', label:'Pending Approvals', color:'#ff5722', count:pendingCount },
                    { key:'edit',     icon:'🔓', label:'Edit Requests',     color:'#ff9800', count:editRequestCount },
                    { key:'approval', icon:'✅', label:'Approval Requests', color:'#e91e63', count:approvalCount },
                  ]}
                  activeKey={reqSubOption}
                  onSelect={(k) => { setReqSubOption(k); setReqDropOpen(false); }}
                />
              )}
            </div>
          </>
        )}

        {/* ════ AUDIT USER TABS ════ */}
        {isAuditUser && (
          <>
            {/* Dashboard */}
            <button className={activeTab==='Dashboard' ? 'active' : ''} onClick={() => { setActiveTab('Dashboard'); closeAll(); }}>
              📊 Dashboard
            </button>

            {/* Audit Management ▼ */}
            <div className="tab-dropdown-wrap" ref={auAuditRef}>
              <button className={`tab-dropdown-btn ${activeTab==='Audit' ? 'active' : ''}`}
                onClick={() => { if(activeTab!=='Audit') setAuAuditSubOption(''); setActiveTab('Audit'); setAuAuditDropOpen(o=>!o); setAuUserDropOpen(false); }}>
                📋 Audit Management
                <span className="tab-dropdown-caret">{auAuditDropOpen && activeTab==='Audit' ? '▲' : '▼'}</span>
              </button>
              {auAuditDropOpen && activeTab==='Audit' && (
                <DropPanel
                  items={[
                    { key:'create',  icon:'➕', label:'Create Report', color:'#667eea', count:0 },
                    { key:'view',    icon:'📊', label:'View Reports',  color:'#2196f3', count:0 },
                    { key:'history', icon:'📜', label:'History',       color:'#ff6f00', count:0 },
                  ]}
                  activeKey={auAuditSubOption}
                  onSelect={(k) => { setAuAuditSubOption(k); setAuAuditDropOpen(false); }}
                />
              )}
            </div>

            {/* Center Management */}
            <button className={activeTab==='Center Management' ? 'active' : ''} onClick={() => { setActiveTab('Center Management'); closeAll(); }}>
              🏢 Center Management
            </button>

            {/* Create Center User ▼ */}
            <div className="tab-dropdown-wrap" ref={auUserRef}>
              <button className={`tab-dropdown-btn ${activeTab==='User Management' ? 'active' : ''}`}
                onClick={() => { if(activeTab!=='User Management') setAuUserSubOption(''); setActiveTab('User Management'); setAuUserDropOpen(o=>!o); setAuAuditDropOpen(false); }}>
                👤 Create Center User
                <span className="tab-dropdown-caret">{auUserDropOpen && activeTab==='User Management' ? '▲' : '▼'}</span>
              </button>
              {auUserDropOpen && activeTab==='User Management' && (
                <DropPanel
                  items={[
                    { key:'create', icon:'➕', label:'Create User', color:'#11998e', count:0 },
                    { key:'view',   icon:'👁️', label:'View Users',  color:'#2196f3', count:0 },
                    { key:'modify', icon:'✏️', label:'Modify User', color:'#f7971e', count:0 },
                  ]}
                  activeKey={auUserSubOption}
                  onSelect={(k) => { setAuUserSubOption(k); setAuUserDropOpen(false); }}
                />
              )}
            </div>

            {/* My Requests */}
            <button className={activeTab==='My Requests' ? 'active' : ''} onClick={() => { setActiveTab('My Requests'); closeAll(); }}>
              📨 My Requests
            </button>
          </>
        )}

        {isLegacyUser && <button className="active">📋 Audit Management</button>}
      </div>

      <main className="admin-content">

        {/* ── ADMIN CONTENT ── */}
        {isAdmin && (
          <>
            {activeTab==='Dashboard'         && <Dashboard />}
            {activeTab==='User Management'   && <UserManagement auditUserMode={false} createdBy={loggedUser.firstname} defaultOption={umSubOption} hideHeader={true} />}
            {activeTab==='Center Management' && <CenterManagement />}
            {activeTab==='Audit'             && <Audit defaultOption={auditSubOption} hideHeader={true} />}
            {activeTab==='Requests' && reqSubOption==='pending'  && <PendingApprovals onApprovalUpdate={refreshAllCounts} />}
            {activeTab==='Requests' && reqSubOption==='edit'     && <EditRequestsApproval onApprovalUpdate={refreshAllCounts} />}
            {activeTab==='Requests' && reqSubOption==='approval' && <ApprovalRequests onUpdate={refreshAllCounts} />}
          </>
        )}

        {/* ── AUDIT USER CONTENT ── */}
        {isAuditUser && (
          <>
            {activeTab==='Dashboard'         && <AuditUserDashboard />}
            {activeTab==='Audit'             && <Audit defaultOption={auAuditSubOption} hideHeader={true} />}
            {activeTab==='Center Management' && <CenterManagement auditUserMode={true} createdBy={loggedUser.firstname} />}
            {activeTab==='User Management'   && <UserManagement auditUserMode={true} createdBy={loggedUser.firstname} defaultOption={auUserSubOption} hideHeader={true} />}
            {activeTab==='My Requests'       && <MyRequests createdBy={loggedUser.firstname} />}
          </>
        )}

        {isLegacyUser && <Audit />}
      </main>
    </div>
  );
};

export default Admin;