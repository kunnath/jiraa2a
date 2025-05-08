import { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Chip, 
  InputAdornment,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BugReportIcon from '@mui/icons-material/BugReport';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';

/**
 * Component to display a list of all JIRA IDs in the visualization
 * @param {Object} props Component props
 * @param {Array} props.nodes Array of node objects containing JIRA data
 * @param {Function} props.onSelect Callback when a JIRA ID is selected
 */
const JiraIdsList = ({ nodes, onSelect, onFilterByType }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedJiraId, setSelectedJiraId] = useState(null);

  // Get the icon for the issue type
  const getIssueTypeIcon = (issueType) => {
    if (!issueType) return <AssignmentIcon />;
    
    const type = issueType.toLowerCase();
    if (type.includes('bug') || type.includes('defect')) return <BugReportIcon color="error" />;
    if (type.includes('test')) return <CheckCircleOutlineIcon color="success" />;
    if (type.includes('epic') || type.includes('parent')) return <AccountTreeIcon color="secondary" />;
    return <AssignmentIcon color="primary" />;
  };

  // Get chip color for issue type
  const getIssueTypeColor = (issueType) => {
    if (!issueType) return 'default';
    
    const type = issueType.toLowerCase();
    if (type.includes('bug') || type.includes('defect')) return 'error';
    if (type.includes('test')) return 'success';
    if (type.includes('epic') || type.includes('parent')) return 'secondary';
    if (type.includes('task')) return 'info';
    return 'default';
  };

  // Memoized filtered and sorted nodes
  const filteredNodes = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];

    return nodes
      .filter(node => {
        // Apply search term filter
        const matchesSearch = !searchTerm || 
          node.data.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (node.data.summary && node.data.summary.toLowerCase().includes(searchTerm.toLowerCase()));

        // Apply type filter
        const matchesType = 
          activeFilter === 'all' || 
          (node.data.issue_type && node.data.issue_type.toLowerCase().includes(activeFilter.toLowerCase()));

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        // Sort by issue key
        return a.data.key.localeCompare(b.data.key, undefined, { numeric: true });
      });
  }, [nodes, searchTerm, activeFilter]);

  // Handler for search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handler for filter menu
  const handleFilterOpen = (event) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterMenuAnchor(null);
  };

  // Handler for filter selection
  const handleFilterSelect = (filter) => {
    setActiveFilter(filter);
    setFilterMenuAnchor(null);
    
    if (onFilterByType && filter !== 'all') {
      onFilterByType(filter);
    }
  };

  // Handler for action menu
  const handleActionOpen = (event, jiraId) => {
    event.stopPropagation();
    setSelectedJiraId(jiraId);
    setActionMenuAnchor(event.currentTarget);
  };

  const handleActionClose = () => {
    setActionMenuAnchor(null);
  };

  // Get issue type counts
  const issueTypeCounts = useMemo(() => {
    if (!nodes || nodes.length === 0) return {};

    return nodes.reduce((counts, node) => {
      if (node.data.issue_type) {
        const issueType = node.data.issue_type.toLowerCase();
        counts[issueType] = (counts[issueType] || 0) + 1;
      }
      return counts;
    }, {});
  }, [nodes]);

  // Group nodes by issue type for display
  const issueTypes = Object.keys(issueTypeCounts).sort();

  return (
    <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Typography variant="h6" gutterBottom>
          All JIRA IDs
          <Badge 
            badgeContent={filteredNodes.length} 
            color="primary" 
            sx={{ ml: 1 }}
          />
        </Typography>

        <TextField
          size="small"
          fullWidth
          placeholder="Search JIRA IDs..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Filter by type">
                  <IconButton 
                    size="small" 
                    onClick={handleFilterOpen}
                    color={activeFilter !== 'all' ? 'primary' : 'default'}
                  >
                    <FilterListIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {issueTypes.map(type => (
            <Chip 
              key={type}
              size="small"
              label={`${type} (${issueTypeCounts[type]})`}
              color={getIssueTypeColor(type)}
              onClick={() => handleFilterSelect(type)}
              variant={activeFilter === type ? 'filled' : 'outlined'}
              sx={{ textTransform: 'capitalize' }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
        <List dense>
          {filteredNodes.map((node) => (
            <ListItem 
              key={node.id} 
              onClick={() => onSelect(node)}
              sx={{ 
                cursor: 'pointer',
                '&:hover': { backgroundColor: '#f5f5f5' },
                borderLeft: `3px solid ${node.data.issue_type?.toLowerCase() === 'task' ? '#6a0dad' : 'transparent'}`
              }}
              secondaryAction={
                <IconButton 
                  edge="end"
                  size="small"
                  onClick={(e) => handleActionOpen(e, node.data.key)}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getIssueTypeIcon(node.data.issue_type)}
              </ListItemIcon>
              <ListItemText 
                primary={node.data.key} 
                secondary={node.data.summary}
                primaryTypographyProps={{ fontWeight: 'medium' }}
                secondaryTypographyProps={{ 
                  noWrap: true,
                  style: { maxWidth: '250px' }
                }}
              />
            </ListItem>
          ))}
          {filteredNodes.length === 0 && (
            <ListItem>
              <ListItemText primary="No JIRA issues found matching criteria" />
            </ListItem>
          )}
        </List>
      </Box>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={handleFilterClose}
      >
        <MenuItem onClick={() => handleFilterSelect('all')}>
          Show all types
        </MenuItem>
        <Divider />
        {issueTypes.map(type => (
          <MenuItem key={type} onClick={() => handleFilterSelect(type)}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </MenuItem>
        ))}
      </Menu>

      {/* Actions Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionClose}
      >
        <MenuItem onClick={() => {
          onSelect(nodes.find(n => n.data.key === selectedJiraId));
          handleActionClose();
        }}>
          Focus on this issue
        </MenuItem>
        <MenuItem onClick={handleActionClose}>
          Show linked issues
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default JiraIdsList;
