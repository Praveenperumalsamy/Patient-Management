// components/AdminNavbar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const AdminNavbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <h2>Admin Panel</h2>
      </div>
      <div className="nav-right">
        <button onClick={() => navigate("/op-history")}>OP History</button>
        <button onClick={() => navigate("/patient-details")}>Patient Details</button>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
};

export default AdminNavbar;
