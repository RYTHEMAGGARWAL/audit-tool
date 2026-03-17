import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';


const gstStateMap = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi',
  '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
  '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh',
  '38': 'Ladakh'
};

const CenterManagement = ({ auditUserMode = false, createdBy = '' }) => {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCenter, setNewCenter] = useState({
    centerCode: '',
    centerName: '',
    projectName: '',
    zmName: '',
    regionHeadName: '',
    areaClusterManager: '',
    centerHeadName: '',
    centerType: '',
    location: '',
    
   

  });
  const [editingId, setEditingId] = useState(null);
  const [originalCenter, setOriginalCenter] = useState(null); // Track original before edit

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/centers`);
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Loaded centers:', data);
        console.log('🎯 Center Types:', data.map(c => ({ code: c.centerCode, type: c.centerType })));
        setCenters(data);
      } else {
        alert('Failed to load centers');
      }
    } catch (err) {
      console.error('Error loading centers:', err);
      alert('Error loading centers. Check if backend is running on port 3001');
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newCenter.centerType) {
  alert('⚠️ Please select Center Type (CDC/SDC/DTV)');
  return;
}
const code = newCenter.centerCode.trim().toUpperCase();
  if (!/^[FP]\d{6}$/.test(code)) {
    alert('⚠️ Center Code must be 7 characters\nStart with F or P + 6 digits\nExample: F021456');
    return;
  }
    if (!newCenter.centerCode || !newCenter.centerName) {
      alert('Please fill Center Code and Name');
      return;
      
    }

    try {
      const response = await fetch(`${API_URL}/api/centers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCenter,
          centerCode: newCenter.centerCode.trim(),
          centerName: newCenter.centerName.trim(),
          createdByRole: auditUserMode ? 'Audit User' : 'Admin',
          createdBy: auditUserMode ? createdBy : 'Admin'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.pendingApproval) {
          alert('✅ Center request submitted! Waiting for Admin approval.');
        } else {
          alert('✅ Center added successfully!');
        }
        setNewCenter({
          centerCode: '',
          centerName: '',
          projectName: '',
          zmName: '',
          regionHeadName: '',
          areaClusterManager: '',
          centerHeadName: '',
          centerType: '',
          location: '',
         
       
        });
        loadCenters();
      } else {
        alert('Failed to add center');
      }
    } catch (err) {
      console.error('Error adding center:', err);
      alert('Error adding center');
    }
  };
  

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this center?')) return;

    console.log('🗑️ Attempting to delete center:', id);
    console.log('API URL:', `${API_URL}/api/centers/${id}`);

    try {
      const response = await fetch(`${API_URL}/api/centers/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // FIXED: Handle both JSON and non-JSON responses
      let responseData = null;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          responseData = await response.json();
          console.log('Response data:', responseData);
        } catch (jsonErr) {
          console.log('Could not parse JSON:', jsonErr);
          responseData = { message: 'Deleted successfully' };
        }
      } else {
        // Non-JSON response (like plain text)
        const textResponse = await response.text();
        console.log('Text response:', textResponse);
        responseData = { message: textResponse || 'Deleted successfully' };
      }

      if (response.ok) {
        alert('✅ Center deleted successfully!');
        loadCenters();
      } else {
        const errorMsg = responseData?.error || responseData?.message || 'Unknown error';
        console.error('Delete failed:', errorMsg);
        alert(`❌ Failed to delete center: ${errorMsg}`);
      }
    } catch (err) {
      console.error('Error deleting center:', err);
      alert(`❌ Error deleting center: ${err.message}\n\nCheck console (F12) for details`);
    }
  };

  const handleUpdate = async (center) => {
    try {
      console.log('📝 Updating center:', center);
      console.log('🎯 Center Type being sent:', center.centerType);

      // Audit User ke liye - sirf changed fields track karo
      let updateData = center;
      console.log('🔍 Original center:', originalCenter);
      console.log('🔍 Updated center:', center);
      if (auditUserMode && originalCenter) {
        // Find what actually changed
        const changedFields = {};
        const trackFields = ['centerName', 'projectName', 'zmName', 'regionHeadName', 
                             'areaClusterManager', 'centerHeadName', 'centerType', 'location'];
        trackFields.forEach(field => {
          if (center[field] !== originalCenter[field]) {
            changedFields[field] = { old: originalCenter[field], new: center[field] };
          }
        });

        // If no changes detected, warn user
        if (Object.keys(changedFields).length === 0) {
          alert('⚠️ No changes detected! Please modify at least one field before submitting.');
          return;
        }

        updateData = {
          ...center,
          editRequestBy: createdBy,
          editRequestDate: new Date().toLocaleDateString('en-GB'),
          editApprovalStatus: 'pending',
          changedFields: changedFields
        };
      } else if (auditUserMode && !originalCenter) {
        // originalCenter missing - still submit as pending without diff
        updateData = {
          ...center,
          editRequestBy: createdBy,
          editRequestDate: new Date().toLocaleDateString('en-GB'),
          editApprovalStatus: 'pending',
          changedFields: {}
        };
      }
      
      const response = await fetch(`${API_URL}/api/centers/${center._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedData = await response.json();
        console.log('✅ Updated center received:', updatedData);
        if (auditUserMode) {
          alert('✅ Edit request submitted! Admin approval required before changes apply.');
        } else {
          alert('✅ Center updated successfully!');
        }
        setEditingId(null);
        loadCenters();
      } else {
        alert('Failed to update center');
      }
    } catch (err) {
      console.error('Error updating center:', err);
      alert('Error updating center');
    }
  };

  if (loading) return <div style={{textAlign: 'center', padding: '40px'}}>⏳ Loading...</div>;

  return (
    <div style={{padding: '20px'}}>
      <h2 style={{marginBottom: '20px'}}>🏢 Center Management</h2>

      {/* Add New Center Form */}
      <div style={{
        background: '#f0f8ff',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '30px',
        border: '2px solid #2196f3'
      }}>
        <h3 style={{marginBottom: '15px'}}>➕ Add New Center</h3>
        
        {/* Row 1: Center Code, Center Name, Project Name */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px'}}>
          <input
            type="text"
            placeholder="Center Code *"
            value={newCenter.centerCode}
           onChange={(e) => {
  const code = e.target.value.toUpperCase();
  let autoLocation = newCenter.location;
  
  if (code.startsWith('F') && code.length >= 3) {
    const stateCode = code.substring(1, 3);
    if (gstStateMap[stateCode]) {
      autoLocation = gstStateMap[stateCode];
    }
  }
  
  setNewCenter({...newCenter, centerCode: code, location: autoLocation});
}}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px'}}
          />
          <input
            type="text"
            placeholder="Center Name *"
            value={newCenter.centerName}
            onChange={(e) => setNewCenter({...newCenter, centerName: e.target.value})}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px'}}
          />
          <input
            type="text"
            placeholder="Project Name"
            value={newCenter.projectName}
            onChange={(e) => setNewCenter({...newCenter, projectName: e.target.value})}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px'}}
          />
        </div>

        {/* Row 2: ZM Name, Region Head, Area/Cluster Manager */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px'}}>
          <input
            type="text"
            placeholder="ZM Name"
            value={newCenter.zmName}
            onChange={(e) => setNewCenter({...newCenter, zmName: e.target.value})}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px'}}
          />
          <input
            type="text"
            placeholder="Region Head Name"
            value={newCenter.regionHeadName}
            onChange={(e) => setNewCenter({...newCenter, regionHeadName: e.target.value})}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px'}}
          />
          <input
            type="text"
            placeholder="Area/Cluster Manager"
            value={newCenter.areaClusterManager}
            onChange={(e) => setNewCenter({...newCenter, areaClusterManager: e.target.value})}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px'}}
          />
        </div>

        {/* Row 3: Center Head, Center Type, Location */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px'}}>
          <input
            type="text"
            placeholder="Center Head Name"
            value={newCenter.centerHeadName}
            onChange={(e) => setNewCenter({...newCenter, centerHeadName: e.target.value})}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px'}}
          />
          <select
            value={newCenter.centerType}
            onChange={(e) => setNewCenter({...newCenter, centerType: e.target.value})}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px', cursor: 'pointer',color: newCenter.centerType ? '#333' : '#999'}}
          >
          <option value="" disabled>-- Select Center Type --</option>
            <option value="CDC">CDC</option>
            <option value="SDC">SDC</option>
            <option value="DTV">DTV</option>
          </select>
          <input
            type="text"
            placeholder="Location"
            value={newCenter.location}
            onChange={(e) => setNewCenter({...newCenter, location: e.target.value})}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px'}}
          />
        </div>

        

        <button
          onClick={handleAdd}
          style={{
            marginTop: '5px',
            padding: '12px 30px',
            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '15px'
          }}
        >
          ➕ Add Center
        </button>
      </div>

      {/* Centers Table */}
      <div style={{background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'}}>
        <h3 style={{marginBottom: '20px'}}>📋 All Centers (Total: {centers.length})</h3>
        
        {centers.length === 0 ? (
          <p style={{textAlign: 'center', color: '#999', padding: '40px'}}>
            No centers found. Add your first center above!
          </p>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{background: '#f5f5f5'}}>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>CODE</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>NAME</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>PROJECT</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>ZM NAME</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>REGION HEAD</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>AREA/CLUSTER MGR</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>CENTER HEAD</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>CENTER TYPE</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>LOCATION</th>
                  
                  
                  <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {centers.map((center) => (
                  <tr key={center._id} style={{borderBottom: '1px solid #eee'}}>
                    <td style={{padding: '12px', fontWeight: 'bold', color: '#667eea'}}>
                      {center.centerCode}
                      {center.approvalStatus === 'pending' && (
                        <span style={{ marginLeft: '6px', padding: '2px 6px', background: '#fff3cd', color: '#856404', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #ffc107' }}>⏳ New Pending</span>
                      )}
                      {center.editApprovalStatus === 'pending' && (
                        <span style={{ marginLeft: '6px', padding: '2px 6px', background: '#e3f2fd', color: '#1565c0', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #2196f3' }}>✏️ Edit Pending</span>
                      )}
                    </td>
                    <td style={{padding: '12px'}}>
                      {editingId === center._id ? (
                        <input
                          type="text"
                          value={center.centerName}
                          onChange={(e) => {
                            const updated = centers.map(c => 
                              c._id === center._id ? {...c, centerName: e.target.value} : c
                            );
                            setCenters(updated);
                          }}
                          style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}
                        />
                      ) : center.centerName}
                    </td>
                    <td style={{padding: '12px'}}>
                      {editingId === center._id ? (
                        <input
                          type="text"
                          value={center.projectName || ''}
                          onChange={(e) => {
                            const updated = centers.map(c => 
                              c._id === center._id ? {...c, projectName: e.target.value} : c
                            );
                            setCenters(updated);
                          }}
                          style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}
                        />
                      ) : (center.projectName || '-')}
                    </td>
                    <td style={{padding: '12px'}}>
                      {editingId === center._id ? (
                        <input
                          type="text"
                          value={center.zmName || ''}
                          onChange={(e) => {
                            const updated = centers.map(c => 
                              c._id === center._id ? {...c, zmName: e.target.value} : c
                            );
                            setCenters(updated);
                          }}
                          style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}
                        />
                      ) : (center.zmName || '-')}
                    </td>
                    <td style={{padding: '12px'}}>
                      {editingId === center._id ? (
                        <input
                          type="text"
                          value={center.regionHeadName || ''}
                          onChange={(e) => {
                            const updated = centers.map(c => 
                              c._id === center._id ? {...c, regionHeadName: e.target.value} : c
                            );
                            setCenters(updated);
                          }}
                          style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}
                        />
                      ) : (center.regionHeadName || '-')}
                    </td>
                    <td style={{padding: '12px'}}>
                      {editingId === center._id ? (
                        <input
                          type="text"
                          value={center.areaClusterManager || ''}
                          onChange={(e) => {
                            const updated = centers.map(c => 
                              c._id === center._id ? {...c, areaClusterManager: e.target.value} : c
                            );
                            setCenters(updated);
                          }}
                          style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}
                        />
                      ) : (center.areaClusterManager || '-')}
                    </td>
                    <td style={{padding: '12px'}}>
                      {editingId === center._id ? (
                        <input
                          type="text"
                          value={center.centerHeadName || ''}
                          onChange={(e) => {
                            const updated = centers.map(c => 
                              c._id === center._id ? {...c, centerHeadName: e.target.value} : c
                            );
                            setCenters(updated);
                          }}
                          style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}
                        />
                      ) : (center.centerHeadName || '-')}
                    </td>
                    <td style={{padding: '12px'}}>
                      {editingId === center._id ? (
                        <select
                          value={center.centerType || 'CDC'}
                          onChange={(e) => {
                            const updated = centers.map(c => 
                              c._id === center._id ? {...c, centerType: e.target.value} : c
                            );
                            setCenters(updated);
                          }}
                          style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}
                        >
                          <option value="CDC">CDC</option>
                          <option value="SDC">SDC</option>
                          <option value="DTV">DTV</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: center.centerType === 'CDC' ? '#e3f2fd' : center.centerType === 'SDC' ? '#fff3e0' : '#f1f8e9',
                          color: center.centerType === 'CDC' ? '#1976d2' : center.centerType === 'SDC' ? '#e65100' : '#2e7d32'
                        }}>
                          {center.centerType || 'CDC'}
                        </span>
                      )}
                    </td>
                    <td style={{padding: '12px', fontSize: '12px', color: '#666'}}>
                      {editingId === center._id ? (
                        <input
                          type="text"
                          value={center.location || ''}
                          onChange={(e) => {
                            const updated = centers.map(c => 
                              c._id === center._id ? {...c, location: e.target.value} : c
                            );
                            setCenters(updated);
                          }}
                          style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}
                        />
                      ) : (center.location || center.geolocation || '-')}
                    </td>
                    
                    
                    <td style={{padding: '12px', textAlign: 'center'}}>
                      {editingId === center._id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(center)}
                            style={{
                              padding: '6px 12px',
                              background: '#4caf50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              marginRight: '5px'
                            }}
                          >
                            {auditUserMode ? '📤 Submit for Approval' : '✔ Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setOriginalCenter(null);
                              loadCenters();
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#999',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            ✕ Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(center._id);
                              // Deep copy original center data before any edits
                              setOriginalCenter(JSON.parse(JSON.stringify(center)));
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#2196f3',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              marginRight: '5px'
                            }}
                          >
                            ✏️ Edit
                          </button>
                          {!auditUserMode && (
                            <button
                              onClick={() => handleDelete(center._id)}
                              style={{
                                padding: '6px 12px',
                                background: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CenterManagement;