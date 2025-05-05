import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import JiraForm from './components/JiraForm';
import JiraVisualization from './components/JiraVisualization';
import AppHeader from './components/AppHeader';
import NotFound from './components/NotFound';

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
  const [graphData, setGraphData] = useState(null);

  const handleVisualizationData = (data) => {
    setGraphData(data);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppHeader />
        <Routes>
          <Route path="/" element={<JiraForm onVisualizationData={handleVisualizationData} />} />
          <Route
            path="/visualization"
            element={<JiraVisualization data={graphData} />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
