import { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  FormHelperText
} from '@mui/material';

/**
 * Modal for creating a test case in Xray format
 */
const CreateTestCaseModal = ({ open, onClose, issueData }) => {
  const [testCaseData, setTestCaseData] = useState({
    summary: issueData ? `Test for ${issueData.key}: ${issueData.summary}` : '',
    description: '',
    precondition: '',
    steps: [{ step: '', expected: '', data: '' }],
    type: 'Manual',
    priority: 'Medium'
  });
  
  const handleInputChange = (field, value) => {
    setTestCaseData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleStepChange = (index, field, value) => {
    const updatedSteps = [...testCaseData.steps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      [field]: value
    };
    
    setTestCaseData(prev => ({
      ...prev,
      steps: updatedSteps
    }));
  };
  
  const addStep = () => {
    setTestCaseData(prev => ({
      ...prev,
      steps: [...prev.steps, { step: '', expected: '', data: '' }]
    }));
  };
  
  const removeStep = (index) => {
    if (testCaseData.steps.length <= 1) return;
    
    const updatedSteps = [...testCaseData.steps];
    updatedSteps.splice(index, 1);
    
    setTestCaseData(prev => ({
      ...prev,
      steps: updatedSteps
    }));
  };
  
  const handleSubmit = () => {
    // Here you would implement the API call to create the test case in Xray
    // For now, we'll just log the data and close the dialog
    console.log('Creating test case:', testCaseData);
    
    // Mock API call response
    setTimeout(() => {
      alert(`Test case created for ${issueData.key}`);
      onClose();
    }, 1000);
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Create Test Case in XRay Format</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Related Issue: {issueData?.key} - {issueData?.summary}
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Test Summary"
                value={testCaseData.summary}
                onChange={(e) => handleInputChange('summary', e.target.value)}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Test Description"
                value={testCaseData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={3}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Precondition"
                value={testCaseData.precondition}
                onChange={(e) => handleInputChange('precondition', e.target.value)}
                multiline
                rows={2}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={testCaseData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                >
                  <MenuItem value="Manual">Manual</MenuItem>
                  <MenuItem value="Automated">Automated</MenuItem>
                  <MenuItem value="Cucumber">Cucumber</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={testCaseData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                >
                  <MenuItem value="Highest">Highest</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Lowest">Lowest</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
            Test Steps
          </Typography>
          
          {testCaseData.steps.map((step, index) => (
            <Box 
              key={index} 
              sx={{ 
                mb: 3, 
                p: 2, 
                border: '1px solid #e0e0e0', 
                borderRadius: 1,
                backgroundColor: '#fafafa'
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">Step {index + 1}</Typography>
                    {testCaseData.steps.length > 1 && (
                      <Button 
                        size="small" 
                        color="error" 
                        onClick={() => removeStep(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Step Description"
                    value={step.step}
                    onChange={(e) => handleStepChange(index, 'step', e.target.value)}
                    fullWidth
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Expected Result"
                    value={step.expected}
                    onChange={(e) => handleStepChange(index, 'expected', e.target.value)}
                    fullWidth
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Test Data"
                    value={step.data}
                    onChange={(e) => handleStepChange(index, 'data', e.target.value)}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>
          ))}
          
          <Button 
            variant="outlined" 
            color="primary" 
            fullWidth 
            onClick={addStep}
            sx={{ mb: 2 }}
          >
            Add Step
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubmit}
          disabled={!testCaseData.summary || testCaseData.steps.some(step => !step.step || !step.expected)}
        >
          Create Test Case
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTestCaseModal;
