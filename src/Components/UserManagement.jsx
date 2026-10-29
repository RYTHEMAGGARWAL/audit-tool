import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useUsers } from '../contexts/UsersContext';
import { API_URL } from '../config';
import './UserManagement.css';

// ========================================
// CONSTANTS
// ========================================
const SPECIAL_CHAR = /[@$!%*?&#^()_+\-=[\]{}|;:,.<>]/;
// Same rule as /^[^\s@]+@[^\s@]+\.[^\s@]+$/ but without the backtracking (S8786 / ReDoS):
// "something@something" where the part after @ has a dot with at least one character on both sides.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;
const isValidEmail = (email) => {
  if (!EMAIL_SHAPE.test(email)) return false;
  const domain = email.slice(email.indexOf('@') + 1);
  return domain.slice(1, -1).includes('.');
};
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const HIERARCHY_ROLES = [
  'Zonal Manager',
  'Region Head',
  'Area Manager',
  'Cluster Manager',
  'Placement Coordinator',
  'Senior Manager Placement',
  'National Head Placement',
];

const ROLES = [
  'Audit User',
  'Center User',
  'Zonal Manager',
  'Region Head',
  'Area Manager',
  'Cluster Manager',
  'Operation Head',
  'Placement Coordinator',
  'Senior Manager Placement',
  'National Head Placement',
  'National Head',
  'Admin',
];

const RELOAD_OPTIONS = ['view', 'modify'];

const MENU_ITEMS = [
  { key: 'create', icon: '➕', label: 'Create User', color: '#11998e' },
  { key: 'view', icon: '👁️', label: 'View User', color: '#2196f3' },
  { key: 'modify', icon: '✏️', label: 'Modify User', color: '#f7971e' },
];

const ROLE_COLORS = { Admin: '#f5576c', 'Audit User': '#4facfe', 'Center User': '#11998e' };
const DEFAULT_ROLE_COLOR = '#667eea';

const EMPTY_MESSAGE = { text: '', type: '' };
const EMPTY_NEW_USER_FORM = {
  username: '',
  password: '',
  firstname: '',
  lastname: '',
  email: '',
  mobile: '',
  centerCode: '',
  Role: 'Audit User',
  replaceOldName: '',
};
const EDIT_TEXT_FIELDS = ['username', 'firstname', 'lastname', 'email', 'mobile', 'centerCode'];

const CREATE_ROLE_SELECT_STYLE = {
  width: '100%',
  padding: '12px',
  border: '2px solid #ddd',
  borderRadius: '8px',
  fontSize: '14px',
  cursor: 'pointer',
  backgroundColor: 'white',
};

const CENTER_BADGE_STYLE = {
  fontWeight: 'bold',
  color: '#2196f3',
  background: '#e3f2fd',
  padding: '4px 8px',
  borderRadius: '4px',
};
const CENTER_EMPTY_STYLE = {
  fontWeight: 'bold',
  color: '#999',
  background: 'transparent',
  padding: '0',
  borderRadius: '0',
};

const EXPIRY_BADGE_BASE = {
  padding: '2px 8px',
  borderRadius: '10px',
  fontSize: '10px',
  fontWeight: 'bold',
  marginLeft: '4px',
};

const RESULT_PILL_BASE = {
  padding: '3px 12px',
  borderRadius: '20px',
  fontWeight: 'bold',
  fontSize: '13px',
};

const HEADER_NOT_FOUND =
  'Could not find header row. Make sure Excel has: username, password, first name, last name, email, mobileno., role, centercode, centername';

// Excel column aliases -> user field
const COLUMN_MAP = {
  username: ['username'],
  password: ['password'],
  firstname: ['first name', 'firstname'],
  lastname: ['last name', 'lastname'],
  email: ['email'],
  mobile: ['mobileno.', 'mobile', 'mobileno'],
  Role: ['role'],
  centerCode: ['centercode', 'center code'],
  centerName: ['centername', 'center name'],
};

// ========================================
// PASSWORD POLICY
// ========================================
const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, error: 'At least 8 characters', label: 'Min 8 characters' },
  { test: (p) => /[A-Z]/.test(p), error: 'One uppercase letter (A-Z)', label: 'Uppercase (A-Z)' },
  { test: (p) => /[a-z]/.test(p), error: 'One lowercase letter (a-z)', label: 'Lowercase (a-z)' },
  { test: (p) => /\d/.test(p), error: 'One number (0-9)', label: 'Number (0-9)' },
  {
    test: (p) => SPECIAL_CHAR.test(p),
    error: 'One special character (@$!%*?& etc)',
    label: 'Special char (@$!%*?&)',
  },
];

const validatePassword = (password) =>
  PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.error);

const policyMessage = (password) => {
  const errors = validatePassword(password);
  return errors.length ? `Password policy: ${errors.join(', ')}` : '';
};

const WEAK = { message: '❌ Weak - Password too simple', color: '#f44336' };
const STRENGTH_BY_SCORE = [
  WEAK,
  WEAK,
  WEAK,
  { message: '⚠️ Medium - Add more complexity', color: '#ff9800' },
  { message: '✅ Strong', color: '#4caf50' },
  { message: '✅ Very Strong', color: '#2196f3' },
];

const checkPasswordStrength = (password) => {
  if (!password) return { message: '', color: '' };
  const score = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  return STRENGTH_BY_SCORE[score];
};

// ========================================
// SMALL HELPERS
// ========================================
const postJson = (url, body, method = 'POST') =>
  fetch(url, { method, headers: JSON_HEADERS, body: JSON.stringify(body) });

const getRole = (user) => user.Role || user.role || '';

const isCenterUser = (user) => user.Role === 'Center User' || user.role === 'center user';

const visibleUsers = (users, auditUserMode) => (auditUserMode ? users.filter(isCenterUser) : users);

const matchesSearch = (values, query) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return values.some((v) => v?.toLowerCase().includes(q));
};

const getRoleColor = (role) => ROLE_COLORS[role] || DEFAULT_ROLE_COLOR;

const sanitizeMobile = (value) => value.replace(/\D/g, '').slice(0, 10);

const applyRoleChange = (form, role) => ({
  ...form,
  Role: role,
  centerCode: role === 'Center User' ? form.centerCode : '',
});

const userToEditForm = (user) => ({
  ...Object.fromEntries(EDIT_TEXT_FIELDS.map((field) => [field, user[field] || ''])),
  password: '',
  Role: user.Role || 'User',
});

const getExpiryBadge = (user) => {
  if (!user.passwordExpiresAt) return null;
  const daysLeft = Math.ceil((new Date(user.passwordExpiresAt) - new Date()) / MS_PER_DAY);
  if (daysLeft < 0) {
    return <span style={{ ...EXPIRY_BADGE_BASE, background: '#ffebee', color: '#c62828' }}>⏰ Expired</span>;
  }
  if (daysLeft <= 5) {
    return (
      <span style={{ ...EXPIRY_BADGE_BASE, background: '#fff3e0', color: '#e65100' }}>⚠️ {daysLeft}d left</span>
    );
  }
  return null;
};

const getRowBackground = (selected, hovered) => {
  if (selected) return 'linear-gradient(135deg, #667eea15, #764ba215)';
  return hovered ? '#f8f9ff' : 'white';
};

const confirmBorderColor = (confirm, password) => {
  if (!confirm) return undefined;
  return confirm === password ? '#4caf50' : '#f44336';
};

const getUploadButtonStyle = (uploading) => ({
  padding: '10px 24px',
  background: uploading ? '#9ca3af' : 'linear-gradient(135deg,#667eea,#764ba2)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: uploading ? 'not-allowed' : 'pointer',
  fontWeight: 'bold',
  fontSize: '14px',
});

// ========================================
// FORM VALIDATION
// ========================================
const required = (value) => (value?.trim() ? '' : 'Required');

const NEW_USER_VALIDATORS = {
  username: ({ username }) => required(username) || (username.length < 3 ? 'Min 3 characters' : ''),
  password: ({ password }) => required(password) || validatePassword(password).join(', '),
  firstname: ({ firstname }) => required(firstname),
  lastname: ({ lastname }) => required(lastname),
  email: ({ email }) => required(email) || (isValidEmail(email) ? '' : 'Invalid email'),
  mobile: ({ mobile }) => required(mobile) || (/^\d{10}$/.test(mobile) ? '' : '10 digits required'),
  centerCode: ({ Role, centerCode }) =>
    Role === 'Center User' && !centerCode?.trim() ? 'Center Code required for Center User' : '',
};

const validateNewUser = (form) =>
  Object.fromEntries(
    Object.entries(NEW_USER_VALIDATORS)
      .map(([field, check]) => [field, check(form)])
      .filter(([, message]) => message)
  );

const validateEditForm = (form) => {
  if (form.Role === 'Center User' && !form.centerCode?.trim()) return 'Center Code required for Center User';
  return form.password?.trim() ? policyMessage(form.password) : '';
};

const getResetError = (password, confirm) =>
  password === confirm ? policyMessage(password) : 'Passwords do not match!';

// ========================================
// EXCEL PARSING
// ========================================
const normalizeHeader = (header) => String(header).toLowerCase().trim();

const getCell = (row, headers, columns) =>
  columns
    .map((col) => headers.indexOf(col))
    .filter((idx) => idx >= 0)
    .map((idx) => String(row[idx] || '').trim())
    .find(Boolean) || '';

const rowToUser = (row, headers) =>
  Object.fromEntries(Object.entries(COLUMN_MAP).map(([key, cols]) => [key, getCell(row, headers, cols)]));

const parseUsersFromRows = (rows) => {
  const headerIdx = rows.findIndex((r) => r.some((c) => normalizeHeader(c) === 'username'));
  if (headerIdx === -1) return { error: HEADER_NOT_FOUND };
  const headers = rows[headerIdx].map(normalizeHeader);
  const users = rows
    .slice(headerIdx + 1)
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => rowToUser(r, headers))
    .filter((u) => u.username && u.password);
  return users.length === 0 ? { error: 'No valid rows found. Check Excel format.' } : { users };
};

const readSheetRows = async (file) => {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
};

// Never throws: returns { alertText } on any failure, { results } on success
const importUsersFromFile = async (file, createdBy, auditUserMode) => {
  try {
    const parsed = parseUsersFromRows(await readSheetRows(file));
    if (parsed.error) return { alertText: parsed.error };
    const res = await postJson(`${API_URL}/api/users/bulk-import`, {
      users: parsed.users,
      createdBy: createdBy || '',
      auditUserMode,
    });
    const data = await res.json();
    if (!res.ok) return { alertText: 'Error: ' + (data.error || 'Upload failed') };
    return { results: data.results };
  } catch (err) {
    return { alertText: 'Error reading file: ' + err.message };
  }
};

// ========================================
// API ACTIONS (ctx = { users, setLoading, showMessage, reload, auditUserMode, createdBy })
// ========================================
const buildCreatePayload = (form, auditUserMode, createdBy) => {
  const role = auditUserMode ? 'Audit User' : 'Admin';
  return {
    ...form,
    username: form.username.toLowerCase(),
    email: form.email?.toLowerCase() || '',
    centerCode: form.centerCode?.toUpperCase() || '',
    createdByRole: role,
    createdBy: createdBy || role,
  };
};

const replaceHierarchyName = async (form, showMessage) => {
  if (!HIERARCHY_ROLES.includes(form.Role) || !form.replaceOldName?.trim()) return;
  try {
    const res = await postJson(`${API_URL}/api/bulk-replace-hierarchy-name`, {
      role: form.Role,
      oldName: form.replaceOldName.trim(),
      newName: `${form.firstname} ${form.lastname}`.trim(),
    });
    const data = await res.json();
    if (data.success) showMessage(`✅ User created! ${data.message}`, 'success');
  } catch (err) {
    console.error('Bulk replace error:', err);
  }
};

// returns true when the user was created
const createUser = async (ctx, form) => {
  const { users, setLoading, showMessage, reload, auditUserMode, createdBy } = ctx;
  const taken = users.some((u) => u.username?.toLowerCase() === form.username?.toLowerCase());
  if (taken) {
    showMessage('Username already exists!', 'error');
    return false;
  }
  try {
    setLoading(true);
    const res = await postJson(`${API_URL}/api/users`, buildCreatePayload(form, auditUserMode, createdBy));
    if (!res.ok) {
      const error = await res.json();
      showMessage(`❌ ${error.error}`, 'error');
      return false;
    }
    showMessage('✅ User created! They will be asked to set a new password on first login.', 'success');
    await replaceHierarchyName(form, showMessage);
    await reload();
    return true;
  } catch (err) {
    showMessage(`❌ ${err.message}`, 'error');
    return false;
  } finally {
    setLoading(false);
  }
};

const buildUpdatePayload = (form, auditUserMode, createdBy) => ({
  ...form,
  centerCode: form.centerCode?.toUpperCase() || '',
  modifiedByRole: auditUserMode ? 'Audit User' : 'Admin',
  modifiedBy: auditUserMode ? createdBy : 'Admin',
});

// returns true unless an exception happened (same as original: selection cleared either way)
const updateUser = async (ctx, username, form) => {
  const { users, setLoading, showMessage, reload, auditUserMode, createdBy } = ctx;
  try {
    setLoading(true);
    const user = users.find((u) => u.username === username);
    if (user?._id) {
      const res = await postJson(
        `${API_URL}/api/users/${user._id}`,
        buildUpdatePayload(form, auditUserMode, createdBy),
        'PUT'
      );
      if (res.ok) {
        const result = await res.json();
        showMessage(result.pendingApproval ? '✅ Modify request submitted!' : '✅ Updated!', 'success');
        await reload();
      }
    }
    return true;
  } catch (err) {
    showMessage(`❌ ${err.message}`, 'error');
    return false;
  } finally {
    setLoading(false);
  }
};

const deleteUser = async (ctx, username) => {
  const { users, setLoading, showMessage, reload } = ctx;
  try {
    setLoading(true);
    const user = users.find((u) => u.username === username);
    if (user?._id) {
      const res = await fetch(`${API_URL}/api/users/${user._id}`, { method: 'DELETE' });
      if (res.ok) {
        showMessage('✅ Deleted!', 'success');
        await reload();
      }
    }
    return true;
  } catch (err) {
    showMessage(`❌ ${err.message}`, 'error');
    return false;
  } finally {
    setLoading(false);
  }
};

// never throws: always returns { ok, type, text }
const adminResetPassword = async (user, newPassword) => {
  try {
    const res = await postJson(`${API_URL}/api/admin-reset-password`, { userId: user._id, newPassword });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        ok: true,
        type: 'success',
        text: `✅ Password reset for ${user.username}. They must change on next login.`,
      };
    }
    return { ok: false, type: 'error', text: `❌ ${data.error}` };
  } catch (err) {
    return { ok: false, type: 'error', text: `❌ ${err.message}` };
  }
};

// ========================================
// HOOKS
// ========================================
const useFlashMessage = () => {
  const [message, setMessage] = useState(EMPTY_MESSAGE);
  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(EMPTY_MESSAGE), 3000);
  };
  return [message, showMessage];
};

const useUsersData = (showMessage) => {
  const { users: globalUsers, setUsers: setGlobalUsers } = useUsers();
  const [tableUsers, setTableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState([]);

  const loadUsersData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const usersData = await response.json();
      setTableUsers([...usersData]);
      setGlobalUsers([...usersData]);
    } catch (err) {
      console.error('❌ Failed to load users:', err);
      showMessage('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCenters = async () => {
    try {
      const response = await fetch(`${API_URL}/api/centers`);
      if (response.ok) setCenters(await response.json());
    } catch (err) {
      console.error('❌ Error loading centers:', err);
    }
  };

  return { globalUsers, tableUsers, loading, setLoading, centers, loadUsersData, loadCenters };
};

const useClickOutside = (ref, onOutside) => {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
};

const useDefaultOption = (defaultOption, setActiveOption, loadUsersData) => {
  useEffect(() => {
    if (!defaultOption) return;
    setActiveOption(defaultOption);
    if (RELOAD_OPTIONS.includes(defaultOption)) loadUsersData();
  }, [defaultOption]);
};

// ========================================
// SMALL UI PIECES
// ========================================
const FlashMessage = ({ message }) =>
  message.text ? <div className={`message ${message.type}`}>{message.text}</div> : null;

const PasswordChecklist = ({ password }) => (
  <div style={{ marginTop: '8px', background: '#f8f9fa', borderRadius: '8px', padding: '10px 14px' }}>
    {PASSWORD_RULES.map(({ test, label }) => {
      const ok = test(password);
      return (
        <div key={label} style={{ fontSize: '12px', color: ok ? '#4caf50' : '#f44336', marginBottom: '2px' }}>
          {ok ? '✅' : '❌'} {label}
        </div>
      );
    })}
  </div>
);

const PasswordFeedback = ({ password }) => {
  if (!password) return null;
  const strength = checkPasswordStrength(password);
  return (
    <>
      <div className="helper-text" style={{ color: strength.color }}>
        {strength.message}
      </div>
      <PasswordChecklist password={password} />
    </>
  );
};

const PasswordField = ({ invalid = false, style, ...inputProps }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-wrapper">
      <input
        autoComplete="new-password"
        {...inputProps}
        type={visible ? 'text' : 'password'}
        className={invalid ? 'error' : ''}
        style={style}
      />
      <button type="button" className="password-toggle" onClick={() => setVisible((v) => !v)}>
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  );
};

const Field = ({ label, htmlFor, error, children }) => (
  <div className="field-box">
    <label htmlFor={htmlFor}>{label}</label>
    {children}
    {error && <div className="error-text">{error}</div>}
  </div>
);

const TextField = ({ label, error, children, ...inputProps }) => (
  <Field label={label} htmlFor={inputProps.id} error={error}>
    <input autoComplete="off" type="text" {...inputProps} className={error ? 'error' : ''} />
    {children}
  </Field>
);

const RoleSelect = ({ id, value, onChange, style }) => (
  <select id={id} value={value} onChange={onChange} style={style}>
    {ROLES.map((role) => (
      <option key={role} value={role}>
        {role}
      </option>
    ))}
  </select>
);

const CenterCodeField = ({ id, value, onChange, centers, error }) => (
  <div className="field-box">
    <label htmlFor={id}>🏢 Center Code *</label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      className={error ? 'error' : ''}
      style={{
        width: '100%',
        padding: '12px',
        border: error ? '2px solid #f44336' : '2px solid #4caf50',
        borderRadius: '8px',
        fontSize: '14px',
        cursor: 'pointer',
        backgroundColor: '#f0fdf4',
      }}
    >
      <option value="">Select Center Code *</option>
      {centers.map((center) => (
        <option key={center.centerCode} value={center.centerCode}>
          {center.centerCode} - {center.centerName}
        </option>
      ))}
    </select>
    {error && <div className="error-text">{error}</div>}
    <div className="helper-text" style={{ color: '#1565c0', marginTop: '8px' }}>
      ℹ️ Center User will only see reports for: <strong>{value || 'No center selected'}</strong>
    </div>
  </div>
);

const DigitCounter = ({ value }) => {
  if (!value) return null;
  return (
    <div className="helper-text" style={{ color: value.length === 10 ? '#4caf50' : '#ff9800' }}>
      {value.length}/10 digits
    </div>
  );
};

const ReplaceOldNameField = ({ id, role, firstname, value, onChange }) => (
  <div
    className="field-box"
    style={{ background: '#fff8e1', border: '2px solid #ffcc02', borderRadius: '10px', padding: '14px' }}
  >
    <label htmlFor={id} style={{ color: '#e65100', fontWeight: '700' }}>
      🔄 Replace Old Name in Centers & Reports{' '}
      <span style={{ fontSize: '12px', fontWeight: '400' }}>(Optional)</span>
    </label>
    <input
      id={id}
      type="text"
      placeholder={`Enter old ${role} name to replace`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '10px 14px',
        border: '2px solid #ffcc02',
        borderRadius: '8px',
        fontSize: '14px',
        marginTop: '6px',
      }}
    />
    <div style={{ fontSize: '12px', color: '#e65100', marginTop: '6px' }}>
      ⚠️ Agar koi purana {role} tha — uska naam yahan daalo. Naye user ka naam ({firstname || '?'}) saare
      Centers aur Audit Reports mein replace ho jaayega.
    </div>
  </div>
);

const SearchBox = ({ id, value, onChange, placeholder, marginBottom, padding, background }) => (
  <div style={{ marginBottom, position: 'relative' }}>
    <input
      id={id}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding,
        border: '2px solid #667eea',
        borderRadius: '10px',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box',
        background,
      }}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '18px',
          color: '#999',
        }}
      >
        ✕
      </button>
    )}
  </div>
);

// ========================================
// HEADER / DROPDOWN
// ========================================
const MenuItem = ({ item, active, onClick }) => (
  <button
    type="button"
    className={`um-aed-item${active ? ' um-aed-item--active' : ''}`}
    style={{ '--item-color': item.color }}
    onClick={onClick}
  >
    <span className="um-aed-item-icon">{item.icon}</span>
    <span className="um-aed-item-label">{item.label}</span>
    {active && <span className="um-aed-item-check">✓</span>}
  </button>
);

const UserMenuBar = ({ activeOption, onSelect, total, loading, onRefresh }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useClickOutside(wrapRef, () => setOpen(false));
  const active = MENU_ITEMS.find((item) => item.key === activeOption);

  const handleSelect = async (key) => {
    await onSelect(key);
    setOpen(false);
  };

  return (
    <div className="um-tab-row">
      <div className="um-excel-tab-wrap" ref={wrapRef}>
        <button
          type="button"
          className={`um-excel-tab${open ? ' um-excel-tab--open' : ''}`}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="um-aet-icon">👥</span>
          <span className="um-aet-title">User Management</span>
          {active && (
            <span className="um-aet-active-chip" style={{ background: active.color }}>
              {active.icon} {active.label}
            </span>
          )}
          <span className="um-aet-caret">{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <div className="um-excel-dropdown">
            <div className="um-aed-header">👥 User Management</div>
            {MENU_ITEMS.map((item) => (
              <MenuItem
                key={item.key}
                item={item}
                active={item.key === activeOption}
                onClick={() => handleSelect(item.key)}
              />
            ))}
          </div>
        )}
      </div>
      <div className="um-status-right">
        <span className="um-total-badge">📊 Total Users: {total}</span>
        <button type="button" className="um-refresh-btn" onClick={onRefresh} disabled={loading}>
          {loading ? '⏳' : '🔄 Refresh'}
        </button>
      </div>
    </div>
  );
};

// ========================================
// ADMIN RESET PASSWORD MODAL
// ========================================
const ResetPasswordModal = ({ user, showMessage, onClose }) => {
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const validationError = getResetError(newPwd, confirmPwd);
    if (validationError) return showMessage(validationError, 'error');
    setLoading(true);
    const outcome = await adminResetPassword(user, newPwd);
    setLoading(false);
    showMessage(outcome.text, outcome.type);
    if (outcome.ok) onClose();
  };

  const submitDisabled = validatePassword(newPwd).length > 0 || newPwd !== confirmPwd;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          width: '420px',
          maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <h3 style={{ margin: '0 0 8px', color: '#1a237e' }}>🔑 Reset Password</h3>
        <p style={{ color: '#666', fontSize: '14px', margin: '0 0 20px' }}>
          Resetting for: <strong>{user.username}</strong> ({user.firstname} {user.lastname})
          <br />
          <span style={{ color: '#e65100', fontSize: '12px' }}>
            ⚠️ User will be forced to change password on next login.
          </span>
        </p>

        <div className="field-box">
          <label htmlFor="um-reset-new-password">🔐 New Password</label>
          <PasswordField
            id="um-reset-new-password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="Enter new password"
          />
          {newPwd && <PasswordChecklist password={newPwd} />}
        </div>

        <div className="field-box">
          <label htmlFor="um-reset-confirm-password">✅ Confirm Password</label>
          <PasswordField
            id="um-reset-confirm-password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder="Confirm new password"
            style={{ borderColor: confirmBorderColor(confirmPwd, newPwd) }}
          />
          {confirmPwd && confirmPwd !== newPwd && <div className="error-text">❌ Passwords don't match</div>}
        </div>

        <div className="btn-group" style={{ marginTop: '16px' }}>
          <button type="button" className="btn-green" onClick={handleSubmit} disabled={loading || submitDisabled}>
            {loading ? '⏳ Resetting...' : '🔑 Reset Password'}
          </button>
          <button type="button" className="btn-gray" onClick={onClose}>
            ❌ Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================================
// BULK UPLOAD
// ========================================
const BulkResultPanel = ({ results, onDismiss }) => {
  const successCount = results.filter((r) => r.status === 'success').length;
  const errors = results.filter((r) => r.status === 'error');
  return (
    <div
      style={{
        marginTop: '14px',
        padding: '14px',
        background: '#f0fff4',
        border: '2px solid #38a169',
        borderRadius: '10px',
      }}
    >
      <div style={{ fontWeight: 'bold', color: '#276749', marginBottom: '10px' }}>📊 Upload Result</div>
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={{ ...RESULT_PILL_BASE, background: '#c6f6d5', color: '#276749' }}>
          ✅ Success: {successCount}
        </span>
        <span style={{ ...RESULT_PILL_BASE, background: '#fed7d7', color: '#822727' }}>
          ❌ Errors: {errors.length}
        </span>
      </div>
      {errors.length > 0 && (
        <div style={{ fontSize: '12px', color: '#822727' }}>
          <strong>Errors:</strong> {errors.map((e) => `${e.username}: ${e.error}`).join(', ')}
        </div>
      )}
      <button
        type="button"
        onClick={onDismiss}
        style={{
          marginTop: '8px',
          padding: '3px 10px',
          background: '#e2e8f0',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        Dismiss
      </button>
    </div>
  );
};

const BulkUploadBox = ({ createdBy, auditUserMode }) => {
  const fileInputRef = useRef(null);
  const [result, setResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const input = e.target;
    const file = input.files[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    const { alertText, results } = await importUsersFromFile(file, createdBy, auditUserMode);
    if (alertText) window.alert(alertText);
    else setResult(results);
    setUploading(false);
    input.value = '';
  };

  return (
    <div
      style={{
        marginTop: '20px',
        padding: '16px',
        background: '#f0f4ff',
        borderRadius: '10px',
        border: '2px dashed #667eea',
      }}
    >
      <div style={{ fontWeight: 'bold', color: '#1a237e', marginBottom: '10px', fontSize: '14px' }}>
        📂 Bulk Upload Users from Excel
      </div>
      <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>
        Excel columns:{' '}
        <strong>username, password, first name, last name, email, mobileno., role, centercode, centername</strong>
      </div>
      <div style={{ fontSize: '12px', color: '#e65100', marginBottom: '12px' }}>
        ⚠️ Password must meet policy: 8+ chars, uppercase, lowercase, number, special char
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={getUploadButtonStyle(uploading)}
      >
        {uploading ? '⏳ Uploading...' : '📂 Upload Excel'}
      </button>
      {result && <BulkResultPanel results={result} onDismiss={() => setResult(null)} />}
    </div>
  );
};

// ========================================
// CREATE USER
// ========================================
const CreateUserForm = ({ centers, loading, showMessage, onCreate, createdBy, auditUserMode }) => {
  const [form, setForm] = useState(EMPTY_NEW_USER_FORM);
  const [errors, setErrors] = useState({});

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const handleRoleChange = (role) => setForm((prev) => applyRoleChange(prev, role));
  const reset = () => {
    setForm(EMPTY_NEW_USER_FORM);
    setErrors({});
  };

  const handleSubmit = async () => {
    const found = validateNewUser(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return showMessage('Fix validation errors', 'error');
    if (await onCreate(form)) reset();
  };

  return (
    <div className="create-user">
      <h3>➕ Create New User</h3>

      <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <div className="info-box">
          <span>
            📋 Required fields marked with * &nbsp;|&nbsp; 🔐 User will be asked to set new password on first
            login
          </span>
        </div>

        <TextField
          id="um-create-username"
          label="👤 Username *"
          name="create_username_field"
          placeholder="Enter username (min 3 characters)"
          value={form.username}
          onChange={(e) => update('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
          error={errors.username}
        />

        <Field
          htmlFor="um-create-password"
          label={
            <>
              🔐 Password *{' '}
              <span style={{ fontWeight: '400', fontSize: '12px', color: '#667eea' }}>
                (User must change on first login)
              </span>
            </>
          }
          error={errors.password}
        >
          <PasswordField
            id="um-create-password"
            name="create_password_field"
            placeholder="Min 8 chars, uppercase, number, special char"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            invalid={Boolean(errors.password)}
          />
          <PasswordFeedback password={form.password} />
        </Field>

        <TextField
          id="um-create-firstname"
          label="📝 First Name *"
          placeholder="Enter first name"
          value={form.firstname}
          onChange={(e) => update('firstname', e.target.value)}
          error={errors.firstname}
        />

        <TextField
          id="um-create-lastname"
          label="📝 Last Name *"
          placeholder="Enter last name"
          value={form.lastname}
          onChange={(e) => update('lastname', e.target.value)}
          error={errors.lastname}
        />

        <TextField
          id="um-create-email"
          label="📧 Email *"
          type="email"
          placeholder="Enter email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
        />

        <TextField
          id="um-create-mobile"
          label="📱 Mobile *"
          placeholder="Enter 10 digit mobile"
          value={form.mobile}
          maxLength="10"
          onChange={(e) => update('mobile', sanitizeMobile(e.target.value))}
          error={errors.mobile}
        >
          <DigitCounter value={form.mobile} />
        </TextField>

        <Field label="👤 Role *" htmlFor="um-create-role">
          <RoleSelect
            id="um-create-role"
            value={form.Role}
            onChange={(e) => handleRoleChange(e.target.value)}
            style={CREATE_ROLE_SELECT_STYLE}
          />
        </Field>

        {form.Role === 'Center User' && (
          <CenterCodeField
            id="um-create-center-code"
            value={form.centerCode}
            onChange={(e) => update('centerCode', e.target.value)}
            centers={centers}
            error={errors.centerCode}
          />
        )}

        {HIERARCHY_ROLES.includes(form.Role) && (
          <ReplaceOldNameField
            id="um-create-replace-old-name"
            role={form.Role}
            firstname={form.firstname}
            value={form.replaceOldName}
            onChange={(value) => update('replaceOldName', value)}
          />
        )}

        <div className="btn-group">
          <button type="button" className="btn-green" onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Creating...' : '✅ Create User'}
          </button>
          <button type="button" className="btn-gray" onClick={reset}>
            🔄 Reset
          </button>
        </div>

        <BulkUploadBox createdBy={createdBy} auditUserMode={auditUserMode} />
      </form>
    </div>
  );
};

// ========================================
// VIEW USERS
// ========================================
const PasswordStatus = ({ user }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
    <span
      style={{
        background: '#e8f5e9',
        color: '#2e7d32',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 'bold',
        display: 'inline-block',
      }}
    >
      🔒 Secured
    </span>
    {user.forcePasswordChange && (
      <span
        style={{
          background: '#fff3e0',
          color: '#e65100',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '10px',
          fontWeight: 'bold',
        }}
      >
        ⚠️ Must Change
      </span>
    )}
    {getExpiryBadge(user)}
  </div>
);

const CenterCodeBadge = ({ code }) => (
  <span style={code ? CENTER_BADGE_STYLE : CENTER_EMPTY_STYLE}>{code || '-'}</span>
);

const RoleCell = ({ user }) => (
  <>
    <span className={`role-badge ${getRole(user).toLowerCase().replace(/ /g, '-')}`}>
      {getRole(user) || '-'}
    </span>
    {(user.approvalStatus === 'pending' || user.modifyApprovalStatus === 'pending') && (
      <span
        style={{
          marginLeft: '6px',
          padding: '2px 6px',
          background: '#fff3cd',
          color: '#856404',
          borderRadius: '8px',
          fontSize: '10px',
          fontWeight: 'bold',
          border: '1px solid #ffc107',
        }}
      >
        ⏳ Pending
      </span>
    )}
  </>
);

const UserRow = ({ user, index, showActions, onReset }) => (
  <tr>
    <td>{index + 1}</td>
    <td>
      <span className="username-badge">{user.username}</span>
    </td>
    <td>
      {/* Security: never show the actual password - show status instead */}
      <PasswordStatus user={user} />
    </td>
    <td>{user.firstname}</td>
    <td>{user.lastname || '-'}</td>
    <td>{user.email || '-'}</td>
    <td>{user.mobile || '-'}</td>
    <td>
      <CenterCodeBadge code={user.centerCode} />
    </td>
    <td>
      <RoleCell user={user} />
    </td>
    {showActions && (
      <td>
        <button
          type="button"
          onClick={() => onReset(user)}
          style={{
            padding: '5px 12px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
          }}
        >
          🔑 Reset Pwd
        </button>
      </td>
    )}
  </tr>
);

const ViewUsersTable = ({ users, auditUserMode, onReset }) => {
  const [search, setSearch] = useState('');
  const scoped = visibleUsers(users, auditUserMode);
  const rows = scoped.filter((u) =>
    matchesSearch([u.username, u.firstname, u.lastname, u.email, u.mobile, u.centerCode, getRole(u)], search)
  );

  return (
    <div className="view-user">
      <h3>👁️ Users List ({scoped.length})</h3>

      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Search by name, username, email, role, center code..."
        marginBottom="16px"
        padding="12px 40px 12px 16px"
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Username</th>
              <th>Password Status</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Center Code</th>
              <th>Role</th>
              {!auditUserMode && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((u, i) => (
              <UserRow key={u._id || u.username} user={u} index={i} showActions={!auditUserMode} onReset={onReset} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ========================================
// MODIFY USER
// ========================================
const UserPickerRow = ({ user: u, selected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const role = u.Role || u.role || 'User';
  const roleColor = getRoleColor(role);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(u)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(u);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 16px',
        cursor: 'pointer',
        borderBottom: '1px solid #f0f0f0',
        background: getRowBackground(selected, hovered),
        borderLeft: selected ? '4px solid #667eea' : '4px solid transparent',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: '700',
          fontSize: '15px',
          flexShrink: 0,
        }}
      >
        {(u.firstname || u.username || '?')[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a237e' }}>
          {u.firstname} {u.lastname}
          <span style={{ fontWeight: '400', color: '#667eea', fontSize: '13px', marginLeft: '6px' }}>
            @{u.username}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>{u.email || '-'}</div>
      </div>
      <span
        style={{
          padding: '3px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: '700',
          background: `${roleColor}20`,
          color: roleColor,
          border: `1px solid ${roleColor}40`,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {role}
      </span>
      {u.forcePasswordChange && (
        <span
          style={{
            background: '#fff3e0',
            color: '#e65100',
            padding: '2px 6px',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 'bold',
          }}
        >
          ⚠️ Must Change
        </span>
      )}
      {selected && <span style={{ color: '#667eea', fontSize: '18px', flexShrink: 0 }}>✓</span>}
    </div>
  );
};

const UserPicker = ({ users, auditUserMode, search, onSearch, selectedUsername, onSelect }) => {
  const filtered = visibleUsers(users, auditUserMode).filter((u) =>
    matchesSearch([u.username, u.firstname, u.lastname, getRole(u), u.email], search)
  );

  return (
    <div className="field-box">
      <label htmlFor="um-modify-search">Select User to Modify:</label>
      <SearchBox
        id="um-modify-search"
        value={search}
        onChange={onSearch}
        placeholder="Name, username, email ya role type karo..."
        marginBottom="10px"
        padding="12px 40px 12px 14px"
        background="#f8f9ff"
      />
      <div
        style={{
          maxHeight: '280px',
          overflowY: 'auto',
          border: '2px solid #e0e0e0',
          borderRadius: '10px',
          background: 'white',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
            😕 Koi user nahi mila
          </div>
        ) : (
          filtered.map((u) => (
            <UserPickerRow
              key={u._id || u.username}
              user={u}
              selected={selectedUsername === u.username}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};

const EditUserForm = ({ user, centers, loading, showMessage, onUpdate, onDelete, onDone }) => {
  const [form, setForm] = useState(() => userToEditForm(user));

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const handleRoleChange = (role) => setForm((prev) => applyRoleChange(prev, role));

  const handleUpdate = async () => {
    const error = validateEditForm(form);
    if (error) return showMessage(error, 'error');
    if (await onUpdate(form)) onDone();
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete "${user.username}"?`) && (await onDelete())) onDone();
  };

  return (
    <div className="edit-section">
      <h4>✏️ Editing: {user.username}</h4>

      <TextField id="um-edit-username" label="👤 Username" value={form.username} disabled style={{ background: '#e9ecef', cursor: 'not-allowed' }}>
        <div className="helper-text">Username cannot be changed</div>
      </TextField>

      <Field
        htmlFor="um-edit-password"
        label={
          <>
            🔐 New Password{' '}
            <span style={{ fontWeight: '400', fontSize: '12px', color: '#999' }}>(leave blank to keep current)</span>
          </>
        }
      >
        <PasswordField
          id="um-edit-password"
          value={form.password}
          placeholder="Enter new password (or leave blank)"
          onChange={(e) => update('password', e.target.value)}
        />
        <PasswordFeedback password={form.password} />
        <div className="helper-text" style={{ color: '#e65100', marginTop: '4px' }}>
          ⚠️ If changed by Admin → user must reset on next login
        </div>
      </Field>

      <TextField id="um-edit-firstname" label="📝 First Name" value={form.firstname} onChange={(e) => update('firstname', e.target.value)} />
      <TextField id="um-edit-lastname" label="📝 Last Name" value={form.lastname} onChange={(e) => update('lastname', e.target.value)} />
      <TextField id="um-edit-email" label="📧 Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
      <TextField
        id="um-edit-mobile"
        label="📱 Mobile"
        value={form.mobile}
        maxLength="10"
        onChange={(e) => update('mobile', sanitizeMobile(e.target.value))}
      />

      <Field label="👥 Role" htmlFor="um-edit-role">
        <RoleSelect id="um-edit-role" value={form.Role} onChange={(e) => handleRoleChange(e.target.value)} />
      </Field>

      {form.Role === 'Center User' && (
        <CenterCodeField
          id="um-edit-center-code"
          value={form.centerCode}
          onChange={(e) => update('centerCode', e.target.value)}
          centers={centers}
          error={form.centerCode ? '' : 'Center Code required for Center User'}
        />
      )}

      <div className="btn-group">
        <button type="button" className="btn-green" onClick={handleUpdate} disabled={loading}>
          {loading ? '⏳' : '✅ Update'}
        </button>
        <button type="button" className="btn-red" onClick={handleDelete} disabled={loading}>
          🗑️ Delete
        </button>
        <button type="button" className="btn-gray" onClick={onDone}>
          ❌ Cancel
        </button>
      </div>

      <div className="warning-box">
        <span>⚠️ Delete action is permanent and cannot be undone!</span>
      </div>
    </div>
  );
};

const ModifyUserForm = ({ users, centers, auditUserMode, loading, showMessage, onUpdate, onDelete }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  return (
    <div className="modify-user">
      <h3>✏️ Modify User</h3>

      <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <UserPicker
          users={users}
          auditUserMode={auditUserMode}
          search={search}
          onSearch={setSearch}
          selectedUsername={selected?.username}
          onSelect={setSelected}
        />

        {selected && (
          <EditUserForm
            key={selected.username}
            user={selected}
            centers={centers}
            loading={loading}
            showMessage={showMessage}
            onUpdate={(form) => onUpdate(selected.username, form)}
            onDelete={() => onDelete(selected.username)}
            onDone={() => setSelected(null)}
          />
        )}
      </form>
    </div>
  );
};

// ========================================
// MAIN COMPONENT
// ========================================
const UserManagement = ({ auditUserMode = false, createdBy = '', defaultOption = '', hideHeader = false }) => {
  const [message, showMessage] = useFlashMessage();
  const { globalUsers, tableUsers, loading, setLoading, centers, loadUsersData, loadCenters } =
    useUsersData(showMessage);
  const [activeOption, setActiveOption] = useState(defaultOption || '');
  const [formKey, setFormKey] = useState(0); // bump = reset Create / Modify form state
  const [resetTarget, setResetTarget] = useState(null);

  useEffect(() => {
    loadCenters();
  }, []);
  useEffect(() => {
    loadUsersData();
  }, []);
  useDefaultOption(defaultOption, setActiveOption, loadUsersData);

  const ctx = { users: globalUsers, setLoading, showMessage, reload: loadUsersData, auditUserMode, createdBy };

  const selectOption = async (key) => {
    if (RELOAD_OPTIONS.includes(key)) await loadUsersData();
    setFormKey((k) => k + 1);
    setActiveOption(key);
  };

  const refresh = async () => {
    await loadUsersData();
    showMessage('✅ Refreshed!', 'success');
  };

  const renderActiveView = () => {
    switch (activeOption) {
      case 'create':
        return (
          <CreateUserForm
            key={formKey}
            centers={centers}
            loading={loading}
            showMessage={showMessage}
            createdBy={createdBy}
            auditUserMode={auditUserMode}
            onCreate={(form) => createUser(ctx, form)}
          />
        );
      case 'view':
        return <ViewUsersTable users={tableUsers} auditUserMode={auditUserMode} onReset={setResetTarget} />;
      case 'modify':
        return (
          <ModifyUserForm
            key={formKey}
            users={globalUsers}
            centers={centers}
            auditUserMode={auditUserMode}
            loading={loading}
            showMessage={showMessage}
            onUpdate={(username, form) => updateUser(ctx, username, form)}
            onDelete={(username) => deleteUser(ctx, username)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="management-section">
      <FlashMessage message={message} />

      {resetTarget && (
        <ResetPasswordModal user={resetTarget} showMessage={showMessage} onClose={() => setResetTarget(null)} />
      )}

      {!hideHeader && (
        <UserMenuBar
          activeOption={activeOption}
          onSelect={selectOption}
          total={globalUsers.length}
          loading={loading}
          onRefresh={refresh}
        />
      )}

      {renderActiveView()}
    </div>
  );
};

export default UserManagement;