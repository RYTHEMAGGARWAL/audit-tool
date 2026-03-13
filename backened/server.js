// ========================================
// NIIT Audit System - MongoDB Server
// ========================================
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { generatePDF } = require('./pdfGenerator');
const path = require('path');
const fs = require('fs');
const { generateEmailHTML, generateEmailSubject } = require('./emailTemplate');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ========================================
// NODEMAILER EMAIL CONFIGURATION
// ========================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
console.log('📧 Email configured with Gmail');
console.log('📧 User:', process.env.EMAIL_USER);

// Skip verification - causes timeout
console.log('📧 Email configured with SendGrid');
console.log('📧 Host:', process.env.SMTP_HOST);
console.log('📧 Port:', process.env.SMTP_PORT);

// ========================================
// PDF GENERATION FUNCTION (Using Puppeteer)
// ========================================


// ========================================
// MONGODB CONNECTION
// ========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rythemaggarwal7740_db_user:CARdq_7840.@niit-audit-cluster.tn2rvlx.mongodb.net/niit_audit?retryWrites=true&w=majority&appName=niit-audit-cluster';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('\n🍃 ========================================');
    console.log('🍃 MongoDB Atlas Connected Successfully!');
    console.log('🍃 Database: niit_audit');
    console.log('🍃 ========================================\n');
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// ========================================
// SCHEMAS
// ========================================

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  firstname: { type: String, required: true, trim: true },
  lastname: { type: String, trim: true, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, trim: true, default: '' },
  centerCode: { type: String, trim: true, default: '' },
  role: { type: String, enum: ['Admin', 'Audit User', 'Center User'], default: 'Audit User' },
  isActive: { type: Boolean, default: true },
  resetOTP: { type: String, default: null },
  resetOTPExpires: { type: Date, default: null }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Center Schema - UPDATED with new fields
const centerSchema = new mongoose.Schema({
  centerCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  centerName: { type: String, required: true, trim: true },
  projectName: { type: String, trim: true, default: '' },
  zmName: { type: String, trim: true, default: '' },
  regionHeadName: { type: String, trim: true, default: '' },
  areaClusterManager: { type: String, trim: true, default: '' },
  centerHeadName: { type: String, trim: true, default: '' },
  centerType: { type: String, enum: ['CDC', 'SDC', 'DTV'], default: 'CDC', trim: true },
  location: { type: String, trim: true, default: '' },
  zonalHeadName: { type: String, trim: true, default: '' },
  auditedBy: { type: String, trim: true, default: '' },
  auditPeriod: { type: String, trim: true, default: '' },
  // Legacy fields (for backward compatibility)
  chName: { type: String, trim: true, default: '' },
  geolocation: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Center = mongoose.model('Center', centerSchema);

// Audit Report Schema
const checkpointDataSchema = new mongoose.Schema({
  totalSamples: { type: String, default: '' },
  samplesCompliant: { type: String, default: '' },
  compliantPercent: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
  centerHeadRemarks: { type: String, default: '' }
}, { _id: false });

const auditReportSchema = new mongoose.Schema({
  centerCode: { type: String, required: true, trim: true },
  centerName: { type: String, required: true, trim: true },
  auditType: { type: String, enum: ['Skills-CDC', 'Skills-SDC', 'DTV'], required: true, default: 'Skills-CDC' },
  centerType: { type: String, enum: ['CDC', 'SDC', 'DTV'], default: 'CDC' },
  chName: { type: String, trim: true, default: '' },
  geolocation: { type: String, trim: true, default: '' },
  centerHeadName: { type: String, trim: true, default: '' },
  zonalHeadName: { type: String, trim: true, default: '' },
  frontOfficeScore: { type: Number, default: 0 },
  auditedBy: { type: String, trim: true, default: '' },      // ← YE ADD KARO
auditPeriod: { type: String, trim: true, default: '' },  
  deliveryProcessScore: { type: Number, default: 0 },
  placementScore: { type: Number, default: 0 },
  managementScore: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  auditDate: { type: Date, default: Date.now },
  auditDateString: { type: String, default: '' },
  financialYear: { type: String, default: 'FY26' },
  projectName: { type: String, trim: true, default: '' },
zmName: { type: String, trim: true, default: '' },
regionHeadName: { type: String, trim: true, default: '' },
areaClusterManager: { type: String, trim: true, default: '' },
location: { type: String, trim: true, default: '' },
  // Checkpoints
  FO1: { type: checkpointDataSchema, default: () => ({}) },
  FO2: { type: checkpointDataSchema, default: () => ({}) },
  FO3: { type: checkpointDataSchema, default: () => ({}) },
  FO4: { type: checkpointDataSchema, default: () => ({}) },
  FO5: { type: checkpointDataSchema, default: () => ({}) },
  DP1: { type: checkpointDataSchema, default: () => ({}) },
  DP2: { type: checkpointDataSchema, default: () => ({}) },
  DP3: { type: checkpointDataSchema, default: () => ({}) },
  DP4: { type: checkpointDataSchema, default: () => ({}) },
  DP5: { type: checkpointDataSchema, default: () => ({}) },
  DP6: { type: checkpointDataSchema, default: () => ({}) },
  DP7: { type: checkpointDataSchema, default: () => ({}) },
  DP8: { type: checkpointDataSchema, default: () => ({}) },
  DP9: { type: checkpointDataSchema, default: () => ({}) },
  DP10: { type: checkpointDataSchema, default: () => ({}) },
  DP11: { type: checkpointDataSchema, default: () => ({}) },
  PP1: { type: checkpointDataSchema, default: () => ({}) },
  PP2: { type: checkpointDataSchema, default: () => ({}) },
  PP3: { type: checkpointDataSchema, default: () => ({}) },
  PP4: { type: checkpointDataSchema, default: () => ({}) },
  MP1: { type: checkpointDataSchema, default: () => ({}) },
  MP2: { type: checkpointDataSchema, default: () => ({}) },
  MP3: { type: checkpointDataSchema, default: () => ({}) },
  MP4: { type: checkpointDataSchema, default: () => ({}) },
  MP5: { type: checkpointDataSchema, default: () => ({}) },
  MP6: { type: checkpointDataSchema, default: () => ({}) },
   MP7: { type: checkpointDataSchema, default: () => ({}) },
  placementApplicable: { type: String, enum: ['yes', 'no'], default: 'yes' },
  submissionStatus: { type: String, default: 'Not Submitted' },
  currentStatus: { type: String, default: 'Not Submitted' },
  approvedBy: { type: String, default: '' },
  submittedDate: { type: String, default: '' },
  remarksText: { type: String, default: '' },
  // Center User Remarks
  centerRemarks: { type: String, default: '' },
  centerRemarksBy: { type: String, default: '' },
  centerRemarksDate: { type: String, default: '' },
  // LOCKED REMARKS SYSTEM - NEW FIELDS
  centerHeadRemarksLocked: { type: Boolean, default: false },
  centerHeadEditRequest: { type: Boolean, default: false },
  centerHeadEditRequestDate: { type: String, default: '' },
  centerHeadEditRequestBy: { type: String, default: '' },
  // Email Sent Status
  emailSent: { type: Boolean, default: false },
  emailSentDate: { type: String, default: '' },
  emailSentTo: { type: String, default: '' }
}, { timestamps: true });

const AuditReport = mongoose.model('AuditReport', auditReportSchema);

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://audit-tool-liard.vercel.app',  // ✅ ADD THIS!
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use('/public', express.static('public'));

// ========================================
// AUTH ROUTES
// ========================================

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`\n🔐 ========== LOGIN ATTEMPT ==========`);
    console.log(`👤 Username: ${username}`);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ 
      username: username.toLowerCase(),
      isActive: true 
    });

    if (!user || user.password !== password) {
      console.log(`❌ Invalid credentials for ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    console.log(`✅ Login successful for ${username}`);
    console.log(`✅ Role: ${user.role}`);

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        mobile: user.mobile,
        Role: user.role, // Frontend expects 'Role'
        centerCode: user.centerCode || '',
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Send OTP
app.post('/api/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`\n📧 ========== FORGOT PASSWORD ==========`);
    console.log(`📧 Email: ${email}`);

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return res.status(404).json({ error: 'Email not found in our system' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.resetOTP = otp;
    user.resetOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log(`✅ Generated OTP: ${otp}`);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - NIIT System',
      html: `<div style="font-family:Arial;padding:20px;"><h2>🔐 Password Reset</h2><p>Hello ${user.firstname},</p><p>Your OTP is: <strong style="font-size:24px;color:#667eea;">${otp}</strong></p><p>Valid for 10 minutes.</p></div>`
    };

    try {
      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'OTP sent to your email', email });
    } catch (emailErr) {
      console.log('⚠️ Email failed, OTP:', otp);
      res.json({ success: true, message: 'OTP generated (check console)', email, devOtp: otp });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP
app.post('/api/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetOTP: otp,
      resetOTPExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP verified', username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Password
app.post('/api/forgot-password/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.password = newPassword;
    user.resetOTP = null;
    user.resetOTPExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// USERS ROUTES
// ========================================

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).sort({ createdAt: -1 });
    const formatted = users.map(u => ({
      _id: u._id,
      username: u.username,
      password: u.password,
      firstname: u.firstname,
      lastname: u.lastname,
      email: u.email,
      mobile: u.mobile || '',
      centerCode: u.centerCode || '',  // ← ADD THIS!
      Role: u.role
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user
app.post('/api/users', async (req, res) => {
  try {
    console.log('\n🔵 ========== CREATE USER REQUEST ==========');
    console.log('📥 Received body:', {
      username: req.body.username,
      Role: req.body.Role,
      centerCode: req.body.centerCode
    });
    
    const { username, password, firstname, lastname, email, mobile, centerCode, Role } = req.body;
    
    console.log('🔍 Extracted centerCode:', `"${centerCode}"`);
    
    const userData = {
      username: username.toLowerCase(),
      password,
      firstname,
      lastname,
      email: email.toLowerCase(),
      mobile,
      centerCode: centerCode || '',
      role: Role || 'User'
    };
    
    console.log('📦 Creating user with data:', {
      username: userData.username,
      role: userData.role,
      centerCode: userData.centerCode
    });
    
    const user = new User(userData);
    await user.save();
    
    console.log('✅ User saved to database!');
    console.log('💾 Saved user centerCode:', `"${user.centerCode}"`);
    console.log('========================================\n');
    
    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('❌ Error creating user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      role: req.body.Role
    };
    
    // Include centerCode if provided
    if (req.body.centerCode !== undefined) {
      updateData.centerCode = req.body.centerCode || '';
    }
    
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update users (for backward compatibility)
app.post('/api/update-users', async (req, res) => {
  try {
    const users = req.body.users || req.body;
    console.log(`\n💾 ========== BULK UPDATE USERS ==========`);
    console.log(`💾 Total: ${users.length}`);

    for (const userData of users) {
      await User.findOneAndUpdate(
        { username: userData.username.toLowerCase() },
        {
          password: userData.password,
          firstname: userData.firstname,
          lastname: userData.lastname || '',
          email: userData.email?.toLowerCase(),
          mobile: userData.mobile || '',
          role: userData.Role || 'User',
          isActive: true
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, message: 'Users updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// CENTERS ROUTES
// ========================================

// Get all centers
// ✅ FIXED VERSION
app.get('/api/centers', async (req, res) => {
  try {
    const centers = await Center.find({ isActive: true }).sort({ centerCode: 1 });
    const formatted = centers.map(c => ({
      _id: c._id,
      centerCode: c.centerCode,
      centerName: c.centerName,
      projectName: c.projectName || '',
      zmName: c.zmName || '',
      regionHeadName: c.regionHeadName || '',
      areaClusterManager: c.areaClusterManager || '',
      centerHeadName: c.centerHeadName || '',
      centerType: c.centerType || 'CDC',  // ← ADD THIS!
      location: c.location || c.geolocation || '',
      zonalHeadName: c.zonalHeadName || '',
      auditedBy: c.auditedBy || '',
      auditPeriod: c.auditPeriod || '',
      chName: c.chName || '',
      geolocation: c.geolocation || ''
    }));
    console.log(`📍 Centers fetched: ${centers.length}`);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// PUT update center
app.put('/api/centers/:id', async (req, res) => {
  try {
    const updatedCenter = await Center.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedCenter) {
      return res.status(404).json({ error: 'Center not found' });
    }
    console.log(`✅ Center updated: ${updatedCenter.centerCode}`);
    res.json(updatedCenter);
  } catch (err) {
    console.error('❌ Error updating center:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE center
app.delete('/api/centers/:id', async (req, res) => {
  try {
    const deletedCenter = await Center.findByIdAndDelete(req.params.id);
    if (!deletedCenter) {
      return res.status(404).json({ error: 'Center not found' });
    }
    console.log(`✅ Center deleted: ${deletedCenter.centerCode}`);
    res.json({ success: true, message: 'Center deleted successfully', center: deletedCenter });
  } catch (err) {
    console.error('❌ Error deleting center:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Create center
app.post('/api/centers', async (req, res) => {
  try {
    const center = new Center({
      ...req.body,
      centerCode: req.body.centerCode.toUpperCase()
    });
    await center.save();
    res.status(201).json({ success: true, center });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update centers
app.post('/api/update-centers', async (req, res) => {
  try {
    const centers = Array.isArray(req.body) ? req.body : req.body.centers;
    console.log(`\n💾 ========== BULK UPDATE CENTERS ==========`);
    console.log(`💾 Total: ${centers.length}`);

    for (const centerData of centers) {
      await Center.findOneAndUpdate(
        { centerCode: centerData.centerCode.toUpperCase() },
        {
          centerName: centerData.centerName,
          chName: centerData.chName || '',
          geolocation: centerData.geolocation || '',
          centerHeadName: centerData.centerHeadName || '',
          zonalHeadName: centerData.zonalHeadName || '',
          isActive: true
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, message: 'Centers updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// AUDIT REPORTS ROUTES
// ========================================

// Get all audit reports
app.get('/api/audit-reports', async (req, res) => {
  try {
    const reports = await AuditReport.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending count
app.get('/api/audit-reports/pending/count', async (req, res) => {
  try {
    const count = await AuditReport.countDocuments({ currentStatus: 'Pending with Supervisor' });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending approvals
app.get('/api/audit-reports/pending', async (req, res) => {
  try {
    const reports = await AuditReport.find({ currentStatus: 'Pending with Supervisor' }).sort({ submittedDate: 1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save/Update audit report
// Save/Update audit report - FIXED VERSION
app.post('/api/save-audit-report', async (req, res) => {
  try {
    const data = req.body;
    console.log(`\n💾 ========== SAVING AUDIT REPORT ==========`);
    console.log(`💾 Center: ${data.centerCode} - ${data.centerName}`);
    console.log(`💾 Grand Total: ${data.grandTotal}/100`);

    // ✅ STEP 1: FETCH CENTER DATA FIRST (before using it!)
    const centerData = await Center.findOne({ centerCode: data.centerCode });
    console.log('🏢 Fetched center data:', {
      found: !!centerData,
      centerType: centerData?.centerType,
      centerCode: data.centerCode
    });

    // Parse audit data JSON if provided
    let auditData = {};
    if (data.auditDataJson) {
      try {
        auditData = typeof data.auditDataJson === 'string' ? JSON.parse(data.auditDataJson) : data.auditDataJson;
      } catch (e) {}
    }

    // Calculate audit status
    const grandTotalNum = parseFloat(data.grandTotal) || 0;
    let auditStatus = 'Non-Compliant';
    if (grandTotalNum >= 80) auditStatus = 'Compliant';
    else if (grandTotalNum >= 65) auditStatus = 'Amber';

    // Checkpoint names for readable display
    const checkpointNames = {
      FO1: "Enquires Entered in Pulse",
      FO2: "Enrolment form available in Pulse",
      FO3: "Pre assessment Available",
      FO4: "Documents uploaded in Pulse",
      FO5: "Availability of Marketing Material",
      DP1: "Batch file maintained",
      DP2: "Batch Heath Card available",
      DP3: "Attendance marked in EDL sheets",
      DP4: "BMS maintained",
      DP5: "FACT Certificate available",
      DP6: "Post Assessment if applicable",
      DP7: "Appraisal sheet maintained",
      DP8: "Appraisal status in Pulse",
      DP9: "Certification Status",
      DP10: "Student signature for certificates",
      DP11: "System vs actual certificate date",
      PP1: "Student Placement Response",
      PP2: "CGT/Guest Lecture/Industry Visit",
      PP3: "Placement Bank & Aging",
      PP4: "Placement Proof Upload",
      MP1: "Courseware issue/LMS Usage",
      MP2: "TIRM details register",
      MP3: "Monthly Centre Review Meeting",
      MP4: "Physical asset verification",
      MP5: "Verification of bill authenticity",
       MP6: "Log book for Genset & Vehicle",
      MP7: "Availability and requirement of Biometric"
    };

    // Build readable checkpoint data
    const buildCheckpointTable = (prefix, areaName, checkpoints) => {
      let table = `\n📋 ${areaName}\n`;
      table += `┌────────┬────────────────────────────────────────┬─────────┬───────────┬─────────┬─────────┐\n`;
      table += `│ ID     │ Checkpoint                             │ Samples │ Compliant │ %       │ Score   │\n`;
      table += `├────────┼────────────────────────────────────────┼─────────┼───────────┼─────────┼─────────┤\n`;
      
      checkpoints.forEach(cpId => {
        const cp = data[cpId] || auditData[cpId] || {};
        const name = (checkpointNames[cpId] || cpId).substring(0, 38).padEnd(38);
        const samples = (cp.totalSamples || '-').toString().padStart(7);
        const compliant = (cp.samplesCompliant || '-').toString().padStart(9);
        const percent = cp.compliantPercent ? `${cp.compliantPercent.toFixed(1)}%`.padStart(7) : '    -  ';
        const score = cp.score ? cp.score.toFixed(2).padStart(7) : '   0.00';
        table += `│ ${cpId.padEnd(6)} │ ${name} │${samples} │${compliant} │${percent} │${score} │\n`;
      });
      
      table += `└────────┴────────────────────────────────────────┴─────────┴───────────┴─────────┴─────────┘`;
      return table;
    };

    const frontOfficeTable = buildCheckpointTable('FO', 'FRONT OFFICE (Max: 30)', ['FO1','FO2','FO3','FO4','FO5']);
    const deliveryTable = buildCheckpointTable('DP', 'DELIVERY PROCESS (Max: 40)', ['DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11']);
    const placementTable = data.placementApplicable === 'no' ? '\n📋 PLACEMENT PROCESS: NA (Not Applicable)' : buildCheckpointTable('PP', 'PLACEMENT PROCESS (Max: 15)', ['PP1','PP2','PP3','PP4']);
    const managementTable = buildCheckpointTable('MP', 'MANAGEMENT PROCESS (Max: 15)', ['MP1','MP2','MP3','MP4','MP5','MP6','MP7']);

    // ✅ STEP 2: NOW create updateData using centerData (which is already fetched)
    const updateData = {
      // ========== READABLE REPORT (VIEW THIS!) ==========
      _REPORT_VIEW: `
╔══════════════════════════════════════════════════════════════════════════════╗
║  Center Code    : ${(data.centerCode || '-').substring(0,20).padEnd(20)}                              ║
║  Center Name    : ${(data.centerName || '-').substring(0,20).padEnd(20)}                              ║
║  CH Name        : ${(data.chName || '-').substring(0,20).padEnd(20)}                              ║
║  Audit Date     : ${(data.auditDate || new Date().toLocaleDateString('en-GB')).padEnd(20)}                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  📈 SCORES SUMMARY                                                            ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  Front Office     : ${parseFloat(data.frontOfficeScore || 0).toFixed(2).padStart(6)} / 30                                     ║
║  Delivery Process : ${parseFloat(data.deliveryProcessScore || 0).toFixed(2).padStart(6)} / 40                                     ║
║  Placement        : ${data.placementApplicable === 'no' ? '    NA     ' : parseFloat(data.placementScore || 0).toFixed(2).padStart(6) + ' / 15'}                                     ║
║  Management       : ${parseFloat(data.managementScore || 0).toFixed(2).padStart(6)} / 15                                     ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  🎯 GRAND TOTAL   : ${grandTotalNum.toFixed(2).padStart(6)} / 100    Status: ${auditStatus.padEnd(15)}            ║
╚══════════════════════════════════════════════════════════════════════════════╝
${frontOfficeTable}
${deliveryTable}
${placementTable}
${managementTable}
`,
      
      // ========== CENTER INFO (FROM DATABASE) ==========
      centerCode: data.centerCode,
      centerName: data.centerName,
      projectName: centerData?.projectName || data.projectName || '',
      zmName: centerData?.zmName || data.zmName || '',
      regionHeadName: centerData?.regionHeadName || data.regionHeadName || '',
      areaClusterManager: centerData?.areaClusterManager || data.areaClusterManager || '',
      centerHeadName: centerData?.centerHeadName || data.centerHeadName || '',
      centerType: centerData?.centerType || data.centerType || 'CDC',  // ✅ NOW centerData is defined!
      location: centerData?.location || data.location || '',
      zonalHeadName: centerData?.zonalHeadName || data.zonalHeadName || '',
      auditedBy: centerData?.auditedBy || data.auditedBy || '',
      auditPeriod: centerData?.auditPeriod || data.auditPeriod || '',
      auditType: data.auditType || 'Skills-CDC',
      financialYear: data.financialYear || 'FY26',
      // Legacy fields
      chName: data.chName || '',
      geolocation: data.geolocation || '',
      
      // ========== SCORES ==========
      frontOfficeScore: parseFloat(data.frontOfficeScore) || 0,
      deliveryProcessScore: parseFloat(data.deliveryProcessScore) || 0,
      placementScore: parseFloat(data.placementScore) || 0,
      placementApplicable: data.placementApplicable || 'yes',
      managementScore: parseFloat(data.managementScore) || 0,
      grandTotal: grandTotalNum,
      auditStatus: auditStatus,
      
      // ========== STATUS ==========
      auditDateString: data.auditDate || new Date().toLocaleDateString('en-GB'),
      submissionStatus: data.submissionStatus || 'Not Submitted',
      currentStatus: data.currentStatus || 'Not Submitted',
      approvedBy: data.approvedBy || '',
      submittedDate: data.submittedDate || '',
      remarksText: data.remarksText || '',
      
      // Reset email sent status when report is edited
      emailSent: false,
      emailSentDate: '',
      emailSentTo: '',
      
      // ========== CHECKPOINT DATA ==========
      ...(['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5','MP6','MP7']
        .reduce((acc, key) => { 
          if(data[key]) acc[key] = data[key]; 
          else if(auditData[key]) acc[key] = auditData[key]; 
          return acc; 
        }, {}))
    };
    
    console.log('💾 Saving with centerType:', updateData.centerType);
    console.log('💾 Saving placementApplicable:', data.placementApplicable);

    // ✅ STEP 3: Save to database
    const auditPeriod = data.auditPeriod || '';
const matchQuery = auditPeriod
  ? { centerCode: data.centerCode, financialYear: data.financialYear || 'FY26', auditPeriod: auditPeriod }
  : { centerCode: data.centerCode, financialYear: data.financialYear || 'FY26' };

const report = await AuditReport.findOneAndUpdate(
  matchQuery,
  updateData,
  { upsert: true, new: true }
);

    // Reset center head remarks lock
    report.centerHeadRemarksLocked = false;
    report.centerHeadEditRequest = false;
    report.centerHeadEditRequestDate = '';
    report.centerHeadEditRequestBy = '';
    await report.save();
    
    console.log(`✅ Report saved for ${data.centerCode}`);
    console.log(`✅ Saved centerType: ${report.centerType}`);
    
    res.json({ success: true, message: 'Audit report saved successfully', report });
  } catch (err) {
    console.error('❌ Save error:', err.message);
    console.error('❌ Stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Bulk save reports (for Excel buffer compatibility)

// ============================================
// UPDATE REMARKS ONLY (Auto-save from View Reports)
// ============================================
app.put('/api/audit-reports/:id/remarks', async (req, res) => {
  try {
    const { remarks } = req.body;
    console.log(`\n💬 ========== UPDATING REMARKS ==========`);
    console.log(`💬 Report ID: ${req.params.id}`);
    console.log(`💬 Remarks: "${remarks}"`);
    
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      console.log('❌ Report not found!');
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update remarksText field
    report.remarksText = remarks || '';
    
    await report.save();

    console.log(`✅ Remarks updated for ${report.centerCode}`);
    console.log('💬 ========================================\n');
    
    res.json({ success: true, report });
  } catch (err) {
    console.error('❌ Error updating remarks:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-audit-reports', async (req, res) => {
  try {
    // This endpoint was for Excel buffer, now we just acknowledge it
    console.log('📋 Received bulk save request');
    res.json({ success: true, message: 'Reports processed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit for approval
app.post('/api/audit-reports/:id/submit', async (req, res) => {
  try {
    const { userName } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.submissionStatus = 'Submitted';
    report.currentStatus = 'Pending with Supervisor';
    report.submittedDate = new Date().toLocaleString('en-GB');
    await report.save();

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve report
app.post('/api/audit-reports/:id/approve', async (req, res) => {
  try {
    const { adminName, remarks } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.currentStatus = 'Approved';
    report.approvedBy = adminName;
    report.remarksText = remarks || '';
    await report.save();

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject report
app.post('/api/audit-reports/:id/reject', async (req, res) => {
  try {
    const { adminName, remarks } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.currentStatus = 'Sent Back';
    report.remarksText = remarks;
    await report.save();

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Center User - Save center remarks
// ============================================
// ✅ COMPLETE FIXED ENDPOINT FOR CENTER REMARKS
// ============================================
// Replace the entire PUT /api/audit-reports/:id/center-remarks endpoint
// with this code (around line 836-895 in server.js)

// Center User - Save center remarks
app.put('/api/audit-reports/:id/center-remarks', async (req, res) => {
  try {
    console.log('\n💬 ========== SAVING CENTER HEAD REMARKS ==========');
    const { centerRemarks, centerHeadCheckpointRemarks } = req.body;
    console.log('📋 Report ID:', req.params.id);
    console.log('📝 Total remarks:', Object.keys(centerHeadCheckpointRemarks || {}).length);
    
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      console.log('❌ Report not found');
      return res.status(404).json({ error: 'Report not found' });
    }

    // Save overall center remarks (optional field)
    if (centerRemarks !== undefined) {
      report.centerRemarks = centerRemarks;
    }
    report.centerRemarksDate = new Date().toLocaleString('en-GB');
    
    // ✅ CRITICAL FIX: Save checkpoint remarks in BOTH places
    if (centerHeadCheckpointRemarks && Object.keys(centerHeadCheckpointRemarks).length > 0) {
      
      // METHOD 1: Save as object field (for CenterDashboard to reload)
      report.centerHeadCheckpointRemarks = centerHeadCheckpointRemarks;
      report.markModified('centerHeadCheckpointRemarks');
      console.log('✅ Saved to centerHeadCheckpointRemarks object');
      
      // METHOD 2: Save to individual checkpoint objects (for Audit.jsx display)
      const checkpointIds = [
        'FO1','FO2','FO3','FO4','FO5',
        'DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11',
        'PP1','PP2','PP3','PP4',
        'MP1','MP2','MP3','MP4','MP5','MP6','MP7'
      ];
      
      let savedCount = 0;
      checkpointIds.forEach(cpId => {
        if (centerHeadCheckpointRemarks[cpId]) {
          // Get existing checkpoint data (or empty object)
          const existingCpData = report[cpId] || {};
          
          // Create updated checkpoint data with centerHeadRemarks
          const updatedCpData = {
            ...existingCpData,
            centerHeadRemarks: centerHeadCheckpointRemarks[cpId]
          };
          
          // Save back to report
          report[cpId] = updatedCpData;
          report.markModified(cpId);  // CRITICAL: Tell Mongoose to save this
          
          savedCount++;
          const preview = centerHeadCheckpointRemarks[cpId].substring(0, 40);
          console.log(`  ✅ ${cpId}: "${preview}${centerHeadCheckpointRemarks[cpId].length > 40 ? '...' : ''}"`);
        }
      });
      
      console.log(`✅ Saved ${savedCount} checkpoint remarks to individual fields`);
    }
    
    // Lock remarks after first save
    if (!report.centerHeadRemarksLocked) {
      report.centerHeadRemarksLocked = true;
      console.log('🔒 Remarks LOCKED - Center Head needs admin approval to edit');
    }
    
    // Save to MongoDB
    await report.save();

    console.log(`✅ All remarks saved successfully for ${report.centerCode}`);
    console.log('💬 =============================================\n');
    
    res.json({ 
      success: true, 
      report,
      message: 'Remarks saved and locked successfully' 
    });
    
  } catch (err) {
    console.error('❌ Error saving center remarks:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ✅ ADD TO SCHEMA (if not already present)
// ============================================
// Find AuditReportSchema (around line 200-250)
// Add this field if it doesn't exist:

/*
centerHeadCheckpointRemarks: { 
  type: Object, 
  default: {} 
},
*/

// Full schema section should look like:
/*
centerRemarks: { type: String, default: '' },
centerRemarksBy: { type: String, default: '' },
centerRemarksDate: { type: String, default: '' },
centerHeadCheckpointRemarks: { type: Object, default: {} },  // ← ADD THIS
centerHeadRemarksLocked: { type: Boolean, default: false },
centerHeadEditRequest: { type: Boolean, default: false },
centerHeadEditRequestDate: { type: String, default: '' },
centerHeadEditRequestBy: { type: String, default: '' },
*/

// ============================================
// ✅ OPTIONAL: DEBUG ENDPOINT
// ============================================
// Add this anywhere after the above endpoint for testing:

app.get('/api/audit-reports/:id/debug-remarks', async (req, res) => {
  try {
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    console.log('\n🔍 ========== DEBUG REPORT REMARKS ==========');
    console.log('Center:', report.centerCode);
    console.log('centerHeadCheckpointRemarks object:', report.centerHeadCheckpointRemarks);
    console.log('Sample FO1 data:', report.FO1);
    console.log('Sample FO2 data:', report.FO2);
    console.log('Locked:', report.centerHeadRemarksLocked);
    console.log('==========================================\n');
    
    res.json({
      centerCode: report.centerCode,
      centerName: report.centerName,
      locked: report.centerHeadRemarksLocked,
      centerHeadCheckpointRemarks: report.centerHeadCheckpointRemarks,
      sampleCheckpoints: {
        FO1: report.FO1,
        FO2: report.FO2,
        DP1: report.DP1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 🧪 HOW TO TEST:
// ============================================
/*
1. Stop server: Ctrl+C
2. Replace endpoint with code above
3. Add schema field if missing
4. Start server: node server.js
5. Login as Center User
6. Add remarks and submit
7. Check console - should see all checkpoint IDs being saved
8. Test URL: http://localhost:3001/api/audit-reports/REPORT_ID/debug-remarks
9. Refresh CenterDashboard - remarks should show in locked inputs
10. Login as Admin - check Audit.jsx modal - should show remarks in green column
*/


// ============================================
// REQUEST EDIT PERMISSION (Center Head)
// ============================================
app.post('/api/audit-reports/:id/request-edit', async (req, res) => {
  try {
    const { centerUserName } = req.body;
    console.log(`\n🔓 ========== EDIT REQUEST ==========`);
    console.log(`🔓 Report ID: ${req.params.id}`);
    console.log(`🔓 Requested by: ${centerUserName}`);
    
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      console.log('❌ Report not found!');
      return res.status(404).json({ error: 'Report not found' });
    }

    // Set edit request flags
    report.centerHeadEditRequest = true;
    report.centerHeadEditRequestDate = new Date().toLocaleString('en-GB');
    report.centerHeadEditRequestBy = centerUserName;
    
    await report.save();

    console.log(`✅ Edit request submitted for ${report.centerCode}`);
    console.log('🔓 ========================================\n');
    
    res.json({ success: true, message: 'Edit request submitted to admin', report });
  } catch (err) {
    console.error('❌ Error submitting edit request:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// APPROVE EDIT REQUEST (Admin)
// ============================================
app.post('/api/audit-reports/:id/approve-edit', async (req, res) => {
  try {
    const { adminName } = req.body;
    console.log(`\n✅ ========== APPROVE EDIT REQUEST ==========`);
    console.log(`✅ Report ID: ${req.params.id}`);
    console.log(`✅ Approved by: ${adminName}`);
    
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      console.log('❌ Report not found!');
      return res.status(404).json({ error: 'Report not found' });
    }

    // Unlock remarks temporarily and clear edit request
    report.centerHeadRemarksLocked = false;
    report.centerHeadEditRequest = false;
    report.centerHeadEditRequestDate = '';
    report.centerHeadEditRequestBy = '';
    
    await report.save();

    console.log(`✅ Edit permission granted for ${report.centerCode}`);
    console.log('✅ Center Head can now edit remarks once');
    console.log('✅ ========================================\n');
    
    res.json({ success: true, message: 'Edit permission granted', report });
  } catch (err) {
    console.error('❌ Error approving edit request:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GET PENDING EDIT REQUESTS (Admin Dashboard)
// ============================================
app.get('/api/audit-reports/edit-requests/pending', async (req, res) => {
  try {
    console.log('\n📋 Fetching pending edit requests...');
    
    const reports = await AuditReport.find({ 
      centerHeadEditRequest: true 
    }).sort({ centerHeadEditRequestDate: -1 });
    
    console.log(`✅ Found ${reports.length} pending edit requests`);
    
    res.json(reports);
  } catch (err) {
    console.error('❌ Error fetching edit requests:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// EMAIL ROUTE (With PDF Attachment)



async function sendEmailInBackground(to, cc, subject, customMessage, reportData) {
  try {
    console.log('📧 Background email started...');
    
    const htmlBody = generateEmailHTML(reportData, customMessage || '');
    
    const pdfBuffer = await generatePDF(reportData);
    console.log('✅ PDF generated');
    
    const mailOptions = {
      from: `NIIT Audit System <${process.env.EMAIL_USER}>`,
      to: to,
      cc: cc || undefined,
      subject: subject,
      html: htmlBody,
      attachments: [{
        filename: `Audit_${reportData.centerCode}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };
    
    console.log('📧 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent!', info.messageId);
    
    if (reportData._id) {
      await AuditReport.findByIdAndUpdate(reportData._id, {
        emailSent: true,
        emailSentDate: new Date().toLocaleString('en-IN'),
        emailSentTo: to
      });
    }
    
  } catch (err) {
    console.error('❌ Email error:', err.message);
  }
}
// ========================================
app.post('/api/send-audit-email', async (req, res) => {
  try {
    const { to, cc, subject, customMessage, reportData } = req.body;
    
    console.log('\n📧 EMAIL REQUEST:', reportData.centerName);
    
    res.json({ success: true, message: 'Email is being sent...' });
    
    // ✅ customMessage pass karo
    sendEmailInBackground(to, cc, subject, customMessage || '', reportData);
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// CENTERS ROUTES
// ========================================

// GET all centers
app.get('/api/centers', async (req, res) => {
  try {
    const centers = await Center.find({ isActive: true }).sort({ centerCode: 1 });
    console.log(`📍 Centers fetched: ${centers.length}`);
    res.json(centers);
  } catch (err) {
    console.error('❌ Error fetching centers:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST create center
app.post('/api/centers', async (req, res) => {
  try {
    const center = new Center(req.body);
    await center.save();
    console.log(`✅ Center created: ${center.centerCode}`);
    res.json(center);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// HEALTH CHECK
// ========================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: 'MongoDB Atlas', timestamp: new Date().toISOString() });
});


// ============================================
// FIX Missing Financial Year
// ============================================
app.get('/fix-fy', async (req, res) => {
  try {
    console.log('\n🔧 FIXING MISSING FY...');
    
    const db = mongoose.connection.db;
    const reportsCollection = db.collection('auditreports');
    
    // Find and update reports without FY
    const result = await reportsCollection.updateMany(
      { 
        $or: [
          { financialYear: { $exists: false } },
          { financialYear: null },
          { financialYear: "" }
        ]
      },
      { 
        $set: { financialYear: "FY26" } 
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} reports to FY26`);
    
    // Get all reports to show
    const allReports = await reportsCollection.find({}).toArray();
    
    res.json({
      success: true,
      message: `Fixed ${result.modifiedCount} reports!`,
      updated: result.modifiedCount,
      allReports: allReports.map(r => ({
        centerCode: r.centerCode,
        centerName: r.centerName,
        financialYear: r.financialYear || 'NONE',
        status: r.currentStatus
      }))
    });
    
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
});
// Fix missing centerCodes
// Better fix - logs everything
app.post('/api/fix-center-codes', async (req, res) => {
  try {
    console.log('🔧 Starting centerCode fix...');
    
    const reports = await AuditReport.find({});
    console.log(`📊 Total reports: ${reports.length}`);
    
    let fixed = 0;
    for (const report of reports) {
      console.log(`\n📋 Checking: "${report.centerName}"`);
      console.log(`   Current centerCode: "${report.centerCode || 'EMPTY'}"`);
      
      // If centerCode is missing or empty
      if (!report.centerCode || report.centerCode === '') {
        // Try to get from centerName if it has format "CC007 - Name"
        let newCode = null;
        
        // Check if centerName already has code
        if (report.centerName.includes('CC')) {
          const match = report.centerName.match(/CC\d+/);
          if (match) {
            newCode = match[0];
          }
        }
        
        // Manual mapping for centers without CC in name
        const mapping = {
          'khn': 'CC001',
          'tigri': 'CC002',
          'lkhanpur': 'CC003',
          'NIIT Bangalore': 'CC003',
          'NIIT Mumbai': 'CC002'
        };
        
        if (!newCode && mapping[report.centerName]) {
          newCode = mapping[report.centerName];
        }
        
        if (newCode) {
          report.centerCode = newCode;
          await report.save();
          console.log(`   ✅ UPDATED to: ${newCode}`);
          fixed++;
        } else {
          console.log(`   ⚠️ NO MAPPING FOUND`);
        }
      } else {
        console.log(`   ℹ️ Already has centerCode`);
      }
    }
    
    console.log(`\n✅ Fixed ${fixed} reports`);
    res.json({ success: true, fixed, total: reports.length });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
});
// ========================================
// ADD THIS ROUTE TO server.js (ONE-TIME FIX)
// ========================================

// Run once: http://localhost:3001/api/fix-audit-report-types
app.get('/api/fix-audit-report-types', async (req, res) => {
  try {
    console.log('\n🔧 ========== FIXING AUDIT REPORT CENTER TYPES ==========');
    
    const reports = await AuditReport.find({});
    console.log(`📊 Total reports to fix: ${reports.length}`);
    
    let updated = 0;
    let skipped = 0;
    const summary = [];
    
    for (const report of reports) {
      try {
        // Fetch center data from Centers table
        const centerData = await Center.findOne({ centerCode: report.centerCode });
        
        if (centerData) {
          // Update report with ALL center fields
          report.centerType = centerData.centerType || 'CDC';
          report.projectName = centerData.projectName || '';
          report.zmName = centerData.zmName || '';
          report.regionHeadName = centerData.regionHeadName || '';
          report.areaClusterManager = centerData.areaClusterManager || '';
          report.centerHeadName = centerData.centerHeadName || '';
          report.location = centerData.location || '';
          report.zonalHeadName = centerData.zonalHeadName || '';
         if (!report.auditedBy) report.auditedBy = centerData.auditedBy || '';
if (!report.auditPeriod) report.auditPeriod = centerData.auditPeriod || '';
          
          await report.save();
          
          console.log(`✅ ${report.centerCode} (${report.financialYear}): ${centerData.centerType}`);
          summary.push({
            centerCode: report.centerCode,
            centerName: report.centerName,
            financialYear: report.financialYear,
            centerType: centerData.centerType,
            status: 'UPDATED'
          });
          updated++;
        } else {
          console.log(`⚠️ ${report.centerCode}: Center not found in database`);
          summary.push({
            centerCode: report.centerCode,
            centerName: report.centerName,
            financialYear: report.financialYear,
            centerType: 'NOT FOUND',
            status: 'SKIPPED'
          });
          skipped++;
        }
      } catch (err) {
        console.error(`❌ Error updating ${report.centerCode}:`, err.message);
      }
    }
    
    console.log(`\n✅ DONE!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('========================================\n');
    
    res.json({
      success: true,
      message: `Fixed ${updated} audit reports, skipped ${skipped}`,
      updated,
      skipped,
      total: reports.length,
      summary
    });
    
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// USAGE INSTRUCTIONS:
// ========================================
/*
1. Add this route to server.js (before app.listen())
2. Restart server: node server.js
3. Open browser: http://localhost:3001/api/fix-audit-report-types
4. Wait for response showing all updates
5. Refresh Audit → View Reports page
6. Should see correct centerType badges! ✅
7. Remove this route after running once (optional)
*/
// ========================================
// DEBUG ROUTE - Check Database Center Types
// ========================================

// Add this to server.js temporarily


app.get('/api/fix-audited-by', async (req, res) => {
  try {
    const reports = await AuditReport.find({});
    let updated = 0;
    
    for (const report of reports) {
      // AuditManagement.jsx se jo data save hua tha, 
      // woh report mein already hoga - bas markModified karo
      report.markModified('auditedBy');
      report.markModified('auditPeriod');
      await report.save();
      updated++;
    }
    
    res.json({ success: true, updated });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});



app.get('/api/debug-centers', async (req, res) => {
  try {
    console.log('\n🔍 ========== DEBUG: CHECKING DATABASE ==========');
    
    // Get ALL centers from database (no formatting)
    const centers = await Center.find({}).lean();
    
    console.log(`📊 Total centers in DB: ${centers.length}`);
    console.log('\n📋 Raw data from MongoDB:');
    
    centers.forEach(c => {
      console.log(`\n  Center: ${c.centerCode}`);
      console.log(`  Name: ${c.centerName}`);
      console.log(`  centerType field exists? ${c.hasOwnProperty('centerType')}`);
      console.log(`  centerType value: "${c.centerType}"`);
      console.log(`  Type of centerType: ${typeof c.centerType}`);
    });
    
    console.log('\n========================================\n');
    
    // Return full raw data
    res.json({
      success: true,
      totalCenters: centers.length,
      centers: centers.map(c => ({
        _id: c._id,
        centerCode: c.centerCode,
        centerName: c.centerName,
        centerType: c.centerType,
        centerTypeExists: c.hasOwnProperty('centerType'),
        centerTypeType: typeof c.centerType,
        allFields: Object.keys(c)
      }))
    });
    
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// USAGE:
// 1. Add this route to server.js
// 2. Restart server
// 3. Open: http://localhost:3001/api/debug-centers
// 4. Check console AND browser response
// 5. Send screenshot to me!
app.post('/api/force-fix-fy', async (req, res) => {
  try {
    console.log('🔧 FORCE FIXING all reports...');
    
    // Direct updateMany - no loop
    const result = await AuditReport.updateMany(
      { centerCode: { $in: ['CC007', 'CC008', 'CC15'] } },
      { $set: { financialYear: 'FY26' } }
    );
    
    console.log('✅ Fixed:', result.modifiedCount);
    
    res.json({ success: true, fixed: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.get('/api/fix-audit-index', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('auditreports');
    
    // Drop BOTH problematic indexes
    const indexesToDrop = ['centerCode_1', 'centerCode_1_financialYear_1'];
    const results = [];
    
    for (const indexName of indexesToDrop) {
      try {
        await collection.dropIndex(indexName);
        console.log(`✅ Dropped: ${indexName}`);
        results.push({ index: indexName, status: 'DROPPED' });
      } catch (e) {
        console.log(`⚠️ ${indexName}: ${e.message}`);
        results.push({ index: indexName, status: 'NOT FOUND / ALREADY DROPPED' });
      }
    }
    
    const remainingIndexes = await collection.indexes();
    
    res.json({
      success: true,
      results,
      remainingIndexes: remainingIndexes.map(i => ({ name: i.name, key: i.key }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// GET CENTER USER EMAIL + CREDENTIALS
// ========================================
app.get('/api/center-user-email/:centerCode', async (req, res) => {
  try {
    const { centerCode } = req.params;
    console.log(`\n📧 ========== FETCH CENTER USER EMAIL ==========`);
    console.log(`📧 Center Code: ${centerCode}`);

    // Us center ka Center User dhundho
    const centerUser = await User.findOne({
      centerCode: centerCode.toUpperCase(),
      role: 'Center User',
      isActive: true
    });

    if (!centerUser) {
      console.log(`⚠️ No Center User found for centerCode: ${centerCode}`);
      return res.json({ success: false, email: '', username: '', firstname: '' });
    }

    console.log(`✅ Found center user: ${centerUser.username} - ${centerUser.email}`);
    res.json({
      success: true,
      email: centerUser.email || '',
      username: centerUser.username || '',
      firstname: centerUser.firstname || '',
      password: centerUser.password || ''
    });

  } catch (err) {
    console.error('❌ Error fetching center user email:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log(`\n🚀 ========================================`);
  console.log(`🚀 NIIT Audit System - MongoDB Server`);
  console.log(`🚀 Port: http://localhost:${PORT}`);
  console.log(`🚀 ========================================`);
  console.log(`\n✅ API Routes Ready!`);
  console.log(`   POST /api/login`);
  console.log(`   GET  /api/users`);
  console.log(`   GET  /api/centers`);
  console.log(`   GET  /api/audit-reports`);  
  console.log(`   POST /api/save-audit-report`);
  console.log(`\n========================================\n`);
});