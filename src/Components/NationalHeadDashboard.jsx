import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const PieChart = ({ data, size = 140, activeFilter, onSliceClick }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ width: size, height: size, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#999' }}>No data</div>;
  let cum = -90;
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const slices = data.map(d => { const a = (d.value / total) * 360; const s = cum; cum += a; return { ...d, s, e: cum }; });
  const toXY = (a, r2) => ({ x: cx + r2 * Math.cos(a * Math.PI / 180), y: cy + r2 * Math.sin(a * Math.PI / 180) });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((sl, i) => {
        const st = toXY(sl.s, r), en = toXY(sl.e, r), large = sl.e - sl.s > 180 ? 1 : 0;
        return <path key={i} d={`M ${cx} ${cy} L ${st.x} ${st.y} A ${r} ${r} 0 ${large} 1 ${en.x} ${en.y} Z`} fill={sl.color} stroke="white" strokeWidth={2} style={{ cursor: sl.filterKey ? 'pointer' : 'default', opacity: activeFilter && activeFilter !== sl.filterKey ? 0.5 : 1, transition: 'opacity 0.2s' }} onClick={() => sl.filterKey && onSliceClick && onSliceClick(sl.filterKey)}><title>{sl.label}: {sl.value}</title></path>;
      })}
      <circle cx={cx} cy={cy} r={r * 0.45} fill="white" />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight="bold" fill="#1a237e">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#666">total</text>
    </svg>
  );
};

const ScoreGauge = ({ score, max, label, color }) => {
  const pct = Math.min((score / max) * 100, 100);
  const c = color || (score / max >= 0.8 ? '#2e7d32' : score / max >= 0.65 ? '#e65100' : '#c62828');
  const circ = 2 * Math.PI * 32;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 6px' }}>
        <svg width={80} height={80} viewBox="0 0 80 80">
          <circle cx={40} cy={40} r={32} fill="none" stroke="#e5e7eb" strokeWidth={8} />
          <circle cx={40} cy={40} r={32} fill="none" stroke={c} strokeWidth={8} strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 'bold', color: c }}>{score.toFixed(1)}</span>
          <span style={{ fontSize: 9, color: '#888' }}>/{max}</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#555', fontWeight: '600' }}>{label}</div>
    </div>
  );
};

const Card = ({ children, style, id }) => <div id={id} style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', ...style }}>{children}</div>;
const SectionTitle = ({ icon, title }) => <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><span style={{ fontSize: 18 }}>{icon}</span><h3 style={{ margin: 0, fontSize: 16, fontWeight: '700', color: '#1a237e' }}>{title}</h3></div>;
const gc = s => parseFloat(s) >= 80 ? '#2e7d32' : parseFloat(s) >= 65 ? '#e65100' : '#c62828';
const gl = s => parseFloat(s) >= 80 ? 'Compliant' : parseFloat(s) >= 65 ? 'Amber' : 'Non-Compliant';
const ge = s => parseFloat(s) >= 80 ? 'green' : parseFloat(s) >= 65 ? 'yellow' : 'red';

const FILTER_LABELS = {
  compliant: 'Compliant Reports', amber: 'Amber Reports', nonCompliant: 'Non-Compliant Reports',
  emailPending: 'Email Pending', remarksPending: 'Remarks Pending', closed: 'Closed Reports',
  fo_compliant: 'Front Office - Compliant', fo_amber: 'Front Office - Amber', fo_nc: 'Front Office - Non-Compliant',
  dp_compliant: 'Delivery - Compliant', dp_amber: 'Delivery - Amber', dp_nc: 'Delivery - Non-Compliant',
  pp_compliant: 'Placement - Compliant', pp_amber: 'Placement - Amber', pp_nc: 'Placement - Non-Compliant',
  mp_compliant: 'Management - Compliant', mp_amber: 'Management - Amber', mp_nc: 'Management - Non-Compliant',
};


// ── FULL CHECKPOINT MODAL (same as RoleDashboard) ─────────────────
const cpConfig = {
  FO1:{name:'Enquires Entered in Pulse(Y/N)',w:'30%',m:9},
  FO2:{name:'Enrolment form available in Pulse(Y/N)',w:'20%',m:6},
  FO3:{name:'Pre assessment Available(Y/N)',w:'0%',m:0},
  FO4:{name:'Documents uploaded in Pulse(Y/N)',w:'40%',m:12},
  FO5:{name:'Availability of Marketing Material(Y/N)',w:'10%',m:3},
  DP1:{name:'Batch file maintained for all running batches',w:'15%',m:6},
  DP2:{name:'Batch Heath Card available',w:'10%',m:4},
  DP3:{name:'Attendance marked in EDL sheets correctly',w:'20%',m:8},
  DP4:{name:'BMS maintained',w:'5%',m:2},
  DP5:{name:'FACT Certificate available',w:'10%',m:4},
  DP6:{name:'Post Assessment if applicable',w:'5%',m:2},
  DP7:{name:'Appraisal sheet maintained',w:'5%',m:2},
  DP8:{name:'Appraisal status in Pulse',w:'5%',m:2},
  DP9:{name:'Certification Status',w:'10%',m:4},
  DP10:{name:'Student signature for certificates',w:'10%',m:4},
  DP11:{name:'System vs actual certificate date',w:'5%',m:2},
  PP1:{name:'Student Placement Response',w:'40%',m:6},
  PP2:{name:'CGT/Guest Lecture/Industry Visit',w:'10%',m:1.5},
  PP3:{name:'Placement Bank & Aging',w:'30%',m:4.5},
  PP4:{name:'Placement Proof Upload',w:'20%',m:3},
  MP1:{name:'Courseware issue/LMS Usage',w:'20%',m:3},
  MP2:{name:'TIRM details register',w:'10%',m:1.5},
  MP3:{name:'Monthly Centre Review Meeting',w:'15%',m:2.25},
  MP4:{name:'Physical asset verification',w:'20%',m:3},
  MP5:{name:'Verification of bill authenticity',w:'15%',m:2.25},
  MP6:{name:'Log book for Genset & Vehicle',w:'10%',m:1.5},
  MP7:{name:'Availability and requirement of Biometric',w:'10%',m:1.5},
};

const ReportDetailModal = ({ report, onClose, loading }) => {
  if (!report && !loading) return null;
  const score = parseFloat(report?.grandTotal) || 0;
  const stColor = score>=80?'#2e7d32':score>=65?'#e65100':'#c62828';
  const stBg    = score>=80?'#e8f5e9':score>=65?'#fff3e0':'#fce4ec';
  const auditSt = score>=80?'Compliant':score>=65?'Amber':'Non-Compliant';

  const areas = report ? [
    {num:1,name:'Front Office',keys:['FO1','FO2','FO3','FO4','FO5'],totalScore:report.frontOfficeScore,max:30},
    {num:2,name:'Delivery Process',keys:['DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11'],totalScore:report.deliveryProcessScore,max:40},
    {num:3,name:'Placement Process',keys:['PP1','PP2','PP3','PP4'],totalScore:report.placementScore,max:15,isNA:report.placementApplicable==='no'},
    {num:4,name:'Management Process',keys:['MP1','MP2','MP3','MP4','MP5','MP6','MP7'],totalScore:report.managementScore,max:15},
  ] : [];

  const thS={padding:'9px 8px',background:'#555',color:'white',fontSize:'11px',fontWeight:'700',textTransform:'uppercase',textAlign:'center',border:'1px solid #888',whiteSpace:'nowrap'};
  const tdS={padding:'7px 6px',fontSize:'12px',color:'#333',border:'1px solid #e0e0e0',textAlign:'center',verticalAlign:'middle'};
  const tdL={...tdS,textAlign:'left'};

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:'12px'}}>
      <div style={{background:'white',borderRadius:'14px',width:'100%',maxWidth:'1100px',maxHeight:'93vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,0.4)'}}>
        
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#11998e,#38ef7d)',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <h3 style={{margin:0,fontSize:'19px',fontWeight:'800',color:'white'}}>📊 Complete Audit Report</h3>
            {report && <span style={{fontSize:'13px',color:'rgba(255,255,255,0.9)'}}>{report.centerName} ({report.centerCode})</span>}
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.25)',border:'2px solid rgba(255,255,255,0.5)',color:'white',width:'32px',height:'32px',borderRadius:'50%',cursor:'pointer',fontSize:'16px',fontWeight:'bold',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        {/* Loading */}
        {loading && !report && (
          <div style={{padding:'60px',textAlign:'center',color:'#667eea',fontWeight:'600',fontSize:'16px'}}>⏳ Loading report...</div>
        )}

        {/* Content */}
        {report && (
          <div style={{overflowY:'auto',padding:'20px',flex:1}}>

            {/* Center Info */}
            <div style={{background:'linear-gradient(135deg,#e3f2fd,#e8f5e9)',border:'1px solid #b0bec5',borderRadius:'10px',padding:'16px 20px',marginBottom:'18px'}}>
              <h4 style={{margin:'0 0 12px',color:'#1565c0',fontSize:'15px',fontWeight:'700',textAlign:'center'}}>📋 Center Information</h4>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px 20px'}}>
                {[
                  ['Center Code', <span style={{color:'#1565c0',fontWeight:'700'}}>{report.centerCode}</span>],
                  ['Center Name', report.centerName],
                  ['Project Name', report.projectName || '-'],
                  ['ZM Name', report.zmName || '-'],
                  ['Region Head', report.regionHeadName || '-'],
                  ['Area Manager', report.areaManager || report.areaClusterManager || '-'],
                  ['Cluster Manager', report.clusterManager || '-'],
                  ['Center Head', report.centerHeadName || report.chName || '-'],
                  ['Center Type', <span style={{background:report.centerType==='CDC'?'#e3f2fd':report.centerType==='SDC'?'#f3e5f5':'#e8f5e9',color:report.centerType==='CDC'?'#1565c0':report.centerType==='SDC'?'#6a1b9a':'#2e7d32',padding:'1px 9px',borderRadius:'12px',fontWeight:'700',fontSize:'12px'}}>{report.centerType}</span>],
                  ['Location', report.location || '-'],
                  ['Audited By', report.auditedBy || '-'],
                  ['Audit Period', report.auditPeriod || '-'],
                  ['Financial Year', <span style={{color:'#1565c0',fontWeight:'700'}}>{report.financialYear}</span>],
                ].map(([l,v])=>(
                  <div key={l} style={{display:'flex',gap:'6px',alignItems:'flex-start'}}>
                    <span style={{fontSize:'12px',color:'#555',fontWeight:'600',minWidth:'105px'}}>{l}:</span>
                    <span style={{fontSize:'13px',color:'#222'}}>{v||'-'}</span>
                  </div>
                ))}
              </div>
              <div style={{marginTop:'12px',paddingTop:'10px',borderTop:'1px solid #b0bec5',display:'flex',gap:'28px',flexWrap:'wrap'}}>
                <div><span style={{fontSize:'12px',color:'#555',fontWeight:'600'}}>Audit Date: </span><span style={{fontSize:'13px',fontWeight:'600'}}>{report.auditDateString||'-'}</span></div>
                <div><span style={{fontSize:'12px',color:'#555',fontWeight:'600'}}>Grand Total: </span><span style={{fontSize:'15px',fontWeight:'800',color:stColor}}>{score.toFixed(2)}/100</span></div>
                <div><span style={{fontSize:'12px',color:'#555',fontWeight:'600'}}>Status: </span>
                  <span style={{background:stBg,color:stColor,padding:'2px 10px',borderRadius:'10px',fontSize:'13px',fontWeight:'700',border:`1px solid ${stColor}`}}>{auditSt}</span>
                </div>
              </div>
            </div>

            {/* Checkpoint Table */}
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:'900px'}}>
                <thead>
                  <tr>
                    {['S.NO','CHECKPOINT','WEIGHT','MAX SCORE','TOTAL SAMPLES','COMPLIANT SAMPLES','COMPLIANT %','SCORE','AUDITOR REMARKS','CENTER HEAD REMARKS'].map((h,i)=>(
                      <th key={h} style={{...thS,textAlign:i===1||i>=8?'left':'center',minWidth:i===1?'240px':i>=8?'150px':'auto'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                {areas.map(area=>(
                  <tbody key={area.name}>
                    <tr>
                      <td colSpan={10} style={{background:'linear-gradient(90deg,#5e35b1,#7e57c2)',color:'white',padding:'9px 14px',fontWeight:'700',fontSize:'14px'}}>
                        Area {area.num}: {area.name} (Max: {area.max})
                      </td>
                    </tr>
                    {area.isNA
                      ? <tr><td colSpan={10} style={{...tdS,color:'#888',fontStyle:'italic',padding:'14px'}}>Placement Process — Not Applicable</td></tr>
                      : area.keys.map((k,i)=>{const cp=report[k]||{};return(
                          <tr key={k} style={{background:i%2===0?'white':'#f9f9ff'}}>
                            <td style={tdS}>{i+1}</td>
                            <td style={tdL}>{cpConfig[k]?.name||k}</td>
                            <td style={tdS}>{cpConfig[k]?.w||'-'}</td>
                            <td style={{...tdS,fontWeight:'700'}}>{cpConfig[k]?.m??'-'}</td>
                            <td style={tdS}>{cp.totalSamples||'-'}</td>
                            <td style={tdS}>{cp.samplesCompliant||'-'}</td>
                            <td style={{...tdS,color:(cp.compliantPercent||0)>=80?'#1565c0':'#c62828',fontWeight:'700'}}>
                              {cp.compliantPercent!=null?`${Number(cp.compliantPercent).toFixed(1)}%`:'-'}
                            </td>
                            <td style={{...tdS,fontWeight:'800',color:(cp.score||0)>0?'#1565c0':'#333'}}>
                              {cp.score!=null?Number(cp.score).toFixed(0):'0'}
                            </td>
                            <td style={{...tdL,color:'#444'}}>{cp.remarks||'-'}</td>
                            <td style={{...tdL,background:cp.centerHeadRemarks?'#f1fff4':'#fafafa',color:cp.centerHeadRemarks?'#2e7d32':'#aaa',fontStyle:cp.centerHeadRemarks?'normal':'italic'}}>
                              {cp.centerHeadRemarks||'No remarks'}
                            </td>
                          </tr>
                        );
                      })
                    }
                    {!area.isNA&&(
                      <tr style={{background:'#f0f0f0'}}>
                        <td colSpan={7} style={{...tdS,textAlign:'right',fontWeight:'700',color:'#555',paddingRight:'16px'}}>{area.name} Total:</td>
                        <td style={{...tdS,fontWeight:'800',fontSize:'15px',background:'#fff9c4',color:parseFloat(area.totalScore||0)>=area.max*0.8?'#2e7d32':'#e65100'}}>
                          {parseFloat(area.totalScore||0).toFixed(2)}/{area.max}
                        </td>
                        <td colSpan={2} style={tdS}></td>
                      </tr>
                    )}
                  </tbody>
                ))}
                <tbody>
                  <tr style={{background:'#e8f5e9'}}>
                    <td colSpan={7} style={{...tdS,textAlign:'right',fontWeight:'800',fontSize:'15px',paddingRight:'16px',color:'#1a237e'}}>🎯 GRAND TOTAL:</td>
                    <td style={{...tdS,fontWeight:'900',fontSize:'18px',color:stColor,background:'#fff'}}>{score.toFixed(2)}/100</td>
                    <td colSpan={2} style={{...tdS,fontWeight:'700',color:stColor}}>{auditSt}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Remarks */}
            {(report.remarksText||report.centerRemarks)&&(
              <div style={{display:'flex',gap:'12px',marginTop:'16px',flexWrap:'wrap'}}>
                {report.remarksText&&<div style={{flex:1,minWidth:'200px',background:'#fff8e1',border:'1px solid #ffe082',borderRadius:'8px',padding:'12px'}}>
                  <div style={{fontSize:'11px',fontWeight:'700',color:'#888',marginBottom:'5px'}}>AUDITOR REMARKS</div>
                  <div style={{fontSize:'13px',color:'#333'}}>{report.remarksText}</div>
                </div>}
                {report.centerRemarks&&<div style={{flex:1,minWidth:'200px',background:'#e8f5e9',border:'1px solid #a5d6a7',borderRadius:'8px',padding:'12px'}}>
                  <div style={{fontSize:'11px',fontWeight:'700',color:'#888',marginBottom:'5px'}}>CENTER HEAD REMARKS</div>
                  <div style={{fontSize:'13px',color:'#333'}}>{report.centerRemarks}</div>
                </div>}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{padding:'12px 20px',borderTop:'1px solid #e0e0e0',display:'flex',justifyContent:'flex-end',flexShrink:0,background:'#fafafa'}}>
          <button onClick={onClose} style={{background:'linear-gradient(135deg,#667eea,#764ba2)',color:'white',border:'none',padding:'10px 30px',borderRadius:'8px',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>✓ Close</button>
        </div>
      </div>
    </div>
  );
};

export default function NationalHeadDashboard() {
  const navigate = useNavigate();
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');

  useEffect(() => {
    if (!loggedUser?.username || !['National Head', 'National Head Placement'].includes(loggedUser.Role)) {
      alert('Unauthorized!');
      navigate('/');
    }
  }, []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [reportView, setReportView] = useState('recent');
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/analytics`);
      if (res.ok) { setData(await res.json()); setLastRefresh(new Date().toLocaleTimeString('en-IN')); }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFilter = (key) => {
    if (activeFilter === key) { setActiveFilter(null); setReportView('recent'); return; }
    setActiveFilter(key); setReportView('all');
    setTimeout(() => document.getElementById('reports-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const openReport = async (centerCode) => {
    setModalLoading(true);
    setSelectedReport(null);
    try {
      const res = await fetch(`${API_URL}/api/audit-reports`);
      if (res.ok) {
        const reports = await res.json();
        const report = reports.find(r => r.centerCode === centerCode);
        if (report) setSelectedReport(report);
        else alert('Report not found');
      }
    } catch (e) { alert('Error'); }
    setModalLoading(false);
  };

  const closeModal = () => { setSelectedReport(null); setModalLoading(false); };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '4px solid #e5e7eb', borderTop: '4px solid #667eea', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ color: '#667eea', fontWeight: '600' }}>Loading Analytics...</div>
    </div>
  );
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>No data</div>;

  const all = (data.allReports || []).map(r => ({ ...r, grandTotal: parseFloat(r.grandTotal) || 0 }));
  const filtered =
    activeFilter === 'compliant' ? all.filter(r => r.grandTotal >= 80) :
    activeFilter === 'amber' ? all.filter(r => r.grandTotal >= 65 && r.grandTotal < 80) :
    activeFilter === 'nonCompliant' ? all.filter(r => r.grandTotal < 65) :
    activeFilter === 'emailPending' ? all.filter(r => r.currentStatus === 'Approved' && !r.emailSent) :
    activeFilter === 'remarksPending' ? all.filter(r => r.emailSent && !r.centerRemarksDate && r.currentStatus === 'Approved') :
    activeFilter === 'closed' ? all.filter(r => r.currentStatus === 'Closed') :
    activeFilter === 'fo_compliant' ? all.filter(r => r.frontOfficeScore/30 >= 0.80) :
    activeFilter === 'fo_amber' ? all.filter(r => { const p=r.frontOfficeScore/30; return p>=0.65&&p<0.80; }) :
    activeFilter === 'fo_nc' ? all.filter(r => r.frontOfficeScore/30 < 0.65) :
    activeFilter === 'dp_compliant' ? all.filter(r => r.deliveryProcessScore/40 >= 0.80) :
    activeFilter === 'dp_amber' ? all.filter(r => { const p=r.deliveryProcessScore/40; return p>=0.65&&p<0.80; }) :
    activeFilter === 'dp_nc' ? all.filter(r => r.deliveryProcessScore/40 < 0.65) :
    activeFilter === 'pp_compliant' ? all.filter(r => r.placementApplicable==='yes' && r.placementScore/15 >= 0.80) :
    activeFilter === 'pp_amber' ? all.filter(r => { const p=r.placementScore/15; return r.placementApplicable==='yes'&&p>=0.65&&p<0.80; }) :
    activeFilter === 'pp_nc' ? all.filter(r => r.placementApplicable==='yes' && r.placementScore/15 < 0.65) :
    activeFilter === 'mp_compliant' ? all.filter(r => r.managementScore/15 >= 0.80) :
    activeFilter === 'mp_amber' ? all.filter(r => { const p=r.managementScore/15; return p>=0.65&&p<0.80; }) :
    activeFilter === 'mp_nc' ? all.filter(r => r.managementScore/15 < 0.65) :
    all;

  const displayed = reportView === 'recent' && !activeFilter ? [...all].reverse().slice(0, 5) : filtered;

  const StatCard = ({ icon, label, value, sub, color, filterKey }) => {
    const active = activeFilter === filterKey;
    return (
      <div onClick={() => filterKey && handleFilter(filterKey)} style={{ background: active ? `${color}08` : 'white', borderRadius: 14, padding: '18px 20px', boxShadow: active ? `0 4px 20px ${color}25` : '0 2px 12px rgba(0,0,0,0.07)', border: `2px solid ${active ? color : color + '20'}`, display: 'flex', alignItems: 'center', gap: 14, cursor: filterKey ? 'pointer' : 'default', transition: 'all 0.2s', transform: active ? 'translateY(-3px)' : 'none' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 26, fontWeight: '800', color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 13, color: '#555', fontWeight: '600', marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>{sub}</div>}
        </div>
        {filterKey && <div style={{ fontSize: 14, color: active ? color : '#ccc', fontWeight: '900' }}>{active ? 'v' : '>'}</div>}
      </div>
    );
  };

  const compliancePie = [
    { label: 'Compliant', value: data.compliant, color: '#2e7d32', filterKey: 'compliant' },
    { label: 'Amber', value: data.amber, color: '#e65100', filterKey: 'amber' },
    { label: 'Non-Compliant', value: data.nonCompliant, color: '#c62828', filterKey: 'nonCompliant' },
  ];
  const statusPie = Object.entries(data.statusBreakdown || {}).map(([k, v]) => ({ label: k, value: v, color: k === 'Approved' ? '#2196f3' : k === 'Closed' ? '#6c757d' : k === 'Pending with Supervisor' ? '#ff9800' : '#9e9e9e' }));
  const typePie = Object.entries(data.typeBreakdown || {}).map(([k, v]) => ({ label: k, value: v, color: k === 'CDC' ? '#3f51b5' : k === 'SDC' ? '#009688' : '#ff5722' }));
  const auditorData = Object.entries(data.auditorBreakdown || {}).sort((a, b) => b[1].total - a[1].total);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', fontFamily: 'Segoe UI, sans-serif' }}>

      {/* ── HEADER ── */}
      <header style={{ background: 'white', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', borderBottom: '1px solid #e0e0e0' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#333' }}>
          🏛️ {loggedUser.Role} Dashboard - Welcome, {loggedUser.firstname}
        </h1>
        <button
          onClick={() => { localStorage.removeItem('loggedUser'); navigate('/'); }}
          style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
          Logout
        </button>
      </header>

      <div style={{ padding: 20 }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: '800', color: '#1a237e' }}>🏛️ {loggedUser.Role} — Audit Analytics Dashboard</h2>
          <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>Last refreshed: {lastRefresh}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {activeFilter && <button onClick={() => { setActiveFilter(null); setReportView('recent'); }} style={{ padding: '9px 16px', background: '#fee2e2', color: '#c62828', border: '2px solid #fca5a5', borderRadius: 10, cursor: 'pointer', fontWeight: '700', fontSize: 13 }}>X Clear Filter</button>}
          <button onClick={load} style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '700', fontSize: 13 }}>Refresh</button>
        </div>
      </div>

      {activeFilter && (
        <div style={{ background: 'linear-gradient(135deg,#1a237e,#3949ab)', color: 'white', borderRadius: 10, padding: '11px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: '700' }}>Showing: {FILTER_LABELS[activeFilter]}</span>
          <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '2px 12px', fontSize: 13, fontWeight: '800' }}>{filtered.length} reports</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 12, marginBottom: 20, animation: 'fadeUp 0.35s ease' }}>
        <StatCard icon="📋" label="Total Reports" value={data.total} color="#1a237e" />
        <StatCard icon="✅" label="Compliant" value={data.compliant} sub={`${data.total ? ((data.compliant / data.total) * 100).toFixed(1) : 0}%`} color="#2e7d32" filterKey="compliant" />
        <StatCard icon="🟡" label="Amber" value={data.amber} sub={`${data.total ? ((data.amber / data.total) * 100).toFixed(1) : 0}%`} color="#e65100" filterKey="amber" />
        <StatCard icon="❌" label="Non-Compliant" value={data.nonCompliant} sub={`${data.total ? ((data.nonCompliant / data.total) * 100).toFixed(1) : 0}%`} color="#c62828" filterKey="nonCompliant" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: 14, marginBottom: 16, animation: 'fadeUp 0.45s ease' }}>
        <Card>
          <SectionTitle icon="🎯" title="Compliance Status" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <PieChart data={compliancePie} size={140} activeFilter={activeFilter} onSliceClick={handleFilter} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {compliancePie.map(d => (
                <div key={d.label} onClick={() => handleFilter(d.filterKey)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 10px', borderRadius: 8, background: activeFilter === d.filterKey ? `${d.color}15` : 'transparent', border: `1px solid ${activeFilter === d.filterKey ? d.color + '50' : 'transparent'}`, transition: 'all 0.2s' }}>
                  <div style={{ width: 11, height: 11, borderRadius: '50%', background: d.color }} />
                  <span style={{ fontSize: 13, color: '#444' }}>{d.label}</span>
                  <span style={{ fontSize: 13, fontWeight: '800', color: d.color, marginLeft: 'auto' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <SectionTitle icon="📌" title="Report Status" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <PieChart data={statusPie} size={140} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {statusPie.map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
                  <span style={{ fontSize: 12, color: '#555' }}>{d.label}</span>
                  <span style={{ fontSize: 12, fontWeight: '700', color: d.color, marginLeft: 'auto' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <SectionTitle icon="🏢" title="Center Type" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <PieChart data={typePie} size={140} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {typePie.map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: d.color }} />
                  <span style={{ fontSize: 13, color: '#555', fontWeight: '600' }}>{d.label}</span>
                  <span style={{ fontSize: 13, fontWeight: '700', color: d.color, marginLeft: 'auto' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Section-wise Compliance Breakdown */}
      {data.sectionBreakdown && (
        <Card style={{ marginBottom: 16, animation: 'fadeUp 0.48s ease' }}>
          <SectionTitle icon="📊" title="Section-wise Compliance Breakdown" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg,#1a237e,#3949ab)' }}>
                  <th style={{ padding: '10px 14px', color: 'white', textAlign: 'left', fontWeight: '700', fontSize: 12 }}>Section</th>
                  <th style={{ padding: '10px 14px', color: 'white', textAlign: 'center', fontWeight: '700', fontSize: 12 }}>Max Score</th>
                  <th style={{ padding: '10px 14px', color: '#86efac', textAlign: 'center', fontWeight: '700', fontSize: 12 }}>Compliant</th>
                  <th style={{ padding: '10px 14px', color: '#fde68a', textAlign: 'center', fontWeight: '700', fontSize: 12 }}>Amber</th>
                  <th style={{ padding: '10px 14px', color: '#fca5a5', textAlign: 'center', fontWeight: '700', fontSize: 12 }}>Non-Compliant</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'frontOffice', label: 'Front Office', max: 30, prefix: 'fo', d: data.sectionBreakdown.frontOffice },
                  { key: 'delivery', label: 'Delivery Process', max: 40, prefix: 'dp', d: data.sectionBreakdown.delivery },
                  { key: 'placement', label: 'Placement', max: 15, prefix: 'pp', d: data.sectionBreakdown.placement, note: `(${data.sectionBreakdown.placement?.total || 0} applicable)` },
                  { key: 'management', label: 'Management', max: 15, prefix: 'mp', d: data.sectionBreakdown.management },
                ].map((row, i) => (
                  <tr key={row.key} style={{ background: i % 2 === 0 ? '#f8faff' : 'white' }}>
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: '#1a237e' }}>
                      {row.label} {row.note && <span style={{ fontSize: 11, color: '#888', fontWeight: '400' }}>{row.note}</span>}
                      <div style={{ fontSize: 11, color: '#888', fontWeight: '400' }}>out of {row.max}</div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#555', fontWeight: '600' }}>{row.max}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span onClick={() => handleFilter(`${row.prefix}_compliant`)} style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: activeFilter === `${row.prefix}_compliant` ? '#2e7d32' : '#e8f5e9', color: activeFilter === `${row.prefix}_compliant` ? 'white' : '#2e7d32', fontWeight: '700', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                        {row.d?.compliant || 0}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span onClick={() => handleFilter(`${row.prefix}_amber`)} style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: activeFilter === `${row.prefix}_amber` ? '#e65100' : '#fff3e0', color: activeFilter === `${row.prefix}_amber` ? 'white' : '#e65100', fontWeight: '700', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                        {row.d?.amber || 0}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span onClick={() => handleFilter(`${row.prefix}_nc`)} style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: activeFilter === `${row.prefix}_nc` ? '#c62828' : '#ffebee', color: activeFilter === `${row.prefix}_nc` ? 'white' : '#c62828', fontWeight: '700', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                        {row.d?.nonCompliant || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>Click on any number to filter reports by that section and status</div>
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 16, animation: 'fadeUp 0.5s ease' }}>
        <SectionTitle icon="📈" title="Average Section Scores" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 20 }}>
          <ScoreGauge score={data.sectionAvg.frontOffice} max={30} label="Front Office" color="#1565c0" />
          <ScoreGauge score={data.sectionAvg.delivery} max={40} label="Delivery Process" color="#2e7d32" />
          <ScoreGauge score={data.sectionAvg.placement} max={15} label="Placement" color="#6a1b9a" />
          <ScoreGauge score={data.sectionAvg.management} max={15} label="Management" color="#e65100" />
          <ScoreGauge score={data.avgScore} max={100} label="Grand Total" color="#1a237e" />
        </div>
      </Card>

      <Card style={{ marginBottom: 16, animation: 'fadeUp 0.55s ease' }}>
        <SectionTitle icon="👤" title="Auditor Wise" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg,#1a237e,#3949ab)' }}>
              {['Auditor', 'Total', 'Submitted', 'Pending'].map(h => <th key={h} style={{ padding: '9px 14px', color: 'white', textAlign: 'center', fontWeight: '700', fontSize: 12 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {auditorData.map(([name, d], i) => (
              <tr key={name} style={{ background: i % 2 === 0 ? '#f8faff' : 'white' }}>
                <td style={{ padding: '8px 14px', fontWeight: '600', color: '#1a237e' }}>{name}</td>
                <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: '700' }}>{d.total}</td>
                <td style={{ padding: '8px 14px', textAlign: 'center', color: '#2e7d32', fontWeight: '700' }}>{d.submitted}</td>
                <td style={{ padding: '8px 14px', textAlign: 'center', color: d.total - d.submitted > 0 ? '#e65100' : '#2e7d32', fontWeight: '700' }}>{d.total - d.submitted}</td>
              </tr>
            ))}
            {auditorData.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#999' }}>No data</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card id="reports-section" style={{ animation: 'fadeUp 0.6s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🕐</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: '700', color: '#1a237e' }}>{activeFilter ? FILTER_LABELS[activeFilter] : 'Reports'}</h3>
            <span style={{ background: '#e8eaf6', color: '#3949ab', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: '700' }}>{displayed.length}</span>
          </div>
          {!activeFilter && (
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
              <button onClick={() => setReportView('recent')} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: 12, background: reportView === 'recent' ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'transparent', color: reportView === 'recent' ? 'white' : '#555', transition: 'all 0.2s' }}>Recent 5</button>
              <button onClick={() => setReportView('all')} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: 12, background: reportView === 'all' ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'transparent', color: reportView === 'all' ? 'white' : '#555', transition: 'all 0.2s' }}>All ({all.length})</button>
            </div>
          )}
        </div>
        {displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}><div style={{ fontSize: 36, marginBottom: 10 }}>📭</div><div>No reports found</div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr 90px 100px 100px 120px', gap: 8, padding: '8px 12px', background: 'linear-gradient(135deg,#1a237e,#3949ab)', borderRadius: 8 }}>
              {['Code', 'Center Name', 'Score', 'Compliance', 'Audit Date', 'Status'].map((h, i) => <div key={h} style={{ fontSize: 11, fontWeight: '700', color: 'white', textAlign: i === 1 ? 'left' : 'center' }}>{h}</div>)}
            </div>
            {displayed.map((r, i) => {
              const color = gc(r.grandTotal);
              const label = gl(r.grandTotal);
              return (
                <div key={i} onClick={() => openReport(r.centerCode)}
                  style={{ display: 'grid', gridTemplateColumns: '88px 1fr 90px 100px 100px 120px', gap: 8, padding: '10px 12px', background: i % 2 === 0 ? '#f8faff' : 'white', borderRadius: 8, border: '1px solid #e8eaf6', alignItems: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(102,126,234,0.18)'; e.currentTarget.style.borderColor = '#c5cae9'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e8eaf6'; }}
                >
                  <div style={{ fontWeight: '700', color: '#1a237e', fontSize: 12 }}>{r.centerCode}</div>
                  <div style={{ fontSize: 13, color: '#333', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.centerName}</div>
                  <div style={{ textAlign: 'center' }}><span style={{ padding: '3px 10px', borderRadius: 20, background: `${color}15`, color, fontWeight: '700', fontSize: 12 }}>{r.grandTotal.toFixed(1)}</span></div>
                  <div style={{ textAlign: 'center' }}><span style={{ padding: '3px 8px', borderRadius: 20, background: `${color}15`, color, fontWeight: '600', fontSize: 11 }}>{label}</span></div>
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>{r.auditDateString || '-'}</div>
                  <div style={{ textAlign: 'center' }}><span style={{ padding: '3px 8px', borderRadius: 20, background: '#e8eaf6', color: '#3949ab', fontWeight: '600', fontSize: 11 }}>{r.currentStatus}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Full Checkpoint Modal */}
      <ReportDetailModal report={selectedReport} onClose={closeModal} loading={modalLoading} />
      </div>
    </div>
  );
} 