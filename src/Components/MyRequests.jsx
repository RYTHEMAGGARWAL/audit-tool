import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const MyRequests = ({ createdBy }) => {
  const [userRequests, setUserRequests] = useState([]);
  const [centerRequests, setCenterRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('users');

  useEffect(() => {
    loadMyRequests();
  }, []);

  const loadMyRequests = async () => {
    setLoading(true);
    try {
      // Dedicated endpoint - includes pending/inactive records
      const res = await fetch(`${API_URL}/api/my-requests/${encodeURIComponent(createdBy)}`);
      if (res.ok) {
        const data = await res.json();
        setUserRequests(data.users || []);
        setCenterRequests(data.centers || []);
        console.log('✅ My requests loaded:', data.users?.length, 'users,', data.centers?.length, 'centers');
      }
    } catch(e) {
      console.error('Error loading requests:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'pending') return { text: '⏳ Pending', color: '#856404', bg: '#fff3cd', border: '#ffc107' };
    if (status === 'approved') return { text: '✅ Approved', color: '#155724', bg: '#d4edda', border: '#28a745' };
    if (status === 'rejected') return { text: '❌ Rejected', color: '#721c24', bg: '#f8d7da', border: '#dc3545' };
    return { text: '✅ Active', color: '#155724', bg: '#d4edda', border: '#28a745' };
  };

  const totalPending = [
    ...userRequests.filter(u => u.approvalStatus === 'pending'),
    ...centerRequests.filter(c => c.approvalStatus === 'pending' || c.editApprovalStatus === 'pending')
  ].length;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
        <h2 style={{ margin: 0, color: '#1a237e' }}>📋 My Requests</h2>
        {totalPending > 0 && (
          <span style={{ background: '#ff9800', color: 'white', borderRadius: '20px', padding: '4px 14px', fontSize: '14px', fontWeight: 'bold' }}>
            {totalPending} Pending
          </span>
        )}
        <button onClick={loadMyRequests} style={{ marginLeft: 'auto', padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Section Toggle */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveSection('users')}
          style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
            background: activeSection === 'users' ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f1f5f9',
            color: activeSection === 'users' ? 'white' : '#333'
          }}
        >
          👤 Center User Requests {userRequests.length > 0 && `(${userRequests.length})`}
        </button>
        <button
          onClick={() => setActiveSection('centers')}
          style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
            background: activeSection === 'centers' ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f1f5f9',
            color: activeSection === 'centers' ? 'white' : '#333'
          }}
        >
          🏢 Center Requests {centerRequests.length > 0 && `(${centerRequests.length})`}
        </button>
      </div>

      {/* ── CENTER USER REQUESTS ── */}
      {activeSection === 'users' && (
        userRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#f9fafb', borderRadius: '12px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
            <p style={{ fontSize: '16px' }}>No center user requests yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {userRequests.map(u => {
              const isModify = u.modifyApprovalStatus === 'pending' || u.modifyApprovalStatus === 'approved';
              const status = isModify ? u.modifyApprovalStatus : u.approvalStatus;
              const badge = getStatusBadge(status);
              return (
                <div key={u._id} style={{ background: 'white', border: `2px solid ${badge.border}`, borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#1a237e' }}>
                          👤 {u.firstname} {u.lastname}
                          <span style={{ fontSize: '13px', color: '#667eea', marginLeft: '8px' }}>@{u.username}</span>
                        </span>
                        <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                          background: isModify ? '#e3f2fd' : '#e8f5e9',
                          color: isModify ? '#1565c0' : '#2e7d32',
                          border: `1px solid ${isModify ? '#2196f3' : '#4caf50'}`
                        }}>
                          {isModify ? '✏️ Modify Request' : '🆕 New User'}
                        </span>
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                          color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`
                        }}>
                          {badge.text}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px', color: '#555' }}>
                        <span>📧 {u.email || '-'}</span>
                        <span>📱 {u.mobile || '-'}</span>
                        <span>🏢 Center: <strong style={{ color: '#667eea' }}>{u.centerCode || '-'}</strong></span>
                        <span>👥 Role: <strong>{u.Role || u.role || 'Center User'}</strong></span>
                        {u.approvalDate && <span>📅 {u.approvalStatus === 'pending' ? 'Requested' : 'Processed'}: {u.approvalDate}</span>}
                      </div>
                    </div>
                  </div>
                  {u.approvalStatus === 'approved' && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#d4edda', borderRadius: '8px', fontSize: '13px', color: '#155724' }}>
                      ✅ User is now active and can login to the system.
                    </div>
                  )}
                  {u.approvalStatus === 'rejected' && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f8d7da', borderRadius: '8px', fontSize: '13px', color: '#721c24' }}>
                      ❌ Request was rejected by Admin. Please contact Admin for details.
                    </div>
                  )}
                  {u.approvalStatus === 'pending' && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fff3cd', borderRadius: '8px', fontSize: '13px', color: '#856404' }}>
                      ⏳ Waiting for Admin approval before this user can login.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── CENTER REQUESTS ── */}
      {activeSection === 'centers' && (
        centerRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#f9fafb', borderRadius: '12px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏢</div>
            <p style={{ fontSize: '16px' }}>No center requests yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {centerRequests.map(c => {
              const isEdit = c.editRequestBy === createdBy || c.editRequestBy?.toLowerCase() === createdBy?.toLowerCase();
              const status = isEdit ? c.editApprovalStatus : c.approvalStatus;
              const badge = getStatusBadge(status);
              return (
                <div key={c._id} style={{ background: 'white', border: `2px solid ${badge.border}`, borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#2e7d32' }}>
                          🏢 {c.centerName}
                          <span style={{ fontSize: '13px', color: '#667eea', marginLeft: '8px' }}>({c.centerCode})</span>
                        </span>
                        <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                          background: isEdit ? '#e3f2fd' : '#e8f5e9', color: isEdit ? '#1565c0' : '#2e7d32',
                          border: `1px solid ${isEdit ? '#2196f3' : '#4caf50'}`
                        }}>
                          {isEdit ? '✏️ Edit Request' : '🆕 New Center'}
                        </span>
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                          color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`
                        }}>
                          {badge.text}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px', color: '#555' }}>
                        <span>🏷️ Type: <strong>{c.centerType || '-'}</strong></span>
                        <span>📍 Location: {c.location || '-'}</span>
                        <span>👤 Center Head: {c.centerHeadName || '-'}</span>
                        {isEdit && c.editRequestDate && <span>📅 Requested: {c.editRequestDate}</span>}
                      </div>

                      {/* Changed fields for edit requests */}
                      {isEdit && c.changedFields && Object.keys(c.changedFields).length > 0 && (
                        <div style={{ marginTop: '12px', background: '#fff8e1', padding: '12px', borderRadius: '8px', border: '1px solid #ffc107' }}>
                          <div style={{ fontWeight: 'bold', color: '#856404', marginBottom: '8px', fontSize: '13px' }}>📝 Your requested changes:</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: '#fff3cd' }}>
                                <th style={{ padding: '5px 10px', textAlign: 'left', border: '1px solid #ffc107', color: '#856404' }}>Field</th>
                                <th style={{ padding: '5px 10px', textAlign: 'left', border: '1px solid #ffc107', color: '#dc3545' }}>Old</th>
                                <th style={{ padding: '5px 10px', textAlign: 'left', border: '1px solid #ffc107', color: '#2e7d32' }}>New</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(c.changedFields).map(([field, vals]) => (
                                <tr key={field}>
                                  <td style={{ padding: '4px 10px', border: '1px solid #ffc107', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                    {field.replace(/([A-Z])/g, ' $1').trim()}
                                  </td>
                                  <td style={{ padding: '4px 10px', border: '1px solid #ffc107', color: '#dc3545', textDecoration: 'line-through' }}>{vals.old || '—'}</td>
                                  <td style={{ padding: '4px 10px', border: '1px solid #ffc107', color: '#2e7d32', fontWeight: 'bold' }}>{vals.new || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {status === 'approved' && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#d4edda', borderRadius: '8px', fontSize: '13px', color: '#155724' }}>
                      ✅ {isEdit ? 'Changes have been applied successfully.' : 'Center is now active in the system.'}
                    </div>
                  )}
                  {status === 'rejected' && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f8d7da', borderRadius: '8px', fontSize: '13px', color: '#721c24' }}>
                      ❌ {isEdit ? 'Edit request was rejected.' : 'Center request was rejected.'} Please contact Admin for details.
                    </div>
                  )}
                  {status === 'pending' && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fff3cd', borderRadius: '8px', fontSize: '13px', color: '#856404' }}>
                      ⏳ Waiting for Admin approval.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default MyRequests;