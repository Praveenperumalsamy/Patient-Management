  import React from 'react';
  import Sidebar from '../components/Slidebar';
  import './Dashboard.css';

  const Dashboard = () => {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-main">
          <h1>Welcome, Admin</h1>
          <div className="dashboard-cards">
            <div className="card">
              <h3>Total Patients</h3>
              <p>150</p>
            </div>
            <div className="card">
              <h3>Appointments Today</h3>
              <p>24</p>
            </div>
            <div className="card">
              <h3>Reports Uploaded</h3>
              <p>38</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  export default Dashboard;
