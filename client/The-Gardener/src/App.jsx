import React, { createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './components/landingPage';
import SignIn from './components/SignIn';
import Dashboard from './components/Dashboard';
import AuthSuccess from './components/AuthSuccess';
import Registration from './components/Registration';
import './App.css';

// Create API context for global access
export const ApiContext = createContext();

const App = () => {
  // API URL from environment variables
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  
  // Check if user is authenticated
  const isAuthenticated = () => {
    return localStorage.getItem('authToken') && localStorage.getItem('discordId');
  };

  // Protected route component
  const ProtectedRoute = ({ element }) => {
    return isAuthenticated() ? element : <Navigate to="/signin" />;
  };

  return (
    <ApiContext.Provider value={{ apiUrl }}>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/auth-success" element={<AuthSuccess />} />
          <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
        </Routes> 
      </Router>
    </ApiContext.Provider>
  );
}

export default App;