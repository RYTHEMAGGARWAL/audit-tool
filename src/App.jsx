import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UsersProvider } from './contexts/UsersContext';
import Login from './Components/Login';
import Admin from './Components/Admin';
import UserDashboard from './Components/UserDashboard';
import PlacementDashboard from './Components/PlacementDashboard';
import CenterDashboard from './Components/CenterDashboard';
import HierarchyDashboard from './Components/HierarchyDashboard';
import RoleDashboard from './Components/RoleDashboard';
import NationalHeadDashboard from './Components/NationalHeadDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <UsersProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/center-dashboard" element={<CenterDashboard />} />
            {/* RoleDashboard — all hierarchy roles (Zonal Manager, Region Head, Area/Cluster Manager, Placement roles) */}
            <Route path="/hierarchy-dashboard" element={<RoleDashboard />} />
            <Route path="/role-dashboard" element={<RoleDashboard />} />
            <Route path="/national-head" element={<NationalHeadDashboard />} />
            <Route path="/placement-dashboard" element={<PlacementDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </UsersProvider>
    </Router>
  );
}

export default App;