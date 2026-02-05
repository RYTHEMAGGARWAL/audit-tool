// ========================================
// PDF Generator using PDFKit
// Lightweight alternative to Puppeteer
// ========================================

const PDFDocument = require('pdfkit');

/**
 * Generate PDF for Audit Report
 * @param {Object} reportData - Complete report data
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function generatePDF(reportData) {
  return new Promise((resolve, reject) => {
    try {
      console.log('📄 Starting PDF generation with PDFKit...');
      
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const chunks = [];
      
      // Collect PDF data
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        console.log('✅ PDF generated successfully');
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
      
      // ========================================
      // PDF HEADER
      // ========================================
      doc.fontSize(20)
         .fillColor('#1e40af')
         .text('NIIT Audit Report', { align: 'center' })
         .moveDown(0.5);
      
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' })
         .moveDown(1);
      
      // Horizontal line
      doc.moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .strokeColor('#e5e7eb')
         .stroke()
         .moveDown(1);
      
      // ========================================
      // BASIC INFORMATION
      // ========================================
      doc.fontSize(14)
         .fillColor('#1f2937')
         .text('Report Information', { underline: true })
         .moveDown(0.5);
      
      const infoData = [
        ['Center Name:', reportData.centerName || 'N/A'],
        ['Center Code:', reportData.centerCode || 'N/A'],
        ['CH Name:', reportData.chName || 'N/A'],
        ['Audit Date:', reportData.auditDate || 'N/A'],
        ['Auditor Name:', reportData.auditorName || 'N/A'],
        ['Overall Score:', `${reportData.totalScore || 0}/${reportData.maxScore || 100}`]
      ];
      
      doc.fontSize(10).fillColor('#374151');
      infoData.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(label, { continued: true, width: 150 })
           .font('Helvetica').text(` ${value}`)
           .moveDown(0.3);
      });
      
      doc.moveDown(1);
      
      // ========================================
      // CHECKPOINT SCORES
      // ========================================
      const checkpointData = {
        'Front Office': ['FO1', 'FO2', 'FO3', 'FO4', 'FO5'],
        'Delivery Process': ['DP1', 'DP2', 'DP3', 'DP4', 'DP5', 'DP6', 'DP7', 'DP8', 'DP9', 'DP10', 'DP11'],
        'Placement Process': ['PP1', 'PP2', 'PP3', 'PP4'],
        'Management Process': ['MP1', 'MP2', 'MP3', 'MP4', 'MP5']
      };
      
      const checkpointNames = {
        'FO1': 'Enquires Entered in Pulse',
        'FO2': 'Enrolment form available',
        'FO3': 'Pre assessment Available',
        'FO4': 'Documents uploaded in Pulse',
        'FO5': 'Marketing Material',
        'DP1': 'Batch file maintained',
        'DP2': 'Batch Heath Card',
        'DP3': 'Attendance marked correctly',
        'DP4': 'BMS maintained',
        'DP5': 'FACT Certificate',
        'DP6': 'Post Assessment',
        'DP7': 'Appraisal sheet maintained',
        'DP8': 'Appraisal status in Pulse',
        'DP9': 'Certification Status',
        'DP10': 'Student signature on certificates',
        'DP11': 'Certificate date verification',
        'PP1': 'Student Placement Response',
        'PP2': 'CGT/Guest Lecture/Industry Visit',
        'PP3': 'Placement Bank & Aging',
        'PP4': 'Placement Proof Upload',
        'MP1': 'Courseware/LMS Usage',
        'MP2': 'TIRM details register',
        'MP3': 'Monthly Centre Review Meeting',
        'MP4': 'Physical asset verification',
        'MP5': 'Bill authenticity verification'
      };
      
      Object.keys(checkpointData).forEach((area, idx) => {
        // Add page break if needed
        if (doc.y > 650) {
          doc.addPage();
        }
        
        // Area Header
        doc.fontSize(12)
           .fillColor('#1e40af')
           .text(`${idx + 1}. ${area}`, { underline: true })
           .moveDown(0.5);
        
        // Checkpoints
        checkpointData[area].forEach(cpId => {
          const cp = reportData[cpId] || {};
          const score = cp.score || 0;
          const maxScore = cp.maxScore || 0;
          const remarks = cp.auditorRemarks || '-';
          
          doc.fontSize(9)
             .fillColor('#374151')
             .font('Helvetica-Bold')
             .text(`${cpId}: ${checkpointNames[cpId] || cpId}`, { continued: true })
             .font('Helvetica')
             .fillColor(score === maxScore ? '#059669' : (score > 0 ? '#f59e0b' : '#dc2626'))
             .text(` (${score}/${maxScore})`, { align: 'right' });
          
          if (remarks !== '-') {
            doc.fontSize(8)
               .fillColor('#6b7280')
               .text(`   Remarks: ${remarks}`, { indent: 10 })
               .moveDown(0.2);
          }
          
          doc.moveDown(0.3);
        });
        
        doc.moveDown(0.5);
      });
      
      // ========================================
      // CENTER HEAD REMARKS (If available)
      // ========================================
      if (reportData.centerHeadCheckpointRemarks && Object.keys(reportData.centerHeadCheckpointRemarks).length > 0) {
        // Add page break
        doc.addPage();
        
        doc.fontSize(14)
           .fillColor('#1f2937')
           .text('Center Head Remarks', { underline: true })
           .moveDown(0.5);
        
        Object.keys(reportData.centerHeadCheckpointRemarks).forEach(cpId => {
          const remark = reportData.centerHeadCheckpointRemarks[cpId];
          if (remark && remark.trim()) {
            doc.fontSize(9)
               .fillColor('#374151')
               .font('Helvetica-Bold')
               .text(`${cpId}: `, { continued: true })
               .font('Helvetica')
               .text(remark)
               .moveDown(0.3);
          }
        });
      }
      
      // ========================================
      // FOOTER
      // ========================================
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        // Footer line
        doc.moveTo(50, 770)
           .lineTo(545, 770)
           .strokeColor('#e5e7eb')
           .stroke();
        
        // Footer text
        doc.fontSize(8)
           .fillColor('#9ca3af')
           .text(
             `NIIT Audit System | Page ${i + 1} of ${pageCount}`,
             50,
             775,
             { align: 'center', width: 495 }
           );
      }
      
      // Finalize PDF
      doc.end();
      
    } catch (err) {
      console.error('❌ PDF generation error:', err);
      reject(err);
    }
  });
}

module.exports = { generatePDF };