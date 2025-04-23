import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FarmService from '../services/FarmService';

const Dashboard = () => {
  const [farm, setFarm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('farm');
  const [cropTypes, setCropTypes] = useState([]);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [plantAmount, setPlantAmount] = useState(1);
  const [actionInProgress, setActionInProgress] = useState(false);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const discordId = localStorage.getItem('discordId');
    
    if (!token || !discordId) {
      navigate('/signin');
      return;
    }
    
    fetchFarmData(discordId);
    fetchCropTypes();
  }, []);
  
  const fetchFarmData = async (discordId) => {
    setIsLoading(true);
    try {
      const data = await FarmService.getFarmDetails(discordId);
      setFarm(data);
    } catch (error) {
      console.error('Error fetching farm data:', error);
      
      if (error.response && error.response.status === 401) {
        // Unauthorized - token expired or invalid
        localStorage.removeItem('authToken');
        localStorage.removeItem('discordId');
        navigate('/signin');
      } else if (error.response && error.response.status === 404) {
        // User doesn't have a farm yet
        setError('You need to create a farm first!');
      } else {
        setError('Failed to load farm data. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchCropTypes = async () => {
    try {
      const data = await FarmService.getCropTypes();
      setCropTypes(data.cropTypes || []);
    } catch (error) {
      console.error('Error fetching crop types:', error);
    }
  };
  
  const handlePlantCrops = async () => {
    if (!selectedPlot || !selectedCrop) {
      setError('Please select a plot and crop type');
      return;
    }
    
    setActionInProgress(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await FarmService.plantCrops(
        selectedPlot.id,
        selectedCrop,
        plantAmount
      );
      
      setSuccess(`Successfully planted ${plantAmount} ${selectedCrop}!`);
      refreshFarmData();
    } catch (error) {
      console.error('Error planting crops:', error);
      setError(error.response?.data?.message || 'Failed to plant crops');
    } finally {
      setActionInProgress(false);
    }
  };
  
  const handleHarvestCrops = async (plotId) => {
    setActionInProgress(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await FarmService.harvestCrops(plotId);
      
      setSuccess(`Harvested crops for ${result.coins} coins!`);
      refreshFarmData();
    } catch (error) {
      console.error('Error harvesting crops:', error);
      setError(error.response?.data?.message || 'Failed to harvest crops');
    } finally {
      setActionInProgress(false);
    }
  };
  
  const handleBuyPlot = async () => {
    setActionInProgress(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await FarmService.buyPlot();
      
      setSuccess('You bought a new plot!');
      refreshFarmData();
    } catch (error) {
      console.error('Error buying plot:', error);
      setError(error.response?.data?.message || 'Failed to buy plot');
    } finally {
      setActionInProgress(false);
    }
  };
  
  const handleUpgradePlot = async (plotId) => {
    setActionInProgress(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await FarmService.upgradePlot(plotId);
      
      setSuccess('Plot upgraded successfully!');
      refreshFarmData();
    } catch (error) {
      console.error('Error upgrading plot:', error);
      setError(error.response?.data?.message || 'Failed to upgrade plot');
    } finally {
      setActionInProgress(false);
    }
  };
  
  const refreshFarmData = () => {
    const discordId = localStorage.getItem('discordId');
    if (discordId) {
      fetchFarmData(discordId);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('discordId');
    navigate('/signin');
  };
  
  const isPlotReadyToHarvest = (plot) => {
    return plot.harvest_time && new Date() >= new Date(plot.harvest_time);
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="animate-spin h-12 w-12 border-4 border-green-500 rounded-full border-t-transparent"></div>
        <p className="mt-4 text-lg">Loading your farm...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Error</h2>
          <p className="mb-6">{error}</p>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      {/* Farm Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-green-600">{farm?.farmName || 'My Farm'}</h1>
          <div className="flex items-center">
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium mr-4">
              <span role="img" aria-label="coins">💰</span> {farm?.coins || 0} coins
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        {/* Success/Error Messages */}
        {success && (
          <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}
        
        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'farm'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('farm')}
            >
              My Farm
            </button>
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'plant'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('plant')}
            >
              Plant Crops
            </button>
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('manage')}
            >
              Manage Plots
            </button>
          </nav>
        </div>
      </div>
      
      {/* Farm Overview Tab */}
      {activeTab === 'farm' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Your Plots</h2>
          {farm && farm.plots && farm.plots.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {farm.plots.map((plot) => {
                const isReady = isPlotReadyToHarvest(plot);
                const cropEmojis = {
                  'wheat': '🌾',
                  'corn': '🌽',
                  'carrot': '🥕',
                  'empty': '🟫'
                };
                const emoji = cropEmojis[plot.plot_type] || '🌱';
                
                return (
                  <div 
                    key={plot.id}
                    className={`border rounded-lg p-4 ${isReady ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xl">{emoji}</span>
                      <span className="text-sm bg-gray-200 px-2 py-1 rounded">Level {plot.level}</span>
                    </div>
                    <h3 className="font-semibold capitalize mb-1">{plot.plot_type} Plot</h3>
                    <div className="text-sm text-gray-600">
                      <div>Capacity: {plot.capacity}</div>
                      <div>Planted: {plot.current_crops}/{plot.capacity}</div>
                      {plot.current_crops > 0 && (
                        <div className={`mt-2 ${isReady ? 'text-green-600 font-semibold' : 'text-amber-600'}`}>
                          {isReady ? '✅ Ready to harvest!' : '⏳ Growing...'}
                        </div>
                      )}
                    </div>
                    
                    {plot.current_crops > 0 && isReady && (
                      <button
                        onClick={() => handleHarvestCrops(plot.id)}
                        disabled={actionInProgress}
                        className={`mt-3 w-full bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded text-sm ${
                          actionInProgress ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Harvest
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">You don't have any plots yet. Go to the "Manage Plots" tab to buy your first plot!</p>
          )}
        </div>
      )}
      
      {/* Plant Crops Tab */}
      {activeTab === 'plant' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Plant Crops</h2>
          
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-2">Step 1: Select a Plot</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {farm && farm.plots && farm.plots.map((plot) => {
                // Only show empty plots or plots with space
                if (plot.current_crops < plot.capacity) {
                  const isSelected = selectedPlot && selectedPlot.id === plot.id;
                  const availableSpace = plot.capacity - plot.current_crops;
                  
                  return (
                    <button
                      key={plot.id}
                      onClick={() => setSelectedPlot(plot)}
                      className={`border p-3 rounded text-left ${
                        isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Plot #{plot.id}</span>
                        <span className="text-sm bg-gray-200 px-2 py-0.5 rounded">
                          Level {plot.level}
                        </span>
                      </div>
                      <div className="mt-1 text-sm">
                        <div>Available space: {availableSpace}/{plot.capacity}</div>
                        {isSelected && (
                          <div className="text-green-600 mt-1">✓ Selected</div>
                        )}
                      </div>
                    </button>
                  );
                }
                return null;
              })}
            </div>
            
            {(!farm || !farm.plots || farm.plots.length === 0 || 
             farm.plots.every(plot => plot.current_crops >= plot.capacity)) && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                <p className="text-amber-700">
                  No plots available for planting. Either buy a new plot or wait until you harvest your current crops.
                </p>
              </div>
            )}
          </div>
          
          {selectedPlot && (
            <>
              <h3 className="font-semibold text-lg mb-2">Step 2: Select a Crop</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {cropTypes.map((cropType) => (
                  <button
                    key={cropType}
                    onClick={() => setSelectedCrop(cropType)}
                    className={`border p-3 rounded text-center ${
                      selectedCrop === cropType ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <span className="text-2xl block mb-1">
                      {cropType === 'wheat' ? '🌾' : cropType === 'corn' ? '🌽' : '🥕'}
                    </span>
                    <span className="capitalize">{cropType}</span>
                    {selectedCrop === cropType && (
                      <div className="text-green-600 mt-1 text-sm">✓ Selected</div>
                    )}
                  </button>
                ))}
              </div>
              
              <h3 className="font-semibold text-lg mb-2">Step 3: How Many?</h3>
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setPlantAmount(Math.max(1, plantAmount - 1))}
                    className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center"
                    disabled={plantAmount <= 1}
                  >
                    -
                  </button>
                  <span className="text-lg font-medium">{plantAmount}</span>
                  <button
                    onClick={() => setPlantAmount(Math.min(selectedPlot.capacity - selectedPlot.current_crops, plantAmount + 1))}
                    className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center"
                    disabled={plantAmount >= selectedPlot.capacity - selectedPlot.current_crops}
                  >
                    +
                  </button>
                  <span className="text-gray-500">
                    (Max: {selectedPlot.capacity - selectedPlot.current_crops})
                  </span>
                </div>
              </div>
              
              <button
                onClick={handlePlantCrops}
                disabled={!selectedPlot || !selectedCrop || actionInProgress}
                className={`bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md ${
                  !selectedPlot || !selectedCrop || actionInProgress ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {actionInProgress ? 'Planting...' : 'Plant Crops'}
              </button>
            </>
          )}
        </div>
      )}
      
      {/* Manage Plots Tab */}
      {activeTab === 'manage' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Manage Plots</h2>
          
          <div className="mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">Buy a New Plot</h3>
              <p className="text-gray-600 mb-4">
                Each new plot costs {farm?.plots?.length ? (farm.plots.length * 200) : 200} coins.
              </p>
              <button
                onClick={handleBuyPlot}
                disabled={actionInProgress || (farm?.coins < (farm?.plots?.length * 200))}
                className={`bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md ${
                  actionInProgress || (farm?.coins < (farm?.plots?.length * 200)) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {actionInProgress ? 'Processing...' : `Buy Plot (${farm?.plots?.length ? (farm.plots.length * 200) : 200} coins)`}
              </button>
            </div>
          </div>
          
          <h3 className="font-semibold text-lg mb-2">Upgrade Existing Plots</h3>
          {farm && farm.plots && farm.plots.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {farm.plots.map((plot) => {
                const upgradeCost = plot.level * 500;
                
                return (
                  <div key={plot.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Plot #{plot.id}</h4>
                      <span className="text-sm bg-gray-200 px-2 py-1 rounded">Level {plot.level}</span>
                    </div>
                    <p className="text-gray-600 mb-3">
                      Capacity: {plot.capacity} {plot.plot_type !== 'empty' && `(${plot.plot_type})`}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Upgrade cost: {upgradeCost} coins
                      </span>
                      <button
                        onClick={() => handleUpgradePlot(plot.id)}
                        disabled={actionInProgress || farm.coins < upgradeCost}
                        className={`bg-purple-500 hover:bg-purple-600 text-white font-medium py-1 px-3 rounded-md text-sm ${
                          actionInProgress || farm.coins < upgradeCost ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Upgrade
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">You don't have any plots yet. Buy your first plot to get started!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;