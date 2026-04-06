import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const EditRequestsApproval = ({ onApprovalUpdate }) => {
  const [editRequests, setEditRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');

  // ========================================
  // RED FLAG STATUS LOGIC
  // ========================================
  
  const getGrandTotalColor = (report) => {
    const status = getAuditStatus(report);
    if (status === 'Compliant') return '#28a745';
    if (status === 'Amber') return '#ffc107';
    return '#dc3545';
  };

  const getAuditStatus = (report) => {
    const foMax = report.placementApplicable === 'no' ? 35 : 30;
    const dpMax = report.placementApplicable === 'no' ? 45 : 40;
    const ppMax = 15;
    const mpMax = report.placementApplicable === 'no' ? 20 : 15;
    
    const foPercent = (parseFloat(report.frontOfficeScore || 0) / foMax) * 100;
    const dpPercent = (parseFloat(report.deliveryProcessScore || 0) / dpMax) * 100;
    const ppPercent = report.placementApplicable === 'no' ? null : (parseFloat(report.placementScore || 0) / ppMax) * 100;
    const mpPercent = (parseFloat(report.managementScore || 0) / mpMax) * 100;
    
    const areas = [
      { name: 'FO', percent: foPercent },
      { name: 'DP', percent: dpPercent },
      ppPercent !== null ? { name: 'PP', percent: ppPercent } : null,
      { name: 'MP', percent: mpPercent }
    ].filter(Boolean);
    
    const red = areas.filter(a => a.percent < 65).length;
    const amber = areas.filter(a => a.percent >= 65 && a.percent < 80).length;
    const green = areas.filter(a => a.percent >= 80).length;
    
    if (red > 0) return 'Non-Compliant';
    if (amber >= 3) return 'Non-Compliant';
    if (amber === 2) return 'Amber';
    if (green === areas.length) return 'Compliant';
    if (amber === 1) return 'Compliant';
    return 'Amber';
  };

  const getAreaScoreInfo = (score, maxScore) => {
    if (score === 'NA') return { status: 'NA', color: '#999' };
    const numScore = parseFloat(score || 0);
    const percent = (numScore / maxScore) * 100;
    
    if (percent >= 80) return { status: 'Compliant', color: '#28a745' };
    if (percent >= 65) return { status: 'Amber', color: '#ffc107' };
    return { status: 'Non-Compliant', color: '#dc3545' };
  };

  // ========================================
  // END RED FLAG STATUS LOGIC
  // ========================================

  const loadEditRequests = async () => {
    try {
      setLoading(true);
      console.log('🔓 Loading edit requests...');
      
      const response = await fetch(`${API_URL}/api/audit-reports/edit-requests/pending`);
      if (response.ok) {
        const data = await response.json();
        setEditRequests(data);
        console.log(`✅ Loaded ${data.length} edit requests`);
        
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

  const handleApprovePlacement = async (reportId, centerCode) => {
    if (window.confirm(`Approve PLACEMENT edit request for ${centerCode}?\n\nPlacement Coordinator can edit ONE MORE TIME only.`)) {
      try {
        const res = await fetch(`${API_URL}/api/audit-reports/${reportId}/approve-placement-edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminName: loggedUser.firstname })
        });
        if (res.ok) {
          alert('✅ Placement edit approved!');
          loadEditRequests();
        } else {
          const err = await res.json().catch(() => ({}));
          alert('❌ ' + (err.error || 'Failed'));
        }
      } catch (err) { alert('❌ Error: ' + err.message); }
    }
  };

  const handleViewReport = async (report) => {
    try {
      const cRes = await fetch(`${API_URL}/api/centers`);
      if (cRes.ok) {
        const centers = await cRes.json();
        const cData = centers.find(ct => ct.centerCode === report.centerCode);
        if (cData) {
          setSelectedReport({
            ...report,
            areaManager: cData.areaManager || report.areaManager || cData.areaClusterManager || report.areaClusterManager || '',
            clusterManager: cData.clusterManager || report.clusterManager || '',
            placementCoordinator: cData.placementCoordinator || report.placementCoordinator || '',
            seniorManagerPlacement: cData.seniorManagerPlacement || report.seniorManagerPlacement || '',
            nationalHeadPlacement: cData.nationalHeadPlacement || report.nationalHeadPlacement || '',
            placementApplicable: cData.placementApplicable || report.placementApplicable || 'yes',
            zmName: cData.zmName || report.zmName || '',
            regionHeadName: cData.regionHeadName || report.regionHeadName || '',
            centerHeadName: cData.centerHeadName || report.centerHeadName || '',
          });
        } else setSelectedReport(report);
      } else setSelectedReport(report);
    } catch(e) { setSelectedReport(report); }
    setShowModal(true);
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
          overflow: 'auto'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1400px' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontWeight: 600, fontSize: '12px', position: 'sticky', left: 0, zIndex: 3, background: '#667eea' }}>
                  CENTER<br/>CODE
                </th>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontWeight: 600, fontSize: '12px', position: 'sticky', left: '100px', zIndex: 3, background: '#667eea' }}>
                  CENTER<br/>NAME
                </th>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontWeight: 600, fontSize: '12px' }}>
                  PROJECT<br/>NAME
                </th>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontWeight: 600, fontSize: '12px' }}>
                  ZM<br/>NAME
                </th>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontWeight: 600, fontSize: '12px' }}>
                  REGION<br/>HEAD
                </th>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontWeight: 600, fontSize: '12px' }}>
                  AREA/CLUSTER<br/>MANAGER
                </th>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontWeight: 600, fontSize: '12px' }}>
                  CENTER<br/>HEAD
                </th>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>
                  CENTER<br/>TYPE
                </th>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontWeight: 600, fontSize: '12px' }}>
                  LOCATION
                </th>
                
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontWeight: 600, fontSize: '12px' }}>
                  FINANCIAL<br/>YEAR
                </th>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontWeight: 600, fontSize: '12px' }}>
                  REQUESTED<br/>BY
                </th>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontWeight: 600, fontSize: '12px' }}>
                  REQUEST<br/>DATE
                </th>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>
                  REQUEST<br/>TYPE
                </th>
                <th style={{ padding: '12px 8px', color: 'white', textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>
                  ACTIONS
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
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#667eea', position: 'sticky', left: 0, zIndex: 2, background: idx % 2 === 0 ? 'white' : '#f9f9f9' }}>
                    {req.centerCode}
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 600, position: 'sticky', left: '100px', zIndex: 2, background: idx % 2 === 0 ? 'white' : '#f9f9f9' }}>
                    {req.centerName}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                    {req.projectName || '-'}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                    {req.zmName || '-'}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                    {req.regionHeadName || '-'}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                    {req.areaManager || req.areaClusterManager || '-'}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                    {req.centerHeadName || '-'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: req.centerType === 'CDC' ? '#e3f2fd' : req.centerType === 'SDC' ? '#fff3e0' : '#f1f8e9',
                      color: req.centerType === 'CDC' ? '#1976d2' : req.centerType === 'SDC' ? '#e65100' : '#2e7d32'
                    }}>
                      {req.centerType || 'CDC'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                    {req.location || req.geolocation || '-'}
                  </td>
                  
                  <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 'bold', color: '#667eea' }}>
                    {req.financialYear || 'FY26'}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                    {req.centerHeadEditRequestBy}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '12px', color: '#666' }}>
                    {req.centerHeadEditRequestDate}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    {req.centerHeadEditRequest && (
                      <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', background: '#fff3e0', color: '#e65100', border: '1px solid #ff9800', marginBottom: req.placementEditRequest ? '4px' : 0 }}>
                        🏠 Center Head
                      </span>
                    )}
                    {req.centerHeadEditRequest && req.placementEditRequest && <br/>}
                    {req.placementEditRequest && (
                      <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #4caf50' }}>
                        📋 Placement
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                      {req.centerHeadEditRequest && (
                        <button onClick={() => handleApprove(req._id, req.centerCode)}
                          style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #ff9800, #e65100)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                          ✅ Approve CH
                        </button>
                      )}
                      {req.placementEditRequest && (
                        <button onClick={() => handleApprovePlacement(req._id, req.centerCode)}
                          style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #4caf50, #2e7d32)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                          ✅ Approve PP
                        </button>
                      )}
                      <button onClick={() => handleViewReport(req)}
                        style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                        📊 View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            width: '95%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
              padding: '20px 25px',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px' }}>📊 Audit Report - Edit Request</h3>
                <p style={{ margin: '5px 0 0', fontSize: '14px', opacity: 0.9 }}>
                  {selectedReport.centerName} ({selectedReport.centerCode}) | Grand Total: {selectedReport.grandTotal}/100
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedReport(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              
              <div style={{
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                padding: '15px 20px',
                borderRadius: '10px',
                marginBottom: '20px',
                border: '2px solid #2196f3'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#1976d2', fontSize: '14px' }}>🏢 Center Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '13px' }}>
                  <div><strong>Center Code:</strong> <span style={{color: '#667eea', fontWeight: 'bold'}}>{selectedReport.centerCode}</span></div>
                  <div><strong>Center Name:</strong> {selectedReport.centerName}</div>
                  <div><strong>Project:</strong> {selectedReport.projectName || '-'}</div>
                  <div><strong>ZM Name:</strong> {selectedReport.zmName || '-'}</div>
                  <div><strong>Region Head:</strong> {selectedReport.regionHeadName || '-'}</div>
                  <div><strong>Area Manager:</strong> {selectedReport.areaManager || selectedReport.areaClusterManager || '-'}</div>
                  <div><strong>Cluster Manager:</strong> {selectedReport.clusterManager || '-'}</div>
                  <div><strong>Center Head:</strong> {selectedReport.centerHeadName || '-'}</div>
                  <div><strong>Center Type:</strong> <span style={{
                    padding: '2px 6px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: selectedReport.centerType === 'CDC' ? '#e3f2fd' : selectedReport.centerType === 'SDC' ? '#fff3e0' : '#f1f8e9',
                    color: selectedReport.centerType === 'CDC' ? '#1976d2' : selectedReport.centerType === 'SDC' ? '#e65100' : '#2e7d32'
                  }}>{selectedReport.centerType || 'CDC'}</span></div>
                  <div><strong>Location:</strong> {selectedReport.location || '-'}</div>
                  <div><strong>Financial Year:</strong> <span style={{color: '#667eea', fontWeight: 'bold'}}>{selectedReport.financialYear || 'FY26'}</span></div>
                  <div><strong>Audit Date:</strong> {selectedReport.auditDateString || selectedReport.auditDate || '-'}</div>
                  <div><strong>Audited By:</strong> {selectedReport.auditedBy || '-'}</div>
                  <div><strong>Audit Period:</strong> {selectedReport.auditPeriod || '-'}</div>
                  {selectedReport.placementApplicable === 'yes' && selectedReport.placementCoordinator && (
                    <div><strong>Placement Coordinator:</strong> {selectedReport.placementCoordinator}</div>
                  )}
                  {selectedReport.placementApplicable === 'yes' && selectedReport.seniorManagerPlacement && (
                    <div><strong>Sr. Manager Placement:</strong> {selectedReport.seniorManagerPlacement}</div>
                  )}
                  {selectedReport.placementApplicable === 'yes' && selectedReport.nationalHeadPlacement && (
                    <div><strong>National Head Placement:</strong> {selectedReport.nationalHeadPlacement}</div>
                  )}
                </div>
              </div>

              <div style={{
                background: '#fff9e6',
                padding: '15px 20px',
                borderRadius: '10px',
                marginBottom: '20px',
                border: '2px solid #ffc107'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#e65100', fontSize: '14px' }}>📊 Audit Scores</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <strong style={{display: 'block', color: '#666', fontSize: '11px'}}>Front Office:</strong>
                    <span style={{
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: getAreaScoreInfo(selectedReport.frontOfficeScore, selectedReport.placementApplicable === 'no' ? 35 : 30).color
                    }}>{parseFloat(selectedReport.frontOfficeScore || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <strong style={{display: 'block', color: '#666', fontSize: '11px'}}>Delivery:</strong>
                    <span style={{
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: getAreaScoreInfo(selectedReport.deliveryProcessScore, selectedReport.placementApplicable === 'no' ? 45 : 40).color
                    }}>{parseFloat(selectedReport.deliveryProcessScore || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <strong style={{display: 'block', color: '#666', fontSize: '11px'}}>Placement:</strong>
                    <span style={{
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: selectedReport.placementApplicable === 'no' ? '#999' : getAreaScoreInfo(selectedReport.placementScore, 15).color
                    }}>
                      {selectedReport.placementApplicable === 'no' ? 'N/A' : parseFloat(selectedReport.placementScore || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <strong style={{display: 'block', color: '#666', fontSize: '11px'}}>Management:</strong>
                    <span style={{
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: getAreaScoreInfo(selectedReport.managementScore, selectedReport.placementApplicable === 'no' ? 20 : 15).color
                    }}>{parseFloat(selectedReport.managementScore || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ 
                    gridColumn: 'span 2', 
                    background: (() => {
                      const color = getGrandTotalColor(selectedReport);
                      if (color === '#28a745') return 'linear-gradient(135deg, #28a745 0%, #4caf50 100%)';
                      if (color === '#ffc107') return 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)';
                      return 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
                    })(), 
                    padding: '10px', 
                    borderRadius: '8px', 
                    textAlign: 'center' 
                  }}>
                    <strong style={{display: 'block', color: 'white', fontSize: '12px'}}>GRAND TOTAL</strong>
                    <span style={{fontSize: '22px', fontWeight: 'bold', color: 'white'}}>{parseFloat(selectedReport.grandTotal || 0).toFixed(2)}/100</span>
                    <div style={{fontSize: '11px', color: 'white', marginTop: '4px'}}>
                      {getAuditStatus(selectedReport) === 'Compliant' ? '✅ Compliant' : getAuditStatus(selectedReport) === 'Amber' ? '⚠️ Amber' : '❌ Non-Compliant'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fff3e0', padding: '15px 20px', borderRadius: '10px', marginBottom: '20px', border: '2px solid #ff9800' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#e65100', fontSize: '14px' }}>🔓 Edit Request Details</h4>
                <div style={{ fontSize: '13px', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                  {selectedReport.centerHeadEditRequest && (
                    <div style={{ background: '#fff8f0', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ffcc80' }}>
                      <div style={{ fontWeight: '700', color: '#e65100', marginBottom: '6px' }}>🏠 Center Head Request</div>
                      <div><strong>By:</strong> {selectedReport.centerHeadEditRequestBy || '-'}</div>
                      <div><strong>Date:</strong> {selectedReport.centerHeadEditRequestDate || '-'}</div>
                    </div>
                  )}
                  {selectedReport.placementEditRequest && (
                    <div style={{ background: '#f1f8e9', padding: '10px 14px', borderRadius: '8px', border: '1px solid #a5d6a7' }}>
                      <div style={{ fontWeight: '700', color: '#2e7d32', marginBottom: '6px' }}>📋 Placement Request</div>
                      <div><strong>By:</strong> {selectedReport.placementEditRequestBy || '-'}</div>
                      <div><strong>Date:</strong> {selectedReport.placementEditRequestDate || '-'}</div>
                    </div>
                  )}
                </div>
              </div>

              {selectedReport.remarksText && (
                <div style={{
                  background: '#f0f9ff',
                  padding: '15px 20px',
                  borderRadius: '10px',
                  border: '2px solid #3b82f6'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#1e40af', fontSize: '14px' }}>💬 User Remarks</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {selectedReport.remarksText}
                  </p>
                </div>
              )}
            </div>

            <div style={{
              padding: '15px 25px',
              borderTop: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f9fafb'
            }}>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedReport(null);
                }}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                ← Close
              </button>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedReport.centerHeadEditRequest && (
                  <button
                    onClick={() => { handleApprove(selectedReport._id, selectedReport.centerCode); setShowModal(false); setSelectedReport(null); }}
                    style={{ background: 'linear-gradient(135deg, #ff9800, #e65100)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                    ✅ Approve Center Head
                  </button>
                )}
                {selectedReport.placementEditRequest && (
                  <button
                    onClick={() => { handleApprovePlacement(selectedReport._id, selectedReport.centerCode); setShowModal(false); setSelectedReport(null); }}
                    style={{ background: 'linear-gradient(135deg, #4caf50, #2e7d32)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                    ✅ Approve Placement
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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