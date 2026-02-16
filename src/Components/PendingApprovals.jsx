import React, { useState, useEffect } from 'react';
import * as ExcelJS from 'exceljs';
import axios from 'axios';
import { API_URL } from '../config';
import './Audit.css';

const PendingApprovals = ({ onApprovalUpdate }) => {
  const [pendingReports, setPendingReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState(null);

  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');

  // Dynamic checkpoint data based on placementApplicable
  const getCheckpointsByArea = (placementApplicable) => {
    const isNA = placementApplicable === 'no';
    
    return {
      frontOffice: {
        areaName: 'Front Office',
        totalScore: isNA ? 35 : 30,
        checkpoints: [
          { id: 'FO1', name: 'Enquires Entered in Pulse(Y/N)', weightage: 30, maxScore: isNA ? 10.5 : 9 },
          { id: 'FO2', name: 'Enrolment form available in Pulse(Y/N)', weightage: 20, maxScore: isNA ? 7 : 6 },
          { id: 'FO3', name: 'Pre assessment Available(Y/N)', weightage: 0, maxScore: 0 },
          { id: 'FO4', name: 'Documents uploaded in Pulse(Y/N)', weightage: 40, maxScore: isNA ? 14 : 12 },
          { id: 'FO5', name: 'Availability of Marketing Material(Y/N)', weightage: 10, maxScore: isNA ? 3.5 : 3 }
        ]
      },
      deliveryProcess: {
        areaName: 'Delivery Process',
        totalScore: isNA ? 45 : 40,
        checkpoints: [
          { id: 'DP1', name: 'Batch file maintained for all running batches', weightage: 15, maxScore: isNA ? 6.75 : 6 },
          { id: 'DP2', name: 'Batch Heath Card available for all batches where batch duration is >= 30 days', weightage: 10, maxScore: isNA ? 4.5 : 4 },
          { id: 'DP3', name: 'Attendance marked in EDL sheets correctly', weightage: 15, maxScore: isNA ? 6.75 : 6 },
          { id: 'DP4', name: 'BMS maintained with observations >= 30 days', weightage: 5, maxScore: isNA ? 2.25 : 2 },
          { id: 'DP5', name: 'FACT Certificate available at Center (Y/N)', weightage: 10, maxScore: isNA ? 4.5 : 4 },
          { id: 'DP6', name: 'Post Assessment if applicable', weightage: 0, maxScore: 0 },
          { id: 'DP7', name: 'Appraisal sheet is maintained (Y/N)', weightage: 10, maxScore: isNA ? 4.5 : 4 },
          { id: 'DP8', name: 'Appraisal status updated in Pulse(Y/N)', weightage: 5, maxScore: isNA ? 2.25 : 2 },
          { id: 'DP9', name: 'Certification Status of eligible students', weightage: 10, maxScore: isNA ? 4.5 : 4 },
          { id: 'DP10', name: 'Student signature obtained while issuing certificates', weightage: 10, maxScore: isNA ? 4.5 : 4 },
          { id: 'DP11', name: 'Verification between System issue date Vs actual certificate issue date', weightage: 10, maxScore: isNA ? 4.5 : 4 }
        ]
      },
      placementProcess: {
        areaName: 'Placement Process',
        totalScore: isNA ? 0 : 15,
        isNA: isNA,
        checkpoints: isNA ? [] : [
          { id: 'PP1', name: 'Student Placement Response', weightage: 15, maxScore: 2.25 },
          { id: 'PP2', name: 'CGT/ Guest Lecture/ Industry Visit Session and Intern Preparation', weightage: 10, maxScore: 1.50 },
          { id: 'PP3', name: 'Placement Bank & Aging', weightage: 15, maxScore: 2.25 },
          { id: 'PP4', name: 'Placement Proof Upload', weightage: 60, maxScore: 9.00 }
        ]
      },
      managementProcess: {
        areaName: 'Management Process',
        totalScore: isNA ? 20 : 15,
        checkpoints: [
          { id: 'MP1', name: 'Courseware issue to students done on time/Usage of LMS', weightage: 5, maxScore: isNA ? 1 : 0.75 },
          { id: 'MP2', name: 'TIRM details register', weightage: 20, maxScore: isNA ? 4 : 3.00 },
          { id: 'MP3', name: 'Monthly Centre Review Meeting is conducted', weightage: 35, maxScore: isNA ? 7 : 5.25 },
          { id: 'MP4', name: 'Physcial asset verification', weightage: 30, maxScore: isNA ? 6 : 4.50 },
          { id: 'MP5', name: 'Verification of bill authenticity', weightage: 10, maxScore: isNA ? 2 : 1.50 }
        ]
      }
    };
  };

  const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return '';
    if (typeof cell.value === 'object') {
      if (cell.value.text) return cell.value.text.toString().trim();
      if (cell.value.richText) return cell.value.richText.map(rt => rt.text).join('').trim();
      return '';
    }
    return cell.value.toString().trim();
  };

  // Audit Areas Data for remarks view
  const auditAreas = [
    {
      areaNumber: 1,
      areaName: "Front Office",
      checkpoints: [
        { id: "FO1", checkPoint: "Enquires Entered in Pulse(Y/N)" },
        { id: "FO2", checkPoint: "Enrolment form available in Pulse(Y/N)" },
        { id: "FO3", checkPoint: "Pre assessment Available(Y/N)" },
        { id: "FO4", checkPoint: "Documents uploaded in Pulse(Y/N)" },
        { id: "FO5", checkPoint: "Availability of Marketing Material(Y/N)" }
      ]
    },
    {
      areaNumber: 2,
      areaName: "Delivery Process",
      checkpoints: [
        { id: "DP1", checkPoint: "Batch file maintained for all running batches" },
        { id: "DP2", checkPoint: "Batch Heath Card available for all batches where batch duration is >= 30 days" },
        { id: "DP3", checkPoint: "Attendance marked in EDL sheets correctly" },
        { id: "DP4", checkPoint: "BMS maintained with observations >= 30 days" },
        { id: "DP5", checkPoint: "FACT Certificate available at Center (Y/N)" },
        { id: "DP6", checkPoint: "Appraisal sheet is maintained (Y/N)" },
        { id: "DP7", checkPoint: "Appraisal status updated in Pulse(Y/N)" },
        { id: "DP8", checkPoint: "Certification Status of eligible students" },
        { id: "DP9", checkPoint: "Student signature obtained while issuing certificates" },
        { id: "DP10", checkPoint: "Verification between System issue date Vs actual certificate issue date" }
      ]
    },
    {
      areaNumber: 3,
      areaName: "Placement Process",
      checkpoints: [
        { id: "PP1", checkPoint: "Placement forms available in Pulse" },
        { id: "PP2", checkPoint: "Placement proof uploaded in Pulse" }
      ]
    },
    {
      areaNumber: 4,
      areaName: "Management Process",
      checkpoints: [
        { id: "MP1", checkPoint: "Courseware issue to students done on time/Usage of LMS" },
        { id: "MP2", checkPoint: "TIRM details register" },
        { id: "MP3", checkPoint: "Monthly Centre Review Meeting is conducted" },
        { id: "MP4", checkPoint: "Physcial asset verification" },
        { id: "MP5", checkPoint: "Verification of bill authenticity" }
      ]
    }
  ];

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
      // For MongoDB, checkpoint data is directly in report object
      const checkpointIds = ['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5'];
      const data = {};
      checkpointIds.forEach(id => {
        if (report[id]) {
          data[id] = report[id];
        }
      });
      setSelectedRemarks({ 
        centerName: report.centerName, 
        centerCode: report.centerCode,
        data: data,
        customRemarks: report.remarksText || '',
        overallRemarks: report.remarksText || '',
        placementApplicable: report.placementApplicable || 'yes', // CRITICAL: Pass this!
        centerRemarksBy: report.centerRemarksBy || '',
        centerRemarksDate: report.centerRemarksDate || ''
      });
      setShowRemarksModal(true);
    } catch (e) {
      alert('❌ Unable to load remarks!');
    }
  };

  // Approve Report - MongoDB version
  const handleApproveReport = async (centerCode) => {
    if (window.confirm('✅ Approve this report?')) {
      try {
        setLoading(true);
        
        // Find report ID
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

          // Find report ID
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
                  <th>CH<br/>NAME</th>
                  <th>AUDIT<br/>DATE</th>
                  <th>FRONT<br/>OFFICE<br/>(30/35)</th>
                  <th>DELIVERY<br/>(40/45)</th>
                  <th>PLACEMENT<br/>(15/NA)</th>
                  <th>MANAGEMENT<br/>(15/20)</th>
                  <th>GRAND<br/>TOTAL<br/>(100)</th>
                  <th>AUDIT<br/>STATUS</th>
                  <th style={{ minWidth: '200px' }}>USER<br/>REMARKS</th>
                  <th>SUBMITTED<br/>DATE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pendingReports.map((report, index) => {
                  const getGrandTotalColor = (score) => {
                    if (score >= 80) return '#28a745';
                    if (score >= 65) return '#ffc107';
                    return '#dc3545';
                  };

                  const getAuditStatus = (score) => {
                    if (score >= 80) return 'Compliant';
                    if (score >= 65) return 'Amber';
                    return 'Non-Compliant';
                  };

                  return (
                    <tr key={index} style={{ 
                      animation: 'fadeInUp 0.5s ease',
                      animationDelay: `${index * 0.1}s`,
                      animationFillMode: 'both'
                    }}>
                      <td style={{ fontWeight: '600' }}>{report.centerName}</td>
                      <td>{report.chName || '-'}</td>
                      <td>{report.auditDate}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                        {report.frontOfficeScore}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                        {report.deliveryProcessScore}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', color: report.placementApplicable === 'no' ? '#999' : 'inherit' }}>
                        {report.placementApplicable === 'no' ? 'N/A' : report.placementScore}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                        {report.managementScore}
                      </td>
                      <td style={{ 
                        textAlign: 'center', 
                        fontWeight: 'bold', 
                        fontSize: '18px',
                        color: getGrandTotalColor(report.grandTotal)
                      }}>
                        {report.grandTotal}
                      </td>
                      <td style={{ 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: getGrandTotalColor(report.grandTotal),
                        fontSize: '13px'
                      }}>
                        {getAuditStatus(report.grandTotal)}
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
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleViewRemarks(report)}
                            style={{
                              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '13px',
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
                          <button
                            onClick={() => handleApproveReport(report.centerCode)}
                            disabled={loading}
                            style={{
                              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                              transition: 'all 0.3s ease',
                              opacity: loading ? 0.6 : 1
                            }}
                            onMouseOver={(e) => {
                              if (!loading) {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
                              }
                            }}
                            onMouseOut={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                            }}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleRejectReport(report.centerCode, report.centerName)}
                            disabled={loading}
                            style={{
                              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                              transition: 'all 0.3s ease',
                              opacity: loading ? 0.6 : 1
                            }}
                            onMouseOver={(e) => {
                              if (!loading) {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(220, 53, 69, 0.4)';
                              }
                            }}
                            onMouseOut={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                            }}
                          >
                            ❌ Reject
                          </button>
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

      {/* Remarks Modal */}
      {/* CENTER HEAD REMARKS MODAL - FULL DETAILED REPORT */}
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
            {/* Modal Header */}
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

            {/* Modal Body - FULL DETAILED AUDIT TABLE */}
            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto', overflowX: 'auto' }}>
              {/* Overall User Remarks */}
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
              {/* Info Bar */}
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

              {/* COMPLETE DETAILED AUDIT TABLE */}
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
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', minWidth: '180px' }}>REMARKS<br/>(आप अपनी भाषा में लिख सकते हैं)</th>
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', minWidth: '180px', background: '#4caf50' }}>CENTER HEAD<br/>REMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const areas = getCheckpointsByArea(selectedRemarks.placementApplicable || 'yes');
                    const areasArray = [
                      { key: 'frontOffice', number: 1 },
                      { key: 'deliveryProcess', number: 2 },
                      { key: 'placementProcess', number: 3 },
                      { key: 'managementProcess', number: 4 }
                    ];

                    return areasArray.map(({ key, number }) => {
                      const area = areas[key];
                      
                      // Skip placement if NA
                      if (area.isNA) {
                        return (
                          <React.Fragment key={key}>
                            <tr style={{ background: '#999', color: 'white' }}>
                              <td colSpan="10" style={{ padding: '12px', fontWeight: 'bold', fontSize: '15px' }}>
                                Area {number}: {area.areaName} (N/A - Not Applicable)
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      }

                      return (
                        <React.Fragment key={key}>
                          <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <td colSpan="10" style={{ padding: '12px', fontWeight: 'bold', fontSize: '15px' }}>
                              Area {number}: {area.areaName} (Total Score: {area.totalScore})
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
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '15px 25px',
              borderTop: '1px solid #eee',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowRemarksModal(false);
                  setSelectedRemarks(null);
                }}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                ✓ Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* HISTORY TAB - Year Wise Reports */}

    </div>
  );
};

export default PendingApprovals;