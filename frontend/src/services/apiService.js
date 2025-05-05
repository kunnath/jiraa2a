import axios from 'axios';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Handle API errors consistently
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const customError = {
      message: error.response?.data?.detail || 'An unexpected error occurred',
      status: error.response?.status || 500,
      data: error.response?.data || null,
    };
    return Promise.reject(customError);
  }
);

export const apiService = {
  getDefaultCredentials: async () => {
    try {
      const response = await apiClient.get('/jira/default-credentials');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch default credentials', error);
      return {
        username: '',
        api_token: '',
        base_url: '',
        project_id: '',
        central_jira_id: ''
      };
    }
  },

  testJiraConnection: async (credentials) => {
    const response = await apiClient.post('/jira/test-connection', credentials);
    return response.data;
  },
  
  visualizeJira: async (credentials) => {
    const response = await apiClient.post('/jira/visualize', credentials);
    return response.data;
  }
};

export default apiService;
