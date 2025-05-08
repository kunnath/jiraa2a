import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HubIcon from '@mui/icons-material/Hub';

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppBar position="static">
      <Toolbar>
        <HubIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          InteliQa.Ai
        </Typography>
        <Box>
          {location.pathname !== '/' && (
            <Button color="inherit" onClick={() => navigate('/')}>
              Home
            </Button>
          )}
          {location.pathname === '/visualization' && (
            <Button color="inherit" onClick={() => navigate('/')}>
              New Query
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader;
