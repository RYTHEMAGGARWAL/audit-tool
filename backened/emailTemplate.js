// emailTemplate.js - Professional Email Template for Audit Reports

const getStatusColor = (score, maxScore) => {
  const percent = (score / maxScore) * 100;
  if (percent >= 80) return '#28a745';
  if (percent >= 65) return '#ffc107';
  return '#dc3545';
};

const getStatusText = (score, maxScore) => {
  const percent = (score / maxScore) * 100;
  if (percent >= 80) return 'Compliant';
  if (percent >= 65) return 'Amber';
  return 'Non-Compliant';
};

const generateSummaryTableHTML = (reportData) => {
  const fo = parseFloat(reportData.frontOfficeScore) || 0;
  const dp = parseFloat(reportData.deliveryProcessScore) || 0;
  const pp = parseFloat(reportData.placementScore) || 0;
  const mp = parseFloat(reportData.managementScore) || 0;
  const gt = parseFloat(reportData.grandTotal) || 0;
  const isPlacementNA = reportData.placementApplicable === 'no';

  // ✅ CH Name: centerHeadName fallback to chName
  const chName = reportData.centerHeadName || reportData.chName || '-';

  return `
    <table style="width:100%; border-collapse:collapse; margin:20px 0; font-family:Arial, sans-serif;">
      <thead>
        <tr style="background:linear-gradient(135deg, #667eea, #764ba2);">
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">CENTER<br/>NAME</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">CH<br/>NAME</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">AUDIT<br/>DATE</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">FRONT<br/>OFFICE</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">DELIVERY</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">PLACEMENT</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">MANAGEMENT</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">GRAND<br/>TOTAL</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">AUDIT<br/>STATUS</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; font-weight:bold;">${reportData.centerName || '-'}</td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center;">${chName}</td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center;">${reportData.auditDateString || reportData.auditDate || '-'}</td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; color:${getStatusColor(fo, 30)}; font-weight:bold;">
            ${getStatusText(fo, 30)}<br/>(${fo.toFixed(2)})
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; color:${getStatusColor(dp, 40)}; font-weight:bold;">
            ${getStatusText(dp, 40)}<br/>(${dp.toFixed(2)})
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; color:${isPlacementNA ? '#999' : getStatusColor(pp, 15)}; font-weight:bold;">
            ${isPlacementNA ? 'NA' : `${getStatusText(pp, 15)}<br/>(${pp.toFixed(2)})`}
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; color:${getStatusColor(mp, 15)}; font-weight:bold;">
            ${getStatusText(mp, 15)}<br/>(${mp.toFixed(2)})
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; font-size:18px; font-weight:bold; color:${getStatusColor(gt, 100)};">
            ${gt.toFixed(2)}
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; font-weight:bold; color:${getStatusColor(gt, 100)};">
            ${getStatusText(gt, 100)}
          </td>
        </tr>
      </tbody>
    </table>
  `;
};

const generateEmailHTML = (reportData, customMessage = '') => {
  const summaryTable = generateSummaryTableHTML(reportData);
  const loginUrl = 'https://audit-tool-liard.vercel.app';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family:Arial, sans-serif; background-color:#f5f5f5;">
  <div style="max-width:800px; margin:0 auto; background-color:#ffffff;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:30px; text-align:center;">
      <h1 style="color:white; margin:0; font-size:28px;">📋 Audit Report</h1>
      <p style="color:rgba(255,255,255,0.9); margin:10px 0 0; font-size:16px;">
        ${reportData.centerName} (${reportData.centerCode})
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding:30px;">

      <!-- Fixed Message Body -->
      <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0; border-left:4px solid #667eea;">
        <p style="margin:0; color:#333; font-size:15px; line-height:1.8;">
          Greetings,<br/><br/>
          Thank you to you and your entire team for the cooperation extended during the physical visit at your centre.<br/><br/>
          Please find below the audit report summary for <strong>${reportData.centerName}</strong>.<br/><br/>
          Kindly review the audit observations and share your remarks using the following login credentials:<br/><br/>
          <strong>Username Hint:</strong> Your first name in lowercase — Example: "shivam"<br/>
          <strong>Password Hint:</strong> Username@Employeecode — Example: "Shivam@202451"<br/><br/>
          Please login here to submit your remarks:<br/>
          <a href="${loginUrl}" style="color:#667eea;">${loginUrl}</a><br/><br/>
          <strong>Note:</strong> You can edit and submit your remarks only once. After first submission, any changes will require Admin approval.<br/><br/>
          <strong>Important:</strong> Please fill in your remarks within 7 working days, otherwise the report will be automatically closed.<br/><br/>
          If you have any suggestions or thoughts related to the audit for further improvement, you are most welcome to share them as well.
        </p>
      </div>

      <!-- Summary Table -->
      <div style="margin:25px 0; overflow-x:auto;">
        ${summaryTable}
      </div>

      <!-- PDF Notice -->
      <div style="background:#fff3e0; padding:15px 20px; border-radius:8px; margin:20px 0; border-left:4px solid #ff9800;">
        <p style="margin:0; color:#e65100; font-size:14px;">
          📎 <strong>Attachment:</strong> Full detailed audit report is attached as PDF for your reference.
        </p>
      </div>

      <p style="font-size:14px; color:#666; margin-top:30px; line-height:1.6;">
        Best Regards,<br/>
        <strong>NIIT Audit Team</strong>
      </p>

    </div>

    <!-- Footer -->
    <div style="background:#f5f5f5; padding:20px; text-align:center; border-top:1px solid #ddd;">
      <p style="margin:0; color:#999; font-size:12px;">
        This is an automated email from NIIT Audit System. Please do not reply directly to this email.
      </p>
      <p style="margin:10px 0 0; color:#999; font-size:11px;">
        © ${new Date().getFullYear()} NIIT Limited. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
  `;
};

const generateEmailSubject = (reportData) => {
  const gt = parseFloat(reportData.grandTotal) || 0;
  const status = gt >= 80 ? 'Compliant' : gt >= 65 ? 'Amber' : 'Non-Compliant';
  return `Audit Report - ${reportData.centerName} - Score: ${gt.toFixed(2)}/100 - ${status}`;
};

const generatePDFHTML = () => ''; // unused, pdfGenerator.js handles PDF

// Email for Placement Coordinator - same template, PP focused note
const generatePlacementEmailHTML = (reportData, credentialsMsg = '') => {
  const summaryTable = generateSummaryTableHTML(reportData);
  const pp = parseFloat(reportData.placementScore) || 0;
  const ppStatus = getStatusText(pp, 15);
  const ppColor = getStatusColor(pp, 15);
  const loginUrl = 'https://audit-tool-liard.vercel.app';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; font-family:Arial, sans-serif; background-color:#f5f5f5;">
  <div style="max-width:800px; margin:0 auto; background-color:#ffffff;">
    <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:30px; text-align:center;">
      <h1 style="color:white; margin:0; font-size:28px;">📋 Audit Report</h1>
      <p style="color:rgba(255,255,255,0.9); margin:10px 0 0; font-size:16px;">
        ${reportData.centerName} (${reportData.centerCode})
      </p>
    </div>
    <div style="padding:30px;">
      <p style="font-size:16px; color:#333; margin-bottom:20px;">Greetings,</p>

      <p style="font-size:15px; color:#555; line-height:1.6;">
        Please find below the audit report summary for <strong>${reportData.centerName}</strong>.
        As the Placement Coordinator, please review the <strong>Placement Process</strong> section and submit your remarks.
      </p>
      <div style="margin:25px 0; overflow-x:auto;">${summaryTable}</div>
      <div style="background:#fff8f0; padding:15px 20px; border-radius:8px; margin:20px 0; border-left:4px solid #ff9800;">
        <p style="margin:0; color:#e65100; font-size:14px; font-weight:bold;">
          🏆 Placement Process Score: <span style="color:${ppColor}">${pp.toFixed(2)} / 15 — ${ppStatus}</span>
        </p>
        <p style="margin:8px 0 0; color:#666; font-size:13px;">
          Please login to submit your remarks for PP1–PP4 checkpoints.
        </p>
      </div>
      <div style="background:#e3f2fd; padding:15px 20px; border-radius:8px; margin:20px 0; border-left:4px solid #2196f3;">
        <p style="margin:0; color:#1565c0; font-size:14px;">
          🔗 <strong>Login here to submit your placement remarks:</strong><br/>
          <a href="${loginUrl}" style="color:#1565c0;">${loginUrl}</a>
        </p>
      </div>
      <div style="background:#fff3e0; padding:15px 20px; border-radius:8px; margin:20px 0; border-left:4px solid #ff9800;">
        <p style="margin:0; color:#e65100; font-size:14px;">
          📎 <strong>Attachment:</strong> Full detailed audit report is attached as PDF for your reference.
        </p>
      </div>
      ${credentialsMsg ? `
      <div style="background:#e8f5e9; padding:18px 20px; border-radius:8px; margin:20px 0; border-left:4px solid #2e7d32;">
        <p style="margin:0 0 8px; color:#1b5e20; font-size:14px; font-weight:bold;">🔐 Your Login Credentials</p>
        <p style="margin:0; color:#1b5e20; font-size:14px; white-space:pre-wrap;">${credentialsMsg}</p>
      </div>` : ''}
      <p style="font-size:14px; color:#666; margin-top:30px; line-height:1.6;">
        Best Regards,<br/><strong>NIIT Audit Team</strong>
      </p>
    </div>
    <div style="background:#f5f5f5; padding:20px; text-align:center; border-top:1px solid #ddd;">
      <p style="margin:0; color:#999; font-size:12px;">
        This is an automated email from NIIT Audit System. Please do not reply directly to this email.
      </p>
      <p style="margin:10px 0 0; color:#999; font-size:11px;">
        © ${new Date().getFullYear()} NIIT Limited. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
};

module.exports = {
  generateEmailHTML,
  generatePlacementEmailHTML,
  generatePDFHTML,
  generateEmailSubject,
  generateSummaryTableHTML,
  getStatusColor,
  getStatusText
};