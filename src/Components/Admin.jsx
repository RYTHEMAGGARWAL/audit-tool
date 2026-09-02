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

// A tab button that opens a dropdown of sub-options (User Management, Center Management, etc.)
const DropdownTab = ({ label, icon, tabKey, activeTab, setActiveTab, isOpen, setIsOpen, subOption, setSubOption, closeOthers, items, badge, tabRef }) => {
  const isActive = activeTab === tabKey;
  return (
    <div className="tab-dropdown-wrap" ref={tabRef}>
      <button className={`tab-dropdown-btn ${isActive ? 'active' : ''}`}
        onClick={() => {
          if (activeTab !== tabKey) setSubOption('');
          setActiveTab(tabKey);
          setIsOpen(o => !o);
          closeOthers();
        }}>
        {icon} {label}
        {badge > 0 && (
          <span style={{ marginLeft:6, background:'#e91e63', color:'white', borderRadius:'50%', width:20, height:20, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:'bold' }}>{badge}</span>
        )}
        <span className="tab-dropdown-caret">{isOpen && isActive ? '▲' : '▼'}</span>
      </button>
      {isOpen && isActive && (
        <DropPanel items={items} activeKey={subOption} onSelect={(k) => { setSubOption(k); setIsOpen(false); }} />
      )}
    </div>
  );
};

// Admin's tab bar: Dashboard + 4 dropdown tabs
const AdminTabs = ({
  activeTab, setActiveTab, closeAll,
  umDropOpen, setUmDropOpen, umSubOption, setUmSubOption, umRef,
  cmDropOpen, setCmDropOpen, cmSubOption, setCmSubOption, cmRef,
  auditDropOpen, setAuditDropOpen, auditSubOption, setAuditSubOption, auditRef,
  reqDropOpen, setReqDropOpen, reqSubOption, setReqSubOption, reqRef,
  totalReqCount, pendingCount, editRequestCount, approvalCount, refreshAllCounts
}) => (
  <>
    <button className={activeTab==='Dashboard' ? 'active' : ''} onClick={() => { setActiveTab('Dashboard'); closeAll(); }}>
      📊 Dashboard
    </button>

    <DropdownTab
      label="User Management" icon="👥" tabKey="User Management"
      activeTab={activeTab} setActiveTab={setActiveTab}
      isOpen={umDropOpen} setIsOpen={setUmDropOpen}
      subOption={umSubOption} setSubOption={setUmSubOption}
      closeOthers={() => { setAuditDropOpen(false); setReqDropOpen(false); }}
      tabRef={umRef}
      items={[
        { key:'create', icon:'➕', label:'Create User',  color:'#11998e', count:0 },
        { key:'view',   icon:'👁️', label:'View Users',   color:'#2196f3', count:0 },
        { key:'modify', icon:'✏️', label:'Modify User',  color:'#f7971e', count:0 },
      ]}
    />

    <DropdownTab
      label="Center Management" icon="🏢" tabKey="Center Management"
      activeTab={activeTab} setActiveTab={setActiveTab}
      isOpen={cmDropOpen} setIsOpen={setCmDropOpen}
      subOption={cmSubOption} setSubOption={setCmSubOption}
      closeOthers={() => { setUmDropOpen(false); setAuditDropOpen(false); setReqDropOpen(false); }}
      tabRef={cmRef}
      items={[
        { key:'create', icon:'➕', label:'Add Center',    color:'#11998e', count:0 },
        { key:'view',   icon:'👁️', label:'View Centers',  color:'#2196f3', count:0 },
        { key:'modify', icon:'✏️', label:'Modify Center', color:'#f7971e', count:0 },
      ]}
    />

    <DropdownTab
      label="Audit" icon="📋" tabKey="Audit"
      activeTab={activeTab} setActiveTab={setActiveTab}
      isOpen={auditDropOpen} setIsOpen={setAuditDropOpen}
      subOption={auditSubOption} setSubOption={setAuditSubOption}
      closeOthers={() => { setUmDropOpen(false); setReqDropOpen(false); }}
      tabRef={auditRef}
      items={[
        { key:'create',  icon:'➕', label:'Create Report', color:'#667eea', count:0 },
        { key:'view',    icon:'📊', label:'View Reports',  color:'#2196f3', count:0 },
        { key:'history', icon:'📜', label:'History',       color:'#ff6f00', count:0 },
      ]}
    />

    <DropdownTab
      label="Requests" icon="📨" tabKey="Requests"
      activeTab={activeTab} setActiveTab={setActiveTab}
      isOpen={reqDropOpen} setIsOpen={setReqDropOpen}
      subOption={reqSubOption} setSubOption={(k) => { if (k === '') refreshAllCounts(); setReqSubOption(k); }}
      closeOthers={() => { setUmDropOpen(false); setAuditDropOpen(false); }}
      tabRef={reqRef}
      badge={totalReqCount}
      items={[
        { key:'pending',  icon:'⏳', label:'Pending Approvals', color:'#ff5722', count:pendingCount },
        { key:'edit',     icon:'🔓', label:'Edit Requests',     color:'#ff9800', count:editRequestCount },
        { key:'approval', icon:'✅', label:'Approval Requests', color:'#e91e63', count:approvalCount },
      ]}
    />
  </>
);

// Audit User's tab bar: Dashboard + 3 dropdown tabs + My Requests
const AuditUserTabs = ({
  activeTab, setActiveTab, closeAll,
  auAuditDropOpen, setAuAuditDropOpen, auAuditSubOption, setAuAuditSubOption, auAuditRef,
  cmDropOpen, setCmDropOpen, cmSubOption, setCmSubOption, cmRef,
  auUserDropOpen, setAuUserDropOpen, auUserSubOption, setAuUserSubOption, auUserRef
}) => (
  <>
    <button className={activeTab==='Dashboard' ? 'active' : ''} onClick={() => { setActiveTab('Dashboard'); closeAll(); }}>
      📊 Dashboard
    </button>

    <DropdownTab
      label="Audit Management" icon="📋" tabKey="Audit"
      activeTab={activeTab} setActiveTab={setActiveTab}
      isOpen={auAuditDropOpen} setIsOpen={setAuAuditDropOpen}
      subOption={auAuditSubOption} setSubOption={setAuAuditSubOption}
      closeOthers={() => { setAuUserDropOpen(false); }}
      tabRef={auAuditRef}
      items={[
        { key:'create',  icon:'➕', label:'Create Report', color:'#667eea', count:0 },
        { key:'view',    icon:'📊', label:'View Reports',  color:'#2196f3', count:0 },
        { key:'history', icon:'📜', label:'History',       color:'#ff6f00', count:0 },
      ]}
    />

    <DropdownTab
      label="Center Management" icon="🏢" tabKey="Center Management"
      activeTab={activeTab} setActiveTab={setActiveTab}
      isOpen={cmDropOpen} setIsOpen={setCmDropOpen}
      subOption={cmSubOption} setSubOption={setCmSubOption}
      closeOthers={() => { setAuAuditDropOpen(false); setAuUserDropOpen(false); }}
      tabRef={cmRef}
      items={[
        { key:'create', icon:'➕', label:'Add Center',    color:'#11998e', count:0 },
        { key:'view',   icon:'👁️', label:'View Centers',  color:'#2196f3', count:0 },
        { key:'modify', icon:'✏️', label:'Modify Center', color:'#f7971e', count:0 },
      ]}
    />

    <DropdownTab
      label="Create Center User" icon="👤" tabKey="User Management"
      activeTab={activeTab} setActiveTab={setActiveTab}
      isOpen={auUserDropOpen} setIsOpen={setAuUserDropOpen}
      subOption={auUserSubOption} setSubOption={setAuUserSubOption}
      closeOthers={() => { setAuAuditDropOpen(false); }}
      tabRef={auUserRef}
      items={[
        { key:'create', icon:'➕', label:'Create User', color:'#11998e', count:0 },
        { key:'view',   icon:'👁️', label:'View Users',  color:'#2196f3', count:0 },
        { key:'modify', icon:'✏️', label:'Modify User', color:'#f7971e', count:0 },
      ]}
    />

    <button className={activeTab==='My Requests' ? 'active' : ''} onClick={() => { setActiveTab('My Requests'); closeAll(); }}>
      📨 My Requests
    </button>
  </>
);

// Admin's main content area — Dashboard, or whichever sub-page is selected
const AdminContent = ({ activeTab, umSubOption, cmSubOption, auditSubOption, reqSubOption, loggedUser, refreshAllCounts }) => (
  <>
    {(activeTab==='Dashboard' || (activeTab==='User Management' && !umSubOption) || (activeTab==='Center Management' && !cmSubOption) || (activeTab==='Audit' && !auditSubOption) || (activeTab==='Requests' && !reqSubOption)) && <Dashboard />}

    {activeTab==='User Management'   && umSubOption   && <UserManagement auditUserMode={false} createdBy={loggedUser.firstname} defaultOption={umSubOption} hideHeader={true} />}
    {activeTab==='Center Management' && cmSubOption   && <CenterManagement defaultOption={cmSubOption} />}
    {activeTab==='Audit'             && auditSubOption && <Audit defaultOption={auditSubOption} hideHeader={true} />}
    {activeTab==='Requests' && reqSubOption==='pending'  && <PendingApprovals onApprovalUpdate={refreshAllCounts} />}
    {activeTab==='Requests' && reqSubOption==='edit'     && <EditRequestsApproval onApprovalUpdate={refreshAllCounts} />}
    {activeTab==='Requests' && reqSubOption==='approval' && <ApprovalRequests onUpdate={refreshAllCounts} />}
  </>
);

// Audit User's main content area
const AuditUserContent = ({ activeTab, auAuditSubOption, cmSubOption, auUserSubOption, loggedUser }) => (
  <>
    {(activeTab==='Dashboard' || (activeTab==='Audit' && !auAuditSubOption) || (activeTab==='Center Management' && !cmSubOption) || (activeTab==='User Management' && !auUserSubOption)) && <AuditUserDashboard />}

    {activeTab==='Audit'             && auAuditSubOption && <Audit defaultOption={auAuditSubOption} hideHeader={true} />}
    {activeTab==='Center Management' && cmSubOption      && <CenterManagement auditUserMode={true} createdBy={loggedUser.firstname} defaultOption={cmSubOption} />}
    {activeTab==='User Management'   && auUserSubOption  && <UserManagement auditUserMode={true} createdBy={loggedUser.firstname} defaultOption={auUserSubOption} hideHeader={true} />}
    {activeTab==='My Requests'       && <MyRequests createdBy={loggedUser.firstname} />}
  </>
);

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

  const [cmDropOpen,  setCmDropOpen]  = useState(false);
  const [cmSubOption, setCmSubOption] = useState('');
  const cmRef = useRef(null);

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
      if (cmRef.current       && !cmRef.current.contains(e.target))       setCmDropOpen(false);
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
    setUmDropOpen(false); setCmDropOpen(false); setAuditDropOpen(false); setReqDropOpen(false);
    setAuAuditDropOpen(false); setAuUserDropOpen(false);
  };

  if (users.length === 0) return <div className="admin-container">Loading users...</div>;


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
          <AdminTabs
            activeTab={activeTab} setActiveTab={setActiveTab} closeAll={closeAll}
            umDropOpen={umDropOpen} setUmDropOpen={setUmDropOpen} umSubOption={umSubOption} setUmSubOption={setUmSubOption} umRef={umRef}
            cmDropOpen={cmDropOpen} setCmDropOpen={setCmDropOpen} cmSubOption={cmSubOption} setCmSubOption={setCmSubOption} cmRef={cmRef}
            auditDropOpen={auditDropOpen} setAuditDropOpen={setAuditDropOpen} auditSubOption={auditSubOption} setAuditSubOption={setAuditSubOption} auditRef={auditRef}
            reqDropOpen={reqDropOpen} setReqDropOpen={setReqDropOpen} reqSubOption={reqSubOption} setReqSubOption={setReqSubOption} reqRef={reqRef}
            totalReqCount={totalReqCount} pendingCount={pendingCount} editRequestCount={editRequestCount} approvalCount={approvalCount} refreshAllCounts={refreshAllCounts}
          />
        )}

        {/* ════ AUDIT USER TABS ════ */}
        {isAuditUser && (
          <AuditUserTabs
            activeTab={activeTab} setActiveTab={setActiveTab} closeAll={closeAll}
            auAuditDropOpen={auAuditDropOpen} setAuAuditDropOpen={setAuAuditDropOpen} auAuditSubOption={auAuditSubOption} setAuAuditSubOption={setAuAuditSubOption} auAuditRef={auAuditRef}
            cmDropOpen={cmDropOpen} setCmDropOpen={setCmDropOpen} cmSubOption={cmSubOption} setCmSubOption={setCmSubOption} cmRef={cmRef}
            auUserDropOpen={auUserDropOpen} setAuUserDropOpen={setAuUserDropOpen} auUserSubOption={auUserSubOption} setAuUserSubOption={setAuUserSubOption} auUserRef={auUserRef}
          />
        )}

        {isLegacyUser && <button className="active">📋 Audit Management</button>}
      </div>

      <main className="admin-content">

        {/* ── ADMIN CONTENT ── */}
        {isAdmin && (
          <AdminContent
            activeTab={activeTab} umSubOption={umSubOption} cmSubOption={cmSubOption}
            auditSubOption={auditSubOption} reqSubOption={reqSubOption}
            loggedUser={loggedUser} refreshAllCounts={refreshAllCounts}
          />
        )}

        {/* ── AUDIT USER CONTENT ── */}
        {isAuditUser && (
          <AuditUserContent
            activeTab={activeTab} auAuditSubOption={auAuditSubOption} cmSubOption={cmSubOption}
            auUserSubOption={auUserSubOption} loggedUser={loggedUser}
          />
        )}

        {isLegacyUser && <Audit />}
      </main>
    </div>
  );
};

export default Admin;