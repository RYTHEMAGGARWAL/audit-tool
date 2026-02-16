import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import './Admin.css';

const CenterDashboard = () => {
  const navigate = useNavigate();
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
  
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [checkpointRemarks, setCheckpointRemarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [editRequestStatus, setEditRequestStatus] = useState({});

  // Dynamic checkpoint data based on placement applicable
  const getCheckpointData = (placementApplicable) => {
    const isPlacementNA = placementApplicable === 'no';
    
    return {
      'Front Office': [
        { id: 'FO1', name: 'Enquires Entered in Pulse(Y/N)', weightage: 30, maxScore: isPlacementNA ? 10.5 : 9 },
        { id: 'FO2', name: 'Enrolment form available in Pulse(Y/N)', weightage: 20, maxScore: isPlacementNA ? 7 : 6 },
        { id: 'FO3', name: 'Pre assessment Available(Y/N)', weightage: 0, maxScore: 0 },
        { id: 'FO4', name: 'Documents uploaded in Pulse(Y/N)', weightage: 40, maxScore: isPlacementNA ? 14 : 12 },
        { id: 'FO5', name: 'Availability of Marketing Material(Y/N)', weightage: 10, maxScore: isPlacementNA ? 3.5 : 3 }
      ],
      'Delivery Process': [
        { id: 'DP1', name: 'Batch file maintained for all running batches', weightage: 15, maxScore: isPlacementNA ? 6.75 : 6 },
        { id: 'DP2', name: 'Batch Heath Card available', weightage: 10, maxScore: isPlacementNA ? 4.5 : 4 },
        { id: 'DP3', name: 'Attendance marked in EDL sheets correctly', weightage: 15, maxScore: isPlacementNA ? 6.75 : 6 },
        { id: 'DP4', name: 'BMS maintained with observations', weightage: 5, maxScore: isPlacementNA ? 2.25 : 2 },
        { id: 'DP5', name: 'FACT Certificate available at Center', weightage: 10, maxScore: isPlacementNA ? 4.5 : 4 },
        { id: 'DP6', name: 'Post Assessment if applicable', weightage: 0, maxScore: 0 },
        { id: 'DP7', name: 'Appraisal sheet is maintained', weightage: 10, maxScore: isPlacementNA ? 4.5 : 4 },
        { id: 'DP8', name: 'Appraisal status updated in Pulse', weightage: 5, maxScore: isPlacementNA ? 2.25 : 2 },
        { id: 'DP9', name: 'Certification Status of eligible students', weightage: 10, maxScore: isPlacementNA ? 4.5 : 4 },
        { id: 'DP10', name: 'Student signature obtained while issuing certificates', weightage: 10, maxScore: isPlacementNA ? 4.5 : 4 },
        { id: 'DP11', name: 'Verification between System vs actual certificate date', weightage: 10, maxScore: isPlacementNA ? 4.5 : 4 }
      ],
      'Placement Process': isPlacementNA ? [] : [
        { id: 'PP1', name: 'Student Placement Response', weightage: 15, maxScore: 2.25 },
        { id: 'PP2', name: 'CGT/Guest Lecture/Industry Visit', weightage: 10, maxScore: 1.50 },
        { id: 'PP3', name: 'Placement Bank & Aging', weightage: 15, maxScore: 2.25 },
        { id: 'PP4', name: 'Placement Proof Upload', weightage: 60, maxScore: 9.00 }
      ],
      'Management Process': [
        { id: 'MP1', name: 'Courseware issue to students/LMS Usage', weightage: 5, maxScore: isPlacementNA ? 1 : 0.75 },
        { id: 'MP2', name: 'TIRM details register', weightage: 20, maxScore: isPlacementNA ? 4 : 3.00 },
        { id: 'MP3', name: 'Monthly Centre Review Meeting conducted', weightage: 35, maxScore: isPlacementNA ? 7 : 5.25 },
        { id: 'MP4', name: 'Physical asset verification', weightage: 30, maxScore: isPlacementNA ? 6 : 4.50 },
        { id: 'MP5', name: 'Verification of bill authenticity', weightage: 10, maxScore: isPlacementNA ? 2 : 1.50 }
      ]
    };
  };

  useEffect(() => {
    // Check authorization
    if (!loggedUser || loggedUser.Role !== 'Center User') {
      alert('Unauthorized!');
      navigate('/');
      return;
    }
    
    // IMPORTANT: Check if centerCode exists
    if (!loggedUser.centerCode) {
      alert('⚠️ No center code assigned to your account!\n\nPlease contact admin to assign a center code.');
      navigate('/');
      return;
    }
    
    console.log('🔍 Center User Login Info:');
    console.log('   Username:', loggedUser.username);
    console.log('   Center Code:', loggedUser.centerCode);
    
    loadMyReports();
  }, []);

  const loadMyReports = async () => {
    try {
      setLoading(true);
      console.log('\n📊 Loading Reports...');
      console.log('   User Center Code:', loggedUser.centerCode);
      
      const response = await fetch(`${API_URL}/api/audit-reports`);
      
      if (response.ok) {
        const allReports = await response.json();
        console.log('   Total Reports in DB:', allReports.length);
        
        // FIXED: Better filtering with case-insensitive comparison
        let filtered = allReports;
        if (loggedUser.centerCode) {
          const userCenterCode = loggedUser.centerCode.toUpperCase().trim();
          filtered = allReports.filter(r => {
            const reportCenterCode = (r.centerCode || '').toUpperCase().trim();
            const matches = reportCenterCode === userCenterCode;
            
            if (matches) {
              console.log('   ✅ Match found:', r.centerCode, '-', r.centerName);
            }
            
            return matches;
          });
        }
        
        console.log('   Filtered Reports:', filtered.length);
        console.log('   Center Codes:', filtered.map(r => r.centerCode).join(', '));
        
        if (filtered.length === 0) {
          console.log('   ⚠️ No reports found for center:', loggedUser.centerCode);
        }
        
        setMyReports(filtered);
        
        const requestStatus = {};
        filtered.forEach(report => {
          requestStatus[report._id] = {
            locked: report.centerHeadRemarksLocked || false,
            requestPending: report.centerHeadEditRequest || false
          };
        });
        setEditRequestStatus(requestStatus);
      }
    } catch (err) {
      console.error('❌ Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    
    // Load remarks from centerHeadCheckpointRemarks object
    let existingRemarks = report.centerHeadCheckpointRemarks || {};
    
    // If object is empty, try loading from individual checkpoint fields (backward compatibility)
    if (Object.keys(existingRemarks).length === 0) {
      const checkpointIds = ['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5'];
      
      checkpointIds.forEach(cpId => {
        if (report[cpId]?.centerHeadRemarks) {
          existingRemarks[cpId] = report[cpId].centerHeadRemarks;
        }
      });
    }
    
    setCheckpointRemarks(existingRemarks);
    setShowModal(true);
  };

  const handleCheckpointRemarkChange = (checkpointId, value) => {
    setCheckpointRemarks(prev => ({
      ...prev,
      [checkpointId]: value
    }));
  };

  const handleRequestEdit = async (reportId) => {
    if (window.confirm('Request edit permission from admin?')) {
      try {
        const response = await fetch(`${API_URL}/api/audit-reports/${reportId}/request-edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ centerUserName: loggedUser.firstname })
        });
        
        if (response.ok) {
          alert('Edit request sent to admin!');
          loadMyReports();
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  const handleSubmitObservations = async () => {
    if (!selectedReport) return;
    
    if (!window.confirm('Submit your observations? This will lock your remarks until admin approves any future edit requests.')) {
      return;
    }
    
    try {
      setSaving(true);
      
      const response = await fetch(`${API_URL}/api/audit-reports/${selectedReport._id}/center-remarks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerHeadCheckpointRemarks: checkpointRemarks,
          centerRemarksBy: loggedUser.firstname,
          centerRemarksDate: new Date().toLocaleString('en-IN')
        })
      });
      
      if (response.ok) {
        alert('✅ Observations submitted successfully!\n\nYour remarks are now locked. Contact admin if you need to make changes.');
        setShowModal(false);
        loadMyReports();
      } else {
        alert('❌ Failed to submit observations');
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <header className="admin-header">
          <h1>Center Dashboard - {loggedUser.firstname}</h1>
          <button onClick={() => { localStorage.removeItem('loggedUser'); navigate('/'); }}>Logout</button>
        </header>
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p style={{ fontSize: '18px', color: '#666' }}>Loading your reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Center Dashboard - Welcome, {loggedUser.firstname}</h1>
        <button onClick={() => { localStorage.removeItem('loggedUser'); navigate('/'); }}>Logout</button>
      </header>

      <main className="admin-content">
        {/* Info Banner */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>🏢 Your Center: <strong>{loggedUser.centerCode}</strong></h2>
          <p style={{ margin: '8px 0 0', fontSize: '14px', opacity: 0.9 }}>
            Showing reports only for your center
          </p>
        </div>

        {/* Reports List */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '22px', color: '#2c3e50' }}>📊 My Audit Reports ({myReports.length})</h3>
            <button 
              onClick={loadMyReports}
              style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🔄 Refresh
            </button>
          </div>

          {myReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '12px' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.3 }}>📋</div>
              <h3 style={{ color: '#666', margin: 0 }}>No Audit Reports Found</h3>
              <p style={{ color: '#999', marginTop: '10px' }}>
                No reports available for center: <strong>{loggedUser.centerCode}</strong>
              </p>
              <p style={{ color: '#999', marginTop: '5px', fontSize: '13px' }}>
                Reports will appear here once audits are created for your center
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>CENTER</th>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>CODE</th>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>AUDIT DATE</th>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>FRONT OFFICE</th>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>DELIVERY</th>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>PLACEMENT</th>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>MANAGEMENT</th>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>TOTAL</th>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>STATUS</th>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {myReports.map((report, idx) => {
                    const isLocked = editRequestStatus[report._id]?.locked;
                    const isRequestPending = editRequestStatus[report._id]?.requestPending;
                    
                    // STATUS calculation - matching AuditManagement.jsx
                    const statusData = report.grandTotal >= 80 ? { text: 'Compliant', color: '#28a745', bg: '#d4edda' } :
                                      report.grandTotal >= 65 ? { text: 'Amber', color: '#ffc107', bg: '#fff3cd' } :
                                      { text: 'Non-Compliant', color: '#dc3545', bg: '#f8d7da' };

                    // Helper function to get area score status and color (matching AuditManagement.jsx)
                    const getAreaScoreInfo = (score, maxScore) => {
                      if (score === 'NA') return { status: 'NA', color: '#999' };
                      const numScore = parseFloat(score || 0);
                      const percent = (numScore / maxScore) * 100;
                      
                      if (percent >= 80) return { status: 'Compliant', color: '#28a745' };
                      if (percent >= 65) return { status: 'Amber', color: '#ffc107' };
                      return { status: 'Non-Compliant', color: '#dc3545' };
                    };

                    const foData = getAreaScoreInfo(report.frontOfficeScore, report.placementApplicable === 'no' ? 35 : 30);
                    const dpData = getAreaScoreInfo(report.deliveryProcessScore, report.placementApplicable === 'no' ? 45 : 40);
                    const ppData = report.placementApplicable === 'no' ? { status: 'NA', color: '#999' } : getAreaScoreInfo(report.placementScore, 15);
                    const mpData = getAreaScoreInfo(report.managementScore, report.placementApplicable === 'no' ? 20 : 15);

                    return (
                      <tr key={report._id} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ padding: '12px 10px', fontWeight: '600', color: '#1e40af' }}>{report.centerName}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 'bold', color: '#6366f1', background: '#e0e7ff' }}>{report.centerCode}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>{report.auditDateString || '-'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: foData.color }}>{foData.status}</div>
                          <div style={{ fontSize: '14px', color: foData.color, fontWeight: 'bold' }}>({parseFloat(report.frontOfficeScore || 0).toFixed(2)})</div>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: dpData.color }}>{dpData.status}</div>
                          <div style={{ fontSize: '14px', color: dpData.color, fontWeight: 'bold' }}>({parseFloat(report.deliveryProcessScore || 0).toFixed(2)})</div>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {report.placementApplicable === 'no' ? (
                            <span style={{ color: '#999', fontWeight: 'bold', fontSize: '15px' }}>NA</span>
                          ) : (
                            <>
                              <div style={{ fontWeight: '700', fontSize: '13px', color: ppData.color }}>{ppData.status}</div>
                              <div style={{ fontSize: '14px', color: ppData.color, fontWeight: 'bold' }}>({parseFloat(report.placementScore || 0).toFixed(2)})</div>
                            </>
                          )}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: mpData.color }}>{mpData.status}</div>
                          <div style={{ fontSize: '14px', color: mpData.color, fontWeight: 'bold' }}>({parseFloat(report.managementScore || 0).toFixed(2)})</div>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>{report.grandTotal.toFixed(2)}</div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: statusData.bg, color: statusData.color }}>
                            {statusData.text}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button onClick={() => handleViewReport(report)} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                              View Report
                            </button>
                            {isLocked && !isRequestPending && (
                              <button onClick={() => handleRequestEdit(report._id)} style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                                Request Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal for viewing report - keeping existing modal code */}
      {showModal && selectedReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '15px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '98%', maxWidth: '1600px', height: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ background: '#0d9488', padding: '20px 25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0 }}>Audit Report Details</h2>
                <p style={{ margin: '6px 0 0', fontSize: '14px', opacity: 0.95 }}>
                  {selectedReport.centerName} ({selectedReport.centerCode}) | Score: {selectedReport.grandTotal}/100
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: '2px solid white', color: 'white', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                Close
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', background: '#f9fafb' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                  <tr style={{ background: '#e5e7eb' }}>
                    <th style={{ padding: '12px 10px', border: '1px solid #9ca3af', textAlign: 'center', width: '3%' }}>S.NO</th>
                    <th style={{ padding: '12px 10px', border: '1px solid #9ca3af', textAlign: 'left', width: '20%' }}>CHECKPOINT</th>
                    <th style={{ padding: '12px 10px', border: '1px solid #9ca3af', textAlign: 'center', width: '6%' }}>WEIGHTAGE</th>
                    <th style={{ padding: '12px 10px', border: '1px solid #9ca3af', textAlign: 'center', width: '6%' }}>MAX SCORE</th>
                    <th style={{ padding: '12px 10px', border: '1px solid #9ca3af', textAlign: 'center', width: '6%' }}>TOTAL</th>
                    <th style={{ padding: '12px 10px', border: '1px solid #9ca3af', textAlign: 'center', width: '7%' }}>COMPLIANT</th>
                    <th style={{ padding: '12px 10px', border: '1px solid #9ca3af', textAlign: 'center', width: '6%' }}>%</th>
                    <th style={{ padding: '12px 10px', border: '1px solid #9ca3af', textAlign: 'center', width: '6%' }}>SCORE</th>
                    <th style={{ padding: '12px 10px', border: '1px solid #9ca3af', textAlign: 'left', width: '15%' }}>REMARKS</th>
                    <th style={{ padding: '12px 10px', border: '1px solid #9ca3af', textAlign: 'left', width: '25%', background: '#86efac' }}>CENTER HEAD REMARKS</th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(getCheckpointData(selectedReport.placementApplicable)).map(([areaName, checkpoints], areaIdx) => {
                    // Skip Placement Process area if it's empty (when placement is NA)
                    if (checkpoints.length === 0) return null;
                    
                    return (
                    <React.Fragment key={areaIdx}>
                      <tr>
                        <td colSpan="10" style={{ padding: '14px 20px', background: areaName === 'Placement Process' && selectedReport.placementApplicable === 'no' ? '#999' : '#6366f1', color: 'white', fontWeight: '700', fontSize: '15px', border: '1px solid #4f46e5' }}>
                          Area {areaIdx + 1}: {areaName} {areaName === 'Placement Process' && selectedReport.placementApplicable === 'no' ? '(N/A)' : ''}
                        </td>
                      </tr>

                      {checkpoints.map((cp, cpIdx) => {
                        const cpData = selectedReport[cp.id] || {};
                        const isLocked = editRequestStatus[selectedReport._id]?.locked;

                        return (
                          <tr key={cp.id} style={{ background: cpIdx % 2 === 0 ? 'white' : '#f9fafb' }}>
                            <td style={{ padding: '10px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: '600' }}>{cpIdx + 1}</td>
                            <td style={{ padding: '10px', border: '1px solid #d1d5db' }}>{cp.name}</td>
                            <td style={{ padding: '10px', border: '1px solid #d1d5db', textAlign: 'center' }}>{cp.weightage}%</td>
                            <td style={{ padding: '10px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: '600' }}>{cp.maxScore}</td>
                            <td style={{ padding: '10px', border: '1px solid #d1d5db', textAlign: 'center' }}>{cpData.totalSamples || '-'}</td>
                            <td style={{ padding: '10px', border: '1px solid #d1d5db', textAlign: 'center' }}>{cpData.samplesCompliant || cpData.compliantSamples || '-'}</td>
                            <td style={{ padding: '10px', border: '1px solid #d1d5db', textAlign: 'center', color: '#2563eb', fontWeight: '600' }}>{cpData.compliantPercent || '0'}%</td>
                            <td style={{ padding: '10px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: '700', color: '#16a34a', fontSize: '15px' }}>{(cpData.score || 0).toFixed(2)}</td>
                            <td style={{ padding: '10px', border: '1px solid #d1d5db', fontSize: '12px' }}>{cpData.remarks || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #d1d5db', background: '#f0fdf4', verticalAlign: 'top' }}>
                              <textarea
                                value={checkpointRemarks[cp.id] || ''}
                                onChange={(e) => handleCheckpointRemarkChange(cp.id, e.target.value)}
                                disabled={isLocked}
                                placeholder={isLocked ? 'Locked' : 'Enter your remarks here...'}
                                rows={3}
                                style={{ 
                                  width: '100%', 
                                  padding: '8px', 
                                  border: isLocked ? '1px solid #d1d5db' : '2px solid #86efac', 
                                  borderRadius: '6px', 
                                  fontSize: '13px', 
                                  background: isLocked ? '#f3f4f6' : 'white',
                                  resize: 'vertical',
                                  minHeight: '60px',
                                  fontFamily: 'inherit'
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );})}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '20px 25px', background: 'white', borderTop: '2px solid #e5e7eb' }}>
              {editRequestStatus[selectedReport._id]?.locked ? (
                <div>
                  <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '10px', marginBottom: '12px', textAlign: 'center', border: '2px solid #fbbf24' }}>
                    <div style={{ fontWeight: '700', color: '#92400e' }}>Remarks Locked</div>
                  </div>
                  {editRequestStatus[selectedReport._id]?.requestPending ? (
                    <div style={{ background: '#dbeafe', padding: '14px', borderRadius: '10px', textAlign: 'center', color: '#1e40af', fontWeight: '700' }}>
                      Edit request pending
                    </div>
                  ) : (
                    <button onClick={() => { setShowModal(false); handleRequestEdit(selectedReport._id); }} style={{ width: '100%', padding: '16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>
                      Request Edit Permission
                    </button>
                  )}
                </div>
              ) : (
                <button onClick={handleSubmitObservations} disabled={saving} style={{ width: '100%', padding: '18px', background: saving ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '18px', fontWeight: '700' }}>
                  {saving ? 'Submitting...' : 'Submit All Observations'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterDashboard;