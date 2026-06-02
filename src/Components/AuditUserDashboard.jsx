import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const AuditUserDashboard = () => {
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
  const auditorName = `${loggedUser.firstname || ''} ${loggedUser.lastname || ''}`.trim();

  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState('');

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/audit-reports`);
      if (res.ok) {
        const all = await res.json();
        // Filter only reports audited by this user
        const mine = all.filter(r =>
          (r.auditedBy || '').toLowerCase().includes((loggedUser.firstname || '').toLowerCase())
        );
        setReports(mine);
      }
    } catch(e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setLastRefresh(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => { loadReports(); }, []);

  // Stats
  const total       = reports.length;
  const compliant   = reports.filter(r => getStatus(r) === 'Compliant').length;
  const amber       = reports.filter(r => getStatus(r) === 'Amber').length;
  const nonCompliant= reports.filter(r => getStatus(r) === 'Non-Compliant').length;

  function getStatus(r) {
    const s = r.grandTotal || 0;
    if (s >= 75) return 'Compliant';
    if (s >= 50) return 'Amber';
    return 'Non-Compliant';
  }

  // Center type breakdown
  const cdcCount = reports.filter(r => r.centerType === 'CDC').length;
  const sdcCount = reports.filter(r => r.centerType === 'SDC').length;
  const dtvCount = reports.filter(r => r.centerType === 'DTV').length;

  // Report status breakdown
  const approved  = reports.filter(r => r.currentStatus === 'Approved').length;
  const pending   = reports.filter(r => r.currentStatus === 'Pending with Supervisor').length;
  const closed    = reports.filter(r => r.currentStatus === 'Closed').length;
  const notSubmit = reports.filter(r => !r.currentStatus || r.currentStatus === 'Not Submitted').length;

  const statCards = [
    { icon: '📋', label: 'Total Reports', value: total,        color: '#1a237e', bg: '#e8eaf6' },
    { icon: '✅', label: 'Compliant',     value: compliant,    color: '#2e7d32', bg: '#e8f5e9', sub: total ? `${((compliant/total)*100).toFixed(1)}%` : '0%' },
    { icon: '🟡', label: 'Amber',         value: amber,        color: '#e65100', bg: '#fff3e0', sub: total ? `${((amber/total)*100).toFixed(1)}%` : '0%' },
    { icon: '❌', label: 'Non-Compliant', value: nonCompliant, color: '#c62828', bg: '#fce4ec', sub: total ? `${((nonCompliant/total)*100).toFixed(1)}%` : '0%' },
  ];

  // Donut SVG helper
  const Donut = ({ slices, size = 120, label }) => {
    const total = slices.reduce((s, sl) => s + sl.value, 0);
    if (total === 0) return (
      <svg width={size} height={size} viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e0e0e0" strokeWidth="3.8" />
        <text x="18" y="21" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#999">{label}</text>
      </svg>
    );
    let offset = 25;
    const R = 15.9, C = 2 * Math.PI * R;
    return (
      <svg width={size} height={size} viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
        {slices.map((sl, i) => {
          const pct = (sl.value / total) * 100;
          const dash = (pct / 100) * C;
          const gap  = C - dash;
          const el = <circle key={i} cx="18" cy="18" r={R} fill="none" stroke={sl.color} strokeWidth="3.8"
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset * C / 100} />;
          offset += pct;
          return el;
        })}
        <text x="18" y="20" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#333"
          style={{ transform: 'rotate(90deg)', transformOrigin: '18px 18px' }}>{total} total</text>
      </svg>
    );
  };

  const cardStyle = {
    background: 'white', borderRadius: 12, padding: '20px 22px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 0,
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
      <div style={{ width: 40, height: 40, border: '4px solid #e0e0e0', borderTopColor: '#3949ab', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      <p style={{ fontSize: 15, fontWeight: 500 }}>Loading Dashboard...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: '20px 0', background: '#f0f2f5', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header bar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, animation:'fadeUp 0.3s ease' }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:'#1a237e' }}>📊 Audit Analytics Dashboard</h2>
          <p style={{ margin:'4px 0 0', fontSize:12, color:'#888' }}>Last refreshed: {lastRefresh}</p>
        </div>
        <button onClick={loadReports} style={{ padding:'9px 24px', background:'linear-gradient(135deg,#667eea,#764ba2)', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:14 }}>
          🔄 Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(175px, 1fr))', gap:14, marginBottom:20, animation:'fadeUp 0.35s ease' }}>
        {statCards.map(c => (
          <div key={c.label} style={{ background:'white', borderRadius:12, padding:'18px 20px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', borderTop:`4px solid ${c.color}`, display:'flex', alignItems:'center', gap:14, transition:'transform 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e=>e.currentTarget.style.transform='none'}>
            <div style={{ fontSize:30 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize:28, fontWeight:800, color:c.color, lineHeight:1 }}>{c.value}</div>
              <div style={{ fontSize:12, color:'#666', marginTop:3, fontWeight:500 }}>{c.label}</div>
              {c.sub && <div style={{ fontSize:12, color:c.color, fontWeight:700 }}>{c.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, marginBottom:20, animation:'fadeUp 0.4s ease' }}>
        {/* Compliance Status */}
        <div style={cardStyle}>
          <div style={{ fontSize:15, fontWeight:700, color:'#1a237e', marginBottom:16, paddingBottom:10, borderBottom:'2px solid #e8eaf6' }}>🎯 Compliance Status</div>
          <div style={{ display:'flex', alignItems:'center', gap:18, justifyContent:'center' }}>
            <Donut slices={[
              { value:compliant,    color:'#43a047' },
              { value:amber,        color:'#fb8c00' },
              { value:nonCompliant, color:'#e53935' },
            ]} label={`${total}`} />
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[['#43a047','Compliant',compliant],['#fb8c00','Amber',amber],['#e53935','Non-Compliant',nonCompliant]].map(([c,l,v]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#444' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:c, flexShrink:0 }} />
                  <span style={{ flex:1 }}>{l}</span>
                  <strong style={{ marginLeft:'auto', fontSize:14 }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Report Status */}
        <div style={cardStyle}>
          <div style={{ fontSize:15, fontWeight:700, color:'#1a237e', marginBottom:16, paddingBottom:10, borderBottom:'2px solid #e8eaf6' }}>📌 Report Status</div>
          <div style={{ display:'flex', alignItems:'center', gap:18, justifyContent:'center' }}>
            <Donut slices={[
              { value:closed,    color:'#7b1fa2' },
              { value:approved,  color:'#1976d2' },
              { value:pending,   color:'#fb8c00' },
              { value:notSubmit, color:'#e0e0e0' },
            ]} label={`${total}`} />
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[['#7b1fa2','Closed',closed],['#1976d2','Approved',approved],['#fb8c00','Pending',pending],['#e0e0e0','Not Submitted',notSubmit]].map(([c,l,v]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#444' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:c, flexShrink:0 }} />
                  <span style={{ flex:1 }}>{l}</span>
                  <strong style={{ marginLeft:'auto', fontSize:14 }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Type */}
        <div style={cardStyle}>
          <div style={{ fontSize:15, fontWeight:700, color:'#1a237e', marginBottom:16, paddingBottom:10, borderBottom:'2px solid #e8eaf6' }}>🏢 Center Type</div>
          <div style={{ display:'flex', alignItems:'center', gap:18, justifyContent:'center' }}>
            <Donut slices={[
              { value:cdcCount, color:'#1976d2' },
              { value:sdcCount, color:'#43a047' },
              { value:dtvCount, color:'#f57c00' },
            ]} label={`${total}`} />
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[['#1976d2','CDC',cdcCount],['#43a047','SDC',sdcCount],['#f57c00','DTV',dtvCount]].map(([c,l,v]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#444' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:c, flexShrink:0 }} />
                  <span style={{ flex:1 }}>{l}</span>
                  <strong style={{ marginLeft:'auto', fontSize:14 }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports Table */}
      <div style={{ ...cardStyle, animation:'fadeUp 0.45s ease', overflow:'hidden' }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#1a237e', marginBottom:16, paddingBottom:10, borderBottom:'2px solid #e8eaf6' }}>
          📋 Recent Audit Reports
        </div>
        {reports.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'#888', fontSize:15 }}>No reports found</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'linear-gradient(135deg,#1a237e,#3949ab)' }}>
                  {['Center Code','Center Name','Type','Audit Period','Score','Status','Report Status'].map(h => (
                    <th key={h} style={{ padding:'11px 14px', color:'white', fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:'0.4px', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.slice().reverse().slice(0, 15).map((r, i) => {
                  const status = getStatus(r);
                  const statusColor = status==='Compliant' ? '#2e7d32' : status==='Amber' ? '#e65100' : '#c62828';
                  const statusBg    = status==='Compliant' ? '#e8f5e9' : status==='Amber' ? '#fff3e0' : '#fce4ec';
                  return (
                    <tr key={r._id||i} style={{ background: i%2===0 ? '#fff' : '#f8f9ff', borderBottom:'1px solid #f0f0f0' }}>
                      <td style={{ padding:'11px 14px', fontWeight:700, color:'#3949ab' }}>{r.centerCode||'-'}</td>
                      <td style={{ padding:'11px 14px' }}>{r.centerName||'-'}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ padding:'3px 10px', borderRadius:10, fontSize:11, fontWeight:700,
                          background: r.centerType==='CDC'?'#e3f2fd':r.centerType==='SDC'?'#f3e5f5':'#e8f5e9',
                          color: r.centerType==='CDC'?'#1565c0':r.centerType==='SDC'?'#6a1b9a':'#2e7d32' }}>
                          {r.centerType||'-'}
                        </span>
                      </td>
                      <td style={{ padding:'11px 14px', color:'#555' }}>{r.auditPeriod||'-'}</td>
                      <td style={{ padding:'11px 14px', fontWeight:800, color:'#1a237e' }}>{r.grandTotal!=null ? Number(r.grandTotal).toFixed(1) : '-'}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:700, background:statusBg, color:statusColor, border:`1px solid ${statusColor}40` }}>{status}</span>
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:700,
                          background: r.currentStatus==='Approved'?'#e8f5e9':r.currentStatus==='Closed'?'#ede7f6':'#fff3e0',
                          color: r.currentStatus==='Approved'?'#2e7d32':r.currentStatus==='Closed'?'#4527a0':'#e65100' }}>
                          {r.currentStatus||'Not Submitted'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {reports.length > 15 && (
              <div style={{ padding:'10px 14px', fontSize:13, color:'#888', textAlign:'right' }}>Showing 15 of {reports.length} reports</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditUserDashboard;