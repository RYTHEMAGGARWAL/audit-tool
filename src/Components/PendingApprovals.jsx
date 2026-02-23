import React, { useState, useEffect } from 'react';
import * as ExcelJS from 'exceljs';
import axios from 'axios';
import { API_URL } from '../config';
import { getCheckpointsByArea } from './checkpointConfig';
import './Audit.css';

const PendingApprovals = ({ onApprovalUpdate }) => {
  const [pendingReports, setPendingReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState(null);

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

  // Load pending reports from MongoDB
  const loadPendingReports = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading pending reports from MongoDB...');
      
      const response = await fetch(`${API_URL}/api/audit-reports/pending`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const reports = await response.json();
      console.log('✅ Pending reports loaded:', reports.length);
      
      // Transform data to match expected format
      const formattedReports = reports.map(r => ({
        ...r,
        _id: r._id,
        frontOfficeScore: r.frontOfficeScore?.toString() || '0',
        deliveryProcessScore: r.deliveryProcessScore?.toString() || '0',
        placementScore: r.placementScore?.toString() || '0',
        managementScore: r.managementScore?.toString() || '0',
        grandTotal: r.grandTotal?.toString() || '0',
        auditDate: r.auditDateString || r.auditDate || '',
        placementApplicable: r.placementApplicable || 'yes',
        submissionStatus: r.submissionStatus || 'Not Submitted',
        currentStatus: r.currentStatus || 'Not Submitted',
        approvedBy: r.approvedBy || '',
        submittedDate: r.submittedDate || '',
        remarksText: r.remarksText || ''
      }));

      setPendingReports(formattedReports);
    } catch (err) {
      console.error('❌ Error loading pending reports:', err);
      setPendingReports([]);
    } finally {
      setLoading(false);
    }
  };

  // View remarks - MongoDB version
  const handleViewRemarks = (report) => {
    try {
      console.log('\n📋 ========== VIEW REMARKS CLICKED ==========');
      console.log('Report data:', {
        centerCode: report.centerCode,
        centerName: report.centerName,
        centerType: report.centerType,
        grandTotal: report.grandTotal,
        placementApplicable: report.placementApplicable
      });
      
      // For MongoDB, checkpoint data is directly in report object
      const checkpointIds = ['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5','MP6','MP7'];
      const data = {};
      checkpointIds.forEach(id => {
        if (report[id]) {
          data[id] = report[id];
        }
      });
      
      const remarksData = { 
        ...report,
        centerName: report.centerName, 
        centerCode: report.centerCode,
        centerType: report.centerType || 'CDC',
        projectName: report.projectName || '',
        zmName: report.zmName || '',
        regionHeadName: report.regionHeadName || '',
        areaClusterManager: report.areaClusterManager || '',
        centerHeadName: report.centerHeadName || '',
        location: report.location || '',
        zonalHeadName: report.zonalHeadName || '',
        auditedBy: report.auditedBy || '',
        auditPeriod: report.auditPeriod || '',
        financialYear: report.financialYear || 'FY26',
        auditDate: report.auditDateString || report.auditDate || '',
        grandTotal: report.grandTotal || '0',
        data: data,
        customRemarks: report.remarksText || '',
        overallRemarks: report.remarksText || '',
        placementApplicable: report.placementApplicable || 'yes',
        centerRemarksBy: report.centerRemarksBy || '',
        centerRemarksDate: report.centerRemarksDate || ''
      };
      
      console.log('✅ Setting selectedRemarks');
      console.log('========================================\n');
      
      setSelectedRemarks(remarksData);
      setShowRemarksModal(true);
    } catch (e) {
      console.error('❌ Error in handleViewRemarks:', e);
      alert('❌ Unable to load remarks!');
    }
  };

  // Approve Report - MongoDB version
  const handleApproveReport = async (centerCode) => {
    if (window.confirm('✅ Approve this report?')) {
      try {
        setLoading(true);
        
        const report = pendingReports.find(r => r.centerCode === centerCode);
        if (!report || !report._id) {
          throw new Error('Report not found');
        }

        const response = await fetch(`${API_URL}/api/audit-reports/${report._id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminName: loggedUser.firstname + ' ' + (loggedUser.lastname || ''),
            remarks: ''
          })
        });

        if (response.ok) {
          alert('✅ Report approved successfully!');
          setShowRemarksModal(false);
          setSelectedRemarks(null);
          await loadPendingReports();
          if (onApprovalUpdate) onApprovalUpdate();
        } else {
          throw new Error('Approve failed');
        }
      } catch (err) {
        console.error('❌ Error:', err);
        alert('❌ Failed to approve report!');
      } finally {
        setLoading(false);
      }
    }
  };

  // Reject Report with detailed reason - MongoDB version
  const handleRejectReport = async (centerCode, centerName) => {
    const rejectionReason = prompt(`❌ Enter detailed rejection reason for ${centerName}:\n\nBe specific about what needs to be improved:`);
    
    if (rejectionReason && rejectionReason.trim()) {
      if (window.confirm(`Reject this report with reason:\n"${rejectionReason}"\n\nContinue?`)) {
        try {
          setLoading(true);

          const report = pendingReports.find(r => r.centerCode === centerCode);
          if (!report || !report._id) {
            throw new Error('Report not found');
          }

          const response = await fetch(`${API_URL}/api/audit-reports/${report._id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminName: loggedUser.firstname + ' ' + (loggedUser.lastname || ''),
              remarks: rejectionReason
            })
          });

          if (response.ok) {
            alert('❌ Report rejected! User will be notified.');
            setShowRemarksModal(false);
            setSelectedRemarks(null);
            await loadPendingReports();
            if (onApprovalUpdate) onApprovalUpdate();
          } else {
            throw new Error('Reject failed');
          }
        } catch (err) {
          console.error('❌ Error:', err);
          alert('❌ Failed to reject report!');
        } finally {
          setLoading(false);
        }
      }
    } else if (rejectionReason !== null) {
      alert('⚠️ Please provide a rejection reason!');
    }
  };

  useEffect(() => {
    loadPendingReports();
  }, []);

  return (
    <div className="management-section">
      <h2>⏳ Pending Approvals</h2>

      <div className="status-bar">
        <span>
          📊 Pending Reports: {pendingReports.length}
        </span>
        <button onClick={loadPendingReports} style={{ padding: '8px 16px' }}>
          🔄 Refresh
        </button>
      </div>

      <div className="view-user">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#667eea' }}>
            Loading pending reports...
          </p>
        ) : pendingReports.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            background: 'linear-gradient(135deg, #e3f2fd 0%, #c8e6c9 100%)',
            borderRadius: '12px',
            marginTop: '20px'
          }}>
            <h3 style={{ color: '#4CAF50', fontSize: '24px', marginBottom: '10px' }}>
              🎉 All Caught Up!
            </h3>
            <p style={{ color: '#666', fontSize: '16px' }}>
              No pending approvals at the moment. Great job!
            </p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ marginTop: '20px' }}>
            <table>
              <thead>
                <tr>
                  <th>CENTER<br/>NAME</th>
                  <th>CENTER<br/>CODE</th>
                  <th>PROJECT<br/>NAME</th>
                  <th>CENTER<br/>TYPE</th>
                  <th>AUDIT<br/>DATE</th>
                  <th>FRONT<br/>OFFICE</th>
                  <th>DELIVERY</th>
                  <th>PLACEMENT</th>
                  <th>MANAGEMENT</th>
                  <th>GRAND<br/>TOTAL<br/>(100)</th>
                  <th>AUDIT<br/>STATUS</th>
                  <th style={{ minWidth: '200px' }}>USER<br/>REMARKS</th>
                  <th>SUBMITTED<br/>DATE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pendingReports.map((report, index) => {
                  // Calculate dynamic max scores and area info
                  const foMax = report.placementApplicable === 'no' ? 35 : 30;
                  const dpMax = report.placementApplicable === 'no' ? 45 : 40;
                  const ppMax = 15;
                  const mpMax = report.placementApplicable === 'no' ? 20 : 15;

                  const frontOfficeInfo = getAreaScoreInfo(report.frontOfficeScore, foMax);
                  const deliveryInfo = getAreaScoreInfo(report.deliveryProcessScore, dpMax);
                  const placementInfo = getAreaScoreInfo(report.placementScore, ppMax);
                  const managementInfo = getAreaScoreInfo(report.managementScore, mpMax);

                  return (
                    <tr key={index} style={{ 
                      animation: 'fadeInUp 0.5s ease',
                      animationDelay: `${index * 0.1}s`,
                      animationFillMode: 'both'
                    }}>
                      <td style={{ fontWeight: '600' }}>{report.centerName}</td>
                      <td style={{ fontWeight: 'bold', color: '#667eea', background: '#e3f2fd', textAlign: 'center' }}>{report.centerCode}</td>
                      <td>{report.projectName || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: report.centerType === 'CDC' ? '#e3f2fd' : report.centerType === 'SDC' ? '#fff3e0' : '#f1f8e9',
                          color: report.centerType === 'CDC' ? '#1976d2' : report.centerType === 'SDC' ? '#e65100' : '#2e7d32'
                        }}>
                          {report.centerType || 'CDC'}
                        </span>
                      </td>
                      <td>{report.auditDate}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', color: frontOfficeInfo.color }}>
                        {parseFloat(report.frontOfficeScore || 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', color: deliveryInfo.color }}>
                        {parseFloat(report.deliveryProcessScore || 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', color: report.placementApplicable === 'no' ? '#999' : placementInfo.color }}>
                        {report.placementApplicable === 'no' ? 'N/A' : parseFloat(report.placementScore || 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', color: managementInfo.color }}>
                        {parseFloat(report.managementScore || 0).toFixed(2)}
                      </td>
                      <td style={{ 
                        textAlign: 'center', 
                        fontWeight: 'bold', 
                        fontSize: '18px',
                        color: getGrandTotalColor(report)
                      }}>
                        {report.grandTotal}
                      </td>
                      <td style={{ 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: getGrandTotalColor(report),
                        fontSize: '13px'
                      }}>
                        {getAuditStatus(report)}
                      </td>
                      <td style={{ 
                        textAlign: 'left', 
                        fontSize: '12px',
                        padding: '10px',
                        maxWidth: '200px'
                      }}>
                        {report.remarksText ? (
                          <div style={{
                            background: '#fff9e6',
                            border: '1px solid #ffc107',
                            borderRadius: '8px',
                            padding: '10px',
                            maxHeight: '80px',
                            overflow: 'auto',
                            lineHeight: '1.4',
                            color: '#333',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            {report.remarksText}
                          </div>
                        ) : (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>
                            No remarks
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '13px' }}>
                        {report.submittedDate || '-'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px' }}>
                        <button
                          onClick={() => handleViewRemarks(report)}
                          style={{
                            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
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
                          📝 View Remarks
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRemarksModal && selectedRemarks && (
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
            maxWidth: '1400px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              padding: '20px 25px',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px' }}>📊 Complete Audit Report - Detailed View</h3>
                <p style={{ margin: '5px 0 0', fontSize: '14px', opacity: 0.9 }}>
                  {selectedRemarks.centerName} ({selectedRemarks.centerCode})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRemarksModal(false);
                  setSelectedRemarks(null);
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

            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto', overflowX: 'auto' }}>
              
              <div style={{
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '2px solid #2196f3'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#1976d2', fontSize: '16px', fontWeight: 'bold' }}>
                  🏢 Center Information
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '12px',
                  fontSize: '13px'
                }}>
                  <div><strong>Center Code:</strong> <span style={{color: '#667eea', fontWeight: 'bold'}}>{selectedRemarks.centerCode}</span></div>
                  <div><strong>Center Name:</strong> {selectedRemarks.centerName}</div>
                  <div><strong>Project Name:</strong> {selectedRemarks.projectName || '-'}</div>
                  <div><strong>ZM Name:</strong> {selectedRemarks.zmName || '-'}</div>
                  <div><strong>Region Head:</strong> {selectedRemarks.regionHeadName || '-'}</div>
                  <div><strong>Area/Cluster Mgr:</strong> {selectedRemarks.areaClusterManager || '-'}</div>
                  <div><strong>Center Head:</strong> {selectedRemarks.centerHeadName || '-'}</div>
                  <div><strong>Center Type:</strong> <span style={{
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: selectedRemarks.centerType === 'CDC' ? '#e3f2fd' : selectedRemarks.centerType === 'SDC' ? '#fff3e0' : '#f1f8e9',
                    color: selectedRemarks.centerType === 'CDC' ? '#1976d2' : selectedRemarks.centerType === 'SDC' ? '#e65100' : '#2e7d32'
                  }}>{selectedRemarks.centerType || 'CDC'}</span></div>
                  <div><strong>Location:</strong> {selectedRemarks.location || selectedRemarks.geolocation || '-'}</div>
                  <div><strong>Zonal Head:</strong> {selectedRemarks.zonalHeadName || '-'}</div>
                  <div><strong>Audited By:</strong> {selectedRemarks.auditedBy || '-'}</div>
                  <div><strong>Audit Period:</strong> {selectedRemarks.auditPeriod || '-'}</div>
                  <div><strong>Financial Year:</strong> <span style={{color: '#667eea', fontWeight: 'bold'}}>{selectedRemarks.financialYear || 'FY26'}</span></div>
                  <div><strong>Audit Date:</strong> {selectedRemarks.auditDate || '-'}</div>
                  <div><strong>Grand Total:</strong> <span style={{
                    fontSize: '15px',
                    fontWeight: 'bold',
                    color: getGrandTotalColor(selectedRemarks)
                  }}>{parseFloat(selectedRemarks.grandTotal || 0).toFixed(2)}/100</span></div>
                  <div><strong>Status:</strong> <span style={{
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: getGrandTotalColor(selectedRemarks) === '#28a745' ? '#e8f5e9' : getGrandTotalColor(selectedRemarks) === '#ffc107' ? '#fff3e0' : '#ffebee',
                    color: getGrandTotalColor(selectedRemarks) === '#28a745' ? '#2e7d32' : getGrandTotalColor(selectedRemarks) === '#ffc107' ? '#e65100' : '#c62828'
                  }}>{getAuditStatus(selectedRemarks)}</span></div>
                </div>
              </div>

              {selectedRemarks.overallRemarks && (
                <div style={{
                  background: '#fff9e6',
                  padding: '15px 20px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '2px solid #ffc107'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#e65100', fontSize: '16px' }}>
                    ⭐ Overall Remarks (From User):
                  </h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
                    {selectedRemarks.overallRemarks}
                  </p>
                </div>
              )}
              {selectedRemarks.centerRemarksBy && (
                <div style={{
                  background: '#e3f2fd',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  color: '#1565c0'
                }}>
                  <strong>📝 Remarks by:</strong> {selectedRemarks.centerRemarksBy} | 
                  <strong> Date:</strong> {selectedRemarks.centerRemarksDate || '-'}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>S.NO</th>
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', minWidth: '220px' }}>CHECKPOINT</th>
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>WEIGHTAGE<br/>(%)</th>
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>MAX<br/>SCORE</th>
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>TOTAL<br/>SAMPLES</th>
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>SAMPLES<br/>COMPLIANT</th>
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>COMPLIANT<br/>%</th>
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>SCORE</th>
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', minWidth: '180px' }}>REMARKS</th>
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', minWidth: '180px', background: '#4caf50' }}>CENTER HEAD<br/>REMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const areas = getCheckpointsByArea(
                      selectedRemarks.centerType || 'CDC',
                      selectedRemarks.placementApplicable || 'yes'
                    );
                    const areasArray = [
                      { key: 'frontOffice', number: 1 },
                      { key: 'deliveryProcess', number: 2 },
                      { key: 'placementProcess', number: 3 },
                      { key: 'managementProcess', number: 4 }
                    ];

                    return areasArray.map(({ key, number }) => {
                      const area = areas[key];
                      
                      let areaTotal = 0;
                      area.checkpoints.forEach(cp => {
                        const cpData = selectedRemarks.data?.[cp.id] || {};
                        areaTotal += parseFloat(cpData.score || 0);
                      });
                      
                      return (
                        <React.Fragment key={key}>
                          <tr style={{ background: area.isNA ? '#999' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <td colSpan="10" style={{ padding: '12px', fontWeight: 'bold', fontSize: '15px' }}>
                              Area {number}: {area.areaName} {area.isNA ? '(N/A - Not Applicable)' : `(Total Score: ${area.totalScore})`}
                            </td>
                          </tr>
                          {area.checkpoints.map((cp, idx) => {
                            const cpData = selectedRemarks.data?.[cp.id] || {};
                            return (
                              <tr key={cp.id} style={{ borderBottom: '1px solid #e0e0e0', background: idx % 2 === 0 ? 'white' : '#f8f9fa' }}>
                                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '13px' }}>{idx + 1}</td>
                                <td style={{ padding: '10px 8px', fontSize: '13px' }}>{cp.name}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '13px' }}>{cp.weightage}%</td>
                                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>{cp.maxScore}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '13px' }}>{cpData.totalSamples || '-'}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '13px' }}>{cpData.samplesCompliant || '-'}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#1976d2' }}>{cpData.compliantPercent || 0}%</td>
                                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: '#11998e' }}>{cpData.score || 0}</td>
                                <td style={{ padding: '10px 8px', fontSize: '12px' }}>{cpData.remarks || '-'}</td>
                                <td style={{ padding: '10px 8px', fontSize: '12px', background: '#e8f5e9', color: cpData.centerHeadRemarks ? '#2e7d32' : '#999', fontStyle: cpData.centerHeadRemarks ? 'normal' : 'italic' }}>
                                  {cpData.centerHeadRemarks || 'No remarks from Center Head'}
                                </td>
                              </tr>
                            );
                          })}
                          {!area.isNA && (
                            <tr style={{ background: '#f0f4ff', borderTop: '3px solid #667eea', borderBottom: '3px solid #667eea' }}>
                              <td colSpan="7" style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: '#1e40af' }}>
                                {area.areaName} Total:
                              </td>
                              <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px', color: '#dc2626', background: '#fef3c7' }}>
                                {areaTotal.toFixed(2)} / {area.totalScore}
                              </td>
                              <td colSpan="2" style={{ padding: '12px 8px', background: '#f0f4ff' }}></td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            <div style={{
              padding: '15px 25px',
              borderTop: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                onClick={() => {
                  setShowRemarksModal(false);
                  setSelectedRemarks(null);
                }}
                style={{
                  background: '#999',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                ← Back
              </button>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  onClick={() => handleRejectReport(selectedRemarks.centerCode, selectedRemarks.centerName)}
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 35px',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(244, 67, 54, 0.3)',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  ✕ Reject Report
                </button>
                <button
                  onClick={() => handleApproveReport(selectedRemarks.centerCode)}
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 35px',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  ✓ Approve Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;