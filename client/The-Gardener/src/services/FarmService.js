import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Service to handle farm-related API calls
 */
class FarmService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      withCredentials: true
    });
    
    // Add auth token to all requests
    this.api.interceptors.request.use(config => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }
  
  /**
   * Get farm details for the current user
   */
  async getFarmDetails(discordId) {
    const response = await this.api.get(`/farms/${discordId}`);
    return response.data;
  }
  
  /**
   * Plant crops in a plot
   */
  async plantCrops(plotId, cropType, amount) {
    const response = await this.api.post(`/crops/plant`, {
      plotId,
      cropType,
      amount: parseInt(amount, 10)
    });
    return response.data;
  }
  
  /**
   * Harvest crops from a plot
   */
  async harvestCrops(plotId) {
    const response = await this.api.post(`/crops/harvest`, {
      plotId
    });
    return response.data;
  }
  
  /**
   * Buy a new plot
   */
  async buyPlot() {
    const response = await this.api.post(`/farms/plots/buy`);
    return response.data;
  }
  
  /**
   * Upgrade an existing plot
   */
  async upgradePlot(plotId) {
    const response = await this.api.post(`/farms/plots/upgrade`, {
      plotId
    });
    return response.data;
  }
  
  /**
   * Get available crop types
   */
  async getCropTypes() {
    const response = await this.api.get(`/crops/types`);
    return response.data;
  }
}

export default new FarmService();