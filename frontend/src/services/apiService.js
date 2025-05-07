import axios from 'axios';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Set a reasonable timeout (30 seconds)
});

// Handle API errors consistently
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    const customError = {
      message: error.response?.data?.detail || 'An unexpected error occurred',
      status: error.response?.status || 500,
      data: error.response?.data || null,
    };
    
    // Log more detailed error information
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Error request:', error.request);
      customError.message = 'No response received from server. Please check your connection.';
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
      customError.message = error.message;
    }
    
    return Promise.reject(customError);
  }
);

export const apiService = {
  getDefaultCredentials: async () => {
    try {
      console.log('Fetching default credentials from backend');
      const response = await apiClient.get('/jira/default-credentials');
      console.log('Default credentials fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch default credentials', error);
      console.log('Returning empty credentials due to error');
      // Return empty defaults since we couldn't connect to backend
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
    console.log('Testing JIRA connection with:', { ...credentials, api_token: '[MASKED]' });
    const response = await apiClient.post('/jira/test-connection', credentials);
    console.log('Connection test successful:', response.data);
    return response.data;
  },
  
  visualizeJira: async (credentials) => {
    console.log('Requesting visualization with:', { ...credentials, api_token: '[MASKED]' });
    
    // Validate credentials before sending
    if (!credentials || !credentials.username || !credentials.api_token || 
        !credentials.base_url || !credentials.central_jira_id) {
      console.error('Missing required fields in credentials:', {
        hasUsername: !!credentials?.username,
        hasToken: !!credentials?.api_token,
        hasBaseUrl: !!credentials?.base_url,
        hasCentralId: !!credentials?.central_jira_id
      });
      throw new Error('Missing required credentials or Central JIRA ID for visualization');
    }
    
    try {
      const response = await apiClient.post('/jira/visualize', credentials);
      
      // Validate response data
      if (!response || !response.data) {
        console.error('Empty response received for visualization');
        throw new Error('Empty response from API');
      }
      
      // Make sure nodes and edges are arrays
      if (!Array.isArray(response.data.nodes) || !Array.isArray(response.data.edges)) {
        console.error('Invalid data format: nodes or edges are not arrays', response.data);
        
        // Try to recover by providing empty arrays if not present
        if (!response.data.nodes) response.data.nodes = [];
        if (!response.data.edges) response.data.edges = [];
      }
      
      console.log('Visualization data received, nodes:', response.data?.nodes?.length);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch visualization data:', error);
      throw error;
    }
  },

  getIssueDetails: async (credentials, issueKey) => {
    console.log(`Fetching detailed information for issue: ${issueKey}`);
    
    // Validate input parameters
    if (!credentials || !issueKey) {
      console.error('Missing credentials or issue key:', { credentials, issueKey });
      throw new Error('Missing required parameters for fetching issue details');
    }
    
    try {
      // Make sure we have all required fields with default values if missing
      const requestData = { 
        username: credentials.username || '',
        api_token: credentials.api_token || '',
        base_url: credentials.base_url || '',
        project_id: credentials.project_id || '',
        issue_key: issueKey 
      };
      
      // Additional validation
      if (!requestData.base_url || !requestData.username || !requestData.api_token) {
        console.error('Missing required credential fields:', 
          { hasBaseUrl: !!requestData.base_url, hasUsername: !!requestData.username, hasToken: !!requestData.api_token });
        throw new Error('Missing required credential fields');
      }
      
      console.log('Issue details request:', { ...requestData, api_token: '[MASKED]' });
      const response = await apiClient.post('/jira/issue-details', requestData);
      
      // Validate response data
      if (!response || !response.data) {
        console.error('Empty response received for issue details');
        throw new Error('Empty response from API');
      }
      
      console.log('Issue details received');
      // Return data in a consistent format with success flag
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch issue details:', error);
      
      // Return structured error response instead of throwing
      return {
        success: false,
        error: error.message || 'Failed to fetch issue details',
        data: null
      };
    }
  },
};

export default apiService;
