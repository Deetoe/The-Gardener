import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Registration = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [discordId, setDiscordId] = useState('');
  const [farmName, setFarmName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const id = searchParams.get('discord_id');
    if (!id) {
      navigate('/signin');
    } else {
      setDiscordId(id);
    }
  }, [searchParams, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    if (!farmName.trim()) {
      setError('Farm name is required');
      setIsLoading(false);
      return;
    }
    
    try {
      // Create new farm for the user
      const response = await axios.post(`${API_URL}/farm`, {
        discordId,
        farmName: farmName.trim()
      });
      
      if (response.data && response.data.farm) {
        // After successful farm creation, sign in the user
        const loginResponse = await axios.get(`${API_URL}/auth/login`);
        window.location.href = loginResponse.data.url;
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.message || 'Failed to create your farm. Please try again.');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2 text-green-600 text-center">Welcome to The Gardener!</h1>
        <p className="mb-6 text-gray-600 text-center">Let's create your farm to get started.</p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="farmName" className="block text-gray-700 font-medium mb-2">
              Farm Name
            </label>
            <input
              type="text"
              id="farmName"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="Enter a name for your farm"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              maxLength={30}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md mt-4 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Creating Farm...' : 'Create My Farm'}
          </button>
        </form>
        
        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>Your farm will start with 500 coins to buy your first plots!</p>
        </div>
      </div>
    </div>
  );
};

export default Registration;