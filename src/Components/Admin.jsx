import React, { useState, useEffect } from 'react';
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
import { API_URL } from '../config';
import './Admin.css';

const Admin = () => {
  const navigate = useNavigate();
  const { users } = useUsers();
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
  
  // Set default tab based on role
  const isAdmin = loggedUser.Role === 'Admin';
  const isAuditUser = loggedUser.Role === 'Audit User';
  const isLegacyUser = loggedUser.Role === 'User';

  const [activeTab, setActiveTab] = useState(
    isAdmin ? 'Dashboard' :
    isAuditUser ? 'Audit' :
    'Audit'
  );

  const [approvalCount, setApprovalCount] = useState(0);

  const [pendingCount, setPendingCount] = useState(0);
  const [editRequestCount, setEditRequestCount] = useState(0);

  // Load pending count for Admin
  useEffect(() => {
    if (isAdmin) {
      loadPendingCount();
      loadEditRequestCount();
      loadApprovalCount();
    }
  }, []);

  const loadApprovalCount = async () => {
    try {
      const res = await fetch(`${API_URL}/api/pending-approvals/count`);
      if (res.ok) {
        const data = await res.json();
        setApprovalCount(data.count || 0);
      }
    } catch(e) {}
  };

  // ========================================
  // LOAD PENDING COUNT FROM MONGODB
  // ========================================
  
  // Load edit request count
  const loadEditRequestCount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/audit-reports/edit-requests/pending`);
      if (response.ok) {
        const data = await response.json();
        setEditRequestCount(data.length || 0);
      }
    } catch (err) {
      console.error('Error loading edit request count:', err);
    }
  };

  const loadPendingCount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/audit-reports/pending/count`);
      
      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.count || 0);
        console.log('📋 Pending count:', data.count);
      }
    } catch (err) {
      console.error('Error loading pending count:', err);
      setPendingCount(0);
    }
  };

  useEffect(() => {
    // Check if user is logged in
    if (!loggedUser || !loggedUser.username) {
      alert('Unauthorized! Please login first.');
      navigate('/');
      return;
    }

    // Allow Admin, Audit User, and legacy User roles
    if (!['Admin', 'Audit User', 'User'].includes(loggedUser.Role)) {
      alert('Unauthorized! Redirecting to login.');
      navigate('/');
    }
  }, [navigate, loggedUser]);

  if (users.length === 0) return <div className="admin-container">Loading users...</div>;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>
          {isAdmin ? 'Admin Dashboard' : isAuditUser ? 'Audit Dashboard' : 'User Dashboard'} - Welcome, {loggedUser.firstname}
        </h1>
        <button onClick={() => { localStorage.removeItem('loggedUser'); navigate('/'); }}>
          Logout
        </button>
      </header>

      {/* Show tabs based on user role */}
      <div className="tabs">

        {/* ── ADMIN TABS ── */}
        {isAdmin && (
          <>
            <button className={activeTab === 'Dashboard' ? 'active' : ''} onClick={() => setActiveTab('Dashboard')}>
              📊 Dashboard
            </button>
            <button className={activeTab === 'User Management' ? 'active' : ''} onClick={() => setActiveTab('User Management')}>
              👥 User Management
            </button>
            <button className={activeTab === 'Center Management' ? 'active' : ''} onClick={() => setActiveTab('Center Management')}>
              🏢 Center Management
            </button>
            <button className={activeTab === 'Audit' ? 'active' : ''} onClick={() => setActiveTab('Audit')}>
              📋 Audit
            </button>
            <button
              className={activeTab === 'Pending Approvals' ? 'active' : ''}
              onClick={() => { setActiveTab('Pending Approvals'); loadPendingCount(); loadEditRequestCount(); }}
              style={{ position: 'relative', paddingRight: pendingCount > 0 ? '45px' : '20px' }}
            >
              ⏳ Pending Approvals
              {pendingCount > 0 && (
                <span style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', background: '#ff5722', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              className={activeTab === 'Edit Requests' ? 'active' : ''}
              onClick={() => { setActiveTab('Edit Requests'); loadEditRequestCount(); }}
              style={{ position: 'relative', paddingRight: editRequestCount > 0 ? '45px' : '20px' }}
            >
              🔓 Edit Requests
              {editRequestCount > 0 && (
                <span style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', background: '#ff9800', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                  {editRequestCount}
                </span>
              )}
            </button>
            {/* Approval requests badge */}
            <button
              className={activeTab === 'Approval Requests' ? 'active' : ''}
              onClick={() => { setActiveTab('Approval Requests'); loadApprovalCount(); }}
              style={{ position: 'relative', paddingRight: approvalCount > 0 ? '45px' : '20px' }}
            >
              ✅ Approval Requests
              {approvalCount > 0 && (
                <span style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', background: '#e91e63', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                  {approvalCount}
                </span>
              )}
            </button>
          </>
        )}

        {/* ── AUDIT USER TABS ── */}
        {isAuditUser && (
          <>
            <button className={activeTab === 'Audit' ? 'active' : ''} onClick={() => setActiveTab('Audit')}>
              📋 Audit Management
            </button>
            <button className={activeTab === 'Center Management' ? 'active' : ''} onClick={() => setActiveTab('Center Management')}>
              🏢 Center Management
            </button>
            <button className={activeTab === 'User Management' ? 'active' : ''} onClick={() => setActiveTab('User Management')}>
              👤 Create Center User
            </button>
            <button className={activeTab === 'My Requests' ? 'active' : ''} onClick={() => setActiveTab('My Requests')}>
              📨 My Requests
            </button>
          </>
        )}

        {/* ── LEGACY USER TABS ── */}
        {isLegacyUser && (
          <button className="active">📋 Audit Management</button>
        )}
      </div>

      <main className="admin-content">

        {/* ── ADMIN CONTENT ── */}
        {isAdmin && (
          <>
            {activeTab === 'Dashboard' && <Dashboard />}
            {activeTab === 'User Management' && <UserManagement auditUserMode={false} createdBy={loggedUser.firstname} />}
            {activeTab === 'Center Management' && <CenterManagement />}
            {activeTab === 'Audit' && <Audit />}
            {activeTab === 'Pending Approvals' && <PendingApprovals onApprovalUpdate={loadPendingCount} />}
            {activeTab === 'Edit Requests' && <EditRequestsApproval onApprovalUpdate={loadEditRequestCount} />}
            {activeTab === 'Approval Requests' && <ApprovalRequests onUpdate={loadApprovalCount} />}
          </>
        )}

        {/* ── AUDIT USER CONTENT ── */}
        {isAuditUser && (
          <>
            {activeTab === 'Audit' && <Audit />}
            {activeTab === 'Center Management' && <CenterManagement auditUserMode={true} createdBy={loggedUser.firstname} />}
            {activeTab === 'User Management' && <UserManagement auditUserMode={true} createdBy={loggedUser.firstname} />}
            {activeTab === 'My Requests' && <MyRequests createdBy={loggedUser.firstname} />}
          </>
        )}

        {/* ── LEGACY USER CONTENT ── */}
        {isLegacyUser && <Audit />}
      </main>
    </div>
  );
};

export default Admin;