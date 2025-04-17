import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BusinessList = () => {
  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    // Fetch business data from the backend
    axios.get('/api/businesses')
      .then(response => setBusinesses(response.data))
      .catch(error => console.log(error));
  }, []);

  return (
    <div>
      <h1>Your Businesses</h1>
      <ul>
        {businesses.map((business, index) => (
          <li key={index}>{business.name} - {business.income}</li>
        ))}
      </ul>
    </div>
  );
};

export default BusinessList;