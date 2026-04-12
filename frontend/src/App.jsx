import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PoliceDashboard from './components/PoliceDashboard';
import CitizenUpload from './components/CitizenUpload';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './components/LandingPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <PoliceDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/report" element={<CitizenUpload />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
