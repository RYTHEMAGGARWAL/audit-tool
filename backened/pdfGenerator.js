// ========================================
// PDF Generator - NIIT Foundation Audit Report
// Full details: logo, center head remarks, all info fields
// ========================================
const PDFDocument = require('pdfkit');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PG_W = 595, PG_H = 842, ML = 25, MR = 25, MT = 30;
const TW = PG_W - ML - MR; // 545

const C = {
  purple:'#5b21b6', purpleLight:'#ede9fe', purpleMid:'#7c3aed',
  blue:'#1e3a8a', blueMid:'#1e40af', blueSoft:'#dbeafe',
  greenText:'#059669',
  amberText:'#d97706', redText:'#dc2626',
  gray:'#6b7280', grayLight:'#f3f4f6', grayBorder:'#d1d5db',
  white:'#ffffff', dark:'#111827',
  headerBg:'#4a1d96',
};

// ── CHECKPOINT DEFINITIONS (matches frontend checkpointConfig) ──
// CDC/SDC: MP1-MP5 only | DTV: MP1-MP7
const COMMON_FO = [
  { id:'FO1', name:'Enquires Entered in Pulse(Y/N)', wt:'30%', max:9 },
  { id:'FO2', name:'Enrolment form available in Pulse(Y/N)', wt:'20%', max:6 },
  { id:'FO3', name:'Pre assessment Available(Y/N)', wt:'0%', max:0 },
  { id:'FO4', name:'Documents uploaded in Pulse(Y/N)', wt:'40%', max:12 },
  { id:'FO5', name:'Availability of Marketing Material(Y/N)', wt:'10%', max:3 },
];
const COMMON_DP = [
  { id:'DP1', name:'Batch file maintained for all running batches', wt:'15%', max:6 },
  { id:'DP2', name:'Batch Heath Card available (>= 30 days)', wt:'10%', max:4 },
  { id:'DP3', name:'Attendance marked in EDL sheets correctly', wt:'15%', max:6 },
  { id:'DP4', name:'BMS maintained with observations >= 30 days', wt:'5%', max:2 },
  { id:'DP5', name:'FACT Certificate available', wt:'5%', max:2 },
  { id:'DP6', name:'Post Assessment if applicable', wt:'10%', max:4 },
  { id:'DP7', name:'Appraisal sheet maintained', wt:'10%', max:4 },
  { id:'DP8', name:'Appraisal status in Pulse', wt:'5%', max:2 },
  { id:'DP9', name:'Certification Status', wt:'10%', max:4 },
  { id:'DP10', name:'Student signature for certificates', wt:'10%', max:4 },
  { id:'DP11', name:'System vs actual certificate date', wt:'5%', max:2 },
];
const COMMON_PP = [
  { id:'PP1', name:'Student Placement Response', wt:'40%', max:6 },
  { id:'PP2', name:'CGT/Guest Lecture/Industry Visit', wt:'20%', max:3 },
  { id:'PP3', name:'Placement Bank & Aging', wt:'20%', max:3 },
  { id:'PP4', name:'Placement Proof Upload', wt:'20%', max:3 },
];
const MP_CDC_SDC = [ // 5 checkpoints for CDC/SDC
  { id:'MP1', name:'Courseware issue/LMS Usage', wt:'15%', max:2 },
  { id:'MP2', name:'TIRM details register', wt:'15%', max:2 },
  { id:'MP3', name:'Monthly Centre Review Meeting', wt:'20%', max:3 },
  { id:'MP4', name:'Physical asset verification', wt:'20%', max:3 },
  { id:'MP5', name:'Verification of bill authenticity', wt:'15%', max:2 },
];
const MP_DTV = [ // 7 checkpoints for DTV
  { id:'MP1', name:'Courseware issue/LMS Usage', wt:'15%', max:2 },
  { id:'MP2', name:'TIRM details register', wt:'15%', max:2 },
  { id:'MP3', name:'Monthly Centre Review Meeting', wt:'20%', max:3 },
  { id:'MP4', name:'Physical asset verification', wt:'20%', max:3 },
  { id:'MP5', name:'Verification of bill authenticity', wt:'15%', max:2 },
  { id:'MP6', name:'Log book for Genset & Vehicle', wt:'10%', max:2 },
  { id:'MP7', name:'Availability and requirement of Biometric', wt:'5%', max:1 },
];
function getAreasDef(centerType) {
  const mpKeys = centerType === 'DTV' ? MP_DTV : MP_CDC_SDC;
  return [
    { label:'Front Office',      max:30, keys: COMMON_FO },
    { label:'Delivery Process',  max:40, keys: COMMON_DP },
    { label:'Placement Process', max:15, keys: COMMON_PP },
    { label:'Management Process',max:15, keys: mpKeys },
  ];
}

// Legacy single array kept for reference (not used)
const AREAS_DEF = [
  {
    label: 'Front Office', max: 30,
    keys: [
      { id:'FO1', name:'Enquires Entered in Pulse(Y/N)', wt:'30%', max:9 },
      { id:'FO2', name:'Enrolment form available in Pulse(Y/N)', wt:'20%', max:6 },
      { id:'FO3', name:'Pre assessment Available(Y/N)', wt:'0%', max:0 },
      { id:'FO4', name:'Documents uploaded in Pulse(Y/N)', wt:'40%', max:12 },
      { id:'FO5', name:'Availability of Marketing Material(Y/N)', wt:'10%', max:3 },
    ]
  },
  {
    label: 'Delivery Process', max: 40,
    keys: [
      { id:'DP1', name:'Batch file maintained for all running batches', wt:'15%', max:6 },
      { id:'DP2', name:'Batch Heath Card available (>= 30 days)', wt:'10%', max:4 },
      { id:'DP3', name:'Attendance marked in EDL sheets correctly', wt:'15%', max:6 },
      { id:'DP4', name:'BMS maintained with observations >= 30 days', wt:'5%', max:2 },
      { id:'DP5', name:'FACT Certificate available', wt:'5%', max:2 },
      { id:'DP6', name:'Post Assessment if applicable', wt:'10%', max:4 },
      { id:'DP7', name:'Appraisal sheet maintained', wt:'10%', max:4 },
      { id:'DP8', name:'Appraisal status in Pulse', wt:'5%', max:2 },
      { id:'DP9', name:'Certification Status', wt:'10%', max:4 },
      { id:'DP10', name:'Student signature for certificates', wt:'10%', max:4 },
      { id:'DP11', name:'System vs actual certificate date', wt:'5%', max:2 },
    ]
  },
  {
    label: 'Placement Process', max: 15,
    keys: [
      { id:'PP1', name:'Student Placement Response', wt:'40%', max:6 },
      { id:'PP2', name:'CGT/Guest Lecture/Industry Visit', wt:'20%', max:3 },
      { id:'PP3', name:'Placement Bank & Aging', wt:'20%', max:3 },
      { id:'PP4', name:'Placement Proof Upload', wt:'20%', max:3 },
    ]
  },
  {
    label: 'Management Process', max: 15,
    keys: [
      { id:'MP1', name:'Courseware issue/LMS Usage', wt:'15%', max:2 },
      { id:'MP2', name:'TIRM details register', wt:'15%', max:2 },
      { id:'MP3', name:'Monthly Centre Review Meeting', wt:'20%', max:3 },
      { id:'MP4', name:'Physical asset verification', wt:'20%', max:3 },
      { id:'MP5', name:'Verification of bill authenticity', wt:'15%', max:2 },
      { id:'MP6', name:'Log book for Genset & Vehicle', wt:'10%', max:2 },
      { id:'MP7', name:'Availability and requirement of Biometric', wt:'5%', max:1 },
    ]
  },
];

// ── HELPERS ───────────────────────────────────────────────────
const safe = v => (v == null || v === '') ? '-' : String(v);

function fetchImageAsBuffer(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 6000 }, (res) => {
      if (res.statusCode !== 200) { resolve(null); return; }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function fillRect(doc, x, y, w, h, fill) {
  doc.save().rect(x, y, w, h).fill(fill).restore();
}
function strokeRect(doc, x, y, w, h, color, lw = 0.5) {
  doc.save().rect(x, y, w, h).strokeColor(color).lineWidth(lw).stroke().restore();
}
function cellTxt(doc, text, x, y, w, { sz = 7.5, color = C.dark, bold = false, align = 'left', pad = 3 } = {}) {
  doc.save().font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(sz).fillColor(color)
    .text(safe(text), x + pad, y + pad, { width: w - pad * 2, align, lineBreak: true }).restore();
}
function scoreColor(s, m) {
  if (!m) return C.gray;
  const p = s / m;
  return p >= 0.8 ? C.greenText : p > 0 ? C.amberText : C.redText;
}

// ── COLUMN LAYOUT ─────────────────────────────────────────────
// sno(20)+cp(140)+wt(34)+max(28)+tot(36)+com(36)+pct(28)+sc(34)+rem(82)+chr(67) = 505 ... adjust:
// TW=545 so chr = 545-438 = 107... let's compute properly:
// sno=20, cp=138, wt=34, max=28, tot=36, com=36, pct=28, sc=34, rem=80 => sum=434 => chr=545-434=111
const COL = {
  sno: { x: ML,       w: 20  },
  cp:  { x: ML+20,    w: 138 },
  wt:  { x: ML+158,   w: 34  },
  max: { x: ML+192,   w: 28  },
  tot: { x: ML+220,   w: 36  },
  com: { x: ML+256,   w: 36  },
  pct: { x: ML+292,   w: 28  },
  sc:  { x: ML+320,   w: 34  },
  rem: { x: ML+354,   w: 80  },
  chr: { x: ML+434,   w: 111 },
};

async function generatePDF(reportData) {
  return new Promise(async (resolve, reject) => {
    try {
      // Load NIIT Foundation logo from local public folder
      let logoBuffer = null;
      const LOGO_PATHS = [
        path.join(__dirname, 'public', 'NIIT Foundation Logo PNG.png'),
        path.join(__dirname, 'public', 'niit-foundation-logo.png'),
        path.join(__dirname, 'public', 'logo.png'),
      ];
      for (const lp of LOGO_PATHS) {
        if (fs.existsSync(lp)) {
          try { logoBuffer = fs.readFileSync(lp); break; } catch(e) {}
        }
      }

      const doc = new PDFDocument({
        size: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 },
        bufferPages: true, autoFirstPage: true
      });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const grand = parseFloat(reportData.grandTotal) || 0;
      const status = grand >= 80 ? 'Compliant' : grand >= 65 ? 'Amber' : 'Non-Compliant';
      const stCol  = grand >= 80 ? C.greenText : grand >= 65 ? C.amberText : C.redText;
      const FOOTER_H = 18;

      // ══════════════════════════════════════════════
      // HEADER with logo
      // ══════════════════════════════════════════════
      const HDR_H = 76;
      fillRect(doc, 0, 0, PG_W, HDR_H, C.headerBg);

      let logoW = 0;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, ML, 10, { height: 44, fit: [150, 44] });
          logoW = 158;
        } catch(e) {}
      }

      const txtX = ML + logoW;
      const txtW = TW - logoW;

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#c4b5fd')
        .text('NIIT FOUNDATION', txtX, 12, { width: txtW, align: logoW > 0 ? 'left' : 'center' });
      doc.font('Helvetica-Bold').fontSize(20).fillColor(C.white)
        .text('Audit Report', txtX, 26, { width: txtW, align: logoW > 0 ? 'left' : 'center' });
      doc.font('Helvetica').fontSize(10).fillColor('#ddd6fe')
        .text(`${safe(reportData.centerName)} (${safe(reportData.centerCode)})`,
          txtX, 52, { width: txtW, align: logoW > 0 ? 'left' : 'center' });

      let y = HDR_H + 6;

      // ══════════════════════════════════════════════
      // CENTER INFORMATION BOX
      // ══════════════════════════════════════════════
      const chName = reportData.centerHeadName || reportData.chName || '-';
      const infoRows = [
        ['Center Code',   reportData.centerCode,          'Center Name',    reportData.centerName,                              'Financial Year',      reportData.financialYear],
        ['Center Head',   chName,                         'Project Name',   reportData.projectName,                             'ZM Name',             reportData.zmName],
        ['Region Head',   reportData.regionHeadName,      'Area Manager',   reportData.areaManager||reportData.areaClusterManager, 'Cluster Manager',  reportData.clusterManager],
        ['Location',      reportData.location||reportData.geolocation, 'Center Type', reportData.centerType,              'Audited By',          reportData.auditedBy],
        ['Audit Period',  reportData.auditPeriod,         'Audit Date',     reportData.auditDateString||reportData.auditDate,   'Grand Total/Status',  `${grand.toFixed(2)}/100 — ${status}`],
      ];

      if (reportData.placementCoordinator || reportData.seniorManagerPlacement || reportData.nationalHeadPlacement) {
        infoRows.push([
          'Placement Coord.', reportData.placementCoordinator,
          'Sr. Mgr Placement', reportData.seniorManagerPlacement,
          'National Head Placement', reportData.nationalHeadPlacement
        ]);
      }

      const ROW_H = 14;
      const BOX_H = infoRows.length * ROW_H + 8;
      const COL3  = TW / 3;

      fillRect(doc, ML, y, TW, BOX_H, '#faf5ff');
      strokeRect(doc, ML, y, TW, BOX_H, C.purpleMid, 0.8);

      infoRows.forEach((row, ri) => {
        const ry = y + 5 + ri * ROW_H;
        if (ri > 0) {
          doc.save().moveTo(ML, ry - 1).lineTo(ML + TW, ry - 1)
            .strokeColor('#e9d5ff').lineWidth(0.3).stroke().restore();
        }
        for (let ci = 0; ci < 3; ci++) {
          const label = row[ci * 2];
          const value = row[ci * 2 + 1];
          const cx = ML + ci * COL3 + 5;
          const lw = 72, vw = COL3 - lw - 10;
          const isHL = label === 'Grand Total/Status';
          doc.font('Helvetica-Bold').fontSize(7).fillColor(C.purpleMid)
            .text(label + ':', cx, ry, { width: lw, lineBreak: false });
          doc.font('Helvetica').fontSize(7).fillColor(isHL ? stCol : C.dark)
            .text(safe(value), cx + lw, ry, { width: vw, lineBreak: false });
        }
      });

      y += BOX_H + 8;

      // ══════════════════════════════════════════════
      // SECTION HEADING
      // ══════════════════════════════════════════════
      fillRect(doc, ML, y, TW, 18, C.blue);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
        .text('Detailed Checkpoint Report', ML + 6, y + 5, { width: TW });
      y += 22;

      // ══════════════════════════════════════════════
      // TABLE HEADER FUNCTION
      // ══════════════════════════════════════════════
      const TH = 22;
      const HDRS = [
        ['S.No', COL.sno], ['Checkpoint', COL.cp], ['Wt.', COL.wt],
        ['Max\nScore', COL.max], ['Total\nSamples', COL.tot], ['Compliant', COL.com],
        ['%', COL.pct], ['Score', COL.sc], ['Remarks', COL.rem],
        ['Center Head\nRemarks', COL.chr],
      ];

      const drawTableHeader = (yy) => {
        fillRect(doc, ML, yy, TW, TH, C.purple);
        fillRect(doc, COL.chr.x, yy, COL.chr.w, TH, '#15803d');
        HDRS.forEach(([lbl, c]) => {
          doc.font('Helvetica-Bold').fontSize(6).fillColor(C.white)
            .text(lbl, c.x + 1, yy + 4, { width: c.w - 2, align: 'center' });
        });
        return yy + TH;
      };

      y = drawTableHeader(y);

      const ensureSpace = (need) => {
        if (y + need > PG_H - FOOTER_H - 4) {
          doc.addPage();
          y = MT;
          y = drawTableHeader(y);
        }
      };

      // ══════════════════════════════════════════════
      // ROWS
      // ══════════════════════════════════════════════
      let rowIdx = 0;
      const AREAS = getAreasDef(reportData.centerType);

      AREAS.forEach(area => {
        const isPlacement = area.label === 'Placement Process';
        const na = isPlacement && reportData.placementApplicable === 'no';
        const aScore = area.keys.reduce((s, k) => s + (parseFloat((reportData[k.id] || {}).score) || 0), 0);

        // Area sub-header
        ensureSpace(16);
        fillRect(doc, ML, y, TW, 16, C.purpleLight);
        strokeRect(doc, ML, y, TW, 16, C.purpleMid, 0.5);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.purpleMid)
          .text(`Area: ${area.label}  (Max Score: ${area.max})`, ML + 5, y + 4, { width: TW * 0.6 });
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.purpleMid)
          .text(na ? 'N/A' : `Score: ${aScore.toFixed(2)}`, ML + TW * 0.6, y + 4, { width: TW * 0.38, align: 'right' });
        y += 16;

        if (na) {
          ensureSpace(14);
          fillRect(doc, ML, y, TW, 14, C.grayLight);
          strokeRect(doc, ML, y, TW, 14, C.grayBorder);
          doc.font('Helvetica').fontSize(8).fillColor(C.gray)
            .text('Placement Process — NOT APPLICABLE', ML + 6, y + 3, { width: TW });
          y += 14;
        } else {
          area.keys.forEach((cpCfg, i) => {
            const cp     = reportData[cpCfg.id] || {};
            const score  = parseFloat(cp.score) || 0;
            const maxSc  = cpCfg.max || 0;
            const pct    = cp.compliantPercent != null ? `${parseFloat(cp.compliantPercent).toFixed(0)}%` : '-';
            const rem    = safe(cp.remarks);
            const chrRem = (cp.centerHeadRemarks && cp.centerHeadRemarks.trim()) ? cp.centerHeadRemarks.trim() : '';

            // Row height = tallest cell
            const cpLines  = Math.ceil((cpCfg.name || '').length / 21);
            const remLines = Math.ceil(rem.replace(/-/g,'').length / 13);
            const chrLines = chrRem ? Math.ceil(chrRem.length / 16) : 1;
            const rowH = Math.max(cpLines, remLines, chrLines, 1) * 10 + 6;

            ensureSpace(rowH);
            rowIdx++;

            fillRect(doc, ML, y, TW, rowH, rowIdx % 2 === 0 ? '#f5f3ff' : C.white);
            fillRect(doc, COL.chr.x, y, COL.chr.w, rowH, chrRem ? '#f0fdf4' : '#fafafa');
            strokeRect(doc, ML, y, TW, rowH, C.grayBorder, 0.3);

            // Vertical dividers
            Object.values(COL).forEach(c => {
              doc.save().moveTo(c.x, y).lineTo(c.x, y + rowH)
                .strokeColor(C.grayBorder).lineWidth(0.3).stroke().restore();
            });
            doc.save().moveTo(ML + TW, y).lineTo(ML + TW, y + rowH)
              .strokeColor(C.grayBorder).lineWidth(0.3).stroke().restore();

            cellTxt(doc, String(i + 1),             COL.sno.x, y, COL.sno.w, { align:'center', sz:7 });
            cellTxt(doc, cpCfg.name || cpCfg.id,    COL.cp.x,  y, COL.cp.w,  { sz:7 });
            cellTxt(doc, cpCfg.wt || '-',           COL.wt.x,  y, COL.wt.w,  { align:'center', sz:7 });
            cellTxt(doc, String(maxSc),             COL.max.x, y, COL.max.w, { align:'center', sz:7 });
            cellTxt(doc, safe(cp.totalSamples),     COL.tot.x, y, COL.tot.w, { align:'center', sz:7 });
            cellTxt(doc, safe(cp.samplesCompliant), COL.com.x, y, COL.com.w, { align:'center', sz:7 });
            cellTxt(doc, pct,                       COL.pct.x, y, COL.pct.w, { align:'center', sz:7 });
            cellTxt(doc, score.toFixed(2),          COL.sc.x,  y, COL.sc.w,
              { align:'center', sz:8, bold:true, color: scoreColor(score, maxSc) });
            cellTxt(doc, rem,                       COL.rem.x, y, COL.rem.w, { sz:6.5, color: C.gray });
            cellTxt(doc,
              chrRem || 'No remarks',
              COL.chr.x, y, COL.chr.w,
              { sz:6.5, color: chrRem ? '#166534' : '#9ca3af' }
            );

            y += rowH;
          });
        }

        // Area total
        ensureSpace(15);
        fillRect(doc, ML, y, TW, 15, C.blueSoft);
        strokeRect(doc, ML, y, TW, 15, C.blueMid, 0.6);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.blue)
          .text(`${area.label} — Total Score:`, ML + 6, y + 3, { width: TW - 95 });
        doc.font('Helvetica-Bold').fontSize(9)
          .fillColor(na ? C.gray : scoreColor(aScore, area.max))
          .text(na ? 'N/A' : `${aScore.toFixed(2)} / ${area.max}`, ML + TW - 95, y + 2, { width: 89, align:'right' });
        y += 20;
      });

      // ══════════════════════════════════════════════
      // GRAND TOTAL BAR
      // ══════════════════════════════════════════════
      ensureSpace(32);
      fillRect(doc, ML, y, TW, 30, '#1e1b4b');
      strokeRect(doc, ML, y, TW, 30, '#312e81', 1);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(C.white)
        .text('GRAND TOTAL', ML + 10, y + 9, { width: TW * 0.38 });
      const grandColor = grand >= 80 ? '#6ee7b7' : grand >= 65 ? '#fcd34d' : '#fca5a5';
      doc.font('Helvetica-Bold').fontSize(13).fillColor(grandColor)
        .text(`${grand.toFixed(2)} / 100`, ML + TW * 0.38, y + 7, { width: TW * 0.32, align:'center' });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(grandColor)
        .text(status, ML + TW * 0.72, y + 9, { width: TW * 0.26, align:'right' });

      // ══════════════════════════════════════════════
      // FOOTER (every page)
      // ══════════════════════════════════════════════
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        const fy = PG_H - FOOTER_H;
        fillRect(doc, 0, fy, PG_W, FOOTER_H, '#f9fafb');
        doc.save().moveTo(0, fy).lineTo(PG_W, fy)
          .strokeColor(C.grayBorder).lineWidth(0.4).stroke().restore();
        doc.font('Helvetica').fontSize(7).fillColor(C.gray)
          .text(
            `NIIT Foundation Audit System  |  ${safe(reportData.centerName)} (${safe(reportData.centerCode)})  |  Page ${i + 1} of ${range.count}`,
            ML, fy + 5, { width: TW, align:'center' }
          );
      }

      doc.end();
    } catch (err) {
      console.error('❌ PDF error:', err);
      reject(err);
    }
  });
}

module.exports = { generatePDF };