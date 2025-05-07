import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Typography,
  Box,
  Alert
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const TestCaseGenerationModal = ({ open, onClose, isGenerating, error }) => {
  return (
    <Dialog open={open} onClose={isGenerating ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Generating Test Case
      </DialogTitle>
      <DialogContent>
        {isGenerating ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
            <LinearProgress sx={{ width: '100%', mb: 2 }} />
            <Typography variant="body1" gutterBottom>
              Generating test case using AI...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This may take a few moments. The system is analyzing issue details and creating a structured test case.
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="body1">
              Test case was generated successfully!
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              You can now view the test case in the "Test Case" tab.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {!isGenerating && (
          <Button onClick={onClose}>
            {error ? 'Close' : 'View Test Case'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TestCaseGenerationModal;
