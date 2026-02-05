import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../contexts/UsersContext';
import UserManagement from './UserManagement';
import Audit from './Audit';
import CenterManagement from './CenterManagement';
import PendingApprovals from './PendingApprovals';
import EditRequestsApproval from './EditRequestsApproval';
import { API_URL } from '../config';
import './Admin.css';

const Admin = () => {
  const navigate = useNavigate();
  const { users } = useUsers();
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
  
  // Set default tab based on role
  const [activeTab, setActiveTab] = useState(
    loggedUser.Role === 'User' ? 'Audit' : 'User Management'
  );

  const [pendingCount, setPendingCount] = useState(0);
  const [editRequestCount, setEditRequestCount] = useState(0);

  // Load pending count for Admin
  useEffect(() => {
    if (loggedUser.Role === 'Admin') {
      loadPendingCount();
      loadEditRequestCount();
    }
  }, [loggedUser.Role]);

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

    // Allow both Admin and User roles
    if (loggedUser.Role !== 'Admin' && loggedUser.Role !== 'User') {
      alert('Unauthorized! Redirecting to login.');
      navigate('/');
    }
  }, [navigate, loggedUser]);

  if (users.length === 0) return <div className="admin-container">Loading users...</div>;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>
          {loggedUser.Role === 'Admin' ? 'Admin Dashboard' : 'User Dashboard'} - Welcome, {loggedUser.firstname}
        </h1>
        <button onClick={() => { localStorage.removeItem('loggedUser'); navigate('/'); }}>
          Logout
        </button>
      </header>

      {/* Show tabs based on user role */}
      <div className="tabs">
        {/* Admin sees 3 tabs */}
        {loggedUser.Role === 'Admin' && (
          <>
            <button 
              className={activeTab === 'User Management' ? 'active' : ''} 
              onClick={() => setActiveTab('User Management')}
            >
              👥 User Management
            </button>
            <button 
              className={activeTab === 'Center Management' ? 'active' : ''} 
              onClick={() => setActiveTab('Center Management')}
            >
              🏢 Center Management
            </button>
            <button 
              className={activeTab === 'Audit' ? 'active' : ''} 
              onClick={() => setActiveTab('Audit')}
            >
              📋 Audit
            </button>
            <button 
              className={activeTab === 'Pending Approvals' ? 'active' : ''} 
              onClick={() => {
                setActiveTab('Pending Approvals');
                loadPendingCount();
      loadEditRequestCount(); // Refresh count when tab clicked
              }}
              style={{
                position: 'relative',
                paddingRight: pendingCount > 0 ? '45px' : '20px'
              }}
            >
              ⏳ Pending Approvals
              {pendingCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  right: '10px',
                  transform: 'translateY(-50%)',
                  background: '#ff5722',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(255, 87, 34, 0.4)'
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button 
              className={activeTab === 'Edit Requests' ? 'active' : ''} 
              onClick={() => {
                setActiveTab('Edit Requests');
                loadEditRequestCount();
              }}
              style={{
                position: 'relative',
                paddingRight: editRequestCount > 0 ? '45px' : '20px'
              }}
            >
              🔓 Edit Requests
              {editRequestCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  right: '10px',
                  transform: 'translateY(-50%)',
                  background: '#ff9800',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(255, 152, 0, 0.4)'
                }}>
                  {editRequestCount}
                </span>
              )}
            </button>
          </>
        )}

        {/* User sees only Audit tab */}
        {loggedUser.Role === 'User' && (
          <button className="active">
            📋 Audit Management
          </button>
        )}
      </div>

      <main className="admin-content">
        {/* Admin can access all 3 sections */}
        {loggedUser.Role === 'Admin' && (
          <>
            {activeTab === 'User Management' && <UserManagement />}
            {activeTab === 'Center Management' && <CenterManagement />}
            {activeTab === 'Audit' && <Audit />}
            {activeTab === 'Pending Approvals' && <PendingApprovals onApprovalUpdate={loadPendingCount} />}
            {activeTab === 'Edit Requests' && <EditRequestsApproval onApprovalUpdate={loadEditRequestCount} />}
          </>
        )}

        {/* User can only access Audit */}
        {loggedUser.Role === 'User' && <Audit />}
      </main>
    </div>
  );
};

export default Admin;