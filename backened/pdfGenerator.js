// ========================================
// PDF Generator - NIIT Audit Report
// Clean table layout, all details
// ========================================
const PDFDocument = require('pdfkit');

const PG_W = 595, PG_H = 842, ML = 30, MR = 30, MT = 30, MB = 30;
const TW = PG_W - ML - MR; // 535

const C = {
  purple:'#5b21b6', purpleLight:'#ede9fe', purpleMid:'#7c3aed',
  blue:'#1e3a8a', blueMid:'#1e40af', blueSoft:'#dbeafe',
  green:'#065f46', greenLight:'#d1fae5', greenText:'#059669',
  amberText:'#d97706', redText:'#dc2626',
  gray:'#6b7280', grayLight:'#f3f4f6', grayBorder:'#d1d5db',
  white:'#ffffff', dark:'#111827', mid:'#374151',
};

const CP = {
  FO1:{name:'Enquires Entered in Pulse(Y/N)',wt:'30%',max:9},
  FO2:{name:'Enrolment form available in Pulse(Y/N)',wt:'20%',max:6},
  FO3:{name:'Pre assessment Available(Y/N)',wt:'0%',max:0},
  FO4:{name:'Documents uploaded in Pulse(Y/N)',wt:'40%',max:12},
  FO5:{name:'Availability of Marketing Material(Y/N)',wt:'10%',max:3},
  DP1:{name:'Batch file maintained for all running batches',wt:'15%',max:6},
  DP2:{name:'Batch Heath Card available (>= 30 days)',wt:'10%',max:4},
  DP3:{name:'Attendance marked in EDL sheets correctly',wt:'15%',max:6},
  DP4:{name:'BMS maintained with observations >= 30 days',wt:'5%',max:2},
  DP5:{name:'FACT Certificate available',wt:'5%',max:2},
  DP6:{name:'Post Assessment if applicable',wt:'10%',max:4},
  DP7:{name:'Appraisal sheet maintained',wt:'10%',max:4},
  DP8:{name:'Appraisal status in Pulse',wt:'5%',max:2},
  DP9:{name:'Certification Status',wt:'10%',max:4},
  DP10:{name:'Student signature for certificates',wt:'10%',max:4},
  DP11:{name:'System vs actual certificate date',wt:'5%',max:2},
  PP1:{name:'Student Placement Response',wt:'40%',max:6},
  PP2:{name:'CGT/Guest Lecture/Industry Visit',wt:'20%',max:3},
  PP3:{name:'Placement Bank & Aging',wt:'20%',max:3},
  PP4:{name:'Placement Proof Upload',wt:'20%',max:3},
  MP1:{name:'Courseware issue/LMS Usage',wt:'15%',max:2},
  MP2:{name:'TIRM details register',wt:'15%',max:2},
  MP3:{name:'Monthly Centre Review Meeting',wt:'20%',max:3},
  MP4:{name:'Physical asset verification',wt:'20%',max:3},
  MP5:{name:'Verification of bill authenticity',wt:'15%',max:2},
  MP6:{name:'Log book for Genset & Vehicle',wt:'10%',max:2},
  MP7:{name:'Availability and requirement of Biometric',wt:'5%',max:1},
};

const AREAS = [
  {label:'Front Office',max:30,keys:['FO1','FO2','FO3','FO4','FO5']},
  {label:'Delivery Process',max:40,keys:['DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11']},
  {label:'Placement Process',max:15,keys:['PP1','PP2','PP3','PP4']},
  {label:'Management Process',max:15,keys:['MP1','MP2','MP3','MP4','MP5','MP6','MP7']},
];

// col x positions & widths (sum = TW 535)
const COL = {
  sno: {x:ML,      w:24},
  cp:  {x:ML+24,   w:152},
  wt:  {x:ML+176,  w:40},
  max: {x:ML+216,  w:36},
  tot: {x:ML+252,  w:44},
  com: {x:ML+296,  w:44},
  pct: {x:ML+340,  w:34},
  sc:  {x:ML+374,  w:40},
  rem: {x:ML+414,  w:TW-414+ML}, // ~121
};

const safe = v => (v==null||v==='')?'-':String(v);

function fillRect(doc,x,y,w,h,fill){
  doc.save().rect(x,y,w,h).fill(fill).restore();
}
function strokeRect(doc,x,y,w,h,color,lw=0.5){
  doc.save().rect(x,y,w,h).strokeColor(color).lineWidth(lw).stroke().restore();
}
function cellTxt(doc,text,x,y,w,{sz=8,color=C.dark,bold=false,align='left',pad=3}={}){
  doc.save().font(bold?'Helvetica-Bold':'Helvetica').fontSize(sz).fillColor(color)
     .text(safe(text),x+pad,y+pad,{width:w-pad*2,align,lineBreak:true}).restore();
}
function scoreColor(s,m){
  if(!m) return C.gray;
  return s/m>=0.8?C.greenText:s>0?C.amberText:C.redText;
}

async function generatePDF(reportData){
  return new Promise((resolve,reject)=>{
    try{
      const doc = new PDFDocument({
        size:'A4', margins:{top:0,bottom:0,left:0,right:0},
        bufferPages:true, autoFirstPage:true
      });
      const chunks=[];
      doc.on('data',c=>chunks.push(c));
      doc.on('end',()=>resolve(Buffer.concat(chunks)));
      doc.on('error',reject);

      const grand = parseFloat(reportData.grandTotal)||0;
      const status= grand>=80?'Compliant':grand>=65?'Amber':'Non-Compliant';
      const stCol = grand>=80?C.greenText:grand>=65?C.amberText:C.redText;
      const FOOTER = 18;

      // ── HEADER ──────────────────────────────────────────
      fillRect(doc,0,0,PG_W,58,C.purple);
      doc.font('Helvetica-Bold').fontSize(18).fillColor(C.white)
         .text('Audit Report',ML,10,{width:TW,align:'center'});
      doc.font('Helvetica').fontSize(10).fillColor('#ddd6fe')
         .text(`${safe(reportData.centerName)} (${safe(reportData.centerCode)})`,ML,34,{width:TW,align:'center'});

      let y = 65;

      // ── INFO GRID (3 col × N rows) ────────────────────────
      const chName = reportData.centerHeadName || reportData.chName || '-';
      const infoData = [
        ['Center Code', reportData.centerCode,  'Center Name',   reportData.centerName,         'Financial Year', reportData.financialYear],
        ['CH Name',     chName,                  'Project Name',  reportData.projectName,        'ZM Name',        reportData.zmName],
        ['Region Head', reportData.regionHeadName, 'Area/Cluster', reportData.areaClusterManager, 'Center Type',   reportData.centerType],
        ['Location',    reportData.location,     'Audited By',    reportData.auditedBy,          'Audit Date',     reportData.auditDateString||reportData.auditDate],
        ['Audit Period',reportData.auditPeriod,  'Grand Total',   `${grand.toFixed(2)}/100`,   'Status',         status],
      ];

      const ROW_H  = 14;
      const BOX_H  = infoData.length * ROW_H + 8;
      const COL3   = TW / 3;

      fillRect(doc,ML,y,TW,BOX_H,'#faf5ff');
      strokeRect(doc,ML,y,TW,BOX_H,C.purpleMid,0.8);

      infoData.forEach((row,ri)=>{
        const ry = y + 5 + ri * ROW_H;
        // horizontal divider (except first)
        if(ri>0){
          doc.save().moveTo(ML,ry-1).lineTo(ML+TW,ry-1)
             .strokeColor('#e9d5ff').lineWidth(0.3).stroke().restore();
        }
        for(let ci=0;ci<3;ci++){
          const label = row[ci*2];
          const value = row[ci*2+1];
          const cx    = ML + ci * COL3 + 5;
          const lw    = 62;   // label width (fixed)
          const vw    = COL3 - lw - 10;  // value width
          const vColor= (label==='Grand Total'||label==='Status') ? stCol : C.dark;
          // label (bold, fixed width so it never wraps into value)
          doc.font('Helvetica-Bold').fontSize(7).fillColor(C.purpleMid)
             .text(label+':', cx, ry, {width:lw, lineBreak:false});
          // value (starts right after label column)
          doc.font('Helvetica').fontSize(7).fillColor(vColor)
             .text(safe(value), cx+lw, ry, {width:vw, lineBreak:false});
        }
      });

      y += BOX_H + 8;

      // ── SECTION TITLE ─────────────────────────────────────
      fillRect(doc,ML,y,TW,18,C.blue);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
         .text('Detailed Checkpoint Report',ML+6,y+5,{width:TW});
      y += 22;

      // ── TABLE HEADER ──────────────────────────────────────
      const TH = 20;
      fillRect(doc,ML,y,TW,TH,C.purple);
      const HDRS=[
        ['S.No',COL.sno],['Checkpoint',COL.cp],['Weightage',COL.wt],
        ['Max\nScore',COL.max],['Total\nSamples',COL.tot],['Compliant',COL.com],
        ['%',COL.pct],['Score',COL.sc],['Remarks',COL.rem],
      ];
      HDRS.forEach(([lbl,c])=>{
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.white)
           .text(lbl,c.x+2,y+3,{width:c.w-4,align:'center'});
      });
      y += TH;

      const ensureSpace=(need)=>{
        if(y+need > PG_H-FOOTER-4){
          doc.addPage(); y=MT;
          fillRect(doc,ML,y,TW,TH,C.purple);
          HDRS.forEach(([lbl,c])=>{
            doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.white)
               .text(lbl,c.x+2,y+3,{width:c.w-4,align:'center'});
          });
          y += TH;
        }
      };

      let rowIdx=0;

      AREAS.forEach(area=>{
        const isP = area.label==='Placement Process';
        const na  = isP && reportData.placementApplicable==='no';
        const aScore = area.keys.reduce((s,k)=>s+(parseFloat((reportData[k]||{}).score)||0),0);

        // area sub-header
        ensureSpace(15);
        fillRect(doc,ML,y,TW,15,C.purpleLight);
        strokeRect(doc,ML,y,TW,15,C.purpleMid,0.5);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.purpleMid)
           .text(`Area: ${area.label} (Total Score: ${area.max})`,ML+6,y+4,{width:TW*0.6});
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.purpleMid)
           .text(`Total Score: ${na?'N/A':aScore.toFixed(2)}`,ML+TW*0.6,y+4,{width:TW*0.38,align:'right'});
        y += 15;

        if(na){
          ensureSpace(14);
          fillRect(doc,ML,y,TW,14,C.grayLight);
          strokeRect(doc,ML,y,TW,14,C.grayBorder);
          doc.font('Helvetica').fontSize(8).fillColor(C.gray)
             .text('Placement Process — NOT APPLICABLE',ML+6,y+3,{width:TW});
          y += 14;
        } else {
          area.keys.forEach((cpId,i)=>{
            const cp   = reportData[cpId]||{};
            const cfg  = CP[cpId]||{};
            const score= parseFloat(cp.score)||0;
            const maxSc= cfg.max||0;
            const pct  = cp.compliantPercent!=null?`${parseFloat(cp.compliantPercent).toFixed(0)}%`:'-';
            const rem  = safe(cp.remarks||cp.centerHeadRemarks);

            // row height based on longest wrapping text
            const nameLines = Math.ceil((cfg.name||cpId).length / 24);
            const remLines  = Math.ceil(rem.length / 20);
            const rowH = Math.max(nameLines,remLines,1)*10 + 6;

            ensureSpace(rowH);

            rowIdx++;
            fillRect(doc,ML,y,TW,rowH,rowIdx%2===0?'#f5f3ff':C.white);
            strokeRect(doc,ML,y,TW,rowH,C.grayBorder,0.3);
            Object.values(COL).forEach(c=>{
              doc.save().moveTo(c.x,y).lineTo(c.x,y+rowH)
                 .strokeColor(C.grayBorder).lineWidth(0.3).stroke().restore();
            });
            doc.save().moveTo(ML+TW,y).lineTo(ML+TW,y+rowH)
               .strokeColor(C.grayBorder).lineWidth(0.3).stroke().restore();

            cellTxt(doc,String(i+1),     COL.sno.x,y,COL.sno.w,{align:'center',sz:7.5});
            cellTxt(doc,cfg.name||cpId,  COL.cp.x, y,COL.cp.w, {sz:7.5});
            cellTxt(doc,cfg.wt||'-',     COL.wt.x, y,COL.wt.w, {align:'center',sz:7.5});
            cellTxt(doc,String(maxSc),   COL.max.x,y,COL.max.w,{align:'center',sz:7.5});
            cellTxt(doc,safe(cp.totalSamples),    COL.tot.x,y,COL.tot.w,{align:'center',sz:7.5});
            cellTxt(doc,safe(cp.samplesCompliant),COL.com.x,y,COL.com.w,{align:'center',sz:7.5});
            cellTxt(doc,pct,             COL.pct.x,y,COL.pct.w,{align:'center',sz:7.5});
            cellTxt(doc,score.toFixed(2),COL.sc.x, y,COL.sc.w,
              {align:'center',sz:8,bold:true,color:scoreColor(score,maxSc)});
            cellTxt(doc,rem,             COL.rem.x,y,COL.rem.w,{sz:7,color:C.gray});

            y += rowH;
          });
        }

        // area total
        ensureSpace(14);
        fillRect(doc,ML,y,TW,14,C.blueSoft);
        strokeRect(doc,ML,y,TW,14,C.blueMid,0.6);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.blue)
           .text(`${area.label} — Total Score:`,ML+6,y+3,{width:TW-85});
        doc.font('Helvetica-Bold').fontSize(9).fillColor(C.greenText)
           .text(na?'N/A':aScore.toFixed(2),ML+TW-85,y+2,{width:79,align:'right'});
        y += 19;
      });

      // ── GRAND TOTAL ───────────────────────────────────────
      ensureSpace(30);
      fillRect(doc,ML,y,TW,28,'#1e1b4b');
      strokeRect(doc,ML,y,TW,28,'#312e81',1);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(C.white)
         .text('GRAND TOTAL',ML+10,y+8,{width:TW*0.38});
      doc.font('Helvetica-Bold').fontSize(13)
         .fillColor(grand>=80?'#6ee7b7':grand>=65?'#fcd34d':'#fca5a5')
         .text(`${grand.toFixed(2)} / 100`,ML+TW*0.38,y+6,{width:TW*0.32,align:'center'});
      doc.font('Helvetica-Bold').fontSize(10)
         .fillColor(grand>=80?'#6ee7b7':grand>=65?'#fcd34d':'#fca5a5')
         .text(status,ML+TW*0.72,y+8,{width:TW*0.26,align:'right'});
      y += 34;

      // ── FOOTERS ───────────────────────────────────────────
      const range=doc.bufferedPageRange();
      for(let i=0;i<range.count;i++){
        doc.switchToPage(i);
        const fy=PG_H-FOOTER;
        fillRect(doc,0,fy,PG_W,FOOTER,'#f9fafb');
        doc.save().moveTo(0,fy).lineTo(PG_W,fy)
           .strokeColor(C.grayBorder).lineWidth(0.4).stroke().restore();
        doc.font('Helvetica').fontSize(7).fillColor(C.gray)
           .text(
             `NIIT Audit System  |  ${safe(reportData.centerName)} (${safe(reportData.centerCode)})  |  Page ${i+1} of ${range.count}`,
             ML,fy+5,{width:TW,align:'center'}
           );
      }

      doc.end();
    }catch(err){
      console.error('❌ PDF error:',err);
      reject(err);
    }
  });
}

module.exports = { generatePDF };