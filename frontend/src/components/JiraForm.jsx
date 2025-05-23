import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Container,
  CircularProgress,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { apiService } from '../services/apiService';

const JiraForm = ({ onVisualizationData }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    api_token: '',
    base_url: '',
    project_id: '',
    central_jira_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [useDefaultCredentials, setUseDefaultCredentials] = useState(true);
  const [visualizeWholeProject, setVisualizeWholeProject] = useState(false);
  const [defaultCredentials, setDefaultCredentials] = useState(null);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);

  // Fetch default credentials when component mounts
  useEffect(() => {
    const fetchDefaultCredentials = async () => {
      try {
        const credentials = await apiService.getDefaultCredentials();
        setDefaultCredentials(credentials);
        
        // Pre-fill form with default values if they exist
        if (useDefaultCredentials) {
          setFormData(prev => ({
            ...prev,
            username: credentials.username || '',
            api_token: credentials.api_token || '',
            base_url: credentials.base_url || '',
            project_id: credentials.project_id || ''
          }));
        }
      } catch (err) {
        console.error("Failed to load default credentials:", err);
      } finally {
        setIsLoadingDefaults(false);
      }
    };

    fetchDefaultCredentials();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const toggleDefaultCredentials = (e) => {
    const useDefaults = e.target.checked;
    setUseDefaultCredentials(useDefaults);
    
    if (useDefaults && defaultCredentials) {
      setFormData(prev => ({
        ...prev,
        username: defaultCredentials.username || '',
        api_token: defaultCredentials.api_token || '',
        base_url: defaultCredentials.base_url || '',
        project_id: defaultCredentials.project_id || '',
        central_jira_id: prev.central_jira_id // Keep user input
      }));
    }
  };

  const testConnection = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.testJiraConnection(formData);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to connect to JIRA');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Sending data to backend:', formData);
      
      // Save credentials to session storage 
      // Note: In a production app, you would handle this more securely
      // This is only for demonstration purposes to enable the description feature
      sessionStorage.setItem('jiraFormData', JSON.stringify(formData));
      sessionStorage.setItem('jiraCredentials', JSON.stringify({
        username: formData.username,
        api_token: formData.api_token,
        base_url: formData.base_url,
        project_id: formData.project_id
      }));
      
      let data;
      
      // Visualize entire project if the checkbox is checked
      if (visualizeWholeProject) {
        // Make sure project_id is set to LEARNJIRA if not specified
        const projectData = {
          ...formData,
          project_id: formData.project_id || 'LEARNJIRA'
        };
        
        console.log('Visualizing entire project:', projectData.project_id);
        setError(null); // Clear any previous errors
        
        try {
          // Show a loading message for large project loads
          setTimeout(() => {
            if (loading) {
              setError('Loading all issues from project - this may take some time for large projects...');
            }
          }, 2000);
          
          data = await apiService.visualizeJiraProject(projectData);
          
          console.log(`Loaded ${data.nodes?.length || 0} issues from project ${projectData.project_id}`);
        } catch (err) {
          console.error("Error visualizing project:", err);
          throw err; // Re-throw to be caught by outer catch block
        }
      }
      // Otherwise, visualize a specific issue if central_jira_id is provided
      else if (formData.central_jira_id && formData.central_jira_id.trim()) {
        data = await apiService.visualizeJira(formData);
      }
      // If neither option is chosen, just navigate to the visualization page
      else {
        navigate('/visualization');
        return;
      }
      
      console.log('Received visualization data:', data);
      
      if (!data || !data.nodes || !data.edges) {
        throw new Error('Invalid data format received from API');
      }
      
      if (data.nodes.length === 0) {
        throw new Error('No JIRA issues found for visualization');
      }
      
      onVisualizationData(data);
      navigate('/visualization');
    } catch (err) {
      console.error('Visualization error:', err);
      setError(err.message || 'Failed to fetch JIRA data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    // Required fields for all scenarios
    const baseRequiredFields = ['username', 'api_token', 'base_url'];
    let requiredFields = [...baseRequiredFields];
    
    // If visualizing whole project, project_id is optional (will default to LEARNJIRA)
    if (visualizeWholeProject) {
      // We won't add project_id as required - LEARNJIRA will be used as default
      console.log('Visualizing all issues with project ID:', formData.project_id || 'LEARNJIRA');
    }
    // Add central_jira_id as required if not visualizing whole project and no project_id
    else if (!formData.central_jira_id && !formData.project_id) {
      setError('Please provide either a Project ID or a Central JIRA ID');
      return false;
    }
    
    for (const key of requiredFields) {
      if (!formData[key].trim()) {
        setError(`Please fill in the ${key.replace('_', ' ')}`);
        return false;
      }
    }
    
    // Validate URL format
    if (!formData.base_url.match(/^https?:\/\/.+/)) {
      setError('Base URL must start with http:// or https://');
      return false;
    }
    
    // Remove trailing slash if exists
    if (formData.base_url.endsWith('/')) {
      setFormData({ ...formData, base_url: formData.base_url.slice(0, -1) });
    }
    
    // Validate project_id format if visualizing whole project and project_id is provided
    if (visualizeWholeProject && formData.project_id && !formData.project_id.match(/^[A-Z0-9]+$/)) {
      setError('Project ID should typically be uppercase letters (e.g., LEARNJIRA)');
      return false;
    }
    
    return true;
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          InteliQa.Ai
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Connect to JIRA and visualize the relationships between issues
        </Typography>
        
        {isLoadingDefaults ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress size={40} />
          </Box>
        ) : (
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={useDefaultCredentials}
                  onChange={toggleDefaultCredentials}
                  color="primary"
                />
              }
              label="Use default credentials from .env file"
            />
          </Box>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="JIRA Username or Email"
            name="username"
            autoComplete="username"
            value={formData.username}
            onChange={handleChange}
            disabled={isLoadingDefaults}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="api_token"
            label="JIRA API Token"
            type="password"
            id="api_token"
            autoComplete="current-password"
            value={formData.api_token}
            onChange={handleChange}
            disabled={isLoadingDefaults}
            helperText="Get your token from https://id.atlassian.com/manage-profile/security/api-tokens"
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="base_url"
            label="JIRA Base URL"
            name="base_url"
            placeholder="https://example.atlassian.net"
            value={formData.base_url}
            onChange={handleChange}
            disabled={isLoadingDefaults}
          />
          <TextField
            margin="normal"
            fullWidth
            id="project_id"
            label={"Project ID"}
            name="project_id"
            placeholder={"LEARNJIRA"}
            value={formData.project_id}
            onChange={handleChange}
            disabled={isLoadingDefaults}
            helperText={visualizeWholeProject ? "LEARNJIRA will be used as default if empty" : "Optional: LEARNJIRA will be used if left empty"}
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={visualizeWholeProject}
                onChange={(e) => setVisualizeWholeProject(e.target.checked)}
                color="primary"
              />
            }
            label="Visualize all issues in the project"
            sx={{ mt: 2, mb: 1 }}
          />
          
          <TextField
            margin="normal"
            required={!visualizeWholeProject && !formData.project_id}
            fullWidth
            id="central_jira_id"
            label={visualizeWholeProject ? "Central JIRA ID (Optional)" : "Central JIRA ID"}
            name="central_jira_id"
            placeholder="e.g. PROJECT-123"
            value={formData.central_jira_id}
            onChange={handleChange}
            helperText={visualizeWholeProject 
              ? "Optional when visualizing all issues" 
              : "Required if Project ID is not provided"
            }
            disabled={visualizeWholeProject}
          />
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={testConnection}
              disabled={loading}
            >
              Test Connection
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              Visualize
            </Button>
            {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}
          </Box>
        </Box>
      </Paper>
      
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          Successfully connected to JIRA!
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default JiraForm;
