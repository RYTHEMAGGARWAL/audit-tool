import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as ExcelJS from 'exceljs';
import { useUsers } from '../contexts/UsersContext';
import axios from 'axios';
import { API_URL } from '../config';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { setUsers, users } = useUsers();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Helper to get cell value
  const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return '';
    if (typeof cell.value === 'object') {
      if (cell.value.text) return cell.value.text.toString().trim();
      if (cell.value.richText) return cell.value.richText.map(rt => rt.text).join('').trim();
      return '';
    }
    return cell.value.toString().trim();
  };

  useEffect(() => {
    const fetchExcelData = async () => {
      try {
        setLoading(true);
        console.log('\n🔵 ========== LOGIN: LOADING USERS ==========');
        
        const timestamp = Date.now();
        const url = `${API_URL}/api/users.xlsx?t=${timestamp}`;
        console.log('🔵 Fetching from:', url);
        
        const response = await fetch(url);
        console.log('🔵 Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const buffer = await response.arrayBuffer();
        console.log('🔵 Buffer size:', buffer.byteLength, 'bytes');
        
        if (buffer.byteLength === 0) {
          throw new Error('Empty file');
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        
        const jsonData = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber > 1) {
            const user = {
              username: getCellValue(row.getCell(1)),
              password: getCellValue(row.getCell(2)),
              firstname: getCellValue(row.getCell(3)),
              lastname: getCellValue(row.getCell(4)),
              email: getCellValue(row.getCell(5)),
              mobile: getCellValue(row.getCell(6)),
              Role: getCellValue(row.getCell(7))
            };
            
            if (user.username) {
              jsonData.push(user);
              console.log('🔵 Loaded user:', user.username, '| Password:', user.password, '| Role:', user.Role);
            }
          }
        });
        
        console.log('🟢 Total users loaded:', jsonData.length);
        console.log('🟢 Users:', jsonData.map(u => u.username).join(', '));
        
        setUsers(jsonData);
        console.log('🟢 ========================================\n');
        
      } catch (err) {
        console.error('🔴 Excel load error:', err);
        console.error('🔴 Using fallback users');
        
        // Fallback users
        const fallbackUsers = [
          { username: 'admin', password: '123', firstname: 'Admin', lastname: 'User', email: 'admin@niit.com', mobile: '1234567890', Role: 'Admin' },
          { username: 'user1', password: 'pass1', firstname: 'John', lastname: 'Doe', email: 'john@niit.com', mobile: '0987654321', Role: 'User' }
        ];
        setUsers(fallbackUsers);
        console.log('🟡 Fallback users loaded');
      } finally {
        setLoading(false);
      }
    };

    fetchExcelData();
  }, [setUsers]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (loading) {
      setError('Loading users... Please wait.');
      return;
    }
    
    setError('');
    
    console.log('\n🔍 ========== LOGIN ATTEMPT ==========');
    console.log('🔍 Trying to login with:');
    console.log('🔍   Username:', username);
    console.log('🔍   Password:', password);
    console.log('🔍 Available users:', users.length);
    
    // Find user
    const user = users.find(u => {
      const usernameMatch = u.username.toLowerCase() === username.toLowerCase();
      const passwordMatch = u.password === password;
      
      console.log(`🔍 Checking: ${u.username}`);
      console.log(`🔍   Username match: ${usernameMatch}`);
      console.log(`🔍   Password match: ${passwordMatch}`);
      
      return usernameMatch && passwordMatch;
    });
    
    if (user) {
      console.log('✅ Login successful!');
      console.log('✅ User:', user.username, '| Role:', user.Role);
      console.log('✅ ====================================\n');
      
      localStorage.setItem('loggedUser', JSON.stringify(user));
      
      // Both Admin and User go to /admin route
      // Admin will see: User Management + Audit
      // User will see: Only Audit
      if (user.Role === 'Admin' || user.Role === 'User') {
        navigate('/admin');
      } else {
        alert('Invalid user role! Please contact administrator.');
      }
    } else {
      console.log('❌ Login failed!');
      console.log('❌ No matching user found');
      console.log('❌ ====================================\n');
      setError('Invalid username or password!');
    }
  };

  const handleReset = () => {
    setUsername('');
    setPassword('');
    setError('');
  };

  // ========================================
  // FORGOT PASSWORD HANDLERS
  // ========================================

  const handleForgotPasswordClick = () => {
    setShowForgotPassword(true);
    setForgotStep(1);
    setForgotEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotMessage('');
    setForgotError('');
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setForgotStep(1);
    setForgotEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotMessage('');
    setForgotError('');
  };

  // Step 1: Send OTP to Email
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    
    if (!forgotEmail) {
      setForgotError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setForgotError('Please enter a valid email address');
      return;
    }

    try {
      setForgotLoading(true);
      console.log('📧 Sending OTP to:', forgotEmail);

      const response = await axios.post('${API_URL}/api/forgot-password/send-otp', {
        email: forgotEmail
      });

      if (response.data.success) {
        setForgotMessage(response.data.message);
        setForgotStep(2);
        
        // If devOtp is present (for development), show it
        if (response.data.devOtp) {
          console.log('🔐 DEV OTP:', response.data.devOtp);
          alert(`Development Mode - OTP: ${response.data.devOtp}`);
        }
      }
      
    } catch (err) {
      console.error('❌ Send OTP error:', err);
      setForgotError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    
    if (!otp) {
      setForgotError('Please enter the OTP');
      return;
    }

    if (otp.length !== 6) {
      setForgotError('OTP must be 6 digits');
      return;
    }

    try {
      setForgotLoading(true);
      console.log('🔍 Verifying OTP:', otp);

      const response = await axios.post('${API_URL}/api/forgot-password/verify-otp', {
        email: forgotEmail,
        otp: otp
      });

      if (response.data.success) {
        setForgotMessage('OTP verified! Now set your new password.');
        setForgotStep(3);
      }
      
    } catch (err) {
      console.error('❌ Verify OTP error:', err);
      setForgotError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    
    if (!newPassword || !confirmPassword) {
      setForgotError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    try {
      setForgotLoading(true);
      console.log('🔄 Resetting password...');

      const response = await axios.post('${API_URL}/api/forgot-password/reset-password', {
        email: forgotEmail,
        otp: otp,
        newPassword: newPassword
      });

      if (response.data.success) {
        setForgotMessage('✅ ' + response.data.message);
        
        // Reload users to get updated password
        const timestamp = Date.now();
        const url = `${API_URL}/api/users.xlsx?t=${timestamp}`;
        const usersResponse = await fetch(url);
        const buffer = await usersResponse.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        
        const jsonData = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber > 1) {
            const user = {
              username: getCellValue(row.getCell(1)),
              password: getCellValue(row.getCell(2)),
              firstname: getCellValue(row.getCell(3)),
              lastname: getCellValue(row.getCell(4)),
              email: getCellValue(row.getCell(5)),
              mobile: getCellValue(row.getCell(6)),
              Role: getCellValue(row.getCell(7))
            };
            if (user.username) jsonData.push(user);
          }
        });
        setUsers(jsonData);
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          handleBackToLogin();
        }, 2000);
      }
      
    } catch (err) {
      console.error('❌ Reset password error:', err);
      setForgotError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="login-container">
        <p>⏳ Loading user data...</p>
      </div>
    );
  }

  // ========================================
  // FORGOT PASSWORD UI
  // ========================================
  if (showForgotPassword) {
    return (
      <div className="login-container">
        <div className="login-form forgot-password-form">
          <h1>🔐 Reset Password</h1>
          
          {/* Step Indicator */}
          <div className="step-indicator">
            <div className={`step ${forgotStep >= 1 ? 'active' : ''}`}>
              <span>1</span>
              <small>Email</small>
            </div>
            <div className={`step ${forgotStep >= 2 ? 'active' : ''}`}>
              <span>2</span>
              <small>OTP</small>
            </div>
            <div className={`step ${forgotStep >= 3 ? 'active' : ''}`}>
              <span>3</span>
              <small>New Password</small>
            </div>
          </div>

          {/* Step 1: Enter Email */}
          {forgotStep === 1 && (
            <form onSubmit={handleSendOTP} autoComplete="off">
              <p className="forgot-instruction">
                Enter your registered email address to receive an OTP for password reset.
              </p>
              <div className="input-group">
                <label htmlFor="forgot-email">📧 Email Address</label>
                <input
                  type="email"
                  id="forgot-email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  required
                  autoComplete="off"
                />
              </div>
              {forgotError && <p className="error">{forgotError}</p>}
              {forgotMessage && <p className="success">{forgotMessage}</p>}
              <div className="button-group">
                <button 
                  type="submit" 
                  className="btn submit" 
                  disabled={forgotLoading}
                >
                  {forgotLoading ? '⏳ Sending...' : '📨 Send OTP'}
                </button>
                <button 
                  type="button" 
                  className="btn reset" 
                  onClick={handleBackToLogin}
                >
                  ⬅️ Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Enter OTP */}
          {forgotStep === 2 && (
            <form onSubmit={handleVerifyOTP} autoComplete="off">
              <p className="forgot-instruction">
                Enter the 6-digit OTP sent to <strong>{forgotEmail}</strong>
              </p>
              <div className="input-group">
                <label htmlFor="otp">🔢 Enter OTP</label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength="6"
                  required
                  autoComplete="off"
                  className="otp-input"
                />
              </div>
              {forgotError && <p className="error">{forgotError}</p>}
              {forgotMessage && <p className="success">{forgotMessage}</p>}
              <div className="button-group">
                <button 
                  type="submit" 
                  className="btn submit" 
                  disabled={forgotLoading}
                >
                  {forgotLoading ? '⏳ Verifying...' : '✅ Verify OTP'}
                </button>
                <button 
                  type="button" 
                  className="btn forgot" 
                  onClick={() => setForgotStep(1)}
                >
                  🔄 Resend OTP
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Set New Password */}
          {forgotStep === 3 && (
            <form onSubmit={handleResetPassword} autoComplete="off">
              <p className="forgot-instruction">
                Create a strong new password for your account
              </p>
              <div className="input-group">
                <label htmlFor="new-password">🔒 New Password</label>
                <input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  autoComplete="off"
                />
                <small>Minimum 6 characters</small>
              </div>
              <div className="input-group">
                <label htmlFor="confirm-password">🔒 Confirm Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  autoComplete="off"
                />
              </div>
              {forgotError && <p className="error">{forgotError}</p>}
              {forgotMessage && <p className="success">{forgotMessage}</p>}
              <div className="button-group">
                <button 
                  type="submit" 
                  className="btn submit" 
                  disabled={forgotLoading}
                >
                  {forgotLoading ? '⏳ Resetting...' : '🔄 Reset Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ========================================
  // NORMAL LOGIN UI
  // ========================================
  return (
    <div className="login-container">
      <div className="login-form">
        <h1>Welcome NIIT</h1>
        
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="off"
            />
          </div>  
          {error && <p className="error">{error}</p>}
          <div className="button-group">
            <button type="submit" className="btn submit">Submit</button>
            <button type="button" className="btn reset" onClick={handleReset}>Reset</button>
            <button type="button" className="btn forgot" onClick={handleForgotPasswordClick}>
              Forgot Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;