import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error("Error caught in ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <Paper elevation={3} sx={{ p: 4, maxWidth: 600, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom color="error">
              Something went wrong
            </Typography>
            <Typography variant="body1" paragraph>
              We've encountered an error while displaying this content.
            </Typography>
            <Typography variant="body2" sx={{ mt: 2, mb: 3, textAlign: 'left', backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
              {this.state.error && this.state.error.toString()}
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => {
                window.location.href = '/';
              }}
            >
              Return to Home
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
