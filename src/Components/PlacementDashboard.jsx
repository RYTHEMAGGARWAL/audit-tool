import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const PP_IDS = ['PP1', 'PP2', 'PP3', 'PP4'];

// Checkpoint metadata (name, weightage) — maxScore depends on placementApplicable
const CHECKPOINT_META = {
  FO1: { name: 'Enquires Entered in Pulse (Y/N)', weightage: 30 },
  FO2: { name: 'Enrolment form available in Pulse (Y/N)', weightage: 20 },
  FO3: { name: 'Pre assessment Available (Y/N)', weightage: 0 },
  FO4: { name: 'Documents uploaded in Pulse (Y/N)', weightage: 40 },
  FO5: { name: 'Availability of Marketing Material (Y/N)', weightage: 10 },
  DP1:  { name: 'Batch file maintained for all running batches', weightage: 15 },
  DP2:  { name: 'Batch Health Card available', weightage: 10 },
  DP3:  { name: 'Attendance marked in EDL sheets correctly', weightage: 15 },
  DP4:  { name: 'BMS maintained with observations', weightage: 5 },
  DP5:  { name: 'FACT Certificate available at Center', weightage: 10 },
  DP6:  { name: 'Post Assessment if applicable', weightage: 0 },
  DP7:  { name: 'Appraisal sheet is maintained', weightage: 10 },
  DP8:  { name: 'Appraisal status updated in Pulse', weightage: 5 },
  DP9:  { name: 'Certification Status of eligible students', weightage: 10 },
  DP10: { name: 'Student signature obtained while issuing certificates', weightage: 10 },
  DP11: { name: 'Verification between System vs actual certificate date', weightage: 10 },
  PP1: { name: 'Student Placement Response', weightage: 15 },
  PP2: { name: 'CGT/Guest Lecture/Industry Visit', weightage: 10 },
  PP3: { name: 'Placement Bank & Aging', weightage: 15 },
  PP4: { name: 'Placement Proof Upload', weightage: 60 },
  MP1: { name: 'Courseware issue to students done on time / Usage of LMS', weightage: 5 },
  MP2: { name: 'Log book for Genset & Vehicle (Y/N)', weightage: 20 },
  MP3: { name: 'TIRM details register', weightage: 30 },
  MP4: { name: 'Availability and requirement of Biometric as per MOU', weightage: 25 },
  MP5: { name: 'Physical asset verification', weightage: 10 },
  MP6: { name: 'Monthly Centre Review Meeting is conducted', weightage: 5 },
  MP7: { name: 'Verification of bill authenticity', weightage: 5 },
};

const getMaxScore = (cpId, placementApplicable) => {
  const isNA = placementApplicable === 'no';
  const map = {
    FO1: isNA ? 10.5 : 9,   FO2: isNA ? 7 : 6,    FO3: 0,
    FO4: isNA ? 14 : 12,    FO5: isNA ? 3.5 : 3,
    DP1: isNA ? 6.75 : 6,   DP2: isNA ? 4.5 : 4,   DP3: isNA ? 6.75 : 6,
    DP4: isNA ? 2.25 : 2,   DP5: isNA ? 4.5 : 4,   DP6: 0,
    DP7: isNA ? 4.5 : 4,    DP8: isNA ? 2.25 : 2,  DP9: isNA ? 4.5 : 4,
    DP10: isNA ? 4.5 : 4,   DP11: isNA ? 4.5 : 4,
    PP1: 2.25, PP2: 1.50,   PP3: 2.25, PP4: 9.00,
    MP1: isNA ? 1.25 : 0.75, MP2: isNA ? 5 : 3,    MP3: isNA ? 7.5 : 4.5,
    MP4: isNA ? 6.25 : 3.75, MP5: isNA ? 2.5 : 1.5,
    MP6: isNA ? 1.25 : 0.75, MP7: isNA ? 1.25 : 0.75,
  };
  return map[cpId] ?? '-';
};

// ── Edit request 3-working-day window helpers ──
const HOLIDAYS = {
  2025: ['2025-01-26','2025-03-14','2025-04-14','2025-04-18','2025-05-01',
         '2025-08-15','2025-08-16','2025-10-02','2025-10-20','2025-11-05','2025-12-25'],
  2026: ['2026-01-26','2026-03-03','2026-04-03','2026-04-14','2026-05-01',
         '2026-08-15','2026-09-04','2026-10-02','2026-10-19','2026-11-08',
         '2026-11-24','2026-12-25']
};
const isWorkingDay = (d) => {
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  const ds = d.toISOString().split('T')[0];
  return !(HOLIDAYS[d.getFullYear()] || []).includes(ds);
};
const getRemainingWorkingDays = (deadlineDate) => {
  if (!deadlineDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const deadline = new Date(deadlineDate); deadline.setHours(0,0,0,0);
  let count = 0, d = new Date(today);
  if (today > deadline) {
    while (d > deadline) { d.setDate(d.getDate()-1); if (isWorkingDay(d)) count++; }
    return -count;
  }
  while (d < deadline) { d.setDate(d.getDate()+1); if (isWorkingDay(d)) count++; }
  return count;
};
// Returns deadline Date (3 working days from placementRemarksDate)
const getEditDeadline = (dateStr) => {
  if (!dateStr) return null;
  let base = null;
  try {
    const parts = dateStr.split(',')[0].trim().split('/');
    if (parts.length === 3) base = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    else base = new Date(dateStr);
  } catch(e) { return null; }
  if (!base || isNaN(base)) return null;
  let d = new Date(base); d.setHours(0,0,0,0);
  let count = 0;
  while (count < 3) { d.setDate(d.getDate()+1); if (isWorkingDay(d)) count++; }
  return d;
};
const getEditWindowBadge = (dateStr) => {
  const dl = getEditDeadline(dateStr);
  if (!dl) return null;
  const rem = getRemainingWorkingDays(dl);
  if (rem === null) return null;
  if (rem < 0) return { text: '🔒 Edit Window Closed', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
  if (rem === 0) return { text: '🚨 Last day to request edit!', color: '#dc3545', bg: '#ffebee', border: '#dc3545' };
  if (rem <= 1) return { text: `⚠️ ${rem}d left to request edit`, color: '#e65100', bg: '#fff3e0', border: '#ff9800' };
  return { text: `⏰ ${rem}d left to request edit`, color: '#2e7d32', bg: '#e8f5e9', border: '#4caf50' };
};

const ALL_AREAS = [
  { label: 'Front Office', keys: ['FO1','FO2','FO3','FO4','FO5'] },
  { label: 'Delivery Process', keys: ['DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11'] },
  { label: 'Placement Process', keys: ['PP1','PP2','PP3','PP4'], isPlacement: true },
  { label: 'Management Process', keys: ['MP1','MP2','MP3','MP4','MP5','MP6','MP7'] },
];

const PlacementDashboard = () => {
  const navigate = useNavigate();
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [ppRemarks, setPpRemarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitted, setSubmitted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [editedOnce, setEditedOnce] = useState(false);
  const [centerHeadLocked, setCenterHeadLocked] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [remarksDate, setRemarksDate] = useState('');
  const [chSubmitted, setChSubmitted] = useState(false); // CH ne submit kiya ya nahi

  useEffect(() => {
    if (loggedUser?.Role !== 'Placement Coordinator') {
      alert('Unauthorized!'); navigate('/'); return;
    }
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const fullName = `${loggedUser.firstname} ${loggedUser.lastname}`.trim();
      const res = await fetch(`${API_URL}/api/hierarchy-reports?role=Placement Coordinator&name=${encodeURIComponent(fullName)}&firstname=${encodeURIComponent(loggedUser.firstname || '')}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.filter(r => r.placementApplicable !== 'no'));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleViewReport = async (report) => {
    setSelectedReport(report);
    setSubmitted(false); setLocked(false); setEditedOnce(false); setCenterHeadLocked(false); setChSubmitted(false);
    try {
      const res = await fetch(`${API_URL}/api/audit-reports/${report._id}/placement-status`);
      if (res.ok) {
        const data = await res.json();
        const existingRemarks = {};
        PP_IDS.forEach(id => { if (data[id]?.centerHeadRemarks) existingRemarks[id] = data[id].centerHeadRemarks; });
        setPpRemarks(existingRemarks);
        setSubmitted(data.placementRemarksSubmitted || false);
        setLocked(data.placementRemarksLocked || false);
        setEditedOnce(data.placementRemarksEditedOnce || false);
        setCenterHeadLocked(data.centerHeadRemarksLocked || false);
        setRequestPending(data.placementEditRequest || false);
        setRemarksDate(data.placementRemarksDate || '');
        setChSubmitted(!!data.centerRemarksDate && (data.centerHeadRemarksLocked || false)); // CH submitted AND locked
      }
    } catch (e) { setPpRemarks({}); }
  };

  const handleSave = async () => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      const fullName = `${loggedUser.firstname} ${loggedUser.lastname}`.trim();
      const res = await fetch(`${API_URL}/api/audit-reports/${selectedReport._id}/placement-remarks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placementRemarks: ppRemarks, submittedBy: fullName })
      });
      if (res.ok) {
        const result = await res.json();
        setSubmitted(true);
        setLocked(result.locked || true);
        if (result.editedOnce) setEditedOnce(true);
        // Update remarksDate so next submit detected as 2nd
        setRemarksDate(new Date().toLocaleString('en-GB'));
        showMsg('✅ Placement remarks submitted successfully!', 'success');
        loadReports();
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.permanentlyLocked) showMsg('🔒 Permanently locked. No further edits allowed.', 'error');
        else if (err.centerHeadLocked) showMsg('🔒 Center Head has submitted. Locked permanently.', 'error');
        else if (err.requestPending) showMsg('⏳ Edit request pending admin approval.', 'error');
        else showMsg('❌ ' + (err.error || 'Failed'), 'error');
        // Refresh state from server
        handleViewReport(selectedReport);
      }
    } catch (e) { showMsg('❌ Error saving', 'error'); }
    setSaving(false);
  };

  const handleRequestEdit = async () => {
    if (!selectedReport) return;
    if (!window.confirm('Request edit permission from admin?')) return;
    try {
      const fullName = `${loggedUser.firstname} ${loggedUser.lastname}`.trim();
      const res = await fetch(`${API_URL}/api/audit-reports/${selectedReport._id}/request-placement-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinatorName: fullName })
      });
      if (res.ok) {
        setRequestPending(true);
        showMsg('✅ Edit request sent to admin!', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.permanentlyLocked) showMsg('🔒 Permanently locked. No edit requests allowed.', 'error');
        else if (err.alreadyPending) showMsg('⏳ Request already pending admin approval.', 'error');
        else if (err.centerHeadLocked) showMsg('🔒 Center Head submitted. Cannot request edit.', 'error');
        else showMsg('❌ ' + (err.error || 'Failed'), 'error');
      }
    } catch (e) { showMsg('❌ Network error', 'error'); }
  };

  const showMsg = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const getScore = (r) => parseFloat(r.grandTotal || 0);
  const getStatusColor = (s) => s >= 80 ? '#2e7d32' : s >= 65 ? '#e65100' : '#c62828';
  const getStatusLabel = (s) => s >= 80 ? 'Compliant' : s >= 65 ? 'Amber' : 'Non-Compliant';
  const isLocked = (chSubmitted && centerHeadLocked) || editedOnce || requestPending;

  const thStyle = { padding: '10px 12px', background: 'linear-gradient(135deg, #1a237e, #3949ab)', color: 'white', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #f0f0f0', fontSize: '13px', textAlign: 'center', verticalAlign: 'middle' };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a237e, #3949ab)', color: 'white', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 3px 12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '22px', fontWeight: '700' }}>📋 Placement Dashboard</span>
          <span style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>PLACEMENT COORDINATOR</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', opacity: 0.9 }}>👋 Welcome, {loggedUser.firstname}</span>
          <button onClick={() => { localStorage.removeItem('loggedUser'); navigate('/'); }}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', padding: '7px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Toast */}
      {message.text && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, padding: '14px 20px', borderRadius: '8px', color: 'white', fontWeight: '600', background: message.type === 'success' ? '#11998e' : '#eb3349', boxShadow: '0 5px 20px rgba(0,0,0,0.3)' }}>
          {message.text}
        </div>
      )}

      <div style={{ padding: '24px 28px' }}>
        {selectedReport ? (
          /* ── FULL AUDIT REPORT MODAL ── */
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1a237e', fontSize: '20px' }}>📋 Complete Audit Report</h2>
                <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>{selectedReport.centerName} ({selectedReport.centerCode}) — {selectedReport.financialYear}</p>
              </div>
              <button onClick={() => setSelectedReport(null)}
                style={{ background: '#f5f5f5', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                ← Back
              </button>
            </div>

            {/* ── Status Banners — Priority order ── */}

            {/* CASE 1: CH submitted → Placement permanently locked */}
            {chSubmitted && (
              <div style={{ background: '#ede7f6', border: '2px solid #7b1fa2', borderRadius: '8px', padding: '14px 18px', marginBottom: '16px', color: '#4527a0', fontWeight: '700', fontSize: '14px' }}>
                🔒 Center Head has submitted remarks. Placement remarks are permanently locked.
              </div>
            )}

            {/* CASE 2: Own permanent lock (edited once) */}
            {!chSubmitted && editedOnce && (
              <div style={{ background: '#fce4ec', border: '2px solid #ef9a9a', borderRadius: '8px', padding: '14px 18px', marginBottom: '16px', color: '#c62828', fontWeight: '700', fontSize: '14px' }}>
                🔒 Permanently locked — you have already used your one edit. No further edits allowed.
              </div>
            )}

            {/* CASE 3: Edit request pending */}
            {!chSubmitted && !editedOnce && requestPending && (
              <div style={{ background: '#dbeafe', border: '2px solid #3b82f6', borderRadius: '8px', padding: '14px 18px', marginBottom: '16px', color: '#1e40af', fontWeight: '700', fontSize: '14px' }}>
                ⏳ Edit request sent to admin — awaiting approval.
              </div>
            )}

            {/* CASE 4: Locked after 1st submit — show timer */}
            {!chSubmitted && !editedOnce && !requestPending && locked && submitted && (() => {
              const badge = getEditWindowBadge(remarksDate);
              const isExpired = badge?.text?.includes('Closed');
              return (
                <div style={{ background: isExpired ? '#f1f5f9' : '#d4edda', border: `2px solid ${isExpired ? '#cbd5e1' : '#28a745'}`, borderRadius: '8px', padding: '14px 18px', marginBottom: '16px' }}>
                  <div style={{ color: isExpired ? '#64748b' : '#155724', fontWeight: '700', marginBottom: badge ? '8px' : 0, fontSize: '14px' }}>
                    ✅ Remarks submitted on {remarksDate || ''}.
                    {!isExpired && <span> You can request <strong>one more edit</strong> from admin.</span>}
                  </div>
                  {badge && (
                    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                      color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
                      {badge.text}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* CASE 5: First time — editable info */}
            {!submitted && !isLocked && (
              <div style={{ background: '#e3f2fd', border: '2px solid #2196f3', borderRadius: '8px', padding: '14px 18px', marginBottom: '16px', color: '#1565c0', fontWeight: '600', fontSize: '14px' }}>
                ℹ️ Only <strong>Placement Process (PP1–PP4)</strong> fields are editable. All other fields are read-only.
              </div>
            )}

            {/* Center Info */}
            <div style={{ background: '#e8f4fd', borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px' }}>
              {[
                ['Center Code', selectedReport.centerCode],
                ['Center Name', selectedReport.centerName],
                ['Center Type', selectedReport.centerType],
                ['ZM Name', selectedReport.zmName || '-'],
                ['Region Head', selectedReport.regionHeadName || '-'],
                ['Area Manager', selectedReport.areaManager || selectedReport.areaClusterManager || '-'],
                ['Cluster Manager', selectedReport.clusterManager || '-'],
                ['Center Head', selectedReport.centerHeadName || selectedReport.chName || '-'],
                ['Location', selectedReport.location || '-'],
                ['Audited By', selectedReport.auditedBy || '-'],
                ['Audit Period', selectedReport.auditPeriod || '-'],
                ['Financial Year', selectedReport.financialYear],
                ['Grand Total', `${parseFloat(selectedReport.grandTotal||0).toFixed(2)}/100`],
                ['Status', getStatusLabel(getScore(selectedReport))],
                ...(selectedReport.placementCoordinator ? [['Placement Coordinator', selectedReport.placementCoordinator]] : []),
                ...(selectedReport.seniorManagerPlacement ? [['Sr. Manager Placement', selectedReport.seniorManagerPlacement]] : []),
                ...(selectedReport.nationalHeadPlacement ? [['National Head Placement', selectedReport.nationalHeadPlacement]] : []),
              ].map(([lbl, val]) => (
                <div key={lbl}>
                  <span style={{ fontWeight: '700', color: '#555', fontSize: '12px' }}>{lbl}: </span>
                  <span style={{ color: '#222' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Checkpoint Table */}
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr>
                    {['S.No', 'Checkpoint', 'Weightage', 'Max Score', 'Total Samples', 'Compliant', '%', 'Score', 'Auditor Remarks', 'Your Remarks'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_AREAS.map((area) => {
                    const areaTotal = area.keys.reduce((s, k) => s + (parseFloat((selectedReport[k]||{}).score)||0), 0);
                    const isNA = area.isPlacement && selectedReport.placementApplicable === 'no';
                    return (
                      <React.Fragment key={area.label}>
                        {/* Area header */}
                        <tr>
                          <td colSpan={10} style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', color: 'white', fontWeight: '700', fontSize: '14px' }}>
                            {area.label} — Total: {isNA ? 'N/A' : areaTotal.toFixed(2)}
                            {area.isPlacement && !isLocked && !isNA && (
                              <span style={{ marginLeft: '12px', background: 'rgba(255,255,255,0.25)', padding: '2px 10px', borderRadius: '12px', fontSize: '11px' }}>✏️ Editable</span>
                            )}
                          </td>
                        </tr>
                        {isNA ? (
                          <tr><td colSpan={10} style={{ ...tdStyle, color: '#999', fontStyle: 'italic' }}>Placement Process — Not Applicable</td></tr>
                        ) : (
                          area.keys.map((cpId, i) => {
                            const cp = selectedReport[cpId] || {};
                            const meta = CHECKPOINT_META[cpId] || {};
                            const score = parseFloat(cp.score) || 0;
                            const maxScore = getMaxScore(cpId, selectedReport.placementApplicable);
                            const isEditable = area.isPlacement && !isLocked;
                            const rowBg = area.isPlacement ? (i % 2 === 0 ? '#fffbf0' : '#fff8e1') : (i % 2 === 0 ? '#fff' : '#f8f9ff');
                            return (
                              <tr key={cpId} style={{ background: rowBg }}>
                                <td style={tdStyle}>{i + 1}</td>
                                <td style={{ ...tdStyle, textAlign: 'left', fontWeight: area.isPlacement ? '600' : '400' }}>{meta.name || cpId}</td>
                                <td style={tdStyle}>{meta.weightage != null ? `${meta.weightage}%` : '-'}</td>
                                <td style={tdStyle}>{maxScore}</td>
                                <td style={tdStyle}>{cp.totalSamples || '-'}</td>
                                <td style={tdStyle}>{cp.samplesCompliant || cp.compliantSamples || '-'}</td>
                                <td style={{ ...tdStyle, color: '#667eea', fontWeight: '600' }}>{cp.compliantPercent != null ? `${parseFloat(cp.compliantPercent).toFixed(0)}%` : '0%'}</td>
                                <td style={{ ...tdStyle, fontWeight: '800', color: score > 0 ? '#2e7d32' : '#c62828' }}>{score.toFixed(2)}</td>
                                <td style={{ ...tdStyle, color: '#555', textAlign: 'left', fontSize: '12px' }}>{cp.remarks || '-'}</td>
                                <td style={{ ...tdStyle, minWidth: '180px' }}>
                                  {isEditable ? (
                                    <textarea
                                      rows={2}
                                      placeholder={`Remark for ${cpId}...`}
                                      value={ppRemarks[cpId] || ''}
                                      onChange={e => setPpRemarks(prev => ({ ...prev, [cpId]: e.target.value }))}
                                      style={{ width: '100%', padding: '6px 8px', border: '2px solid #ffcc80', borderRadius: '6px', fontSize: '12px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#fffdf5' }}
                                    />
                                  ) : area.isPlacement ? (
                                    <span style={{ color: isLocked ? '#c62828' : '#999', fontSize: '12px', fontStyle: 'italic' }}>
                                      {ppRemarks[cpId] || (cp.centerHeadRemarks ? cp.centerHeadRemarks : (isLocked ? '🔒 Locked' : 'No remarks'))}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#bbb', fontSize: '11px', fontStyle: 'italic' }}>Read only</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                        {/* Area total row */}
                        <tr style={{ background: '#dbeafe' }}>
                          <td colSpan={7} style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#1e40af' }}>{area.label} Total:</td>
                          <td colSpan={3} style={{ ...tdStyle, fontWeight: '800', color: '#1e40af', fontSize: '14px' }}>{isNA ? 'N/A' : areaTotal.toFixed(2)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Action Buttons — 4-case logic ── */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedReport(null)}
                style={{ padding: '12px 24px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                ← Back
              </button>

              {/* CASE 1: CH submitted OR permanently locked */}
              {(chSubmitted || editedOnce) && (
                <div style={{ padding: '12px 24px', background: '#f1f5f9', border: '2px solid #cbd5e1', borderRadius: '8px', color: '#64748b', fontWeight: '700', fontSize: '14px' }}>
                  🔒 {chSubmitted ? 'CH Locked — No Further Edits' : 'Permanently Locked'}
                </div>
              )}

              {/* CASE 2: Locked + request pending */}
              {!chSubmitted && !editedOnce && locked && requestPending && (
                <div style={{ padding: '12px 24px', background: '#dbeafe', border: '2px solid #3b82f6', borderRadius: '8px', color: '#1e40af', fontWeight: '700', fontSize: '14px' }}>
                  ⏳ Edit Request Pending
                </div>
              )}

              {/* CASE 3: Locked + no request → Request Edit button (3-day window) */}
              {!chSubmitted && !editedOnce && locked && !requestPending && (() => {
                const badge = getEditWindowBadge(remarksDate);
                const isExpired = badge?.text?.includes('Closed');
                if (isExpired) return (
                  <div style={{ padding: '12px 24px', background: '#f1f5f9', border: '2px solid #cbd5e1', borderRadius: '8px', color: '#64748b', fontWeight: '700', fontSize: '14px' }}>
                    🔒 Edit Window Closed (3 days expired)
                  </div>
                );
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <button onClick={handleRequestEdit}
                      style={{ padding: '12px 24px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                      ✏️ Request Edit Permission
                    </button>
                    {badge && <span style={{ fontSize: '11px', fontWeight: '700', color: badge.color }}>{badge.text}</span>}
                  </div>
                );
              })()}

              {/* CASE 4: Unlocked (first time OR admin approved edit) → Submit */}
              {!chSubmitted && !editedOnce && !locked && (
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: '12px 28px', background: saving ? '#ccc' : 'linear-gradient(135deg, #11998e, #38ef7d)', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px' }}>
                  {saving ? '⏳ Saving...' : '✅ Submit Placement Remarks'}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── REPORTS LIST ── */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1a237e' }}>📊 My Center Reports</h2>
              <button onClick={loadReports} style={{ padding: '9px 20px', background: '#3949ab', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>🔄 Refresh</button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>⏳ Loading reports...</div>
            ) : reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', color: '#999' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📭</div>
                <p style={{ fontSize: '16px', fontWeight: '500' }}>No reports found for your centers.</p>
                <small>Make sure your name is correctly set in center records.</small>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #1a237e, #3949ab)' }}>
                        {['S.No.', 'Center Code', 'Center Name', 'Type', 'FY', 'Score', 'PP Score', 'Status', 'PP Remarks', 'Action'].map(h => (
                          <th key={h} style={{ padding: '12px 14px', color: 'black', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((r, idx) => {
                        const s = getScore(r);
                        const ppSubmitted = r.placementRemarksSubmitted;
                        const chLocked = r.centerHeadRemarksLocked;
                        const ppEdited = r.placementRemarksEditedOnce;
                        const isFullLocked = chLocked || ppEdited;
                        return (
                          <tr key={r._id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8f9ff', borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '12px 14px' }}>{idx + 1}</td>
                            <td style={{ padding: '12px 14px', fontWeight: '700', color: '#3949ab' }}>{r.centerCode}</td>
                            <td style={{ padding: '12px 14px' }}>{r.centerName}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', background: r.centerType==='CDC'?'#e3f2fd':r.centerType==='SDC'?'#f3e5f5':'#e8f5e9', color: r.centerType==='CDC'?'#1565c0':r.centerType==='SDC'?'#6a1b9a':'#2e7d32' }}>{r.centerType}</span>
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: '600', color: '#1565c0' }}>{r.financialYear}</td>
                            <td style={{ padding: '12px 14px', fontWeight: '800', color: getStatusColor(s) }}>{s.toFixed(2)}</td>
                            <td style={{ padding: '12px 14px', color: '#e65100', fontWeight: '700' }}>{parseFloat(r.placementScore||0).toFixed(2)}/15</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: s>=80?'#e8f5e9':s>=65?'#fff3e0':'#fce4ec', color: getStatusColor(s) }}>
                                {getStatusLabel(s)}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {chLocked
                                ? <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', background: '#ede7f6', color: '#4527a0', border: '1px solid #7b1fa2' }}>🔒 CH Locked</span>
                                : ppEdited
                                ? <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', background: '#fce4ec', color: '#c62828', border: '1px solid #ef9a9a' }}>🔒 Perm. Locked</span>
                                : r.placementEditRequest
                                ? <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', background: '#dbeafe', color: '#1e40af', border: '1px solid #3b82f6' }}>⏳ Edit Requested</span>
                                : ppSubmitted
                                ? <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #4caf50' }}>✅ Submitted</span>
                                    {(() => { const b = getEditWindowBadge(r.placementRemarksDate); return b ? <span style={{ fontSize: '10px', fontWeight: '700', color: b.color }}>{b.text}</span> : null; })()}
                                  </div>
                                : <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', background: '#fff3cd', color: '#856404', border: '1px solid #ffc107' }}>⏳ Pending</span>
                              }
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <button
                                onClick={() => handleViewReport(r)}
                                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                                👁️ View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PlacementDashboard;