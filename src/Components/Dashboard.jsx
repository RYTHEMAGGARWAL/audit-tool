import React, { useState, useEffect } from 'react';
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

export default function Dashboard() {
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
    <div style={{ padding: 20, background: '#f0f2f8', minHeight: '100vh' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: '800', color: '#1a237e' }}>Audit Analytics Dashboard</h2>
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
        <StatCard icon="⭐" label="Avg Score" value={data.avgScore.toFixed(1)} sub="out of 100" color="#7b1fa2" />
        <StatCard icon="📧" label="Email Pending" value={data.emailPending} color="#0288d1" filterKey="emailPending" />
        <StatCard icon="⏳" label="Remarks Pending" value={data.remarksPending} color="#f57c00" filterKey="remarksPending" />
        <StatCard icon="🔒" label="Closed" value={data.closed} color="#546e7a" filterKey="closed" />
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

      {/* Report Detail Modal */}
      {(selectedReport || modalLoading) && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 860, maxHeight: '88vh', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', padding: '18px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: '800' }}>Audit Report Details</div>
                {selectedReport && <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>{selectedReport.centerName} ({selectedReport.centerCode})</div>}
              </div>
              <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 26, cursor: 'pointer', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, paddingBottom: 2 }}>x</button>
            </div>

            {modalLoading && !selectedReport ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#667eea', fontWeight: '600' }}>Loading report...</div>
            ) : selectedReport && (
              <div style={{ overflowY: 'auto', padding: 24 }}>

                {/* Score Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Grand Total', value: `${parseFloat(selectedReport.grandTotal || 0).toFixed(2)}/100`, color: gc(selectedReport.grandTotal) },
                    { label: 'Front Office', value: `${parseFloat(selectedReport.frontOfficeScore || 0).toFixed(2)}/30`, color: '#1565c0' },
                    { label: 'Delivery', value: `${parseFloat(selectedReport.deliveryProcessScore || 0).toFixed(2)}/40`, color: '#2e7d32' },
                    { label: 'Placement', value: selectedReport.placementApplicable === 'no' ? 'N/A' : `${parseFloat(selectedReport.placementScore || 0).toFixed(2)}/15`, color: '#6a1b9a' },
                    { label: 'Management', value: `${parseFloat(selectedReport.managementScore || 0).toFixed(2)}/15`, color: '#e65100' },
                  ].map(s => (
                    <div key={s.label} style={{ background: `${s.color}10`, border: `2px solid ${s.color}30`, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 17, fontWeight: '800', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 3, fontWeight: '600' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Compliance Badge */}
                <div style={{ padding: '12px 16px', background: `${gc(selectedReport.grandTotal)}12`, border: `2px solid ${gc(selectedReport.grandTotal)}35`, borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 28 }}>
                    {parseFloat(selectedReport.grandTotal) >= 80 ? '✅' : parseFloat(selectedReport.grandTotal) >= 65 ? '🟡' : '❌'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: 16, color: gc(selectedReport.grandTotal) }}>{gl(selectedReport.grandTotal)}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>Score: {parseFloat(selectedReport.grandTotal || 0).toFixed(2)} / 100</div>
                  </div>
                  <div style={{ marginLeft: 'auto', padding: '4px 14px', background: '#e8eaf6', borderRadius: 20, fontSize: 12, color: '#3949ab', fontWeight: '600' }}>{selectedReport.currentStatus}</div>
                </div>

                {/* Center Info Grid */}
                <div style={{ background: '#f0f4ff', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: '700', color: '#1a237e', marginBottom: 12, fontSize: 14 }}>Center Information</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, fontSize: 13 }}>
                    {[
                      ['Center Code', selectedReport.centerCode],
                      ['Center Name', selectedReport.centerName],
                      ['Center Type', selectedReport.centerType || '-'],
                      ['Location', selectedReport.location || '-'],
                      ['Project Name', selectedReport.projectName || '-'],
                      ['Center Head', selectedReport.centerHeadName || selectedReport.chName || '-'],
                      ['ZM Name', selectedReport.zmName || '-'],
                      ['Region Head', selectedReport.regionHeadName || '-'],
                      ['Area Manager', selectedReport.areaManager || '-'],
                      ['Cluster Manager', selectedReport.clusterManager || '-'],
                      ['Placement Coordinator', selectedReport.placementCoordinator || '-'],
                      ['Audited By', selectedReport.auditedBy || '-'],
                      ['Audit Date', selectedReport.auditDateString || '-'],
                      ['Financial Year', selectedReport.financialYear || '-'],
                      ['Audit Period', selectedReport.auditPeriod || '-'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ color: '#444' }}>
                        <span style={{ fontWeight: '600', color: '#555', fontSize: 12 }}>{k}: </span>
                        <span style={{ color: '#1a237e', fontWeight: '500' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Center Remarks */}
                {selectedReport.centerRemarks && (
                  <div style={{ background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontWeight: '700', color: '#2e7d32', marginBottom: 8, fontSize: 14 }}>Center Head Remarks</div>
                    <div style={{ fontSize: 13, color: '#333', lineHeight: 1.7 }}>{selectedReport.centerRemarks}</div>
                    {selectedReport.centerRemarksBy && (
                      <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                        By: <strong>{selectedReport.centerRemarksBy}</strong> | {selectedReport.centerRemarksDate}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}