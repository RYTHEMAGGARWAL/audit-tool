import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const ApprovalRequests = ({ onUpdate }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingCenters, setPendingCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('users');
  const [reopenRequests, setReopenRequests] = useState([]);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const [usersRes, centersRes, reopenRes] = await Promise.all([
        fetch(`${API_URL}/api/pending-approvals/users`),
        fetch(`${API_URL}/api/pending-approvals/centers`),
        fetch(`${API_URL}/api/audit-reports/reopen-requests/pending`)
      ]);
      if (usersRes.ok) setPendingUsers(await usersRes.json());
      if (centersRes.ok) setPendingCenters(await centersRes.json());
      if (reopenRes.ok) setReopenRequests(await reopenRes.json());
    } catch(e) {
      console.error('Error loading pending:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (type, id) => {
    if (!window.confirm(`Approve this ${type}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/pending-approvals/${type}/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        alert(`✅ ${type === 'user' ? 'User' : 'Center'} approved! They can now access the system.`);
        loadPending();
        if (onUpdate) onUpdate();
      }
    } catch(e) { alert('Error: ' + e.message); }
  };

  const handleReject = async (type, id) => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return;
    try {
      const res = await fetch(`${API_URL}/api/pending-approvals/${type}/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        alert(`❌ ${type === 'user' ? 'User' : 'Center'} rejected.`);
        loadPending();
        if (onUpdate) onUpdate();
      }
    } catch(e) { alert('Error: ' + e.message); }
  };

  const totalPending = pendingUsers.length + pendingCenters.length;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
        <h2 style={{ margin: 0, color: '#1a237e' }}>✅ Approval Requests</h2>
        {totalPending > 0 && (
          <span style={{ background: '#e91e63', color: 'white', borderRadius: '20px', padding: '4px 14px', fontSize: '14px', fontWeight: 'bold' }}>
            {totalPending} Pending
          </span>
        )}
      </div>

      {/* Section Toggle */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveSection('users')}
          style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
            background: activeSection === 'users' ? 'linear-gradient(135deg, #1a237e, #3949ab)' : '#f1f5f9',
            color: activeSection === 'users' ? 'white' : '#333'
          }}
        >
          👤 Center Users {pendingUsers.length > 0 && `(${pendingUsers.length})`}
        </button>
        <button
          onClick={() => setActiveSection('centers')}
          style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
            background: activeSection === 'centers' ? 'linear-gradient(135deg, #1a237e, #3949ab)' : '#f1f5f9',
            color: activeSection === 'centers' ? 'white' : '#333'
          }}
        >
          🏢 Centers {pendingCenters.length > 0 && `(${pendingCenters.length})`}
        </button>
        <button
          onClick={() => setActiveSection('reopen')}
          style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
            background: activeSection === 'reopen' ? 'linear-gradient(135deg, #e65100, #ff9800)' : '#f1f5f9',
            color: activeSection === 'reopen' ? 'white' : '#333', position: 'relative'
          }}
        >
          🔓 Reopen Requests {reopenRequests.length > 0 && `(${reopenRequests.length})`}
        </button>
      </div>

      {/* ── PENDING USERS ── */}
      {activeSection === 'users' && (
        pendingUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#f9fafb', borderRadius: '12px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
            <p style={{ fontSize: '16px' }}>No pending user approvals</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingUsers.map(u => (
              <div key={u._id} style={{ background: 'white', border: '2px solid #e3f2fd', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#1a237e' }}>
                        👤 {u.firstname} {u.lastname} <span style={{ fontSize: '13px', color: '#667eea' }}>(@{u.username})</span>
                      </span>
                      <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                        background: u.modifyApprovalStatus === 'pending' ? '#e3f2fd' : '#e8f5e9',
                        color: u.modifyApprovalStatus === 'pending' ? '#1565c0' : '#2e7d32',
                        border: `1px solid ${u.modifyApprovalStatus === 'pending' ? '#2196f3' : '#4caf50'}`
                      }}>
                        {u.modifyApprovalStatus === 'pending' ? '✏️ Modify Request' : '🆕 New User'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', fontSize: '13px', color: '#555' }}>
                      <span>📧 {u.email || '-'}</span>
                      <span>📱 {u.mobile || '-'}</span>
                      <span>🏢 Center Code: <strong>{u.centerCode || '-'}</strong></span>
                      <span>👥 Role: <strong style={{ color: '#667eea' }}>{u.Role || u.role || 'Center User'}</strong></span>
                      <span>🙋 Requested by: <strong>{u.modifiedBy || u.approvalRequestedBy || 'Audit User'}</strong></span>
                      {u.modifyApprovalStatus === 'pending' && u.pendingModifyData && (() => {
                        const skipFields = ['_id','__v','modifiedByRole','modifiedBy','createdAt','updatedAt','approvalStatus','approvalRequestedBy','approvalDate','isActive','resetOTP','resetOTPExpires','modifyApprovalStatus','pendingModifyData'];
                        const fieldLabels = { firstname: 'First Name', lastname: 'Last Name', email: 'Email', mobile: 'Mobile', centerCode: 'Center Code', Role: 'Role', role: 'Role', password: 'Password' };
                        const changedEntries = Object.entries(u.pendingModifyData).filter(([k]) => !skipFields.includes(k));
                        if (changedEntries.length === 0) return null;
                        return (
                          <div style={{ gridColumn: '1/-1', marginTop: '10px' }}>
                            <div style={{ fontWeight: 'bold', color: '#856404', marginBottom: '8px', fontSize: '13px' }}>📝 Requested Changes:</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ background: '#fff3cd' }}>
                                  <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #ffc107', color: '#856404' }}>Field</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #ffc107', color: '#dc3545' }}>Current Value</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #ffc107', color: '#2e7d32' }}>New Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {changedEntries.map(([field, newVal]) => {
                                  const currentVal = field === 'centerCode' ? u.centerCode : field === 'Role' || field === 'role' ? (u.Role || u.role) : field === 'email' ? u.email : field === 'mobile' ? u.mobile : field === 'firstname' ? u.firstname : field === 'lastname' ? u.lastname : field === 'password' ? '••••••' : u[field];
                                  const displayNew = field === 'password' ? '••••••' : newVal;
                                  if (currentVal === newVal) return null;
                                  return (
                                    <tr key={field} style={{ background: 'white' }}>
                                      <td style={{ padding: '5px 10px', border: '1px solid #ffc107', fontWeight: 'bold', color: '#555' }}>
                                        {fieldLabels[field] || field}
                                      </td>
                                      <td style={{ padding: '5px 10px', border: '1px solid #ffc107', color: '#dc3545', textDecoration: 'line-through' }}>
                                        {currentVal || '—'}
                                      </td>
                                      <td style={{ padding: '5px 10px', border: '1px solid #ffc107', color: '#2e7d32', fontWeight: 'bold' }}>
                                        {displayNew || '—'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleApprove('user', u._id)}
                      style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #4caf50, #8bc34a)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                    >✅ Approve</button>
                    <button
                      onClick={() => handleReject('user', u._id)}
                      style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #f44336, #e91e63)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                    >❌ Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── PENDING CENTERS ── */}
      {activeSection === 'centers' && (
        pendingCenters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#f9fafb', borderRadius: '12px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
            <p style={{ fontSize: '16px' }}>No pending center approvals</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingCenters.map(c => (
              <div key={c._id} style={{ background: 'white', border: `2px solid ${c.editApprovalStatus === 'pending' ? '#e3f2fd' : '#e8f5e9'}`, borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '16px', color: c.editApprovalStatus === 'pending' ? '#1565c0' : '#2e7d32' }}>
                        🏢 {c.centerName} <span style={{ fontSize: '13px', color: '#667eea' }}>({c.centerCode})</span>
                      </span>
                      <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                        background: c.editApprovalStatus === 'pending' ? '#e3f2fd' : '#e8f5e9',
                        color: c.editApprovalStatus === 'pending' ? '#1565c0' : '#2e7d32',
                        border: `1px solid ${c.editApprovalStatus === 'pending' ? '#2196f3' : '#4caf50'}`
                      }}>
                        {c.editApprovalStatus === 'pending' ? '✏️ Edit Request' : '🆕 New Center'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', fontSize: '13px', color: '#555' }}>
                      <span>🏷️ Type: <strong>{c.centerType || '-'}</strong></span>
                      <span>📍 Location: {c.location || '-'}</span>
                      <span>👤 Center Head: {c.centerHeadName || '-'}</span>
                      <span>📊 Project: {c.projectName || '-'}</span>
                      <span>🙋 Requested by: <strong>{c.editRequestBy || c.approvalRequestedBy || 'Audit User'}</strong></span>
                      {c.editApprovalStatus === 'pending' && c.changedFields && Object.keys(c.changedFields).length > 0 && (
                        <div style={{ gridColumn: '1/-1', background: '#fff8e1', padding: '12px', borderRadius: '8px', border: '1px solid #ffc107', marginTop: '8px' }}>
                          <div style={{ fontWeight: 'bold', color: '#856404', marginBottom: '8px', fontSize: '13px' }}>📝 Requested Changes:</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: '#fff3cd' }}>
                                <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #ffc107', color: '#856404' }}>Field</th>
                                <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #ffc107', color: '#dc3545' }}>Old Value</th>
                                <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #ffc107', color: '#2e7d32' }}>New Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(c.changedFields).map(([field, vals]) => (
                                <tr key={field} style={{ background: 'white' }}>
                                  <td style={{ padding: '5px 10px', border: '1px solid #ffc107', fontWeight: 'bold', color: '#555', textTransform: 'capitalize' }}>
                                    {field.replace(/([A-Z])/g, ' $1').trim()}
                                  </td>
                                  <td style={{ padding: '5px 10px', border: '1px solid #ffc107', color: '#dc3545', textDecoration: 'line-through' }}>
                                    {vals.old || '—'}
                                  </td>
                                  <td style={{ padding: '5px 10px', border: '1px solid #ffc107', color: '#2e7d32', fontWeight: 'bold' }}>
                                    {vals.new || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {c.editApprovalStatus === 'pending' && (!c.changedFields || Object.keys(c.changedFields || {}).length === 0) && (
                        <span style={{ gridColumn: '1/-1', background: '#fff8e1', padding: '8px', borderRadius: '6px', fontSize: '12px', border: '1px solid #ffc107', color: '#856404' }}>
                          📝 Edit request pending — no specific changes tracked
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleApprove('center', c._id)}
                      style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #4caf50, #8bc34a)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                    >✅ Approve</button>
                    <button
                      onClick={() => handleReject('center', c._id)}
                      style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #f44336, #e91e63)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                    >❌ Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
      {/* REOPEN REQUESTS SECTION */}
      {activeSection === 'reopen' && (
        reopenRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#f9fafb', borderRadius: '12px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔓</div>
            <p style={{ fontSize: '16px' }}>No pending reopen requests</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reopenRequests.map(r => (
              <div key={r._id} style={{ background: 'white', border: '2px solid #ff9800', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#e65100', marginBottom: '8px' }}>
                      🔓 {r.centerName} ({r.centerCode})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px', color: '#555' }}>
                      <span>👤 Requested By: <strong>{r.reopenRequestBy}</strong></span>
                      <span>📅 Date: {r.reopenRequestDate}</span>
                      <span>📊 Score: <strong>{r.grandTotal}/100</strong></span>
                      <span>🏢 Status: {r.currentStatus}</span>
                    </div>
                    {r.reopenRequestReason && (
                      <div style={{ marginTop: '10px', padding: '10px 14px', background: '#fff8e1', borderRadius: '8px', border: '1px solid #ffc107', fontSize: '13px', color: '#856404' }}>
                        📝 Reason: {r.reopenRequestReason}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Approve reopen for ' + r.centerName + '?\nCenter + Placement dono unlock honge.')) return;
                        const res = await fetch(`${API_URL}/api/audit-reports/${r._id}/reopen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reopenedBy: 'Admin' }) });
                        const d = await res.json();
                        if (res.ok) { alert('🔓 Reopened! Deadline: ' + d.newDeadline); loadPending(); if (onUpdate) onUpdate(); }
                        else alert('❌ ' + (d.error || 'Failed'));
                      }}
                      style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#4caf50,#8bc34a)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                    >✅ Approve & Reopen</button>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Reject reopen request for ' + r.centerName + '?')) return;
                        const res = await fetch(`${API_URL}/api/audit-reports/${r._id}/reject-reopen`, { method: 'POST' });
                        if (res.ok) { alert('❌ Request rejected.'); loadPending(); if (onUpdate) onUpdate(); }
                        else alert('Failed');
                      }}
                      style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#f44336,#e91e63)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                    >❌ Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default ApprovalRequests;