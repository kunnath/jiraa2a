import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import JiraForm from './components/JiraForm';
import JiraVisualization from './components/JiraVisualization';
import AppHeader from './components/AppHeader';
import NotFound from './components/NotFound';
import ErrorBoundary from './components/ErrorBoundary';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0052CC', // JIRA blue
    },
    secondary: {
      main: '#00875A', // JIRA green
    },
    error: {
      main: '#DE350B', // JIRA red
    },
    background: {
      default: '#F4F5F7', // Light gray background
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
  },
});

function App() {
  // Try to load saved data from session storage first
  const [graphData, setGraphData] = useState(() => {
    const savedData = sessionStorage.getItem('jiraVisualizationData');
    return savedData ? JSON.parse(savedData) : null;
  });

  const handleVisualizationData = (data) => {
    // Save to state and session storage
    setGraphData(data);
    sessionStorage.setItem('jiraVisualizationData', JSON.stringify(data));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppHeader />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<JiraForm onVisualizationData={handleVisualizationData} />} />
            <Route
              path="/visualization"
              element={<JiraVisualization data={graphData} />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </Router>
    </ThemeProvider>
  );
}

export default App;
