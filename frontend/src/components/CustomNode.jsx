import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Typography, Box, Chip, Tooltip, Paper } from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import StarIcon from '@mui/icons-material/Star';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

const CustomNode = ({ data, type }) => {
  // Set node color based on node type
  const getNodeColor = () => {
    switch (type) {
      case 'central':
        return '#ff9800'; // Orange for central node
      case 'parent':
        return '#9c27b0'; // Purple for parent node
      case 'requirement':
        return '#4dabf5'; // Blue for requirements
      case 'test':
        return '#66bb6a'; // Green for tests
      case 'defect':
        return '#f44336'; // Red for defects
      default:
        return '#9e9e9e'; // Gray for other nodes
    }
  };
  
  // Get node style with special handling for task-type issues
  const getNodeStyle = () => {
    const baseStyle = {
      backgroundColor: getNodeColor(),
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: getNodeColor(),
      padding: '10px',
    };
    
    // Check if it's a task-type issue
    const isTask = data.issue_type?.toLowerCase() === 'task';
    
    if (isTask) {
      return {
        ...baseStyle,
        borderStyle: 'dashed',
        borderColor: '#6a0dad', // Purple border
        boxShadow: '0 0 8px rgba(106, 13, 173, 0.5)', // Purple glow
      };
    }
    
    return baseStyle;
  };

  // Get icon based on node type
  const getNodeIcon = () => {
    switch (type) {
      case 'central':
        return <StarIcon fontSize="small" />;
      case 'parent':
        return <AccountTreeIcon fontSize="small" />;
      case 'requirement':
        return <AssignmentIcon fontSize="small" />;
      case 'test':
        return <CheckCircleOutlineIcon fontSize="small" />;
      case 'defect':
        return <BugReportIcon fontSize="small" />;
      default:
        return <HelpOutlineIcon fontSize="small" />;
    }
  };

  // Get status color
  const getStatusColor = () => {
    const statusLower = data.status.toLowerCase();
    if (statusLower.includes('done') || statusLower.includes('closed') || statusLower.includes('complete')) {
      return '#66bb6a'; // Green for completed
    } else if (statusLower.includes('progress') || statusLower.includes('review') || statusLower.includes('testing')) {
      return '#ff9800'; // Orange for in progress
    } else if (statusLower.includes('to do') || statusLower.includes('new') || statusLower.includes('open')) {
      return '#2196f3'; // Blue for to do
    } else if (statusLower.includes('block') || statusLower.includes('impediment')) {
      return '#f44336'; // Red for blocked
    }
    return '#9e9e9e'; // Grey for others
  };

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Paper 
        elevation={2}
        sx={{ 
          minWidth: '200px',
          maxWidth: '250px',
          borderLeft: `5px solid ${getNodeColor()}`,
          borderRadius: '4px',
          overflow: 'hidden',
          ...(data.issue_type?.toLowerCase() === 'task' && {
            borderStyle: 'dashed',
            borderWidth: '2px',
            borderColor: '#6a0dad', // Purple for task types
            boxShadow: '0 0 8px rgba(106, 13, 173, 0.5)'
          })
        }}
        data-issue-type={data.issue_type?.toLowerCase() === 'task' ? 'task' : undefined}
      >
        <Box 
          sx={{ 
            p: 1, 
            backgroundColor: `${getNodeColor()}20`, // Light background color with 20% opacity
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {getNodeIcon()}
          <Tooltip title={`${data.key} - ${data.issue_type}`} arrow>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {data.key}
            </Typography>
          </Tooltip>
        </Box>
        <Box sx={{ p: 1 }}>
          <Tooltip title={data.summary} arrow>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 1, 
                fontWeight: 500, 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {data.summary}
            </Typography>
          </Tooltip>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={data.issue_type}
              size="small"
              sx={{ 
                fontSize: '0.7rem',
                height: '20px',
                backgroundColor: getNodeColor(),
                color: '#fff'
              }}
            />
            <Chip
              label={data.status}
              size="small"
              sx={{ 
                fontSize: '0.7rem',
                height: '20px',
                backgroundColor: getStatusColor(),
                color: '#fff'
              }}
            />
            {data.priority && (
              <Tooltip title={`Priority: ${data.priority}`} arrow>
                <Chip
                  label={data.priority}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    fontSize: '0.7rem',
                    height: '20px',
                  }}
                />
              </Tooltip>
            )}
          </Box>
        </Box>
      </Paper>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
};

export default memo(CustomNode);
