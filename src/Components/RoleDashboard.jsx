import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import './RoleDashboard.css';

const ALLOWED_ROLES = ['Zonal Manager','Region Head','Area Manager','Cluster Manager','Senior Manager Placement','National Head Placement'];
const ROLE_META = {
  'Zonal Manager':            { icon:'🗺️', color:'#1a237e' },
  'Region Head':              { icon:'📍', color:'#4a148c' },
  'Area Manager':             { icon:'🏘️', color:'#1b5e20' },
  'Cluster Manager':          { icon:'🏘️', color:'#0d47a1' },
  'Placement Coordinator':    { icon:'📋', color:'#e65100' },
  'Senior Manager Placement': { icon:'🏆', color:'#880e4f' },
  'National Head Placement':  { icon:'🎯', color:'#b71c1c' },
};
const FY_OPTIONS     = ['All','FY27','FY26','FY25','FY24'];
const STATUS_OPTIONS = ['All','Not Submitted','Pending with Supervisor','Approved','Closed','Sent Back'];
const CT_OPTIONS     = ['All','CDC','SDC','DTV'];
const AUDIT_FILTER   = ['All','Compliant','Amber','Non-Compliant'];

const getAuditStatus = s => s >= 80 ? 'Compliant' : s >= 65 ? 'Amber' : 'Non-Compliant';
const sColor = s => s >= 80 ? '#2e7d32' : s >= 65 ? '#e65100' : '#c62828';
const sBg    = s => s >= 80 ? '#e8f5e9' : s >= 65 ? '#fff3e0' : '#fce4ec';

// ── DONUT ──
const Donut = ({ slices, total, label }) => {
  const R=55,cx=70,cy=70,sw=16,circ=2*Math.PI*R; let off=0;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f0f0f0" strokeWidth={sw}/>
      {slices.map((s,i)=>{const pct=total>0?s.value/total:0,dash=pct*circ;
        const el=<circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={s.color} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-off}
          style={{transform:'rotate(-90deg)',transformOrigin:`${cx}px ${cy}px`,transition:'all 0.5s'}}/>;
        off+=dash;return el;})}
      <text x={cx} y={cy-5} textAnchor="middle" fontSize="22" fontWeight="800" fill="#1a237e">{total}</text>
      <text x={cx} y={cy+13} textAnchor="middle" fontSize="11" fill="#888">{label}</text>
    </svg>
  );
};

// ── REPORT MODAL ──
const ReportModal = ({ report, onClose }) => {
  if (!report) return null;
  const score=parseFloat(report.grandTotal)||0, stColor=sColor(score), stBg=sBg(score);
  const cpConfig={
    FO1:{name:'Enquires Entered in Pulse(Y/N)',w:'30%',m:9},FO2:{name:'Enrolment form available in Pulse(Y/N)',w:'20%',m:6},
    FO3:{name:'Pre assessment Available(Y/N)',w:'0%',m:0},FO4:{name:'Documents uploaded in Pulse(Y/N)',w:'40%',m:12},
    FO5:{name:'Availability of Marketing Material(Y/N)',w:'10%',m:3},
    DP1:{name:'Batch file maintained for all running batches',w:'15%',m:6},DP2:{name:'Batch Heath Card available',w:'10%',m:4},
    DP3:{name:'Attendance marked in EDL sheets correctly',w:'20%',m:8},DP4:{name:'BMS maintained',w:'5%',m:2},
    DP5:{name:'FACT Certificate available',w:'10%',m:4},DP6:{name:'Post Assessment if applicable',w:'5%',m:2},
    DP7:{name:'Appraisal sheet maintained',w:'5%',m:2},DP8:{name:'Appraisal status in Pulse',w:'5%',m:2},
    DP9:{name:'Certification Status',w:'10%',m:4},DP10:{name:'Student signature for certificates',w:'10%',m:4},
    DP11:{name:'System vs actual certificate date',w:'5%',m:2},
    PP1:{name:'Student Placement Response',w:'40%',m:6},PP2:{name:'CGT/Guest Lecture/Industry Visit',w:'10%',m:1.5},
    PP3:{name:'Placement Bank & Aging',w:'30%',m:4.5},PP4:{name:'Placement Proof Upload',w:'20%',m:3},
    MP1:{name:'Courseware issue/LMS Usage',w:'20%',m:3},MP2:{name:'TIRM details register',w:'10%',m:1.5},
    MP3:{name:'Monthly Centre Review Meeting',w:'15%',m:2.25},MP4:{name:'Physical asset verification',w:'20%',m:3},
    MP5:{name:'Verification of bill authenticity',w:'15%',m:2.25},MP6:{name:'Log book for Genset & Vehicle',w:'10%',m:1.5},
    MP7:{name:'Availability and requirement of Biometric',w:'10%',m:1.5},
  };
  const areas=[
    {num:1,name:'Front Office',keys:['FO1','FO2','FO3','FO4','FO5'],totalScore:report.frontOfficeScore,max:30},
    {num:2,name:'Delivery Process',keys:['DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11'],totalScore:report.deliveryProcessScore,max:40},
    {num:3,name:'Placement Process',keys:['PP1','PP2','PP3','PP4'],totalScore:report.placementScore,max:15,isNA:report.placementApplicable==='no'},
    {num:4,name:'Management Process',keys:['MP1','MP2','MP3','MP4','MP5','MP6','MP7'],totalScore:report.managementScore,max:15},
  ];
  const thS={padding:'9px 8px',background:'#555',color:'white',fontSize:'11px',fontWeight:'700',textTransform:'uppercase',textAlign:'center',border:'1px solid #888',whiteSpace:'nowrap'};
  const tdS={padding:'7px 6px',fontSize:'12px',color:'#333',border:'1px solid #e0e0e0',textAlign:'center',verticalAlign:'middle'};
  const tdL={...tdS,textAlign:'left'};
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:'12px'}}>
      <div style={{background:'white',borderRadius:'12px',width:'100%',maxWidth:'1100px',maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.4)'}}>
        <div style={{background:'linear-gradient(135deg,#11998e,#38ef7d)',padding:'14px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <h3 style={{margin:0,fontSize:'19px',fontWeight:'700',color:'white'}}>📊 Complete Audit Report</h3>
            <span style={{fontSize:'13px',color:'rgba(255,255,255,0.9)'}}>{report.centerName} ({report.centerCode})</span>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.25)',border:'2px solid rgba(255,255,255,0.5)',color:'white',width:'30px',height:'30px',borderRadius:'50%',cursor:'pointer',fontSize:'15px',fontWeight:'bold'}}>✕</button>
        </div>
        <div style={{overflowY:'auto',padding:'18px',flex:1}}>
          <div style={{background:'linear-gradient(135deg,#e3f2fd,#e8f5e9)',border:'1px solid #b0bec5',borderRadius:'10px',padding:'14px 18px',marginBottom:'18px'}}>
            <h4 style={{margin:'0 0 10px',color:'#1565c0',fontSize:'14px',fontWeight:'700',textAlign:'center'}}>📋 Center Information</h4>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px 16px'}}>
              {[['Center Code',<span style={{color:'#1565c0',fontWeight:'700'}}>{report.centerCode}</span>],['Center Name',report.centerName],['Project',report.projectName],['ZM Name',report.zmName],['Region Head',report.regionHeadName],['Area Manager',report.areaManager||report.areaClusterManager||'-'],['Cluster Manager',report.clusterManager||'-'],['Center Head',report.centerHeadName||report.chName||'-'],['Center Type',<span style={{background:report.centerType==='CDC'?'#e3f2fd':report.centerType==='SDC'?'#f3e5f5':'#e8f5e9',color:report.centerType==='CDC'?'#1565c0':report.centerType==='SDC'?'#6a1b9a':'#2e7d32',padding:'1px 8px',borderRadius:'10px',fontWeight:'700',fontSize:'11px'}}>{report.centerType}</span>],['Location',report.location],['Audited By',report.auditedBy],['Audit Period',report.auditPeriod],['Financial Year',<span style={{color:'#1565c0',fontWeight:'700'}}>{report.financialYear}</span>]].map(([l,v])=>(
                <div key={l} style={{display:'flex',gap:'5px',alignItems:'flex-start'}}>
                  <span style={{fontSize:'11px',color:'#555',fontWeight:'600',minWidth:'95px'}}>{l}:</span>
                  <span style={{fontSize:'12px',color:'#222'}}>{v||'-'}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:'10px',paddingTop:'8px',borderTop:'1px solid #b0bec5',display:'flex',gap:'24px',flexWrap:'wrap'}}>
              <div><span style={{fontSize:'11px',color:'#555',fontWeight:'600'}}>Audit Date: </span><span style={{fontSize:'12px',fontWeight:'600'}}>{report.auditDateString||'-'}</span></div>
              <div><span style={{fontSize:'11px',color:'#555',fontWeight:'600'}}>Grand Total: </span><span style={{fontSize:'14px',fontWeight:'800',color:stColor}}>{score.toFixed(2)}/100</span></div>
              <div><span style={{fontSize:'11px',color:'#555',fontWeight:'600'}}>Status: </span><span style={{background:stBg,color:stColor,padding:'1px 9px',borderRadius:'10px',fontSize:'12px',fontWeight:'700',border:`1px solid ${stColor}`}}>{getAuditStatus(score)}</span></div>
            </div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:'860px'}}>
              <thead><tr>{['S.NO','CHECKPOINT','WEIGHT','MAX','SAMPLES','COMPLIANT','%','SCORE','AUDITOR REMARKS','CH REMARKS'].map((h,i)=><th key={h} style={{...thS,textAlign:i===1||i>=8?'left':'center',minWidth:i===1?'220px':i>=8?'140px':'auto'}}>{h}</th>)}</tr></thead>
              {areas.map(area=>(
                <tbody key={area.name}>
                  <tr><td colSpan={10} style={{background:'linear-gradient(90deg,#5e35b1,#7e57c2)',color:'white',padding:'8px 12px',fontWeight:'700',fontSize:'13px'}}>Area {area.num}: {area.name} (Max: {area.max})</td></tr>
                  {area.isNA?<tr><td colSpan={10} style={{...tdS,color:'#888',fontStyle:'italic',padding:'12px'}}>Placement — Not Applicable</td></tr>
                    :area.keys.map((k,i)=>{const cp=report[k]||{};return(
                    <tr key={k} style={{background:i%2===0?'white':'#f9f9ff'}}>
                      <td style={tdS}>{i+1}</td><td style={tdL}>{cpConfig[k]?.name||k}</td>
                      <td style={tdS}>{cpConfig[k]?.w||'-'}</td><td style={{...tdS,fontWeight:'700'}}>{cpConfig[k]?.m??'-'}</td>
                      <td style={tdS}>{cp.totalSamples||'-'}</td><td style={tdS}>{cp.samplesCompliant||'-'}</td>
                      <td style={{...tdS,color:(cp.compliantPercent||0)>=80?'#1565c0':'#c62828',fontWeight:'700'}}>{cp.compliantPercent!=null?`${Number(cp.compliantPercent).toFixed(1)}%`:'-'}</td>
                      <td style={{...tdS,fontWeight:'800',color:(cp.score||0)>0?'#1565c0':'#333'}}>{cp.score!=null?Number(cp.score).toFixed(0):'0'}</td>
                      <td style={{...tdL,color:'#444'}}>{cp.remarks||'-'}</td>
                      <td style={{...tdL,background:cp.centerHeadRemarks?'#f1fff4':'#fafafa',color:cp.centerHeadRemarks?'#2e7d32':'#aaa',fontStyle:cp.centerHeadRemarks?'normal':'italic'}}>{cp.centerHeadRemarks||'No remarks'}</td>
                    </tr>);})}
                  {!area.isNA&&<tr style={{background:'#f0f0f0'}}><td colSpan={7} style={{...tdS,textAlign:'right',fontWeight:'700',color:'#555',paddingRight:'14px'}}>{area.name} Total:</td><td style={{...tdS,fontWeight:'800',fontSize:'14px',background:'#fff9c4',color:parseFloat(area.totalScore||0)>=area.max*0.8?'#2e7d32':'#e65100'}}>{parseFloat(area.totalScore||0).toFixed(2)}/{area.max}</td><td colSpan={2} style={tdS}></td></tr>}
                </tbody>
              ))}
              <tbody><tr style={{background:'#e8f5e9'}}><td colSpan={7} style={{...tdS,textAlign:'right',fontWeight:'800',fontSize:'14px',paddingRight:'14px',color:'#1a237e'}}>🎯 GRAND TOTAL:</td><td style={{...tdS,fontWeight:'900',fontSize:'17px',color:stColor,background:'#fff'}}>{score.toFixed(2)}/100</td><td colSpan={2} style={{...tdS,fontWeight:'700',color:stColor}}>{getAuditStatus(score)}</td></tr></tbody>
            </table>
          </div>
        </div>
        <div style={{padding:'10px 18px',borderTop:'1px solid #e0e0e0',display:'flex',justifyContent:'flex-end',flexShrink:0,background:'#fafafa'}}>
          <button onClick={onClose} style={{background:'linear-gradient(135deg,#667eea,#764ba2)',color:'white',border:'none',padding:'9px 28px',borderRadius:'8px',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>✓ Close</button>
        </div>
      </div>
    </div>
  );
};

// ── MAIN ──────────────────────────────────────────────────
const RoleDashboard = () => {
  const navigate   = useNavigate();
  const tableRef   = useRef(null);
  const recentRef  = useRef(null);  // recent reports section on dashboard
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
  const role       = loggedUser.Role || '';
  const fullName   = `${loggedUser.firstname||''} ${loggedUser.lastname||''}`.trim();
  const meta       = ROLE_META[role] || { icon:'👤', color:'#333' };

  const [reports,        setReports]        = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [view,           setView]           = useState('dashboard');
  const [selectedReport, setSelectedReport] = useState(null);
  const [lastRefreshed,  setLastRefreshed]  = useState('');

  // Dashboard filters
  const [filterFY,     setFilterFY]     = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCT,     setFilterCT]     = useState('All');
  const [filterAudit,  setFilterAudit]  = useState('All');
  const [searchQ,      setSearchQ]      = useState('');

  // Table filters (independent)
  const [tFY,     setTFY]     = useState('All');
  const [tStatus, setTStatus] = useState('All');
  const [tCT,     setTCT]     = useState('All');
  const [tAudit,  setTAudit]  = useState('All');
  const [tSearch, setTSearch] = useState('');

  useEffect(() => {
    if (!loggedUser?.username) { alert('Unauthorized!'); navigate('/'); return; }
    if (!ALLOWED_ROLES.includes(role)) { alert('Unauthorized!'); navigate('/'); return; }
    loadReports();
  }, []);

  useEffect(() => { loadReports(); }, [filterFY, filterStatus, filterCT]);

  const loadReports = async () => {
    try {
      setLoading(true); setError('');
      const params = new URLSearchParams({ role, name: fullName, firstname: loggedUser.firstname||'', fy: filterFY, status: filterStatus, centerType: filterCT });
      const res  = await fetch(`${API_URL}/api/hierarchy-reports?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports(data);
      setLastRefreshed(new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
    } catch { setError('Failed to load reports. Please try again.'); }
    finally { setLoading(false); }
  };

  // Dashboard filtered
  const dashReports = reports.filter(r => {
    if (filterAudit!=='All' && getAuditStatus(r.grandTotal||0)!==filterAudit) return false;
    if (searchQ) { const q=searchQ.toLowerCase(); if (!r.centerCode?.toLowerCase().includes(q)&&!r.centerName?.toLowerCase().includes(q)&&!r.location?.toLowerCase().includes(q)) return false; }
    return true;
  });

  // Table filtered
  const tableReports = reports.filter(r => {
    if (tAudit!=='All' && getAuditStatus(r.grandTotal||0)!==tAudit) return false;
    if (tFY!=='All' && r.financialYear!==tFY) return false;
    if (tStatus!=='All' && r.currentStatus!==tStatus) return false;
    if (tCT!=='All' && r.centerType!==tCT) return false;
    if (tSearch) { const q=tSearch.toLowerCase(); if (!r.centerCode?.toLowerCase().includes(q)&&!r.centerName?.toLowerCase().includes(q)&&!r.location?.toLowerCase().includes(q)) return false; }
    return true;
  });

  const total=dashReports.length;
  const compliant=dashReports.filter(r=>(r.grandTotal||0)>=80).length;
  const amber=dashReports.filter(r=>(r.grandTotal||0)>=65&&(r.grandTotal||0)<80).length;
  const nonCompliant=dashReports.filter(r=>(r.grandTotal||0)<65).length;
  const avgScore=total>0?(dashReports.reduce((s,r)=>s+(r.grandTotal||0),0)/total).toFixed(1):'0.0';
  const emailPending=dashReports.filter(r=>r.emailSent&&!r.centerHeadRemarksLocked).length;
  const remarksPending=dashReports.filter(r=>r.currentStatus==='Pending with Supervisor').length;
  const closedCount=dashReports.filter(r=>r.currentStatus==='Closed').length;
  const approvedCount=dashReports.filter(r=>r.currentStatus==='Approved').length;

  // Card click → toggle filter + scroll to recent reports on dashboard
  const handleCardClick = (auditVal) => {
    if (auditVal === 'All') {
      setFilterAudit('All');
    } else {
      setFilterAudit(prev => prev === auditVal ? 'All' : auditVal);
    }
    // Wait for re-render then scroll
    setTimeout(() => {
      recentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  };

  // "View in Table" button → switch to table view with filter applied
  const handleViewInTable = (auditVal) => {
    setTAudit(auditVal); setTFY('All'); setTStatus('All'); setTCT('All'); setTSearch('');
    setView('table');
    setTimeout(()=>tableRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),150);
  };

  // Section breakdown
  const sectionBreakdown = [
    {name:'Front Office',     sub:'out of 30', key:'frontOfficeScore',    max:30},
    {name:'Delivery Process', sub:'out of 40', key:'deliveryProcessScore', max:40},
    {name:'Placement',        sub:'out of 15', key:'placementScore',       max:15, isP:true},
    {name:'Management',       sub:'out of 15', key:'managementScore',      max:15},
  ].map(sec=>{
    const app=dashReports.filter(r=>!(sec.isP&&r.placementApplicable==='no'));
    const c=app.filter(r=>(parseFloat(r[sec.key]||0)/sec.max)*100>=80).length;
    const a=app.filter(r=>{const p=(parseFloat(r[sec.key]||0)/sec.max)*100;return p>=65&&p<80;}).length;
    const nc=app.filter(r=>(parseFloat(r[sec.key]||0)/sec.max)*100<65).length;
    const avgPct=app.length>0?(app.reduce((s,r)=>s+(parseFloat(r[sec.key]||0)/sec.max)*100,0)/app.length).toFixed(1):'0.0';
    return {...sec,c,a,nc,applicable:app.length,avgPct};
  });

  const avgAreaScores = [
    {label:'Front Office', key:'frontOfficeScore',    max:30, color:'#3949ab'},
    {label:'Delivery',     key:'deliveryProcessScore', max:40, color:'#00897b'},
    {label:'Placement',    key:'placementScore',       max:15, color:'#e65100', isP:true},
    {label:'Management',   key:'managementScore',      max:15, color:'#8e24aa'},
  ].map(a=>{
    const app=dashReports.filter(r=>!(a.isP&&r.placementApplicable==='no'));
    const avg=app.length>0?(app.reduce((s,r)=>s+(parseFloat(r[a.key]||0)),0)/app.length).toFixed(2):'0.00';
    const pct=((avg/a.max)*100).toFixed(1);
    return {...a,avg,pct};
  });

  const statusBadge = (status) => {
    const m={'Approved':['#e8f5e9','#2e7d32','✅ Approved'],'Pending with Supervisor':['#fff3e0','#e65100','⏳ Pending'],'Not Submitted':['#fce4ec','#c62828','📝 Not Submitted'],'Closed':['#ede7f6','#4527a0','🔒 Closed'],'Sent Back':['#e3f2fd','#1565c0','↩️ Sent Back']};
    const [bg,c,l]=m[status]||['#f5f5f5','#333',status||'-'];
    return <span style={{background:bg,color:c,padding:'3px 10px',borderRadius:'12px',fontSize:'11px',fontWeight:'600',whiteSpace:'nowrap'}}>{l}</span>;
  };

  const reportStatusBadge = (r) => {
    if (r.remarksEditedOnce) return <span className="rdb rdb-locked-perm">🔒 Perm. Locked</span>;
    if (r.centerHeadRemarksLocked&&r.centerRemarksDate) return <span className="rdb rdb-submitted-ch">🔒 Submitted</span>;
    if (r.centerHeadEditRequest) return <span className="rdb rdb-edit-req">✏️ Edit Req.</span>;
    if (r.centerRemarksDate) return <span className="rdb rdb-ok">✅ Submitted</span>;
    return <span className="rdb rdb-pending-r">⏳ Pending</span>;
  };

  const STAT_CARDS = [
    {label:'Total Reports',    num:total,        icon:'📋', cls:'rdb-stat-total',    auditKey:'All',           color:'#5c6bc0'},
    {label:'Compliant',        num:compliant,    icon:'✅', cls:'rdb-stat-compliant', auditKey:'Compliant',     color:'#2e7d32', pct:total>0?((compliant/total)*100).toFixed(1):0},
    {label:'Amber',            num:amber,        icon:'🟡', cls:'rdb-stat-amber',    auditKey:'Amber',         color:'#e65100', pct:total>0?((amber/total)*100).toFixed(1):0},
    {label:'Non-Compliant',    num:nonCompliant, icon:'❌', cls:'rdb-stat-nc',       auditKey:'Non-Compliant', color:'#c62828', pct:total>0?((nonCompliant/total)*100).toFixed(1):0},
    {label:'Avg Score',        num:avgScore,     icon:'⭐', cls:'rdb-stat-avg',      auditKey:null,            color:'#00acc1', sub:'out of 100'},
    {label:'Email Pending',    num:emailPending, icon:'📧', cls:'rdb-stat-email',    auditKey:null,            color:'#7b1fa2'},
    {label:'Remarks Pending',  num:remarksPending,icon:'⏳',cls:'rdb-stat-remarks',  auditKey:null,            color:'#f57c00'},
    {label:'Closed',           num:closedCount,  icon:'🔒', cls:'rdb-stat-closed',   auditKey:null,            color:'#455a64'},
  ];

  return (
    <div className="rdb-container">
      {selectedReport&&<ReportModal report={selectedReport} onClose={()=>setSelectedReport(null)}/>}

      {/* HEADER */}
      <header className="rdb-header">
        <h1>{meta.icon} {role} Dashboard - Welcome, {loggedUser.firstname}</h1>
        <button className="rdb-logout" onClick={()=>{localStorage.removeItem('loggedUser');navigate('/');}}>Logout</button>
      </header>

      {/* TABS */}
      <div className="rdb-tabs">
        <button className={view==='dashboard'?'active':''} onClick={()=>setView('dashboard')}>📊 Dashboard</button>
        <button className={view==='table'?'active':''} onClick={()=>{setView('table');setTimeout(()=>tableRef.current?.scrollIntoView({behavior:'smooth'}),100);}}>📋 Reports Table</button>
      </div>

      {error&&<div className="rdb-error">{error}</div>}

      {/* ══════ DASHBOARD VIEW ══════ */}
      {view==='dashboard'&&(
        <div className="rdb-body">
          {/* Analytics header */}
          <div className="rdb-analytics-hdr">
            <div>
              <h2 className="rdb-analytics-title">📊 {role} Analytics Dashboard</h2>
              <p className="rdb-analytics-sub">Last refreshed: {lastRefreshed}</p>
            </div>
            <button className="rdb-refresh-btn" onClick={loadReports} disabled={loading}>{loading?'⏳ Loading...':'🔄 Refresh'}</button>
          </div>

          {/* Filters */}
          <div className="rdb-filter-bar">
            <div className="rdb-fg"><label>📅 FINANCIAL YEAR</label>
              <select value={filterFY} onChange={e=>setFilterFY(e.target.value)}>{FY_OPTIONS.map(f=><option key={f}>{f}</option>)}</select></div>
            <div className="rdb-fg"><label>📋 STATUS</label>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>{STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}</select></div>
            <div className="rdb-fg"><label>🏢 CENTER TYPE</label>
              <select value={filterCT} onChange={e=>setFilterCT(e.target.value)}>{CT_OPTIONS.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="rdb-fg"><label>🔍 SEARCH CENTER</label>
              <input placeholder="Code, name or location..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/></div>
          </div>

          {/* STAT CARDS */}
          <div className="rdb-stat-grid">
            {STAT_CARDS.map((s,i)=>(
              <div key={i}
                className={`rdb-stat-card ${s.cls}${filterAudit===s.auditKey&&s.auditKey&&s.auditKey!=='All'?' rdb-stat-active':''}`}
                onClick={s.auditKey!==null ? ()=>handleCardClick(s.auditKey) : undefined}
                style={{cursor:s.auditKey!==null?'pointer':'default'}}>
                <div className="rdb-stat-icon-wrap">{s.icon}</div>
                <div className="rdb-stat-content">
                  <div className="rdb-stat-num" style={{color:s.color}}>{s.num}</div>
                  <div className="rdb-stat-lbl">
                    {s.label}
                    {s.pct!==undefined&&<><br/><span style={{color:s.color,fontWeight:'700'}}>{s.pct}%</span></>}
                    {s.sub&&<><br/><span style={{color:'#999'}}>{s.sub}</span></>}
                  </div>
                </div>
                <div className="rdb-stat-arrow">›</div>
              </div>
            ))}
          </div>

          {/* Active filter chip + View in Table button */}
          {filterAudit!=='All'&&(
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px'}}>
              <span style={{background:'#e8eaf6',color:'#3949ab',padding:'4px 14px',borderRadius:'20px',fontSize:'13px',fontWeight:'600'}}>Showing: {filterAudit}</span>
              <button onClick={()=>setFilterAudit('All')} style={{background:'none',border:'1px solid #ccc',borderRadius:'20px',padding:'3px 10px',cursor:'pointer',fontSize:'12px',color:'#666'}}>✕ Clear</button>
              <button onClick={()=>handleViewInTable(filterAudit)} style={{background:'#3949ab',color:'white',border:'none',borderRadius:'20px',padding:'4px 14px',cursor:'pointer',fontSize:'12px',fontWeight:'600'}}>📋 View in Table →</button>
            </div>
          )}

          {/* CHARTS */}
          <div className="rdb-charts-row">
            <div className="rdb-chart-card">
              <h3 className="rdb-chart-title">🎯 Compliance Status</h3>
              <div className="rdb-donut-wrap">
                <Donut slices={[{value:compliant,color:'#43a047'},{value:amber,color:'#fb8c00'},{value:nonCompliant,color:'#e53935'}]} total={total} label="total"/>
                <div className="rdb-legend">
                  {[['#43a047','Compliant',compliant],['#fb8c00','Amber',amber],['#e53935','Non-Compliant',nonCompliant]].map(([c,l,v])=>(
                    <div key={l} className="rdb-legend-item"><span className="rdb-dot" style={{background:c}}/><span>{l}</span><strong>{v}</strong></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rdb-chart-card">
              <h3 className="rdb-chart-title">📌 Report Status</h3>
              <div className="rdb-donut-wrap">
                <Donut slices={[{value:closedCount,color:'#7b1fa2'},{value:approvedCount,color:'#1976d2'},{value:remarksPending,color:'#fb8c00'},{value:Math.max(0,total-closedCount-approvedCount-remarksPending),color:'#e0e0e0'}]} total={total} label="total"/>
                <div className="rdb-legend">
                  {[['#7b1fa2','Closed',closedCount],['#1976d2','Approved',approvedCount],['#fb8c00','Pending',remarksPending],['#e0e0e0','Other',Math.max(0,total-closedCount-approvedCount-remarksPending)]].map(([c,l,v])=>(
                    <div key={l} className="rdb-legend-item"><span className="rdb-dot" style={{background:c}}/><span>{l}</span><strong>{v}</strong></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rdb-chart-card">
              <h3 className="rdb-chart-title">🏢 Center Type</h3>
              <div className="rdb-donut-wrap">
                <Donut slices={[{value:dashReports.filter(r=>r.centerType==='CDC').length,color:'#1565c0'},{value:dashReports.filter(r=>r.centerType==='SDC').length,color:'#6a1b9a'},{value:dashReports.filter(r=>r.centerType==='DTV').length,color:'#2e7d32'}]} total={total} label="total"/>
                <div className="rdb-legend">
                  {[['#1565c0','CDC',dashReports.filter(r=>r.centerType==='CDC').length],['#6a1b9a','SDC',dashReports.filter(r=>r.centerType==='SDC').length],['#2e7d32','DTV',dashReports.filter(r=>r.centerType==='DTV').length]].map(([c,l,v])=>(
                    <div key={l} className="rdb-legend-item"><span className="rdb-dot" style={{background:c}}/><span>{l}</span><strong>{v}</strong></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION BREAKDOWN */}
          <div className="rdb-section-card">
            <h3 className="rdb-section-title">📊 Section-wise Compliance Breakdown</h3>
            <table className="rdb-breakdown-table">
              <thead><tr><th>SECTION</th><th>MAX SCORE</th><th style={{color:'#2e7d32'}}>COMPLIANT</th><th style={{color:'#e65100'}}>AMBER</th><th style={{color:'#c62828'}}>NON-COMPLIANT</th><th>AVG %</th></tr></thead>
              <tbody>
                {sectionBreakdown.map(sec=>(
                  <tr key={sec.name}>
                    <td><strong style={{color:'#1a237e'}}>{sec.name}</strong><br/><small style={{color:'#999'}}>{sec.sub}{sec.isP&&sec.applicable<total?` (${sec.applicable} applicable)`:''}</small></td>
                    <td style={{textAlign:'center',fontWeight:'700'}}>{sec.max}</td>
                    <td style={{textAlign:'center'}}><span className="rdb-badge rdb-badge-g">{sec.c}</span></td>
                    <td style={{textAlign:'center'}}><span className="rdb-badge rdb-badge-a">{sec.a}</span></td>
                    <td style={{textAlign:'center'}}><span className="rdb-badge rdb-badge-r">{sec.nc}</span></td>
                    <td>
                      <div className="rdb-prog-wrap">
                        <div className="rdb-prog-bar" style={{width:`${Math.min(sec.avgPct,100)}%`,background:parseFloat(sec.avgPct)>=80?'#43a047':parseFloat(sec.avgPct)>=65?'#fb8c00':'#e53935'}}/>
                        <span className="rdb-prog-lbl">{sec.avgPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{fontSize:'12px',color:'#999',marginTop:'8px'}}>Click on Compliant / Amber / Non-Compliant stat cards above to filter, then "View in Table →" to see full list.</p>
          </div>

          {/* AVG SECTION SCORES */}
          <div className="rdb-section-card">
            <h3 className="rdb-section-title">📈 Average Section Scores</h3>
            <div className="rdb-avg-row">
              {avgAreaScores.map(a=>(
                <div key={a.label} className="rdb-avg-card">
                  <div className="rdb-avg-label">{a.label}</div>
                  <div className="rdb-avg-circle" style={{borderColor:a.color}}>
                    <span className="rdb-avg-num" style={{color:a.color}}>{a.avg}</span>
                    <span className="rdb-avg-max">/{a.max}</span>
                  </div>
                  <div className="rdb-avg-pct" style={{color:parseFloat(a.pct)>=80?'#2e7d32':parseFloat(a.pct)>=65?'#e65100':'#c62828'}}>{a.pct}%</div>
                  <div className="rdb-avg-bar-wrap"><div className="rdb-avg-bar" style={{width:`${Math.min(a.pct,100)}%`,background:parseFloat(a.pct)>=80?'#43a047':parseFloat(a.pct)>=65?'#fb8c00':'#e53935'}}/></div>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT REPORTS */}
          <div className="rdb-section-card" ref={recentRef}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <h3 className="rdb-section-title" style={{margin:0}}>📋 Recent Reports (Top 10)</h3>
              <button className="rdb-view-all-btn" onClick={()=>{setView('table');setTimeout(()=>tableRef.current?.scrollIntoView({behavior:'smooth'}),100);}}>View All →</button>
            </div>
            {loading?<div className="rdb-loading"><div className="rdb-spinner"/><p>Loading...</p></div>
            :dashReports.length===0?<div className="rdb-empty">📭 No reports found.</div>
            :<div style={{overflowX:'auto'}}>
              <table className="rdb-mini-table">
                <thead><tr>{['#','Center Code','Center Name','Type','FY','Score','Status','Submit Status','View'].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {dashReports.slice(0,10).map((r,i)=>{const s=r.grandTotal||0;return(
                    <tr key={r._id||i} style={{background:i%2===0?'#fff':'#f8f9ff'}}>
                      <td>{i+1}</td>
                      <td><strong style={{color:'#3949ab'}}>{r.centerCode}</strong></td>
                      <td>{r.centerName}</td>
                      <td><span className={`rdb-type rdb-type-${r.centerType?.toLowerCase()}`}>{r.centerType}</span></td>
                      <td style={{color:'#1565c0',fontWeight:'600'}}>{r.financialYear}</td>
                      <td style={{color:sColor(s),fontWeight:'700'}}>{s.toFixed(1)} {s>=80?'✅':s>=65?'🟡':'❌'}</td>
                      <td><span style={{padding:'3px 10px',borderRadius:'12px',fontSize:'11px',fontWeight:'600',background:sBg(s),color:sColor(s)}}>{getAuditStatus(s)}</span></td>
                      <td>{statusBadge(r.currentStatus)}</td>
                      <td><button onClick={()=>setSelectedReport(r)} className="rdb-view-btn">👁️ View</button></td>
                    </tr>);})}
                </tbody>
              </table>
            </div>}
          </div>
        </div>
      )}

      {/* ══════ TABLE VIEW ══════ */}
      {view==='table'&&(
        <div className="rdb-body" ref={tableRef}>
          {/* Table filters */}
          <div className="rdb-filter-bar" style={{flexWrap:'wrap',alignItems:'flex-start',gap:'16px'}}>
            {/* Audit status pills */}
            <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
              <label className="rdb-filter-label">🎯 AUDIT STATUS</label>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                {AUDIT_FILTER.map(f=>(
                  <button key={f} className={`rdb-pill${tAudit===f?' rdb-pill-active':''}`}
                    style={tAudit===f&&f!=='All'?{background:f==='Compliant'?'#2e7d32':f==='Amber'?'#e65100':'#c62828',color:'white',borderColor:'transparent'}:{}}
                    onClick={()=>setTAudit(f)}>
                    {f==='All'?'🔘 All':f==='Compliant'?'✅ Compliant':f==='Amber'?'🟡 Amber':'❌ Non-Compliant'}
                  </button>
                ))}
              </div>
            </div>
            <div className="rdb-fg"><label>📅 FINANCIAL YEAR</label>
              <select value={tFY} onChange={e=>setTFY(e.target.value)}>{FY_OPTIONS.map(f=><option key={f}>{f}</option>)}</select></div>
            <div className="rdb-fg"><label>📋 SUBMIT STATUS</label>
              <select value={tStatus} onChange={e=>setTStatus(e.target.value)}>{STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}</select></div>
            <div className="rdb-fg"><label>🏢 CENTER TYPE</label>
              <select value={tCT} onChange={e=>setTCT(e.target.value)}>{CT_OPTIONS.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="rdb-fg"><label>🔍 SEARCH</label>
              <input placeholder="Code / name / location..." value={tSearch} onChange={e=>setTSearch(e.target.value)}/></div>
            <div style={{display:'flex',flexDirection:'column',gap:'5px',justifyContent:'flex-end'}}>
              <label className="rdb-filter-label"> </label>
              <button className="rdb-refresh-sm" onClick={loadReports} disabled={loading}>{loading?'⏳':'🔄 Refresh'}</button>
            </div>
          </div>

          {/* Result summary */}
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px',flexWrap:'wrap'}}>
            <span style={{fontSize:'13px',color:'#666'}}>Showing <strong style={{color:'#3949ab'}}>{tableReports.length}</strong> of <strong>{reports.length}</strong> reports</span>
            {tAudit!=='All'&&<span style={{background:tAudit==='Compliant'?'#e8f5e9':tAudit==='Amber'?'#fff3e0':'#fce4ec',color:tAudit==='Compliant'?'#2e7d32':tAudit==='Amber'?'#e65100':'#c62828',padding:'2px 10px',borderRadius:'12px',fontSize:'12px',fontWeight:'600'}}>{tAudit}</span>}
            {(tAudit!=='All'||tFY!=='All'||tStatus!=='All'||tCT!=='All'||tSearch)&&(
              <button onClick={()=>{setTAudit('All');setTFY('All');setTStatus('All');setTCT('All');setTSearch('');}} style={{background:'none',border:'1px solid #ccc',borderRadius:'12px',padding:'2px 10px',cursor:'pointer',fontSize:'12px',color:'#666'}}>✕ Clear All</button>
            )}
          </div>

          <div className="rdb-table-wrap">
            {loading?<div className="rdb-loading"><div className="rdb-spinner"/><p>Loading...</p></div>
            :tableReports.length===0?<div className="rdb-empty">📭 No reports match your filters.</div>
            :<table className="rdb-full-table">
              <thead><tr>
                {['#','Center Code','Center Name','Type','Location',
                  ...(['Zonal Manager','Region Head','Area Manager','Cluster Manager'].includes(role)?['ZM Name','Region Head','Area Mgr','Cluster Mgr']:[]),
                  'FY','Audit Period','Score','Audit Status','Submit Status','Report Status','View'
                ].map(h=><th key={h}>{h}</th>)}
              </tr></thead>
              <tbody>
                {tableReports.map((r,i)=>{const s=r.grandTotal||0;return(
                  <tr key={r._id||i} style={{background:i%2===0?'#fff':'#f8f9ff'}}>
                    <td>{i+1}</td>
                    <td><strong style={{color:'#3949ab'}}>{r.centerCode}</strong></td>
                    <td>{r.centerName}</td>
                    <td><span className={`rdb-type rdb-type-${r.centerType?.toLowerCase()}`}>{r.centerType}</span></td>
                    <td>{r.location||'-'}</td>
                    {['Zonal Manager','Region Head','Area Manager','Cluster Manager'].includes(role)&&<>
                      <td>{r.zmName||'-'}</td><td>{r.regionHeadName||'-'}</td>
                      <td>{r.areaManager||r.areaClusterManager||'-'}</td><td>{r.clusterManager||'-'}</td>
                    </>}
                    <td style={{color:'#1565c0',fontWeight:'600'}}>{r.financialYear}</td>
                    <td>{r.auditPeriod||'-'}</td>
                    <td style={{color:sColor(s),fontWeight:'700'}}>{s.toFixed(1)} {s>=80?'✅':s>=65?'🟡':'❌'}</td>
                    <td><span style={{padding:'3px 10px',borderRadius:'12px',fontSize:'11px',fontWeight:'600',background:sBg(s),color:sColor(s)}}>{getAuditStatus(s)}</span></td>
                    <td>{statusBadge(r.currentStatus)}</td>
                    <td>{reportStatusBadge(r)}</td>
                    <td><button onClick={()=>setSelectedReport(r)} className="rdb-view-btn">👁️ View</button></td>
                  </tr>);})}
              </tbody>
            </table>}
          </div>
          {!loading&&tableReports.length>0&&<div className="rdb-table-footer">Showing <strong>{tableReports.length}</strong> of <strong>{reports.length}</strong> reports</div>}
        </div>
      )}
    </div>
  );
};

export default RoleDashboard;