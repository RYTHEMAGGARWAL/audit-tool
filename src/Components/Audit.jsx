import React, { useState, useEffect, useMemo } from 'react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { API_URL } from '../config';
import { getCheckpointsByArea } from './checkpointConfig';

import './Audit.css';

const AuditManagement = () => {
  const [activeOption, setActiveOption] = useState('');
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [auditType, setAuditType] = useState('Skills-CDC');
  const [showAuditTypeSelection, setShowAuditTypeSelection] = useState(false);
  const [showAuditTable, setShowAuditTable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [editableRemarks, setEditableRemarks] = useState({});
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [selectedReportForEmail, setSelectedReportForEmail] = useState(null);
  const [emailData, setEmailData] = useState({
    to: '',
    cc: '',
    subject: '',
    message: ''
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // NEW: Track if editing existing report & store center head remarks
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [centerHeadRemarksData, setCenterHeadRemarksData] = useState({});
  
  // NEW: Center Head Remarks Modal state for View Reports
  const [showCenterRemarksModal, setShowCenterRemarksModal] = useState(false);
  const [selectedReportForRemarks, setSelectedReportForRemarks] = useState(null);
  
  // NEW: Placement Applicable state
  const [placementApplicable, setPlacementApplicable] = useState(null);
  // Financial Year & Search states
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const generateFinancialYears = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12
    
    // Financial Year logic: April to March
    let fyStartYear, fyEndYear;
    
    if (currentMonth >= 4) {
      // Apr-Dec: Current year to next year
      // Example: Aug 2025 → FY26 (2025-2026)
      fyStartYear = currentYear;
      fyEndYear = currentYear + 1;
    } else {
      // Jan-Mar: Previous year to current year
      // Example: Jan 2026 → FY26 (2025-2026)
      fyStartYear = currentYear - 1;
      fyEndYear = currentYear;
    }
    
    const fyCode = `FY${String(fyEndYear).slice(-2)}`;
    const fyLabel = `${fyStartYear}-${fyEndYear}`;
    
    console.log(`📅 Current Date: ${today.toLocaleDateString()}`);
    console.log(`📅 Current Financial Year: ${fyCode} (${fyLabel})`);
    
    // Return only current financial year
    return [
      { 
        code: fyCode,
        label: fyLabel
      }
    ];
  };
  
  const financialYears = generateFinancialYears();

  // Get logged user info
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
  const isAdmin = loggedUser.Role === 'Admin';

  // ✅ DYNAMIC AUDIT AREAS - Based on centerType and placementApplicable
  const auditAreas = useMemo(() => {
    console.log('🔄 Recalculating auditAreas...');
    console.log('   centerType:', selectedCenter?.centerType);
    console.log('   placementApplicable:', placementApplicable);
    
    const config = getCheckpointsByArea(
      selectedCenter?.centerType || 'CDC',
      placementApplicable || 'yes'
    );
    
    console.log('✅ Config loaded:', {
      frontOffice: config.frontOffice.checkpoints.length,
      delivery: config.deliveryProcess.checkpoints.length,
      placement: config.placementProcess.checkpoints.length,
      management: config.managementProcess.checkpoints.length
    });
    
    return [
      {
        areaNumber: 1,
        areaName: config.frontOffice.areaName,
        totalScore: config.frontOffice.totalScore,
        checkpoints: config.frontOffice.checkpoints.map(cp => ({
          id: cp.id,
          checkPoint: cp.name,
          weightage: cp.weightage,
          maxScore: cp.maxScore
        }))
      },
      {
        areaNumber: 2,
        areaName: config.deliveryProcess.areaName,
        totalScore: config.deliveryProcess.totalScore,
        checkpoints: config.deliveryProcess.checkpoints.map(cp => ({
          id: cp.id,
          checkPoint: cp.name,
          weightage: cp.weightage,
          maxScore: cp.maxScore
        }))
      },
      {
        areaNumber: 3,
        areaName: config.placementProcess.areaName,
        totalScore: config.placementProcess.totalScore,
        isNA: config.placementProcess.isNA,
        checkpoints: config.placementProcess.checkpoints.map(cp => ({
          id: cp.id,
          checkPoint: cp.name,
          weightage: cp.weightage,
          maxScore: cp.maxScore
        }))
      },
      {
        areaNumber: 4,
        areaName: config.managementProcess.areaName,
        totalScore: config.managementProcess.totalScore,
        checkpoints: config.managementProcess.checkpoints.map(cp => ({
          id: cp.id,
          checkPoint: cp.name,
          weightage: cp.weightage,
          maxScore: cp.maxScore
        }))
      }
    ];
  }, [selectedCenter?.centerType, placementApplicable]);

  const [auditData, setAuditData] = useState({});

  const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return '';
    if (typeof cell.value === 'object') {
      if (cell.value.text) return cell.value.text.toString().trim();
      if (cell.value.richText) return cell.value.richText.map(rt => rt.text).join('').trim();
      return '';
    }
    return cell.value.toString().trim();
  };

  // Load centers from MongoDB
  const loadCenters = async () => {
    try {
      setLoading(true);
      console.log('📍 Loading centers from MongoDB...');
      const response = await fetch(`${API_URL}/api/centers`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const centersData = await response.json();
      console.log('✅ Centers loaded:', centersData.length);
      setCenters(centersData);
    } catch (err) {
      console.error('❌ Error loading centers:', err);
      setCenters([]);
    } finally {
      setLoading(false);
    }
  };

  // Load saved reports from MongoDB
  const loadSavedReports = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading audit reports from MongoDB...');
      const response = await fetch(`${API_URL}/api/audit-reports`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reports = await response.json();
      console.log('✅ Reports loaded:', reports.length);
      console.log('📊 Sample report placementApplicable:', reports[0]?.placementApplicable);
      
      // Transform MongoDB data to match expected format
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
      
      setSavedReports(formattedReports);
      
      // Initialize editable remarks
      const remarksObj = {};
      formattedReports.forEach(report => {
        remarksObj[report.centerCode] = report.remarksText || '';
      });
      setEditableRemarks(remarksObj);
      
      setForceUpdate(prev => prev + 1);
    } catch (err) {
      console.error('❌ Error loading reports:', err);
      setSavedReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize audit data
  const initializeAuditData = () => {
    const initialData = {};
    auditAreas.forEach(area => {
      area.checkpoints.forEach(cp => {
        initialData[cp.id] = {
          totalSamples: '',
          samplesCompliant: '',
          compliantPercent: 0,
          score: 0,
          remarks: ''
        };
      });
    });
    setAuditData(initialData);
  };

  const handleOptionClick = (option) => {
    setActiveOption(option);
    setSelectedCenter(null);
    setShowAuditTable(false);
    setEditableRemarks({});
    setPlacementApplicable(null);
    setSelectedFinancialYear('');
    setSearchQuery('');
    
    if (option === 'create') {
      loadCenters();
    } else if (option === 'view' || option === 'history') {
      loadSavedReports();
    }
  };

  const handleCenterSelect = async (center) => {
    console.log('\n🔍 ========== CENTER DATA DEBUG ==========');
    console.log('Center received:', center);
    console.log('centerCode:', center?.centerCode);
    console.log('centerName:', center?.centerName);
    console.log('========================================\n');
    
    // Check if report already exists
    let existingReport = null;
    
    console.log('\n🔍 ========== DUPLICATE CHECK ==========');
    console.log('Selected Center:', center.centerCode, '-', center.centerName);
    console.log('Selected FY:', selectedFinancialYear);
    
    try {
      const response = await fetch(`${API_URL}/api/audit-reports`);
      if (response.ok) {
        const reports = await response.json();
        
        console.log('\nTotal reports in DB:', reports.length);
        
        const centerReports = reports.filter(r => r.centerCode === center.centerCode);
        console.log(`\nReports for ${center.centerCode}:`);
        centerReports.forEach(r => {
          console.log(`  - FY: ${r.financialYear || 'UNDEFINED!'}, Status: ${r.currentStatus}`);
        });
        
        const found = reports.find(r => {
          const dbCode = (r.centerCode || '').trim();
          const selectedCode = (center.centerCode || '').trim();
          const dbFY = (r.financialYear || '').trim();
          const selectedFY = (selectedFinancialYear || '').trim();
          
          console.log(`🔍 Comparing: "${dbCode}" === "${selectedCode}" && "${dbFY}" === "${selectedFY}"`);
          
          return dbCode === selectedCode && dbFY === selectedFY;
        });
        console.log('\n🎯 Checking:', center.centerCode, '+', selectedFinancialYear);
        console.log('Found duplicate?', found ? '✅ YES' : '❌ NO');
        
        if (found) {
          console.log('Duplicate report details:');
          console.log('  FY:', found.financialYear);
          console.log('  Status:', found.currentStatus);
          console.log('  Date:', found.auditDateString);
          existingReport = found;
        }
        console.log('========================================\n');
      }
    } catch (err) {
      console.error('❌ Error checking existing audit:', err);
    }

    if (existingReport) {
      console.log('📢 Showing EDIT dialog...');
      const choice = window.confirm(
        `⚠️ A report already exists for ${center.centerName} (${selectedFinancialYear})!\n\n` +
        '✅ Click OK to EDIT the existing report\n' +
        '❌ Click CANCEL to go back and select different center or year\n\n' +
        'Note: To create a new report, select a different Financial Year.'
      );
      
      if (!choice) {
        setSelectedCenter(null);
        setSelectedFinancialYear('');
        setShowAuditTable(false);
        return;
      }
      
      try {
        const checkpointIds = ['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5'];
        const reconstructedData = {};
        const centerHeadRemarks = {};
        
        checkpointIds.forEach(id => {
          if (existingReport[id]) {
            reconstructedData[id] = existingReport[id];
            if (existingReport[id].centerHeadRemarks) {
              centerHeadRemarks[id] = existingReport[id].centerHeadRemarks;
            }
          }
        });
        
        reconstructedData._placementApplicable = existingReport.placementApplicable;
        setAuditData(reconstructedData);
        
        setCenterHeadRemarksData(centerHeadRemarks);
        setIsEditingExisting(true);
        
        if (existingReport.placementApplicable) {
          setPlacementApplicable(existingReport.placementApplicable);
        }
      } catch (e) {
        console.error('Error loading saved audit data:', e);
        initializeAuditData();
        setIsEditingExisting(false);
        setCenterHeadRemarksData({});
      }
    } else {
      initializeAuditData();
      setIsEditingExisting(false);
      setCenterHeadRemarksData({});
    }

    setShowAuditTable(true);
  };

  const calculateScore = (cpId, totalSamples, samplesCompliant) => {
    const total = parseFloat(totalSamples) || 0;
    const compliant = parseFloat(samplesCompliant) || 0;
    
    if (total === 0) return 0;
    
    const percent = (compliant / total) * 100;
    
    let checkpoint = null;
    for (const area of auditAreas) {
      checkpoint = area.checkpoints.find(cp => cp.id === cpId);
      if (checkpoint) break;
    }
    
    if (!checkpoint) return 0;
    
    // 🚨 BINARY CHECKPOINTS: Must be 100% compliant, else ZERO
    // Only DP1, DP3, DP7 (NOT DP2!)
    const binaryCheckpoints = ['DP1', 'DP3', 'DP7'];
    if (binaryCheckpoints.includes(cpId)) {
      // If not 100% compliant, return ZERO
      if (percent < 100) {
        return 0;
      }
      // If 100% compliant, calculate normally
    }
    
    // NORMAL SLAB-BASED SCORING
    let scoreMultiplier = 0;
    
    if (percent >= 90) {
      scoreMultiplier = 1.00;
    } else if (percent >= 70) {
      scoreMultiplier = 0.75;
    } else if (percent >= 60) {
      scoreMultiplier = 0.50;
    } else if (percent >= 50) {
      scoreMultiplier = 0.25;
    } else {
      scoreMultiplier = 0;
    }
    
    const score = checkpoint.maxScore * scoreMultiplier;
    return parseFloat(score.toFixed(2));
  };

  const handleInputChange = (cpId, field, value) => {
    const newData = { ...auditData[cpId] };
    newData[field] = value;

    if (field === 'totalSamples' || field === 'samplesCompliant') {
      const total = parseFloat(field === 'totalSamples' ? value : newData.totalSamples) || 0;
      const compliant = parseFloat(field === 'samplesCompliant' ? value : newData.samplesCompliant) || 0;
      
      if (total > 0) {
        newData.compliantPercent = parseFloat(((compliant / total) * 100).toFixed(2));
        
        // 🔗 LINKAGE: Force DP3 and DP7 score to ZERO if DP1 score is ZERO
        // DP2 is NOT linked!
        if ((cpId === 'DP3' || cpId === 'DP7')) {
          const dp1Score = auditData.DP1?.score || 0;
          if (dp1Score === 0) {
            console.log(`🚨 DP1 is ZERO! Forcing ${cpId} score to ZERO despite input...`);
            newData.score = 0; // Force ZERO
          } else {
            newData.score = calculateScore(cpId, total, compliant);
          }
        } else {
          newData.score = calculateScore(cpId, total, compliant);
        }
      } else {
        newData.compliantPercent = 0;
        newData.score = 0;
      }
      
      // 🔗 When DP1 changes, recalculate DP3 and DP7 (NOT DP2!)
      if (cpId === 'DP1') {
        const dp1Score = newData.score;
        
        setAuditData(prev => {
          const updated = { ...prev, [cpId]: newData };
          
          // Recalculate DP3 score
          if (prev.DP3) {
            const dp3Total = parseFloat(prev.DP3.totalSamples) || 0;
            const dp3Compliant = parseFloat(prev.DP3.samplesCompliant) || 0;
            if (dp3Total > 0) {
              updated.DP3 = {
                ...prev.DP3,
                score: dp1Score === 0 ? 0 : calculateScore('DP3', dp3Total, dp3Compliant)
              };
            }
          }
          
          // Recalculate DP7 score
          if (prev.DP7) {
            const dp7Total = parseFloat(prev.DP7.totalSamples) || 0;
            const dp7Compliant = parseFloat(prev.DP7.samplesCompliant) || 0;
            if (dp7Total > 0) {
              updated.DP7 = {
                ...prev.DP7,
                score: dp1Score === 0 ? 0 : calculateScore('DP7', dp7Total, dp7Compliant)
              };
            }
          }
          
          return updated;
        });
        return;
      }
    }

    setAuditData(prev => ({ ...prev, [cpId]: newData }));
  };

  const calculateAreaTotal = (area) => {
    return area.checkpoints.reduce((sum, cp) => {
      return sum + (parseFloat(auditData[cp.id]?.score) || 0);
    }, 0).toFixed(2);
  };

  const calculateGrandTotal = () => {
    let total = 0;
    auditAreas.forEach(area => {
      total += parseFloat(calculateAreaTotal(area));
    });
    return total.toFixed(2);
  };

  const handleSaveReport = async () => {
    if (!selectedCenter) {
      alert('⚠️ Please select a center first!');
      return;
    }

    const grandTotal = parseFloat(calculateGrandTotal());
    const frontOfficeTotal = parseFloat(calculateAreaTotal(auditAreas[0]));
    const deliveryTotal = parseFloat(calculateAreaTotal(auditAreas[1]));
    const placementTotal = parseFloat(calculateAreaTotal(auditAreas[2]));
    const managementTotal = parseFloat(calculateAreaTotal(auditAreas[3]));
    
    try {
      setLoading(true);
      
      console.log('💾 Saving report - placementApplicable state:', placementApplicable);

      const reportData = {
        centerCode: selectedCenter.centerCode,
        centerName: selectedCenter.centerName,
        auditType: auditType,
        financialYear: selectedFinancialYear,
        chName: selectedCenter.chName || '',
        geolocation: selectedCenter.geolocation || '',
        centerHeadName: selectedCenter.centerHeadName || '',
        zonalHeadName: selectedCenter.zonalHeadName || '',
        frontOfficeScore: frontOfficeTotal,
        deliveryProcessScore: deliveryTotal,
        placementScore: placementApplicable === 'no' ? 0 : placementTotal,
        managementScore: managementTotal,
        grandTotal: grandTotal,
        auditDate: new Date().toLocaleDateString('en-GB'),
        placementApplicable: placementApplicable === 'no' ? 'no' : 'yes',
        ...auditData,
        submissionStatus: 'Not Submitted',
        currentStatus: 'Not Submitted',
        approvedBy: '',
        submittedDate: '',
        remarksText: ''
      };
      
      console.log('💾 Report data placementApplicable:', reportData.placementApplicable);

      const response = await fetch(`${API_URL}/api/save-audit-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        alert('✅ Audit report saved successfully!');
        await loadSavedReports();
        setActiveOption('view');
        setShowAuditTable(false);
      } else {
        const err = await response.json();
        throw new Error(err.error || 'Save failed');
      }
      
    } catch (err) {
      console.error('❌ Error:', err);
      alert('❌ Failed to save audit report!');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRemarks = async (centerCode, showAlert = false) => {
    try {
      setLoading(true);
      
      const report = savedReports.find(r => r.centerCode === centerCode);
      if (!report || !report._id) {
        console.error('❌ Report not found for centerCode:', centerCode);
        return;
      }
      
      const remarksText = editableRemarks[centerCode] || '';
      
      console.log(`💾 Saving remarks for ${centerCode}: "${remarksText}"`);
      
      const response = await fetch(`${API_URL}/api/audit-reports/${report._id}/remarks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: remarksText })
      });
      
      if (response.ok) {
        console.log('✅ Remarks saved successfully to backend!');
        if (showAlert) {
          alert('✅ Remarks saved successfully!');
        }
        await loadSavedReports();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Save failed');
      }
    } catch (err) {
      console.error('❌ Error saving remarks:', err);
      if (showAlert) {
        alert('❌ Failed to save remarks!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (centerCode) => {
    if (window.confirm('📤 Submit this report for supervisor approval?')) {
      try {
        setLoading(true);

        const report = savedReports.find(r => r.centerCode === centerCode);
        if (report && report._id) {
          const response = await fetch(`${API_URL}/api/audit-reports/${report._id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: loggedUser.username })
          });

          if (response.ok) {
            alert('✅ Report submitted for approval!');
            await loadSavedReports();
          } else {
            throw new Error('Submit failed');
          }
        }
      } catch (err) {
        console.error('❌ Error:', err);
        alert('❌ Failed to submit report!');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewRemarks = (report) => {
    try {
      const checkpointIds = ['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5'];
      const data = {};
      checkpointIds.forEach(id => {
        if (report[id]) {
          data[id] = report[id];
        }
      });
      setSelectedRemarks({ centerName: report.centerName, data });
      setShowRemarksModal(true);
    } catch (e) {
      alert('❌ Unable to load remarks!');
    }
  };

  const handleDownloadExcel = async () => {
    alert('📥 Download feature coming soon!');
  };

  const handleOpenEmailForm = (report) => {
    setSelectedReportForEmail(report);
    setEmailData({
      to: '',
      cc: '',
      subject: `Audit Report - ${report.centerName} - Score: ${report.grandTotal}/100`,
      message: `Dear Sir/Madam,

Please find the audit report details below:

Center Name: ${report.centerName}
Center Code: ${report.centerCode}
Project Name: ${report.projectName || 'N/A'}
Center Type: ${report.centerType || 'N/A'}
Location: ${report.location || report.geolocation || 'N/A'}
Audit Date: ${report.auditDate}

Scores:
- Front Office: ${report.frontOfficeScore}/30
- Delivery Process: ${report.deliveryProcessScore}/40
- Placement: ${report.placementScore}/15
- Management: ${report.managementScore}/15

Grand Total: ${report.grandTotal}/100
Status: ${parseFloat(report.grandTotal) >= 80 ? 'Compliant' : parseFloat(report.grandTotal) >= 65 ? 'Amber' : 'Non-Compliant'}

Approved By: ${report.approvedBy || 'N/A'}

Regards,
${loggedUser.firstname || 'Audit Team'}`
    });
    setShowEmailForm(true);
  };

  const handleCloseEmailForm = () => {
    setShowEmailForm(false);
    setSelectedReportForEmail(null);
    setEmailData({ to: '', cc: '', subject: '', message: '' });
  };

  const handleSendEmail = async () => {
    if (!emailData.to) {
      alert('⚠️ Please enter recipient email address!');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      alert('⚠️ Please enter a valid email address!');
      return;
    }

    if (emailData.cc && !emailRegex.test(emailData.cc)) {
      alert('⚠️ Please enter a valid CC email address!');
      return;
    }

    try {
      setSendingEmail(true);
      
      let finalCC = emailData.cc || '';
      if (loggedUser.email) {
        finalCC = finalCC ? `${finalCC}, ${loggedUser.email}` : loggedUser.email;
      }
      
      const response = await axios.post(`${API_URL}/api/send-audit-email`, {
        to: emailData.to,
        cc: finalCC || undefined,
        subject: emailData.subject,
        message: emailData.message,
        reportData: selectedReportForEmail
      }, {
        timeout: 60000
      });

      if (response.data.success) {
        alert('✅ Email sent successfully with PDF attachment!');
        handleCloseEmailForm();
        loadSavedReports();
      } else {
        alert('❌ Failed to send email: ' + (response.data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('❌ Error sending email:', err);
      
      if (err.code === 'ECONNABORTED') {
        alert('❌ Request timed out! PDF generation might be slow. Please try again.');
      } else if (err.response) {
        alert('❌ Failed to send email: ' + (err.response.data?.error || err.response.statusText || 'Server error'));
      } else if (err.request) {
        alert('❌ No response from server! Check if backend is running.');
      } else {
        alert('❌ Error: ' + err.message);
      }
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    if (activeOption === 'view') {
      loadSavedReports();
    }
  }, [activeOption]);

  // ========================================
  // 🔥 NEW RED FLAG STATUS LOGIC
  // ========================================
  
  const getGrandTotalColor = (report) => {
    const status = getAuditStatus(report);
    if (status === 'Compliant') return '#28a745';
    if (status === 'Amber') return '#ffc107';
    return '#dc3545';
  };

  const getAuditStatus = (report) => {
    // Calculate max scores based on placementApplicable
    const foMax = report.placementApplicable === 'no' ? 35 : 30;
    const dpMax = report.placementApplicable === 'no' ? 45 : 40;
    const ppMax = 15;
    const mpMax = report.placementApplicable === 'no' ? 20 : 15;
    
    // Calculate percentage for each area
    const foPercent = (parseFloat(report.frontOfficeScore || 0) / foMax) * 100;
    const dpPercent = (parseFloat(report.deliveryProcessScore || 0) / dpMax) * 100;
    const ppPercent = report.placementApplicable === 'no' ? null : (parseFloat(report.placementScore || 0) / ppMax) * 100;
    const mpPercent = (parseFloat(report.managementScore || 0) / mpMax) * 100;
    
    // Categorize areas (skip placement if NA)
    const areas = [
      { name: 'FO', percent: foPercent },
      { name: 'DP', percent: dpPercent },
      ppPercent !== null ? { name: 'PP', percent: ppPercent } : null,
      { name: 'MP', percent: mpPercent }
    ].filter(Boolean);
    
    const red = areas.filter(a => a.percent < 65).length;
    const amber = areas.filter(a => a.percent >= 65 && a.percent < 80).length;
    const green = areas.filter(a => a.percent >= 80).length;
    
    // 🚨 RED FLAG RULES (UPDATED):
    if (red > 0) return 'Non-Compliant';           // RULE 1: Any red = fail
    if (amber >= 3) return 'Non-Compliant';        // RULE 2: 3+ amber = fail
    if (amber === 2) return 'Amber';               // RULE 3: Exactly 2 amber = amber
    if (green === areas.length) return 'Compliant'; // RULE 4: All green = pass
    if (amber === 1) return 'Compliant';           // RULE 5: 1 amber acceptable
    return 'Amber';                                 // Fallback
  };

  // Helper function to get area score status and color
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

  return (
    <div className="management-section">
      <h2>📋 Audit Management</h2>

      <div className="action-buttons" style={{
        display: 'flex',
        gap: '20px',
        justifyContent: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        <button 
          className={`btn ${activeOption === 'create' ? 'active' : ''}`}
          onClick={() => handleOptionClick('create')}
          style={{
            padding: '15px 35px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: activeOption === 'create' ? '3px solid #667eea' : '2px solid #ddd',
            background: activeOption === 'create' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
              : 'white',
            color: activeOption === 'create' ? 'white' : '#333',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: activeOption === 'create' 
              ? '0 8px 20px rgba(102, 126, 234, 0.4)' 
              : '0 4px 10px rgba(0,0,0,0.1)',
            transform: activeOption === 'create' ? 'translateY(-2px)' : 'none'
          }}
          onMouseOver={(e) => {
            if (activeOption !== 'create') {
              e.target.style.borderColor = '#667eea';
              e.target.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (activeOption !== 'create') {
              e.target.style.borderColor = '#ddd';
              e.target.style.transform = 'none';
            }
          }}
        >
          ➕ Create Report
        </button>
        <button 
          className={`btn ${activeOption === 'view' ? 'active' : ''}`}
          onClick={() => handleOptionClick('view')}
          style={{
            padding: '15px 35px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: activeOption === 'view' ? '3px solid #667eea' : '2px solid #ddd',
            background: activeOption === 'view' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
              : 'white',
            color: activeOption === 'view' ? 'white' : '#333',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: activeOption === 'view' 
              ? '0 8px 20px rgba(102, 126, 234, 0.4)' 
              : '0 4px 10px rgba(0,0,0,0.1)',
            transform: activeOption === 'view' ? 'translateY(-2px)' : 'none'
          }}
          onMouseOver={(e) => {
            if (activeOption !== 'view') {
              e.target.style.borderColor = '#667eea';
              e.target.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (activeOption !== 'view') {
              e.target.style.borderColor = '#ddd';
              e.target.style.transform = 'none';
            }
          }}
        >
          📊 View Reports
        </button>
        
        <button 
          className={`btn ${activeOption === 'history' ? 'active' : ''}`}
          onClick={() => handleOptionClick('history')}
          style={{
            padding: '15px 35px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: activeOption === 'history' ? '3px solid #ff6f00' : '2px solid #ddd',
            background: activeOption === 'history' 
              ? 'linear-gradient(135deg, #ff6f00 0%, #ff9800 100%)' 
              : 'white',
            color: activeOption === 'history' ? 'white' : '#333',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: activeOption === 'history' 
              ? '0 8px 20px rgba(255, 111, 0, 0.4)' 
              : '0 4px 10px rgba(0,0,0,0.1)',
            transform: activeOption === 'history' ? 'translateY(-2px)' : 'none'
          }}
        >
          📜 History
        </button>
      </div>

      {/* CREATE REPORT */}
      {activeOption === 'create' && (
        <div className="create-user">
          <h3>📝 Create New Audit Report</h3>

          <div className="select-user" style={{ marginBottom: '25px' }}>
            <label><strong>Select Center:</strong></label>
            <select
              value={selectedCenter?.centerCode || ''}
              onChange={(e) => {
                const center = centers.find(c => c.centerCode === e.target.value);
                console.log('🏢 Center Selected:', center);
                console.log('📋 Center Type:', center?.centerType);
                setSelectedCenter(center);
                setShowAuditTable(false);
                setEditableRemarks({});
                setPlacementApplicable(null);
                setSelectedFinancialYear('');
                if (center) {
                  const centerType = center.centerType || 'CDC';
                  console.log('✅ Detected Center Type:', centerType);
                  const autoAuditType = centerType === 'DTV' ? 'DTV' : `Skills-${centerType}`;
                  console.log('✅ Auto Audit Type:', autoAuditType);
                  setAuditType(autoAuditType);
                  initializeAuditData();
                }
              }}
            >
              <option value="">-- Select a Center --</option>
              {centers.map(center => (
                <option key={center.centerCode} value={center.centerCode}>
                  {center.centerCode} - {center.centerName}
                </option>
              ))}
            </select>
          </div>

          {selectedCenter && !showAuditTable && (
            <div style={{ 
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '25px',
              border: '2px solid #2196f3'
            }}>
              <h4 style={{ marginBottom: '15px', color: '#1976d2' }}>📍 Center Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                <div><strong>Center Code:</strong> {selectedCenter.centerCode}</div>
                <div><strong>Center Name:</strong> {selectedCenter.centerName}</div>
                <div><strong>Project Name:</strong> {selectedCenter.projectName || '-'}</div>
                <div><strong>ZM Name:</strong> {selectedCenter.zmName || '-'}</div>
                <div><strong>Region Head:</strong> {selectedCenter.regionHeadName || '-'}</div>
                <div><strong>Area/Cluster Manager:</strong> {selectedCenter.areaClusterManager || '-'}</div>
                <div><strong>Center Head:</strong> {selectedCenter.centerHeadName || '-'}</div>
                <div><strong>Center Type:</strong> <span style={{
                  padding: '2px 8px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  background: selectedCenter.centerType === 'CDC' ? '#e3f2fd' : selectedCenter.centerType === 'SDC' ? '#fff3e0' : '#f1f8e9',
                  color: selectedCenter.centerType === 'CDC' ? '#1976d2' : selectedCenter.centerType === 'SDC' ? '#e65100' : '#2e7d32'
                }}>{selectedCenter.centerType || 'CDC'}</span></div>
                <div><strong>Location:</strong> {selectedCenter.location || selectedCenter.geolocation || '-'}</div>
                <div><strong>Zonal Head:</strong> {selectedCenter.zonalHeadName || '-'}</div>
                <div><strong>Audited By:</strong> {selectedCenter.auditedBy || '-'}</div>
                <div><strong>Audit Period:</strong> {selectedCenter.auditPeriod || '-'}</div>
              </div>

              {selectedCenter && (() => {
                const centerType = selectedCenter.centerType || 'CDC';
                const autoAuditType = centerType === 'DTV' ? 'DTV' : `Skills-${centerType}`;
                if (auditType !== autoAuditType) {
                  setAuditType(autoAuditType);
                }
                return null;
              })()}

              {selectedCenter && !selectedFinancialYear && (
                <div style={{
                  background: selectedCenter.centerType === 'DTV' 
                    ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '15px 20px',
                  borderRadius: '10px',
                  marginTop: '20px',
                  marginBottom: '20px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                }}>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
                    {selectedCenter.centerType === 'DTV' ? '🚀' : '🎯'} Audit Type: <span style={{ 
                      background: 'rgba(255,255,255,0.3)',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      marginLeft: '10px'
                    }}>
                      {selectedCenter.centerType === 'DTV' ? 'DTV Audit' : `Skills Audit - ${selectedCenter.centerType || 'CDC'}`}
                    </span>
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: '13px', opacity: 0.9 }}>
                    {selectedCenter.centerType === 'DTV' 
                      ? 'Using DTV checklist (different from Skills)'
                      : `Using Skills checklist for ${selectedCenter.centerType || 'CDC'} centers`
                    }
                  </p>
                </div>
              )}

              {selectedCenter && (
                <div style={{ marginTop: '20px', marginBottom: '25px' }}>
                  <label style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    display: 'block', 
                    marginBottom: '10px',
                    color: '#1976d2'
                  }}>
                    📅 Select Financial Year: <span style={{color: 'red'}}>*</span>
                  </label>
                  <select
                    value={selectedFinancialYear}
                    onChange={(e) => setSelectedFinancialYear(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      fontSize: '16px',
                      borderRadius: '8px',
                      border: selectedFinancialYear ? '2px solid #4caf50' : '2px solid #667eea',
                      width: '100%',
                      maxWidth: '400px',
                      background: selectedFinancialYear ? '#e8f5e9' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <option value="">-- Select Financial Year --</option>
                    {financialYears.map(fy => (
                      <option key={fy.code} value={fy.code}>
                        {fy.code} ({fy.label})
                      </option>
                    ))}
                  </select>
                  {!selectedFinancialYear && (
                    <p style={{ 
                      marginTop: '8px', 
                      fontSize: '13px', 
                      color: '#d32f2f',
                      fontStyle: 'italic'
                    }}>
                      ⚠️ Please select a financial year before starting audit
                    </p>
                  )}
                </div>
              )}

              <div style={{ 
                marginTop: '20px', 
                padding: '20px', 
                background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                borderRadius: '10px',
                border: '2px solid #ff9800'
              }}>
                <h4 style={{ marginBottom: '15px', color: '#e65100', fontSize: '16px' }}>
                  📋 Placement Applicable?
                </h4>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setPlacementApplicable('yes')}
                    style={{
                      padding: '12px 30px',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: placementApplicable === 'yes' ? '3px solid #4caf50' : '2px solid #ddd',
                      background: placementApplicable === 'yes' 
                        ? 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)' 
                        : 'white',
                      color: placementApplicable === 'yes' ? 'white' : '#333',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: placementApplicable === 'yes' 
                        ? '0 6px 15px rgba(76, 175, 80, 0.4)' 
                        : '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    ✅ Yes
                  </button>
                  <button
                    onClick={() => setPlacementApplicable('no')}
                    style={{
                      padding: '12px 30px',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: placementApplicable === 'no' ? '3px solid #f44336' : '2px solid #ddd',
                      background: placementApplicable === 'no' 
                        ? 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)' 
                        : 'white',
                      color: placementApplicable === 'no' ? 'white' : '#333',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: placementApplicable === 'no' 
                        ? '0 6px 15px rgba(244, 67, 54, 0.4)' 
                        : '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    ❌ No
                  </button>
                </div>
                {placementApplicable && (
                  <p style={{ 
                    marginTop: '12px', 
                    fontSize: '14px', 
                    color: placementApplicable === 'yes' ? '#2e7d32' : '#c62828',
                    fontWeight: '500'
                  }}>
                    {placementApplicable === 'yes' 
                      ? '✓ Placement Process area will be included in audit.' 
                      : '✓ Placement Process area will NOT be included in audit.'}
                  </p>
                )}
              </div>

              {placementApplicable && (
                <button 
                  className="btn primary" 
                  onClick={() => {
                    console.log('\n🔵 ========== START AUDIT BUTTON CLICKED ==========');
                    console.log('🔵 Button clicked!');
                    console.log('🔵 selectedFinancialYear:', selectedFinancialYear);
                    console.log('🔵 selectedCenter:', selectedCenter);
                    console.log('🔵 ================================================\n');
                    
                    if (!selectedFinancialYear) {
                      console.error('❌ BLOCKED: FY is empty!');
                      alert('⚠️ Please select a Financial Year first!');
                      return;
                    }
                    
                    console.log('✅ FY check passed, calling handleCenterSelect...');
                    handleCenterSelect(selectedCenter);
                    console.log('✅ handleCenterSelect called!');
                  }}
                  style={{ marginTop: '20px' }}
                >
                  🚀 Start Audit
                </button>
              )}
            </div>
          )}

          {showAuditTable && (
            <div className="editable-table">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>S.No</th>
                      <th style={{ width: '300px' }}>Checkpoint</th>
                      <th style={{ width: '100px' }}>Weightage (%)</th>
                      <th style={{ width: '100px' }}>Max Score</th>
                      <th style={{ width: '120px' }}>Total Samples</th>
                      <th style={{ width: '140px' }}>Samples Compliant</th>
                      <th style={{ width: '120px' }}>Compliant %</th>
                      <th style={{ width: '100px' }}>Score</th>
                      <th style={{ width: '250px' }}>Remarks (आप अपनी भाषा में लिख सकते हैं)</th>
                      {isEditingExisting && (
                        <th style={{ width: '250px', background: '#e8f5e9' }}>Center Head Remarks</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {auditAreas.map((area, areaIdx) => (
                      <React.Fragment key={areaIdx}>
                        <tr style={{ 
                          background: area.isNA 
                            ? 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)' 
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                          color: 'white' 
                        }}>
                          <td colSpan={isEditingExisting ? 10 : 9} style={{ fontWeight: 'bold', fontSize: '16px', padding: '15px' }}>
                            Area {area.areaNumber}: {area.areaName} 
                            {area.isNA 
                              ? ' (N/A - Not Applicable)' 
                              : ` (Total Score: ${area.totalScore})`
                            }
                          </td>
                        </tr>
                        
                        {area.checkpoints.map((cp, cpIdx) => (
                          <tr key={cp.id} style={{ 
                            background: area.isNA ? '#f5f5f5' : 'inherit',
                            opacity: area.isNA ? 0.7 : 1
                          }}>
                            <td style={{ textAlign: 'center' }}>{cpIdx + 1}</td>
                            <td>{cp.checkPoint}</td>
                            <td style={{ textAlign: 'center', color: area.isNA ? '#999' : 'inherit' }}>
                              {area.isNA ? 'NA' : `${cp.weightage}%`}
                            </td>
                            <td style={{ textAlign: 'center', color: area.isNA ? '#999' : 'inherit' }}>
                              {area.isNA ? 'NA' : cp.maxScore}
                            </td>
                            <td>
                              {area.isNA ? (
                                <span style={{ 
                                  display: 'block', 
                                  textAlign: 'center', 
                                  color: '#999',
                                  fontWeight: 'bold',
                                  padding: '8px'
                                }}>NA</span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  value={auditData[cp.id]?.totalSamples || ''}
                                  onChange={(e) => handleInputChange(cp.id, 'totalSamples', e.target.value)}
                                  style={{ width: '100%', padding: '8px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                              )}
                            </td>
                            <td>
                              {area.isNA ? (
                                <span style={{ 
                                  display: 'block', 
                                  textAlign: 'center', 
                                  color: '#999',
                                  fontWeight: 'bold',
                                  padding: '8px'
                                }}>NA</span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  value={auditData[cp.id]?.samplesCompliant || ''}
                                  onChange={(e) => handleInputChange(cp.id, 'samplesCompliant', e.target.value)}
                                  style={{ width: '100%', padding: '8px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                              )}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: area.isNA ? '#999' : 'inherit' }}>
                              {area.isNA ? 'NA' : `${auditData[cp.id]?.compliantPercent || 0}%`}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: area.isNA ? '#999' : '#11998e' }}>
                              {area.isNA ? 'NA' : (auditData[cp.id]?.score || 0)}
                            </td>
                            <td>
                              {area.isNA ? (
                                <span style={{ 
                                  display: 'block', 
                                  textAlign: 'center', 
                                  color: '#999',
                                  fontStyle: 'italic',
                                  padding: '8px'
                                }}>Not Applicable</span>
                              ) : (
                                <textarea
                                  rows="2"
                                  value={auditData[cp.id]?.remarks || ''}
                                  onChange={(e) => handleInputChange(cp.id, 'remarks', e.target.value)}
                                  style={{
                                    width: '100%',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    resize: 'vertical',
                                    fontFamily: 'Arial, sans-serif',
                                    fontSize: '13px',
                                    minHeight: '50px'
                                  }}
                                  placeholder="Enter Remarks"
                                />
                              )}
                            </td>
                            {isEditingExisting && (
                              <td style={{ 
                                background: '#f1f8e9',
                                padding: '8px'
                              }}>
                                {area.isNA ? (
                                  <span style={{ 
                                    display: 'block', 
                                    textAlign: 'center', 
                                    color: '#999',
                                    fontStyle: 'italic'
                                  }}>N/A</span>
                                ) : (
                                  <div style={{
                                    padding: '8px',
                                    background: centerHeadRemarksData[cp.id] ? '#e8f5e9' : '#fafafa',
                                    borderRadius: '4px',
                                    border: '1px solid #c8e6c9',
                                    minHeight: '50px',
                                    fontSize: '13px',
                                    color: centerHeadRemarksData[cp.id] ? '#2e7d32' : '#999',
                                    fontStyle: centerHeadRemarksData[cp.id] ? 'normal' : 'italic'
                                  }}>
                                    {centerHeadRemarksData[cp.id] || 'No remarks from Center Head'}
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                        
                        <tr style={{ background: area.isNA ? '#e0e0e0' : '#e8f5e9', fontWeight: 'bold' }}>
                          <td colSpan="7" style={{ textAlign: 'right', paddingRight: '20px' }}>
                            {area.areaName} - Total Score:
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '16px', color: area.isNA ? '#999' : '#11998e' }}>
                            {area.isNA ? 'NA' : calculateAreaTotal(area)}
                          </td>
                          <td></td>
                          {isEditingExisting && <td></td>}
                        </tr>
                      </React.Fragment>
                    ))}
                    
                    <tr style={{ background: '#667eea', color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
                      <td colSpan="7" style={{ textAlign: 'right', paddingRight: '20px' }}>
                        GRAND TOTAL (out of 100):
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '18px' }}>
                        {calculateGrandTotal()}
                      </td>
                      <td></td>
                      {isEditingExisting && <td></td>}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button className="btn save" onClick={handleSaveReport} disabled={loading}>
                  💾 Save Audit Report
                </button>
                <button 
                  className="btn cancel"
                  onClick={() => setShowAuditTable(false)}
                >
                  ← Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW REPORTS - COMPLETE TABLE WITH RED FLAG STATUS */}
      {activeOption === 'view' && (
        <div className="view-user">
          <div className="table-header">
            <h3>📊 All Audit Reports ({savedReports.length})</h3>
          </div>

          <div style={{ 
            marginBottom: '20px',
            padding: '20px',
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            borderRadius: '12px',
            border: '2px solid #2196f3'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <label style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: '#1976d2',
                minWidth: '80px'
              }}>
                🔍 Search:
              </label>
              <input
                type="text"
                placeholder="Search by Center, Code, Year, CH Name, Status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '2px solid #2196f3',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)'
                  }}
                >
                  ✕ Clear
                </button>
              )}
            </div>
            {searchQuery && (
              <p style={{ 
                marginTop: '10px', 
                fontSize: '14px', 
                color: '#1565c0',
                fontWeight: '500'
              }}>
                🔎 Found {savedReports.filter(r => {
                  const q = searchQuery.toLowerCase();
                  return (
                    r.centerName?.toLowerCase().includes(q) ||
                    r.centerCode?.toLowerCase().includes(q) ||
                    r.chName?.toLowerCase().includes(q) ||
                    r.financialYear?.toLowerCase().includes(q) ||
                    r.currentStatus?.toLowerCase().includes(q)
                  );
                }).length} results for "{searchQuery}"
              </p>
            )}
          </div>

          <div className="table-header" style={{marginTop: 0}}>
            <div style={{visibility: 'hidden'}}>placeholder</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={loadSavedReports} 
                className="btn"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  opacity: loading ? 0.6 : 1
                }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {savedReports.length === 0 ? (
            <p style={{ color: '#999', padding: '40px', textAlign: 'center' }}>
              No audit reports yet. Create your first report!
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f5f5f5', minWidth: '150px' }}>CENTER<br/>NAME</th>
                    <th style={{ position: 'sticky', left: '150px', zIndex: 3, background: '#f5f5f5', minWidth: '120px' }}>CENTER<br/>CODE</th>
                    <th>PROJECT<br/>NAME</th>
                    <th>CENTER<br/>TYPE</th>
                    <th>CENTER<br/>HEAD NAME</th>
                    <th>FINANCIAL<br/>YEAR</th>
                    <th>AUDIT<br/>DATE</th>
                    <th>FRONT<br/>OFFICE</th>
                    <th>DELIVERY</th>
                    <th>PLACEMENT</th>
                    <th>MANAGEMENT</th>
                    <th>GRAND<br/>TOTAL</th>
                    <th>AUDIT<br/>STATUS</th>
                    <th style={{ minWidth: '180px' }}>REMARKS<br/>(EDITABLE)</th>
                    <th>ACTIONS</th>
                    <th>CURRENT<br/>STATUS</th>
                    <th>APPROVED<br/>BY</th>
                    <th style={{ minWidth: '120px' }}>SEND<br/>REPORT</th>
                    <th style={{ minWidth: '120px', background: '#e8f5e9' }}>CENTER HEAD<br/>REMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {savedReports
                    .filter(report => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        report.centerName?.toLowerCase().includes(q) ||
                        report.centerCode?.toLowerCase().includes(q) ||
                        report.chName?.toLowerCase().includes(q) ||
                        report.financialYear?.toLowerCase().includes(q) ||
                        report.currentStatus?.toLowerCase().includes(q) ||
                        report.auditDateString?.toLowerCase().includes(q)
                      );
                    })
                    .map((report, index) => {
                    const canSubmit = report.currentStatus === 'Not Submitted' || 
                                      report.currentStatus.startsWith('Rejected');
                    const isRejected = report.currentStatus.startsWith('Rejected');
                    const isApprovedOrPending = report.currentStatus === 'Pending with Supervisor' || 
                                                report.currentStatus === 'Approved';

                    // Get info for each area (dynamic max scores)
                    const foMax = report.placementApplicable === 'no' ? 35 : 30;
                    const dpMax = report.placementApplicable === 'no' ? 45 : 40;
                    const ppMax = 15;
                    const mpMax = report.placementApplicable === 'no' ? 20 : 15;

                    const frontOfficeInfo = getAreaScoreInfo(report.frontOfficeScore, foMax);
                    const deliveryInfo = getAreaScoreInfo(report.deliveryProcessScore, dpMax);
                    const placementInfo = getAreaScoreInfo(report.placementScore, ppMax);
                    const managementInfo = getAreaScoreInfo(report.managementScore, mpMax);

                    return (
                      <tr key={index}>
                        <td style={{ position: 'sticky', left: 0, zIndex: 2, background: 'white', minWidth: '150px' }}>{report.centerName}</td>
                        <td style={{ 
                          position: 'sticky',
                          left: '150px',
                          zIndex: 2,
                          textAlign: 'center',
                          fontWeight: 'bold', 
                          fontSize: '14px',
                          color: '#2196f3',
                          background: '#e3f2fd',
                          minWidth: '120px'
                        }}>
                          {report.centerCode}
                        </td>
                        <td>{report.projectName || '-'}</td>
                        <td>
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
                        <td>{report.centerHeadName || '-'}</td>
                        <td style={{ textAlign: "center", fontWeight: "bold", fontSize: "14px", color: "#667eea" }}>{report.financialYear || "FY26"}</td>
                        <td>{report.auditDate}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: frontOfficeInfo.color }}>
                          {report.frontOfficeScore === 'NA' ? 'NA' : (
                            <>
                              {frontOfficeInfo.status}<br/>
                              <span style={{ fontSize: '14px' }}>({parseFloat(report.frontOfficeScore || 0).toFixed(2)})</span>
                            </>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: deliveryInfo.color }}>
                          {report.deliveryProcessScore === 'NA' ? 'NA' : (
                            <>
                              {deliveryInfo.status}<br/>
                              <span style={{ fontSize: '14px' }}>({parseFloat(report.deliveryProcessScore || 0).toFixed(2)})</span>
                            </>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: report.placementApplicable === 'no' ? '#999' : placementInfo.color }}>
                          {report.placementApplicable === 'no' ? (
                            <span style={{ color: '#999', fontWeight: 'bold', fontSize: '15px' }}>NA</span>
                          ) : (
                            <>
                              {placementInfo.status}<br/>
                              <span style={{ fontSize: '14px' }}>({parseFloat(report.placementScore || 0).toFixed(2)})</span>
                            </>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: managementInfo.color }}>
                          {report.managementScore === 'NA' ? 'NA' : (
                            <>
                              {managementInfo.status}<br/>
                              <span style={{ fontSize: '14px' }}>({parseFloat(report.managementScore || 0).toFixed(2)})</span>
                            </>
                          )}
                        </td>
                        <td style={{ 
                          textAlign: 'center', 
                          fontWeight: 'bold', 
                          fontSize: '17px',
                          color: getGrandTotalColor(report)
                        }}>
                          {parseFloat(report.grandTotal || 0).toFixed(2)}
                        </td>
                        <td style={{ 
                          textAlign: 'center', 
                          fontWeight: 'bold',
                          color: getGrandTotalColor(report),
                          fontSize: '13px'
                        }}>
                          {getAuditStatus(report)}
                        </td>
                        <td>
                          <textarea
                            value={editableRemarks[report.centerCode] || ''}
                            onChange={(e) => {
                              setEditableRemarks(prev => ({
                                ...prev,
                                [report.centerCode]: e.target.value
                              }));
                            }}
                            onBlur={() => {
                              if (editableRemarks[report.centerCode] !== report.remarksText) {
                                handleSaveRemarks(report.centerCode);
                              }
                            }}
                            disabled={!canSubmit}
                            style={{
                              width: '100%',
                              minHeight: '60px',
                              maxHeight: '120px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              padding: '6px',
                              resize: 'vertical',
                              fontFamily: 'Arial, sans-serif',
                              fontSize: '11px',
                              backgroundColor: canSubmit ? '#fff' : '#f5f5f5',
                              color: '#333',
                              lineHeight: '1.4',
                              cursor: canSubmit ? 'text' : 'not-allowed'
                            }}
                            placeholder={canSubmit ? "Enter Remarks..." : "Submitted - Not Editable"}
                          />
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {canSubmit && (
                              <button
                                onClick={() => handleSubmitReport(report.centerCode)}
                                disabled={loading}
                                style={{
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '8px',
                                  cursor: loading ? 'not-allowed' : 'pointer',
                                  fontSize: '13px',
                                  fontWeight: 'bold',
                                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                                  transition: 'all 0.3s ease',
                                  opacity: loading ? 0.6 : 1
                                }}
                              >
                                📤 Submit
                              </button>
                            )}
                            {isApprovedOrPending && (
                              <button
                                disabled
                                style={{
                                  background: '#e0e0e0',
                                  color: '#666',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '8px',
                                  cursor: 'not-allowed',
                                  fontSize: '13px',
                                  fontWeight: 'bold'
                                }}
                              >
                                ✅ Submitted
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {report.currentStatus === 'Approved' && (
                            <span style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '12px' }}>
                              ✅ Approved
                            </span>
                          )}
                          {report.currentStatus === 'Pending with Supervisor' && (
                            <span style={{ color: '#FFC107', fontWeight: 'bold', fontSize: '12px' }}>
                              ⏳ Pending
                            </span>
                          )}
                          {isRejected && (
                            <span 
                              style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                              title={report.currentStatus}
                            >
                              ❌ Rejected
                            </span>
                          )}
                          {report.currentStatus === 'Not Submitted' && (
                            <span style={{ color: '#999', fontSize: '12px' }}>
                              Not Submitted
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '13px' }}>
                          {isRejected ? (
                            <span style={{ 
                              color: '#dc3545', 
                              fontStyle: 'italic',
                              fontSize: '12px',
                              display: 'block',
                              padding: '5px'
                            }}>
                              "{report.currentStatus.replace('Rejected: ', '')}"
                            </span>
                          ) : (
                            report.approvedBy || '-'
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          {report.currentStatus === 'Approved' ? (
                            report.emailSent ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                <span style={{
                                  background: '#e8f5e9',
                                  color: '#2e7d32',
                                  padding: '6px 12px',
                                  borderRadius: '15px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  ✅ Sent
                                </span>
                                <button
                                  onClick={() => handleOpenEmailForm(report)}
                                  style={{
                                    background: 'transparent',
                                    color: '#667eea',
                                    border: '1px solid #667eea',
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  🔄 Resend
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenEmailForm(report)}
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
                                  transition: 'all 0.3s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                                onMouseOver={(e) => {
                                  e.target.style.transform = 'translateY(-2px)';
                                  e.target.style.boxShadow = '0 6px 20px rgba(17, 153, 142, 0.4)';
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.transform = 'none';
                                  e.target.style.boxShadow = '0 4px 12px rgba(17, 153, 142, 0.3)';
                                }}
                              >
                                📧 Send
                              </button>
                            )
                          ) : (
                            <span style={{ 
                              color: '#999', 
                              fontSize: '11px',
                              fontStyle: 'italic'
                            }}>
                              {report.currentStatus === 'Pending with Supervisor' ? '⏳ Pending' : 
                               report.currentStatus === 'Not Submitted' ? '—' : '❌'}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px', background: '#f1f8e9' }}>
                          {(report.emailSent === true && report.currentStatus === 'Approved') ? (
                            <button
                              onClick={() => {
                                setSelectedReportForRemarks(report);
                                setShowCenterRemarksModal(true);
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 8px rgba(17, 153, 142, 0.3)'
                              }}
                            >
                              📊 View Full Report
                            </button>
                          ) : (
                            <span style={{ color: '#999', fontSize: '11px', fontStyle: 'italic' }}>
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Email Form Modal */}
      {showEmailForm && selectedReportForEmail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'fadeInUp 0.3s ease'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '20px 25px',
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                📧 Send Audit Report
              </h3>
              <button
                onClick={handleCloseEmailForm}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              >
                ×
              </button>
            </div>

            <div style={{
              background: '#f8f9fa',
              padding: '15px 25px',
              borderBottom: '1px solid #e0e0e0'
            }}>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                <strong>Report:</strong> {selectedReportForEmail.centerName} | 
                <strong> Score:</strong> {selectedReportForEmail.grandTotal}/100 | 
                <strong> Date:</strong> {selectedReportForEmail.auditDate}
              </p>
            </div>

            <div style={{ padding: '25px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#333',
                  fontSize: '14px'
                }}>
                  To: <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="recipient@example.com"
                  autoComplete="off"
                  name="email-to-field"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#333',
                  fontSize: '14px'
                }}>
                  Cc: <span style={{ color: '#999', fontWeight: 'normal' }}>(optional)</span>
                </label>
                <input
                  type="email"
                  value={emailData.cc}
                  onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                  placeholder="cc@example.com"
                  autoComplete="off"
                  name="email-cc-field"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#333',
                  fontSize: '14px'
                }}>
                  Subject:
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#333',
                  fontSize: '14px'
                }}>
                  Message:
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                  rows={10}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    lineHeight: '1.6'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={handleCloseEmailForm}
                  style={{
                    padding: '12px 24px',
                    background: '#e0e0e0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#d0d0d0'}
                  onMouseOut={(e) => e.target.style.background = '#e0e0e0'}
                >
                  ❌ Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  style={{
                    padding: '12px 24px',
                    background: sendingEmail 
                      ? '#ccc' 
                      : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: sendingEmail ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: sendingEmail ? 'none' : '0 4px 15px rgba(17, 153, 142, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {sendingEmail ? '⏳ Sending...' : '📤 Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CENTER HEAD REMARKS MODAL - FULL DETAILED REPORT */}
      {showCenterRemarksModal && selectedReportForRemarks && (
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
                  {selectedReportForRemarks.centerName} ({selectedReportForRemarks.centerCode})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCenterRemarksModal(false);
                  setSelectedReportForRemarks(null);
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
                  <div><strong>Center Code:</strong> <span style={{color: '#667eea', fontWeight: 'bold'}}>{selectedReportForRemarks.centerCode}</span></div>
                  <div><strong>Center Name:</strong> {selectedReportForRemarks.centerName}</div>
                  <div><strong>Project Name:</strong> {selectedReportForRemarks.projectName || '-'}</div>
                  <div><strong>ZM Name:</strong> {selectedReportForRemarks.zmName || '-'}</div>
                  <div><strong>Region Head:</strong> {selectedReportForRemarks.regionHeadName || '-'}</div>
                  <div><strong>Area/Cluster Mgr:</strong> {selectedReportForRemarks.areaClusterManager || '-'}</div>
                  <div><strong>Center Head:</strong> {selectedReportForRemarks.centerHeadName || '-'}</div>
                  <div><strong>Center Type:</strong> <span style={{
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: selectedReportForRemarks.centerType === 'CDC' ? '#e3f2fd' : selectedReportForRemarks.centerType === 'SDC' ? '#fff3e0' : '#f1f8e9',
                    color: selectedReportForRemarks.centerType === 'CDC' ? '#1976d2' : selectedReportForRemarks.centerType === 'SDC' ? '#e65100' : '#2e7d32'
                  }}>{selectedReportForRemarks.centerType || 'CDC'}</span></div>
                  <div><strong>Location:</strong> {selectedReportForRemarks.location || selectedReportForRemarks.geolocation || '-'}</div>
                  <div><strong>Zonal Head:</strong> {selectedReportForRemarks.zonalHeadName || '-'}</div>
                  <div><strong>Audited By:</strong> {selectedReportForRemarks.auditedBy || '-'}</div>
                  <div><strong>Audit Period:</strong> {selectedReportForRemarks.auditPeriod || '-'}</div>
                  <div><strong>Financial Year:</strong> <span style={{color: '#667eea', fontWeight: 'bold'}}>{selectedReportForRemarks.financialYear || 'FY26'}</span></div>
                  <div><strong>Audit Date:</strong> {selectedReportForRemarks.auditDateString || selectedReportForRemarks.auditDate || '-'}</div>
                  <div><strong>Grand Total:</strong> <span style={{
                    fontSize: '15px',
                    fontWeight: 'bold',
                    color: parseFloat(selectedReportForRemarks.grandTotal) >= 80 ? '#28a745' : parseFloat(selectedReportForRemarks.grandTotal) >= 65 ? '#ffc107' : '#dc3545'
                  }}>{parseFloat(selectedReportForRemarks.grandTotal || 0).toFixed(2)}/100</span></div>
                  <div><strong>Status:</strong> <span style={{
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: getGrandTotalColor(selectedReportForRemarks) === '#28a745' ? '#e8f5e9' : getGrandTotalColor(selectedReportForRemarks) === '#ffc107' ? '#fff3e0' : '#ffebee',
                    color: getGrandTotalColor(selectedReportForRemarks) === '#28a745' ? '#2e7d32' : getGrandTotalColor(selectedReportForRemarks) === '#ffc107' ? '#e65100' : '#c62828'
                  }}>{getAuditStatus(selectedReportForRemarks)}</span></div>
                </div>
              </div>

              {selectedReportForRemarks.centerRemarksBy && (
                <div style={{
                  background: '#e3f2fd',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  color: '#1565c0'
                }}>
                  <strong>📝 Remarks by:</strong> {selectedReportForRemarks.centerRemarksBy} | 
                  <strong> Date:</strong> {selectedReportForRemarks.centerRemarksDate || '-'}
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
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', minWidth: '180px' }}>REMARKS<br/>(आप अपनी भाषा में लिख सकते हैं)</th>
                    <th style={{ padding: '12px 8px', color: 'white', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', minWidth: '180px', background: '#4caf50' }}>CENTER HEAD<br/>REMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const areas = getCheckpointsByArea(
                      selectedReportForRemarks.centerType || 'CDC',
                      selectedReportForRemarks.placementApplicable || 'yes'
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
                        const cpData = selectedReportForRemarks[cp.id] || {};
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
                            const cpData = selectedReportForRemarks[cp.id] || {};
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
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowCenterRemarksModal(false);
                  setSelectedReportForRemarks(null);
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
      {activeOption === 'history' && (() => {
        console.log('📜 HISTORY VIEW RENDERING');
        console.log('   savedReports:', savedReports);
        console.log('   savedReports.length:', savedReports.length);
        return (
        <div className="history-section">
          <h3 style={{ 
            marginBottom: '25px', 
            color: '#ff6f00', 
            fontSize: '24px', 
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            📜 Audit History - Year Wise Reports
          </h3>
          
          <div style={{
            marginBottom: '25px',
            padding: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '15px',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '20px' }}>🔍</span>
              <input
                type="text"
                placeholder="Search by Center Name, Code, Year, Status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '16px',
                  border: '2px solid white',
                  borderRadius: '10px',
                  outline: 'none',
                  background: 'white'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  ✕ Clear
                </button>
              )}
            </div>
            {searchQuery && (
              <p style={{
                marginTop: '10px',
                color: 'white',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                🔍 Searching for: "{searchQuery}"
              </p>
            )}
          </div>
          
          {savedReports.length === 0 ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              background: '#f5f5f5',
              borderRadius: '12px'
            }}>
              <p style={{ fontSize: '18px', color: '#666' }}>📭 No reports found</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '25px' }}>
              {Object.entries(
                savedReports
                  .filter(report => {
                    if (!searchQuery) return true;
                    const search = searchQuery.toLowerCase();
                    return (
                      report.centerName?.toLowerCase().includes(search) ||
                      report.centerCode?.toLowerCase().includes(search) ||
                      report.financialYear?.toLowerCase().includes(search) ||
                      report.currentStatus?.toLowerCase().includes(search) ||
                      report.chName?.toLowerCase().includes(search)
                    );
                  })
                  .reduce((acc, report) => {
                  const key = report.centerCode;
                  if (!acc[key]) {
                    acc[key] = { 
                      centerName: report.centerName, 
                      centerCode: report.centerCode, 
                      reports: [] 
                    };
                  }
                  acc[key].reports.push(report);
                  return acc;
                }, {})
              ).map(([centerCode, data]) => (
                <div key={centerCode} style={{
                  background: 'white',
                  border: '2px solid #e0e0e0',
                  borderRadius: '15px',
                  padding: '25px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ 
                    marginBottom: '20px', 
                    color: '#667eea',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    borderBottom: '3px solid #667eea',
                    paddingBottom: '10px'
                  }}>
                    🏢 {data.centerName} ({centerCode})
                  </h4>
                  
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {data.reports
                      .sort((a, b) => (b.financialYear || '').localeCompare(a.financialYear || ''))
                      .map(report => {
                        const score = parseFloat(report.grandTotal) || 0;
                        const scoreColor = score >= 90 ? '#4caf50' : score >= 70 ? '#ff9800' : '#f44336';
                        const scoreEmoji = score >= 90 ? '🌟' : score >= 70 ? '👍' : '⚠️';
                        
                        return (
                          <div key={report._id} style={{
                            padding: '15px',
                            background: '#f8f9fa',
                            borderRadius: '10px',
                            border: '1px solid #dee2e6',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
                          onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '15px', 
                                flexWrap: 'wrap' 
                              }}>
                                <span style={{ 
                                  fontSize: '16px', 
                                  fontWeight: 'bold',
                                  color: '#667eea',
                                  background: 'white',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '2px solid #667eea'
                                }}>
                                  {report.financialYear || 'FY26'}
                                </span>
                                
                                <span style={{ fontSize: '15px', fontWeight: 'bold' }}>
                                  Score: <span style={{ 
                                    color: scoreColor, 
                                    fontSize: '18px' 
                                  }}>
                                    {scoreEmoji} {score.toFixed(2)}/100
                                  </span>
                                </span>
                                
                                {report.auditDateString && (
                                  <span style={{ 
                                    fontSize: '13px', 
                                    color: '#666',
                                    background: '#e3f2fd',
                                    padding: '4px 8px',
                                    borderRadius: '4px'
                                  }}>
                                    📅 {report.auditDateString}
                                  </span>
                                )}
                                
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  background: report.currentStatus === 'Approved' ? '#e8f5e9' : '#fff3e0',
                                  color: report.currentStatus === 'Approved' ? '#2e7d32' : '#e65100',
                                  border: `1px solid ${report.currentStatus === 'Approved' ? '#4caf50' : '#ff9800'}`
                                }}>
                                  {report.currentStatus || 'Pending'}
                                </span>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => {
                                setSelectedReportForRemarks(report);
                                setShowCenterRemarksModal(true);
                              }}
                              style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.transform = 'none';
                                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                              }}
                            >
                              👁️ View
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })()}

    </div>
  );
};

export default AuditManagement;