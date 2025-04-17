import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FarmOverview = () => {
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    // Fetch user data (coins) from the backend
    axios.get('/api/farm')
      .then(response => setCoins(response.data.coins))
      .catch(error => console.log(error));
  }, []);

  return (
    <div>
      <h1>Your Farm Overview</h1>
      <p>Coins: {coins}</p>
      {/* Add other details like current crops, etc. */}
    </div>
  );
};

export default FarmOverview;