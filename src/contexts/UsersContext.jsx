import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { API_URL } from '../config';

const UsersContext = createContext();

export const UsersProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch users from MongoDB on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // ========================================
  // FETCH ALL USERS
  // ========================================
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users`);
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        console.log('✅ Users loaded from MongoDB:', data.length);
      } else {
        console.log('⚠️ Failed to fetch users, using empty array');
        setUsers([]);
      }
    } catch (err) {
      console.error('❌ Fetch users error:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================
  // ADD USER
  // ========================================
  const addUser = useCallback(async (userData) => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        const result = await response.json();
        await fetchUsers(); // Refresh list
        return { success: true, user: result.user };
      }
      
      const error = await response.json();
      return { success: false, error: error.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [fetchUsers]);

  // ========================================
  // UPDATE USER
  // ========================================
  const updateUser = useCallback(async (userId, userData) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        const result = await response.json();
        await fetchUsers(); // Refresh list
        return { success: true, user: result.user };
      }
      
      const error = await response.json();
      return { success: false, error: error.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [fetchUsers]);

  // ========================================
  // DELETE USER
  // ========================================
  const deleteUser = useCallback(async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchUsers(); // Refresh list
        return { success: true };
      }
      
      return { success: false };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [fetchUsers]);

  // ========================================
  // BULK UPDATE (backward compatibility)
  // ========================================
  const saveAllUsers = useCallback(async (usersArray) => {
    try {
      const response = await fetch(`${API_URL}/api/update-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: usersArray })
      });
      
      if (response.ok) {
        await fetchUsers(); // Refresh from server
        return { success: true };
      }
      
      return { success: false };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [fetchUsers]);

  // ========================================
  // ADD USERS FROM EXCEL (backward compatibility)
  // ========================================
  const addUsersFromExcel = useCallback((newUsers) => {
    setUsers(prev => [...prev, ...newUsers]);
    console.log('Users updated from upload:', newUsers.length);
  }, []);

  // Same value object as before, but only re-created when something it contains changes,
  // so consumers don't re-render on every provider render.
  const value = useMemo(() => ({
    users,
    setUsers,
    loading,
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    saveAllUsers,
    addUsersFromExcel
  }), [users, loading, fetchUsers, addUser, updateUser, deleteUser, saveAllUsers, addUsersFromExcel]);

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => useContext(UsersContext);