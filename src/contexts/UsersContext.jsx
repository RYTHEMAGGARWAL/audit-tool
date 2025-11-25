import React, { createContext, useState, useContext } from 'react';

const UsersContext = createContext();

export const UsersProvider = ({ children }) => {
  const [users, setUsers] = useState([]); // Loaded from Excel initially

  const addUsersFromExcel = (newUsers) => {
    setUsers(prev => [...prev, ...newUsers]);
    console.log('Users updated from upload:', newUsers);
  };

  const updateUser = (updatedUser) => {
    setUsers(prev => prev.map(u => u.username === updatedUser.username ? updatedUser : u));
  };

  return (
    <UsersContext.Provider value={{ users, setUsers, addUsersFromExcel, updateUser }}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => useContext(UsersContext);