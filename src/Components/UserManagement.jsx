import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUsers } from '../contexts/UsersContext';
import { API_URL } from '../config';
import './UserManagement.css';

const UserManagement = ({ auditUserMode = false, createdBy = '' }) => {
  const { users: globalUsers, setUsers: setGlobalUsers } = useUsers();
  const [activeOption, setActiveOption] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', centerCode: '', Role: 'Audit User' });
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', centerCode: '', Role: 'Audit User', replaceOldName: '' });
  const [tableUsers, setTableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ message: '', color: '' });
  const [validationErrors, setValidationErrors] = useState({});
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState(new Set());
  const [message, setMessage] = useState({ text: '', type: '' });
  const [viewSearch, setViewSearch] = useState('');
  const [modifySearch, setModifySearch] = useState('');
  const [centers, setCenters] = useState([]);

  // Load centers
  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    try {
      console.log('🏢 Loading centers from API...');
      const response = await fetch(`${API_URL}/api/centers`);
      if (response.ok) {
        const centersData = await response.json();
        console.log('✅ Centers loaded:', centersData.length, 'centers');
        console.log('📋 Center codes:', centersData.map(c => c.centerCode).join(', '));
        setCenters(centersData);
      } else {
        console.error('❌ Failed to load centers, status:', response.status);
      }
    } catch (err) {
      console.error('❌ Error loading centers:', err);
    }
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const checkPasswordStrength = (password) => {
    if (!password) return { message: '', color: '' };
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) s++;
    if (s <= 2) return { message: '❌ Weak', color: '#f44336' };
    if (s === 3) return { message: '⚠️ Medium', color: '#ff9800' };
    if (s === 4) return { message: '✅ Strong', color: '#4caf50' };
    return { message: '✅ Very Strong', color: '#2196f3' };
  };

  const loadUsersData = async () => {
    try {
      setLoading(true);
      console.log('👥 Loading users from API...');
      const response = await fetch(`${API_URL}/api/users`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const usersData = await response.json();
      console.log('✅ Users loaded:', usersData.length, 'users');
      
      // Debug: Show which users have center codes
      const centerUsers = usersData.filter(u => u.Role === 'Center User');
      console.log('🏢 Center Users:', centerUsers.length);
      centerUsers.forEach(u => {
        console.log(`   ${u.username}: centerCode="${u.centerCode || 'EMPTY'}"`);
      });
      
      setTableUsers([...usersData]);
      setGlobalUsers([...usersData]);
    } catch (err) {
      console.error('❌ Failed to load users:', err);
      showMessage('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsersData(); }, []);

  const resetForm = () => {
    console.log('🔄 Form reset');
    setNewUserForm({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', centerCode: '', Role: 'Audit User', replaceOldName: '' });
    setPasswordStrength({ message: '', color: '' });
    setValidationErrors({});
  };

  const validateForm = () => {
    console.log('\n🔍 ========== VALIDATION CHECK ==========');
    console.log('Form data:', {
      username: newUserForm.username,
      Role: newUserForm.Role,
      centerCode: newUserForm.centerCode
    });
    
    const errors = {};
    if (!newUserForm.username?.trim()) errors.username = 'Required';
    else if (newUserForm.username.length < 3) errors.username = 'Min 3 characters';
    if (!newUserForm.password?.trim()) errors.password = 'Required';
    else if (newUserForm.password.length < 4) errors.password = 'Min 4 characters';
    if (!newUserForm.firstname?.trim()) errors.firstname = 'Required';
    if (!newUserForm.lastname?.trim()) errors.lastname = 'Required';
    if (!newUserForm.email?.trim()) errors.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserForm.email)) errors.email = 'Invalid email';
    if (!newUserForm.mobile?.trim()) errors.mobile = 'Required';
    else if (!/^[0-9]{10}$/.test(newUserForm.mobile)) errors.mobile = '10 digits required';
    
    // Validate center code for Center User
    if (newUserForm.Role === 'Center User') {
      console.log('🏢 Center User detected - checking centerCode...');
      console.log('   centerCode value:', `"${newUserForm.centerCode}"`);
      
      if (!newUserForm.centerCode?.trim()) {
        console.log('❌ Center Code is EMPTY!');
        errors.centerCode = 'Center Code required for Center User';
      } else {
        console.log('✅ Center Code is present:', newUserForm.centerCode);
      }
    }
    
    setValidationErrors(errors);
    console.log('Validation errors:', errors);
    console.log('Validation result:', Object.keys(errors).length === 0 ? '✅ PASS' : '❌ FAIL');
    console.log('========================================\n');
    
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    console.log('\n🚀 ========== CREATE USER STARTED ==========');
    
    if (!validateForm()) {
      console.log('❌ Validation failed, stopping create');
      return showMessage('Fix validation errors', 'error');
    }
    
    if (globalUsers.some(u => u.username?.toLowerCase() === newUserForm.username?.toLowerCase())) {
      console.log('❌ Username already exists');
      return showMessage('Username already exists!', 'error');
    }
    
    try {
      setLoading(true);
      
      const userData = { 
        ...newUserForm, 
        username: newUserForm.username.toLowerCase(), 
        email: newUserForm.email?.toLowerCase() || '',
        centerCode: newUserForm.centerCode?.toUpperCase() || ''
      };
      
      console.log('📤 Sending data to backend:', {
        username: userData.username,
        Role: userData.Role,
        centerCode: userData.centerCode,
        email: userData.email
      });
      
      console.log('🌐 API URL:', `${API_URL}/api/users`);
      
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      console.log('📥 Response status:', res.status);
      
      if (res.ok) {
        const result = await res.json();
        console.log('✅ User created successfully!');
        console.log('📋 Created user data:', {
          username: result.user?.username,
          Role: result.user?.role || result.user?.Role,
          centerCode: result.user?.centerCode
        });
        
        showMessage('✅ User created successfully!', 'success');

        // Bulk replace old name if hierarchy role and replaceOldName provided
        const hierarchyRoles = ['Zonal Manager', 'Region Head', 'Area Manager', 'Cluster Manager', 'Placement Coordinator', 'Senior Manager Placement', 'National Head Placement'];
        if (hierarchyRoles.includes(newUserForm.Role) && newUserForm.replaceOldName?.trim()) {
          try {
            const newFullName = `${newUserForm.firstname} ${newUserForm.lastname}`.trim();
            const replaceRes = await fetch(`${API_URL}/api/bulk-replace-hierarchy-name`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                role: newUserForm.Role,
                oldName: newUserForm.replaceOldName.trim(),
                newName: newFullName
              })
            });
            const replaceData = await replaceRes.json();
            if (replaceData.success) {
              showMessage(`✅ User created! ${replaceData.message}`, 'success');
            } else {
              showMessage('✅ User created! (Name replace failed: ' + replaceData.error + ')', 'warning');
            }
          } catch (replaceErr) {
            console.error('Bulk replace error:', replaceErr);
            showMessage('✅ User created! (Name replace failed)', 'warning');
          }
        }

        resetForm();
        await loadUsersData();
      } else {
        const error = await res.json();
        console.log('❌ Create failed:', error);
        showMessage(`❌ ${error.error}`, 'error');
      }
    } catch (err) {
      console.error('❌ Exception during create:', err);
      showMessage(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
      console.log('========================================\n');
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    
    console.log('\n🔄 ========== UPDATE USER STARTED ==========');
    console.log('Updating user:', selectedUser);
    console.log('Form data:', {
      Role: editForm.Role,
      centerCode: editForm.centerCode
    });
    
    // Validate center code for Center User in edit
    if (editForm.Role === 'Center User' && !editForm.centerCode?.trim()) {
      console.log('❌ Center Code missing for Center User');
      return showMessage('Center Code required for Center User', 'error');
    }
    
    try {
      setLoading(true);
      const user = globalUsers.find(u => u.username === selectedUser);
      
      if (user?._id) {
        const updateData = {
          ...editForm,
          centerCode: editForm.centerCode?.toUpperCase() || ''
        };
        
        console.log('📤 Sending update to backend:', {
          userId: user._id,
          Role: updateData.Role,
          centerCode: updateData.centerCode,
          auditUserMode: auditUserMode,
          modifiedByRole: auditUserMode ? 'Audit User' : 'Admin'
        });
        
        const res = await fetch(`${API_URL}/api/users/${user._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...updateData,
            modifiedByRole: auditUserMode ? 'Audit User' : 'Admin',
            modifiedBy: auditUserMode ? createdBy : 'Admin'
          })
        });
        
        console.log('📥 Response status:', res.status);
        
        if (res.ok) {
          const result = await res.json();
          console.log('✅ User update request sent!');
          
          if (result.pendingApproval) {
            showMessage('✅ Modify request submitted! Waiting for Admin approval.', 'success');
          } else {
            showMessage('✅ Updated!', 'success');
          }
          await loadUsersData();
        } else {
          console.log('❌ Update failed');
        }
      }
      
      setSelectedUser(null);
      setEditForm({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', centerCode: '', Role: 'Audit User' });
    } catch (err) {
      console.error('❌ Exception during update:', err);
      showMessage(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
      console.log('========================================\n');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser || !window.confirm(`Delete "${selectedUser}"?`)) return;
    try {
      setLoading(true);
      const user = globalUsers.find(u => u.username === selectedUser);
      if (user?._id) {
        const res = await fetch(`${API_URL}/api/users/${user._id}`, { method: 'DELETE' });
        if (res.ok) {
          showMessage('✅ Deleted!', 'success');
          await loadUsersData();
        }
      }
      setSelectedUser(null);
      setEditForm({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', centerCode: '', Role: 'Audit User' });
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (e) => {
    const username = e.target.value;
    if (!username) {
      setSelectedUser(null);
      setEditForm({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', centerCode: '', Role: 'Audit User' });
      return;
    }
    setSelectedUser(username);
    const user = globalUsers.find(u => u.username === username);
    if (user) {
      console.log('👤 Selected user:', {
        username: user.username,
        Role: user.Role,
        centerCode: user.centerCode || 'EMPTY'
      });
      
      setEditForm({
        username: user.username || '',
        password: user.password || '',
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        email: user.email || '',
        mobile: user.mobile || '',
        centerCode: user.centerCode || '',
        Role: user.Role || 'User'
      });
    }
  };

  const togglePwd = (i) => {
    const s = new Set(visiblePasswords);
    s.has(i) ? s.delete(i) : s.add(i);
    setVisiblePasswords(s);
  };

  // Debug: Log when center code changes
  useEffect(() => {
    if (newUserForm.Role === 'Center User') {
      console.log('🏢 Center Code changed:', `"${newUserForm.centerCode}"`);
    }
  }, [newUserForm.centerCode]);

  return (
    <div className="management-section">
      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
      
      <h2>👥 User Management</h2>
      
      <div className="status-bar">
        <span>📊 Total Users: {globalUsers.length}</span>
        <button onClick={async () => { await loadUsersData(); showMessage('✅ Refreshed!', 'success'); }} disabled={loading}>
          {loading ? '⏳' : '🔄 Refresh'}
        </button>
      </div>

      <div className="options">
        <button className={activeOption === 'create' ? 'active' : ''} onClick={() => { resetForm(); setActiveOption('create'); }}>
          ➕ Create User
        </button>
        <button className={activeOption === 'view' ? 'active' : ''} onClick={async () => { await loadUsersData(); setActiveOption('view'); }}>
          👁️ View User
        </button>
        <button className={activeOption === 'modify' ? 'active' : ''} onClick={async () => { await loadUsersData(); setActiveOption('modify'); setSelectedUser(null); }}>
          ✏️ Modify User
        </button>
      </div>

      {/* CREATE USER */}
      {activeOption === 'create' && (
        <div className="create-user">
          <h3>➕ Create New User</h3>
          
          <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className="info-box">
              <span>📋 Required fields marked with *</span>
            </div>

            <div className="field-box">
              <label>👤 Username *</label>
              <input 
                name="create_username_field"
                autoComplete="off"
                type="text" 
                placeholder="Enter username (min 3 characters)" 
                value={newUserForm.username} 
                onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                className={validationErrors.username ? 'error' : ''}
              />
              {validationErrors.username && <div className="error-text">{validationErrors.username}</div>}
            </div>

            <div className="field-box">
              <label>🔐 Password *</label>
              <div className="password-wrapper">
                <input 
                  name="create_password_field"
                  autoComplete="new-password"
                  type={showCreatePassword ? 'text' : 'password'} 
                  placeholder="Enter password (min 4 characters)" 
                  value={newUserForm.password} 
                  onChange={(e) => { 
                    setNewUserForm({...newUserForm, password: e.target.value}); 
                    setPasswordStrength(checkPasswordStrength(e.target.value)); 
                  }}
                  className={validationErrors.password ? 'error' : ''}
                />
                <button type="button" className="password-toggle" onClick={() => setShowCreatePassword(!showCreatePassword)}>
                  {showCreatePassword ? '🙈' : '👁️'}
                </button>
              </div>
              {passwordStrength.message && <div className="helper-text" style={{ color: passwordStrength.color }}>{passwordStrength.message}</div>}
              {validationErrors.password && <div className="error-text">{validationErrors.password}</div>}
            </div>

            <div className="field-box">
              <label>📝 First Name *</label>
              <input 
                autoComplete="off"
                type="text" 
                placeholder="Enter first name" 
                value={newUserForm.firstname} 
                onChange={(e) => setNewUserForm({...newUserForm, firstname: e.target.value})}
                className={validationErrors.firstname ? 'error' : ''}
              />
              {validationErrors.firstname && <div className="error-text">{validationErrors.firstname}</div>}
            </div>

            <div className="field-box">
              <label>📝 Last Name *</label>
              <input 
                autoComplete="off"
                type="text" 
                placeholder="Enter last name" 
                value={newUserForm.lastname} 
                onChange={(e) => setNewUserForm({...newUserForm, lastname: e.target.value})}
                className={validationErrors.lastname ? 'error' : ''}
              />
              {validationErrors.lastname && <div className="error-text">{validationErrors.lastname}</div>}
            </div>

            <div className="field-box">
              <label>📧 Email *</label>
              <input 
                autoComplete="off"
                type="email" 
                placeholder="Enter email" 
                value={newUserForm.email} 
                onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                className={validationErrors.email ? 'error' : ''}
              />
              {validationErrors.email && <div className="error-text">{validationErrors.email}</div>}
            </div>

            <div className="field-box">
              <label>📱 Mobile *</label>
              <input 
                autoComplete="off"
                type="text" 
                placeholder="Enter 10 digit mobile" 
                value={newUserForm.mobile} 
                onChange={(e) => setNewUserForm({...newUserForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                maxLength="10"
                className={validationErrors.mobile ? 'error' : ''}
              />
              {newUserForm.mobile && <div className="helper-text" style={{ color: newUserForm.mobile.length === 10 ? '#4caf50' : '#ff9800' }}>{newUserForm.mobile.length}/10 digits</div>}
              {validationErrors.mobile && <div className="error-text">{validationErrors.mobile}</div>}
            </div>

            <div className="field-box">
              <label>👤 Role *</label>
              <select
                value={newUserForm.Role}
                onChange={(e) => {
                  console.log('🔄 Role changed to:', e.target.value);
                  setNewUserForm({...newUserForm, Role: e.target.value});
                  // Clear center code if not Center User
                  if (e.target.value !== 'Center User') {
                    console.log('🗑️ Clearing centerCode (not Center User)');
                    setNewUserForm(prev => ({...prev, centerCode: ''}));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  backgroundColor: 'white'
                }}
              >
                <option value="Audit User">Audit User</option>
                <option value="Center User">Center User</option>
                <option value="Zonal Manager">Zonal Manager</option>
                <option value="Region Head">Region Head</option>
                <option value="Area Manager">Area Manager</option>
                <option value="Cluster Manager">Cluster Manager</option>
                <option value="Operation Head">Operation Head</option>
                <option value="Placement Coordinator">Placement Coordinator</option>
                <option value="Senior Manager Placement">Senior Manager Placement</option>
                <option value="National Head Placement">National Head Placement</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {/* Center Code Field - Only for Center User */}
            {newUserForm.Role === 'Center User' && (
              <div className="field-box">
                <label>🏢 Center Code *</label>
                <select
                  value={newUserForm.centerCode}
                  onChange={(e) => {
                    console.log('🏢 Center Code selected:', e.target.value);
                    setNewUserForm({...newUserForm, centerCode: e.target.value});
                  }}
                  className={validationErrors.centerCode ? 'error' : ''}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: validationErrors.centerCode ? '2px solid #f44336' : '2px solid #4caf50',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    backgroundColor: '#f0fdf4'
                  }}
                >
                  <option value="">Select Center Code *</option>
                  {centers.map(center => (
                    <option key={center.centerCode} value={center.centerCode}>
                      {center.centerCode} - {center.centerName}
                    </option>
                  ))}
                </select>
                {validationErrors.centerCode && <div className="error-text">{validationErrors.centerCode}</div>}
                <div className="helper-text" style={{ color: '#1565c0', marginTop: '8px' }}>
                  ℹ️ Center User will only see reports for: <strong>{newUserForm.centerCode || 'No center selected'}</strong>
                </div>
              </div>
            )}


            {/* Replace Old Name - for hierarchy roles */}
            {['Zonal Manager', 'Region Head', 'Area Manager', 'Cluster Manager', 'Placement Coordinator', 'Senior Manager Placement', 'National Head Placement'].includes(newUserForm.Role) && (
              <div className="field-box" style={{ background: '#fff8e1', border: '2px solid #ffcc02', borderRadius: '10px', padding: '14px' }}>
                <label style={{ color: '#e65100', fontWeight: '700' }}>
                  🔄 Replace Old Name in Centers & Reports <span style={{ fontSize: '12px', fontWeight: '400' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder={`Enter old ${newUserForm.Role} name to replace (e.g. "Shweta")`}
                  value={newUserForm.replaceOldName}
                  onChange={(e) => setNewUserForm({...newUserForm, replaceOldName: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #ffcc02', borderRadius: '8px', fontSize: '14px', marginTop: '6px' }}
                />
                <div style={{ fontSize: '12px', color: '#e65100', marginTop: '6px' }}>
                  ⚠️ Agar koi purana {newUserForm.Role} tha — uska naam yahan daalo. Naye user ka naam ({newUserForm.firstname || '?'}) saare Centers aur Audit Reports mein replace ho jaayega.
                </div>
              </div>
            )}

            <div className="btn-group">
              <button type="button" className="btn-green" onClick={handleCreate} disabled={loading}>
                {loading ? '⏳ Creating...' : '✅ Create User'}
              </button>
              <button type="button" className="btn-gray" onClick={resetForm}>
                🔄 Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW USERS */}
      {activeOption === 'view' && (
        <div className="view-user">
          <h3>👁️ Users List ({auditUserMode ? tableUsers.filter(u => u.Role === 'Center User' || u.role === 'center user').length : tableUsers.length})</h3>

          {/* Search Bar */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by name, username, email, role, center code..."
              value={viewSearch}
              onChange={e => setViewSearch(e.target.value)}
              style={{ width: '100%', padding: '12px 40px 12px 16px', border: '2px solid #667eea', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
            {viewSearch && (
              <button onClick={() => setViewSearch('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#999' }}>
                ✕
              </button>
            )}
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Password</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Center Code</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {tableUsers
                  .filter(u => !auditUserMode || u.Role === 'Center User' || u.role === 'center user')
                  .filter(u => {
                    if (!viewSearch) return true;
                    const q = viewSearch.toLowerCase();
                    return (
                      u.username?.toLowerCase().includes(q) ||
                      u.firstname?.toLowerCase().includes(q) ||
                      u.lastname?.toLowerCase().includes(q) ||
                      u.email?.toLowerCase().includes(q) ||
                      u.mobile?.includes(q) ||
                      u.centerCode?.toLowerCase().includes(q) ||
                      (u.Role || u.role || '').toLowerCase().includes(q)
                    );
                  })
                  .map((u, i) => (
                  <tr key={u._id || i}>
                    <td>{i + 1}</td>
                    <td><span className="username-badge">{u.username}</span></td>
                    <td>
                      <span style={{ fontFamily: 'monospace' }}>{visiblePasswords.has(i) ? u.password : '••••••'}</span>
                      <button onClick={() => togglePwd(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px' }}>
                        {visiblePasswords.has(i) ? '🙈' : '👁️'}
                      </button>
                    </td>
                    <td>{u.firstname}</td>
                    <td>{u.lastname || '-'}</td>
                    <td>{u.email || '-'}</td>
                    <td>{u.mobile || '-'}</td>
                    <td>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: u.centerCode ? '#2196f3' : '#999',
                        background: u.centerCode ? '#e3f2fd' : 'transparent',
                        padding: u.centerCode ? '4px 8px' : '0',
                        borderRadius: u.centerCode ? '4px' : '0'
                      }}>
                        {u.centerCode || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`role-badge ${(u.Role || u.role || '').toLowerCase().replace(/ /g, '-')}`}>
                        {u.Role || u.role || '-'}
                      </span>
                      {(u.approvalStatus === 'pending' || u.modifyApprovalStatus === 'pending') && (
                        <span style={{ marginLeft: '6px', padding: '2px 6px', background: '#fff3cd', color: '#856404', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #ffc107' }}>
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODIFY USER */}
      {activeOption === 'modify' && (
        <div className="modify-user">
          <h3>✏️ Modify User</h3>
          
          <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className="field-box">
              <label>Select User to Modify:</label>
              {/* Search filter for modify dropdown */}
              {/* Search input */}
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Name, username, email ya role type karo..."
                  value={modifySearch}
                  onChange={e => setModifySearch(e.target.value)}
                  style={{ width: '100%', padding: '12px 40px 12px 14px', border: '2px solid #667eea', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f8f9ff' }}
                />
                {modifySearch && (
                  <button onClick={() => setModifySearch('')}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#999' }}>✕</button>
                )}
              </div>

              {/* Filtered user cards */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '2px solid #e0e0e0', borderRadius: '10px', background: 'white' }}>
                {(() => {
                  const filtered = globalUsers.filter(u => {
                    if (auditUserMode && u.Role !== 'Center User' && u.role !== 'center user') return false;
                    if (!modifySearch) return true;
                    const q = modifySearch.toLowerCase();
                    return u.username?.toLowerCase().includes(q) || u.firstname?.toLowerCase().includes(q) || u.lastname?.toLowerCase().includes(q) || (u.Role||u.role||'').toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
                  });
                  if (filtered.length === 0) return (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>😕 Koi user nahi mila</div>
                  );
                  return filtered.map(u => {
                    const role = u.Role || u.role || 'User';
                    const isSelected = selectedUser === u.username;
                    const roleColor = role === 'Admin' ? '#f5576c' : role === 'Audit User' ? '#4facfe' : role === 'Center User' ? '#11998e' : '#667eea';
                    return (
                      <div key={u._id || u.username}
                        onClick={() => handleSelectUser({ target: { value: u.username } })}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          background: isSelected ? 'linear-gradient(135deg, #667eea15, #764ba215)' : 'white',
                          borderLeft: isSelected ? '4px solid #667eea' : '4px solid transparent',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f9ff'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'white'; }}
                      >
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '15px', flexShrink: 0 }}>
                          {(u.firstname || u.username || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a237e' }}>
                            {u.firstname} {u.lastname}
                            <span style={{ fontWeight: '400', color: '#667eea', fontSize: '13px', marginLeft: '6px' }}>@{u.username}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>{u.email || '-'}</div>
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {role}
                        </span>
                        {isSelected && <span style={{ color: '#667eea', fontSize: '18px', flexShrink: 0 }}>✓</span>}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {selectedUser && (
              <div className="edit-section">
                <h4>✏️ Editing: {selectedUser}</h4>

                <div className="field-box">
                  <label>👤 Username</label>
                  <input value={editForm.username} disabled style={{ background: '#e9ecef', cursor: 'not-allowed' }} />
                  <div className="helper-text">Username cannot be changed</div>
                </div>

                <div className="field-box">
                  <label>🔐 Password</label>
                  <div className="password-wrapper">
                    <input 
                      autoComplete="new-password"
                      type={showEditPassword ? 'text' : 'password'} 
                      value={editForm.password} 
                      onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowEditPassword(!showEditPassword)}>
                      {showEditPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="field-box">
                  <label>📝 First Name</label>
                  <input autoComplete="off" value={editForm.firstname} onChange={(e) => setEditForm({...editForm, firstname: e.target.value})} />
                </div>

                <div className="field-box">
                  <label>📝 Last Name</label>
                  <input autoComplete="off" value={editForm.lastname} onChange={(e) => setEditForm({...editForm, lastname: e.target.value})} />
                </div>

                <div className="field-box">
                  <label>📧 Email</label>
                  <input autoComplete="off" type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
                </div>

                <div className="field-box">
                  <label>📱 Mobile</label>
                  <input autoComplete="off" value={editForm.mobile} onChange={(e) => setEditForm({...editForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})} maxLength="10" />
                </div>

                <div className="field-box">
                  <label>👥 Role</label>
                  <select 
                    value={editForm.Role} 
                    onChange={(e) => {
                      console.log('🔄 Role changed to:', e.target.value);
                      setEditForm({...editForm, Role: e.target.value});
                      // Clear center code if not Center User
                      if (e.target.value !== 'Center User') {
                        console.log('🗑️ Clearing centerCode (not Center User)');
                        setEditForm(prev => ({...prev, centerCode: ''}));
                      }
                    }}
                  >
                    <option value="Audit User">Audit User</option>
                    <option value="Center User">Center User</option>
                    <option value="Zonal Manager">Zonal Manager</option>
                    <option value="Region Head">Region Head</option>
                    <option value="Area Manager">Area Manager</option>
                    <option value="Cluster Manager">Cluster Manager</option>
                    <option value="Operation Head">Operation Head</option>
                    <option value="Placement Coordinator">Placement Coordinator</option>
                    <option value="Senior Manager Placement">Senior Manager Placement</option>
                    <option value="National Head Placement">National Head Placement</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                {/* Center Code Field - Only for Center User */}
                {editForm.Role === 'Center User' && (
                  <div className="field-box">
                    <label>🏢 Center Code *</label>
                    <select
                      value={editForm.centerCode}
                      onChange={(e) => {
                        console.log('🏢 Center Code selected:', e.target.value);
                        setEditForm({...editForm, centerCode: e.target.value});
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: !editForm.centerCode ? '2px solid #f44336' : '2px solid #4caf50',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        backgroundColor: '#f0fdf4'
                      }}
                    >
                      <option value="">Select Center Code *</option>
                      {centers.map(center => (
                        <option key={center.centerCode} value={center.centerCode}>
                          {center.centerCode} - {center.centerName}
                        </option>
                      ))}
                    </select>
                    {!editForm.centerCode && <div className="error-text">Center Code required for Center User</div>}
                    <div className="helper-text" style={{ color: '#1565c0', marginTop: '8px' }}>
                      ℹ️ Center User will only see reports for: <strong>{editForm.centerCode || 'No center selected'}</strong>
                    </div>
                  </div>
                )}

    
            {/* Replace Old Name - for hierarchy roles */}
            {['Zonal Manager', 'Region Head', 'Area Manager', 'Cluster Manager', 'Placement Coordinator', 'Senior Manager Placement', 'National Head Placement'].includes(newUserForm.Role) && (
              <div className="field-box" style={{ background: '#fff8e1', border: '2px solid #ffcc02', borderRadius: '10px', padding: '14px' }}>
                <label style={{ color: '#e65100', fontWeight: '700' }}>
                  🔄 Replace Old Name in Centers & Reports <span style={{ fontSize: '12px', fontWeight: '400' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder={`Enter old ${newUserForm.Role} name to replace (e.g. "Shweta")`}
                  value={newUserForm.replaceOldName}
                  onChange={(e) => setNewUserForm({...newUserForm, replaceOldName: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #ffcc02', borderRadius: '8px', fontSize: '14px', marginTop: '6px' }}
                />
                <div style={{ fontSize: '12px', color: '#e65100', marginTop: '6px' }}>
                  ⚠️ Agar koi purana {newUserForm.Role} tha — uska naam yahan daalo. Naye user ka naam ({newUserForm.firstname || '?'}) saare Centers aur Audit Reports mein replace ho jaayega.
                </div>
              </div>
            )}

            <div className="btn-group">
                  <button type="button" className="btn-green" onClick={handleUpdate} disabled={loading}>
                    {loading ? '⏳' : '✅ Update'}
                  </button>
                  <button type="button" className="btn-red" onClick={handleDelete} disabled={loading}>
                    🗑️ Delete
                  </button>
                  <button type="button" className="btn-gray" onClick={() => { setSelectedUser(null); setEditForm({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', centerCode: '', Role: 'Audit User' }); }}>
                    ❌ Cancel
                  </button>
                </div>

                <div className="warning-box">
                  <span>⚠️ Delete action is permanent and cannot be undone!</span>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default UserManagement;