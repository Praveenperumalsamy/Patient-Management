import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserInjured, FaClipboard, FaSignOutAlt, FaChartBar } from 'react-icons/fa';
import './Slidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/');
  };

  return (
    <div className="sidebar">
      <h2>Admin</h2>
      <ul>
        <li><Link to="/dashboard"><FaChartBar /> Dashboard</Link></li>
        <li><Link to="/patient-details"><FaUserInjured /> Patient Details</Link></li>
        <li><Link to="/op-history"><FaClipboard /> OP History</Link></li>
        <li onClick={handleLogout}><FaSignOutAlt /> Logout</li>
      </ul>
    </div>
  );
};

export default Sidebar;
