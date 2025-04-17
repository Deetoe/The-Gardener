import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CropDetails = () => {
  const [crops, setCrops] = useState([]);

  useEffect(() => {
    // Fetch crop details from the backend
    axios.get('/api/crops')
      .then(response => setCrops(response.data))
      .catch(error => console.log(error));
  }, []);

  return (
    <div>
      <h1>Your Crops</h1>
      <ul>
        {crops.map((crop, index) => (
          <li key={index}>{crop.name} - {crop.status}</li>
        ))}
      </ul>
    </div>
  );
};

export default CropDetails;