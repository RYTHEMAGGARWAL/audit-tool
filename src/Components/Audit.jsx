import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { getCheckpointsByArea } from './checkpointConfig';
import Select from 'react-select';

import './Audit.css';

const canSubmitReport = (report) =>
  report.currentStatus === 'Not Submitted' ||
  report.currentStatus.startsWith('Rejected') ||
  report.currentStatus === 'Sent Back';

const isApprovedOrPendingReport = (report) =>
  report.currentStatus === 'Pending with Supervisor' ||
  report.currentStatus === 'Approved' ||
  report.currentStatus === 'Closed';

// Max scores per area, adjusted when placement is not applicable
const getReportScoreMax = (report) => {
  const isNA = report.placementApplicable === 'no';
  return {
    foMax: isNA ? 35 : 30,
    dpMax: isNA ? 45 : 40,
    ppMax: 15,
    mpMax: isNA ? 20 : 15,
  };
};

const isWithinDateRange = (reportDate, start, end) => {
  if (!start && !end) return true; // No filter

  // Parse report date (format: DD/MM/YYYY)
  const [day, month, year] = (reportDate || '').split('/');
  if (!day || !month || !year) return true;

  const rDate = new Date(year, month - 1, day);

  if (start && rDate < new Date(start)) return false;
  if (end && rDate > new Date(end)) return false;
  return true;
};


// One checkpoint row in the audit table — extracted so the parent's render
// function doesn't carry all this row's branching in its own complexity.
const CheckpointRow = ({ cp, cpIdx, area, isEditingExisting, auditData, handleInputChange, centerHeadRemarksData }) => {
  if (area.isNA) {
    return (
      <tr style={{ background: '#f5f5f5', opacity: 0.7 }}>
        <td style={{ textAlign: 'center' }}>{cpIdx + 1}</td>
        <td>{cp.checkPoint}</td>
        <td style={{ textAlign: 'center', color: '#999' }}>NA</td>
        <td style={{ textAlign: 'center', color: '#999' }}>NA</td>
        <td>
          <span style={{ display: 'block', textAlign: 'center', color: '#999', fontWeight: 'bold', padding: '8px' }}>NA</span>
        </td>
        <td>
          <span style={{ display: 'block', textAlign: 'center', color: '#999', fontWeight: 'bold', padding: '8px' }}>NA</span>
        </td>
        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#999' }}>NA</td>
        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#999' }}>NA</td>
        <td>
          <span style={{ display: 'block', textAlign: 'center', color: '#999', fontStyle: 'italic', padding: '8px' }}>Not Applicable</span>
        </td>
        {isEditingExisting && (
          <td style={{ background: '#f1f8e9', padding: '8px' }}>
            <span style={{ display: 'block', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>N/A</span>
          </td>
        )}
      </tr>
    );
  }

  const chRemark = centerHeadRemarksData[cp.id];

  return (
    <tr>
      <td style={{ textAlign: 'center' }}>{cpIdx + 1}</td>
      <td>{cp.checkPoint}</td>
      <td style={{ textAlign: 'center' }}>{cp.weightage}%</td>
      <td style={{ textAlign: 'center' }}>{cp.maxScore}</td>
      <td>
        <input
          type="number"
          min="0"
          value={auditData[cp.id]?.totalSamples || ''}
          onChange={(e) => handleInputChange(cp.id, 'totalSamples', e.target.value)}
          style={{ width: '100%', padding: '8px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          value={auditData[cp.id]?.samplesCompliant || ''}
          onChange={(e) => handleInputChange(cp.id, 'samplesCompliant', e.target.value)}
          style={{ width: '100%', padding: '8px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </td>
      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{auditData[cp.id]?.compliantPercent || 0}%</td>
      <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#11998e' }}>{auditData[cp.id]?.score || 0}</td>
      <td>
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
      </td>
      {isEditingExisting && (
        <td style={{ background: '#f1f8e9', padding: '8px' }}>
          <div style={{
            padding: '8px',
            background: chRemark ? '#e8f5e9' : '#fafafa',
            borderRadius: '4px',
            border: '1px solid #c8e6c9',
            minHeight: '50px',
            fontSize: '13px',
            color: chRemark ? '#2e7d32' : '#999',
            fontStyle: chRemark ? 'normal' : 'italic'
          }}>
            {chRemark || 'No remarks from Center Head'}
          </div>
        </td>
      )}
    </tr>
  );
};


// One row in the "View Reports" table — extracted so the parent's render
// function doesn't carry all this row's branching in its own complexity.
// Body below is unchanged from the original inline JSX, just parameterized.
// Reusable "chip" style email input with autocomplete suggestions — used for
// both the To and Cc fields, so this logic doesn't need to be nested twice
// inside the parent render function.
const EmailChipInput = ({
  inputId, label, required, hint, hintMarginLeft = 8, footerNote,
  list, setList, input, setInput, showSug, setShowSug,
  firstChipHighlight, placeholderEmpty, placeholderMore,
  getSavedEmails, saveEmail
}) => {
  const addEmail = (email) => {
    const e = email.trim().toLowerCase();
    if (e?.includes('@') && !list.includes(e)) { setList(p => [...p, e]); saveEmail(e); }
    setInput(''); setShowSug(false);
  };
  const sug = input.length > 0 ? getSavedEmails().filter(s => s.includes(input.toLowerCase()) && !list.includes(s)) : [];

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
        {label} {required && <span style={{ color: '#dc3545' }}>*</span>}
        {hint && <span style={{ fontWeight: '400', color: '#888', fontSize: '12px', marginLeft: `${hintMarginLeft}px` }}>{hint}</span>}
      </label>
      <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '8px 10px', minHeight: '50px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', cursor: 'text', position: 'relative', background: 'white' }}
        role="button" tabIndex={0}
        onClick={() => document.getElementById(inputId).focus()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { document.getElementById(inputId).focus(); } }}>
        {list.map((e, i) => (
          <span key={e} style={{ background: (firstChipHighlight && i === 0) ? 'linear-gradient(135deg,#11998e,#38ef7d)' : 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', padding: '5px 12px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
            {firstChipHighlight && i === 0 && '🏢 '}{e}
            <button type="button" onClick={(ev) => { ev.stopPropagation(); setList(p => p.filter((_, j) => j !== i)); }}
              style={{ cursor: 'pointer', fontSize: '16px', lineHeight: '1', opacity: .85, fontWeight: 'bold', background: 'none', border: 'none', color: 'inherit', padding: 0 }}>×</button>
          </span>
        ))}
        <input id={inputId} type="text" value={input} placeholder={list.length === 0 ? placeholderEmpty : placeholderMore}
          onChange={e => { setInput(e.target.value); setShowSug(true); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(input); } if (e.key === 'Backspace' && !input && list.length > 0) setList(p => p.slice(0, -1)); }}
          onFocus={() => setShowSug(true)}
          onBlur={() => setTimeout(() => { if (input.trim()) { addEmail(input); } setShowSug(false); }, 180)}
          style={{ border: 'none', outline: 'none', fontSize: '14px', flex: '1', minWidth: '160px', padding: '4px 2px' }} />
        {showSug && sug.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '2px solid #667eea', borderRadius: '8px', zIndex: 9999, boxShadow: '0 8px 24px rgba(102,126,234,.25)', maxHeight: '180px', overflowY: 'auto' }}>
            <div style={{ padding: '6px 14px', fontSize: '11px', color: '#667eea', fontWeight: '700', borderBottom: '1px solid #eee' }}>📧 Saved Emails</div>
            {sug.map((s, i) => (<div key={s} onMouseDown={() => addEmail(s)} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f5f5f5' }} onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>📧 {s}</div>))}
          </div>
        )}
      </div>
      {footerNote && list.length > 0 && <div style={{ fontSize: '11px', color: '#11998e', marginTop: '4px', fontWeight: '600' }}>{footerNote}</div>}
    </div>
  );
};

// Center-type chip colors (CDC/SDC/other)
const getCenterTypeBadgeStyle = (centerType) => {
  if (centerType === 'CDC') return { background: '#e3f2fd', color: '#1976d2' };
  if (centerType === 'SDC') return { background: '#fff3e0', color: '#e65100' };
  return { background: '#f1f8e9', color: '#2e7d32' };
};

// Audit period range, formatted from "start to end" string
const AuditPeriodCell = ({ auditPeriod }) => {
  if (!auditPeriod) return <span style={{ color: '#999', fontSize: '12px' }}>—</span>;
  const parts = auditPeriod.split(' to ');
  const from = parts[0] ? new Date(parts[0]).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : parts[0];
  const to = parts[1] ? new Date(parts[1]).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : parts[1];
  return (
    <div style={{ background: 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)', padding: '8px 10px', borderRadius: '8px', border: '1px solid #9fa8da', display: 'inline-block', minWidth: '150px' }}>
      <div style={{ fontSize: '11px', color: '#5c6bc0', fontWeight: 'bold', marginBottom: '4px' }}>📅 Audit Period</div>
      <div style={{ fontSize: '12px', color: '#283593', fontWeight: 'bold' }}>{from}</div>
      <div style={{ fontSize: '11px', color: '#7986cb', margin: '2px 0' }}>↓</div>
      <div style={{ fontSize: '12px', color: '#283593', fontWeight: 'bold' }}>{to}</div>
    </div>
  );
};

// Area score cell content (FO/DP/MP) — "NA" or status + value
const AreaScoreCell = ({ scoreValue, info }) => {
  if (scoreValue === 'NA') return <>NA</>;
  return (
    <>
      {info.status}<br />
      <span style={{ fontSize: '14px' }}>({Number.parseFloat(scoreValue || 0).toFixed(2)})</span>
    </>
  );
};

// Placement score cell content — extra "not applicable" check
const PlacementScoreCell = ({ report, placementInfo }) => {
  if (report.placementApplicable === 'no') return <span style={{ color: '#999', fontWeight: 'bold', fontSize: '15px' }}>NA</span>;
  return (
    <>
      {placementInfo.status}<br />
      <span style={{ fontSize: '14px' }}>({Number.parseFloat(report.placementScore || 0).toFixed(2)})</span>
    </>
  );
};

// Generic deadline badge (reused for both Auditor and Center deadline columns)
const DeadlineBadgeCell = ({ badge, subText }) => {
  if (!badge) return <span style={{ color: '#999', fontSize: '11px' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
      <span style={{
        padding: '4px 8px', borderRadius: '10px', fontSize: '11px',
        fontWeight: 'bold', color: badge.color, background: badge.bg,
        border: `1px solid ${badge.border}`, whiteSpace: 'nowrap'
      }}>{badge.text}</span>
      {subText && <span style={{ fontSize: '10px', color: '#888' }}>{subText}</span>}
    </div>
  );
};

// Edit / Submit / Locked buttons for a report row
const ReportActionButtons = ({ canSubmit, isApprovedOrPending, loading, report, handleEditReport, handleSubmitReport }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
    {canSubmit && (
      <button type="button"
        onClick={() => handleEditReport(report)}
        disabled={loading}
        style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px',
          cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', width: '110px',
          boxShadow: '0 4px 12px rgba(245, 87, 108, 0.35)', transition: 'all 0.2s'
        }}
      >
        ✏️ Edit
      </button>
    )}
    {canSubmit && (
      <button type="button"
        onClick={() => handleSubmitReport(report.centerCode)}
        disabled={loading}
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 'bold', width: '110px',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)', transition: 'all 0.3s ease',
          opacity: loading ? 0.6 : 1
        }}
      >
        📤 Submit
      </button>
    )}
    {isApprovedOrPending && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
        <button type="button"
          disabled
          style={{
            background: '#e8f5e9', color: '#2e7d32', border: '2px solid #a5d6a7',
            padding: '8px 20px', borderRadius: '8px', cursor: 'not-allowed',
            fontSize: '13px', fontWeight: 'bold', width: '110px'
          }}
        >
          ✅ Submitted
        </button>
        <span style={{ fontSize: '10px', color: '#999', textAlign: 'center' }}>🔒 Edit locked</span>
      </div>
    )}
  </div>
);

// Workflow status chip — exactly one of Approved/Pending/Rejected/Closed/Not Submitted
// (mutually exclusive since they're all derived from the same currentStatus field)
const ReportStatusCell = ({ report, isRejected, isClosed }) => {
  if (report.currentStatus === 'Approved') return <span style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '12px' }}>✅ Approved</span>;
  if (report.currentStatus === 'Pending with Supervisor') return <span style={{ color: '#FFC107', fontWeight: 'bold', fontSize: '12px' }}>⏳ Pending</span>;
  if (isRejected) return <span style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }} title={report.currentStatus}>❌ Rejected</span>;
  if (isClosed) return <span style={{ color: '#6c757d', fontWeight: 'bold', fontSize: '12px', background: '#f8f9fa', padding: '3px 8px', borderRadius: '8px', border: '1px solid #dee2e6' }}>🔒 Closed</span>;
  if (report.currentStatus === 'Not Submitted') return <span style={{ color: '#999', fontSize: '12px' }}>Not Submitted</span>;
  return null;
};

// Send/Resend email cell — 3-way: not-approved-yet / sent / not-sent
const getNonApprovedStatusIcon = (currentStatus) => {
  if (currentStatus === 'Pending with Supervisor') return '⏳ Pending';
  if (currentStatus === 'Not Submitted') return '—';
  return '❌';
};

const SendReportCell = ({ report, handleOpenEmailForm }) => {
  if (report.currentStatus !== 'Approved') {
    return (
      <span style={{ color: '#999', fontSize: '11px', fontStyle: 'italic' }}>
        {getNonApprovedStatusIcon(report.currentStatus)}
      </span>
    );
  }
  if (report.emailSent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
        <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '6px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ✅ Sent
        </span>
        <button type="button"
          onClick={() => handleOpenEmailForm(report)}
          style={{ background: 'transparent', color: '#667eea', border: '1px solid #667eea', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
        >
          🔄 Resend
        </button>
      </div>
    );
  }
  return (
    <button type="button"
      onClick={() => handleOpenEmailForm(report)}
      style={{
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white', border: 'none',
        padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
        boxShadow: '0 4px 12px rgba(17, 153, 142, 0.3)', transition: 'all 0.3s ease',
        display: 'flex', alignItems: 'center', gap: '6px'
      }}
      onMouseOver={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(17, 153, 142, 0.4)'; }}
      onMouseOut={(e) => { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 12px rgba(17, 153, 142, 0.3)'; }}
    >
      📧 Send
    </button>
  );
};

// "View Full Report" button that fetches fresh center data before opening the remarks modal
const CenterHeadRemarksCell = ({ report, setSelectedReportForRemarks, setShowCenterRemarksModal }) => {
  const canView = report.emailSent === true && ['Approved', 'Closed'].includes(report.currentStatus);
  if (!canView) return <span style={{ color: '#999', fontSize: '11px', fontStyle: 'italic' }}>—</span>;

  const openModal = async () => {
    const res = await fetch(`${API_URL}/api/audit-reports`);
    const allReports = await res.json();
    const freshReport = allReports.find(r => r._id === report._id) || report;
    try {
      const cRes = await fetch(`${API_URL}/api/centers`);
      if (cRes.ok) {
        const centers = await cRes.json();
        const cData = centers.find(ct => ct.centerCode === freshReport.centerCode);
        setSelectedReportForRemarks(cData ? {
          ...freshReport,
          areaManager: cData.areaManager || freshReport.areaManager || cData.areaClusterManager || freshReport.areaClusterManager || '',
          clusterManager: cData.clusterManager || freshReport.clusterManager || '',
          placementCoordinator: cData.placementCoordinator || freshReport.placementCoordinator || '',
          seniorManagerPlacement: cData.seniorManagerPlacement || freshReport.seniorManagerPlacement || '',
          nationalHeadPlacement: cData.nationalHeadPlacement || freshReport.nationalHeadPlacement || '',
          placementApplicable: cData.placementApplicable || freshReport.placementApplicable || 'yes',
          zmName: cData.zmName || freshReport.zmName || '',
          regionHeadName: cData.regionHeadName || freshReport.regionHeadName || '',
        } : freshReport);
      } else {
        setSelectedReportForRemarks(freshReport);
      }
    } catch (e) {
      console.error('Error merging center data for remarks view:', e);
      setSelectedReportForRemarks(freshReport);
    }
    setShowCenterRemarksModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
      <button type="button"
        onClick={openModal}
        style={{
          background: report.currentStatus === 'Closed' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
          color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
          fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(17, 153, 142, 0.3)'
        }}
      >
        📊 View Full Report
      </button>
      {report.currentStatus === 'Closed' && <span style={{ fontSize: '10px', color: '#6c757d' }}>🔒 Read only</span>}
      {report.currentStatus === 'Approved' && !report.centerRemarksDate && <span style={{ fontSize: '10px', color: '#e65100' }}>No remarks yet</span>}
    </div>
  );
};

// Reopen action for a closed report — "already reopened" / admin reopen / request reopen
const ReopenControl = ({ report, isAdmin, loggedUser, loadSavedReports }) => {
  if (report.reopenedBy) {
    return <span style={{ fontSize: '10px', color: '#999', fontStyle: 'italic', marginTop: '2px' }}>Already reopened once</span>;
  }
  if (isAdmin) {
    const reopen = async () => {
      if (window.confirm('Reopen report for ' + report.centerName + '?\nCenter + Placement dono unlock honge.\n7 working days milenge.')) {
        const res = await fetch(`${API_URL}/api/audit-reports/${report._id}/reopen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reopenedBy: loggedUser.firstname }) });
        const d = await res.json();
        if (res.ok) { alert('🔓 Reopened! Deadline: ' + d.newDeadline); loadSavedReports(); }
        else alert('❌ ' + (d.error || 'Failed'));
      }
    };
    return (
      <button type="button" onClick={reopen} style={{ marginTop: '2px', padding: '5px 12px', background: 'linear-gradient(135deg,#2e7d32,#43a047)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
        🔓 Reopen
      </button>
    );
  }
  if (report.reopenRequestPending) {
    return <span style={{ fontSize: '10px', color: '#e65100', fontWeight: 'bold' }}>⏳ Reopen pending...</span>;
  }
  const requestReopen = async () => {
    const reason = window.prompt('Request reopen for ' + report.centerName + '?\nEnter reason (optional):');
    if (reason === null) return;
    const res = await fetch(`${API_URL}/api/audit-reports/${report._id}/reopen-request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestedBy: loggedUser.firstname, reason }) });
    const d = await res.json();
    if (res.ok) { alert('✅ Request sent to Admin!'); loadSavedReports(); }
    else alert('❌ ' + (d.error || 'Failed'));
  };
  return (
    <button type="button" onClick={requestReopen} style={{ marginTop: '2px', padding: '5px 10px', background: 'linear-gradient(135deg,#e65100,#ff9800)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
      📤 Request Reopen
    </button>
  );
};

// Closed-state summary: badge + dates + reopen control
const ClosedReportInfo = ({ report, isAdmin, loggedUser, loadSavedReports }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
    <span style={{ padding: '5px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', color: '#6c757d', background: '#f8f9fa', border: '1px solid #dee2e6' }}>🔒 Closed</span>
    {report.auditorClosedDate && <span style={{ fontSize: '10px', color: '#888' }}>{report.auditorClosedDate}</span>}
    {report.auditorClosedBy && <span style={{ fontSize: '10px', color: '#aaa', fontStyle: 'italic' }}>{report.auditorClosedBy}</span>}
    <ReopenControl report={report} isAdmin={isAdmin} loggedUser={loggedUser} loadSavedReports={loadSavedReports} />
  </div>
);

// Close-report button, shown once the center has submitted remarks
const CloseReportButton = ({ report, loggedUser, loadSavedReports }) => {
  const closeReport = async () => {
    if (window.confirm(`Close this report for ${report.centerName}?\n\nCenter Head has submitted remarks.\nThis will send a "Report Closed" email to the center.`)) {
      try {
        const res = await fetch(`${API_URL}/api/audit-reports/${report._id}/close-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ closedBy: loggedUser.firstname || loggedUser.username })
        });
        if (res.ok) {
          alert('✅ Report closed successfully! Closed email sent to center.');
          loadSavedReports();
        } else {
          alert('❌ Failed to close report');
        }
      } catch (err) {
        alert('❌ Error: ' + err.message);
      }
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
      <button type="button"
        onClick={closeReport}
        style={{
          padding: '7px 14px', background: 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)',
          color: 'white', border: 'none', borderRadius: '6px',
          cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(233,30,99,0.3)'
        }}
      >
        🔒 Close Report
      </button>
    </div>
  );
};

// Top-level close-report cell — routes to the 3 states (closed / awaiting-close / awaiting-remarks)
const CloseReportCell = ({ report, isAdmin, loggedUser, loadSavedReports }) => {
  if (report.currentStatus === 'Closed') {
    return <ClosedReportInfo report={report} isAdmin={isAdmin} loggedUser={loggedUser} loadSavedReports={loadSavedReports} />;
  }
  if (report.centerRemarksDate) {
    return <CloseReportButton report={report} loggedUser={loggedUser} loadSavedReports={loadSavedReports} />;
  }
  return <span style={{ color: '#94a3b8', fontSize: '10px', fontStyle: 'italic' }}>Awaiting remarks</span>;
};

const ReportRow = ({
  report, index, canSubmit, isRejected, isClosed, isApprovedOrPending,
  frontOfficeInfo, deliveryInfo, placementInfo, managementInfo, loading,
  editableRemarks, setEditableRemarks, handleSaveRemarks, handleEditReport,
  handleSubmitReport, getGrandTotalColor, getAuditStatus, getAuditorDeadlineBadge,
  getCenterDeadlineBadge, handleOpenEmailForm, isAdmin, loggedUser,
  setSelectedReportForRemarks, setShowCenterRemarksModal, loadSavedReports
}) => {
  return (
                      <tr key={index} style={{ verticalAlign: 'middle' }}>
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
                            background: getCenterTypeBadgeStyle(report.centerType).background,
                            color: getCenterTypeBadgeStyle(report.centerType).color
                          }}>
                            {report.centerType || 'CDC'}
                          </span>
                        </td>
                        <td>{report.centerHeadName || '-'}</td>
                        <td style={{ textAlign: "center", fontWeight: "bold", fontSize: "14px", color: "#667eea" }}>{report.financialYear || "FY26"}</td>
                        <td>{report.auditDate}</td>
<td style={{ 
  textAlign: 'center',
  minWidth: '160px'
}}>
  <AuditPeriodCell auditPeriod={report.auditPeriod} />
</td>
<td style={{ textAlign: 'center' }}>{report.auditedBy || '-'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: frontOfficeInfo.color }}>
                          <AreaScoreCell scoreValue={report.frontOfficeScore} info={frontOfficeInfo} />
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: deliveryInfo.color }}>
                          <AreaScoreCell scoreValue={report.deliveryProcessScore} info={deliveryInfo} />
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: report.placementApplicable === 'no' ? '#999' : placementInfo.color }}>
                          <PlacementScoreCell report={report} placementInfo={placementInfo} />
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: managementInfo.color }}>
                          <AreaScoreCell scoreValue={report.managementScore} info={managementInfo} />
                        </td>
                        <td style={{ 
                          textAlign: 'center', 
                          fontWeight: 'bold', 
                          fontSize: '17px',
                          color: getGrandTotalColor(report)
                        }}>
                          {Number.parseFloat(report.grandTotal || 0).toFixed(2)}
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
                          <ReportActionButtons
                            canSubmit={canSubmit}
                            isApprovedOrPending={isApprovedOrPending}
                            loading={loading}
                            report={report}
                            handleEditReport={handleEditReport}
                            handleSubmitReport={handleSubmitReport}
                          />
                        </td>

                        {/* ⏰ AUDITOR DEADLINE — 15 working days */}
                        <td style={{ textAlign: 'center', padding: '8px', background: '#fffde7' }}>
                          {(() => {
                            const badge = getAuditorDeadlineBadge(report);
                            return <DeadlineBadgeCell badge={badge} subText={badge?.sub} />;
                          })()}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <ReportStatusCell report={report} isRejected={isRejected} isClosed={isClosed} />
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
                          <SendReportCell report={report} handleOpenEmailForm={handleOpenEmailForm} />
                        </td>
                        {/* ⏰ CENTER DEADLINE — 7 working days */}
                        <td style={{ textAlign: 'center', padding: '8px', background: '#e8f5e9' }}>
                          {(() => {
                            const badge = getCenterDeadlineBadge(report);
                            return <DeadlineBadgeCell badge={badge} subText={report.centerDeadlineString ? `by ${report.centerDeadlineString}` : null} />;
                          })()}
                        </td>

                        {/* CENTER HEAD REMARKS */}
                        <td style={{ textAlign: 'center', padding: '8px', background: '#f1f8e9' }}>
                          <CenterHeadRemarksCell report={report} setSelectedReportForRemarks={setSelectedReportForRemarks} setShowCenterRemarksModal={setShowCenterRemarksModal} />
                        </td>

                        {/* 🔒 CLOSE REPORT CELL */}
                        <td style={{ textAlign: 'center', padding: '8px', background: '#fce4ec' }}>
                          <CloseReportCell report={report} isAdmin={isAdmin} loggedUser={loggedUser} loadSavedReports={loadSavedReports} />
                        </td>

                      </tr>
  );
};
// Top "Audit" tab dropdown showing Create/View/History options
const AuditTabDropdown = ({ activeOption, dropOpen, setDropOpen, handleOptionClick, dropRef }) => {
  const menuItems = [
    { key: 'create', icon: '➕', label: 'Create Report', color: '#667eea' },
    { key: 'view', icon: '📊', label: 'View Reports', color: '#2196f3' },
    { key: 'history', icon: '📜', label: 'History', color: '#ff6f00' },
  ];
  const active = menuItems.find(m => m.key === activeOption);
  return (
    <div className="audit-excel-tab-wrap" ref={dropRef}>
      <button type="button"
        className={`audit-excel-tab${dropOpen ? ' audit-excel-tab--open' : ''}`}
        onClick={() => setDropOpen(o => !o)}
      >
        <span className="aet-icon">📋</span>
        <span className="aet-title">Audit</span>
        {active && (
          <span className="aet-active-chip" style={{ background: active.color }}>
            {active.icon} {active.label}
          </span>
        )}
        <span className="aet-caret">{dropOpen ? '▲' : '▼'}</span>
      </button>
      {dropOpen && (
        <div className="audit-excel-dropdown">
          <div className="aed-header">📋 Audit Management</div>
          {menuItems.map((item) => (
            <button type="button"
              key={item.key}
              className={`aed-item${activeOption === item.key ? ' aed-item--active' : ''}`}
              style={{ '--item-color': item.color }}
              onClick={() => { handleOptionClick(item.key); setDropOpen(false); }}
            >
              <span className="aed-item-icon">{item.icon}</span>
              <span className="aed-item-label">{item.label}</span>
              {activeOption === item.key && <span className="aed-item-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};


// History tab: search + date-range filter + centers grouped with their reports
// Color + emoji pair for a grand-total score
const getScoreVisuals = (score) => {
  if (score >= 90) return { color: '#4caf50', emoji: '🌟' };
  if (score >= 70) return { color: '#ff9800', emoji: '👍' };
  return { color: '#f44336', emoji: '⚠️' };
};

const HistoryTabView = ({ savedReports, searchQuery, setSearchQuery, startDate, setStartDate, endDate, setEndDate, openCenterRemarksModal }) => {
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
  marginBottom: '20px',
  padding: '20px',
  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
  borderRadius: '12px',
  border: '2px solid #2196f3'
}}>
  {/* SEARCH BAR */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
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
      <button type="button"
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

  {/* DATE RANGE FILTER */}
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'auto 1fr 1fr auto', 
    gap: '15px', 
    alignItems: 'center',
    background: 'white',
    padding: '15px',
    borderRadius: '10px',
    border: '2px solid #2196f3'
  }}>
    <label style={{ 
      fontSize: '18px', 
      fontWeight: 'bold', 
      color: '#1976d2',
      whiteSpace: 'nowrap'
    }}>
      📅 Date Range:
    </label>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Start Date</label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        style={{
          padding: '10px 12px',
          fontSize: '14px',
          border: '2px solid #2196f3',
          borderRadius: '6px',
          outline: 'none',
          cursor: 'pointer'
        }}
      />
    </div>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>End Date</label>
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        style={{
          padding: '10px 12px',
          fontSize: '14px',
          border: '2px solid #2196f3',
          borderRadius: '6px',
          outline: 'none',
          cursor: 'pointer'
        }}
      />
    </div>
    
    {(startDate || endDate) && (
      <button type="button"
        onClick={() => {
          setStartDate('');
          setEndDate('');
        }}
        style={{
          padding: '10px 16px',
          background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}
      >
        ✕ Clear Dates
      </button>
    )}
  </div>

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
                        const score = Number.parseFloat(report.grandTotal) || 0;
                        const { color: scoreColor, emoji: scoreEmoji } = getScoreVisuals(score);
                        
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
                            
                            <button type="button" 
                              onClick={() => openCenterRemarksModal(report)}
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
};

// Banner showing which checklist (DTV vs Skills) applies to the selected center
const AuditTypeBanner = ({ centerType }) => {
  const isDTV = centerType === 'DTV';
  return (
    <div style={{
      background: isDTV ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '15px 20px',
      borderRadius: '10px',
      marginTop: '20px',
      marginBottom: '20px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
    }}>
      <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
        {isDTV ? '🚀' : '🎯'} Audit Type: <span style={{
          background: 'rgba(255,255,255,0.3)',
          padding: '4px 12px',
          borderRadius: '6px',
          marginLeft: '10px'
        }}>
          {isDTV ? 'DTV Audit' : `Skills Audit - ${centerType || 'CDC'}`}
        </span>
      </p>
      <p style={{ margin: '5px 0 0', fontSize: '13px', opacity: 0.9 }}>
        {isDTV ? 'Using DTV checklist (different from Skills)' : `Using Skills checklist for ${centerType || 'CDC'} centers`}
      </p>
    </div>
  );
};

// Builds and renders the smart search suggestions dropdown for the View Reports search bar
const SearchSuggestionsDropdown = ({ savedReports, searchQuery, setSearchQuery, setShowSuggestions, getAuditStatus }) => {
  const q = searchQuery.toLowerCase();
  const suggestions = [];

  savedReports.forEach(r => {
    if (r.centerName?.toLowerCase().includes(q))
      suggestions.push({ label: r.centerName, type: 'Center Name', icon: '🏢' });
    if (r.centerCode?.toLowerCase().includes(q))
      suggestions.push({ label: r.centerCode, type: 'Center Code', icon: '🔑' });
    if (r.centerType?.toLowerCase().includes(q))
      suggestions.push({ label: r.centerType, type: 'Center Type', icon: '🏷️' });
    if (r.financialYear?.toLowerCase().includes(q))
      suggestions.push({ label: r.financialYear, type: 'Financial Year', icon: '📅' });
    if (r.auditedBy?.toLowerCase().includes(q) && r.auditedBy)
      suggestions.push({ label: r.auditedBy, type: 'Audited By', icon: '👤' });
    const status = getAuditStatus(r);
    if (status?.toLowerCase().includes(q))
      suggestions.push({ label: status, type: 'Audit Status', icon: '📊' });
    if (r.currentStatus?.toLowerCase().includes(q))
      suggestions.push({ label: r.currentStatus, type: 'Submit Status', icon: '📤' });
  });

  const unique = suggestions.filter((s, i, arr) =>
    arr.findIndex(x => x.label === s.label && x.type === s.type) === i
  ).slice(0, 8);

  if (unique.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '110%',
      left: 0,
      right: 0,
      background: 'white',
      border: '2px solid #2196f3',
      borderRadius: '10px',
      boxShadow: '0 8px 24px rgba(33,150,243,0.2)',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      <div style={{ padding: '8px 12px', background: '#e3f2fd', fontSize: '12px', color: '#1976d2', fontWeight: 'bold' }}>
        💡 Suggestions
      </div>
      {unique.map((s, i) => (
        <div
          key={`${s.label}-${s.type}`}
          onMouseDown={() => { setSearchQuery(s.label); setShowSuggestions(false); }}
          style={{
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderBottom: i < unique.length - 1 ? '1px solid #f0f0f0' : 'none',
            transition: 'background 0.15s'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#e3f2fd'}
          onMouseOut={e => e.currentTarget.style.background = 'white'}
          onFocus={e => e.currentTarget.style.background = '#e3f2fd'}
          onBlur={e => e.currentTarget.style.background = 'white'}
        >
          <span style={{ fontSize: '16px' }}>{s.icon}</span>
          <span style={{ fontWeight: 'bold', color: '#333', flex: 1 }}>{s.label}</span>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
            background: '#e3f2fd',
            color: '#1976d2',
            fontWeight: 'bold'
          }}>{s.type}</span>
        </div>
      ))}
    </div>
  );
};


// Full "create report" setup form once a center is picked: details, auditor,
// FY, audit date, audit period, and placement info — extracted so the parent
// render function doesn't carry all these steps' branching in its own complexity.

// Center details grid (name, contacts, coordinator/manager fields, type badge, auditor picker)
// Coordinator/Sr.Manager/National-Head placement fields, shown only when placement applies
const PlacementFieldsInfo = ({ placementApplicable, placementCoordinator, seniorManagerPlacement, nationalHeadPlacement }) => {
  if (placementApplicable !== 'yes') return null;
  return (
    <>
      {placementCoordinator && <div><strong>Placement Coordinator:</strong> {placementCoordinator}</div>}
      {seniorManagerPlacement && <div><strong>Senior Manager Placement:</strong> {seniorManagerPlacement}</div>}
      {nationalHeadPlacement && <div><strong>National Head Placement:</strong> {nationalHeadPlacement}</div>}
    </>
  );
};

// Auditor dropdown: loading state, select-from-list, and confirmed-email chip
const AuditorPicker = ({ selectedCenter, setSelectedCenter, auditorsLoading, auditorsList }) => (
  <div style={{ position: 'relative' }}>
    <strong>Audited By:</strong>
    {auditorsLoading ? (
      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#999' }}>Loading...</span>
    ) : (
      <select
        value={selectedCenter.auditedBy || ''}
        onChange={(e) => setSelectedCenter({ ...selectedCenter, auditedBy: e.target.value })}
        style={{
          marginLeft: '8px', padding: '5px 10px',
          border: selectedCenter.auditedBy ? '2px solid #4caf50' : '2px solid #667eea',
          borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#333',
          background: selectedCenter.auditedBy ? '#f1f8e9' : 'white'
        }}
      >
        <option value="">-- Select Auditor --</option>
        {auditorsList.map(a => (
          <option key={a.username} value={a.firstname}>
            {a.firstname} {a.lastname || ''} ({a.email})
          </option>
        ))}
      </select>
    )}
    {selectedCenter.auditedBy && (
      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#2e7d32', fontWeight: 'bold' }}>
        ✅ {auditorsList.find(a => a.firstname === selectedCenter.auditedBy)?.email || ''}
      </span>
    )}
  </div>
);

const CenterBasicInfoGrid = ({ selectedCenter, setSelectedCenter, placementApplicable, placementCoordinator, seniorManagerPlacement, nationalHeadPlacement, auditorsLoading, auditorsList }) => (
  <>
              <h4 style={{ marginBottom: '15px', color: '#1976d2' }}>📍 Center Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                <div><strong>Center Code:</strong> {selectedCenter.centerCode}</div>
                <div><strong>Center Name:</strong> {selectedCenter.centerName}</div>
                <div><strong>Project Name:</strong> {selectedCenter.projectName || '-'}</div>
                <div><strong>ZM Name:</strong> {selectedCenter.zmName || '-'}</div>
                <div><strong>Region Head:</strong> {selectedCenter.regionHeadName || '-'}</div>
                <div><strong>Area Manager:</strong> {selectedCenter.areaManager || selectedCenter.areaClusterManager || '-'}</div>
                <div><strong>Cluster Manager:</strong> {selectedCenter.clusterManager || '-'}</div>
                <PlacementFieldsInfo
                  placementApplicable={placementApplicable}
                  placementCoordinator={placementCoordinator}
                  seniorManagerPlacement={seniorManagerPlacement}
                  nationalHeadPlacement={nationalHeadPlacement}
                />
                <div><strong>Center Head:</strong> {selectedCenter.centerHeadName || '-'}</div>
                <div><strong>Center Type:</strong> <span style={{
                  padding: '2px 8px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  background: getCenterTypeBadgeStyle(selectedCenter.centerType).background,
                  color: getCenterTypeBadgeStyle(selectedCenter.centerType).color
                }}>{selectedCenter.centerType || 'CDC'}</span></div>
                <div><strong>Location:</strong> {selectedCenter.location || selectedCenter.geolocation || '-'}</div>

                {/* AUDITED BY DROPDOWN — from Users DB */}
                <AuditorPicker
                  selectedCenter={selectedCenter}
                  setSelectedCenter={setSelectedCenter}
                  auditorsLoading={auditorsLoading}
                  auditorsList={auditorsList}
                />
              </div>
  </>
);

// Placement applicable/not/unset card, with coordinator/manager names when applicable
const PlacementInfoCard = ({ placementApplicable, placementCoordinator, seniorManagerPlacement, nationalHeadPlacement }) => {
  const style = placementApplicable === 'yes'
    ? { border: '2px solid #4caf50', background: '#f1fff4' }
    : placementApplicable === 'no'
    ? { border: '2px solid #f44336', background: '#fff5f5' }
    : { border: '2px solid #e0e0e0', background: '#f9f9f9' };

  return (
    <div style={{
      marginTop: '16px',
      padding: '14px 18px',
      borderRadius: '10px',
      border: style.border,
      background: style.background,
      display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap'
    }}>
      <div>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#555' }}>📋 Placement:</span>{' '}
        {placementApplicable === 'yes' ? (
          <span style={{ color: '#2e7d32', fontWeight: '700' }}>✅ Applicable</span>
        ) : placementApplicable === 'no' ? (
          <span style={{ color: '#c62828', fontWeight: '700' }}>❌ Not Applicable</span>
        ) : (
          <span style={{ color: '#999', fontStyle: 'italic' }}>Not set in center</span>
        )}
      </div>
      {placementApplicable === 'yes' && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: '#444' }}>
          {placementCoordinator && <span>📋 <strong>Coordinator:</strong> {placementCoordinator}</span>}
          {seniorManagerPlacement && <span>🏆 <strong>Sr. Manager:</strong> {seniorManagerPlacement}</span>}
          {nationalHeadPlacement && <span>🎯 <strong>National Head:</strong> {nationalHeadPlacement}</span>}
        </div>
      )}
    </div>
  );
};

// Step 2: audit-date input, resets auditPeriodTo if it now exceeds the new date
const AuditDateStep = ({ selectedCenter, setSelectedCenter, fyDateRange, auditPeriodFrom, auditPeriodTo, setAuditPeriodTo }) => {
  const onDateChange = (e) => {
    const newAuditDate = e.target.value;
    setSelectedCenter(prev => ({ ...prev, auditDate: newAuditDate }));
    if (auditPeriodTo && auditPeriodTo > newAuditDate) {
      setAuditPeriodTo('');
      setSelectedCenter(prev => ({
        ...prev,
        auditDate: newAuditDate,
        auditPeriod: auditPeriodFrom ? `${auditPeriodFrom} to ` : ''
      }));
    }
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: selectedCenter.auditDate ? '2px solid #4caf50' : '2px solid #11998e',
      padding: '20px',
      marginBottom: '16px'
    }}>
      <label style={{ fontSize: '15px', fontWeight: 'bold', color: '#11998e', display: 'block', marginBottom: '10px' }}>
        🗓️ Audit Date <span style={{ color: 'red' }}>*</span>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <input
          type="date"
          value={selectedCenter.auditDate || ''}
          min={fyDateRange.min}
          max={new Date().toISOString().split('T')[0]}
          onChange={onDateChange}
          style={{
            padding: '10px 14px', border: '2px solid #11998e',
            borderRadius: '8px', fontSize: '14px', cursor: 'pointer', width: '220px'
          }}
        />
        {selectedCenter.auditDate && (
          <span style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '14px' }}>
            ✅ {new Date(selectedCenter.auditDate).toLocaleDateString('en-GB')}
          </span>
        )}
      </div>
      {!selectedCenter.auditDate && (
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#e65100' }}>
          ⚠️ Audit Date mandatory hai
        </p>
      )}
    </div>
  );
};

// Compliant/Amber/Non-Compliant label from a raw score against the 80/65 thresholds
const getComplianceLabel = (value) => {
  if (value >= 80) return 'Compliant';
  if (value >= 65) return 'Amber';
  return 'Non-Compliant';
};

const CenterSetupForm = ({
  selectedCenter, setSelectedCenter, placementApplicable, placementCoordinator,
  seniorManagerPlacement, nationalHeadPlacement, auditorsLoading, auditorsList,
  auditType, setAuditType, selectedFinancialYear, setSelectedFinancialYear,
  financialYears, fyDateRange, setFyDateRange, auditPeriodFrom, setAuditPeriodFrom,
  auditPeriodTo, setAuditPeriodTo, handleCenterSelect
}) => {
  return (
            <div style={{ 
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '25px',
              border: '2px solid #2196f3'
            }}>
              <CenterBasicInfoGrid
                selectedCenter={selectedCenter}
                setSelectedCenter={setSelectedCenter}
                placementApplicable={placementApplicable}
                placementCoordinator={placementCoordinator}
                seniorManagerPlacement={seniorManagerPlacement}
                nationalHeadPlacement={nationalHeadPlacement}
                auditorsLoading={auditorsLoading}
                auditorsList={auditorsList}
              />
              {/* ── END BASIC INFO GRID ── */}

              {selectedCenter && (() => {
                const centerType = selectedCenter.centerType || 'CDC';
                const autoAuditType = centerType === 'DTV' ? 'DTV' : `Skills-${centerType}`;
                if (auditType !== autoAuditType) {
                  setAuditType(autoAuditType);
                }
                return null;
              })()}

              {/* AUDIT TYPE BANNER */}
              <AuditTypeBanner centerType={selectedCenter.centerType} />

              {/* ══ STEP 1: SELECT FINANCIAL YEAR ══ */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                border: selectedFinancialYear ? '2px solid #4caf50' : '2px solid #667eea',
                padding: '20px',
                marginBottom: '16px'
              }}>
                <label style={{ fontSize: '15px', fontWeight: 'bold', color: '#1976d2', display: 'block', marginBottom: '10px' }}>
                  📅 Select Financial Year <span style={{color: 'red'}}>*</span>
                </label>
                <select
                  value={selectedFinancialYear}
                  onChange={(e) => {
                    const fy = e.target.value;
                    setSelectedFinancialYear(fy);
                    setAuditPeriodFrom('');
                    setAuditPeriodTo('');
                    setSelectedCenter(prev => ({...prev, auditDate: '', auditPeriod: ''}));
                    const fyMap = {
                      'FY24': { min: '2023-04-01', max: '2024-03-31' },
                      'FY25': { min: '2024-04-01', max: '2025-03-31' },
                      'FY26': { min: '2025-04-01', max: new Date().toISOString().split('T')[0] },
                      'FY27': { min: '2026-04-01', max: '2027-03-31' },
                    };
                    setFyDateRange(fyMap[fy] || { min: '', max: '' });
                  }}
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
                  <p style={{ marginTop: '8px', fontSize: '13px', color: '#d32f2f', fontStyle: 'italic' }}>
                    ⚠️ Please select a financial year before proceeding
                  </p>
                )}
              </div>

              {/* ══ STEP 2: AUDIT DATE (shown after FY selected) ══ */}
              {selectedFinancialYear && (
                <AuditDateStep
                  selectedCenter={selectedCenter}
                  setSelectedCenter={setSelectedCenter}
                  fyDateRange={fyDateRange}
                  auditPeriodFrom={auditPeriodFrom}
                  auditPeriodTo={auditPeriodTo}
                  setAuditPeriodTo={setAuditPeriodTo}
                />
              )}

              {/* ══ STEP 3: AUDIT PERIOD (shown after AuditDate selected; To max = auditDate) ══ */}
              {selectedFinancialYear && selectedCenter.auditDate && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  border: (auditPeriodFrom && auditPeriodTo) ? '2px solid #4caf50' : '2px solid #667eea',
                  padding: '20px',
                  marginBottom: '16px'
                }}>
                  <label style={{ fontSize: '15px', fontWeight: 'bold', color: '#667eea', display: 'block', marginBottom: '4px' }}>
                    📅 Audit Period
                  </label>
                  <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#888' }}>
                    FY Range: {fyDateRange.min ? new Date(fyDateRange.min).toLocaleDateString('en-GB') : ''} → {selectedCenter.auditDate ? new Date(selectedCenter.auditDate).toLocaleDateString('en-GB') : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>From</label>
                      <input
                        type="date"
                        value={auditPeriodFrom}
                        min={fyDateRange.min}
                        max={selectedCenter.auditDate}
                        onChange={(e) => {
                          setAuditPeriodFrom(e.target.value);
                          setAuditPeriodTo('');
                          setSelectedCenter(prev => ({...prev, auditPeriod: e.target.value}));
                        }}
                        style={{
                          padding: '8px 12px', border: '2px solid #667eea',
                          borderRadius: '6px', fontSize: '14px', cursor: 'pointer'
                        }}
                      />
                    </div>
                    <span style={{ color: '#667eea', fontWeight: 'bold', fontSize: '20px', paddingBottom: '6px' }}>→</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>To</label>
                      <input
                        type="date"
                        value={auditPeriodTo}
                        min={auditPeriodFrom || fyDateRange.min}
                        max={selectedCenter.auditDate}
                        disabled={!auditPeriodFrom}
                        onChange={(e) => {
                          setAuditPeriodTo(e.target.value);
                          const period = `${auditPeriodFrom} to ${e.target.value}`;
                          setSelectedCenter(prev => ({...prev, auditPeriod: period}));
                        }}
                        style={{
                          padding: '8px 12px', border: '2px solid #667eea',
                          borderRadius: '6px', fontSize: '14px',
                          opacity: !auditPeriodFrom ? 0.4 : 1,
                          cursor: !auditPeriodFrom ? 'not-allowed' : 'pointer'
                        }}
                      />
                    </div>
                    {auditPeriodFrom && auditPeriodTo && (
                      <div style={{
                        padding: '8px 16px', background: '#e8f5e9',
                        borderRadius: '8px', border: '1px solid #4caf50',
                        fontSize: '13px', fontWeight: 'bold', color: '#2e7d32'
                      }}>
                        ✅ {new Date(auditPeriodFrom).toLocaleDateString('en-GB')} → {new Date(auditPeriodTo).toLocaleDateString('en-GB')}
                      </div>
                    )}
                  </div>
                  {auditPeriodFrom && !auditPeriodTo && (
                    <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#e65100', fontWeight: '500' }}>
                      ⚠️ "To" date bhi select karo (max: Audit Date tak)
                    </p>
                  )}
                </div>
              )}

              {/* Placement info — auto from center, shown after audit period selected */}
              {auditPeriodFrom && auditPeriodTo && (
                <PlacementInfoCard
                  placementApplicable={placementApplicable}
                  placementCoordinator={placementCoordinator}
                  seniorManagerPlacement={seniorManagerPlacement}
                  nationalHeadPlacement={nationalHeadPlacement}
                />
              )}

              {auditPeriodFrom && auditPeriodTo && (
                <button type="button" 
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

                    if (!selectedCenter.auditDate) {
                      alert('⚠️ Please select Audit Date first!');
                      return;
                    }
                    
                    console.log('✅ FY + AuditDate check passed, calling handleCenterSelect...');
                    handleCenterSelect(selectedCenter);
                    console.log('✅ handleCenterSelect called!');
                  }}
                  style={{ marginTop: '20px' }}
                >
                  🚀 Start Audit
                </button>
              )}
            </div>
  );
};


// Editable checkpoint table (all 4 areas + grand total) shown once a report draft is open
const EditableChecklistTable = ({ isEditingExisting, auditAreas, auditData, handleInputChange, centerHeadRemarksData, calculateAreaTotal, calculateGrandTotal, handleSaveReport, loading, setShowAuditTable }) => (
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
                          <CheckpointRow
                            key={cp.id}
                            cp={cp}
                            cpIdx={cpIdx}
                            area={area}
                            isEditingExisting={isEditingExisting}
                            auditData={auditData}
                            handleInputChange={handleInputChange}
                            centerHeadRemarksData={centerHeadRemarksData}
                          />
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
                <button type="button" className="btn save" onClick={handleSaveReport} disabled={loading}>
                  💾 Save Audit Report
                </button>
                <button type="button" 
                  className="btn cancel"
                  onClick={() => setShowAuditTable(false)}
                >
                  ← Back
                </button>
              </div>
            </div>

);


// Send-report email modal: To/Cc chips, subject, message, send/cancel actions
const EmailFormModal = ({
  selectedReportForEmail, handleCloseEmailForm,
  toList, setToList, toInput, setToInput, showToSug, setShowToSug,
  ccList, setCcList, ccInput, setCcInput, showCcSug, setShowCcSug,
  getSavedEmails, saveEmail, emailData, setEmailData,
  handleSendEmail, sendingEmail
}) => (
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
              <button type="button"
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
              {/* TO chips */}
              <EmailChipInput
                inputId="to-inp"
                label="To:"
                required={true}
                hint="Enter ya comma — multiple add karo"
                hintMarginLeft={8}
                footerNote="🏢 Center ka email auto-filled — aur add kar sakte ho"
                list={toList} setList={setToList}
                input={toInput} setInput={setToInput}
                showSug={showToSug} setShowSug={setShowToSug}
                firstChipHighlight={true}
                placeholderEmpty="recipient@example.com"
                placeholderMore="aur add karo..."
                getSavedEmails={getSavedEmails}
                saveEmail={saveEmail}
              />

              {/* CC chips */}
              <EmailChipInput
                inputId="cc-inp"
                label="Cc:"
                required={false}
                hint="(optional — auditor auto-add hoga)"
                hintMarginLeft={4}
                footerNote={null}
                list={ccList} setList={setCcList}
                input={ccInput} setInput={setCcInput}
                showSug={showCcSug} setShowSug={setShowCcSug}
                firstChipHighlight={false}
                placeholderEmpty="cc@example.com"
                placeholderMore="aur add karo..."
                getSavedEmails={getSavedEmails}
                saveEmail={saveEmail}
              />

              {/* Hierarchy auto-added to CC silently */}

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
                <button type="button"
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
                <button type="button"
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

);


// Full-report detail modal: center info, per-area checkpoint table, center-head remarks
// Text color from a raw score against the 80/65 thresholds
const getScoreColorByThreshold = (value) => {
  if (value >= 80) return '#28a745';
  if (value >= 65) return '#ffc107';
  return '#dc3545';
};

// Badge background/text pair matching a getGrandTotalColor() result
const getStatusBadgeStyle = (colorHex) => {
  if (colorHex === '#28a745') return { bg: '#e8f5e9', color: '#2e7d32' };
  if (colorHex === '#ffc107') return { bg: '#fff3e0', color: '#e65100' };
  return { bg: '#ffebee', color: '#c62828' };
};

const CenterRemarksModal = ({
  selectedReportForRemarks, setShowCenterRemarksModal, setSelectedReportForRemarks,
  getGrandTotalColor, getAuditStatus
}) => (
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
              <button type="button"
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
                  <div><strong>Area Manager:</strong> {selectedReportForRemarks.areaManager || selectedReportForRemarks.areaClusterManager || '-'}</div>
                  <div><strong>Cluster Manager:</strong> {selectedReportForRemarks.clusterManager || '-'}</div>
                  {selectedReportForRemarks.placementCoordinator && <div><strong>Placement Coordinator:</strong> {selectedReportForRemarks.placementCoordinator}</div>}
                  {selectedReportForRemarks.seniorManagerPlacement && <div><strong>Senior Manager Placement:</strong> {selectedReportForRemarks.seniorManagerPlacement}</div>}
                  {selectedReportForRemarks.nationalHeadPlacement && <div><strong>National Head Placement:</strong> {selectedReportForRemarks.nationalHeadPlacement}</div>}
                  <div><strong>Center Head:</strong> {selectedReportForRemarks.centerHeadName || '-'}</div>
                  <div><strong>Center Type:</strong> <span style={{
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: getCenterTypeBadgeStyle(selectedReportForRemarks.centerType).background,
                    color: getCenterTypeBadgeStyle(selectedReportForRemarks.centerType).color
                  }}>{selectedReportForRemarks.centerType || 'CDC'}</span></div>
                  <div><strong>Location:</strong> {selectedReportForRemarks.location || selectedReportForRemarks.geolocation || '-'}</div>
                  
                  <div><strong>Audited By:</strong> {selectedReportForRemarks.auditedBy || '-'}</div>
                  <div><strong>Audit Period:</strong> {selectedReportForRemarks.auditPeriod || '-'}</div>
                  <div><strong>Financial Year:</strong> <span style={{color: '#667eea', fontWeight: 'bold'}}>{selectedReportForRemarks.financialYear || 'FY26'}</span></div>
                  <div><strong>Audit Date:</strong> {selectedReportForRemarks.auditDateString || selectedReportForRemarks.auditDate || '-'}</div>
                  <div><strong>Grand Total:</strong> <span style={{
                    fontSize: '15px',
                    fontWeight: 'bold',
                    color: getScoreColorByThreshold(Number.parseFloat(selectedReportForRemarks.grandTotal))
                  }}>{Number.parseFloat(selectedReportForRemarks.grandTotal || 0).toFixed(2)}/100</span></div>
                  <div><strong>Status:</strong> <span style={{
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: getStatusBadgeStyle(getGrandTotalColor(selectedReportForRemarks)).bg,
                    color: getStatusBadgeStyle(getGrandTotalColor(selectedReportForRemarks)).color
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
                    <th style={{ padding: '12px 8px', color: 'black', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>S.NO</th>
                    <th style={{ padding: '12px 8px', color: 'black', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', minWidth: '220px' }}>CHECKPOINT</th>
                    <th style={{ padding: '12px 8px', color: 'black', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>WEIGHTAGE<br/>(%)</th>
                    <th style={{ padding: '12px 8px', color: 'black', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>MAX<br/>SCORE</th>
                    <th style={{ padding: '12px 8px', color: 'black', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>TOTAL<br/>SAMPLES</th>
                    <th style={{ padding: '12px 8px', color: 'black', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>SAMPLES<br/>COMPLIANT</th>
                    <th style={{ padding: '12px 8px', color: 'black', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>COMPLIANT<br/>%</th>
                    <th style={{ padding: '12px 8px', color: 'black', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>SCORE</th>
                    <th style={{ padding: '12px 8px', color: 'black', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', minWidth: '180px' }}>REMARKS</th>
                    <th style={{ padding: '12px 8px', color: 'black', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', minWidth: '180px', background: '#4caf50' }}>CENTER HEAD<br/>REMARKS</th>
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
                        areaTotal += Number.parseFloat(cpData.score || 0);
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
              <button type="button"
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

);


// "View Reports" tab: search + suggestions + date filter + full reports table
const ViewReportsTabView = ({
  savedReports, searchQuery, setSearchQuery, showSuggestions, setShowSuggestions,
  startDate, setStartDate, endDate, setEndDate, getAuditStatus, loading,
  editableRemarks, setEditableRemarks, handleSaveRemarks, handleEditReport, handleSubmitReport,
  getGrandTotalColor, getAuditorDeadlineBadge, getCenterDeadlineBadge, handleOpenEmailForm,
  isAdmin, loggedUser, setSelectedReportForRemarks, setShowCenterRemarksModal, loadSavedReports,
  getAreaScoreInfo
}) => (
        <div className="view-user">
          <div className="table-header">
            <h3>📊 All Audit Reports ({savedReports.filter(r => {
  const matchesSearch = !searchQuery || (
    r.centerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.centerCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.financialYear?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.currentStatus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.auditedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.centerType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getAuditStatus(r)?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const matchesDate = isWithinDateRange(r.auditDateString || r.auditDate, startDate, endDate);
  return matchesSearch && matchesDate;
}).length})</h3>
          </div>

          <div style={{ 
  marginBottom: '20px',
  padding: '20px',
  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
  borderRadius: '12px',
  border: '2px solid #2196f3'
}}>
  {/* SEARCH BAR */}
  {/* SMART SEARCH BAR WITH SUGGESTIONS */}
<div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', position: 'relative' }}>
  <label style={{ fontSize: '16px', fontWeight: 'bold', color: '#1976d2', minWidth: '80px' }}>
    🔍 Search:
  </label>
  <div style={{ flex: 1, position: 'relative' }}>
    <input
      type="text"
      placeholder="Search by Center, Code, Type, FY, Audited By, Status..."
      value={searchQuery}
      onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
      onFocus={() => setShowSuggestions(true)}
      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
      style={{
        width: '100%',
        padding: '12px 16px',
        fontSize: '15px',
        border: '2px solid #2196f3',
        borderRadius: '8px',
        outline: 'none',
        boxSizing: 'border-box'
      }}
    />
    {/* SUGGESTIONS DROPDOWN */}
    {showSuggestions && searchQuery.length >= 1 && (
      <SearchSuggestionsDropdown
        savedReports={savedReports}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setShowSuggestions={setShowSuggestions}
        getAuditStatus={getAuditStatus}
      />
    )}
  </div>
  {searchQuery && (
    <button type="button"
      onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
      style={{
        padding: '12px 20px',
        background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
        color: 'white', border: 'none', borderRadius: '8px',
        cursor: 'pointer', fontSize: '14px', fontWeight: 'bold'
      }}
    >✕ Clear</button>
  )}
</div>

  {/* DATE RANGE FILTER - ADD THIS! */}
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'auto 1fr 1fr auto', 
    gap: '15px', 
    alignItems: 'center',
    background: 'white',
    padding: '15px',
    borderRadius: '10px',
    border: '2px solid #2196f3'
  }}>
    <label style={{ 
      fontSize: '16px', 
      fontWeight: 'bold', 
      color: '#1976d2',
      whiteSpace: 'nowrap'
    }}>
      📅 Date Range:
    </label>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Start Date</label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        style={{
          padding: '10px 12px',
          fontSize: '14px',
          border: '2px solid #2196f3',
          borderRadius: '6px',
          outline: 'none',
          cursor: 'pointer'
        }}
      />
    </div>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>End Date</label>
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        style={{
          padding: '10px 12px',
          fontSize: '14px',
          border: '2px solid #2196f3',
          borderRadius: '6px',
          outline: 'none',
          cursor: 'pointer'
        }}
      />
    </div>
    
    {(startDate || endDate) && (
      <button type="button"
        onClick={() => {
          setStartDate('');
          setEndDate('');
        }}
        style={{
          padding: '10px 16px',
          background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}
      >
        ✕ Clear Dates
      </button>
    )}
  </div>

</div>

          <div className="table-header" style={{marginTop: 0}}>
            <div style={{visibility: 'hidden'}}>placeholder</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" 
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
            <div className="table-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ minWidth: '1800px' }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f5f5f5', minWidth: '150px' }}>CENTER<br/>NAME</th>
                    <th style={{ position: 'sticky', left: '150px', zIndex: 3, background: '#f5f5f5', minWidth: '120px' }}>CENTER<br/>CODE</th>
                    <th>PROJECT<br/>NAME</th>
                    <th>CENTER<br/>TYPE</th>
                    <th>CENTER<br/>HEAD NAME</th>
                    <th>FINANCIAL<br/>YEAR</th>
                     <th>AUDIT<br/>DATE</th>
                     <th>AUDIT<br/>PERIOD</th>
                    <th>AUDITED<br/>BY</th> 
                    <th>FRONT<br/>OFFICE</th>
                    <th>DELIVERY</th>
                    <th>PLACEMENT</th>
                    <th>MANAGEMENT</th>
                    <th>GRAND<br/>TOTAL</th>
                    <th>AUDIT<br/>STATUS</th>
                    <th style={{ minWidth: '180px' }}>REMARKS<br/>(EDITABLE)</th>
                    <th>ACTIONS</th>
                    <th style={{ minWidth: '110px', background: '#fff8e1' }}>AUDITOR<br/>DEADLINE<br/><span style={{fontSize:'10px',fontWeight:'normal'}}>(15 days)</span></th>
                    <th>CURRENT<br/>STATUS</th>
                    <th>APPROVED<br/>BY</th>
                    <th style={{ minWidth: '120px' }}>SEND<br/>REPORT</th>
                    <th style={{ minWidth: '110px', background: '#e8f5e9' }}>CENTER<br/>DEADLINE<br/><span style={{fontSize:'10px',fontWeight:'normal'}}>(7 days)</span></th>
                    <th style={{ minWidth: '120px', background: '#e8f5e9' }}>CENTER HEAD<br/>REMARKS</th>
                    <th style={{ minWidth: '130px', background: '#fce4ec' }}>CLOSE<br/>REPORT</th>
                  </tr>
                </thead>
                <tbody>
                  {savedReports
  .filter(report => {
    // Text search filter
    const matchesSearch = !searchQuery || (
      report.centerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.centerCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.chName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.financialYear?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.currentStatus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.auditedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.centerType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getAuditStatus(report)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.auditDateString?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Date range filter
    const matchesDate = isWithinDateRange(
      report.auditDateString || report.auditDate,
      startDate,
      endDate
    );
    
    return matchesSearch && matchesDate;
  })
                    .map((report, index) => {
                    const canSubmit = canSubmitReport(report);
                    const isRejected = report.currentStatus.startsWith('Rejected');
                    const isClosed = report.currentStatus === 'Closed';
                    const isApprovedOrPending = isApprovedOrPendingReport(report);

                    const { foMax, dpMax, ppMax, mpMax } = getReportScoreMax(report);

                    const frontOfficeInfo = getAreaScoreInfo(report.frontOfficeScore, foMax);
                    const deliveryInfo = getAreaScoreInfo(report.deliveryProcessScore, dpMax);
                    const placementInfo = getAreaScoreInfo(report.placementScore, ppMax);
                    const managementInfo = getAreaScoreInfo(report.managementScore, mpMax);

                    return (
                      <ReportRow
                        key={index}
                        report={report}
                        index={index}
                        canSubmit={canSubmit}
                        isRejected={isRejected}
                        isClosed={isClosed}
                        isApprovedOrPending={isApprovedOrPending}
                        frontOfficeInfo={frontOfficeInfo}
                        deliveryInfo={deliveryInfo}
                        placementInfo={placementInfo}
                        managementInfo={managementInfo}
                        loading={loading}
                        editableRemarks={editableRemarks}
                        setEditableRemarks={setEditableRemarks}
                        handleSaveRemarks={handleSaveRemarks}
                        handleEditReport={handleEditReport}
                        handleSubmitReport={handleSubmitReport}
                        getGrandTotalColor={getGrandTotalColor}
                        getAuditStatus={getAuditStatus}
                        getAuditorDeadlineBadge={getAuditorDeadlineBadge}
                        getCenterDeadlineBadge={getCenterDeadlineBadge}
                        handleOpenEmailForm={handleOpenEmailForm}
                        isAdmin={isAdmin}
                        loggedUser={loggedUser}
                        setSelectedReportForRemarks={setSelectedReportForRemarks}
                        setShowCenterRemarksModal={setShowCenterRemarksModal}
                        loadSavedReports={loadSavedReports}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

);

const AuditManagement = ({ defaultOption = '', hideHeader = false }) => {
  const [activeOption, setActiveOption] = useState('');
  const [dropOpen, setDropOpen] = React.useState(false);
  const dropRef = React.useRef(null);
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [auditType, setAuditType] = useState('Skills-CDC');
  const [showAuditTable, setShowAuditTable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [, setForceUpdate] = useState(0);
  const [editableRemarks, setEditableRemarks] = useState({});
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [selectedReportForEmail, setSelectedReportForEmail] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [fyDateRange, setFyDateRange] = useState({ min: '', max: '' });

const [endDate, setEndDate] = useState('');
const [auditorsList, setAuditorsList] = useState([]); // {firstname, email, username} from DB
const [auditorsLoading, setAuditorsLoading] = useState(false);
const [auditPeriodFrom, setAuditPeriodFrom] = useState('');
const [auditPeriodTo, setAuditPeriodTo] = useState('');
  const [emailData, setEmailData] = useState({
    to: '',
    cc: '',
    subject: '',
    message: ''
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [toList, setToList] = useState([]);
  const [ccList, setCcList] = useState([]);
  const [showToSug, setShowToSug] = useState(false);
  const [showCcSug, setShowCcSug] = useState(false);
  const [hierarchyEmails, setHierarchyEmails] = useState([]); // ZM/RH/ACM emails
  const [placementEmailList, setPlacementEmailList] = useState([]); // Placement Coordinator emails
  const [, setHierarchyLoading] = useState(false);

  const getSavedEmails = () => {
    try { return JSON.parse(localStorage.getItem('savedEmailList') || '[]'); }
    catch { return []; }
  };
  const saveEmail = (email) => {
    if (!email || !email.includes('@')) return;
    const saved = getSavedEmails();
    if (!saved.includes(email.toLowerCase())) {
      saved.unshift(email.toLowerCase());
      localStorage.setItem('savedEmailList', JSON.stringify(saved.slice(0, 30)));
    }
  };
  
  // NEW: Track if editing existing report & store center head remarks
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [centerHeadRemarksData, setCenterHeadRemarksData] = useState({});
  
  // NEW: Center Head Remarks Modal state for View Reports
  const [showCenterRemarksModal, setShowCenterRemarksModal] = useState(false);
  const [selectedReportForRemarks, setSelectedReportForRemarks] = useState(null);
  
  // NEW: Placement Applicable state
  const [placementApplicable, setPlacementApplicable] = useState(null);
  const [placementCoordinator, setPlacementCoordinator] = useState('');
  const [seniorManagerPlacement, setSrmPlacement] = useState('');
  const [nationalHeadPlacement, setNationalHeadPlacement] = useState('');
  // Financial Year & Search states
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const generateFinancialYears = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    // Current FY
    let fyEndYear = currentMonth >= 4 ? currentYear + 1 : currentYear;

    // Return current FY + previous FY only (2 total)
    const fys = [];
    for (let i = 0; i < 2; i++) {
      const endYear = fyEndYear - i;
      const startYear = endYear - 1;
      fys.push({
        code: `FY${String(endYear).slice(-2)}`,
        label: `${startYear}-${endYear}`
      });
    }
    return fys;
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

  // Load Audit Users from DB for auditor dropdown
  const loadAuditors = async () => {
    try {
      setAuditorsLoading(true);
      const res = await fetch(`${API_URL}/api/users`);
      if (!res.ok) throw new Error('Failed to load users');
      const users = await res.json();
      // Sirf Audit User aur Admin role wale
      const auditors = users.filter(u => u.Role === 'Audit User' || u.Role === 'Admin');
      setAuditorsList(auditors);
      console.log('✅ Auditors loaded:', auditors.length);
    } catch (err) {
      console.error('❌ Error loading auditors:', err);
      setAuditorsList([]);
    } finally {
      setAuditorsLoading(false);
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

  // Center dropdown selection — auto-fills audit type + placement fields
  const handleCenterSelectDropdown = (selectedOption) => {
    if (!selectedOption) return;
    const center = centers.find(c => c.centerCode === selectedOption.value);
    console.log('🏢 Center Selected:', center);
    console.log('📋 Center Type:', center?.centerType);
    setSelectedCenter(center);
    setShowAuditTable(false);
    setEditableRemarks({});
    setSelectedFinancialYear('');
    if (!center) return;

    const centerType = center.centerType || 'CDC';
    const autoAuditType = centerType === 'DTV' ? 'DTV' : `Skills-${centerType}`;
    setAuditType(autoAuditType);
    initializeAuditData();

    // Auto-fill placement fields from center data
    setPlacementApplicable(center.placementApplicable || 'yes');
    setPlacementCoordinator(center.placementCoordinator || '');
    setSrmPlacement(center.seniorManagerPlacement || '');
    setNationalHeadPlacement(center.nationalHeadPlacement || '');
  };

  const handleOptionClick = (option) => {
    setActiveOption(option);
    setSelectedCenter(null);
    setShowAuditTable(false);
    setEditableRemarks({});
    setPlacementApplicable(null);
    setPlacementCoordinator('');
    setSrmPlacement('');
    setNationalHeadPlacement('');
    setSelectedFinancialYear('');
    setSearchQuery('');
    
    if (option === 'create') {
      loadCenters();
      loadAuditors();
    } else if (option === 'view' || option === 'history') {
      loadSavedReports();
    }
  };

  // Checks if a saved report `r` matches the same center + financial year (+ audit period if both have one)
  const isDuplicateReport = (r, center, financialYear, currentAuditPeriod) => {
    const dbCode = (r.centerCode || '').trim();
    const selectedCode = (center.centerCode || '').trim();
    const dbFY = (r.financialYear || '').trim();
    const selectedFY = (financialYear || '').trim();
    const dbPeriod = (r.auditPeriod || '').trim();
    const selectedPeriod = (currentAuditPeriod || '').trim();

    const sameBase = dbCode === selectedCode && dbFY === selectedFY;
    if (!sameBase) return false;
    if (dbPeriod && selectedPeriod) return dbPeriod === selectedPeriod;
    return sameBase;
  };

  // Fills the audit form state from a previously saved report (edit flow)
  const populateFromExistingReport = (existingReport) => {
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

    if (existingReport.placementApplicable) setPlacementApplicable(existingReport.placementApplicable);
    if (existingReport.placementCoordinator) setPlacementCoordinator(existingReport.placementCoordinator);
    if (existingReport.seniorManagerPlacement) setSrmPlacement(existingReport.seniorManagerPlacement);
    if (existingReport.nationalHeadPlacement) setNationalHeadPlacement(existingReport.nationalHeadPlacement);
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
        
        const found = reports.find(r => isDuplicateReport(r, center, selectedFinancialYear, selectedCenter?.auditPeriod));
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
  `⚠️ A report already exists for ${center.centerName}!\n\n` +
  `📅 Financial Year: ${selectedFinancialYear}\n` +
  `🗓️ Audit Period: ${selectedCenter?.auditPeriod || 'Same period'}\n\n` +
  '✅ Click OK to EDIT the existing report\n' +
  '❌ Click CANCEL to go back\n\n' +
  'Tip: Different audit period select karo nayi report ke liye!'
);
      
      if (!choice) {
        setSelectedCenter(null);
        setSelectedFinancialYear('');
        setShowAuditTable(false);
        return;
      }
      
      try {
        populateFromExistingReport(existingReport);
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

  // ── EDIT REPORT from View Reports table ──
  const handleEditReport = async (report) => {
    // Switch to Create Report tab
    setActiveOption('create');
    setShowAuditTable(false);

    // Build center object directly from report data (no dependency on centers array)
    let center = centers.find(c => c.centerCode === report.centerCode);
    if (!center) {
      // Fallback: construct center from report fields
      center = {
        centerCode: report.centerCode,
        centerName: report.centerName,
        centerType: report.centerType || 'CDC',
        centerHeadName: report.centerHeadName || report.chName || '',
        projectName: report.projectName || '',
        zmName: report.zmName || '',
        regionHeadName: report.regionHeadName || '',
        areaClusterManager: report.areaClusterManager || '',
        location: report.location || '',
        auditedBy: report.auditedBy || '',
        auditPeriod: report.auditPeriod || '',
      };
    }

    // auditDate from report - convert dd/mm/yyyy or string to yyyy-mm-dd for input
    let auditDateValue = '';
    if (report.auditDateString) {
      // auditDateString is like "10/03/2026" (dd/mm/yyyy)
      const parts = report.auditDateString.split('/');
      if (parts.length === 3) {
        auditDateValue = `${parts[2]}-${parts[1]}-${parts[0]}`; // yyyy-mm-dd
      } else {
        auditDateValue = report.auditDateString;
      }
    } else if (report.auditDate) {
      auditDateValue = report.auditDate;
    }

    setSelectedCenter({ ...center, auditDate: auditDateValue });
    setSelectedFinancialYear(report.financialYear || 'FY26');

    // Load checkpoint data
    try {
      const checkpointIds = ['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5','MP6','MP7'];
      const reconstructedData = {};
      const centerHeadRemarks = {};

      checkpointIds.forEach(id => {
        if (report[id]) {
          reconstructedData[id] = report[id];
          if (report[id].centerHeadRemarks) {
            centerHeadRemarks[id] = report[id].centerHeadRemarks;
          }
        }
      });

      reconstructedData._placementApplicable = report.placementApplicable;
      setAuditData(reconstructedData);
      setCenterHeadRemarksData(centerHeadRemarks);
      setIsEditingExisting(true);

      if (report.placementApplicable) {
        setPlacementApplicable(report.placementApplicable);
      }

      // Set audit period dates if available
      if (report.auditPeriod) {
        const parts = report.auditPeriod.split(' to ');
        if (parts[0]) setAuditPeriodFrom(parts[0]);
        if (parts[1]) setAuditPeriodTo(parts[1]);
      }

    } catch (e) {
      console.error('Error loading report for edit:', e);
      alert('Error loading report data.');
      return;
    }

    setShowAuditTable(true);

    // Scroll to top
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  // Finds a checkpoint definition by id across all audit areas
  const findCheckpointById = (cpId) => {
    for (const area of auditAreas) {
      const checkpoint = area.checkpoints.find(cp => cp.id === cpId);
      if (checkpoint) return checkpoint;
    }
    return null;
  };

  // Slab-based score multiplier from a compliance percentage
  const getScoreMultiplier = (percent) => {
    if (percent >= 90) return 1.00;
    if (percent >= 70) return 0.75;
    if (percent >= 60) return 0.50;
    if (percent >= 50) return 0.25;
    return 0;
  };

  const calculateScore = (cpId, totalSamples, samplesCompliant) => {
    const total = Number.parseFloat(totalSamples) || 0;
    const compliant = Number.parseFloat(samplesCompliant) || 0;
    
    if (total === 0) return 0;
    
    const percent = (compliant / total) * 100;
    
    const checkpoint = findCheckpointById(cpId);
    if (!checkpoint) return 0;
    
    // 🚨 BINARY CHECKPOINT: Only DP1
    // DP1: 100% compliant → full score, warna ZERO
    // DP3, DP7: DP1=0 toh ZERO, otherwise PROPORTIONAL (normal slab)
    if (cpId === 'DP1' && percent < 100) return 0;
    // DP1 at 100% → falls through to normal scoring below
    
    const score = checkpoint.maxScore * getScoreMultiplier(percent);
    return Number.parseFloat(score.toFixed(2));
  };

  // DP3/DP7 are forced to 0 whenever DP1's score is 0, otherwise scored normally
  const computeCheckpointScore = (cpId, total, compliant) => {
    if (cpId === 'DP3' || cpId === 'DP7') {
      const dp1Score = auditData.DP1?.score || 0;
      if (dp1Score === 0) {
        console.log(`🚨 DP1 is ZERO! Forcing ${cpId} score to ZERO despite input...`);
        return 0;
      }
    }
    return calculateScore(cpId, total, compliant);
  };

  // Recalculates a DP3/DP7-style linked checkpoint's score into `updated`, given the new DP1 score
  const recalcLinkedScore = (prev, updated, checkpointId, dp1Score) => {
    const cpData = prev[checkpointId];
    if (!cpData) return;
    const total = Number.parseFloat(cpData.totalSamples) || 0;
    const compliant = Number.parseFloat(cpData.samplesCompliant) || 0;
    if (total > 0) {
      updated[checkpointId] = {
        ...cpData,
        score: dp1Score === 0 ? 0 : calculateScore(checkpointId, total, compliant)
      };
    }
  };

  const handleInputChange = (cpId, field, value) => {
    const newData = { ...auditData[cpId] };
    newData[field] = value;

    if (field === 'totalSamples' || field === 'samplesCompliant') {
      const total = Number.parseFloat(field === 'totalSamples' ? value : newData.totalSamples) || 0;
      const compliant = Number.parseFloat(field === 'samplesCompliant' ? value : newData.samplesCompliant) || 0;
      
      if (total > 0) {
        newData.compliantPercent = Number.parseFloat(((compliant / total) * 100).toFixed(2));
        newData.score = computeCheckpointScore(cpId, total, compliant);
      } else {
        newData.compliantPercent = 0;
        newData.score = 0;
      }
      
      // 🔗 When DP1 changes, recalculate DP3 and DP7 (NOT DP2!)
      if (cpId === 'DP1') {
        const dp1Score = newData.score;
        
        setAuditData(prev => {
          const updated = { ...prev, [cpId]: newData };
          recalcLinkedScore(prev, updated, 'DP3', dp1Score);
          recalcLinkedScore(prev, updated, 'DP7', dp1Score);
          return updated;
        });
        return;
      }
    }

    setAuditData(prev => ({ ...prev, [cpId]: newData }));
  };

  const calculateAreaTotal = (area) => {
    return area.checkpoints.reduce((sum, cp) => {
      return sum + (Number.parseFloat(auditData[cp.id]?.score) || 0);
    }, 0).toFixed(2);
  };

  const calculateGrandTotal = () => {
    let total = 0;
    auditAreas.forEach(area => {
      total += Number.parseFloat(calculateAreaTotal(area));
    });
    return total.toFixed(2);
  };

 const handleSaveReport = async () => {
    if (!selectedCenter) {
      alert('⚠️ Please select a center first!');
      return;
    }

    if (!selectedCenter.auditDate) {
      alert('⚠️ Please select Audit Date!');
      return;
    }

    const grandTotal = Number.parseFloat(calculateGrandTotal());
    const frontOfficeTotal = Number.parseFloat(calculateAreaTotal(auditAreas[0]));
    const deliveryTotal = Number.parseFloat(calculateAreaTotal(auditAreas[1]));
    const placementTotal = Number.parseFloat(calculateAreaTotal(auditAreas[2]));
    const managementTotal = Number.parseFloat(calculateAreaTotal(auditAreas[3]));
    
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
       auditedBy: selectedCenter.auditedBy || '',
       auditPeriod: selectedCenter.auditPeriod || '',
        frontOfficeScore: frontOfficeTotal,
        deliveryProcessScore: deliveryTotal,
        placementScore: placementApplicable === 'no' ? 0 : placementTotal,
        managementScore: managementTotal,
        grandTotal: grandTotal,
        auditDate: selectedCenter.auditDate 
  ? new Date(selectedCenter.auditDate).toLocaleDateString('en-GB')
  : '',
        placementApplicable: placementApplicable === 'no' ? 'no' : 'yes',
        placementCoordinator: placementApplicable === 'yes' ? placementCoordinator : '',
        seniorManagerPlacement: placementApplicable === 'yes' ? seniorManagerPlacement : '',
        nationalHeadPlacement: placementApplicable === 'yes' ? nationalHeadPlacement : '',
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
        if (report?._id) {
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

  // Merges newEmails into existingList, skipping any already present (case-insensitive)
  const mergeUniqueEmails = (existingList, newEmails) => {
    const existing = new Set(existingList.map(e => e.toLowerCase()));
    return [...existingList, ...newEmails.filter(e => !existing.has(e.toLowerCase()))];
  };

  // Fixed audit-remarks email body — no dynamic name or greeting
  const buildAuditEmailMessage = (firstname = '') => {
    const loginUrl = 'https://audit-tool-liard.vercel.app';
    const hint = firstname
      ? `Your first name in lowercase — Example: "${firstname.trim().toLowerCase()}"`
      : 'Your first name in lowercase — Example: "shivam"';
    return `Greetings,\n\nThank you to you and your entire team for the cooperation extended during the physical visit at your centre.\n\nKindly review the audit observations and share your remarks using the following login credentials:\n\nUsername Hint: ${hint}\nPassword Hint: Username@Employeecode — Example: "Shivam@202451"\n\nPlease login here to submit your remarks:\n${loginUrl}\n\nNote: You can edit and submit your remarks only once. After first submission, any changes will require Admin approval.\n\nImportant: Please fill in your remarks within 7 working days, otherwise the report will be automatically closed.\n\nIf you have any suggestions or thoughts related to the audit for further improvement, you are most welcome to share them as well.`;
  };

  // Async 1: Center user email → auto-fill toList + personalize message
  const loadCenterUserEmail = async (report) => {
    try {
      const res = await fetch(`${API_URL}/api/center-user-email/${report.centerCode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.email) {
          setToList([data.email.toLowerCase()]);
          setEmailData(prev => ({
            ...prev,
            message: buildAuditEmailMessage(data.firstname || data.username || '')
          }));
        }
      }
    } catch (err) {
      console.error('❌ Error fetching center user email:', err);
    }
  };

  // Async 2: Hierarchy emails — ALL roles → auto-add to CC
  const loadHierarchyEmails = async (report) => {
    try {
      setHierarchyLoading(true);
      const hRes = await fetch(`${API_URL}/api/hierarchy-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zmName: report.zmName || '',
          regionHeadName: report.regionHeadName || '',
          areaManager: report.areaManager || report.areaClusterManager || '',
          clusterManager: report.clusterManager || '',
          areaClusterManager: report.areaClusterManager || '',
          seniorManagerPlacement: report.seniorManagerPlacement || '',
          nationalHeadPlacement: report.nationalHeadPlacement || ''
        })
      });
      if (hRes.ok) {
        const hData = await hRes.json();
        const hierEmails = hData.emails || [];
        setHierarchyEmails(hierEmails);
        if (hierEmails.length > 0) {
          setCcList(prev => mergeUniqueEmails(prev, hierEmails));
        }
      }
    } catch (err) {
      console.error('❌ Hierarchy emails error:', err);
    } finally {
      setHierarchyLoading(false);
    }
  };

  // Async 3: Placement Coordinator → auto-add to TO (if placement applicable)
  const loadPlacementEmails = async (report) => {
    if (report.placementApplicable === 'no' || !report.placementCoordinator) return;
    try {
      const pRes = await fetch(`${API_URL}/api/hierarchy-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placementCoordinator: report.placementCoordinator || '',
          includePlacement: true
        })
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        const ppEmails = pData.emails || [];
        setPlacementEmailList(ppEmails);
        if (ppEmails.length > 0) {
          setToList(prev => mergeUniqueEmails(prev, ppEmails));
        }
      }
    } catch (err) {
      console.error('❌ Placement emails error:', err);
    }
  };

  // Async 4: All Admins → auto-add to CC
  const loadAdminEmails = async () => {
    try {
      const aRes = await fetch(`${API_URL}/api/admin-emails`);
      if (aRes.ok) {
        const aData = await aRes.json();
        const adminEmails = aData.emails || [];
        if (adminEmails.length > 0) {
          setCcList(prev => mergeUniqueEmails(prev, adminEmails));
        }
      }
    } catch (err) {
      console.error('❌ Admin emails error:', err);
    }
  };

  const handleOpenEmailForm = async (report) => {
    setSelectedReportForEmail(report);
    const gt = Number.parseFloat(report.grandTotal) || 0;
    const status = getComplianceLabel(gt);

    setEmailData({
      to: '',
      cc: '',
      subject: `Audit Report - ${report.centerName} - Score: ${gt.toFixed(2)}/100 - ${status}`,
      message: buildAuditEmailMessage('')
    });
    setShowEmailForm(true);

    // Same sequential order as before: center user → hierarchy → placement → admins
    await loadCenterUserEmail(report);
    await loadHierarchyEmails(report);
    await loadPlacementEmails(report);
    await loadAdminEmails();
  };

  // Fetches live center data, merges it onto the report, and opens the Center Remarks modal
  const openCenterRemarksModal = async (report) => {
    try {
      const cRes = await fetch(`${API_URL}/api/centers`);
      if (cRes.ok) {
        const centers = await cRes.json();
        const cData = centers.find(ct => ct.centerCode === report.centerCode);
        setSelectedReportForRemarks(cData ? {
          ...report,
          areaManager: cData.areaManager || report.areaManager || cData.areaClusterManager || report.areaClusterManager || '',
          clusterManager: cData.clusterManager || report.clusterManager || '',
          placementCoordinator: cData.placementCoordinator || report.placementCoordinator || '',
          seniorManagerPlacement: cData.seniorManagerPlacement || report.seniorManagerPlacement || '',
          nationalHeadPlacement: cData.nationalHeadPlacement || report.nationalHeadPlacement || '',
          placementApplicable: cData.placementApplicable || report.placementApplicable || 'yes',
          zmName: cData.zmName || report.zmName || '',
          regionHeadName: cData.regionHeadName || report.regionHeadName || '',
        } : report);
      } else {
        setSelectedReportForRemarks(report);
      }
    } catch (e) {
      console.error('Error merging center data for remarks view:', e);
      setSelectedReportForRemarks(report);
    }
    setShowCenterRemarksModal(true);
  };

  const handleCloseEmailForm = () => {
    setShowEmailForm(false);
    setSelectedReportForEmail(null);
    setEmailData({ to: '', cc: '', subject: '', message: '' });
    setToList([]); setCcList([]); setToInput(''); setCcInput('');
    setShowToSug(false); setShowCcSug(false);
    setHierarchyEmails([]);
    setPlacementEmailList([]);
  };

  // If the user typed an email but didn't chip it (press Enter), append it to the list
  const withTypedEmail = (list, input) => {
    const trimmed = input.trim();
    if (trimmed?.includes('@') && !list.includes(trimmed.toLowerCase())) {
      return [...list, trimmed.toLowerCase()];
    }
    return list;
  };

  // Maps a failed send-email request to a user-facing message
  const getEmailErrorMessage = (err) => {
    if (err.code === 'ECONNABORTED') return '❌ Request timed out! PDF generation might be slow. Please try again.';
    if (err.response) return '❌ Failed to send email: ' + (err.response.data?.error || err.response.statusText || 'Server error');
    if (err.request) return '❌ No response from server! Check if backend is running.';
    return '❌ Error: ' + err.message;
  };

  const handleSendEmail = async () => {
    // Collect typed but not chipped emails
    const finalToList = withTypedEmail(toList, toInput);
    const finalCcList = withTypedEmail(ccList, ccInput);

    if (finalToList.length === 0) {
      alert('⚠️ Please enter at least one recipient email!');
      return;
    }
    [...finalToList, ...finalCcList].forEach(saveEmail);

    try {
      setSendingEmail(true);
      const ccWithUser = [...finalCcList];
      if (loggedUser.email && !ccWithUser.includes(loggedUser.email.toLowerCase()))
        ccWithUser.push(loggedUser.email.toLowerCase());

      const response = await axios.post(`${API_URL}/api/send-audit-email`, {
        to: finalToList.join(', '),
        cc: ccWithUser.length > 0 ? ccWithUser.join(', ') : undefined,
        subject: emailData.subject,
        customMessage: emailData.message || '',
        reportData: selectedReportForEmail,
        hierarchyEmails: hierarchyEmails,
        placementEmail: placementEmailList.length > 0 ? placementEmailList[0] : null
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
      alert(getEmailErrorMessage(err));
    } finally {
      setSendingEmail(false);
    }
  };

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
    let count = 0;
    let d = new Date(today);
    if (today > deadline) {
      while (d > deadline) { d = new Date(d.setDate(d.getDate() - 1)); if (isWorkingDay(d)) count++; }
      return -count;
    }
    while (d < deadline) { d = new Date(d.setDate(d.getDate() + 1)); if (isWorkingDay(d)) count++; }
    return count;
  };

  // ── Small helpers extracted from the badge functions below ──
  // (same logic, just named + reused instead of copy-pasted twice)

  // Parses "DD/MM/YYYY, HH:MM:SS" style strings into a Date, or null if invalid
  const parseIndianDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split(',')[0].trim().split('/');
      if (parts.length !== 3) return null;
      const parsed = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch (e) {
      // Intentionally silent — malformed/empty date strings are expected and just mean "no date"
      return null;
    }
  };

  // Counts working days strictly between two dates (exclusive of start)
  const countWorkingDaysBetween = (startDate, endDate) => {
    let d = new Date(startDate); d.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(0, 0, 0, 0);
    let days = 0;
    while (d < end) { d = new Date(d.setDate(d.getDate() + 1)); if (isWorkingDay(d)) days++; }
    return days;
  };

  // Green/orange/red style based on how many days something took
  const getSpeedStyle = (days, goodMax, warnMax) => {
    if (days <= goodMax) return { color: '#2e7d32', bg: '#e8f5e9', border: '#4caf50' };
    if (days <= warnMax) return { color: '#e65100', bg: '#fff3e0', border: '#ff9800' };
    return { color: '#dc3545', bg: '#ffebee', border: '#dc3545' };
  };

  // Overdue / due today / warning / ok countdown badge
  const getCountdownBadge = ({ rem, warnAt, okEmoji, subLabel, overdueSub }) => {
    if (rem === null) return null;
    if (rem < 0)      return { text: `⛔ ${Math.abs(rem)}d overdue`, color: '#dc3545', bg: '#ffebee', border: '#dc3545', sub: overdueSub || '' };
    if (rem === 0)    return { text: '🚨 Due TODAY',                  color: '#dc3545', bg: '#ffebee', border: '#dc3545', sub: '' };
    if (rem <= warnAt) return { text: `⚠️ ${rem}d left`,              color: '#e65100', bg: '#fff3e0', border: '#ff9800', sub: subLabel || '' };
    return               { text: `${okEmoji} ${rem}d left`,           color: '#2e7d32', bg: '#e8f5e9', border: '#4caf50', sub: subLabel || '' };
  };

  const getAuditorDeadlineBadge = (report) => {
    // Closed
    if (report.currentStatus === 'Closed')
      return { text: '🔒 Closed', color: '#6c757d', bg: '#f8f9fa', border: '#dee2e6', sub: report.autoClosedDate ? `on ${report.autoClosedDate}` : '' };

    // Submitted / Approved — show how many working days auditor took
    if (['Pending with Supervisor','Approved'].includes(report.currentStatus)) {
      const submitDate = (report.createdAt && report.auditorDeadline) ? parseIndianDate(report.submittedDate) : null;
      if (submitDate) {
        const days = countWorkingDaysBetween(report.createdAt, submitDate);
        return { text: `✅ Done in ${days}d`, ...getSpeedStyle(days, 10, 15), sub: report.submittedDate?.split(',')[0] || '' };
      }
      return { text: '✅ Submitted', color: '#2e7d32', bg: '#e8f5e9', border: '#4caf50', sub: '' };
    }

    // Not yet submitted — show countdown
    if (!report.auditorDeadline && !report.auditorDeadlineString) return null;
    const rem = getRemainingWorkingDays(report.auditorDeadline || report.auditorDeadlineString);
    return getCountdownBadge({
      rem,
      warnAt: 3,
      okEmoji: '📅',
      subLabel: `by ${report.auditorDeadlineString || ''}`,
      overdueSub: `deadline: ${report.auditorDeadlineString || ''}`
    });
  };

  const getCenterDeadlineBadge = (report) => {
    if (!report.emailSent) return null;

    // Remarks submit ho gayi — kitne din mein kiya
    if (report.centerHeadRemarksLocked && report.centerRemarksDate && report.emailSentDate) {
      const emailDate = parseIndianDate(report.emailSentDate);
      const remarksDate = parseIndianDate(report.centerRemarksDate);
      if (emailDate && remarksDate) {
        const days = countWorkingDaysBetween(emailDate, remarksDate);
        return { text: `✅ Done in ${days}d`, ...getSpeedStyle(days, 5, 7), sub: report.centerRemarksDate?.split(',')[0] || '' };
      }
      return { text: '✅ Remarks Submitted', color: '#2e7d32', bg: '#e8f5e9', border: '#4caf50', sub: report.centerRemarksDate?.split(',')[0] || '' };
    }

    // Countdown
    if (!report.centerDeadline) return null;
    const rem = getRemainingWorkingDays(report.centerDeadline);
    return getCountdownBadge({
      rem,
      warnAt: 2,
      okEmoji: '✅',
      subLabel: `by ${report.centerDeadlineString || ''}`,
      overdueSub: ''
    });
  };

  const checkDeadlines = async () => {
    try { await fetch(`${API_URL}/api/audit-reports/check-deadlines`, { method: 'POST' }); }
    catch (e) { /* silent */ }
  };
  // ========================================

  useEffect(() => {
    if (activeOption === 'view') {
      checkDeadlines().then(() => loadSavedReports());
    }
  }, [activeOption]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Sync with Admin's IndiGo tab dropdown
  useEffect(() => {
    if (defaultOption) handleOptionClick(defaultOption);
  }, [defaultOption]);

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
    const foPercent = (Number.parseFloat(report.frontOfficeScore || 0) / foMax) * 100;
    const dpPercent = (Number.parseFloat(report.deliveryProcessScore || 0) / dpMax) * 100;
    const ppPercent = report.placementApplicable === 'no' ? null : (Number.parseFloat(report.placementScore || 0) / ppMax) * 100;
    const mpPercent = (Number.parseFloat(report.managementScore || 0) / mpMax) * 100;
    
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
    const numScore = Number.parseFloat(score || 0);
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

      {/* ── EXCEL-STYLE DROPDOWN TAB (hidden when controlled by Admin's tab) ── */}
      {!hideHeader && (
        <AuditTabDropdown
          activeOption={activeOption}
          dropOpen={dropOpen}
          setDropOpen={setDropOpen}
          handleOptionClick={handleOptionClick}
          dropRef={dropRef}
        />
      )}

      {/* CREATE REPORT */}
      {activeOption === 'create' && (
        <div className="create-user">
          <h3>📝 Create New Audit Report</h3>

          <div className="select-user" style={{ marginBottom: '25px' }}>
  <label><strong>Select Center:</strong></label>
  <Select
    value={selectedCenter ? {
      value: selectedCenter.centerCode,
      label: `${selectedCenter.centerCode} - ${selectedCenter.centerName}`
    } : null}
    onChange={handleCenterSelectDropdown}
    options={centers.map(center => ({
      value: center.centerCode,
      label: `${center.centerCode} - ${center.centerName}`
    }))}
    placeholder="-- Select a Center --"
    isClearable={true}
    isSearchable={true}
    styles={{
      control: (base) => ({
        ...base,
        padding: '8px',
        fontSize: '16px',
        borderRadius: '8px',
        border: '2px solid #667eea',
        minHeight: '50px'
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#667eea' : state.isFocused ? '#e3f2fd' : 'white',
        color: state.isSelected ? 'white' : '#333',
        padding: '12px',
        cursor: 'pointer'
      }),
      menu: (base) => ({
        ...base,
        zIndex: 9999
      })
    }}
  />
</div>

          {selectedCenter && !showAuditTable && (
            <CenterSetupForm
              selectedCenter={selectedCenter}
              setSelectedCenter={setSelectedCenter}
              placementApplicable={placementApplicable}
              placementCoordinator={placementCoordinator}
              seniorManagerPlacement={seniorManagerPlacement}
              nationalHeadPlacement={nationalHeadPlacement}
              auditorsLoading={auditorsLoading}
              auditorsList={auditorsList}
              auditType={auditType}
              setAuditType={setAuditType}
              selectedFinancialYear={selectedFinancialYear}
              setSelectedFinancialYear={setSelectedFinancialYear}
              financialYears={financialYears}
              fyDateRange={fyDateRange}
              setFyDateRange={setFyDateRange}
              auditPeriodFrom={auditPeriodFrom}
              setAuditPeriodFrom={setAuditPeriodFrom}
              auditPeriodTo={auditPeriodTo}
              setAuditPeriodTo={setAuditPeriodTo}
              handleCenterSelect={handleCenterSelect}
            />
          )}

          {showAuditTable && (
            <EditableChecklistTable
              isEditingExisting={isEditingExisting}
              auditAreas={auditAreas}
              auditData={auditData}
              handleInputChange={handleInputChange}
              centerHeadRemarksData={centerHeadRemarksData}
              calculateAreaTotal={calculateAreaTotal}
              calculateGrandTotal={calculateGrandTotal}
              handleSaveReport={handleSaveReport}
              loading={loading}
              setShowAuditTable={setShowAuditTable}
            />
          )}
        </div>
      )}

      {/* VIEW REPORTS - COMPLETE TABLE WITH RED FLAG STATUS */}
      {activeOption === 'view' && (
        <ViewReportsTabView
          savedReports={savedReports}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          getAuditStatus={getAuditStatus}
          loading={loading}
          editableRemarks={editableRemarks}
          setEditableRemarks={setEditableRemarks}
          handleSaveRemarks={handleSaveRemarks}
          handleEditReport={handleEditReport}
          handleSubmitReport={handleSubmitReport}
          getGrandTotalColor={getGrandTotalColor}
          getAuditorDeadlineBadge={getAuditorDeadlineBadge}
          getCenterDeadlineBadge={getCenterDeadlineBadge}
          handleOpenEmailForm={handleOpenEmailForm}
          isAdmin={isAdmin}
          loggedUser={loggedUser}
          setSelectedReportForRemarks={setSelectedReportForRemarks}
          setShowCenterRemarksModal={setShowCenterRemarksModal}
          loadSavedReports={loadSavedReports}
          getAreaScoreInfo={getAreaScoreInfo}
        />
      )}

      {/* Email Form Modal */}
      {showEmailForm && selectedReportForEmail && (
        <EmailFormModal
          selectedReportForEmail={selectedReportForEmail}
          handleCloseEmailForm={handleCloseEmailForm}
          toList={toList} setToList={setToList}
          toInput={toInput} setToInput={setToInput}
          showToSug={showToSug} setShowToSug={setShowToSug}
          ccList={ccList} setCcList={setCcList}
          ccInput={ccInput} setCcInput={setCcInput}
          showCcSug={showCcSug} setShowCcSug={setShowCcSug}
          getSavedEmails={getSavedEmails}
          saveEmail={saveEmail}
          emailData={emailData}
          setEmailData={setEmailData}
          handleSendEmail={handleSendEmail}
          sendingEmail={sendingEmail}
        />
      )}

      {/* CENTER HEAD REMARKS MODAL - FULL DETAILED REPORT */}
      {showCenterRemarksModal && selectedReportForRemarks && (
        <CenterRemarksModal
          selectedReportForRemarks={selectedReportForRemarks}
          setShowCenterRemarksModal={setShowCenterRemarksModal}
          setSelectedReportForRemarks={setSelectedReportForRemarks}
          getGrandTotalColor={getGrandTotalColor}
          getAuditStatus={getAuditStatus}
        />
      )}

      {/* HISTORY TAB - Year Wise Reports */}
      {activeOption === 'history' && (
        <HistoryTabView
          savedReports={savedReports}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          openCenterRemarksModal={openCenterRemarksModal}
        />
      )}

    </div>
  );
};

export default AuditManagement;