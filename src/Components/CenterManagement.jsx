import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const CenterManagement = () => {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCenter, setNewCenter] = useState({
    centerCode: '',
    centerName: '',
    chName: '',
    geolocation: '',
    centerHeadName: '',
    zonalHeadName: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/centers`);
      if (response.ok) {
        const data = await response.json();
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
          centerName: newCenter.centerName.trim()
        })
      });

      if (response.ok) {
        alert('✅ Center added successfully!');
        setNewCenter({
          centerCode: '',
          centerName: '',
          chName: '',
          geolocation: '',
          centerHeadName: '',
          zonalHeadName: ''
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
      const response = await fetch(`${API_URL}/api/centers/${center._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(center)
      });

      if (response.ok) {
        alert('✅ Center updated successfully!');
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
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
          <input
            type="text"
            placeholder="Center Code *"
            value={newCenter.centerCode}
            onChange={(e) => setNewCenter({...newCenter, centerCode: e.target.value})}
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
            placeholder="CH Name"
            value={newCenter.chName}
            onChange={(e) => setNewCenter({...newCenter, chName: e.target.value})}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px'}}
          />
          <input
            type="text"
            placeholder="Geolocation"
            value={newCenter.geolocation}
            onChange={(e) => setNewCenter({...newCenter, geolocation: e.target.value})}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px'}}
          />
          <input
            type="text"
            placeholder="Center Head Name"
            value={newCenter.centerHeadName}
            onChange={(e) => setNewCenter({...newCenter, centerHeadName: e.target.value})}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px'}}
          />
          <input
            type="text"
            placeholder="Zonal Head Name"
            value={newCenter.zonalHeadName}
            onChange={(e) => setNewCenter({...newCenter, zonalHeadName: e.target.value})}
            style={{padding: '10px', border: '2px solid #ddd', borderRadius: '6px'}}
          />
        </div>
        <button
          onClick={handleAdd}
          style={{
            marginTop: '15px',
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
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Code</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Name</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>CH Name</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Geolocation</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Center Head</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Zonal Head</th>
                  <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {centers.map((center) => (
                  <tr key={center._id} style={{borderBottom: '1px solid #eee'}}>
                    <td style={{padding: '12px'}}>{center.centerCode}</td>
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
                    <td style={{padding: '12px'}}>{center.chName || '-'}</td>
                    <td style={{padding: '12px'}}>{center.geolocation || '-'}</td>
                    <td style={{padding: '12px'}}>{center.centerHeadName || '-'}</td>
                    <td style={{padding: '12px'}}>{center.zonalHeadName || '-'}</td>
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
                            ✔ Save
                          </button>
                          <button
                            onClick={() => {setEditingId(null); loadCenters();}}
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
                            onClick={() => setEditingId(center._id)}
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