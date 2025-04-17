import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import FarmOverview from './components/FarmOverview';
import CropDetails from './components/CropDetails';
import BusinessList from './components/BusinessList';

function App() {
  return (
    <Router>
      <div className="App">
        <h1>Farm Game Dashboard</h1>
        <nav>
          <a href="/">Farm Overview</a> | 
          <a href="/crops">Crops</a> | 
          <a href="/businesses">Businesses</a>
        </nav>
        <Routes>
          <Route path="/" element={<FarmOverview />} />
          <Route path="/crops" element={<CropDetails />} />
          <Route path="/businesses" element={<BusinessList />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;