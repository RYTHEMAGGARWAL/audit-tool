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
  role: { type: String, enum: ['Admin', 'Audit User', 'Center User', 'Zonal Manager', 'Region Head', 'Area Manager', 'Cluster Manager', 'Operation Head', 'Placement Coordinator', 'Senior Manager Placement', 'National Head Placement'], default: 'Audit User' },
  isActive: { type: Boolean, default: true },
  resetOTP: { type: String, default: null },
  resetOTPExpires: { type: Date, default: null },
  // Approval fields (for Audit User created users)
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  approvalRequestedBy: { type: String, default: '' },
  approvalDate: { type: String, default: '' },
  // Modify approval fields
  modifyApprovalStatus: { type: String, enum: ['pending', 'approved', 'none'], default: 'none' },
  modifiedBy: { type: String, default: '' },
  pendingModifyData: { type: Object, default: null }
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
  areaManager: { type: String, trim: true, default: '' },
  clusterManager: { type: String, trim: true, default: '' },
  placementCoordinator: { type: String, trim: true, default: '' },
  seniorManagerPlacement: { type: String, trim: true, default: '' },
  nationalHeadPlacement: { type: String, trim: true, default: '' },
  placementApplicable: { type: String, enum: ['yes', 'no', ''], default: '' },
  centerHeadName: { type: String, trim: true, default: '' },
  centerType: { type: String, enum: ['CDC', 'SDC', 'DTV'], default: 'CDC', trim: true },
  location: { type: String, trim: true, default: '' },
  zonalHeadName: { type: String, trim: true, default: '' },
  auditedBy: { type: String, trim: true, default: '' },
  auditPeriod: { type: String, trim: true, default: '' },
  // Legacy fields (for backward compatibility)
  chName: { type: String, trim: true, default: '' },
  geolocation: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true },
  // Approval fields
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  approvalRequestedBy: { type: String, default: '' },
  approvalDate: { type: String, default: '' },
  // Modify approval fields
  modifyApprovalStatus: { type: String, enum: ['pending', 'approved', 'none'], default: 'none' },
  modifiedBy: { type: String, default: '' },
  pendingModifyData: { type: Object, default: null },
  // Edit approval fields
  editApprovalStatus: { type: String, enum: ['pending', 'approved', 'none'], default: 'none' },
  editRequestBy: { type: String, default: '' },
  editRequestDate: { type: String, default: '' },
  pendingEditData: { type: Object, default: null },
  changedFields: { type: Object, default: null }  // {fieldName: {old, new}}
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
  areaManager: { type: String, trim: true, default: '' },
  clusterManager: { type: String, trim: true, default: '' },
  placementCoordinator: { type: String, trim: true, default: '' },
  seniorManagerPlacement: { type: String, trim: true, default: '' },
  nationalHeadPlacement: { type: String, trim: true, default: '' },
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
  // Audit overall status (score-based: Compliant / Amber / Non-Compliant)
  auditStatus: { type: String, default: '' },
  // ── Placement Coordinator Remarks ──
  placementRemarksSubmitted:   { type: Boolean, default: false },
  placementRemarksLocked:      { type: Boolean, default: false },
  placementRemarksEditedOnce:  { type: Boolean, default: false },
  placementRemarksDate:        { type: String,  default: '' },
  placementRemarksSubmittedBy: { type: String,  default: '' },
  // Placement edit request (Coordinator → Admin)
  placementEditRequest:        { type: Boolean, default: false },
  placementEditRequestBy:      { type: String,  default: '' },
  placementEditRequestDate:    { type: String,  default: '' },
  // Center User Remarks
  centerRemarks: { type: String, default: '' },
  centerRemarksBy: { type: String, default: '' },
  centerRemarksDate: { type: String, default: '' },
  // Checkpoint-level remarks saved as a single object (faster reload)
  centerHeadCheckpointRemarks: { type: Object, default: {} },
  // LOCKED REMARKS SYSTEM
  centerHeadRemarksLocked: { type: Boolean, default: false },
  centerHeadEditRequest: { type: Boolean, default: false },
  centerHeadEditRequestDate: { type: String, default: '' },
  centerHeadEditRequestBy: { type: String, default: '' },
  remarksEditedOnce: { type: Boolean, default: false }, // After 2nd submit, no more edits
  // Email Sent Status
  emailSent: { type: Boolean, default: false },
  emailSentDate: { type: String, default: '' },
  emailSentTo: { type: String, default: '' },
  // Center remarks deadline (7 working days from emailSentDate)
  centerDeadline: { type: Date, default: null },
  centerDeadlineString: { type: String, default: '' },
  // Auditor submission deadline (15 working days from audit creation)
  auditorDeadline: { type: Date, default: null },
  auditorDeadlineString: { type: String, default: '' },
  // Auto-close tracking
  autoClosedBy: { type: String, default: '' },
  autoClosedDate: { type: String, default: '' },
  // Reminder tracking
  remindersSent: { type: [Number], default: [] },
  reminderClosedSent: { type: Boolean, default: false },
  // Auditor reminders
  auditorRemindersSent: { type: [Number], default: [] },
  auditorAutoClosedEmailSent: { type: Boolean, default: false },
  // Auditor review deadline: 5 working days after center submits remarks
  auditorReviewDeadline: { type: Date, default: null },
  auditorReviewDeadlineString: { type: String, default: '' },
  // Track when auditor manually closed
  auditorClosedDate: { type: String, default: '' },
  auditorClosedBy: { type: String, default: '' }
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
      role: Role || 'Center User'  // Default to Center User
    };
    
    console.log('📦 Creating user with data:', {
      username: userData.username,
      role: userData.role,
      centerCode: userData.centerCode
    });
    
    // Agar Audit User ne banaya toh pending approval
    if (req.body.createdByRole === 'Audit User') {
      userData.approvalStatus = 'pending';
      userData.isActive = false; // Admin approve kare tabhi active
      userData.approvalRequestedBy = req.body.createdBy || 'Audit User';
    }

    // Check if username exists (including inactive users)
    const user = new User(userData);
    await user.save();
    
    console.log('✅ User saved to database!');
    console.log('💾 Saved user centerCode:', `"${user.centerCode}"`);
    console.log('💾 Approval status:', userData.approvalStatus);
    console.log('========================================\n');
    
    res.status(201).json({ 
      success: true, 
      user,
      pendingApproval: userData.approvalStatus === 'pending'
    });
  } catch (err) {
    console.error('❌ Error creating user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    // Audit User modify - store as pending
    if (req.body.modifiedByRole === 'Audit User') {
      const { modifiedByRole, modifiedBy, ...pendingData } = req.body;
      const user = await User.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            modifyApprovalStatus: 'pending',
            modifiedBy: modifiedBy || '',
            pendingModifyData: pendingData
          }
        },
        { new: true }
      );
      return res.json({ success: true, user, pendingApproval: true });
    }

    // Admin direct update
    const updateData = { ...req.body, role: req.body.Role };
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
// GET HIERARCHY EMAILS by name matching
// POST /api/hierarchy-emails
// body: { zmName, regionHeadName, areaClusterManager }
// ========================================
app.post('/api/hierarchy-emails', async (req, res) => {
  try {
    const { zmName, regionHeadName, areaClusterManager } = req.body;
    const emails = [];

    const findEmail = async (name, role) => {
      if (!name || name === '-') return;
      const regex = new RegExp(name.trim().split(' ')[0], 'i'); // match first name
      const user = await User.findOne({
        role: role,
        isActive: true,
        $or: [
          { firstname: regex },
          { username: regex }
        ]
      });
      if (user && user.email) {
        emails.push(user.email);
        console.log(`✅ Found ${role}: ${user.email}`);
      }
    };

    await findEmail(zmName, 'Zonal Manager');
    await findEmail(regionHeadName, 'Region Head');
    await findEmail(areaClusterManager, 'Area Cluster Manager');

    res.json({ success: true, emails: [...new Set(emails)] }); // dedupe
  } catch (err) {
    console.error('❌ Hierarchy emails error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// CENTERS ROUTES
// ========================================

// Get all centers
// ✅ FIXED VERSION
// Get MY requests (for Audit User - includes pending/inactive)
app.get('/api/my-requests/:createdBy', async (req, res) => {
  try {
    const name = req.params.createdBy;
    
    // My center requests (new + edit)
    const centers = await Center.find({
      $or: [
        { approvalRequestedBy: { $regex: new RegExp(`^${name}$`, 'i') } },
        { editRequestBy: { $regex: new RegExp(`^${name}$`, 'i') } }
      ]
    }).sort({ createdAt: -1 });

    // My user requests (new + modify)
    const users = await User.find({
      $or: [
        { approvalRequestedBy: { $regex: new RegExp(`^${name}$`, 'i') } },
        { modifiedBy: { $regex: new RegExp(`^${name}$`, 'i') } }
      ]
    }).sort({ createdAt: -1 });

    res.json({ centers, users });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/centers', async (req, res) => {
  try {
    const centers = await Center.find({
      $or: [{ isActive: true }, { approvalStatus: 'pending', isActive: false }]
    }).sort({ centerCode: 1 });
    const formatted = centers.map(c => ({
      _id: c._id,
      centerCode: c.centerCode,
      centerName: c.centerName,
      projectName: c.projectName || '',
      zmName: c.zmName || '',
      regionHeadName: c.regionHeadName || '',
      areaClusterManager: c.areaClusterManager || '',
      areaManager: c.areaManager || c.areaClusterManager || '',
      clusterManager: c.clusterManager || '',
      placementCoordinator: c.placementCoordinator || '',
      seniorManagerPlacement: c.seniorManagerPlacement || '',
      nationalHeadPlacement: c.nationalHeadPlacement || '',
      placementApplicable: c.placementApplicable || '',
      centerHeadName: c.centerHeadName || '',
      centerType: c.centerType || 'CDC',
      location: c.location || c.geolocation || '',
      zonalHeadName: c.zonalHeadName || '',
      auditedBy: c.auditedBy || '',
      auditPeriod: c.auditPeriod || '',
      chName: c.chName || '',
      geolocation: c.geolocation || '',
      approvalStatus: c.approvalStatus || 'approved',
      editApprovalStatus: c.editApprovalStatus || ''
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
    const updateData = req.body;

    // Audit User edit request - store as pending, don't apply immediately
    if (updateData.editApprovalStatus === 'pending') {
      const { editRequestBy, editRequestDate, editApprovalStatus, changedFields, _id, __v, createdAt, updatedAt, ...actualEditData } = updateData;
      console.log('📝 Changed fields received:', JSON.stringify(changedFields));
      const updated = await Center.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            editApprovalStatus: 'pending',
            editRequestBy: editRequestBy || '',
            editRequestDate: editRequestDate || '',
            pendingEditData: actualEditData,
            changedFields: changedFields || null
          }
        },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Center not found' });
      console.log(`✅ Center edit request stored: ${updated.centerCode}`);
      return res.json({ success: true, center: updated, pendingApproval: true });
    }

    // Admin direct update - remove immutable fields
    const { _id, __v, createdAt, updatedAt, ...cleanData } = updateData;
    const updatedCenter = await Center.findByIdAndUpdate(
      req.params.id,
      { $set: cleanData },
      { new: true, runValidators: false }
    );
    if (!updatedCenter) return res.status(404).json({ error: 'Center not found' });
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
    const centerData = {
      ...req.body,
      centerCode: req.body.centerCode.toUpperCase()
    };

    // Agar Audit User ne banaya toh pending approval
    if (req.body.createdByRole === 'Audit User') {
      centerData.approvalStatus = 'pending';
      centerData.isActive = false; // Admin approve kare tabhi active
      centerData.approvalRequestedBy = req.body.createdBy || 'Audit User';
    }

    const center = new Center(centerData);
    await center.save();
    console.log(`✅ Center created: ${center.centerCode} | approval: ${centerData.approvalStatus}`);
    res.status(201).json({ 
      success: true, 
      center,
      pendingApproval: centerData.approvalStatus === 'pending'
    });
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
      areaManager: centerData?.areaManager || data.areaManager || '',
      clusterManager: centerData?.clusterManager || data.clusterManager || '',
      placementCoordinator: centerData?.placementCoordinator || data.placementCoordinator || '',
      seniorManagerPlacement: centerData?.seniorManagerPlacement || data.seniorManagerPlacement || '',
      nationalHeadPlacement: centerData?.nationalHeadPlacement || data.nationalHeadPlacement || '',
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
      
      // Reset email sent status when report is edited by auditor
      // Note: emailSent/emailSentDate are managed separately by $set,
      // so if center already submitted, these won't be touched (they're not in updateData for that case)
      emailSent: false,
      emailSentDate: '',
      emailSentTo: '',
      
      // ✅ NEVER include center head lock fields in updateData — they must never be overwritten by auditor save
      // centerHeadRemarksLocked, remarksEditedOnce, centerHeadEditRequest,
      // centerRemarks, centerRemarksBy, centerRemarksDate, centerHeadCheckpointRemarks
      // are all excluded from this object intentionally
      
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
    // IMPORTANT: Use $set so center head remarks fields are NOT overwritten
    const auditPeriod = data.auditPeriod || '';
    const matchQuery = auditPeriod
      ? { centerCode: data.centerCode, financialYear: data.financialYear || 'FY26', auditPeriod: auditPeriod }
      : { centerCode: data.centerCode, financialYear: data.financialYear || 'FY26' };

    const report = await AuditReport.findOneAndUpdate(
      matchQuery,
      { $set: updateData },
      { upsert: true, new: true }
    );

    // ✅ CRITICAL: Only reset edit-request flags if center head has NEVER submitted remarks
    // Once centerRemarksDate is set (any submission happened), NEVER touch lock fields
    if (!report.centerRemarksDate && !report.remarksEditedOnce && !report.centerHeadRemarksLocked) {
      report.centerHeadEditRequest = false;
      report.centerHeadEditRequestDate = '';
      report.centerHeadEditRequestBy = '';
      await report.save();
    }
    // If center head submitted even once — leave ALL lock fields untouched
    
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
// Center User - Save center remarks
app.put('/api/audit-reports/:id/center-remarks', async (req, res) => {
  try {
    console.log('\n💬 ========== SAVING CENTER HEAD REMARKS ==========');
    const { centerRemarks, centerHeadCheckpointRemarks, centerRemarksBy } = req.body;
    console.log('📋 Report ID:', req.params.id);
    console.log('📝 Total remarks:', Object.keys(centerHeadCheckpointRemarks || {}).length);
    
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      console.log('❌ Report not found');
      return res.status(404).json({ error: 'Report not found' });
    }

    // ✅ BACKEND GUARD 0: Placement applicable but coordinator hasn't submitted yet
    // Sirf 1st submit pe check karo — agar centerRemarksDate set hai toh yeh edit hai, allow karo
    const isEditSubmit = !!report.centerRemarksDate;
    if (!isEditSubmit && report.placementApplicable === 'yes' && !report.placementRemarksSubmitted) {
      console.log('🔒 BLOCKED: Placement remarks not submitted yet (1st submit)');
      return res.status(403).json({ 
        error: 'Placement Coordinator has not submitted remarks yet. Please wait for placement remarks before submitting.', 
        placementPending: true 
      });
    }

    // ✅ BACKEND GUARD 1: Permanently locked — no more edits ever
    if (report.remarksEditedOnce) {
      console.log('🔒 BLOCKED: Already permanently locked (remarksEditedOnce=true)');
      return res.status(403).json({ error: 'Remarks are permanently locked. No further edits allowed.', permanentlyLocked: true });
    }

    // ✅ BACKEND GUARD 2: Locked AND edit request still pending (not approved yet)
    if (report.centerHeadRemarksLocked && report.centerHeadEditRequest) {
      console.log('🔒 BLOCKED: Edit request is pending admin approval');
      return res.status(403).json({ error: 'Edit request is pending admin approval. Please wait.', requestPending: true });
    }

    // ✅ BACKEND GUARD 3: Locked but no edit request raised AND never submitted — block sneaky API calls
    // Exception: if centerRemarksDate exists + locked=false, it means admin approved the edit → allow
    if (report.centerHeadRemarksLocked && !report.centerHeadEditRequest && !report.centerRemarksDate) {
      console.log('🔒 BLOCKED: Remarks locked, no approved edit request');
      return res.status(403).json({ error: 'Remarks are locked. Please request edit permission from admin.' });
    }

    // Save overall center remarks (optional field)
    if (centerRemarks !== undefined) {
      report.centerRemarks = centerRemarks;
    }

    // ✅ PERMANENT LOCK LOGIC — CHECK BEFORE setting centerRemarksDate
    // centerRemarksDate set hone se PEHLE check karo — warna hamesha true milega
    const isSecondSubmit = !!report.centerRemarksDate; // DB mein pehle se set hai = 2nd submit

    if (isSecondSubmit) {
      report.remarksEditedOnce = true;
      report.centerHeadRemarksLocked = true;
      console.log('🔒 Remarks PERMANENTLY LOCKED (2nd submit)');
    } else {
      report.centerHeadRemarksLocked = true;
      console.log('🔒 Remarks LOCKED (1st submit) — can request edit once');
    }

    // ✅ Save who submitted and when (AFTER isSecondSubmit check)
    report.centerRemarksBy = centerRemarksBy || '';
    report.centerRemarksDate = new Date().toLocaleString('en-GB');

    // ✅ Save checkpoint remarks in BOTH places
    if (centerHeadCheckpointRemarks && Object.keys(centerHeadCheckpointRemarks).length > 0) {
      report.centerHeadCheckpointRemarks = centerHeadCheckpointRemarks;
      report.markModified('centerHeadCheckpointRemarks');

      const checkpointIds = [
        'FO1','FO2','FO3','FO4','FO5',
        'DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11',
        'PP1','PP2','PP3','PP4',
        'MP1','MP2','MP3','MP4','MP5','MP6','MP7'
      ];
      let savedCount = 0;
      checkpointIds.forEach(cpId => {
        if (centerHeadCheckpointRemarks[cpId]) {
          const existingCpData = report[cpId] || {};
          report[cpId] = { ...existingCpData, centerHeadRemarks: centerHeadCheckpointRemarks[cpId] };
          report.markModified(cpId);
          savedCount++;
        }
      });
      console.log(`✅ Saved ${savedCount} checkpoint remarks`);
    }

    // ✅ PLACEMENT PERMANENT LOCK
    // Jab bhi CH submit kare (1st ya 2nd) → placement bhi permanently lock
    if (report.placementRemarksSubmitted) {
      report.placementRemarksLocked = true;
      report.placementRemarksEditedOnce = true;
      report.placementEditRequest = false;
      report.placementEditRequestBy = '';
      report.placementEditRequestDate = '';
      console.log('🔒 Placement PERMANENTLY LOCKED — CH submitted');
    }

    // Set auditor review deadline: 5 working days from now
    const reviewDeadline = addWorkingDaysSrv(new Date(), 5);
    report.auditorReviewDeadline = reviewDeadline;
    report.auditorReviewDeadlineString = reviewDeadline.toLocaleDateString('en-GB');
    console.log(`📅 Auditor review deadline: ${report.auditorReviewDeadlineString}`);

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

    // ✅ GUARD: Can't request edit if permanently locked
    if (report.remarksEditedOnce) {
      console.log('🔒 BLOCKED: Remarks permanently locked, edit request denied');
      return res.status(403).json({ error: 'Remarks are permanently locked. No further edit requests allowed.', permanentlyLocked: true });
    }

    // ✅ GUARD: Can't request edit if request already pending
    if (report.centerHeadEditRequest) {
      console.log('⏳ BLOCKED: Edit request already pending');
      return res.status(409).json({ error: 'Edit request already pending. Please wait for admin approval.', alreadyPending: true });
    }

    // ✅ GUARD: Can only request edit if remarks are actually locked
    if (!report.centerHeadRemarksLocked) {
      console.log('⚠️ BLOCKED: Remarks not locked yet, no edit request needed');
      return res.status(400).json({ error: 'Remarks are not locked. You can edit directly.' });
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

    // ✅ GUARD: Cannot approve edit for permanently locked report
    if (report.remarksEditedOnce) {
      console.log('🔒 BLOCKED: Cannot approve edit — remarks permanently locked');
      return res.status(403).json({ error: 'Cannot approve edit. Remarks are permanently locked after 2nd submission.' });
    }

    // ✅ GUARD: No pending request to approve
    if (!report.centerHeadEditRequest) {
      console.log('⚠️ BLOCKED: No pending edit request found');
      return res.status(400).json({ error: 'No pending edit request found for this report.' });
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
    console.log('\n📋 Fetching pending edit requests (center head + placement)...');
    
    // Fetch both center head AND placement edit requests
    const reports = await AuditReport.find({
      $or: [
        { centerHeadEditRequest: true },
        { placementEditRequest: true }
      ]
    }).sort({ updatedAt: -1 });
    
    // Tag each report with requestType so frontend can differentiate
    const tagged = reports.map(r => {
      const obj = r.toObject();
      if (obj.centerHeadEditRequest && obj.placementEditRequest) obj.requestType = 'both';
      else if (obj.centerHeadEditRequest) obj.requestType = 'centerHead';
      else obj.requestType = 'placement';
      return obj;
    });
    
    console.log(`✅ Found ${tagged.length} pending edit requests`);
    res.json(tagged);
  } catch (err) {
    console.error('❌ Error fetching edit requests:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// EMAIL ROUTE (With PDF Attachment)



// ========================================
// REMINDER EMAIL FUNCTION
// ========================================
async function sendReminderEmail(report, daysLeft) {
  try {
    // Get center user email
    const centerUser = await User.findOne({
      centerCode: report.centerCode.toUpperCase(),
      role: 'Center User',
      isActive: true
    });

    if (!centerUser || !centerUser.email) {
      console.log(`⚠️ No center user email for ${report.centerCode}`);
      return false;
    }

    const loginUrl = 'https://audit-tool-liard.vercel.app';
    const chName = report.centerHeadName || centerUser.firstname || 'Sir/Madam';

    let subject, message, urgencyColor, urgencyEmoji;

    if (daysLeft === 'closed') {
      // After Day 7 - Closed notice
      subject = `📋 Audit Remarks Window Closed - ${report.centerName}`;
      urgencyColor = '#6c757d';
      urgencyEmoji = '🔒';
      message = `
        <div style="background:#f8f9fa; border-left:4px solid #6c757d; padding:20px; border-radius:8px; margin:20px 0;">
          <h3 style="margin:0 0 10px; color:#6c757d;">🔒 Remarks Window Closed</h3>
          <p style="margin:0; color:#555; font-size:15px;">
            The 7-day window to submit your remarks for the audit report has now expired and has been <strong>automatically closed</strong>.
          </p>
        </div>
        <p style="color:#555; font-size:15px;">
          If you have any queries regarding this audit report, please contact the <strong>Auditor Team</strong> directly.
        </p>
        <div style="background:#fff3cd; border:1px solid #ffc107; padding:15px; border-radius:8px; margin:15px 0;">
          <p style="margin:0; color:#856404; font-size:14px;">
            ⚠️ <strong>Note:</strong> The timeline limit for submitting remarks has been reached. This report is now closed for any further input from your side.
          </p>
        </div>
      `;
    } else if (daysLeft <= 0) {
      // Day 7 - Last day
      subject = `🚨 TODAY IS THE LAST DAY - Submit Remarks Now | ${report.centerName}`;
      urgencyColor = '#dc3545';
      urgencyEmoji = '🚨';
      message = `
        <div style="background:#ffebee; border-left:4px solid #dc3545; padding:20px; border-radius:8px; margin:20px 0; animation:pulse 1s infinite;">
          <h3 style="margin:0 0 10px; color:#dc3545;">🚨 TODAY IS THE LAST DAY!</h3>
          <p style="margin:0; color:#555; font-size:15px;">
            This is your <strong>final opportunity</strong> to submit your remarks. The window will close <strong>TODAY</strong> at midnight.
          </p>
        </div>
        <p style="color:#555; font-size:15px;">After today, the report will be automatically closed and no further remarks can be submitted.</p>
      `;
    } else if (daysLeft === 1) {
      // Day 6 - Final warning
      subject = `🚨 FINAL WARNING: Only 1 Day Left to Submit Remarks | ${report.centerName}`;
      urgencyColor = '#dc3545';
      urgencyEmoji = '🚨';
      message = `
        <div style="background:#ffebee; border-left:4px solid #dc3545; padding:20px; border-radius:8px; margin:20px 0;">
          <h3 style="margin:0 0 10px; color:#dc3545;">🚨 FINAL WARNING - 1 Day Left!</h3>
          <p style="margin:0; color:#555; font-size:15px;">
            You have only <strong>1 working day remaining</strong> to submit your remarks. Please act immediately.
          </p>
        </div>
        <p style="color:#555; font-size:15px;">After the deadline, the report will be automatically closed.</p>
      `;
    } else if (daysLeft === 2) {
      // Day 5 - Urgent
      subject = `⚠️ URGENT: Only 2 Days Left to Submit Remarks | ${report.centerName}`;
      urgencyColor = '#e65100';
      urgencyEmoji = '⚠️';
      message = `
        <div style="background:#fff3e0; border-left:4px solid #ff9800; padding:20px; border-radius:8px; margin:20px 0;">
          <h3 style="margin:0 0 10px; color:#e65100;">⚠️ Only 2 Working Days Left!</h3>
          <p style="margin:0; color:#555; font-size:15px;">
            Your deadline to submit remarks is approaching fast. Only <strong>2 working days</strong> remain.
          </p>
        </div>
      `;
    } else {
      // Day 3 onwards - First reminder
      subject = `📋 Reminder: ${daysLeft} Days Left to Submit Audit Remarks | ${report.centerName}`;
      urgencyColor = '#1976d2';
      urgencyEmoji = '📋';
      message = `
        <div style="background:#e3f2fd; border-left:4px solid #2196f3; padding:20px; border-radius:8px; margin:20px 0;">
          <h3 style="margin:0 0 10px; color:#1976d2;">📋 Reminder: ${daysLeft} Working Days Remaining</h3>
          <p style="margin:0; color:#555; font-size:15px;">
            This is a friendly reminder that you have <strong>${daysLeft} working days</strong> left to review and submit your remarks for the audit report.
          </p>
        </div>
      `;
    }

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; font-family:Arial,sans-serif; background:#f5f5f5;">
  <div style="max-width:700px; margin:0 auto; background:white;">
    
    <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:25px; text-align:center;">
      <h1 style="color:white; margin:0; font-size:24px;">${urgencyEmoji} Audit Remarks ${daysLeft === 'closed' ? 'Closed' : 'Reminder'}</h1>
      <p style="color:rgba(255,255,255,0.9); margin:8px 0 0; font-size:15px;">${report.centerName} (${report.centerCode})</p>
    </div>

    <div style="padding:30px;">
      <p style="font-size:16px; color:#333;">Dear <strong>${chName}</strong>,</p>
      
      ${message}

      ${daysLeft !== 'closed' ? `
      <div style="text-align:center; margin:25px 0;">
        <a href="${loginUrl}" style="display:inline-block; padding:14px 35px; background:linear-gradient(135deg, #667eea, #764ba2); color:white; text-decoration:none; border-radius:8px; font-weight:bold; font-size:16px;">
          📝 Submit Remarks Now
        </a>
      </div>
      <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin:15px 0; font-size:13px; color:#666;">
        <strong>Login URL:</strong> ${loginUrl}<br/>
        <strong>Username:</strong> ${centerUser.username}<br/>
        <strong>Report:</strong> ${report.centerName} | Score: ${report.grandTotal}/100
      </div>
      <p style="font-size:12px; color:#999; margin-top:10px;">
        ⏰ Deadline: ${report.centerDeadlineString || 'As communicated'} | You can edit remarks only <strong>once</strong> after submitting.
      </p>
      ` : `
      <p style="color:#555; font-size:14px; margin-top:20px;">
        For any queries, please reach out to your <strong>Auditor Team</strong>.
      </p>
      `}

      <p style="font-size:14px; color:#666; margin-top:25px;">
        Best Regards,<br/>
        <strong>NIIT Audit Team</strong>
      </p>
    </div>

    <div style="background:#f5f5f5; padding:15px; text-align:center; border-top:1px solid #ddd;">
      <p style="margin:0; color:#999; font-size:12px;">This is an automated reminder from NIIT Audit System.</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `NIIT Audit System <${process.env.EMAIL_USER}>`,
      to: centerUser.email,
      subject: subject,
      html: htmlBody
    });

    console.log(`✅ Reminder email sent to ${centerUser.email} | ${report.centerCode} | daysLeft: ${daysLeft}`);
    return true;

  } catch (err) {
    console.error(`❌ Reminder email failed for ${report.centerCode}:`, err.message);
    return false;
  }
}

// ========================================
// AUDITOR REMINDER EMAIL FUNCTION
// ========================================
async function sendAuditorReminderEmail(report, daysLeft) {
  try {
    // auditedBy naam se Audit User dhundo
    if (!report.auditedBy) {
      console.log(`⚠️ No auditedBy for ${report.centerCode}`);
      return false;
    }

    // auditedBy mein "Firstname Lastname" ya sirf "Firstname" ho sakta hai
    const firstName = report.auditedBy.split(' ')[0].trim();
    const auditorUser = await User.findOne({
      firstname: { $regex: new RegExp(`^${firstName}$`, 'i') },
      role: { $in: ['Audit User', 'Admin'] },
      isActive: true
    });

    if (!auditorUser || !auditorUser.email) {
      console.log(`⚠️ No auditor email found for: ${report.auditedBy}`);
      return false;
    }

    const loginUrl = 'https://audit-tool-liard.vercel.app';
    const auditorName = auditorUser.firstname || report.auditedBy;

    let subject, urgencyBlock;

    if (daysLeft === 'auto_closed') {
      subject = `🔒 Report Auto-Closed: ${report.centerName} | Deadline Expired`;
      urgencyBlock = `
        <div style="background:#f8f9fa; border-left:4px solid #6c757d; padding:20px; border-radius:8px; margin:20px 0;">
          <h3 style="margin:0 0 10px; color:#6c757d;">🔒 Report Auto-Closed</h3>
          <p style="margin:0; color:#555; font-size:15px; line-height:1.6;">
            The audit report for <strong>${report.centerName}</strong> has been <strong>automatically closed</strong> 
            as it was not submitted within the 15 working day deadline.
          </p>
        </div>
        <p style="color:#555; font-size:14px;">Please ensure future reports are submitted within the stipulated time.</p>`;
    } else if (daysLeft === 0) {
      subject = `🚨 TODAY IS THE LAST DAY - Submit Audit Report | ${report.centerName}`;
      urgencyBlock = `
        <div style="background:#ffebee; border-left:4px solid #dc3545; padding:20px; border-radius:8px; margin:20px 0;">
          <h3 style="margin:0 0 10px; color:#dc3545;">🚨 TODAY IS YOUR LAST DAY!</h3>
          <p style="margin:0; color:#555; font-size:15px; line-height:1.6;">
            The 15 working day deadline to submit the audit report for <strong>${report.centerName}</strong> 
            expires <strong>TODAY</strong>. Please submit immediately.
          </p>
        </div>
        <p style="color:#dc3545; font-weight:bold; font-size:14px;">⚠️ If not submitted today, the report will be automatically closed.</p>`;
    } else if (daysLeft === 1) {
      subject = `🚨 FINAL WARNING: 1 Day Left - Submit Audit Report | ${report.centerName}`;
      urgencyBlock = `
        <div style="background:#ffebee; border-left:4px solid #dc3545; padding:20px; border-radius:8px; margin:20px 0;">
          <h3 style="margin:0 0 10px; color:#dc3545;">🚨 Only 1 Working Day Left!</h3>
          <p style="margin:0; color:#555; font-size:15px; line-height:1.6;">
            You have only <strong>1 working day remaining</strong> to submit the audit report 
            for <strong>${report.centerName}</strong>. Please take immediate action.
          </p>
        </div>`;
    } else if (daysLeft === 3) {
      subject = `⚠️ Reminder: 3 Days Left - Submit Audit Report | ${report.centerName}`;
      urgencyBlock = `
        <div style="background:#fff3e0; border-left:4px solid #ff9800; padding:20px; border-radius:8px; margin:20px 0;">
          <h3 style="margin:0 0 10px; color:#e65100;">⚠️ 3 Working Days Remaining</h3>
          <p style="margin:0; color:#555; font-size:15px; line-height:1.6;">
            This is an urgent reminder. Only <strong>3 working days</strong> remain to submit 
            the audit report for <strong>${report.centerName}</strong>.
          </p>
        </div>`;
    } else if (daysLeft === 5) {
      subject = `📋 Reminder: 5 Days Left - Submit Audit Report | ${report.centerName}`;
      urgencyBlock = `
        <div style="background:#fff3e0; border-left:4px solid #ff9800; padding:20px; border-radius:8px; margin:20px 0;">
          <h3 style="margin:0 0 10px; color:#e65100;">📋 5 Working Days Remaining</h3>
          <p style="margin:0; color:#555; font-size:15px; line-height:1.6;">
            Reminder: You have <strong>5 working days</strong> left to submit the audit report 
            for <strong>${report.centerName}</strong>.
          </p>
        </div>`;
    } else {
      // 10 days left
      subject = `📋 Reminder: ${daysLeft} Days Left - Submit Audit Report | ${report.centerName}`;
      urgencyBlock = `
        <div style="background:#e3f2fd; border-left:4px solid #2196f3; padding:20px; border-radius:8px; margin:20px 0;">
          <h3 style="margin:0 0 10px; color:#1976d2;">📋 ${daysLeft} Working Days Remaining</h3>
          <p style="margin:0; color:#555; font-size:15px; line-height:1.6;">
            This is a friendly reminder that you have <strong>${daysLeft} working days</strong> 
            remaining to submit the audit report for <strong>${report.centerName}</strong>.
          </p>
        </div>`;
    }

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; font-family:Arial,sans-serif; background:#f5f5f5;">
  <div style="max-width:700px; margin:0 auto; background:white;">

    <div style="background:linear-gradient(135deg, #1a237e 0%, #283593 100%); padding:25px; text-align:center;">
      <h1 style="color:white; margin:0; font-size:22px;">📋 Audit Report ${daysLeft === 'auto_closed' ? 'Auto-Closed' : 'Submission Reminder'}</h1>
      <p style="color:rgba(255,255,255,0.85); margin:8px 0 0; font-size:14px;">NIIT Audit Management System</p>
    </div>

    <div style="padding:30px;">
      <p style="font-size:16px; color:#333;">Dear <strong>${auditorName}</strong>,</p>

      ${urgencyBlock}

      <table style="width:100%; border-collapse:collapse; margin:20px 0; font-size:13px;">
        <tr style="background:#e8eaf6;">
          <td style="padding:10px 14px; font-weight:bold; color:#283593; border:1px solid #c5cae9;">Center Name</td>
          <td style="padding:10px 14px; border:1px solid #c5cae9;">${report.centerName}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; font-weight:bold; color:#283593; border:1px solid #c5cae9;">Center Code</td>
          <td style="padding:10px 14px; border:1px solid #c5cae9;">${report.centerCode}</td>
        </tr>
        <tr style="background:#e8eaf6;">
          <td style="padding:10px 14px; font-weight:bold; color:#283593; border:1px solid #c5cae9;">Financial Year</td>
          <td style="padding:10px 14px; border:1px solid #c5cae9;">${report.financialYear || 'FY26'}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; font-weight:bold; color:#283593; border:1px solid #c5cae9;">Audit Date</td>
          <td style="padding:10px 14px; border:1px solid #c5cae9;">${report.auditDateString || '-'}</td>
        </tr>
        <tr style="background:#e8eaf6;">
          <td style="padding:10px 14px; font-weight:bold; color:#283593; border:1px solid #c5cae9;">Grand Total</td>
          <td style="padding:10px 14px; border:1px solid #c5cae9; font-weight:bold;">${report.grandTotal}/100</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; font-weight:bold; color:#283593; border:1px solid #c5cae9;">Submission Deadline</td>
          <td style="padding:10px 14px; border:1px solid #c5cae9; color:#dc3545; font-weight:bold;">${report.auditorDeadlineString || '-'}</td>
        </tr>
      </table>

      ${daysLeft !== 'auto_closed' ? `
      <div style="text-align:center; margin:25px 0;">
        <a href="${loginUrl}" style="display:inline-block; padding:14px 40px; background:linear-gradient(135deg, #1a237e, #3949ab); color:white; text-decoration:none; border-radius:8px; font-weight:bold; font-size:15px;">
          🔐 Login & Submit Report
        </a>
      </div>
      <p style="font-size:12px; color:#999; text-align:center;">
        Login at: ${loginUrl}
      </p>` : ''}

      <p style="font-size:14px; color:#666; margin-top:25px; border-top:1px solid #eee; padding-top:15px;">
        Best Regards,<br/>
        <strong>NIIT Audit Management System</strong>
      </p>
    </div>

    <div style="background:#e8eaf6; padding:12px; text-align:center; border-top:1px solid #c5cae9;">
      <p style="margin:0; color:#666; font-size:12px;">This is an automated reminder. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `NIIT Audit System <${process.env.EMAIL_USER}>`,
      to: auditorUser.email,
      subject: subject,
      html: htmlBody
    });

    console.log(`✅ Auditor reminder sent to ${auditorUser.email} | ${report.centerCode} | daysLeft: ${daysLeft}`);
    return true;

  } catch (err) {
    console.error(`❌ Auditor reminder failed for ${report.centerCode}:`, err.message);
    return false;
  }
}

// ========================================
async function sendEmailInBackground(to, cc, subject, customMessage, reportData, hierarchyEmails = []) {
  try {
    console.log('📧 Background email started...');

    // Generate PDF once — use for both emails
    const pdfBuffer = await generatePDF(reportData);
    console.log('✅ PDF generated');

    const attachment = [{
      filename: `Audit_${reportData.centerCode}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }];

    // ── EMAIL 1: Center Head — full email with credentials + PDF ──
    const htmlBody = generateEmailHTML(reportData, customMessage || '');
    const mail1 = {
      from: `NIIT Audit System <${process.env.EMAIL_USER}>`,
      to: to,
      cc: cc || undefined,
      subject: subject,
      html: htmlBody,
      attachments: attachment
    };
    const info1 = await transporter.sendMail(mail1);
    console.log('✅ Center Head email sent!', info1.messageId);

    // ── EMAIL 2: Hierarchy (ZM/RH/ACM) — PDF only, no credentials ──
    if (hierarchyEmails && hierarchyEmails.length > 0) {
      const hierarchyHtml = generateEmailHTML(reportData, ''); // no custom message = no credentials
      const mail2 = {
        from: `NIIT Audit System <${process.env.EMAIL_USER}>`,
        to: hierarchyEmails.join(', '),
        subject: subject,
        html: hierarchyHtml,
        attachments: attachment
      };
      const info2 = await transporter.sendMail(mail2);
      console.log('✅ Hierarchy email sent to:', hierarchyEmails.join(', '), info2.messageId);
    }

    // Update DB
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
    const { to, cc, subject, customMessage, reportData, hierarchyEmails } = req.body;

    console.log('\n📧 EMAIL REQUEST:', reportData.centerName);
    console.log('   To:', to);
    console.log('   Hierarchy emails:', hierarchyEmails || []);

    res.json({ success: true, message: 'Email is being sent...' });

    sendEmailInBackground(to, cc, subject, customMessage || '', reportData, hierarchyEmails || []);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ========================================
// GET HIERARCHY EMAILS by name matching
// POST /api/hierarchy-emails
// body: { zmName, regionHeadName, areaClusterManager }
// ========================================
app.post('/api/hierarchy-emails', async (req, res) => {
  try {
    const { zmName, regionHeadName, areaClusterManager } = req.body;
    const emails = [];

    const findEmail = async (name, role) => {
      if (!name || name === '-') return;
      const regex = new RegExp(name.trim().split(' ')[0], 'i'); // match first name
      const user = await User.findOne({
        role: role,
        isActive: true,
        $or: [
          { firstname: regex },
          { username: regex }
        ]
      });
      if (user && user.email) {
        emails.push(user.email);
        console.log(`✅ Found ${role}: ${user.email}`);
      }
    };

    await findEmail(zmName, 'Zonal Manager');
    await findEmail(regionHeadName, 'Region Head');
    await findEmail(areaClusterManager, 'Area Cluster Manager');

    res.json({ success: true, emails: [...new Set(emails)] }); // dedupe
  } catch (err) {
    console.error('❌ Hierarchy emails error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// CENTERS ROUTES
// ========================================

// GET all centers
// Get MY requests (for Audit User - includes pending/inactive)
app.get('/api/my-requests/:createdBy', async (req, res) => {
  try {
    const name = req.params.createdBy;
    
    // My center requests (new + edit)
    const centers = await Center.find({
      $or: [
        { approvalRequestedBy: { $regex: new RegExp(`^${name}$`, 'i') } },
        { editRequestBy: { $regex: new RegExp(`^${name}$`, 'i') } }
      ]
    }).sort({ createdAt: -1 });

    // My user requests (new + modify)
    const users = await User.find({
      $or: [
        { approvalRequestedBy: { $regex: new RegExp(`^${name}$`, 'i') } },
        { modifiedBy: { $regex: new RegExp(`^${name}$`, 'i') } }
      ]
    }).sort({ createdAt: -1 });

    res.json({ centers, users });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate endpoints removed

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
// WORKING DAYS HELPER (Server Side)
// ========================================
const HOLIDAYS_SERVER = {
  2025: ['2025-01-26','2025-03-14','2025-04-14','2025-04-18','2025-05-01',
         '2025-08-15','2025-08-16','2025-10-02','2025-10-20','2025-11-05','2025-12-25'],
  2026: ['2026-01-26','2026-03-03','2026-04-03','2026-04-14','2026-05-01',
         '2026-08-15','2026-09-04','2026-10-02','2026-10-19','2026-11-08',
         '2026-11-24','2026-12-25']
};

function isWorkingDaySrv(date) {
  const d = new Date(date);
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  const ds = d.toISOString().split('T')[0];
  return !(HOLIDAYS_SERVER[d.getFullYear()] || []).includes(ds);
}

function addWorkingDaysSrv(startDate, days) {
  let d = new Date(startDate); d.setHours(0,0,0,0);
  let count = 0;
  while (count < days) { d.setDate(d.getDate()+1); if (isWorkingDaySrv(d)) count++; }
  return d;
}

// ========================================
// AUTO-CLOSE DEADLINE CHECK
// ========================================
app.post('/api/audit-reports/check-deadlines', async (req, res) => {
  try {
    const now = new Date(); now.setHours(0,0,0,0);
    let auditorClosed = 0, centerClosed = 0, editWindowClosed = 0;

    // 1. AUDITOR DEADLINE: 15 working days - close Not Submitted reports
    const auditorOverdue = await AuditReport.find({
      currentStatus: { $in: ['Not Submitted', 'Sent Back'] },
      auditorDeadline: { $lt: now },
      autoClosedBy: { $not: { $regex: 'auditor_deadline' } }
    });
    for (const report of auditorOverdue) {
      report.currentStatus = 'Closed';
      report.autoClosedBy = 'auditor_deadline';
      report.autoClosedDate = now.toLocaleDateString('en-GB');
      await report.save();
      auditorClosed++;
      console.log(`🔒 Auditor deadline: ${report.centerCode} closed`);
    }

    // 2. CENTER REMARKS DEADLINE: 7 working days - lock remarks window
    const centerOverdue = await AuditReport.find({
      currentStatus: 'Approved',
      emailSent: true,
      centerDeadline: { $lt: now },
      centerHeadRemarksLocked: false
    });
    for (const report of centerOverdue) {
      report.centerHeadRemarksLocked = true;
      if (!report.autoClosedBy) report.autoClosedBy = 'center_deadline';
      report.autoClosedDate = now.toLocaleDateString('en-GB');
      await report.save();
      centerClosed++;
      console.log(`🔒 Center deadline: ${report.centerCode} remarks locked`);
    }

    // Note: Edit request window (3 days) is handled on frontend only

    // ── 3. CENTER REMINDER EMAILS ──
    // Find all approved reports where email was sent but remarks not yet submitted
    let remindersSent = 0;
    let closedEmailsSent = 0;

    const activeReports = await AuditReport.find({
      currentStatus: 'Approved',
      emailSent: true,
      centerHeadRemarksLocked: false,  // remarks not yet submitted
      centerRemarksDate: { $in: [null, ''] }, // Double check - koi remarks nahi
      centerDeadline: { $exists: true, $ne: null, $gte: now } // deadline abhi future mein hai
    });

    for (const report of activeReports) {
      if (!report.centerDeadline) continue;

      // Calculate remaining working days
      const deadline = new Date(report.centerDeadline); deadline.setHours(0,0,0,0);
      let rem = 0;
      let d = new Date(now);
      if (now <= deadline) {
        while (d < deadline) { d.setDate(d.getDate()+1); if (isWorkingDaySrv(d)) rem++; }
      } else {
        rem = -1; // overdue
      }

      // Reminder thresholds: send at 4 days left, 2 days left, 1 day left, 0 days left
      const thresholds = [4, 2, 1, 0];
      const remindersSentArr = report.remindersSent || [];

      for (const threshold of thresholds) {
        if (rem === threshold && !remindersSentArr.includes(threshold)) {
          const sent = await sendReminderEmail(report, threshold);
          if (sent) {
            report.remindersSent = [...remindersSentArr, threshold];
            await report.save();
            remindersSent++;
          }
          break;
        }
      }
    }

    // ── 4. CLOSED EMAIL — after deadline, send closed notice once ──
    const overdueReports = await AuditReport.find({
      currentStatus: 'Approved',
      emailSent: true,
      centerDeadline: { $lt: now },
      centerHeadRemarksLocked: false,  // ✅ Sirf tab jab remarks submit NAHI hui
      centerRemarksDate: { $in: [null, ''] }, // Double check - remarks nahi bhara
      reminderClosedSent: { $ne: true }
    });

    for (const report of overdueReports) {
      // Lock remarks (deadline cross ho gayi, ab lock karo)
      report.centerHeadRemarksLocked = true;
      // Send closed email
      const sent = await sendReminderEmail(report, 'closed');
      if (sent) {
        report.reminderClosedSent = true;
      }
      await report.save();
      closedEmailsSent++;
      console.log(`🔒 Closed (no remarks submitted): ${report.centerCode}`);
    }

    // ── 5. AUDITOR REVIEW AUTO-CLOSE: 5 working days after center submits ──
    let auditorReviewAutoClosed = 0;

    const reviewOverdue = await AuditReport.find({
      currentStatus: 'Approved',
      centerHeadRemarksLocked: true,
      centerRemarksDate: { $exists: true, $ne: '' },
      auditorReviewDeadline: { $exists: true, $lt: now },
      auditorClosedDate: { $in: [null, ''] }  // not yet manually closed
    });

    for (const report of reviewOverdue) {
      report.currentStatus = 'Closed';
      report.auditorClosedDate = now.toLocaleDateString('en-GB');
      report.auditorClosedBy = 'Auto-closed (5 day review period expired)';
      await report.save();
      auditorReviewAutoClosed++;
      console.log(`🔒 Auto-closed (review expired): ${report.centerCode}`);

      // Send closed email
      const centerUser = await User.findOne({
        centerCode: report.centerCode.toUpperCase(),
        role: 'Center User', isActive: true
      });
      if (centerUser?.email) {
        await sendReminderEmail(report, 'closed').catch(e => console.log('Email err:', e.message));
      }
    }

    console.log(`✅ Deadlines: auditor=${auditorClosed}, center=${centerClosed}, reminders=${remindersSent}, closedEmails=${closedEmailsSent}, autoReviewClosed=${auditorReviewAutoClosed}`);
    res.json({ success: true, auditorClosed, centerClosed, remindersSent, closedEmailsSent, auditorReviewAutoClosed });

  } catch (err) {
    console.error('❌ Deadline check error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// GET CENTER USER EMAIL + CREDENTIALS
// ========================================
app.get('/api/center-user-email/:centerCode', async (req, res) => {
  try {
    const { centerCode } = req.params;
    const centerUser = await User.findOne({
      centerCode: centerCode.toUpperCase(),
      role: 'Center User',
      isActive: true
    });
    if (!centerUser) return res.json({ success: false, email: '', username: '', firstname: '' });
    res.json({
      success: true,
      email: centerUser.email || '',
      username: centerUser.username || '',
      firstname: centerUser.firstname || '',
      password: centerUser.password || ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// CLOSE REPORT (Auditor manually closes after reviewing remarks)
// ========================================
app.post('/api/audit-reports/:id/close-report', async (req, res) => {
  try {
    const { closedBy } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    report.currentStatus = 'Closed';
    report.auditorClosedDate = new Date().toLocaleDateString('en-GB');
    report.auditorClosedBy = closedBy || 'Auditor';
    report.reminderClosedSent = true;
    report.remindersSent = [0, 1, 2, 4];
    report.auditorRemindersSent = [0, 1, 3, 5, 10]; // Cancel all auditor reminders too
    await report.save();

    console.log(`🔒 Report manually closed: ${report.centerCode} by ${closedBy}`);

    // Send closed email to center user
    const centerUser = await User.findOne({
      centerCode: report.centerCode.toUpperCase(),
      role: 'Center User',
      isActive: true
    });

    if (centerUser?.email) {
      const loginUrl = 'https://audit-tool-liard.vercel.app';
      const chName = report.centerHeadName || centerUser.firstname || 'Sir/Madam';

      const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
<div style="max-width:700px;margin:0 auto;background:white;">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:25px;text-align:center;">
    <h1 style="color:white;margin:0;font-size:24px;">🔒 Audit Report Closed</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px;">${report.centerName} (${report.centerCode})</p>
  </div>
  <div style="padding:30px;">
    <p style="font-size:16px;color:#333;">Dear <strong>${chName}</strong>,</p>
    <div style="background:#f8f9fa;border-left:4px solid #6c757d;padding:20px;border-radius:8px;margin:20px 0;">
      <h3 style="margin:0 0 10px;color:#495057;">🔒 Your audit report has been reviewed and closed</h3>
      <p style="margin:0;color:#555;font-size:15px;line-height:1.6;">
        The auditor team has reviewed your remarks and officially closed this audit report.
        <br/><br/>
        <strong>Report:</strong> ${report.centerName}<br/>
        <strong>Audit Score:</strong> ${report.grandTotal}/100<br/>
        <strong>Closed On:</strong> ${report.auditorClosedDate}<br/>
        <strong>Closed By:</strong> ${report.auditorClosedBy}
      </p>
    </div>
    <div style="background:#e8f5e9;border:1px solid #4caf50;padding:15px;border-radius:8px;margin:15px 0;">
      <p style="margin:0;color:#2e7d32;font-size:14px;">
        ✅ <strong>Your remarks have been recorded</strong> and are part of the final audit documentation.
      </p>
    </div>
    <p style="color:#555;font-size:14px;margin-top:15px;">
      The timeline limit for this audit cycle has been completed. For any queries, please contact the <strong>Auditor Team</strong>.
    </p>
    <p style="font-size:14px;color:#666;margin-top:25px;">Best Regards,<br/><strong>NIIT Audit Team</strong></p>
  </div>
  <div style="background:#f5f5f5;padding:15px;text-align:center;border-top:1px solid #ddd;">
    <p style="margin:0;color:#999;font-size:12px;">This is an automated email from NIIT Audit System.</p>
  </div>
</div></body></html>`;

      try {
        await transporter.sendMail({
          from: `NIIT Audit System <${process.env.EMAIL_USER}>`,
          to: centerUser.email,
          subject: `🔒 Audit Report Closed - ${report.centerName}`,
          html
        });
        console.log(`✅ Closed email sent to ${centerUser.email}`);
      } catch(emailErr) {
        console.log('⚠️ Closed email failed:', emailErr.message);
      }
    }

    res.json({ success: true, message: 'Report closed successfully', report });
  } catch (err) {
    console.error('❌ Close report error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ========================================
// APPROVAL ENDPOINTS
// ========================================

// Get pending count
app.get('/api/pending-approvals/count', async (req, res) => {
  try {
    const userNewCount = await User.countDocuments({ approvalStatus: 'pending' });
    const userModifyCount = await User.countDocuments({ modifyApprovalStatus: 'pending' });
    const userCount = userNewCount + userModifyCount;
    const centerNewCount = await Center.countDocuments({ approvalStatus: 'pending' });
    const centerEditCount = await Center.countDocuments({ editApprovalStatus: 'pending' });
    const total = userCount + centerNewCount + centerEditCount;
    res.json({ count: total, userCount, centerCount: centerNewCount + centerEditCount });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Get pending users (new + modify requests)
app.get('/api/pending-approvals/users', async (req, res) => {
  try {
    const users = await User.find({
      $or: [
        { approvalStatus: 'pending' },
        { modifyApprovalStatus: 'pending' }
      ]
    }).sort({ createdAt: -1 });
    res.json(users);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Get pending centers (new + edit requests)
app.get('/api/pending-approvals/centers', async (req, res) => {
  try {
    const centers = await Center.find({
      $or: [
        { approvalStatus: 'pending' },
        { editApprovalStatus: 'pending' }
      ]
    }).sort({ createdAt: -1 });
    res.json(centers);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Approve user (new OR modify request)
app.post('/api/pending-approvals/user/:id/approve', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.modifyApprovalStatus === 'pending' && user.pendingModifyData) {
      // Apply pending modify data
      const { Role, centerCode, firstname, lastname, email, mobile, password } = user.pendingModifyData;
      if (Role) user.role = Role;
      if (centerCode !== undefined) user.centerCode = centerCode;
      if (firstname) user.firstname = firstname;
      if (lastname) user.lastname = lastname;
      if (email) user.email = email;
      if (mobile) user.mobile = mobile;
      if (password) user.password = password;
      user.modifyApprovalStatus = 'approved';
      user.pendingModifyData = null;
      user.approvalDate = new Date().toLocaleDateString('en-GB');
    } else {
      user.approvalStatus = 'approved';
      user.isActive = true;
      user.approvalDate = new Date().toLocaleDateString('en-GB');
    }
    await user.save();
    console.log(`✅ User approved: ${user.username}`);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Reject user (new OR modify request)
app.post('/api/pending-approvals/user/:id/reject', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.modifyApprovalStatus === 'pending') {
      // Cancel modify, keep user as-is
      user.modifyApprovalStatus = 'none';
      user.pendingModifyData = null;
      user.approvalDate = new Date().toLocaleDateString('en-GB');
    } else {
      user.approvalStatus = 'rejected';
      user.isActive = false;
      user.approvalDate = new Date().toLocaleDateString('en-GB');
    }
    await user.save();
    console.log(`❌ User rejected: ${user.username}`);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Approve center (new OR edit request)
app.post('/api/pending-approvals/center/:id/approve', async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);
    if (!center) return res.status(404).json({ error: 'Center not found' });

    if (center.editApprovalStatus === 'pending' && center.pendingEditData) {
      // Apply the pending edit data
      Object.assign(center, center.pendingEditData);
      center.editApprovalStatus = 'approved';
      center.pendingEditData = null;
      center.approvalDate = new Date().toLocaleDateString('en-GB');
    } else {
      // New center approval
      center.approvalStatus = 'approved';
      center.isActive = true;
      center.approvalDate = new Date().toLocaleDateString('en-GB');
    }
    await center.save();
    console.log(`✅ Center approved: ${center.centerCode}`);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Reject center (new OR edit request)
app.post('/api/pending-approvals/center/:id/reject', async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);
    if (!center) return res.status(404).json({ error: 'Center not found' });

    if (center.editApprovalStatus === 'pending') {
      // Just cancel the edit request, keep center as-is
      center.editApprovalStatus = 'none';
      center.pendingEditData = null;
      center.approvalDate = new Date().toLocaleDateString('en-GB');
    } else {
      // Reject new center
      center.approvalStatus = 'rejected';
      center.isActive = false;
      center.approvalDate = new Date().toLocaleDateString('en-GB');
    }
    await center.save();
    console.log(`❌ Center rejected: ${center.centerCode}`);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// ========================================
// START SERVER
// ========================================

// ========================================
// HIERARCHY REPORTS - GET /api/hierarchy-reports
// ========================================
app.get('/api/hierarchy-reports', async (req, res) => {
  try {
    const { role, name, firstname, fy, status, centerType } = req.query;
    let filter = {};
    if (fy && fy !== 'All') filter.financialYear = fy;
    if (status && status !== 'All') filter.currentStatus = status;
    if (centerType && centerType !== 'All') filter.centerType = centerType;

    const buildNameFilter = (field) => {
      const patterns = [];
      if (name && name.trim()) patterns.push({ [field]: { $regex: name.trim(), $options: 'i' } });
      if (firstname && firstname.trim() && firstname.trim() !== name?.trim())
        patterns.push({ [field]: { $regex: firstname.trim(), $options: 'i' } });
      return patterns.length === 1 ? patterns[0] : { $or: patterns };
    };

    if (role === 'Operation Head') {}
    else if (role === 'Zonal Manager' && (name || firstname)) Object.assign(filter, buildNameFilter('zmName'));
    else if (role === 'Region Head' && (name || firstname)) Object.assign(filter, buildNameFilter('regionHeadName'));
    else if ((role === 'Area Manager' || role === 'Cluster Manager') && (name || firstname)) {
      const f1 = buildNameFilter('areaClusterManager');
      const f2 = buildNameFilter(role === 'Area Manager' ? 'areaManager' : 'clusterManager');
      filter.$or = [...(f1.$or||[f1]), ...(f2.$or||[f2])];
    }
    else if (role === 'Placement Coordinator' && (name || firstname)) Object.assign(filter, buildNameFilter('placementCoordinator'));
    else if (role === 'Senior Manager Placement' && (name || firstname)) Object.assign(filter, buildNameFilter('seniorManagerPlacement'));
    else if (role === 'National Head Placement' && (name || firstname)) Object.assign(filter, buildNameFilter('nationalHeadPlacement'));
    else if (role !== 'Operation Head') return res.status(400).json({ error: 'Invalid role or missing name' });

    const reports = await AuditReport.find(filter)
      .select('centerCode centerName centerType zmName regionHeadName areaClusterManager areaManager clusterManager placementCoordinator seniorManagerPlacement nationalHeadPlacement financialYear grandTotal currentStatus auditDateString auditStatus projectName location auditedBy auditPeriod centerHeadName chName frontOfficeScore deliveryProcessScore placementScore managementScore placementApplicable remarksText centerRemarks centerHeadRemarksLocked submissionStatus placementRemarksSubmitted placementRemarksLocked placementRemarksEditedOnce placementRemarksDate placementEditRequest placementEditRequestBy placementEditRequestDate PP1 PP2 PP3 PP4 FO1 FO2 FO3 FO4 FO5 DP1 DP2 DP3 DP4 DP5 DP6 DP7 DP8 DP9 DP10 DP11 MP1 MP2 MP3 MP4 MP5 MP6 MP7')
      .sort({ auditDateString: -1 });

    console.log(`Found ${reports.length} hierarchy reports for ${role}`);
    res.json(reports);
  } catch (err) {
    console.error('Hierarchy reports error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/audit-reports/:id/placement-remarks
app.put('/api/audit-reports/:id/placement-remarks', async (req, res) => {
  try {
    const { placementRemarks, submittedBy } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // ✅ GUARD 1: Already permanently locked (edited once OR CH submitted)
    if (report.placementRemarksEditedOnce)
      return res.status(403).json({ error: 'Placement remarks are permanently locked. No further edits allowed.', permanentlyLocked: true });

    // ✅ GUARD 2: Center Head has submitted → placement permanently locked
    if (report.centerRemarksDate)
      return res.status(403).json({ error: 'Center Head has submitted. Placement remarks are permanently locked.', centerHeadLocked: true });

    // ✅ GUARD 3: Locked + edit request still pending
    if (report.placementRemarksLocked && report.placementEditRequest)
      return res.status(403).json({ error: 'Edit request pending admin approval.', requestPending: true });

    // ✅ GUARD 4: Locked + no approved edit request (sneaky direct call)
    if (report.placementRemarksLocked && !report.placementEditRequest && report.placementRemarksDate)
      return res.status(403).json({ error: 'Remarks locked. Request edit permission from admin.' });

    // Save PP remarks
    ['PP1','PP2','PP3','PP4'].forEach(ppId => {
      if (placementRemarks?.[ppId] !== undefined) {
        const ex = report[ppId] ? (report[ppId].toObject ? report[ppId].toObject() : {...report[ppId]}) : {};
        report[ppId] = { ...ex, centerHeadRemarks: placementRemarks[ppId] };
        report.markModified(ppId);
      }
    });

    report.placementRemarksSubmittedBy = submittedBy || '';

    // ✅ Use placementRemarksDate to detect 1st vs 2nd submit (same fix as center-remarks)
    const isSecondSubmit = !!report.placementRemarksDate;
    report.placementRemarksDate = new Date().toLocaleString('en-GB');

    if (isSecondSubmit) {
      // 2nd submit → permanently locked
      report.placementRemarksEditedOnce = true;
      report.placementRemarksLocked = true;
      report.placementEditRequest = false;
      report.placementEditRequestBy = '';
      report.placementEditRequestDate = '';
      console.log('🔒 Placement remarks PERMANENTLY LOCKED (2nd submit)');
    } else {
      // 1st submit → locked, can request 1 edit
      report.placementRemarksSubmitted = true;
      report.placementRemarksLocked = true;
      console.log('🔒 Placement remarks LOCKED (1st submit)');
    }

    await report.save();
    res.json({
      success: true,
      locked: report.placementRemarksLocked,
      editedOnce: report.placementRemarksEditedOnce,
      submitted: report.placementRemarksSubmitted
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit-reports/:id/request-placement-edit
app.post('/api/audit-reports/:id/request-placement-edit', async (req, res) => {
  try {
    const { coordinatorName } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (report.placementRemarksEditedOnce)
      return res.status(403).json({ error: 'Permanently locked. No edit requests allowed.', permanentlyLocked: true });
    if (report.centerRemarksDate)
      return res.status(403).json({ error: 'Center Head has submitted. Cannot request edit.', centerHeadLocked: true });
    if (report.placementEditRequest)
      return res.status(409).json({ error: 'Edit request already pending.', alreadyPending: true });
    if (!report.placementRemarksLocked)
      return res.status(400).json({ error: 'Remarks not locked. You can edit directly.' });

    report.placementEditRequest = true;
    report.placementEditRequestBy = coordinatorName || '';
    report.placementEditRequestDate = new Date().toLocaleString('en-GB');
    await report.save();

    res.json({ success: true, message: 'Edit request sent to admin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit-reports/:id/approve-placement-edit
app.post('/api/audit-reports/:id/approve-placement-edit', async (req, res) => {
  try {
    const { adminName } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (report.placementRemarksEditedOnce)
      return res.status(403).json({ error: 'Cannot approve. Permanently locked.' });
    if (!report.placementEditRequest)
      return res.status(400).json({ error: 'No pending edit request found.' });

    report.placementRemarksLocked = false;
    report.placementEditRequest = false;
    report.placementEditRequestBy = '';
    report.placementEditRequestDate = '';
    await report.save();

    res.json({ success: true, message: 'Placement edit approved', report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit-reports/:id/placement-status
app.get('/api/audit-reports/:id/placement-status', async (req, res) => {
  try {
    const report = await AuditReport.findById(req.params.id)
      .select('PP1 PP2 PP3 PP4 placementRemarksSubmitted placementRemarksLocked placementRemarksEditedOnce placementRemarksDate placementRemarksSubmittedBy placementEditRequest placementEditRequestBy placementEditRequestDate centerHeadRemarksLocked centerRemarksDate centerCode centerName placementApplicable');
    if (!report) return res.status(404).json({ error: 'Not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

  // ========================================
  // ⏰ AUTOMATIC DAILY DEADLINE CHECK
  // Runs every day at 9:00 AM IST
  // ========================================
  const runDailyCheck = async () => {
    try {
      console.log('\n⏰ ========== DAILY DEADLINE CHECK ==========');
      console.log('⏰ Time:', new Date().toLocaleString('en-IN'));

      const now = new Date(); now.setHours(0,0,0,0);
      let auditorClosed = 0, centerClosed = 0, remindersSentCount = 0, closedEmailsSentCount = 0;

      // 1. AUDITOR DEADLINE: Close Not Submitted reports
      const auditorOverdue = await AuditReport.find({
        currentStatus: { $in: ['Not Submitted', 'Sent Back'] },
        auditorDeadline: { $lt: now },
        autoClosedBy: { $not: { $regex: 'auditor_deadline' } }
      });
      for (const report of auditorOverdue) {
        report.currentStatus = 'Closed';
        report.autoClosedBy = 'auditor_deadline';
        report.autoClosedDate = now.toLocaleDateString('en-GB');
        await report.save();
        auditorClosed++;
        console.log(`🔒 Auditor deadline: ${report.centerCode} closed`);
      }

      // 2. CENTER REMARKS DEADLINE: Lock remarks
      const centerOverdue = await AuditReport.find({
        currentStatus: 'Approved',
        emailSent: true,
        centerDeadline: { $lt: now },
        centerHeadRemarksLocked: false,
        centerRemarksDate: { $in: [null, ''] }
      });
      for (const report of centerOverdue) {
        report.centerHeadRemarksLocked = true;
        if (!report.autoClosedBy) report.autoClosedBy = 'center_deadline';
        report.autoClosedDate = now.toLocaleDateString('en-GB');
        await report.save();
        centerClosed++;
        console.log(`🔒 Center deadline: ${report.centerCode} remarks locked`);
      }

      // 3. REMINDER EMAILS
      const activeReports = await AuditReport.find({
        currentStatus: 'Approved',
        emailSent: true,
        centerHeadRemarksLocked: false,
        centerRemarksDate: { $in: [null, ''] },
        centerDeadline: { $exists: true, $ne: null, $gte: now }
      });

      for (const report of activeReports) {
        if (!report.centerDeadline) continue;
        const deadline = new Date(report.centerDeadline); deadline.setHours(0,0,0,0);
        let rem = 0;
        let d = new Date(now);
        while (d < deadline) { d.setDate(d.getDate()+1); if (isWorkingDaySrv(d)) rem++; }

        const thresholds = [4, 2, 1, 0];
        const remindersSentArr = report.remindersSent || [];

        for (const threshold of thresholds) {
          if (rem === threshold && !remindersSentArr.includes(threshold)) {
            const sent = await sendReminderEmail(report, threshold);
            if (sent) {
              report.remindersSent = [...remindersSentArr, threshold];
              await report.save();
              remindersSentCount++;
            }
            break;
          }
        }
      }

      // 4. CLOSED EMAILS
      const overdueReports = await AuditReport.find({
        currentStatus: 'Approved',
        emailSent: true,
        centerDeadline: { $lt: now },
        centerHeadRemarksLocked: false,
        centerRemarksDate: { $in: [null, ''] },
        reminderClosedSent: { $ne: true }
      });
      for (const report of overdueReports) {
        report.centerHeadRemarksLocked = true;
        const sent = await sendReminderEmail(report, 'closed');
        if (sent) { report.reminderClosedSent = true; }
        await report.save();
        closedEmailsSentCount++;
      }

      // 5. AUDITOR REVIEW DEADLINE: Auto-close if not reviewed in 5 days
      const reviewOverdue = await AuditReport.find({
        currentStatus: 'Approved',
        auditorReviewDeadline: { $exists: true, $lt: now },
        auditorClosedDate: { $in: [null, ''] }
      });
      for (const report of reviewOverdue) {
        report.currentStatus = 'Closed';
        report.auditorClosedDate = now.toLocaleDateString('en-GB');
        report.auditorClosedBy = 'Auto-closed (review deadline)';
        await sendReminderEmail(report, 'closed');
        await report.save();
        console.log(`🔒 Review deadline auto-closed: ${report.centerCode}`);
      }

      // 6. AUDITOR SUBMISSION REMINDERS (15 working days)
      // Thresholds: 10, 5, 3, 1, 0 days left
      const auditorActiveReports = await AuditReport.find({
        currentStatus: { $in: ['Not Submitted', 'Sent Back'] },
        auditorDeadline: { $exists: true, $ne: null, $gte: now },
        auditedBy: { $exists: true, $ne: '' }
      });

      let auditorRemindersSentCount = 0;
      for (const report of auditorActiveReports) {
        if (!report.auditorDeadline) continue;

        // Calculate remaining working days
        const deadline = new Date(report.auditorDeadline); deadline.setHours(0,0,0,0);
        let rem = 0;
        let d = new Date(now);
        while (d < deadline) { d.setDate(d.getDate()+1); if (isWorkingDaySrv(d)) rem++; }

        const thresholds = [10, 5, 3, 1, 0];
        const sentArr = report.auditorRemindersSent || [];

        for (const threshold of thresholds) {
          if (rem === threshold && !sentArr.includes(threshold)) {
            const sent = await sendAuditorReminderEmail(report, threshold);
            if (sent) {
              report.auditorRemindersSent = [...sentArr, threshold];
              await report.save();
              auditorRemindersSentCount++;
            }
            break;
          }
        }
      }

      // 7. AUDITOR AUTO-CLOSED EMAIL
      const auditorAutoClose = await AuditReport.find({
        currentStatus: 'Closed',
        autoClosedBy: { $regex: 'auditor_deadline' },
        auditorAutoClosedEmailSent: { $ne: true },
        auditedBy: { $exists: true, $ne: '' }
      });
      for (const report of auditorAutoClose) {
        const sent = await sendAuditorReminderEmail(report, 'auto_closed');
        if (sent) {
          report.auditorAutoClosedEmailSent = true;
          await report.save();
        }
      }

      console.log(`✅ Daily check done:`);
      console.log(`   Auditor closed: ${auditorClosed}`);
      console.log(`   Center locked: ${centerClosed}`);
      console.log(`   Reminders sent: ${remindersSentCount}`);
      console.log(`   Closed emails: ${closedEmailsSentCount}`);
      console.log('⏰ ==========================================\n');

    } catch (err) {
      console.error('❌ Daily check error:', err.message);
    }
  };

  // Run once on server start (after 5 sec delay)
  setTimeout(runDailyCheck, 5000);

  // Then run every 24 hours at 9 AM IST (UTC+5:30 = 3:30 AM UTC)
  const now = new Date();
  const next9AM = new Date();
  next9AM.setHours(9, 0, 0, 0); // 9 AM local
  if (now >= next9AM) next9AM.setDate(next9AM.getDate() + 1); // kal 9 AM
  const msUntil9AM = next9AM - now;

  setTimeout(() => {
    runDailyCheck(); // First run at 9 AM
    setInterval(runDailyCheck, 24 * 60 * 60 * 1000); // Phir har 24 hours
  }, msUntil9AM);

  console.log(`⏰ Daily deadline check scheduled at 9:00 AM`);
  console.log(`⏰ Next run in: ${Math.round(msUntil9AM / 1000 / 60)} minutes\n`);
});