import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Panel, 
  applyNodeChanges, 
  applyEdgeChanges,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import '../styles/visualization.css';
import { 
  Box, 
  Typography, 
  Paper, 
  Container, 
  Button, 
  Alert, 
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
  Stack,
  Divider,
  CircularProgress,
  InputAdornment,
  Badge,
  LinearProgress
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import BugReportIcon from '@mui/icons-material/BugReport';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import ImageIcon from '@mui/icons-material/Image';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TextRotateVerticalIcon from '@mui/icons-material/TextRotateVertical';
import TextRotationNoneIcon from '@mui/icons-material/TextRotationNone';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import CustomNode from './CustomNode';
import { apiService } from '../services/apiService';
import { adfToText, formatJiraForLLM } from '../utils/jiraFormatter';

// Register Chart.js components
ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Set up the dagre graph
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Define node dimensions
const nodeWidth = 250;
const nodeHeight = 120;

// Helper function to layout the graph using dagre
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  // Ensure we have valid arrays to work with
  if (!nodes || !nodes.length) {
    console.warn("getLayoutedElements received empty or invalid nodes array");
    return { nodes: [], edges: edges || [] };
  }
  
  if (!edges) {
    console.warn("getLayoutedElements received undefined edges array");
    edges = [];
  }
  
  // Clear the graph before creating a new layout
  dagreGraph.setGraph({ rankdir: direction });
  
  // Add nodes to dagre graph
  nodes.forEach((node) => {
    if (node && node.id) {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    }
  });
  
  // Add edges to dagre graph
  edges.forEach((edge) => {
    if (edge && edge.source && edge.target) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });
  
  // Calculate the layout
  dagre.layout(dagreGraph);
  
  // Apply layout positions to nodes
  const layoutedNodes = nodes.map((node) => {
    if (!node || !node.id) {
      console.warn("Found invalid node in layout calculation:", node);
      return node; // Return the node as is if it's invalid
    }
    
    try {
      const nodeWithPosition = dagreGraph.node(node.id);
      if (!nodeWithPosition) {
        console.warn(`Node ${node.id} not found in dagre graph`);
        return {
          ...node,
          position: node.position || { x: 0, y: 0 } // Use existing position or default
        };
      }
      
      // Check if x and y properties exist on nodeWithPosition
      if (typeof nodeWithPosition.x !== 'number' || typeof nodeWithPosition.y !== 'number') {
        console.warn(`Invalid position data for node ${node.id}:`, nodeWithPosition);
        return {
          ...node,
          position: node.position || { x: 0, y: 0 } // Use existing position or default
        };
      }
      
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      };
    } catch (err) {
      console.error(`Error processing node ${node.id}:`, err);
      return {
        ...node,
        position: node.position || { x: 0, y: 0 } // Use existing position or default
      };
    }
  });
  
  return { nodes: layoutedNodes, edges };
};

// Register custom node types
const nodeTypes = {
  central: CustomNode,
  parent: CustomNode,  // Add parent node type
  requirement: CustomNode,
  test: CustomNode,
  defect: CustomNode,
  related: CustomNode
};

// Register custom edge types
const edgeTypes = {
  custom: ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, data, label }) => {
    const edgePath = `M${sourceX},${sourceY}C${sourceX + 50},${sourceY} ${targetX - 50},${targetY} ${targetX},${targetY}`;
    
    const getEdgeColor = () => {
      if (label) {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('block') || lowerLabel.includes('depend')) {
          return '#f44336'; // Red
        } else if (lowerLabel.includes('test') || lowerLabel.includes('verify')) {
          return '#66bb6a'; // Green
        } else if (lowerLabel.includes('implement') || lowerLabel.includes('require')) {
          return '#4dabf5'; // Blue
        }
      }
      return '#555'; // Default gray
    };

    const color = getEdgeColor();
    
    return (
      <>
        <path
          id={id}
          style={{ stroke: color, strokeWidth: 2, ...style }}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd="url(#arrowhead)"
        />
        {label && (
          <text>
            <textPath
              href={`#${id}`}
              style={{ 
                fontSize: '11px', 
                fontWeight: 'normal', 
                fill: color,
                textAnchor: 'middle',
                dominantBaseline: 'central'
              }}
              startOffset="50%"
              textAnchor="middle"
            >
              {label}
            </textPath>
          </text>
        )}
      </>
    );
  }
};

// TabPanel component for the tabbed interface
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`visualization-tabpanel-${index}`}
      aria-labelledby={`visualization-tab-${index}`}
      style={{ height: '100%', width: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%', width: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const JiraVisualization = ({ data }) => {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [selectedNodeTypes, setSelectedNodeTypes] = useState(['central', 'parent', 'requirement', 'test', 'defect', 'related']);
  const [layoutDirection, setLayoutDirection] = useState('TB'); // TB = top to bottom
  const [issueStats, setIssueStats] = useState({ total: 0, parents: 0, requirements: 0, tests: 0, defects: 0, other: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [issueDetails, setIssueDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsTabValue, setDetailsTabValue] = useState(0);
  const [detailsJson, setDetailsJson] = useState('');
  const flowRef = useRef(null);
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    console.log("JiraVisualization received data:", data);
    
    if (!data || !data.nodes || !data.edges) {
      console.error("Invalid data format received for visualization", data);
      navigate('/');
      return;
    }
    
    // Additional validation to ensure nodes and edges are arrays
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      console.error("Data nodes or edges are not arrays", data);
      navigate('/');
      return;
    }
    
    // Empty arrays check
    if (data.nodes.length === 0) {
      console.error("No nodes found in data", data);
      navigate('/');
      return;
    }

    // Calculate statistics - with extra validation
    const stats = data.nodes.reduce((acc, node) => {
      if (!node) return acc; // Skip null/undefined nodes
      
      acc.total++;
      if (node.type === 'parent') acc.parents++;
      else if (node.type === 'requirement') acc.requirements++;
      else if (node.type === 'test') acc.tests++;
      else if (node.type === 'defect') acc.defects++;
      else if (node.type !== 'central') acc.other++;
      return acc;
    }, { total: 0, parents: 0, requirements: 0, tests: 0, defects: 0, other: 0 });
    
    setIssueStats(stats);
    
    try {
      // Apply layout to nodes and edges
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(data.nodes, data.edges, layoutDirection);
      
      if (!layoutedNodes || !layoutedEdges) {
        console.error("Layout calculation failed", { layoutedNodes, layoutedEdges });
        return;
      }
      
      // Enhance edges with custom type and colors
      const enhancedEdges = layoutedEdges.map(edge => {
        if (!edge) return null;
        return {
          ...edge,
          type: 'custom',
          animated: edge.label && (
            edge.label.toLowerCase().includes('block') || 
            edge.label.toLowerCase().includes('depend')
          )
        };
      }).filter(Boolean); // Filter out any null values
      
      setNodes(layoutedNodes);
      setEdges(enhancedEdges);
      setFilteredNodes(layoutedNodes);
    } catch (err) {
      console.error("Error processing visualization data:", err);
      navigate('/');
    }
  }, [data, navigate, layoutDirection]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle node changes (position, selection)
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Advanced search states
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  
  // Handle search input change
  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    setAdvancedSearchActive(false);
    setHighlightedNodes(new Set());
    
    if (!term) {
      setFilteredNodes(nodes);
    } else {
      const filtered = nodes.filter((node) => {
        if (!node || !node.data) return false;
        
        const nodeData = node.data;
        try {
          return (
            (nodeData.key && nodeData.key.toLowerCase().includes(term)) || 
            (nodeData.summary && nodeData.summary.toLowerCase().includes(term)) ||
            (nodeData.status && nodeData.status.toLowerCase().includes(term)) || 
            (nodeData.issue_type && nodeData.issue_type.toLowerCase().includes(term))
          );
        } catch (err) {
          console.error("Error filtering node:", err, node);
          return false;
        }
      });
      setFilteredNodes(filtered);
    }
  };
  
  // Advanced search to highlight paths between issues
  const performAdvancedSearch = () => {
    if (!searchTerm || searchTerm.trim() === '') {
      return;
    }
    
    try {
      // Find nodes that match the search term
      const matchingNodes = nodes.filter((node) => {
        if (!node || !node.data) return false;
        
        const nodeData = node.data;
        try {
          return (
            (nodeData.key && nodeData.key.toLowerCase().includes(searchTerm.toLowerCase())) || 
            (nodeData.summary && nodeData.summary.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        } catch (err) {
          console.error("Error filtering node in advanced search:", err, node);
          return false;
        }
      });
      
      if (matchingNodes.length > 0) {
        // Create a set of highlighted node IDs
        const highlightSet = new Set(
          matchingNodes
            .filter(node => node && node.id)
            .map(node => node.id)
        );
        
        // Add all nodes that are directly connected to the highlighted nodes
        if (Array.isArray(edges)) {
          edges.forEach(edge => {
            if (!edge || !edge.source || !edge.target) return;
            
            if (highlightSet.has(edge.source) || highlightSet.has(edge.target)) {
              highlightSet.add(edge.source);
              highlightSet.add(edge.target);
            }
          });
        }
        
        setHighlightedNodes(highlightSet);
        setAdvancedSearchActive(true);
        
        // Show all nodes but highlight the relevant ones
        setFilteredNodes(nodes.map(node => {
          if (!node || !node.id) return node;
          
          return {
            ...node,
            style: {
              ...node.style,
              opacity: highlightSet.has(node.id) ? 1 : 0.25,
            },
          };
        }));
      }
    } catch (err) {
      console.error("Error in advanced search:", err);
    }
  };

  // Handle node type filter change
  const handleNodeTypeFilterChange = (type) => {
    const updatedFilters = selectedNodeTypes.includes(type)
      ? selectedNodeTypes.filter(t => t !== type)
      : [...selectedNodeTypes, type];
    
    setSelectedNodeTypes(updatedFilters);
    
    try {
      // Apply filters to nodes with additional validation
      const filtered = nodes.filter(node => {
        if (!node || !node.type) {
          console.warn("Found node without type during filtering:", node);
          return false;
        }
        
        try {
          // Check if the node has valid data for searching
          const hasValidData = node.data && typeof node.data === 'object';
          let matchesSearch = !searchTerm; // Default to true if no search term
          
          if (searchTerm && hasValidData) {
            matchesSearch = 
              (node.data.key && node.data.key.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (node.data.summary && node.data.summary.toLowerCase().includes(searchTerm.toLowerCase()));
          }
          
          return matchesSearch && updatedFilters.includes(node.type);
        } catch (err) {
          console.error("Error filtering node by type:", err, node);
          return false;
        }
      });
      
      setFilteredNodes(filtered);
    } catch (err) {
      console.error("Error in node type filtering:", err);
      // Fall back to showing nodes of the selected types without search filtering
      const safeFiltered = nodes.filter(node => 
        node && node.type && updatedFilters.includes(node.type)
      );
      setFilteredNodes(safeFiltered);
    }
  };

  // Handle layout direction change
  const changeLayoutDirection = (direction) => {
    setLayoutDirection(direction);
  };

  // Zoom controls
  const zoomIn = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
    }
  };

  const zoomOut = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
    }
  };

  const resetView = () => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView();
    }
  };

  // Export visualization as PNG
  const exportImage = async (type = 'png') => {
    setIsExporting(true);
    const flowElement = document.querySelector('.react-flow');
    
    if (flowElement) {
      try {
        let dataUrl;
        const exportOptions = {
          filter: (node) => {
            // Filter out controls and unnecessary elements
            return !node.classList?.contains('react-flow__controls') &&
                   !node.classList?.contains('react-flow__attribution');
          },
          backgroundColor: '#F4F5F7',
          quality: 1
        };
        
        if (type === 'png') {
          dataUrl = await toPng(flowElement, exportOptions);
          downloadImage(dataUrl, 'jira-visualization.png');
        } else if (type === 'jpeg') {
          dataUrl = await toJpeg(flowElement, exportOptions);
          downloadImage(dataUrl, 'jira-visualization.jpg');
        } else if (type === 'pdf') {
          dataUrl = await toPng(flowElement, exportOptions);
          generatePDF(dataUrl);
        }
      } catch (err) {
        console.error(`Error exporting as ${type}:`, err);
      } finally {
        setIsExporting(false);
      }
    }
  };

  const downloadImage = (dataUrl, fileName) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  };

  const generatePDF = (dataUrl) => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
    });
    
    const imgProps = pdf.getImageProperties(dataUrl);
    const width = pdf.internal.pageSize.getWidth();
    const height = (imgProps.height * width) / imgProps.width;
    
    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
    pdf.save('jira-visualization.pdf');
  };

  // Export data as CSV
  const exportCSV = () => {
    if (!nodes || nodes.length === 0) return;
    
    try {
      // Create CSV header row
      const header = ['Key', 'Summary', 'Issue Type', 'Status', 'Priority'];
      
      // Create CSV data rows with safeguards against null values
      const rows = nodes
        .filter(node => node && node.data) // Filter out invalid nodes
        .map(node => {
          try {
            const data = node.data || {};
            return [
              data.key || 'N/A',
              `"${(data.summary || 'No summary').replace(/"/g, '""')}"`, // Quote and escape summary text
              data.issue_type || 'N/A',
              data.status || 'N/A',
              data.priority || ''
            ];
          } catch (err) {
            console.error("Error processing node for CSV:", err, node);
            return ['Error', 'Error processing node', 'Error', 'Error', ''];
          }
        });
      
      // Combine header and rows
      const csvContent = [header].concat(rows).map(row => row.join(',')).join('\n');
      
      // Create Blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'jira-issues.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error exporting CSV:", err);
      alert("Failed to export CSV data. See console for details.");
    }
  };

  // Fetch detailed issue information when a node is selected
  const fetchIssueDetails = useCallback(async (node) => {
    if (!node || !node.data || !node.data.key) {
      console.error('Invalid node data for fetchIssueDetails:', node);
      return;
    }
    
    setIsLoadingDetails(true);
    
    try {
      // Extract credentials from the URL or session storage
      // In a real app, you'd store these securely
      const savedData = sessionStorage.getItem('jiraFormData');
      if (!savedData) {
        console.error('No JIRA credentials found');
        return;
      }
      
      let credentials;
      try {
        credentials = JSON.parse(savedData);
        // Check for base_url (not baseUrl) since that's the property name used in the form
        if (!credentials || !credentials.base_url) {
          console.error('Invalid JIRA credentials:', credentials);
          return;
        }
      } catch (error) {
        console.error('Error parsing JIRA credentials:', error);
        return;
      }
      
      // Call API to get detailed issue information
      const details = await apiService.getIssueDetails(credentials, node.data.key);
      
      if (!details) {
        console.error('No details returned for issue:', node.data.key);
        return;
      }
      
      setIssueDetails(details);
      
      // Format JSON for display
      setDetailsJson(JSON.stringify(details, null, 2));
      
      // Format data for LLM processing and store it
      try {
        const formattedForLLM = formatJiraForLLM(details);
        sessionStorage.setItem('jiraLLMFormatted', formattedForLLM);
      } catch (formatError) {
        console.error('Error formatting issue for LLM:', formatError);
      }
    } catch (err) {
      console.error('Error fetching issue details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // Track selected node for details display
  // const [selectedNode, setSelectedNode] = useState(null);

  // Handle node click to show details
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    // Fetch detailed information including description
    fetchIssueDetails(node);
  }, [fetchIssueDetails]);

  // Clear selected node
  const clearSelectedNode = useCallback(() => {
    setSelectedNode(null);
    setIssueDetails(null);
    setDetailsJson('');
  }, []);

  // Store original stats for Analytics tab (not affected by filtering)
  const [originalStats, setOriginalStats] = useState({ total: 0, parents: 0, requirements: 0, tests: 0, defects: 0, other: 0 });
  
  // Update original stats when data changes
  useEffect(() => {
    if (data && Array.isArray(data.nodes)) {
      const stats = data.nodes.reduce((acc, node) => {
        if (!node) return acc; // Skip null/undefined nodes
        
        acc.total++;
        if (node.type === 'parent') acc.parents++;
        else if (node.type === 'requirement') acc.requirements++;
        else if (node.type === 'test') acc.tests++;
        else if (node.type === 'defect') acc.defects++;
        else if (node.type !== 'central') acc.other++;
        return acc;
      }, { total: 0, parents: 0, requirements: 0, tests: 0, defects: 0, other: 0 });
      
      setOriginalStats(stats);
    }
  }, [data]);
  
  // Create chart data for the Analytics tab - using originalStats to ensure all child items are shown
  const pieChartData = {
    labels: ['Parents', 'Requirements', 'Tests', 'Defects', 'Other'],
    datasets: [
      {
        data: [
          originalStats.parents || 0,
          originalStats.requirements,
          originalStats.tests,
          originalStats.defects,
          originalStats.other
        ],
        backgroundColor: [
          '#9c27b0', // Purple for parents
          '#4dabf5', // Blue for requirements
          '#66bb6a', // Green for tests
          '#f44336', // Red for defects
          '#9e9e9e', // Grey for other
        ],
        borderWidth: 1,
      },
    ],
  };

  const barChartData = {
    labels: ['Parents', 'Requirements', 'Tests', 'Defects', 'Other'],
    datasets: [
      {
        label: 'Issue Count',
        data: [
          originalStats.parents || 0,
          originalStats.requirements,
          originalStats.tests,
          originalStats.defects,
          originalStats.other
        ],
        backgroundColor: [
          '#4dabf5',
          '#66bb6a',
          '#f44336',
          '#9e9e9e',
        ],
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Issue Distribution',
      },
    },
  };

  // Replace the if (!data) check with a more comprehensive check
  if (!data || !data.nodes || !data.nodes.length || !data.edges) {
    return (
      <Container maxWidth="md">
        <Alert severity="warning" sx={{ mt: 4 }}>
          <Typography variant="h6">No visualization data available</Typography>
          <Typography variant="body1">
            Please return to the form and submit valid JIRA issue details. 
            Make sure the central JIRA ID exists and has linked issues.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            Return to Form
          </Button>
        </Alert>
      </Container>
    );
  }

  // Display filtered nodes in the graph with error handling
  const displayedNodes = filteredNodes.filter(node => {
    try {
      return node && node.type && selectedNodeTypes.includes(node.type);
    } catch (err) {
      console.error("Error filtering node for display:", err, node);
      return false;
    }
  });
  
  // Filter only edges that connect displayed nodes
  const displayedNodeIds = new Set(
    displayedNodes
      .filter(node => node && node.id)
      .map(node => node.id)
  );
  
  const displayedEdges = edges.filter(edge => {
    try {
      return edge && 
             edge.source && 
             edge.target && 
             displayedNodeIds.has(edge.source) && 
             displayedNodeIds.has(edge.target);
    } catch (err) {
      console.error("Error filtering edge for display:", err, edge);
      return false;
    }
  });

  return (
    <Container maxWidth="xl" sx={{ mt: 2, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#3f51b5' }}>
          JIRA Relationship Visualization
        </Typography>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Return to form">
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => navigate('/')}
            >
              Back to Form
            </Button>
          </Tooltip>
          <Tooltip title="Export as PNG">
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<FileDownloadIcon />}
              onClick={() => exportImage('png')}
              disabled={isExporting}
            >
              {isExporting ? <CircularProgress size={24} /> : 'Export'}
            </Button>
          </Tooltip>
        </Stack>
      </Paper>
      
      <Paper elevation={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="visualization tabs">
            <Tab 
              icon={<AccountTreeIcon />} 
              iconPosition="start" 
              label="Visualization" 
              id="visualization-tab-0" 
            />
            <Tab 
              icon={<InsertChartIcon />} 
              iconPosition="start" 
              label="Analytics" 
              id="visualization-tab-1" 
            />
          </Tabs>
        </Box>
        
        {/* Visualization Tab */}
        <TabPanel value={tabValue} index={0} sx={{ flexGrow: 1 }}>
          <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Search issues..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: '250px' }}
              />
              <Tooltip title="Highlight connected issues">
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={performAdvancedSearch}
                  disabled={!searchTerm}
                  color={advancedSearchActive ? 'secondary' : 'primary'}
                >
                  Highlight Path
                </Button>
              </Tooltip>
              {advancedSearchActive && (
                <Chip 
                  label={`${highlightedNodes.size} issues highlighted`} 
                  color="secondary" 
                  size="small" 
                  onDelete={() => {
                    setAdvancedSearchActive(false);
                    setHighlightedNodes(new Set());
                    setFilteredNodes(nodes);
                  }}
                />
              )}
            </Box>
            
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Central Issue">
                <Chip
                  label="Central"
                  color={selectedNodeTypes.includes('central') ? 'primary' : 'default'}
                  onClick={() => handleNodeTypeFilterChange('central')}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
              <Tooltip title="Parent Issues">
                <Chip
                  icon={<AccountTreeIcon />}
                  label={`Parents (${issueStats.parents || 0})`}
                  color={selectedNodeTypes.includes('parent') ? 'primary' : 'default'}
                  onClick={() => handleNodeTypeFilterChange('parent')}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
              <Tooltip title="Requirements">
                <Chip
                  icon={<AssignmentIcon />}
                  label={`Requirements (${issueStats.requirements})`}
                  color={selectedNodeTypes.includes('requirement') ? 'primary' : 'default'}
                  onClick={() => handleNodeTypeFilterChange('requirement')}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
              <Tooltip title="Tests">
                <Chip
                  icon={<CheckCircleOutlineIcon />}
                  label={`Tests (${issueStats.tests})`}
                  color={selectedNodeTypes.includes('test') ? 'primary' : 'default'}
                  onClick={() => handleNodeTypeFilterChange('test')}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
              <Tooltip title="Defects">
                <Chip
                  icon={<BugReportIcon />}
                  label={`Defects (${issueStats.defects})`}
                  color={selectedNodeTypes.includes('defect') ? 'primary' : 'default'}
                  onClick={() => handleNodeTypeFilterChange('defect')}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
              <Tooltip title="Other Issues">
                <Chip
                  label={`Other (${issueStats.other})`}
                  color={selectedNodeTypes.includes('related') ? 'primary' : 'default'}
                  onClick={() => handleNodeTypeFilterChange('related')}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
            </Box>
            
            {/* Layout Direction */}
            <Box>
              <Tooltip title="Vertical Layout">
                <IconButton 
                  color={layoutDirection === 'TB' ? 'primary' : 'default'} 
                  onClick={() => changeLayoutDirection('TB')}
                >
                  <TextRotateVerticalIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Horizontal Layout">
                <IconButton 
                  color={layoutDirection === 'LR' ? 'primary' : 'default'} 
                  onClick={() => changeLayoutDirection('LR')}
                >
                  <TextRotationNoneIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Export Options */}
            <Box sx={{ marginLeft: 'auto' }}>
              <Tooltip title="Export as PNG">
                <IconButton onClick={() => exportImage('png')}>
                  <ImageIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export as JPEG">
                <IconButton onClick={() => exportImage('jpeg')}>
                  <SaveAltIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export as PDF">
                <IconButton onClick={() => exportImage('pdf')}>
                  <PictureAsPdfIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export data as CSV">
                <IconButton onClick={exportCSV}>
                  <FileDownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export as CSV">
                <IconButton onClick={exportCSV}>
                  <FileDownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Divider />
          
          {/* The Flow Chart */}
          <Box ref={flowRef} className="reactflow-wrapper" sx={{ flexGrow: 1, position: 'relative', display: 'flex' }}>
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
              <ReactFlow
                nodes={displayedNodes}
                edges={displayedEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                attributionPosition="bottom-right"
              >
                <Background />
                <Controls />
                <MiniMap />
                
                {/* Floating Controls Panel */}
                <Panel position="top-right">
                  <Paper elevation={3} sx={{ p: 1, borderRadius: 2 }}>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Zoom In">
                        <IconButton size="small" onClick={zoomIn}>
                          <ZoomInIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Zoom Out">
                        <IconButton size="small" onClick={zoomOut}>
                          <ZoomOutIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset View">
                        <IconButton size="small" onClick={resetView}>
                          <RestartAltIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Paper>
                </Panel>

                {/* Legend Panel */}
                <Panel position="bottom-right" className="legend-panel">
                  <Paper elevation={3} sx={{ p: 2, borderRadius: 2, maxWidth: 250 }}>
                    <Typography variant="subtitle2" gutterBottom>Legend</Typography>
                    <Divider sx={{ mb: 1 }} />
                    
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>Node Types:</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{ width: 16, height: 16, backgroundColor: '#ff9800', borderRadius: 1 }} />
                        <Typography variant="body2">Central Issue</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{ width: 16, height: 16, backgroundColor: '#9c27b0', borderRadius: 1 }} />
                        <Typography variant="body2">Parent Issue</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{ width: 16, height: 16, backgroundColor: '#4dabf5', borderRadius: 1 }} />
                        <Typography variant="body2">Requirement</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{ width: 16, height: 16, backgroundColor: '#66bb6a', borderRadius: 1 }} />
                        <Typography variant="body2">Test</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{ width: 16, height: 16, backgroundColor: '#f44336', borderRadius: 1 }} />
                        <Typography variant="body2">Defect</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{ width: 16, height: 16, backgroundColor: '#9e9e9e', borderRadius: 1 }} />
                        <Typography variant="body2">Other</Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>Edge Types:</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{ width: 20, height: 2, backgroundColor: '#f44336' }} />
                        <Typography variant="body2">Blocks/Depends</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{ width: 20, height: 2, backgroundColor: '#66bb6a' }} />
                        <Typography variant="body2">Tests/Verifies</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{ width: 20, height: 2, backgroundColor: '#4dabf5' }} />
                        <Typography variant="body2">Implements/Requires</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{ width: 20, height: 2, backgroundColor: '#555' }} />
                        <Typography variant="body2">Other Relationship</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Panel>
              </ReactFlow>
            </Box>
            
            {/* Node Details Sidebar */}
            {selectedNode && (
              <Paper 
                elevation={2} 
                sx={{ 
                  width: 350, 
                  borderLeft: '1px solid #e0e0e0',
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto'
                }}
              >
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: '#f5f5f5', 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Typography variant="h6">Issue Details</Typography>
                  <IconButton size="small" onClick={clearSelectedNode}>
                    <RestartAltIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                {/* Basic Issue Details Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs 
                    value={detailsTabValue} 
                    onChange={(e, newValue) => setDetailsTabValue(newValue)} 
                    variant="fullWidth"
                  >
                    <Tab label="Overview" />
                    <Tab label="Description" />
                    <Tab label="JSON" />
                  </Tabs>
                </Box>
                
                {isLoadingDetails && (
                  <LinearProgress color="primary" />
                )}
                
                {/* Overview Tab */}
                {detailsTabValue === 0 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary">
                      {selectedNode.data.key}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedNode.data.summary}
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Issue Type
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        {selectedNode.data.issue_type}
                      </Typography>
                      
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                        Status
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        {selectedNode.data.status}
                      </Typography>
                      
                      {selectedNode.data.priority && (
                        <>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                            Priority
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            {selectedNode.data.priority}
                          </Typography>
                        </>
                      )}
                      
                      {issueDetails && (
                        <>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                            Assignee
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            {issueDetails.assignee || "Unassigned"}
                          </Typography>
                          
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                            Reporter
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            {issueDetails.reporter || "Unknown"}
                          </Typography>
                          
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                            Created
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            {new Date(issueDetails.created).toLocaleDateString()}
                          </Typography>
                        </>
                      )}
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Connections
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          {edges.filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id)
                            .map((edge) => {
                              const isSource = edge.source === selectedNode.id;
                              const connectedNodeId = isSource ? edge.target : edge.source;
                              const connectedNode = nodes.find(n => n.id === connectedNodeId);
                              
                              if (!connectedNode) return null;
                              
                              return (
                                <Chip
                                  key={edge.id}
                                  size="small"
                                  label={`${connectedNode.data.key} (${isSource ? 'Outgoing' : 'Incoming'})`}
                                  sx={{ mb: 0.5, mr: 0.5 }}
                                />
                              );
                            })
                          }
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )}
                
                {/* Description Tab */}
                {detailsTabValue === 1 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                      {selectedNode.data.key} - Description
                    </Typography>
                    
                    {issueDetails ? (
                      <Box sx={{ 
                        mt: 1, 
                        p: 2, 
                        maxHeight: '500px', 
                        overflowY: 'auto',
                        backgroundColor: '#f9f9f9',
                        borderRadius: 1,
                        whiteSpace: 'pre-wrap'
                      }}>
                        {/* Use our formatter to handle Atlassian Document Format if present */}
                        {adfToText(issueDetails.description) || "No description available."}
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress size={30} />
                      </Box>
                    )}
                    
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        size="small"
                        onClick={() => {
                          if (issueDetails && issueDetails.description) {
                            // Save JSON data to session storage for LLM processing
                            const llmData = {
                              issue: selectedNode.data.key,
                              summary: selectedNode.data.summary,
                              description: adfToText(issueDetails.description)
                            };
                            sessionStorage.setItem('jiraLLMData', JSON.stringify(llmData));
                            alert('Issue description saved for LLM processing');
                          }
                        }}
                      >
                        Save Description for LLM
                      </Button>
                      
                      <Button 
                        variant="contained" 
                        color="primary" 
                        size="small"
                        onClick={() => {
                          const formatted = sessionStorage.getItem('jiraLLMFormatted');
                          if (formatted) {
                            navigator.clipboard.writeText(formatted);
                            alert('Formatted JIRA data copied to clipboard for LLM input');
                          }
                        }}
                      >
                        Copy for LLM Input
                      </Button>
                    </Stack>
                  </Box>
                )}
                
                {/* JSON Tab for LLM processing */}
                {detailsTabValue === 2 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      JSON Data for LLM Processing
                    </Typography>
                    
                    <Box sx={{ 
                      mt: 1, 
                      p: 2, 
                      maxHeight: '500px', 
                      overflowY: 'auto',
                      backgroundColor: '#f5f5f5',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {detailsJson || "Loading JSON data..."}
                    </Box>
                    
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={() => {
                          if (detailsJson) {
                            sessionStorage.setItem('jiraDetailedJson', detailsJson);
                            alert('JSON data saved for LLM processing');
                          }
                        }}
                      >
                        Save JSON to Session
                      </Button>
                      
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => {
                          if (detailsJson) {
                            // Create downloadable JSON file
                            const blob = new Blob([detailsJson], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${selectedNode.data.key}_for_llm.json`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }
                        }}
                      >
                        Download as JSON
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        </TabPanel>
        
        {/* Analytics Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Issue Statistics
            </Typography>
            
            <Grid container spacing={3}>
              {/* Summary Card */}
              <Grid item xs={12} md={4}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Summary
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1">Total Issues:</Typography>
                        <Typography variant="body1" fontWeight="bold">{originalStats.total}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1">Parents:</Typography>
                        <Typography variant="body1" color="secondary">{originalStats.parents || 0}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1">Requirements:</Typography>
                        <Typography variant="body1" color="primary">{originalStats.requirements}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1">Tests:</Typography>
                        <Typography variant="body1" color="success.main">{originalStats.tests}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1">Defects:</Typography>
                        <Typography variant="body1" color="error.main">{originalStats.defects}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1">Other Issues:</Typography>
                        <Typography variant="body1" color="text.secondary">{originalStats.other}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Pie Chart */}
              <Grid item xs={12} md={4}>
                <Card elevation={2} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom align="center">
                      Issue Distribution
                    </Typography>
                    <Box sx={{ height: 250, display: 'flex', justifyContent: 'center' }}>
                      <Pie data={pieChartData} options={{ maintainAspectRatio: false }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Bar Chart */}
              <Grid item xs={12} md={4}>
                <Card elevation={2} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom align="center">
                      Issue Counts
                    </Typography>
                    <Box sx={{ height: 250 }}>
                      <Bar data={barChartData} options={barChartOptions} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Coverage Metrics */}
              <Grid item xs={12}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Coverage Metrics
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">Test Coverage Ratio</Typography>
                            <Typography variant="h5">
                              {originalStats.requirements ? 
                                `${((originalStats.tests / originalStats.requirements) * 100).toFixed(1)}%` : 
                                'N/A'
                              }
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Tests per Requirement
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">Defect Rate</Typography>
                            <Typography variant="h5">
                              {originalStats.tests ? 
                                `${((originalStats.defects / originalStats.tests) * 100).toFixed(1)}%` : 
                                'N/A'
                              }
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Defects per Test
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">Total Relationships</Typography>
                            <Typography variant="h5">
                              {edges.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Connections between issues
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">Average Connections</Typography>
                            <Typography variant="h5">
                              {originalStats.total ? 
                                (edges.length / originalStats.total).toFixed(1) : 
                                '0'
                              }
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Per issue
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

// Wrap the component with ReactFlowProvider to enable the useReactFlow hook
const JiraVisualizationWithProvider = (props) => {
  return (
    <ReactFlowProvider>
      <JiraVisualization {...props} />
    </ReactFlowProvider>
  );
};

export default JiraVisualizationWithProvider;
