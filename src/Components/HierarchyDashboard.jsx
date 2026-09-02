import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import './HierarchyDashboard.css';

// Static config: name, weightage, maxScore for each checkpoint
const cpConfig = {
  FO1:{name:'Enquires Entered in Pulse(Y/N)',            w:'30%', m:9},
  FO2:{name:'Enrolment form available in Pulse(Y/N)',     w:'20%', m:6},
  FO3:{name:'Pre assessment Available(Y/N)',              w:'0%',  m:0},
  FO4:{name:'Documents uploaded in Pulse(Y/N)',           w:'40%', m:12},
  FO5:{name:'Availability of Marketing Material(Y/N)',    w:'10%', m:3},
  DP1:{name:'Batch file maintained for all running batches',                              w:'15%', m:6},
  DP2:{name:'Batch Heath Card available for all batches where batch duration is >= 30 days', w:'10%', m:4},
  DP3:{name:'Attendance marked in EDL sheets correctly',  w:'20%', m:8},
  DP4:{name:'BMS maintained',                             w:'5%',  m:2},
  DP5:{name:'FACT Certificate available',                 w:'10%', m:4},
  DP6:{name:'Post Assessment if applicable',              w:'5%',  m:2},
  DP7:{name:'Appraisal sheet maintained',                 w:'5%',  m:2},
  DP8:{name:'Appraisal status in Pulse',                  w:'5%',  m:2},
  DP9:{name:'Certification Status',                       w:'10%', m:4},
  DP10:{name:'Student signature for certificates',        w:'10%', m:4},
  DP11:{name:'System vs actual certificate date',         w:'5%',  m:2},
  PP1:{name:'Student Placement Response',                 w:'40%', m:6},
  PP2:{name:'CGT/Guest Lecture/Industry Visit',           w:'10%', m:1.5},
  PP3:{name:'Placement Bank & Aging',                     w:'30%', m:4.5},
  PP4:{name:'Placement Proof Upload',                     w:'20%', m:3},
  MP1:{name:'Courseware issue/LMS Usage',                 w:'20%', m:3},
  MP2:{name:'TIRM details register',                      w:'10%', m:1.5},
  MP3:{name:'Monthly Centre Review Meeting',              w:'15%', m:2.25},
  MP4:{name:'Physical asset verification',                w:'20%', m:3},
  MP5:{name:'Verification of bill authenticity',          w:'15%', m:2.25},
  MP6:{name:'Log book for Genset & Vehicle',              w:'10%', m:1.5},
  MP7:{name:'Availability and requirement of Biometric',  w:'10%', m:1.5},
};
const getCpName = (k) => cpConfig[k]?.name || k;
const getCpW    = (k) => cpConfig[k]?.w || '-';
const getCpM    = (k) => cpConfig[k]?.m ?? '-';

const CENTER_TYPE_STYLES = {
  CDC: { bg: '#e3f2fd', color: '#1565c0' },
  SDC: { bg: '#f3e5f5', color: '#6a1b9a' },
};
const getCenterTypeStyle = type => CENTER_TYPE_STYLES[type] || { bg: '#e8f5e9', color: '#2e7d32' };

const CenterTypeBadge = ({ type }) => {
  const { bg, color } = getCenterTypeStyle(type);
  return <span style={{ background: bg, color, padding: '2px 10px', borderRadius: '12px', fontWeight: '700', fontSize: '12px' }}>{type}</span>;
};

// ── ReportModal sub-pieces ──────────────────────────────
const CenterInfoGrid = ({ report }) => {
  const fields = [
    ['Center Code', <span style={{ color: '#1565c0', fontWeight: '700' }}>{report.centerCode}</span>],
    ['Center Name', report.centerName],
    ['Project Name', report.projectName],
    ['ZM Name', report.zmName],
    ['Region Head', report.regionHeadName],
    ['Area Manager', report.areaManager || report.areaClusterManager || '-'],
    ['Cluster Manager', report.clusterManager || '-'],
    ['Center Head', report.centerHeadName || report.chName || '-'],
    ['Center Type', <CenterTypeBadge type={report.centerType} />],
    ['Location', report.location],
    ['Audited By', report.auditedBy],
    ['Audit Period', report.auditPeriod],
    ['Financial Year', <span style={{ color: '#1565c0', fontWeight: '700' }}>{report.financialYear}</span>],
    ...(report.placementApplicable === 'yes' ? [
      ['Placement Coord.', report.placementCoordinator || '-'],
      ['Sr. Mgr Placement', report.seniorManagerPlacement || '-'],
      ['Natl. Head Placement', report.nationalHeadPlacement || '-'],
    ] : []),
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 20px' }}>
      {fields.map(([lbl, val]) => (
        <div key={lbl} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '12px', color: '#555', fontWeight: '600', minWidth: '100px' }}>{lbl}:</span>
          <span style={{ fontSize: '13px', color: '#222' }}>{val || '-'}</span>
        </div>
      ))}
    </div>
  );
};

const CheckpointRow = ({ k, i, cp, tdStyle, tdLeftStyle }) => (
  <tr style={{ background: i % 2 === 0 ? 'white' : '#f9f9ff' }}>
    <td style={tdStyle}>{i + 1}</td>
    <td style={tdLeftStyle}>{getCpName(k)}</td>
    <td style={tdStyle}>{getCpW(k)}</td>
    <td style={{ ...tdStyle, fontWeight: '700' }}>{getCpM(k)}</td>
    <td style={tdStyle}>{cp.totalSamples || '-'}</td>
    <td style={tdStyle}>{cp.samplesCompliant || '-'}</td>
    <td style={{ ...tdStyle, color: (cp.compliantPercent || 0) >= 80 ? '#1565c0' : '#c62828', fontWeight: '700' }}>
      {cp.compliantPercent != null ? `${cp.compliantPercent.toFixed ? cp.compliantPercent.toFixed(2) : cp.compliantPercent}%` : '-'}
    </td>
    <td style={{ ...tdStyle, fontWeight: '800', color: (cp.score || 0) > 0 ? '#1565c0' : '#333' }}>
      {cp.score != null ? (cp.score.toFixed ? cp.score.toFixed(0) : cp.score) : '0'}
    </td>
    <td style={{ ...tdLeftStyle, color: '#444' }}>{cp.remarks || '-'}</td>
    <td style={{ ...tdLeftStyle, background: cp.centerHeadRemarks ? '#f1fff4' : '#fafafa', color: cp.centerHeadRemarks ? '#2e7d32' : '#aaa', fontStyle: cp.centerHeadRemarks ? 'normal' : 'italic' }}>
      {cp.centerHeadRemarks || 'No remarks from Center Head'}
    </td>
  </tr>
);

const AreaSection = ({ area, report, tdStyle, tdLeftStyle }) => (
  <tbody>
    <tr>
      <td colSpan={10} style={{ background: 'linear-gradient(90deg, #5e35b1, #7e57c2)', color: 'white', padding: '9px 14px', fontWeight: '700', fontSize: '14px' }}>
        Area {area.num}: {area.name} (Total Score: {area.max})
      </td>
    </tr>

    {area.isNA ? (
      <tr><td colSpan={10} style={{ ...tdStyle, color: '#888', fontStyle: 'italic', padding: '14px' }}>Placement Process — Not Applicable</td></tr>
    ) : (
      area.keys.map((k, i) => <CheckpointRow key={k} k={k} i={i} cp={report[k] || {}} tdStyle={tdStyle} tdLeftStyle={tdLeftStyle} />)
    )}

    {!area.isNA && (
      <tr style={{ background: '#f0f0f0' }}>
        <td colSpan={7} style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#555', paddingRight: '16px' }}>
          {area.name} Total:
        </td>
        <td style={{ ...tdStyle, fontWeight: '800', fontSize: '15px', background: '#fff9c4', color: parseFloat(area.totalScore||0) >= area.max*0.8 ? '#2e7d32' : '#e65100' }}>
          {parseFloat(area.totalScore || 0).toFixed(2)} / {area.max}
        </td>
        <td colSpan={2} style={tdStyle}></td>
      </tr>
    )}
  </tbody>
);

const CheckpointTable = ({ areas, report, score, statusColor, auditStatus }) => {
  const thStyle = { padding: '10px 8px', background: '#7b7b7b', color: 'white', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center', border: '1px solid #999', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '8px 6px', fontSize: '12px', color: '#333', border: '1px solid #e0e0e0', textAlign: 'center', verticalAlign: 'middle' };
  const tdLeftStyle = { ...tdStyle, textAlign: 'left' };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '40px' }}>S.NO</th>
            <th style={{ ...thStyle, textAlign: 'left', minWidth: '260px' }}>CHECKPOINT</th>
            <th style={{ ...thStyle, width: '80px' }}>WEIGHTAGE (%)</th>
            <th style={{ ...thStyle, width: '70px' }}>MAX SCORE</th>
            <th style={{ ...thStyle, width: '80px' }}>TOTAL SAMPLES</th>
            <th style={{ ...thStyle, width: '90px' }}>SAMPLES COMPLIANT</th>
            <th style={{ ...thStyle, width: '80px' }}>COMPLIANT %</th>
            <th style={{ ...thStyle, width: '70px' }}>SCORE</th>
            <th style={{ ...thStyle, textAlign: 'left', minWidth: '160px' }}>REMARKS (AUDITOR)</th>
            <th style={{ ...thStyle, textAlign: 'left', minWidth: '160px', background: '#2e7d32' }}>CENTER HEAD REMARKS</th>
          </tr>
        </thead>

        {areas.map(area => <AreaSection key={area.name} area={area} report={report} tdStyle={tdStyle} tdLeftStyle={tdLeftStyle} />)}

        <tbody>
          <tr style={{ background: '#e8f5e9' }}>
            <td colSpan={7} style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', fontSize: '15px', paddingRight: '16px', color: '#1a237e' }}>
              🎯 GRAND TOTAL:
            </td>
            <td style={{ ...tdStyle, fontWeight: '900', fontSize: '18px', color: statusColor, background: '#fff' }}>
              {score.toFixed(2)} / 100
            </td>
            <td colSpan={2} style={{ ...tdStyle, fontWeight: '700', color: statusColor }}>
              {auditStatus}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const RemarksSection = ({ report }) => {
  if (!report.remarksText && !report.centerRemarks) return null;
  return (
    <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
      {report.remarksText && (
        <div style={{ flex: 1, minWidth: '200px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '5px' }}>AUDITOR REMARKS</div>
          <div style={{ fontSize: '13px', color: '#333' }}>{report.remarksText}</div>
        </div>
      )}
      {report.centerRemarks && (
        <div style={{ flex: 1, minWidth: '200px', background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '5px' }}>CENTER HEAD REMARKS</div>
          <div style={{ fontSize: '13px', color: '#333' }}>{report.centerRemarks}</div>
        </div>
      )}
    </div>
  );
};

// ── EXACT IMAGE-2 STYLE MODAL ──────────────────────────
const ReportModal = ({ report, onClose }) => {
  if (!report) return null;
  const score = parseFloat(report.grandTotal) || 0;
  const auditStatus = score >= 80 ? 'Compliant' : score >= 65 ? 'Amber' : 'Non-Compliant';
  const statusColor = score >= 80 ? '#4caf50' : score >= 65 ? '#ff9800' : '#f44336';

  const areas = [
    { num: 1, name: 'Front Office', keys: ['FO1','FO2','FO3','FO4','FO5'], totalScore: report.frontOfficeScore, max: 30 },
    { num: 2, name: 'Delivery Process', keys: ['DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11'], totalScore: report.deliveryProcessScore, max: 40 },
    { num: 3, name: 'Placement Process', keys: ['PP1','PP2','PP3','PP4'], totalScore: report.placementScore, max: 15, isNA: report.placementApplicable === 'no' },
    { num: 4, name: 'Management Process', keys: ['MP1','MP2','MP3','MP4','MP5','MP6','MP7'], totalScore: report.managementScore, max: 15 },
  ];

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '1100px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>

        {/* ── GREEN HEADER exactly like Image 2 ── */}
        <div style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white' }}>
              📊 Complete Audit Report - Detailed View
            </h3>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
              {report.centerName} ({report.centerCode})
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>

          {/* ── CENTER INFO BOX exactly like Image 2 ── */}
          <div style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%)', border: '1px solid #b0bec5', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#1565c0', fontSize: '15px', fontWeight: '700', textAlign: 'center' }}>📋 Center Information</h4>
            <CenterInfoGrid report={report} />
            {/* Bottom row: Audit Date, Grand Total, Status */}
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #b0bec5', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
              <div><span style={{ fontSize: '12px', color: '#555', fontWeight: '600' }}>Audit Date: </span><span style={{ fontSize: '13px', fontWeight: '600' }}>{report.auditDateString || '-'}</span></div>
              <div><span style={{ fontSize: '12px', color: '#555', fontWeight: '600' }}>Grand Total: </span><span style={{ fontSize: '15px', fontWeight: '800', color: statusColor }}>{score.toFixed(2)}/100</span></div>
              <div><span style={{ fontSize: '12px', color: '#555', fontWeight: '600' }}>Status: </span>
                <span style={{ background: score>=80?'#e8f5e9':score>=65?'#fff3e0':'#fce4ec', color: statusColor, padding: '2px 10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', border: `1px solid ${statusColor}` }}>
                  {auditStatus}
                </span>
              </div>
            </div>
          </div>

          {/* ── CHECKPOINT TABLE ── */}
          <CheckpointTable areas={areas} report={report} score={score} statusColor={statusColor} auditStatus={auditStatus} />

          {/* Remarks section if any */}
          <RemarksSection report={report} />
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0, background: '#fafafa' }}>
          <button onClick={onClose} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', padding: '10px 30px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
            ✓ Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── MAIN DASHBOARD sub-pieces ──────────────────────────
const ROLE_LABELS = {
  'Zonal Manager':'🗺️ Zonal Manager','Region Head':'📍 Region Head','Area Manager':'🏘️ Area Manager',
  'Cluster Manager':'🏘️ Cluster Manager','Operation Head':'🏢 Operation Head','Placement Coordinator':'📋 Placement Coordinator',
  'Senior Manager Placement':'🏆 Senior Manager Placement','National Head Placement':'🎯 National Head Placement',
};
const getRoleLabel = (role) => ROLE_LABELS[role] || role;

const STATUS_BADGE_STYLES = {
  'Approved': ['#e8f5e9','#2e7d32','✅ Approved'],
  'Pending with Supervisor': ['#fff3e0','#e65100','⏳ Pending'],
  'Not Submitted': ['#fce4ec','#c62828','📝 Not Submitted'],
  'Closed': ['#ede7f6','#4527a0','🔒 Closed'],
  'Sent Back': ['#e3f2fd','#1565c0','↩️ Sent Back'],
};
const getStatusBadge = (status) => {
  const [bg,color,label] = STATUS_BADGE_STYLES[status] || ['#f5f5f5','#333',status||'-'];
  return <span style={{background:bg,color,padding:'3px 10px',borderRadius:'12px',fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap'}}>{label}</span>;
};

const getAuditLabel = (score) => score >= 80 ? 'Compliant' : score >= 65 ? 'Amber' : 'Non-Compliant';

const AUDIT_LABEL_COLORS = (s) => s>=80 ? ['#e8f5e9','#2e7d32'] : s>=65 ? ['#fff3e0','#e65100'] : ['#fce4ec','#c62828'];

const getScoreBadge = (score) => {
  const s = score||0;
  if(s>=80) return <span style={{color:'#2e7d32',fontWeight:'700'}}>{s.toFixed(1)} ✅</span>;
  if(s>=65) return <span style={{color:'#e65100',fontWeight:'700'}}>{s.toFixed(1)} 🟡</span>;
  return <span style={{color:'#c62828',fontWeight:'700'}}>{s.toFixed(1)} ❌</span>;
};

// Which columns to show is role-dependent but the same for every row, so
// it's computed once by the parent and passed down instead of being
// re-evaluated (with a chain of role comparisons) inside every row.
const getVisibleColumns = (role) => ({
  showZM: role === 'Operation Head',
  showRegionHead: role === 'Operation Head' || role === 'Zonal Manager',
  showAreaCluster: role === 'Operation Head' || role === 'Zonal Manager' || role === 'Region Head',
});

// A flat rule table instead of a 4-deep ternary chain for the remarks
// submission-status badge — this alone was most of L391's complexity.
const REMARKS_STATUS_RULES = [
  { test: r => r.remarksEditedOnce, bg:'#fce4ec', color:'#c62828', border:'#ef9a9a', label:'🔒 Perm. Locked' },
  { test: r => r.centerHeadRemarksLocked && r.centerRemarksDate, bg:'#ede7f6', color:'#4527a0', border:'#7b1fa2', label:'🔒 Submitted' },
  { test: r => r.centerHeadEditRequest, bg:'#dbeafe', color:'#1e40af', border:'#3b82f6', label:'✏️ Edit Req.' },
  { test: r => r.centerRemarksDate, bg:'#e8f5e9', color:'#2e7d32', border:'#4caf50', label:'✅ Submitted' },
];
const DEFAULT_REMARKS_STATUS = { bg:'#fff8e1', color:'#f57f17', border:'#fbc02d', label:'⏳ Pending' };
const getRemarksStatus = (r) => (REMARKS_STATUS_RULES.find(rule => rule.test(r)) || DEFAULT_REMARKS_STATUS);

const RemarksStatusBadge = ({ report }) => {
  const { bg, color, border, label } = getRemarksStatus(report);
  return <span style={{padding:'3px 10px',borderRadius:'12px',fontSize:'12px',fontWeight:'700',background:bg,color,border:`1px solid ${border}`}}>{label}</span>;
};

// One row of the reports table — extracted from the previous inline
// .map() callback (role-based column ternaries + a 4-deep status ternary
// chain) to keep this file's cognitive complexity down.
const ReportRow = ({ r, idx, columns, onView }) => {
  const s = r.grandTotal || 0;
  const al = getAuditLabel(s);
  const [acBg, acColor] = AUDIT_LABEL_COLORS(s);
  return (
    <tr className={idx%2===0?'row-even':'row-odd'}>
      <td>{idx+1}</td>
      <td><strong style={{color:'#3949ab'}}>{r.centerCode}</strong></td>
      <td>{r.centerName}</td>
      <td><span className={`type-badge type-${r.centerType?.toLowerCase()}`}>{r.centerType}</span></td>
      <td>{r.location||'-'}</td>
      {columns.showZM && <td>{r.zmName||'-'}</td>}
      {columns.showRegionHead && <td>{r.regionHeadName||'-'}</td>}
      {columns.showAreaCluster && <td>{r.areaManager||r.areaClusterManager||'-'}</td>}
      {columns.showAreaCluster && <td>{r.clusterManager||'-'}</td>}
      <td>{r.financialYear}</td>
      <td>{r.auditPeriod||'-'}</td>
      <td>{getScoreBadge(s)}</td>
      <td><span style={{padding:'3px 10px',borderRadius:'12px',fontSize:'12px',fontWeight:'600',background:acBg,color:acColor}}>{al}</span></td>
      <td>{getStatusBadge(r.currentStatus)}</td>
      <td><RemarksStatusBadge report={r} /></td>
      <td>
        <button onClick={() => onView(r)}
          style={{background:'linear-gradient(135deg,#11998e,#38ef7d)',color:'white',border:'none',padding:'6px 14px',borderRadius:'6px',cursor:'pointer',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap'}}>
          👁️ View
        </button>
      </td>
    </tr>
  );
};

// ── MAIN DASHBOARD ──────────────────────────────────────
const HierarchyDashboard = () => {
  const navigate = useNavigate();
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
  const role = loggedUser.Role || '';
  const fullName = `${loggedUser.firstname || ''} ${loggedUser.lastname || ''}`.trim();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterFY, setFilterFY] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCenterType, setFilterCenterType] = useState('All');
  const [filterAuditStatus, setFilterAuditStatus] = useState('All');
  const [searchCenter, setSearchCenter] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [stats, setStats] = useState({ total: 0, compliant: 0, amber: 0, nonCompliant: 0, avgScore: 0 });

  const FY_OPTIONS = ['All', 'FY26', 'FY25', 'FY24'];
  const STATUS_OPTIONS = ['All', 'Not Submitted', 'Pending with Supervisor', 'Approved', 'Closed', 'Sent Back'];
  const CENTER_TYPE_OPTIONS = ['All', 'CDC', 'SDC', 'DTV'];

  useEffect(() => {
    if (!loggedUser?.username) { alert('Unauthorized!'); navigate('/'); return; }
    const allowed = ['Zonal Manager', 'Region Head', 'Area Manager', 'Cluster Manager', 'Operation Head', 'Placement Coordinator', 'Senior Manager Placement', 'National Head Placement'];
    if (!allowed.includes(role)) { alert('Unauthorized!'); navigate('/'); return; }
    loadReports();
  }, []);

  useEffect(() => { loadReports(); }, [filterFY, filterStatus, filterCenterType]);

  const loadReports = async () => {
    try {
      setLoading(true); setError('');
      const params = new URLSearchParams({ role, name: fullName, firstname: loggedUser.firstname || '', fy: filterFY, status: filterStatus, centerType: filterCenterType });
      const res = await fetch(`${API_URL}/api/hierarchy-reports?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports(data);
      const total = data.length;
      const compliant = data.filter(r => (r.grandTotal||0) >= 80).length;
      const amber = data.filter(r => (r.grandTotal||0) >= 65 && (r.grandTotal||0) < 80).length;
      const nonCompliant = data.filter(r => (r.grandTotal||0) < 65).length;
      const avgScore = total > 0 ? (data.reduce((s,r) => s+(r.grandTotal||0),0)/total).toFixed(1) : 0;
      setStats({ total, compliant, amber, nonCompliant, avgScore });
    } catch { setError('Failed to load reports.'); }
    finally { setLoading(false); }
  };

  const filteredReports = reports.filter(r => {
    if (searchCenter) {
      const q = searchCenter.toLowerCase();
      if (!r.centerCode?.toLowerCase().includes(q) && !r.centerName?.toLowerCase().includes(q) && !r.location?.toLowerCase().includes(q)) return false;
    }
    if (filterAuditStatus !== 'All' && getAuditLabel(r.grandTotal||0) !== filterAuditStatus) return false;
    return true;
  });

  const columns = getVisibleColumns(role);

  return (
    <div className="hierarchy-container">
      {selectedReport && <ReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />}

      <header className="hierarchy-header">
        <div className="header-left">
          <h1>📊 Hierarchy Dashboard</h1>
          <span className="role-badge">{getRoleLabel(role)}</span>
        </div>
        <div className="header-right">
          <span className="welcome-text">👋 Welcome, {loggedUser.firstname}</span>
          <button className="logout-btn" onClick={() => { localStorage.removeItem('loggedUser'); navigate('/'); }}>🚪 Logout</button>
        </div>
      </header>

      {/* CLICKABLE STATS */}
      <div className="stats-grid">
        {[
          { key: 'All', num: stats.total, label: 'Total Centers', cls: 'total' },
          { key: 'Compliant', num: stats.compliant, label: '✅ Compliant', cls: 'compliant' },
          { key: 'Amber', num: stats.amber, label: '🟡 Amber', cls: 'amber' },
          { key: 'Non-Compliant', num: stats.nonCompliant, label: '❌ Non-Compliant', cls: 'non-compliant' },
        ].map(s => (
          <div key={s.key} onClick={() => setFilterAuditStatus(prev => prev === s.key ? 'All' : s.key)}
            className={`stat-card ${s.cls} ${filterAuditStatus === s.key ? 'active-card' : ''}`}
            style={{ cursor: 'pointer' }}>
            <div className="stat-number">{s.num}</div>
            <div className="stat-label">{s.label}</div>
            {filterAuditStatus === s.key && s.key !== 'All' && <div className="active-hint">● Filtered</div>}
          </div>
        ))}

      </div>

      {/* FILTERS */}
      <div className="filters-bar">
        <div className="filter-group"><label>📅 Financial Year</label>
          <select value={filterFY} onChange={e => setFilterFY(e.target.value)}>{FY_OPTIONS.map(f => <option key={f}>{f}</option>)}</select></div>
        <div className="filter-group"><label>📋 Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
        <div className="filter-group"><label>🏢 Center Type</label>
          <select value={filterCenterType} onChange={e => setFilterCenterType(e.target.value)}>{CENTER_TYPE_OPTIONS.map(c => <option key={c}>{c}</option>)}</select></div>
        <div className="filter-group search-group"><label>🔍 Search Center</label>
          <input type="text" placeholder="Code, name or location..." value={searchCenter} onChange={e => setSearchCenter(e.target.value)} /></div>
        <button className="refresh-btn" onClick={loadReports} disabled={loading}>{loading ? '⏳' : '🔄 Refresh'}</button>
      </div>

      {filterAuditStatus !== 'All' && (
        <div style={{ padding: '0 28px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#e8eaf6', color: '#3949ab', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>Showing: {filterAuditStatus}</span>
          <button onClick={() => setFilterAuditStatus('All')} style={{ background: 'none', border: '1px solid #ccc', borderRadius: '20px', padding: '3px 10px', cursor: 'pointer', fontSize: '12px', color: '#666' }}>✕ Clear</button>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="table-wrapper">
        {loading ? (
          <div className="loading-state"><div className="spinner"></div><p>Loading reports...</p></div>
        ) : filteredReports.length === 0 ? (
          <div className="empty-state"><p>📭 No reports found.</p><small>Try changing filters.</small></div>
        ) : (
          <table className="reports-table">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #1a237e, #3949ab)' }}>
                {['#','Center Code','Center Name','Type','Location',
                  ...(columns.showZM?['ZM']:[]),
                  ...(columns.showRegionHead?['Region Head']:[]),
                  ...(columns.showAreaCluster?['Area Mgr','Cluster Mgr']:[]),
                  'FY','Audit Period','Score','Audit Status','Submit Status','Report Status','View'
                ].map(h => (
                  <th key={h} style={{ padding:'12px 14px', color:'white', fontWeight:'700', fontSize:'12px', textTransform:'uppercase', whiteSpace:'nowrap', letterSpacing:'0.4px', textAlign:'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((r, idx) => (
                <ReportRow key={r._id||idx} r={r} idx={idx} columns={columns} onView={setSelectedReport} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filteredReports.length > 0 && (
        <div className="table-footer">Showing <strong>{filteredReports.length}</strong> of <strong>{reports.length}</strong> reports</div>
      )}
    </div>
  );
};

export default HierarchyDashboard;