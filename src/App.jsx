import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from '../src/components/login';
import Dashboard from '../src/components/Dashboard';
import OPHistory from '../src/components/Ophistory';
import PatientDetails from './components/PatientDetails';

function Logout({ onLogout }) {
  useEffect(() => {
    onLogout();
  }, [onLogout]);

  return <Navigate to="/" replace />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(auth);
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.setItem('isAuthenticated', 'false');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Public route for Login */}
        <Route path="/" element={<Login onLogin={() => setIsAuthenticated(true)} />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/op-history"
          element={isAuthenticated ? <OPHistory /> : <Navigate to="/" replace />}
        />
        <Route
          path="/patient-details"
          element={isAuthenticated ? <PatientDetails /> : <Navigate to="/" replace />}
        />

        {/* Logout route using a safe component */}
        <Route path="/logout" element={<Logout onLogout={handleLogout} />} />

        {/* Fallback for invalid paths */}
        <Route
          path="*"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
