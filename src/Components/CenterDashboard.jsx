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
  const [centerData, setCenterData] = useState(null);

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

  // ========================================
  // ⏰ WORKING DAYS & DEADLINE HELPERS
  // ========================================
  const HOLIDAYS = {
    2025: ['2025-01-26','2025-03-14','2025-04-14','2025-04-18','2025-05-01',
           '2025-08-15','2025-08-16','2025-10-02','2025-10-20','2025-11-05','2025-12-25'],
    2026: ['2026-01-26','2026-03-03','2026-04-03','2026-04-14','2026-05-01',
           '2026-08-15','2026-09-04','2026-10-02','2026-10-19','2026-11-08',
           '2026-11-24','2026-12-25']
  };

  const isWorkingDay = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    if (day === 0 || day === 6) return false;
    const ds = d.toISOString().split('T')[0];
    return !(HOLIDAYS[d.getFullYear()] || []).includes(ds);
  };

  const getRemainingWorkingDays = (deadlineDate) => {
    if (!deadlineDate) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const deadline = new Date(deadlineDate); deadline.setHours(0,0,0,0);
    let count = 0; let d = new Date(today);
    if (today > deadline) {
      while (d > deadline) { d.setDate(d.getDate()-1); if (isWorkingDay(d)) count++; }
      return -count;
    }
    while (d < deadline) { d.setDate(d.getDate()+1); if (isWorkingDay(d)) count++; }
    return count;
  };

  // Center deadline badge (7 working days from email send)
  const getCenterDeadlineBadge = (report) => {
    if (!report.emailSent) return null;

    // Agar remarks submit ho gayi — kitne din mein kiya calculate karo
    if (report.centerHeadRemarksLocked && report.centerRemarksDate && report.emailSentDate) {
      // Parse emailSentDate
      let emailDate = null;
      try {
        // Format: "DD/MM/YYYY, HH:MM:SS" (en-IN)
        const parts = report.emailSentDate.split(',')[0].trim().split('/');
        if (parts.length === 3) emailDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } catch(e) {}

      // Parse centerRemarksDate
      let remarksDate = null;
      try {
        const parts = report.centerRemarksDate.split(',')[0].trim().split('/');
        if (parts.length === 3) remarksDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } catch(e) {}

      if (emailDate && remarksDate && !isNaN(emailDate) && !isNaN(remarksDate)) {
        let days = 0;
        let d = new Date(emailDate); d.setHours(0,0,0,0);
        const end = new Date(remarksDate); end.setHours(0,0,0,0);
        while (d < end) { d.setDate(d.getDate()+1); if (isWorkingDay(d)) days++; }
        const color = days <= 5 ? '#2e7d32' : days <= 7 ? '#e65100' : '#dc3545';
        const bg    = days <= 5 ? '#e8f5e9' : days <= 7 ? '#fff3e0' : '#ffebee';
        const border= days <= 5 ? '#4caf50' : days <= 7 ? '#ff9800' : '#dc3545';
        return { text: `✅ Done in ${days}d`, color, bg, border, sub: report.centerRemarksDate?.split(',')[0] || '' };
      }
      return { text: '✅ Remarks Submitted', color: '#2e7d32', bg: '#e8f5e9', border: '#4caf50', sub: report.centerRemarksDate?.split(',')[0] || '' };
    }

    // Remarks not yet submitted — show countdown
    if (!report.centerDeadline) return null;
    const rem = getRemainingWorkingDays(report.centerDeadline);
    if (rem === null) return null;
    if (rem < 0)   return { text: `⛔ ${Math.abs(rem)}d overdue`, color: '#dc3545', bg: '#ffebee', border: '#dc3545', sub: '' };
    if (rem === 0) return { text: '🚨 Due TODAY',                  color: '#dc3545', bg: '#ffebee', border: '#dc3545', sub: '' };
    if (rem <= 2)  return { text: `⚠️ ${rem}d left`,              color: '#e65100', bg: '#fff3e0', border: '#ff9800', sub: `by ${report.centerDeadlineString||''}` };
    return               { text: `✅ ${rem}d left`,               color: '#2e7d32', bg: '#e8f5e9', border: '#4caf50', sub: `by ${report.centerDeadlineString||''}` };
  };
  // ========================================

  // ========================================
  // Edit request 3 working days validity
  // ========================================
  const getEditRequestDeadline = (report) => {
    if (!report.centerHeadRemarksLocked || !report.centerRemarksDate) return null;
    let remarksDate = null;
    try {
      const parts = report.centerRemarksDate.split(',')[0].trim().split('/');
      if (parts.length === 3) remarksDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } catch(e) {}
    if (!remarksDate || isNaN(remarksDate)) return null;
    // Add 3 working days
    let d = new Date(remarksDate); d.setHours(0,0,0,0);
    let count = 0;
    while (count < 3) { d.setDate(d.getDate()+1); if (isWorkingDay(d)) count++; }
    return d;
  };

  const isEditRequestExpired = (report) => {
    const dl = getEditRequestDeadline(report);
    if (!dl) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    return today > dl;
  };

  const getEditRequestRemainingDays = (report) => {
    const dl = getEditRequestDeadline(report);
    return dl ? getRemainingWorkingDays(dl) : null;
  };
  // ========================================

  // Dynamic checkpoint data based on placement applicable AND centerType
  // MP6, MP7 are DTV-only — not shown for CDC/SDC
  const getCheckpointData = (placementApplicable, centerType) => {
    const isPlacementNA = placementApplicable === 'no';
    const isDTV = (centerType || '').toUpperCase() === 'DTV';

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
        { id: 'MP1', name: 'Courseware issue to students done on time/Usage of LMS', weightage: 5, maxScore: isPlacementNA ? 1.25 : 0.75 },
        { id: 'MP2', name: 'Log book for Genset & Vehicle (Y/N)', weightage: 20, maxScore: isPlacementNA ? 5 : 3.00 },
        { id: 'MP3', name: 'TIRM details register', weightage: 30, maxScore: isPlacementNA ? 7.5 : 4.50 },
        { id: 'MP4', name: 'Availability and requirement of Biometric as per MOU', weightage: 25, maxScore: isPlacementNA ? 6.25 : 3.75 },
        { id: 'MP5', name: 'Physical asset verification', weightage: 10, maxScore: isPlacementNA ? 2.5 : 1.50 },
        ...(isDTV ? [
          { id: 'MP6', name: 'Monthly Centre Review Meeting is conducted', weightage: 5, maxScore: isPlacementNA ? 1.25 : 0.75 },
          { id: 'MP7', name: 'Verification of bill authenticity', weightage: 5, maxScore: isPlacementNA ? 1.25 : 0.75 }
        ] : [])
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
    loadCenterData();
  }, []);


  const loadCenterData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/centers`);
      if (response.ok) {
        const centers = await response.json();
        const myCenter = centers.find(c => c.centerCode === loggedUser.centerCode);
        if (myCenter) {
          setCenterData(myCenter);
          console.log('✅ Center data loaded:', myCenter);
        }
      }
    } catch (err) {
      console.error('❌ Error loading center data:', err);
    }
  };
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
            requestPending: report.centerHeadEditRequest || false,
            editedOnce: report.remarksEditedOnce || false  // permanent lock after 2nd submit
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

  const handleViewReport = async (report) => {
    // ✅ Always fetch fresh data from server — stale local state causes wrong lock display
    let freshReport = report;
    try {
      const res = await fetch(`${API_URL}/api/audit-reports/${report._id}/fresh`);
      if (res.ok) {
        freshReport = await res.json();
        // Also update editRequestStatus with fresh data
        setEditRequestStatus(prev => ({
          ...prev,
          [freshReport._id]: {
            locked: freshReport.centerHeadRemarksLocked || false,
            requestPending: freshReport.centerHeadEditRequest || false,
            editedOnce: freshReport.remarksEditedOnce || false
          }
        }));
      }
    } catch (e) {
      console.warn('Fresh fetch failed, using cached report');
    }

    setSelectedReport(freshReport);
    
    // Load remarks from centerHeadCheckpointRemarks object
    let existingRemarks = freshReport.centerHeadCheckpointRemarks || {};
    
    // If object is empty, try loading from individual checkpoint fields (backward compatibility)
    if (Object.keys(existingRemarks).length === 0) {
      const checkpointIds = ['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5','MP6','MP7'];
      checkpointIds.forEach(cpId => {
        if (freshReport[cpId]?.centerHeadRemarks) {
          existingRemarks[cpId] = freshReport[cpId].centerHeadRemarks;
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
          alert('✅ Edit request sent to admin! You will be notified once approved.');
          loadMyReports();
        } else {
          const errData = await response.json().catch(() => ({}));
          if (response.status === 403 && errData.permanentlyLocked) {
            alert('🔒 Remarks are permanently locked. No further edits allowed.');
          } else if (response.status === 409 && errData.alreadyPending) {
            alert('⏳ Edit request already pending. Please wait for admin approval.');
          } else if (response.status === 400) {
            alert('ℹ️ ' + (errData.error || 'Remarks are not locked. You can edit directly.'));
          } else {
            alert('❌ ' + (errData.error || 'Failed to send edit request.'));
          }
          loadMyReports();
        }
      } catch (err) {
        alert('❌ Error: ' + err.message);
      }
    }
  };

  const handleSubmitObservations = async () => {
    if (!selectedReport) return;
    
    // Check if permanently locked (edited once already)
    if (editRequestStatus[selectedReport._id]?.editedOnce) {
      alert('🔒 Remarks are permanently locked. No further edits allowed.');
      return;
    }

    // Check if locked and no edit approval given
    if (editRequestStatus[selectedReport._id]?.locked && !editRequestStatus[selectedReport._id]?.requestPending) {
      alert('🔒 Remarks are locked. Please request edit permission from admin.');
      return;
    }

    // ✅ PLACEMENT CHECK: Sirf 1st submit pe — agar CH pehle submit kar chuka hai toh edit hai, block mat karo
    const isEditSubmit = !!selectedReport.centerRemarksDate;
    if (!isEditSubmit && selectedReport.placementApplicable === 'yes' && !selectedReport.placementRemarksSubmitted) {
      alert('⚠️ Placement Coordinator ne abhi remarks submit nahi kiye hain.\n\nPlacement remarks submit hone ke baad hi aap submit kar sakte hain.');
      return;
    }
    
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
        // Immediately update local state — prevent any re-render showing submit button
        setEditRequestStatus(prev => ({
          ...prev,
          [selectedReport._id]: {
            ...prev[selectedReport._id],
            locked: true,
            editedOnce: prev[selectedReport._id]?.locked ? true : prev[selectedReport._id]?.editedOnce,
            requestPending: false
          }
        }));
        alert('✅ Observations submitted successfully!\n\nYour remarks are now locked. Contact admin if you need to make changes.');
        setShowModal(false);
        loadMyReports();
      } else {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          if (errData.permanentlyLocked) {
            alert('🔒 Remarks are permanently locked. No further edits allowed.');
          } else if (errData.requestPending) {
            alert('⏳ Edit request is pending admin approval. Please wait.');
          } else if (errData.placementPending) {
            alert('⚠️ Placement Coordinator ne abhi remarks submit nahi kiye.\n\nPehle placement remarks submit hon.');
          } else {
            alert('🔒 ' + (errData.error || 'Remarks are locked.'));
          }
          setShowModal(false);
          loadMyReports();
        } else {
          alert('❌ Failed to submit observations');
        }
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
      {/* CSS Animations for deadline countdown */}
      <style>{`
        @keyframes pulse-urgent {
          0%   { transform: scale(1);    box-shadow: 0 0 0 0 rgba(220,53,69,0.5); }
          50%  { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(220,53,69,0); }
          100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(220,53,69,0); }
        }
        @keyframes pulse-ok {
          0%   { opacity: 1; }
          50%  { opacity: 0.75; }
          100% { opacity: 1; }
        }
      `}</style>
      <header className="admin-header">
        <h1>Center Dashboard - Welcome, {loggedUser.firstname}</h1>
        <button onClick={() => { localStorage.removeItem('loggedUser'); navigate('/'); }}>Logout</button>
      </header>

      <main className="admin-content">
        {/* Center Details Card */}
        {centerData ? (
          <div style={{
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '25px',
            border: '2px solid #2196f3',
            boxShadow: '0 4px 15px rgba(33, 150, 243, 0.2)'
          }}>
            <h2 style={{ margin: '0 0 15px 0', color: '#1976d2', fontSize: '20px', fontWeight: 'bold' }}>
              🏢 Center Information
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '12px',
              fontSize: '14px'
            }}>
              <div><strong>Center Code:</strong> <span style={{color: '#667eea', fontWeight: 'bold'}}>{centerData.centerCode}</span></div>
              <div><strong>Center Name:</strong> {centerData.centerName}</div>
              <div><strong>Project Name:</strong> {centerData.projectName || '-'}</div>
              <div><strong>ZM Name:</strong> {centerData.zmName || '-'}</div>
              <div><strong>Region Head:</strong> {centerData.regionHeadName || '-'}</div>
              <div><strong>Area Manager:</strong> {myReports[0]?.areaManager || centerData.areaManager || centerData.areaClusterManager || '-'}</div>
              <div><strong>Cluster Manager:</strong> {myReports[0]?.clusterManager || centerData.clusterManager || '-'}</div>
              <div><strong>Center Head:</strong> {centerData.centerHeadName || '-'}</div>
              {(myReports[0]?.placementCoordinator || centerData.placementCoordinator) && (
                <div><strong>Placement Coordinator:</strong> {myReports[0]?.placementCoordinator || centerData.placementCoordinator}</div>
              )}
              {(myReports[0]?.seniorManagerPlacement || centerData.seniorManagerPlacement) && (
                <div><strong>Sr. Manager Placement:</strong> {myReports[0]?.seniorManagerPlacement || centerData.seniorManagerPlacement}</div>
              )}
              {(myReports[0]?.nationalHeadPlacement || centerData.nationalHeadPlacement) && (
                <div><strong>National Head Placement:</strong> {myReports[0]?.nationalHeadPlacement || centerData.nationalHeadPlacement}</div>
              )}
              <div><strong>Center Type:</strong> <span style={{
                padding: '2px 8px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                background: centerData.centerType === 'CDC' ? '#e3f2fd' : centerData.centerType === 'SDC' ? '#fff3e0' : '#f1f8e9',
                color: centerData.centerType === 'CDC' ? '#1976d2' : centerData.centerType === 'SDC' ? '#e65100' : '#2e7d32'
              }}>{centerData.centerType || 'CDC'}</span></div>
              <div><strong>Location:</strong> {centerData.location || centerData.geolocation || '-'}</div>
              
              <div><strong>Audited By:</strong> {myReports[0]?.auditedBy || '-'}</div>
<div><strong>Audit Period:</strong> {myReports[0]?.auditPeriod || '-'}</div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>🏢 Your Center: <strong>{loggedUser.centerCode}</strong></h2>
            <p style={{ margin: '8px 0 0', fontSize: '14px', opacity: 0.9 }}>
              Loading center information...
            </p>
          </div>
        )}

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
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>AUDIT<br/>STATUS</th>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600', background: '#e8eaf6' }}>REPORT<br/>STATUS</th>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600', background: '#e8f5e9' }}>REMARKS DEADLINE<br/><span style={{fontSize:'10px',fontWeight:'normal'}}>(7 days)</span></th>
                    <th style={{ padding: '14px 10px', color: 'black', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {myReports.map((report, idx) => {
                    const isLocked = editRequestStatus[report._id]?.locked;
                    const isRequestPending = editRequestStatus[report._id]?.requestPending;
                    
                    const foMax = report.placementApplicable === 'no' ? 35 : 30;
                    const dpMax = report.placementApplicable === 'no' ? 45 : 40;
                    const ppMax = 15;
                    const mpMax = report.placementApplicable === 'no' ? 20 : 15;

                    const foData = getAreaScoreInfo(report.frontOfficeScore, foMax);
                    const dpData = getAreaScoreInfo(report.deliveryProcessScore, dpMax);
                    const ppData = report.placementApplicable === 'no' ? { status: 'NA', color: '#999' } : getAreaScoreInfo(report.placementScore, ppMax);
                    const mpData = getAreaScoreInfo(report.managementScore, mpMax);

                    const grandStatus = getAuditStatus(report);
                    const grandColor = getGrandTotalColor(report);

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
                          <div style={{ fontSize: '20px', fontWeight: '700', color: grandColor }}>{parseFloat(report.grandTotal || 0).toFixed(2)}</div>
                        </td>
                        {/* AUDIT STATUS - score based */}
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '6px 14px', 
                            borderRadius: '6px', 
                            fontSize: '12px', 
                            fontWeight: '600', 
                            background: grandColor === '#28a745' ? '#d4edda' : grandColor === '#ffc107' ? '#fff3cd' : '#f8d7da',
                            color: grandColor
                          }}>
                            {grandStatus}
                          </span>
                        </td>

                        {/* REPORT STATUS - workflow based */}
                        <td style={{ padding: '10px', textAlign: 'center', background: '#f8f9ff' }}>
                          {report.currentStatus === 'Closed' ? (
                            <span style={{
                              padding: '5px 12px', borderRadius: '6px', fontSize: '12px',
                              fontWeight: '600', background: '#f1f5f9', color: '#64748b',
                              border: '1px solid #cbd5e1', display: 'inline-block'
                            }}>🔒 Closed</span>
                          ) : report.currentStatus === 'Approved' ? (
                            <span style={{
                              padding: '5px 12px', borderRadius: '6px', fontSize: '12px',
                              fontWeight: '600', background: '#d4edda', color: '#28a745',
                              border: '1px solid #28a745', display: 'inline-block'
                            }}>✅ Approved</span>
                          ) : report.currentStatus === 'Pending with Supervisor' ? (
                            <span style={{
                              padding: '5px 12px', borderRadius: '6px', fontSize: '12px',
                              fontWeight: '600', background: '#fff3cd', color: '#e65100',
                              border: '1px solid #ffc107', display: 'inline-block'
                            }}>⏳ Pending</span>
                          ) : (
                            <span style={{
                              padding: '5px 12px', borderRadius: '6px', fontSize: '12px',
                              fontWeight: '600', background: '#f8f9fa', color: '#999',
                              border: '1px solid #ddd', display: 'inline-block'
                            }}>📝 {report.currentStatus || 'Not Submitted'}</span>
                          )}
                        </td>

                        {/* ⏰ REMARKS DEADLINE — 7 working days */}
                        <td style={{ padding: '8px', textAlign: 'center', background: '#f0fdf4', minWidth: '120px' }}>
                          {(() => {
                            const badge = getCenterDeadlineBadge(report);

                            // Email not sent yet
                            if (!badge && !report.emailSent) return (
                              <span style={{ color: '#94a3b8', fontSize: '10px' }}>Email not sent</span>
                            );

                            // Remarks submitted — show done badge
                            if (badge && (badge.text.includes('Done') || badge.text.includes('Submitted'))) {
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                                  <span style={{
                                    padding: '4px 8px', borderRadius: '10px', fontSize: '11px',
                                    fontWeight: 'bold', color: badge.color, background: badge.bg,
                                    border: `1px solid ${badge.border}`, whiteSpace: 'nowrap'
                                  }}>{badge.text}</span>
                                  {badge.sub && <span style={{ fontSize: '10px', color: '#888' }}>{badge.sub}</span>}
                                </div>
                              );
                            }

                            // Active countdown — animated div
                            if (badge) {
                              const isUrgent = badge.text.includes('⛔') || badge.text.includes('🚨') || badge.text.includes('⚠️');
                              const pulseColor = isUrgent ? '#dc3545' : '#16a34a';
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                  {/* Animated badge */}
                                  <div style={{
                                    padding: '5px 10px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: badge.color,
                                    background: badge.bg,
                                    border: `2px solid ${badge.border}`,
                                    whiteSpace: 'nowrap',
                                    animation: isUrgent ? 'pulse-urgent 1.2s ease-in-out infinite' : 'pulse-ok 2s ease-in-out infinite',
                                    boxShadow: isUrgent ? `0 0 8px ${badge.border}60` : 'none'
                                  }}>
                                    {badge.text}
                                  </div>
                                  {badge.sub && (
                                    <span style={{ fontSize: '10px', color: '#64748b' }}>{badge.sub}</span>
                                  )}
                                  {/* Progress bar */}
                                  {report.centerDeadline && (() => {
                                    const total = 7;
                                    const rem = getRemainingWorkingDays(report.centerDeadline);
                                    const used = Math.max(0, total - (rem || 0));
                                    const pct = Math.min(100, (used / total) * 100);
                                    const barColor = pct >= 85 ? '#dc3545' : pct >= 60 ? '#f59e0b' : '#16a34a';
                                    return (
                                      <div style={{ width: '90px', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                          width: `${pct}%`, height: '100%',
                                          background: barColor, borderRadius: '3px',
                                          transition: 'width 0.5s ease'
                                        }} />
                                      </div>
                                    );
                                  })()}
                                </div>
                              );
                            }

                            return <span style={{ color: '#94a3b8', fontSize: '10px' }}>—</span>;
                          })()}
                        </td>

                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                            <button onClick={() => handleViewReport(report)} style={{ padding: '8px 16px', background: report.currentStatus === 'Closed' ? '#6c757d' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                              {report.currentStatus === 'Closed' ? '📋 View Report' : 'View Report'}
                            </button>
                            {report.currentStatus !== 'Closed' && report.auditStatus !== 'Closed' && isLocked && !isRequestPending && !editRequestStatus[report._id]?.editedOnce && (() => {
                              const expired = isEditRequestExpired(report);
                              const remDays = getEditRequestRemainingDays(report);
                              if (expired) {
                                return (
                                  <span style={{ padding: '6px 10px', background: '#f1f5f9', color: '#94a3b8', borderRadius: '6px', fontSize: '11px', fontWeight: '600', border: '1px solid #e2e8f0' }}>
                                    🔒 Edit Closed
                                  </span>
                                );
                              }
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                                  <button onClick={() => handleRequestEdit(report._id)} style={{ padding: '8px 14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                                    ✏️ Request Edit
                                  </button>
                                  {remDays !== null && (
                                    <span style={{ fontSize: '10px', color: remDays <= 1 ? '#dc3545' : '#e65100', fontWeight: 'bold' }}>
                                      {remDays === 0 ? '🚨 Last day!' : `⏰ ${remDays}d left`}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                            {report.currentStatus === 'Closed' && (
                              <span style={{ fontSize: '10px', color: '#94a3b8' }}>🔒 Report Closed</span>
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
              
              {/* CENTER DETAILS CARD */}
              {centerData && (
                <div style={{
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  padding: '15px 20px',
                  margin: '15px',
                  borderRadius: '10px',
                  border: '2px solid #2196f3',
                  boxShadow: '0 2px 10px rgba(33, 150, 243, 0.15)'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1976d2', fontSize: '16px', fontWeight: 'bold' }}>
                    🏢 Center Information
                  </h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                    gap: '10px',
                    fontSize: '13px'
                  }}>
                    <div><strong>Center Code:</strong> <span style={{color: '#667eea', fontWeight: 'bold'}}>{centerData.centerCode}</span></div>
                    <div><strong>Center Name:</strong> {centerData.centerName}</div>
                    <div><strong>Project Name:</strong> {centerData.projectName || '-'}</div>
                    <div><strong>ZM Name:</strong> {centerData.zmName || '-'}</div>
                    <div><strong>Region Head:</strong> {centerData.regionHeadName || '-'}</div>
                    <div><strong>Area Manager:</strong> {selectedReport.areaManager || centerData.areaManager || centerData.areaClusterManager || '-'}</div>
                    <div><strong>Cluster Manager:</strong> {selectedReport.clusterManager || centerData.clusterManager || '-'}</div>
                    <div><strong>Center Head:</strong> {centerData.centerHeadName || '-'}</div>
                    {(selectedReport.placementCoordinator || centerData.placementCoordinator) && (
                      <div><strong>Placement Coordinator:</strong> {selectedReport.placementCoordinator || centerData.placementCoordinator}</div>
                    )}
                    {(selectedReport.seniorManagerPlacement || centerData.seniorManagerPlacement) && (
                      <div><strong>Sr. Manager Placement:</strong> {selectedReport.seniorManagerPlacement || centerData.seniorManagerPlacement}</div>
                    )}
                    {(selectedReport.nationalHeadPlacement || centerData.nationalHeadPlacement) && (
                      <div><strong>National Head Placement:</strong> {selectedReport.nationalHeadPlacement || centerData.nationalHeadPlacement}</div>
                    )}
                    <div><strong>Center Type:</strong> <span style={{
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background: centerData.centerType === 'CDC' ? '#e3f2fd' : centerData.centerType === 'SDC' ? '#fff3e0' : '#f1f8e9',
                      color: centerData.centerType === 'CDC' ? '#1976d2' : centerData.centerType === 'SDC' ? '#e65100' : '#2e7d32'
                    }}>{centerData.centerType || 'CDC'}</span></div>
                    <div><strong>Location:</strong> {centerData.location || centerData.geolocation || '-'}</div>
                  
                    <div><strong>Audited By:</strong> {selectedReport.auditedBy || centerData.auditedBy || '-'}</div>
<div><strong>Audit Period:</strong> {selectedReport.auditPeriod || centerData.auditPeriod || '-'}</div>
                  </div>
                </div>
              )}

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
                  {Object.entries(getCheckpointData(selectedReport.placementApplicable, selectedReport.centerType)).map(([areaName, checkpoints], areaIdx) => {
                    // Skip Placement Process area if it's empty (when placement is NA)
                    if (checkpoints.length === 0) return null;
                    
                    // Calculate area total
                    let areaTotal = 0;
                    let areaMaxTotal = 0;
                    checkpoints.forEach(cp => {
                      const cpData = selectedReport[cp.id] || {};
                      areaTotal += parseFloat(cpData.score || 0);
                      areaMaxTotal += cp.maxScore;
                    });
                    
                    return (
                    <React.Fragment key={areaIdx}>
                      <tr>
                        <td colSpan="10" style={{ padding: '14px 20px', background: areaName === 'Placement Process' && selectedReport.placementApplicable === 'no' ? '#999' : '#6366f1', color: 'white', fontWeight: '700', fontSize: '15px', border: '1px solid #4f46e5' }}>
                          Area {areaIdx + 1}: {areaName} {areaName === 'Placement Process' && selectedReport.placementApplicable === 'no' ? '(N/A)' : `(Total Score: ${areaMaxTotal})`}
                        </td>
                      </tr>

                      {checkpoints.map((cp, cpIdx) => {
                        const cpData = selectedReport[cp.id] || {};
                        const isLocked = editRequestStatus[selectedReport._id]?.locked || editRequestStatus[selectedReport._id]?.editedOnce;

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
                                placeholder={isLocked ? '' : 'Enter your remarks here...'}
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
                      
                      {/* Area Total Summary Row */}
                      <tr style={{ background: '#eff6ff', borderTop: '3px solid #3b82f6', borderBottom: '3px solid #3b82f6' }}>
                        <td colSpan="7" style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: '#1e40af', border: '1px solid #93c5fd' }}>
                          {areaName} Total:
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px', color: '#dc2626', background: '#fef3c7', border: '1px solid #fbbf24' }}>
                          {areaTotal.toFixed(2)} / {areaMaxTotal}
                        </td>
                        <td colSpan="2" style={{ padding: '12px 10px', background: '#eff6ff', border: '1px solid #93c5fd' }}></td>
                      </tr>
                    </React.Fragment>
                  );})}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '20px 25px', background: 'white', borderTop: '2px solid #e5e7eb' }}>
              {(() => {
                const st = editRequestStatus[selectedReport._id] || {};

                // ── CASE 0: Report CLOSED — no edit, no request ──
                if (selectedReport.currentStatus === 'Closed' || selectedReport.auditStatus === 'Closed') {
                  return (
                    <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '10px', textAlign: 'center', border: '2px solid #cbd5e1' }}>
                      <div style={{ fontSize: '22px', marginBottom: '6px' }}>🔒</div>
                      <div style={{ fontWeight: '700', color: '#64748b', fontSize: '15px' }}>Report Closed</div>
                      <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>No further edits or requests are allowed on a closed report</div>
                    </div>
                  );
                }

                // ── CASE 1: Permanently locked (2nd submit done) — har haal mein block ──
                if (st.editedOnce) {
                  return (
                    <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '10px', textAlign: 'center', border: '2px solid #cbd5e1' }}>
                      <div style={{ fontSize: '22px', marginBottom: '6px' }}>🔒</div>
                      <div style={{ fontWeight: '700', color: '#64748b', fontSize: '15px' }}>Remarks Permanently Locked</div>
                      <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>No further edits allowed</div>
                    </div>
                  );
                }

                // ── CASE 2: Locked + edit request pending admin approval ──
                if (st.locked && st.requestPending) {
                  return (
                    <div>
                      <div style={{ background: '#fef3c7', padding: '12px 16px', borderRadius: '10px', marginBottom: '10px', textAlign: 'center', border: '2px solid #fbbf24' }}>
                        <div style={{ fontWeight: '700', color: '#92400e' }}>🔒 Remarks Locked</div>
                      </div>
                      <div style={{ background: '#dbeafe', padding: '14px', borderRadius: '10px', textAlign: 'center', color: '#1e40af', fontWeight: '700' }}>
                        ⏳ Edit request pending — awaiting admin approval
                      </div>
                    </div>
                  );
                }

                // ── CASE 3: Locked, no pending request → show Request Edit button ──
                if (st.locked) {
                  return (
                    <div>
                      <div style={{ background: '#fef3c7', padding: '12px 16px', borderRadius: '10px', marginBottom: '10px', textAlign: 'center', border: '2px solid #fbbf24' }}>
                        <div style={{ fontWeight: '700', color: '#92400e' }}>🔒 Remarks Locked</div>
                        <div style={{ color: '#b45309', fontSize: '12px', marginTop: '3px' }}>You have used 0 of your 1 allowed edit</div>
                      </div>
                      <button
                        onClick={() => { setShowModal(false); handleRequestEdit(selectedReport._id); }}
                        style={{ width: '100%', padding: '16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}
                      >
                        ✏️ Request Edit Permission
                      </button>
                    </div>
                  );
                }

                // ── CASE 4: Unlocked (either 1st time OR admin approved edit) → Submit ──
                // ppBlocked sirf 1st submit pe — agar CH pehle submit kar chuka hai (centerRemarksDate set)
                // toh yeh 2nd submit (edit) hai — placement block mat karo
                const isEditSubmit = !!selectedReport.centerRemarksDate; // already submitted once
                const ppBlocked = !isEditSubmit && selectedReport.placementApplicable === 'yes' && !selectedReport.placementRemarksSubmitted;
                if (ppBlocked) {
                  return (
                    <div style={{ background: '#fff8e1', border: '2px solid #f59e0b', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', marginBottom: '6px' }}>⏳</div>
                      <div style={{ fontWeight: '700', color: '#92400e', fontSize: '14px', marginBottom: '4px' }}>
                        Placement Remarks Pending
                      </div>
                      <div style={{ color: '#b45309', fontSize: '12px' }}>
                        Placement Coordinator ke remarks aane ke baad submit hoga
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    onClick={handleSubmitObservations}
                    disabled={saving}
                    style={{ width: '100%', padding: '18px', background: saving ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '18px', fontWeight: '700' }}
                  >
                    {saving ? 'Submitting...' : 'Submit All Observations'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterDashboard;