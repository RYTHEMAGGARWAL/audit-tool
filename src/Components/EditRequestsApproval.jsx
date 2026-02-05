import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const EditRequestsApproval = ({ onApprovalUpdate }) => {
  const [editRequests, setEditRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');

  const loadEditRequests = async () => {
    try {
      setLoading(true);
      console.log('🔓 Loading edit requests...');
      
      const response = await fetch(`${API_URL}/api/audit-reports/edit-requests/pending`);
      if (response.ok) {
        const data = await response.json();
        setEditRequests(data);
        console.log(`✅ Loaded ${data.length} edit requests`);
        
        // Notify parent of count change
        if (onApprovalUpdate) {
          onApprovalUpdate(data.length);
        }
      }
    } catch (err) {
      console.error('❌ Error loading edit requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEditRequests();
    // Refresh every 30 seconds
    const interval = setInterval(loadEditRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (reportId, centerCode) => {
    if (window.confirm(`Approve edit request for ${centerCode}?\n\nCenter Head can edit remarks ONE MORE TIME only.`)) {
      try {
        const response = await fetch(`${API_URL}/api/audit-reports/${reportId}/approve-edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminName: loggedUser.firstname })
        });
        
        if (response.ok) {
          alert('✅ Edit request approved!\n\nCenter Head can now edit remarks once.');
          loadEditRequests();
        } else {
          alert('❌ Failed to approve request');
        }
      } catch (err) {
        alert('❌ Error: ' + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <p>Loading edit requests...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '25px',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 15px rgba(255, 152, 0, 0.3)'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🔓 Center Head Edit Requests</h2>
          <p style={{ margin: '5px 0 0', fontSize: '14px', opacity: 0.9 }}>
            Approve requests to allow Center Heads to edit their remarks
          </p>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          padding: '10px 20px',
          borderRadius: '25px',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          {editRequests.length} Pending
        </div>
      </div>

      {editRequests.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '60px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.3 }}>✅</div>
          <h3 style={{ color: '#666', margin: 0 }}>No Pending Edit Requests</h3>
          <p style={{ color: '#999', marginTop: '10px' }}>
            All Center Head remarks are either unlocked or no requests pending
          </p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <th style={{ padding: '15px', color: 'white', textAlign: 'left', fontWeight: 600 }}>
                  Center Code
                </th>
                <th style={{ padding: '15px', color: 'white', textAlign: 'left', fontWeight: 600 }}>
                  Center Name
                </th>
                <th style={{ padding: '15px', color: 'white', textAlign: 'left', fontWeight: 600 }}>
                  CH Name
                </th>
                <th style={{ padding: '15px', color: 'white', textAlign: 'left', fontWeight: 600 }}>
                  Requested By
                </th>
                <th style={{ padding: '15px', color: 'white', textAlign: 'left', fontWeight: 600 }}>
                  Request Date
                </th>
                <th style={{ padding: '15px', color: 'white', textAlign: 'center', fontWeight: 600 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {editRequests.map((req, idx) => (
                <tr 
                  key={req._id} 
                  style={{ 
                    borderBottom: '1px solid #eee',
                    background: idx % 2 === 0 ? 'white' : '#f9f9f9'
                  }}
                >
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#667eea' }}>
                    {req.centerCode}
                  </td>
                  <td style={{ padding: '15px' }}>
                    {req.centerName}
                  </td>
                  <td style={{ padding: '15px' }}>
                    {req.chName || '-'}
                  </td>
                  <td style={{ padding: '15px' }}>
                    {req.centerHeadEditRequestBy}
                  </td>
                  <td style={{ padding: '15px', fontSize: '13px', color: '#666' }}>
                    {req.centerHeadEditRequestDate}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleApprove(req._id, req.centerCode)}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(17, 153, 142, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(17, 153, 142, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(17, 153, 142, 0.3)';
                      }}
                    >
                      ✅ Approve Edit Permission
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      <div style={{
        background: '#e3f2fd',
        padding: '15px 20px',
        borderRadius: '8px',
        marginTop: '20px',
        border: '2px solid #2196f3'
      }}>
        <div style={{ color: '#1565c0', fontSize: '14px' }}>
          <strong>ℹ️ How it works:</strong>
          <ul style={{ marginTop: '10px', marginBottom: 0, paddingLeft: '20px' }}>
            <li>When a Center Head's remarks are locked, they can request edit permission</li>
            <li>Approving will unlock their remarks for <strong>ONE MORE EDIT ONLY</strong></li>
            <li>After saving again, remarks will be locked automatically</li>
            <li>This ensures audit trail integrity and prevents unauthorized changes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EditRequestsApproval;