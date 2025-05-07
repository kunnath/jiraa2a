import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';

// Status colors for different test states
const statusColors = {
  'Draft': 'default',
  'Ready': 'info',
  'Created': 'primary',
  'In Progress': 'secondary',
  'Passed': 'success',
  'Failed': 'error',
  'Blocked': 'warning',
  'Pending': 'warning'
};

/**
 * Modal for displaying test case status
 */
const TestCaseStatusModal = ({ open, onClose, issueKey }) => {
  const [loading, setLoading] = useState(true);
  const [testCases, setTestCases] = useState([]);
  
  // Simulate loading test cases from API
  useEffect(() => {
    if (open && issueKey) {
      // Reset state when modal opens
      setLoading(true);
      setTestCases([]);
      
      // Simulate API call delay
      const timer = setTimeout(() => {
        // Mock data for demonstration
        // In a real implementation, you would fetch this data from the JIRA/Xray API
        const mockTestCases = [
          { 
            id: 'TC-001', 
            key: `TEST-${Math.floor(Math.random() * 1000)}`,
            summary: `Test case for ${issueKey} - Login validation`, 
            status: 'Passed',
            lastRun: '2025-04-28',
            executionTime: '1m 24s'
          },
          { 
            id: 'TC-002', 
            key: `TEST-${Math.floor(Math.random() * 1000)}`,
            summary: `Test case for ${issueKey} - Form submission`, 
            status: 'Failed',
            lastRun: '2025-05-01',
            executionTime: '0m 47s',
            defects: ['BUG-123']
          },
          { 
            id: 'TC-003', 
            key: `TEST-${Math.floor(Math.random() * 1000)}`,
            summary: `Test case for ${issueKey} - Error handling`, 
            status: 'Pending',
            lastRun: '-',
            executionTime: '-'
          },
          { 
            id: 'TC-004', 
            key: `TEST-${Math.floor(Math.random() * 1000)}`,
            summary: `Test case for ${issueKey} - API integration`, 
            status: 'Draft',
            lastRun: '-',
            executionTime: '-'
          }
        ];
        
        setTestCases(mockTestCases);
        setLoading(false);
      }, 1200);
      
      return () => clearTimeout(timer);
    }
  }, [open, issueKey]);
  
  // Calculate test status statistics
  const stats = testCases.reduce((acc, test) => {
    acc.total++;
    acc[test.status.toLowerCase()] = (acc[test.status.toLowerCase()] || 0) + 1;
    return acc;
  }, { total: 0, passed: 0, failed: 0, pending: 0, draft: 0 });
  
  // Calculate pass rate
  const passRate = stats.total > 0 
    ? Math.round((stats.passed / stats.total) * 100) 
    : 0;
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Test Case Status for {issueKey}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Test cases related to {issueKey}
            </Typography>
            
            {testCases.length > 0 ? (
              <>
                {/* Test Status Summary */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    my: 2,
                    p: 2,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 1
                  }}
                >
                  <Box>
                    <Typography variant="h6">
                      {stats.total} Test Cases
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        label={`${stats.passed} Passed`} 
                        color="success" 
                        size="small" 
                        variant="outlined"
                      />
                      <Chip 
                        label={`${stats.failed || 0} Failed`} 
                        color="error" 
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        label={`${stats.pending || 0} Pending`} 
                        color="warning" 
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        label={`${stats.draft || 0} Draft`} 
                        color="default" 
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress 
                      variant="determinate" 
                      value={passRate} 
                      color={passRate > 80 ? 'success' : passRate > 50 ? 'warning' : 'error'}
                      size={60}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" component="div">
                        {`${passRate}%`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* Test Case List */}
                <List sx={{ width: '100%' }}>
                  {testCases.map((testCase, index) => (
                    <Box key={testCase.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle2">
                                {testCase.key} - {testCase.summary}
                              </Typography>
                              <Chip 
                                label={testCase.status} 
                                color={statusColors[testCase.status] || 'default'} 
                                size="small" 
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" component="span">
                                Last run: {testCase.lastRun} | Execution time: {testCase.executionTime}
                              </Typography>
                              {testCase.defects && testCase.defects.length > 0 && (
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="body2" component="span">
                                    Defects: 
                                  </Typography>
                                  {testCase.defects.map((defect) => (
                                    <Chip 
                                      key={defect}
                                      label={defect} 
                                      color="error" 
                                      size="small" 
                                      sx={{ ml: 1 }}
                                    />
                                  ))}
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < testCases.length - 1 && <Divider component="li" />}
                    </Box>
                  ))}
                </List>
              </>
            ) : (
              <Box sx={{ my: 3, textAlign: 'center' }}>
                <Typography variant="body1">
                  No test cases found for this issue.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  sx={{ mt: 2 }}
                >
                  Create Test Case
                </Button>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TestCaseStatusModal;
