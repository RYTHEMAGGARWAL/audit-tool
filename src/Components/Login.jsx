import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../contexts/UsersContext';
import axios from 'axios';
import { API_URL } from '../config';
import './Login.css';

// ========================================
// PASSWORD POLICY (must match server.js)
// ========================================
const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter (A-Z)');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter (a-z)');
  if (!/[0-9]/.test(password)) errors.push('One number (0-9)');
  if (!/[@$!%*?&#^()_+\-=\[\]{}|;:,.<>]/.test(password)) errors.push('One special character (@$!%*?& etc)');
  return errors;
};

const getPasswordStrength = (password) => {
  if (!password) return { label: '', color: '', width: '0%' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[@$!%*?&#^()_+\-=\[\]{}|;:,.<>]/.test(password)) score++;
  if (score <= 2) return { label: '❌ Weak', color: '#f44336', width: '30%' };
  if (score === 3) return { label: '⚠️ Medium', color: '#ff9800', width: '55%' };
  if (score === 4) return { label: '✅ Strong', color: '#4caf50', width: '75%' };
  return { label: '✅ Very Strong', color: '#2196f3', width: '100%' };
};

const Login = () => {
  const navigate = useNavigate();
  const { setUsers, users } = useUsers();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── FORCE PASSWORD CHANGE States ──
  const [showForceChange, setShowForceChange] = useState(false);
  const [forceReason, setForceReason] = useState(''); // 'first_login' | 'expired' | 'admin_reset'
  const [forceUsername, setForceUsername] = useState('');
  const [forceCurrentPwd, setForceCurrentPwd] = useState('');
  const [forceNewPwd, setForceNewPwd] = useState('');
  const [forceConfirmPwd, setForceConfirmPwd] = useState('');
  const [forceError, setForceError] = useState('');
  const [forceMessage, setForceMessage] = useState('');
  const [forceLoading, setForceLoading] = useState(false);
  const [showForceCurrent, setShowForceCurrent] = useState(false);
  const [showForceNew, setShowForceNew] = useState(false);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [pendingUserData, setPendingUserData] = useState(null); // store login data till password changed

  // ========================================
  // FETCH USERS FROM MONGODB
  // ========================================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/users`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const usersData = await response.json();
        setUsers(usersData);
      } catch (err) {
        console.error('🔴 Fetch users error:', err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [setUsers]);

  // ========================================
  // NAVIGATE BASED ON ROLE
  // ========================================
  const navigateByRole = (role) => {
    const r = role?.toLowerCase();
    const hierarchyRoles = ['zonal manager', 'region head', 'area manager', 'cluster manager', 'operation head', 'senior manager placement'];
    if (r === 'national head' || r === 'national head placement') { navigate('/national-head'); return; }
    if (r === 'admin') { navigate('/admin'); return; }
    if (r === 'audit user') { navigate('/admin'); return; }
    if (r === 'center user') { navigate('/center-dashboard'); return; }
    if (r === 'placement coordinator') { navigate('/placement-dashboard'); return; }
    if (hierarchyRoles.includes(r)) { navigate('/hierarchy-dashboard'); return; }
    navigate('/user-dashboard');
  };

  // ========================================
  // LOGIN HANDLER
  // ========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Save token
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }
        localStorage.setItem('loggedUser', JSON.stringify(data.user));

        // ── CHECK: Force password change required? ──
        if (data.forcePasswordChange || data.passwordExpired) {
          setPendingUserData(data.user);
          setForceUsername(data.user.username);
          setForceCurrentPwd(password); // pre-fill current password
          setForceReason(data.passwordExpired ? 'expired' : 'first_login');
          setShowForceChange(true);
          return;
        }

        // Normal login - navigate
        navigateByRole(data.user.Role);
        return;
      }

      setError(data.error || 'Invalid username or password!');
    } catch (err) {
      console.error('⚠️ API login failed:', err);
      setError('Unable to connect to server. Please try again.');
    }
  };

  // ========================================
  // FORCE CHANGE PASSWORD HANDLER
  // ========================================
  const handleForceChangePassword = async (e) => {
    e.preventDefault();
    setForceError('');
    setForceMessage('');

    if (forceNewPwd !== forceConfirmPwd) {
      setForceError('New passwords do not match!');
      return;
    }

    const policyErrors = validatePassword(forceNewPwd);
    if (policyErrors.length > 0) {
      setForceError('Password must have: ' + policyErrors.join(', '));
      return;
    }

    if (forceCurrentPwd === forceNewPwd) {
      setForceError('New password must be different from current password!');
      return;
    }

    setForceLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/change-password`, {
        username: forceUsername,
        currentPassword: forceCurrentPwd,
        newPassword: forceNewPwd
      });

      if (response.data.success) {
        setForceMessage('✅ Password changed successfully! Redirecting...');
        setTimeout(() => {
          setShowForceChange(false);
          if (pendingUserData) {
            navigateByRole(pendingUserData.Role);
          }
        }, 1500);
      }
    } catch (err) {
      setForceError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setForceLoading(false);
    }
  };

  // ========================================
  // FORGOT PASSWORD HANDLERS
  // ========================================
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/forgot-password/send-otp`, {
        email: forgotEmail
      });
      if (response.data.success) {
        setForgotMessage(response.data.message);
        setForgotStep(2);
        if (response.data.devOtp) console.log('🔑 Dev OTP:', response.data.devOtp);
      }
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/forgot-password/verify-otp`, {
        email: forgotEmail,
        otp: otp
      });
      if (response.data.success) {
        setForgotMessage('OTP verified successfully!');
        setForgotStep(3);
      }
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match!');
      return;
    }

    const policyErrors = validatePassword(newPassword);
    if (policyErrors.length > 0) {
      setForgotError('Password must have: ' + policyErrors.join(', '));
      return;
    }

    setForgotLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/forgot-password/reset-password`, {
        email: forgotEmail,
        newPassword: newPassword
      });
      if (response.data.success) {
        setForgotMessage('Password reset successfully! You can now login.');
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotStep(1);
          setForgotEmail('');
          setOtp('');
          setNewPassword('');
          setConfirmPassword('');
        }, 2000);
      }
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotStep(1);
    setForgotEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotMessage('');
  };

  // ========================================
  // RENDER
  // ========================================
  if (loading) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>Loading...</h2>
          <p>Please wait while we connect to the server.</p>
        </div>
      </div>
    );
  }

  // ── FORCE PASSWORD CHANGE SCREEN ──
  if (showForceChange) {
    const strength = getPasswordStrength(forceNewPwd);
    const policyErrors = forceNewPwd ? validatePassword(forceNewPwd) : [];

    return (
      <div className="login-container">
        <div className="login-box">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
            <img src="/NIIT Foundation Logo PNG.png" alt="NIIT Foundation" style={{ height: '55px', objectFit: 'contain', marginBottom: '10px' }} />
            <h2 style={{ marginBottom: 0 }}>
              {forceReason === 'expired' ? '⏰ Password Expired' : '🔐 Set New Password'}
            </h2>
          </div>

          <div style={{ background: forceReason === 'expired' ? '#fff3cd' : '#e3f2fd', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', borderLeft: `4px solid ${forceReason === 'expired' ? '#ff9800' : '#2196f3'}` }}>
            <p style={{ color: forceReason === 'expired' ? '#856404' : '#1565c0', fontSize: '14px', textAlign: 'center', margin: 0 }}>
              {forceReason === 'expired'
                ? '⚠️ Your password has expired (30 days). Please set a new password to continue.'
                : '👋 Welcome! For security, please set a new password before continuing.'}
            </p>
          </div>

          <form onSubmit={handleForceChangePassword}>
            <div className="input-group">
              <label>🔑 Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showForceCurrent ? 'text' : 'password'}
                  value={forceCurrentPwd}
                  onChange={(e) => setForceCurrentPwd(e.target.value)}
                  placeholder="Enter current password"
                  required
                  style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                />
                <span onClick={() => setShowForceCurrent(!showForceCurrent)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '18px', color: '#666' }}>
                  {showForceCurrent ? '🙈' : '👁️'}
                </span>
              </div>
            </div>

            <div className="input-group">
              <label>🔐 New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showForceNew ? 'text' : 'password'}
                  value={forceNewPwd}
                  onChange={(e) => setForceNewPwd(e.target.value)}
                  placeholder="Enter new password"
                  required
                  style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                />
                <span onClick={() => setShowForceNew(!showForceNew)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '18px', color: '#666' }}>
                  {showForceNew ? '🙈' : '👁️'}
                </span>
              </div>

              {/* Password Strength Bar */}
              {forceNewPwd && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'all 0.3s ease', borderRadius: '3px' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: strength.color, marginTop: '4px', fontWeight: '600' }}>{strength.label}</div>
                </div>
              )}

              {/* Policy Checklist */}
              {forceNewPwd && (
                <div style={{ marginTop: '10px', background: '#f8f9fa', borderRadius: '8px', padding: '10px 14px' }}>
                  {[
                    { check: forceNewPwd.length >= 8, text: 'At least 8 characters' },
                    { check: /[A-Z]/.test(forceNewPwd), text: 'Uppercase letter (A-Z)' },
                    { check: /[a-z]/.test(forceNewPwd), text: 'Lowercase letter (a-z)' },
                    { check: /[0-9]/.test(forceNewPwd), text: 'Number (0-9)' },
                    { check: /[@$!%*?&#^()_+\-=\[\]{}|;:,.<>]/.test(forceNewPwd), text: 'Special character (@$!%*?& etc)' },
                  ].map((item, i) => (
                    <div key={i} style={{ fontSize: '12px', color: item.check ? '#4caf50' : '#f44336', marginBottom: '3px' }}>
                      {item.check ? '✅' : '❌'} {item.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="input-group">
              <label>✅ Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showForceConfirm ? 'text' : 'password'}
                  value={forceConfirmPwd}
                  onChange={(e) => setForceConfirmPwd(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box',
                    borderColor: forceConfirmPwd ? (forceConfirmPwd === forceNewPwd ? '#4caf50' : '#f44336') : undefined }}
                />
                <span onClick={() => setShowForceConfirm(!showForceConfirm)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '18px', color: '#666' }}>
                  {showForceConfirm ? '🙈' : '👁️'}
                </span>
              </div>
              {forceConfirmPwd && forceConfirmPwd !== forceNewPwd && (
                <div style={{ fontSize: '12px', color: '#f44336', marginTop: '4px' }}>❌ Passwords do not match</div>
              )}
              {forceConfirmPwd && forceConfirmPwd === forceNewPwd && (
                <div style={{ fontSize: '12px', color: '#4caf50', marginTop: '4px' }}>✅ Passwords match</div>
              )}
            </div>

            {forceError && <p className="error-message">{forceError}</p>}
            {forceMessage && <p className="success-message">{forceMessage}</p>}

            <button type="submit" className="login-btn" disabled={forceLoading || policyErrors.length > 0}>
              {forceLoading ? '⏳ Changing...' : '🔐 Set New Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        {!showForgotPassword ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
              <img src="/NIIT Foundation Logo PNG.png" alt="NIIT Foundation" style={{ height: '70px', objectFit: 'contain', marginBottom: '12px' }} />
              <h2 style={{ marginBottom: 0 }}>Audit Management System</h2>
            </div>
            <p className="subtitle">Login to continue</p>
            
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              
              <div className="input-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '18px', userSelect: 'none', color: '#666' }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </span>
                </div>
              </div>
              
              {error && <p className="error-message">{error}</p>}
              
              <button type="submit" className="login-btn">
                Login
              </button>
            </form>
            
            <p className="forgot-link" onClick={() => setShowForgotPassword(true)}>
              Forgot Password?
            </p>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
              <img src="/NIIT Foundation Logo PNG.png" alt="NIIT Foundation" style={{ height: '55px', objectFit: 'contain', marginBottom: '10px' }} />
              <h2 style={{ marginBottom: 0 }}>Reset Password</h2>
            </div>
            
            {forgotStep === 1 && (
              <form onSubmit={handleSendOTP}>
                <p className="subtitle">Enter your email to receive OTP</p>
                <div className="input-group">
                  <label>Email</label>
                  <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="Enter your email" required />
                </div>
                {forgotError && <p className="error-message">{forgotError}</p>}
                {forgotMessage && <p className="success-message">{forgotMessage}</p>}
                <button type="submit" className="login-btn" disabled={forgotLoading}>
                  {forgotLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOTP}>
                <p className="subtitle">Enter the OTP sent to {forgotEmail}</p>
                <div className="input-group">
                  <label>OTP</label>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" maxLength={6} className="otp-input" required />
                </div>
                {forgotError && <p className="error-message">{forgotError}</p>}
                {forgotMessage && <p className="success-message">{forgotMessage}</p>}
                <button type="submit" className="login-btn" disabled={forgotLoading}>
                  {forgotLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword}>
                <p className="subtitle">Enter your new password</p>
                
                <div className="input-group">
                  <label>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <span onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '18px', color: '#666' }}>
                      {showNewPassword ? '🙈' : '👁️'}
                    </span>
                  </div>

                  {/* Policy Checklist */}
                  {newPassword && (
                    <div style={{ marginTop: '10px', background: '#f8f9fa', borderRadius: '8px', padding: '10px 14px' }}>
                      {[
                        { check: newPassword.length >= 8, text: 'At least 8 characters' },
                        { check: /[A-Z]/.test(newPassword), text: 'Uppercase letter' },
                        { check: /[a-z]/.test(newPassword), text: 'Lowercase letter' },
                        { check: /[0-9]/.test(newPassword), text: 'Number' },
                        { check: /[@$!%*?&#^()_+\-=\[\]{}|;:,.<>]/.test(newPassword), text: 'Special character' },
                      ].map((item, i) => (
                        <div key={i} style={{ fontSize: '12px', color: item.check ? '#4caf50' : '#f44336', marginBottom: '3px' }}>
                          {item.check ? '✅' : '❌'} {item.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <span onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '18px', color: '#666' }}>
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </span>
                  </div>
                </div>
                
                {forgotError && <p className="error-message">{forgotError}</p>}
                {forgotMessage && <p className="success-message">{forgotMessage}</p>}
                
                <button type="submit" className="login-btn" disabled={forgotLoading || validatePassword(newPassword).length > 0}>
                  {forgotLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
            
            <p className="forgot-link" onClick={resetForgotPassword}>← Back to Login</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;