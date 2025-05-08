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
import '../styles/task-highlight.css';
import JiraIdsList from './JiraIdsList';
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
  LinearProgress,
  Menu,
  ListItemIcon,
  ListItemText,
  Avatar
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
import CreateIcon from '@mui/icons-material/Create';
import InfoIcon from '@mui/icons-material/Info';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import LegendToggleIcon from '@mui/icons-material/LegendToggle';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import KeyIcon from '@mui/icons-material/Key';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LinkIcon from '@mui/icons-material/Link';
import BlockIcon from '@mui/icons-material/Block';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import LowPriorityIcon from '@mui/icons-material/LowPriority';
import FlagIcon from '@mui/icons-material/Flag';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import CustomNode from './CustomNode';
import { apiService } from '../services/apiService';
import { adfToText, formatJiraForLLM } from '../utils/jiraFormatter';
import extractDescription from '../utils/descriptionExtractor';
import TestCaseStatusModal from './TestCaseStatusModal';
import TestCaseGenerationModal from './TestCaseGenerationModal';

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
      
      // Add this return statement to return the calculated position
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
  const [elements, setElements] = useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [issueDetails, setIssueDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsTabValue, setDetailsTabValue] = useState(0);
  const [detailsJson, setDetailsJson] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [issueTypeFilter, setIssueTypeFilter] = useState('all');
  const [showStatistics, setShowStatistics] = useState(false);
  
  // Reference to the flow wrapper div for export functionality
  const flowRef = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuNode, setContextMenuNode] = useState(null);
  
  // Test case state
  const [showCreateTestCase, setShowCreateTestCase] = useState(false);
  const [generatedTestCase, setGeneratedTestCase] = useState(null);
  const [isGeneratingTestCase, setIsGeneratingTestCase] = useState(false);
  const [showTestCaseStatus, setShowTestCaseStatus] = useState(false);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [testCaseGenerationError, setTestCaseGenerationError] = useState(null);

  // States for JIRA connection and Central JIRA ID input
  const [jiraCredentials, setJiraCredentials] = useState(null);
  const [centralJiraId, setCentralJiraId] = useState('');
  const [showJiraIdInput, setShowJiraIdInput] = useState(false);
  const [loadingVisualization, setLoadingVisualization] = useState(false);
  
  // State for visualization legend minimize/maximize
  const [legendMinimized, setLegendMinimized] = useState(false);
  
  // State for issue details sidebar minimize/maximize
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  
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
      
      // Load any saved positions from session storage
      const savedPositions = JSON.parse(sessionStorage.getItem('nodePositions') || '{}');
      const nodesWithSavedPositions = layoutedNodes.map(node => {
        if (savedPositions[node.id]) {
          // Use saved position if available
          return { ...node, position: savedPositions[node.id] };
        }
        return node;
      });
      
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
      
      setNodes(nodesWithSavedPositions);
      setEdges(enhancedEdges);
      setFilteredNodes(nodesWithSavedPositions);
    } catch (err) {
      console.error("Error processing visualization data:", err);
      navigate('/');
    }
  }, [data, navigate, layoutDirection]);

  // Load saved JIRA credentials from session storage
  useEffect(() => {
    const savedCredentials = sessionStorage.getItem('jiraCredentials');
    if (savedCredentials) {
      setJiraCredentials(JSON.parse(savedCredentials));
    }
    
    // If we have credentials but no data, show the JIRA ID input
    if (savedCredentials && (!data || !data.nodes || data.nodes.length === 0)) {
      setShowJiraIdInput(true);
    }
  }, [data]);

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

  // Handle node drag start
  const onNodeDragStart = useCallback((event, node) => {
    // Set node as selected when starting to drag
    setSelectedNode(node);
    
    // Highlight the node being dragged and increase z-index for better dragging experience
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) {
          return {
            ...n,
            style: { 
              ...n.style, 
              zIndex: 1000, 
              boxShadow: '0 0 10px rgba(0, 0, 255, 0.5)',
              cursor: 'grabbing',
              transform: 'scale(1.02)'
            },
          };
        }
        return n;
      })
    );
    
    // Store original position for potential snap back if needed
    node._originalPosition = { ...node.position };
  }, []);

  // Handle node drag
  const onNodeDrag = useCallback((event, node) => {
    // Update connected edges in real-time for smoother animation
    if (edges.length > 0) {
      const connectedEdges = edges.filter(
        (edge) => edge.source === node.id || edge.target === node.id
      );
      
      if (connectedEdges.length > 0) {
        // Force a re-render of edges by toggling a property
        setEdges((eds) =>
          eds.map((ed) => {
            if (ed.source === node.id || ed.target === node.id) {
              // Add animation to connected edges during drag
              return { 
                ...ed, 
                updatedAt: Date.now(),
                style: { 
                  ...ed.style, 
                  strokeWidth: 2, 
                  stroke: ed.source === node.id ? '#3498db' : '#2ecc71' 
                } 
              };
            }
            return ed;
          })
        );
      }
    }
    
    // Update node position in filtered nodes for smooth rendering
    setFilteredNodes((fNodes) =>
      fNodes.map((n) => {
        if (n.id === node.id) {
          return { ...n, position: node.position };
        }
        return n;
      })
    );
  }, [edges]);

  // Handle node drag stop
  const onNodeDragStop = useCallback((event, node) => {
    // Store the updated node positions to make them persistent
    // This keeps the nodes at their dragged positions rather than resetting on re-render
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) {
          // Remove highlighting and update position
          return {
            ...n,
            position: node.position,
            style: { 
              ...n.style, 
              zIndex: null, 
              boxShadow: null,
              cursor: 'grab',
              transform: null
            },
          };
        }
        return n;
      })
    );
    
    // Reset edge styling to normal
    setEdges((eds) =>
      eds.map((ed) => {
        if (ed.source === node.id || ed.target === node.id) {
          const { updatedAt, style, ...restEdge } = ed;
          return restEdge;
        }
        return ed;
      })
    );
    
    // Save positions to session storage for persistence across page reloads
    try {
      const savedPositions = JSON.parse(sessionStorage.getItem('nodePositions') || '{}');
      savedPositions[node.id] = node.position;
      sessionStorage.setItem('nodePositions', JSON.stringify(savedPositions));
    } catch (error) {
      console.error('Error saving node positions to session storage:', error);
    }
    
    // After dragging, update the filtered nodes to maintain the current view
    setFilteredNodes((fNodes) =>
      fNodes.map((n) => {
        if (n.id === node.id) {
          return { ...n, position: node.position };
        }
        return n;
      })
    );
  }, []);

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

  // Export test case as CSV
  const downloadTestCaseAsCSV = (testCase) => {
    if (!testCase) {
      console.error('No test case to download');
      return;
    }
    
    try {
      // Create CSV header row for the basic test case information
      const headers = ['Test Case ID', 'Title', 'Type', 'Priority', 'Summary', 'Description', 'Precondition'];
      
      // Format the issue key referenced in the test case as a test case ID
      const testCaseId = testCase.issueKey ? `TC-${testCase.issueKey.replace(/[^0-9]/g, '')}` : 
                        `TC-${Date.now().toString().substring(6)}`;
      
      // Create the basic test case information row
      const testCaseInfo = [
        testCaseId,
        testCase.title || 'Untitled Test Case',
        testCase.type || 'Functional',
        testCase.priority || 'Medium',
        testCase.summary || '',
        (testCase.description || '').replace(/"/g, '""'), // Escape quotes for CSV
        (testCase.precondition || '').replace(/"/g, '""') // Escape quotes for CSV
      ];
      
      // Create CSV content for the base test case
      let csvContent = headers.join(',') + '\n' + testCaseInfo.map(field => `"${field}"`).join(',') + '\n\n';
      
      // Add steps section
      csvContent += 'Step #,Action,Expected Result,Test Data\n';
      
      // Add test steps
      if (Array.isArray(testCase.steps) && testCase.steps.length > 0) {
        testCase.steps.forEach((step, index) => {
          const stepData = [
            index + 1,
            `"${(step.step || '').replace(/"/g, '""')}"`,
            `"${(step.expected || '').replace(/"/g, '""')}"`,
            `"${(step.data || '').replace(/"/g, '""')}"`
          ];
          csvContent += stepData.join(',') + '\n';
        });
      }
      
      // Add metadata at the bottom
      csvContent += '\nMetadata\n';
      csvContent += `Generated for,${testCase.issueKey || 'Unknown Issue'}\n`;
      csvContent += `Generated on,${new Date().toLocaleDateString()}\n`;
      
      // Create Blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `test_case_${testCaseId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Test case downloaded as CSV');
    } catch (err) {
      console.error("Error exporting test case as CSV:", err);
      alert("Failed to export test case as CSV. See console for details.");
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
        return null;
      }
      
      let credentials;
      try {
        credentials = JSON.parse(savedData);
        // Check for base_url (not baseUrl) since that's the property name used in the form
        if (!credentials || !credentials.base_url) {
          console.error('Invalid JIRA credentials:', credentials);
          return null;
        }
      } catch (error) {
        console.error('Error parsing JIRA credentials:', error);
        return null;
      }
      
      // Call API to get detailed issue information
      const response = await apiService.getIssueDetails(credentials, node.data.key);
      
      if (!response || !response.success || !response.data) {
        console.error('No details returned for issue:', node.data.key);
        return null;
      }
      
      // Get the details from the response
      const details = response.data;
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
    // Reset test case state when selecting a new node
    setGeneratedTestCase(null);
    setShowCreateTestCase(false);
    setTestCaseGenerationError(null);
    
    setSelectedNode(node);
    // Fetch detailed information including description
    fetchIssueDetails(node);
    
    // Reset details tab to overview
    setDetailsTabValue(0);
  }, [fetchIssueDetails]);
  
  // Handle node right-click for context menu
  const onNodeContextMenu = useCallback((event, node) => {
    // Prevent default context menu
    event.preventDefault();
    
    // Set context menu position
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
    });
    
    // Store the node that was right-clicked
    setContextMenuNode(node);
  }, []);
  
  // Handle closing the context menu
  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);
  
  // Create test case in Xray format using LLM
  const handleCreateTestCase = useCallback(async () => {
    if (!contextMenuNode) return;
    
    // Close the context menu
    handleContextMenuClose();
    
    // Set the current node as selected to show details
    setSelectedNode(contextMenuNode);
    
    // Reset any previous generation errors
    setTestCaseGenerationError(null);
    
    // Start generating the test case
    setIsGeneratingTestCase(true);
    setShowCreateTestCase(true);
    setShowGenerationModal(true);
    
    // Switch to test case tab
    setDetailsTabValue(3);
    
    // Get issue details if not already loaded
    let currentIssueDetails = issueDetails;
    if (!currentIssueDetails) {
      try {
        setIsLoadingDetails(true);
        
        // Fetch issue details using the correct source of credentials
        let credentials;
        try {
          // Try jiraCredentials first (the state variable)
          if (jiraCredentials) {
            credentials = jiraCredentials;
          } else {
            // Fall back to sessionStorage
            const savedData = sessionStorage.getItem('jiraFormData');
            if (!savedData) {
              throw new Error('No JIRA credentials found. Please log in again.');
            }
            
            credentials = JSON.parse(savedData);
            if (!credentials || !credentials.base_url) {
              throw new Error('Invalid JIRA credentials. Please log in again.');
            }
          }
        } catch (credError) {
          throw new Error(`Failed to get credentials: ${credError.message}`);
        }
        
        // Make the API call with proper error handling
        try {
          const response = await apiService.getIssueDetails(credentials, contextMenuNode.data.key);
          
          if (response && response.success && response.data) {
            currentIssueDetails = response.data;
            setIssueDetails(currentIssueDetails);
            setDetailsJson(JSON.stringify(currentIssueDetails, null, 2));
            console.log('Successfully fetched issue details for test case generation');
          } else {
            throw new Error(response?.error || 'API returned an invalid response');
          }
        } catch (apiError) {
          throw new Error(`API Error: ${apiError.message}`);
        }
      } catch (error) {
        console.error('Error fetching issue details:', error);
        setTestCaseGenerationError(`Failed to fetch issue details: ${error.message}`);
        setIsGeneratingTestCase(false);
        return; // Exit early if we can't fetch issue details
      } finally {
        setIsLoadingDetails(false);
      }
    }
    
    try {
      // Make sure we have issue details before proceeding
      if (!currentIssueDetails) {
        throw new Error('Issue details are not available. Please try again.');
      }
      
      // Validate issue details are suitable for test case generation
      if (!currentIssueDetails.fields) {
        // Create a fallback fields object to avoid the error
        console.warn('Issue details missing fields property. Creating fallback structure.');
        currentIssueDetails.fields = {
          description: currentIssueDetails.description || '',
          summary: currentIssueDetails.summary || contextMenuNode.data.summary || '',
          issuetype: {
            name: currentIssueDetails.issue_type || contextMenuNode.data.issue_type || 'Story'
          }
        };
      }
      
      // Check if issue type is suitable for test case generation
      const issueType = currentIssueDetails.fields.issuetype?.name?.toLowerCase() || 
                       contextMenuNode.data.issue_type?.toLowerCase() || '';
      
      // Explicitly support task-type issues
      if (issueType === 'task') {
        console.log('Generating test case for task-type issue as requested in the requirements');
        // Add any special handling for task-type issues here
        // For example, we might want to generate different types of test steps based on task type
      }
      else if (issueType !== 'requirement' && issueType !== 'story' && issueType !== 'feature') {
        console.warn(`Issue type '${issueType}' might not be ideal for test case generation. Proceeding anyway.`);
      }
      
      // Extract description using our helper function
      const description = extractDescription(currentIssueDetails);
      
      console.log('Description extracted for test case generation:', 
        description ? `${description.substring(0, 50)}...` : 'No description found');
      
      // Prepare input for the formatter with all available data
      const formatterInput = {
        key: contextMenuNode.data.key,
        summary: currentIssueDetails.fields.summary || contextMenuNode.data.summary,
        issue_type: currentIssueDetails.fields.issuetype?.name || contextMenuNode.data.issue_type,
        status: currentIssueDetails.fields.status?.name || contextMenuNode.data.status,
        description: description,
        priority: currentIssueDetails.fields.priority?.name || 'Medium',
        assignee: currentIssueDetails.fields.assignee?.displayName || 'Unassigned',
        reporter: currentIssueDetails.fields.reporter?.displayName || 'Unknown',
        created: currentIssueDetails.fields.created || new Date().toISOString(),
        components: Array.isArray(currentIssueDetails.fields.components) 
          ? currentIssueDetails.fields.components.map(c => c.name).join(', ') 
          : '',
        labels: Array.isArray(currentIssueDetails.fields.labels) 
          ? currentIssueDetails.fields.labels.join(', ') 
          : ''
      };
      
      // Log what we're sending to the formatter
      console.log('Formatter input with complete details:', formatterInput);
      
      // Format data for LLM
      const formattedData = formatJiraForLLM(formatterInput);
      
      // Create a comprehensive issueData object with all possible information
      const issueData = {
        key: formattedData.key || contextMenuNode.data.key,
        summary: formattedData.summary || contextMenuNode.data.summary,
        issue_type: formattedData.issue_type || contextMenuNode.data.issue_type,
        status: formattedData.status || contextMenuNode.data.status,
        description: formattedData.description || description || "No description available",
        structured_data: {
          ...formattedData.structured_data,
          priority: formatterInput.priority,
          assignee: formatterInput.assignee,
          reporter: formatterInput.reporter,
          created: formatterInput.created,
          components: formatterInput.components,
          labels: formatterInput.labels
        },
        fields: currentIssueDetails.fields // Include the full fields object
      };
      
      console.log('Sending issue data to generate test case:', issueData);
      
      // API call to backend to generate test case
      try {
        const API_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/jira/generate-test-case`;
        console.log(`Making API request to: ${API_URL}`);
        
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            issueData: {
              // Include only the necessary fields to avoid circular references
              key: issueData.key,
              summary: issueData.summary,
              issue_type: issueData.issue_type,
              status: issueData.status,
              description: issueData.description,
              structured_data: issueData.structured_data,
              // Include a safe subset of fields
              fields: {
                summary: issueData.fields?.summary || issueData.summary,
                description: issueData.fields?.description || issueData.description,
                issuetype: {
                  name: issueData.fields?.issuetype?.name || issueData.issue_type
                },
                status: {
                  name: issueData.fields?.status?.name || issueData.status
                },
                priority: issueData.fields?.priority,
                components: issueData.fields?.components
              }
            }
          }),
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          let errorDetails;
          try {
            // Try to parse as JSON first
            errorDetails = await response.json();
            console.error('Error details from API:', errorDetails);
            throw new Error(`Failed to generate test case: ${errorDetails.message || errorDetails.error || 'Unknown API error'}`);
          } catch (jsonError) {
            // If not JSON, get as text
            const errorText = await response.text();
            console.error('Error text from API:', errorText);
            throw new Error(`Failed to generate test case: ${errorText || response.statusText || 'Unknown error'}`);
          }
        }
        
        const testCase = await response.json();
        console.log('Generated test case:', testCase);
        
        if (!testCase || Object.keys(testCase).length === 0) {
          throw new Error('Received empty test case from API');
        }
        
        // Log detailed information about the test case structure
        console.log('Test case generation successful:', {
          structure: Object.keys(testCase),
          hasSteps: !!testCase.steps,
          stepsCount: Array.isArray(testCase.steps) ? testCase.steps.length : 'N/A',
          title: testCase.title || 'No title',
          objective: testCase.objective ? `${testCase.objective.substring(0, 30)}...` : 'No objective'
        });
        
        // Set the generated test case
        setGeneratedTestCase(testCase);
      } catch (apiCallError) {
        console.error('API call error:', apiCallError);
        throw new Error(`API error: ${apiCallError.message}`);
      }
      
    } catch (error) {
      console.error('Error generating test case:', error);
      setTestCaseGenerationError(`Failed to generate test case: ${error.message}`);
    } finally {
      setIsGeneratingTestCase(false);
      // Keep the modal open to show either success or error
    }
  }, [contextMenuNode, handleContextMenuClose, issueDetails]);
  
  // Show test case status
  const handleShowTestStatus = useCallback(() => {
    if (!contextMenuNode) return;
    
    // Set the current node as selected to show details
    setSelectedNode(contextMenuNode);
    
    // Ensure we have the node data before showing the modal
    if (!contextMenuNode.data || !contextMenuNode.data.key) {
      console.error('Cannot show test status: Invalid node data');
      return;
    }
    
    // Show the test case status modal
    setShowTestCaseStatus(true);
    
    // Close the context menu
    handleContextMenuClose();
  }, [contextMenuNode, handleContextMenuClose]);

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

  // Function to handle Central JIRA ID submission
  const handleCentralJiraIdSubmit = async (e) => {
    e.preventDefault();
    // Validate JIRA ID input
    if (!centralJiraId || !centralJiraId.trim()) {
      setError('Please enter a Central JIRA ID');
      return;
    }
    
    // Validate JIRA ID format (usually PROJECT-123)
    const jiraIdPattern = /^[A-Za-z]+-\d+$/;
    if (!jiraIdPattern.test(centralJiraId.trim())) {
      setError('Invalid JIRA ID format. Please use format like PROJECT-123');
      return;
    }
    
    // Validate JIRA credentials are available
    if (!jiraCredentials || !jiraCredentials.username || !jiraCredentials.api_token || !jiraCredentials.base_url) {
      console.error('Missing JIRA credentials:', {
        hasCredentials: !!jiraCredentials,
        hasUsername: !!jiraCredentials?.username,
        hasToken: !!jiraCredentials?.api_token,
        hasBaseUrl: !!jiraCredentials?.base_url,
      });
      setError('Missing JIRA connection credentials. Please configure your JIRA connection first.');
      return;
    }
    
    setLoadingVisualization(true);
    setError(null);
    
    try {
      // Create request with credentials and central JIRA ID
      const requestData = {
        ...jiraCredentials,
        central_jira_id: centralJiraId.trim() // Use trimmed value
      };
      
      // Make API request with proper error handling
      const visualizationData = await apiService.visualizeJira(requestData);
      
      // Validate returned data structure
      if (!visualizationData) {
        throw new Error('No data returned from visualization request');
      }
      
      if (!Array.isArray(visualizationData.nodes)) {
        console.error('Invalid response: nodes is not an array', visualizationData);
        throw new Error('Invalid data structure received from server');
      }
      
      if (visualizationData.nodes.length === 0) {
        throw new Error(`No JIRA issues found for ID: ${centralJiraId}. Please check if the issue exists and you have proper access.`);
      }
      
      // Check for critical node data
      const hasInvalidNodes = visualizationData.nodes.some(node => !node || !node.id || !node.data);
      if (hasInvalidNodes) {
        console.warn('Some nodes have invalid format:', visualizationData.nodes.filter(n => !n || !n.id || !n.data));
        // We'll continue, as the visualization can handle some invalid nodes
      }
      
      // Log success
      console.log('Visualization successful:', {
        nodesCount: visualizationData.nodes.length,
        edgesCount: visualizationData.edges?.length || 0
      });
      
      // Update the session storage with this data
      sessionStorage.setItem('jiraVisualizationData', JSON.stringify(visualizationData));
      
      // Reload the page to show the visualization
      window.location.reload();
    } catch (err) {
      console.error('Visualization error:', err);
      // Provide more helpful error message based on error type
      if (err.status === 401 || err.message?.includes('Unauthorized')) {
        setError('Authentication failed. Please check your JIRA credentials.');
      } else if (err.status === 404 || err.message?.includes('found')) {
        setError(`JIRA issue ${centralJiraId} not found. Please verify the issue exists.`);
      } else if (err.status === 403) {
        setError('Permission denied. You do not have access to this JIRA issue.');
      } else if (!navigator.onLine) {
        setError('Network connection lost. Please check your internet connection.');
      } else {
        setError(err.message || 'Failed to fetch JIRA data. See console for details.');
      }
    } finally {
      setLoadingVisualization(false);
    }
  };

  return (
    <Container maxWidth={false} sx={{ height: 'calc(100vh - 64px)', p: 0 }}>
      {/* Show Central JIRA ID input form if needed */}
      {showJiraIdInput && (
        <Paper elevation={3} sx={{ p: 4, mt: 4, mx: 'auto', maxWidth: 'md' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Enter Central JIRA ID
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Your JIRA connection is established. Please enter a Central JIRA ID to visualize relationships.
          </Typography>
          
          <Box component="form" onSubmit={handleCentralJiraIdSubmit} noValidate sx={{ mt: 3 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="central_jira_id"
              label="Central JIRA ID"
              name="central_jira_id"
              placeholder="e.g. PROJECT-123"
              value={centralJiraId}
              onChange={(e) => setCentralJiraId(e.target.value)}
              helperText="This will be the central node in the visualization"
              autoFocus
              InputProps={{
                sx: { fontSize: '1.1rem', letterSpacing: '0.05rem' }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCentralJiraIdSubmit(e);
                }
              }}
            />
            
            {error && (
              <Alert 
                severity="error" 
                sx={{ mt: 2 }}
                action={
                  <IconButton
                    aria-label="close"
                    color="inherit"
                    size="small"
                    onClick={() => setError(null)}
                  >
                    <CloseIcon fontSize="inherit" />
                  </IconButton>
                }
              >
                <Typography variant="body2">{error}</Typography>
              </Alert>
            )}
            
            <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loadingVisualization}
                startIcon={loadingVisualization ? null : <VisibilityIcon />}
                sx={{ position: 'relative' }}
              >
                {loadingVisualization ? 'Connecting...' : 'Visualize'}
                {loadingVisualization && (
                  <CircularProgress 
                    size={24} 
                    sx={{ 
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      marginTop: '-12px',
                      marginLeft: '-12px' 
                    }} 
                  />
                )}
              </Button>
              <Typography 
                variant="caption" 
                sx={{ ml: 2, color: 'text.secondary', opacity: loadingVisualization ? 1 : 0 }}
              >
                Retrieving JIRA data and building visualization...
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Main Visualization Content */}
      {!showJiraIdInput && (
        <Paper elevation={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
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
            {/* Issue Type Summary - Show when visualizing whole project */}
            {data?.nodes?.length > 10 && (
              <JiraIssueTypeSummary nodes={data.nodes} />
            )}
            
            {/* Filter Menu - Prominently placed at the top for better visibility */}
            <Box sx={{ 
              p: 2, 
              mb: 1,
              borderBottom: '2px solid rgba(63, 81, 181, 0.2)',
              backgroundColor: 'rgba(63, 81, 181, 0.03)',
              borderRadius: '4px 4px 0 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                color: '#3f51b5', 
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <FilterAltIcon /> Filter Issues by Type
              </Typography>
              
              {/* Filter Chips - Prominently displayed at the top */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
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
                {/* Add special highlight for task-type issues for test case generation */}
                <Tooltip title="Task-Type Issues (For Test Cases)">
                  <Chip
                    icon={<CreateIcon />}
                    label="Tasks (Test Cases)"
                    color="secondary"
                    variant="outlined"
                    onClick={() => {
                      // Filter to show only task-type issues
                      const taskNodes = nodes.filter(
                        node => node?.data?.issue_type?.toLowerCase() === 'task'
                      );
                      
                      setFilteredNodes(taskNodes);
                      setSearchTerm('task');
                    }}
                    sx={{ 
                      cursor: 'pointer',
                      borderColor: '#6a0dad',
                      borderWidth: '2px',
                      fontWeight: 'bold'
                    }}
                  />
                </Tooltip>
              </Box>
              
              {/* Search and Controls Row */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                
                {/* Layout Direction Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                  
                  {/* Export Options */}
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                    <Tooltip title="Export as PNG">
                      <IconButton onClick={() => exportImage('png')}>
                        <ImageIcon />
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
                  </Box>
                </Box>
              </Box>
            </Box>
            
            {/* Add Split View with JIRA IDs List and Visualization */}
            <Box sx={{ display: 'flex', height: 'calc(100% - 140px)' }}>
              {/* JIRA IDs List Panel with Central ID Prominent */}
              <Box sx={{ width: '320px', overflow: 'hidden', borderRight: '1px solid #e0e0e0', display: { xs: 'none', md: 'block' } }}>
                {/* Central JIRA ID Badge - New prominent display */}
                {nodes.filter(node => node.type === 'central').map(centralNode => (
                  <Box 
                    key={centralNode.id}
                    sx={{ 
                      p: 2, 
                      backgroundColor: 'rgba(255, 152, 0, 0.1)', 
                      borderBottom: '1px solid rgba(255, 152, 0, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Central JIRA ID
                    </Typography>
                    <Button
                      variant="outlined"
                      color="warning"
                      size="medium"
                      onClick={() => {
                        setSelectedNode(centralNode);
                        fetchIssueDetails(centralNode);
                        
                        if (reactFlowInstance) {
                          setTimeout(() => {
                            reactFlowInstance.fitView({ 
                              padding: 0.5,
                              nodes: [centralNode.id]
                            });
                          }, 50);
                        }
                      }}
                      sx={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 'bold',
                        letterSpacing: '0.5px',
                        minWidth: '150px',
                        mb: 1
                      }}
                    >
                      {centralNode.data.key}
                    </Button>
                    <Typography variant="caption" noWrap sx={{ maxWidth: '280px', textAlign: 'center' }}>
                      {centralNode.data.summary}
                    </Typography>
                  </Box>
                ))}
                
                <JiraIdsList 
                  nodes={nodes} 
                  onSelect={(node) => {
                    console.log("JIRA ID clicked:", node.data.key);
                    // Reset test case state when selecting a new JIRA ID
                    setGeneratedTestCase(null);
                    setShowCreateTestCase(false);
                    setTestCaseGenerationError(null);
                    
                    setSelectedNode(node);
                    fetchIssueDetails(node);
                    
                    // Reset details tab to overview
                    setDetailsTabValue(0);
                    
                    // Fit view to highlight the selected node
                    if (reactFlowInstance) {
                      // Adding a slight delay helps the view update properly
                      setTimeout(() => {
                        reactFlowInstance.fitView({ 
                          padding: 0.5,
                          nodes: [node.id]
                        });
                      }, 50);
                    }
                  }}
                  onFilterByType={(issueType) => {
                    const typeNodes = nodes.filter(
                      node => node?.data?.issue_type?.toLowerCase() === issueType.toLowerCase()
                    );
                    setFilteredNodes(typeNodes);
                    setSearchTerm(issueType);
                  }}
                />
              </Box>
              
              {/* Main Visualization Area with side panel */}
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <Divider />
                
                {/* The Flow Chart Container - adjusted width to make room for details panel */}
                <Box 
                  ref={flowRef} 
                  className="reactflow-wrapper" 
                  sx={{ 
                    flexGrow: 1, 
                    position: 'relative',
                    width: selectedNode ? 
                      (sidebarMinimized ? 'calc(100% - 50px)' : 'calc(100% - 380px)') : 
                      '100%',
                    height: '100%',
                    transition: 'width 0.3s ease'
                  }}
                >
                  {/* Context Menu */}
                  <Menu
                    keepMounted
                    open={contextMenu !== null}
                    onClose={handleContextMenuClose}
                    anchorReference="anchorPosition"
                    anchorPosition={
                      contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                    }
                  >
                    <MenuItem onClick={handleCreateTestCase}>
                      <ListItemIcon>
                        <CreateIcon fontSize="small" sx={{ color: '#6a0dad' }} />
                      </ListItemIcon>
                      <ListItemText primary="Generate Test Case (XRAY Format)" />
                    </MenuItem>
                    <MenuItem onClick={handleShowTestStatus}>
                      <ListItemIcon>
                        <InfoIcon fontSize="small" sx={{ color: '#3f51b5' }} />
                      </ListItemIcon>
                      <ListItemText primary="Show Test Case Status" />
                    </MenuItem>
                  </Menu>
                  
                  <ReactFlow
                    nodes={displayedNodes}
                    edges={displayedEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    onNodeContextMenu={onNodeContextMenu}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    nodesDraggable={true}
                    nodesConnectable={false}
                    onInit={setReactFlowInstance}
                    attributionPosition="bottom-right"
                    // Register drag event handlers
                    onNodeDragStart={onNodeDragStart}
                    onNodeDrag={onNodeDrag}
                    onNodeDragStop={onNodeDragStop}
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

                    {/* Enhanced Legend Panel */}
                    <Panel position="bottom-right" className="legend-panel">
                      <Paper 
                        elevation={6} 
                        sx={{ 
                          p: 0,
                          borderRadius: 2, 
                          maxWidth: 300,
                          overflow: 'hidden',
                          boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                          animation: 'slideInUp 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                          '@keyframes slideInUp': {
                            from: { transform: 'translateY(30px)', opacity: 0 },
                            to: { transform: 'translateY(0)', opacity: 1 }
                          },
                          border: '1px solid rgba(0,0,0,0.05)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <Box sx={{ 
                          p: 2, 
                          background: 'linear-gradient(135deg, #3f51b5 0%, #5c6bc0 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          cursor: 'pointer'
                        }} onClick={() => setLegendMinimized(!legendMinimized)}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LegendToggleIcon sx={{ color: 'white', fontSize: 20 }} />
                            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                              Visualization Legend
                            </Typography>
                          </Box>
                          
                          <IconButton 
                            onClick={(e) => {
                              e.stopPropagation();
                              setLegendMinimized(!legendMinimized);
                            }}
                            size="small"
                            sx={{ 
                              color: 'white', 
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)'
                              }
                            }}
                          >
                            {legendMinimized ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                          </IconButton>
                        </Box>
                        
                        {!legendMinimized && (
                        <Box sx={{ 
                          p: 2.5,
                          background: 'white',
                          backdropFilter: 'blur(8px)'
                        }}>
                          {/* Node Types Section */}
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ 
                              fontWeight: 600, 
                              mb: 1.5, 
                              color: '#3f51b5',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              borderBottom: '1px solid rgba(0,0,0,0.06)',
                              pb: 1
                            }}>
                              <AccountTreeIcon fontSize="small" />
                              Issue Types
                            </Typography>
                            
                            <Box sx={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: 1.2 
                            }}>
                              <Tooltip title="Central issue in this visualization">
                                <Chip
                                  size="small"
                                  avatar={<Avatar sx={{ bgcolor: '#ff9800' }}>C</Avatar>}
                                  label="Central"
                                  sx={{ 
                                    bgcolor: 'rgba(255, 152, 0, 0.1)', 
                                    color: '#ff9800',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      bgcolor: 'rgba(255, 152, 0, 0.18)',
                                      transform: 'translateY(-2px)',
                                    }
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title="Parent of other issues">
                                <Chip
                                  size="small"
                                  avatar={<Avatar sx={{ bgcolor: '#9c27b0' }}>P</Avatar>}
                                  label="Parent"
                                  sx={{ 
                                    bgcolor: 'rgba(156, 39, 176, 0.1)', 
                                    color: '#9c27b0',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      bgcolor: 'rgba(156, 39, 176, 0.18)',
                                      transform: 'translateY(-2px)',
                                    }
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title="Requirements and specifications">
                                <Chip
                                  size="small"
                                  avatar={<Avatar sx={{ bgcolor: '#4dabf5' }}>R</Avatar>}
                                  label="Requirement"
                                  sx={{ 
                                    bgcolor: 'rgba(77, 171, 245, 0.1)', 
                                    color: '#4dabf5',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      bgcolor: 'rgba(77, 171, 245, 0.18)',
                                      transform: 'translateY(-2px)',
                                    }
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title="Test cases and test plans">
                                <Chip
                                  size="small"
                                  avatar={<Avatar sx={{ bgcolor: '#66bb6a' }}>T</Avatar>}
                                  label="Test"
                                  sx={{ 
                                    bgcolor: 'rgba(102, 187, 106, 0.1)', 
                                    color: '#66bb6a',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      bgcolor: 'rgba(102, 187, 106, 0.18)',
                                      transform: 'translateY(-2px)',
                                    }
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title="Bugs and defects">
                                <Chip
                                  size="small"
                                  avatar={<Avatar sx={{ bgcolor: '#f44336' }}>D</Avatar>}
                                  label="Defect"
                                  sx={{ 
                                    bgcolor: 'rgba(244, 67, 54, 0.1)', 
                                    color: '#f44336',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      bgcolor: 'rgba(244, 67, 54, 0.18)',
                                      transform: 'translateY(-2px)',
                                    }
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title="Other issue types">
                                <Chip
                                  size="small"
                                  avatar={<Avatar sx={{ bgcolor: '#9e9e9e' }}>O</Avatar>}
                                  label="Other"
                                  sx={{ 
                                    bgcolor: 'rgba(158, 158, 158, 0.1)', 
                                    color: '#9e9e9e',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      bgcolor: 'rgba(158, 158, 158, 0.18)',
                                      transform: 'translateY(-2px)',
                                    }
                                  }}
                                />
                              </Tooltip>
                            </Box>
                          </Box>
                        
                          {/* Edge Types Section */}
                          <Typography variant="subtitle2" sx={{ 
                            fontWeight: 600, 
                            mb: 1.5, 
                            color: '#3f51b5',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            borderBottom: '1px solid rgba(0,0,0,0.06)',
                            pb: 1
                          }}>
                            <SwapHorizIcon fontSize="small" />
                            Connection Types
                          </Typography>
                          
                          <Box sx={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr',
                            gap: 1.2,
                            '& .connection-item': {
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              p: 1,
                              borderRadius: 1.5,
                              transition: 'all 0.2s ease',
                              bgcolor: 'rgba(0,0,0,0.01)',
                              border: '1px solid rgba(0,0,0,0.03)',
                              '&:hover': { 
                                bgcolor: 'rgba(0,0,0,0.03)',
                                transform: 'translateX(3px)'
                              }
                            }
                          }}>
                            <Tooltip title="This issue blocks or depends on another issue">
                              <Box className="connection-item">
                                <Box sx={{ 
                                  width: 40, 
                                  height: 4, 
                                  bgcolor: '#f44336', 
                                  borderRadius: 1,
                                  boxShadow: '0 0 5px rgba(244, 67, 54, 0.3)'
                                }} />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>Blocks/Depends</Typography>
                              </Box>
                            </Tooltip>
                            <Tooltip title="This issue tests or verifies another issue">
                              <Box className="connection-item">
                                <Box sx={{ 
                                  width: 40, 
                                  height: 4, 
                                  bgcolor: '#66bb6a', 
                                  borderRadius: 1,
                                  boxShadow: '0 0 5px rgba(102, 187, 106, 0.3)'
                                }} />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>Tests/Verifies</Typography>
                              </Box>
                            </Tooltip>
                            <Tooltip title="This issue implements another issue">
                              <Box className="connection-item">
                                <Box sx={{ 
                                  width: 40, 
                                  height: 4, 
                                  bgcolor: '#4dabf5', 
                                  borderRadius: 1,
                                  boxShadow: '0 0 5px rgba(77, 171, 245, 0.3)'
                                }} />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>Implements</Typography>
                              </Box>
                            </Tooltip>
                            <Tooltip title="Other relationship types">
                              <Box className="connection-item">
                                <Box sx={{ 
                                  width: 40, 
                                  height: 4, 
                                  bgcolor: '#555', 
                                  borderRadius: 1,
                                  boxShadow: '0 0 5px rgba(85, 85, 85, 0.3)'
                                }} />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>Other Relations</Typography>
                              </Box>
                            </Tooltip>
                          </Box>
                        </Box>
                        )}
                        </Paper>
                      </Panel>
                    </ReactFlow>
                  </Box>
                </Box>
                  
                  {/* Node Details Sidebar - Modern UI */}
                  {selectedNode && (
                    <Paper 
                      elevation={6} 
                      sx={{ 
                        width: sidebarMinimized ? 50 : 380, 
                        borderLeft: '2px solid #3f51b5',
                        borderRadius: '0 8px 8px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: sidebarMinimized ? 'visible' : 'auto',
                        overflowX: 'hidden',
                        height: '100%',
                        transition: 'all 0.3s ease',
                        animation: 'slideInRight 0.3s',
                        '@keyframes slideInRight': {
                          from: { transform: 'translateX(50px)', opacity: 0 },
                          to: { transform: 'translateX(0)', opacity: 1 }
                        }
                      }}
                    >
                          <Box sx={{ 
                            p: sidebarMinimized ? 1 : 2.5, 
                            background: 'linear-gradient(135deg, #3f51b5 0%, #5c6bc0 100%)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: 'white',
                            borderRadius: '0 8px 0 0',
                            minHeight: 56
                          }}>
                            {!sidebarMinimized ? (
                              <>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography 
                                    variant="subtitle1" 
                                    sx={{ 
                                      fontWeight: 'bold',
                                      fontSize: '1rem',
                                      lineHeight: 1.4,
                                      margin: 0,
                                      padding: 0
                                    }}
                                  >
                                    Issue Details
                                  </Typography>
                                  {selectedNode.data.key && (
                                    <Chip 
                                      label={selectedNode.data.key} 
                                      size="small" 
                                      sx={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                        color: 'white',
                                        fontWeight: 'bold'
                                      }} 
                                    />
                                  )}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <Tooltip title="Minimize panel">
                                    <IconButton 
                                      size="small" 
                                      onClick={() => setSidebarMinimized(true)} 
                                      sx={{ color: 'white' }}
                                    >
                                      <KeyboardArrowRightIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Close details">
                                    <IconButton size="small" onClick={clearSelectedNode} sx={{ color: 'white' }}>
                                      <RestartAltIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </>
                            ) : (
                              <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center',
                                width: '100%',
                                gap: 1
                              }}>
                                <Tooltip title="Expand panel" placement="left">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => setSidebarMinimized(false)} 
                                    sx={{ color: 'white' }}
                                  >
                                    <KeyboardArrowLeftIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Close details" placement="left">
                                  <IconButton 
                                    size="small" 
                                    onClick={clearSelectedNode} 
                                    sx={{ color: 'white' }}
                                  >
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </Box>
                          
                          {/* Modern Issue Details Tabs */}
                          <Box sx={{ borderBottom: 0, pt: 0.5, display: sidebarMinimized ? 'none' : 'block' }}>
                            <Tabs 
                              value={detailsTabValue} 
                              onChange={(e, newValue) => setDetailsTabValue(newValue)} 
                              variant="scrollable"
                              scrollButtons="auto"
                              TabIndicatorProps={{ 
                                style: { backgroundColor: '#5c6bc0', height: 3 } 
                              }}
                              sx={{
                                '& .MuiTab-root': {
                                  minWidth: 'auto',
                                  fontWeight: 'medium',
                                  textTransform: 'none',
                                  fontSize: '0.9rem',
                                  px: 2
                                },
                                '& .Mui-selected': {
                                  color: '#3f51b5',
                                  fontWeight: 'bold'
                                }
                              }}
                            >
                              <Tab icon={<InfoIcon fontSize="small" />} iconPosition="start" label="Overview" />
                              <Tab icon={<DescriptionIcon fontSize="small" />} iconPosition="start" label="Details" />
                              <Tab icon={<CodeIcon fontSize="small" />} iconPosition="start" label="JSON" />
                              {showCreateTestCase && <Tab icon={<CheckCircleIcon fontSize="small" />} iconPosition="start" label="Test Case" />}
                            </Tabs>
                          </Box>
                          
                          {isLoadingDetails && !sidebarMinimized && (
                            <LinearProgress color="secondary" sx={{ height: 3, bgcolor: 'rgba(92, 107, 192, 0.1)' }} />
                          )}
                          
                          {/* Tab content - only shown when not minimized */}
                          <Box sx={{ display: sidebarMinimized ? 'none' : 'block' }}>
                            {/* Enhanced Overview Tab */}
                          {detailsTabValue === 0 && (
                            <Box sx={{ p: 3 }}>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontWeight: 600, 
                                  mb: 2,
                                  lineHeight: 1.3,
                                  color: '#111827',
                                  position: 'relative',
                                  pl: 0.5,
                                  '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    left: -8,
                                    top: 2,
                                    bottom: 2,
                                    width: 4,
                                    borderRadius: 4,
                                    backgroundColor: '#5c6bc0'
                                  }
                                }}
                              >
                                {selectedNode.data.summary}
                              </Typography>
                              
                              <Box sx={{ 
                                display: 'flex', 
                                gap: 1, 
                                mb: 3,
                                flexWrap: 'wrap'
                              }}>
                                {/* Issue Type Chip */}
                                <Chip
                                  icon={
                                    selectedNode.data.issue_type?.toLowerCase().includes('bug') ? <BugReportIcon /> :
                                    selectedNode.data.issue_type?.toLowerCase().includes('test') ? <CheckCircleOutlineIcon /> :
                                    selectedNode.data.issue_type?.toLowerCase().includes('requirement') ? <AssignmentIcon /> :
                                    <FlagIcon />
                                  }
                                  label={selectedNode.data.issue_type || "Unknown"}
                                  size="small"
                                  sx={{
                                    bgcolor: 
                                      selectedNode.data.issue_type?.toLowerCase().includes('bug') ? 'rgba(244, 67, 54, 0.1)' :
                                      selectedNode.data.issue_type?.toLowerCase().includes('test') ? 'rgba(102, 187, 106, 0.1)' :
                                      selectedNode.data.issue_type?.toLowerCase().includes('requirement') ? 'rgba(77, 171, 245, 0.1)' :
                                      'rgba(156, 39, 176, 0.1)',
                                    color: 
                                      selectedNode.data.issue_type?.toLowerCase().includes('bug') ? '#f44336' :
                                      selectedNode.data.issue_type?.toLowerCase().includes('test') ? '#66bb6a' :
                                      selectedNode.data.issue_type?.toLowerCase().includes('requirement') ? '#4dabf5' :
                                      '#9c27b0',
                                    fontWeight: 500,
                                    border: '1px solid',
                                    borderColor: 
                                      selectedNode.data.issue_type?.toLowerCase().includes('bug') ? 'rgba(244, 67, 54, 0.2)' :
                                      selectedNode.data.issue_type?.toLowerCase().includes('test') ? 'rgba(102, 187, 106, 0.2)' :
                                      selectedNode.data.issue_type?.toLowerCase().includes('requirement') ? 'rgba(77, 171, 245, 0.2)' :
                                      'rgba(156, 39, 176, 0.2)',
                                  }}
                                />
                                
                                {/* Status Chip */}
                                <Chip
                                  label={selectedNode.data.status || "No Status"}
                                  size="small"
                                  sx={{
                                    bgcolor: 
                                      selectedNode.data.status?.toLowerCase().includes('done') || 
                                      selectedNode.data.status?.toLowerCase().includes('closed') ? 'rgba(102, 187, 106, 0.1)' :
                                      selectedNode.data.status?.toLowerCase().includes('progress') ? 'rgba(255, 152, 0, 0.1)' :
                                      selectedNode.data.status?.toLowerCase().includes('open') || 
                                      selectedNode.data.status?.toLowerCase().includes('todo') ? 'rgba(77, 171, 245, 0.1)' :
                                      'rgba(189, 189, 189, 0.1)',
                                    color: 
                                      selectedNode.data.status?.toLowerCase().includes('done') || 
                                      selectedNode.data.status?.toLowerCase().includes('closed') ? '#66bb6a' :
                                      selectedNode.data.status?.toLowerCase().includes('progress') ? '#ff9800' :
                                      selectedNode.data.status?.toLowerCase().includes('open') || 
                                      selectedNode.data.status?.toLowerCase().includes('todo') ? '#4dabf5' :
                                      '#757575',
                                    fontWeight: 500,
                                    border: '1px solid',
                                    borderColor: 
                                      selectedNode.data.status?.toLowerCase().includes('done') || 
                                      selectedNode.data.status?.toLowerCase().includes('closed') ? 'rgba(102, 187, 106, 0.2)' :
                                      selectedNode.data.status?.toLowerCase().includes('progress') ? 'rgba(255, 152, 0, 0.2)' :
                                      selectedNode.data.status?.toLowerCase().includes('open') || 
                                      selectedNode.data.status?.toLowerCase().includes('todo') ? 'rgba(77, 171, 245, 0.2)' :
                                      'rgba(189, 189, 189, 0.2)',
                                  }}
                                />
                                
                                {/* Priority chip if available */}
                                {selectedNode.data.priority && (
                                  <Chip
                                    icon={
                                      selectedNode.data.priority.toLowerCase().includes('high') || 
                                      selectedNode.data.priority.toLowerCase().includes('critical') ? 
                                        <PriorityHighIcon fontSize="small" /> : 
                                      selectedNode.data.priority.toLowerCase().includes('low') ? 
                                        <LowPriorityIcon fontSize="small" /> :
                                        <FlagIcon fontSize="small" />
                                    }
                                    label={selectedNode.data.priority}
                                    size="small"
                                    sx={{
                                      bgcolor: 
                                        selectedNode.data.priority.toLowerCase().includes('high') || 
                                        selectedNode.data.priority.toLowerCase().includes('critical') ? 
                                          'rgba(244, 67, 54, 0.08)' : 
                                        selectedNode.data.priority.toLowerCase().includes('low') ? 
                                          'rgba(76, 175, 80, 0.08)' :
                                          'rgba(255, 152, 0, 0.08)',
                                      color: 
                                        selectedNode.data.priority.toLowerCase().includes('high') || 
                                        selectedNode.data.priority.toLowerCase().includes('critical') ? 
                                          '#f44336' : 
                                        selectedNode.data.priority.toLowerCase().includes('low') ? 
                                          '#4caf50' :
                                          '#ff9800',
                                      fontWeight: 500,
                                      border: '1px solid',
                                      borderColor: 
                                        selectedNode.data.priority.toLowerCase().includes('high') || 
                                        selectedNode.data.priority.toLowerCase().includes('critical') ? 
                                          'rgba(244, 67, 54, 0.2)' : 
                                        selectedNode.data.priority.toLowerCase().includes('low') ? 
                                          'rgba(76, 175, 80, 0.2)' :
                                          'rgba(255, 152, 0, 0.2)',
                                    }}
                                  />
                                )}
                              </Box>
                              
                              {/* Issue details in cards with shadow and hover effects */}
                              <Grid container spacing={2}>
                                {/* Key Information Card */}
                                <Grid item xs={12}>
                                  <Card variant="outlined" sx={{ 
                                    borderRadius: 2,
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    '&:hover': {
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    },
                                    border: '1px solid rgba(0,0,0,0.08)'
                                  }}>
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                      <Grid container spacing={2}>
                                        {/* Key info */}
                                        <Grid item xs={6}>
                                          <Typography variant="caption" color="text.secondary" gutterBottom component="div" sx={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5
                                          }}>
                                            <KeyIcon fontSize="inherit" />
                                            Key
                                          </Typography>
                                          <Typography variant="body2" fontWeight={500}>
                                            {selectedNode.data.key || "N/A"}
                                          </Typography>
                                        </Grid>

                                        {/* Assignee */}
                                        <Grid item xs={6}>
                                          <Typography variant="caption" color="text.secondary" gutterBottom component="div" sx={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5
                                          }}>
                                            <PersonOutlineIcon fontSize="inherit" />
                                            Assignee
                                          </Typography>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar 
                                              src={selectedNode.data.assignee_avatar} 
                                              alt={selectedNode.data.assignee || "Unassigned"}
                                              sx={{ width: 22, height: 22 }}
                                            />
                                            <Typography variant="body2">
                                              {selectedNode.data.assignee || "Unassigned"}
                                            </Typography>
                                          </Box>
                                        </Grid>
                                        
                                        {/* Reporter */}
                                        <Grid item xs={6}>
                                          <Typography variant="caption" color="text.secondary" gutterBottom component="div" sx={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5
                                          }}>
                                            <RecordVoiceOverIcon fontSize="inherit" />
                                            Reporter
                                          </Typography>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar 
                                              src={selectedNode.data.reporter_avatar} 
                                              alt={selectedNode.data.reporter || "Unknown"}
                                              sx={{ width: 22, height: 22 }}
                                            />
                                            <Typography variant="body2">
                                              {selectedNode.data.reporter || "Unknown"}
                                            </Typography>
                                          </Box>
                                        </Grid>

                                        {/* Created date */}
                                        <Grid item xs={6}>
                                          <Typography variant="caption" color="text.secondary" gutterBottom component="div" sx={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5
                                          }}>
                                            <CalendarTodayIcon fontSize="inherit" />
                                            Created
                                          </Typography>
                                          <Typography variant="body2">
                                            {selectedNode.data.created ? new Date(selectedNode.data.created).toLocaleDateString() : "Unknown"}
                                          </Typography>
                                        </Grid>
                                      </Grid>
                                    </CardContent>
                                  </Card>
                                </Grid>
                                
                                {/* Related Issues Card */}
                                {selectedNode.data.connected_issues && selectedNode.data.connected_issues.length > 0 && (
                                  <Grid item xs={12}>
                                    <Card variant="outlined" sx={{ 
                                      borderRadius: 2,
                                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                      '&:hover': {
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                      },
                                      border: '1px solid rgba(0,0,0,0.08)'
                                    }}>
                                      <CardHeader
                                        title={
                                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                            Related Issues
                                          </Typography>
                                        }
                                        avatar={<LinkIcon color="primary" />}
                                        sx={{ py: 1.5, px: 2 }}
                                      />
                                      <Divider />
                                      <CardContent sx={{ p: 0 }}>
                                        <List dense disablePadding>
                                          {selectedNode.data.connected_issues.slice(0, 5).map((issue, index) => (
                                            <ListItem 
                                              key={index} 
                                              disablePadding 
                                              divider={index < selectedNode.data.connected_issues.slice(0, 5).length - 1}
                                            >
                                              <ListItemButton 
                                                onClick={() => {
                                                  const node = nodes.find(n => n.data.key === issue.key);
                                                  if (node) {
                                                    setSelectedNode(node);
                                                    loadIssueDetails(node.data.key);
                                                  }
                                                }}
                                                sx={{ 
                                                  py: 1,
                                                  transition: 'all 0.2s ease',
                                                  '&:hover': {
                                                    backgroundColor: 'rgba(63, 81, 181, 0.08)'
                                                  }
                                                }}
                                              >
                                                <ListItemIcon sx={{ minWidth: 'auto', mr: 1, color: 'primary.main' }}>
                                                  {issue.relationship_type?.toLowerCase().includes('blocks') ? (
                                                    <BlockIcon fontSize="small" sx={{ color: '#f44336' }} />
                                                  ) : issue.relationship_type?.toLowerCase().includes('test') ? (
                                                    <CheckCircleOutlineIcon fontSize="small" sx={{ color: '#66bb6a' }} />
                                                  ) : issue.relationship_type?.toLowerCase().includes('implements') ? (
                                                    <CodeIcon fontSize="small" sx={{ color: '#4dabf5' }} />
                                                  ) : (
                                                    <ArrowRightAltIcon fontSize="small" />
                                                  )}
                                                </ListItemIcon>
                                                <ListItemText 
                                                  primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                      <Typography variant="body2" fontWeight={500}>
                                                        {issue.key}
                                                      </Typography>
                                                      <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                          maxWidth: '200px',
                                                          whiteSpace: 'nowrap',
                                                          overflow: 'hidden',
                                                          textOverflow: 'ellipsis',
                                                          color: 'text.secondary',
                                                          fontSize: '0.8rem'
                                                        }}
                                                      >
                                                        - {issue.summary || ""}
                                                      </Typography>
                                                    </Box>
                                                  }
                                                  secondary={
                                                    <Typography 
                                                      variant="caption" 
                                                      sx={{ color: 'text.secondary', display: 'block', fontSize: '0.75rem' }}
                                                    >
                                                      {issue.relationship_type || "Related"}
                                                    </Typography>
                                                  }
                                                />
                                              </ListItemButton>
                                            </ListItem>
                                          ))}
                                        </List>
                                        
                                        {/* Show more link if more than 5 related issues */}
                                        {selectedNode.data.connected_issues.length > 5 && (
                                          <Box sx={{ p: 1, textAlign: 'center' }}>
                                            <Button 
                                              size="small" 
                                              sx={{ fontSize: '0.75rem' }}
                                              endIcon={<ExpandMoreIcon />}
                                              onClick={() => setDetailsTabValue(2)} // Switch to the JSON tab which has all data
                                            >
                                              Show {selectedNode.data.connected_issues.length - 5} more
                                            </Button>
                                          </Box>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                )}
                              </Grid>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  startIcon={<OpenInNewIcon />}
                                  onClick={() => window.open(`${jiraBaseUrl}/browse/${selectedNode.data.key}`, '_blank')}
                                  sx={{
                                    textTransform: 'none',
                                    borderRadius: 1.5
                                  }}
                                >
                                  Open in JIRA
                                </Button>
                              </Box>
                            </Box>
                          )}
                          
                          {/* Description Tab - Enhanced UI */}
                          {detailsTabValue === 1 && (
                            <Box sx={{ p: 2.5 }}>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                mb: 2 
                              }}>
                                <DescriptionIcon color="primary" />
                                <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                                  {selectedNode.data.key} - Description
                                </Typography>
                              </Box>
                              
                              {issueDetails ? (
                                <Box sx={{ 
                                  position: 'relative',
                                  mt: 1,
                                  borderRadius: 2,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                  overflow: 'hidden'
                                }}>
                                  <Box sx={{
                                    maxHeight: '60vh',
                                    overflowY: 'auto',
                                    p: 2.5,
                                    bgcolor: '#fcfcfc',
                                    borderRadius: 2,
                                    border: '1px solid rgba(0,0,0,0.07)',
                                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                                    fontSize: '0.95rem',
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap',
                                    '& p': { mb: 1.5 },
                                    '& pre': { 
                                      backgroundColor: '#f5f5f5', 
                                      p: 1.5,
                                      borderRadius: 1,
                                      overflowX: 'auto',
                                      fontSize: '0.9rem',
                                      fontFamily: '"Consolas", "Monaco", monospace'
                                    },
                                    '& ul, & ol': {
                                      pl: 2.5,
                                      mb: 1.5
                                    },
                                    '& blockquote': {
                                      borderLeft: '4px solid #e0e0e0',
                                      pl: 2,
                                      opacity: 0.8
                                    },
                                    '& a': {
                                      color: '#3f51b5',
                                      textDecoration: 'none',
                                      '&:hover': {
                                        textDecoration: 'underline'
                                      }
                                    },
                                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                                      color: '#333',
                                      fontWeight: 600,
                                      mb: 1.5,
                                      mt: 2.5
                                    },
                                    '& table': {
                                      borderCollapse: 'collapse',
                                      width: '100%',
                                      mb: 2,
                                      '& th, & td': {
                                        border: '1px solid #e0e0e0',
                                        p: 1,
                                        textAlign: 'left'
                                      },
                                      '& th': {
                                        backgroundColor: '#f7f7f7'
                                      }
                                    },
                                    '& hr': {
                                      height: '1px',
                                      backgroundColor: '#e0e0e0',
                                      border: 'none',
                                      my: 2.5
                                    },
                                    '& img': {
                                      maxWidth: '100%',
                                      height: 'auto',
                                      display: 'block',
                                      my: 2,
                                      borderRadius: 1
                                    }
                                  }}>
                                    {/* Use our formatter to handle Atlassian Document Format if present */}
                                    {adfToText(issueDetails.description) || 
                                      <Typography 
                                        variant="body2" 
                                        sx={{ color: 'text.secondary', fontStyle: 'italic', p: 1 }}
                                      >
                                        No description available for this issue.
                                      </Typography>
                                    }
                                  </Box>
                                </Box>
                              ) : (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                  <CircularProgress size={28} thickness={4} />
                                </Box>
                              )}
                              
                              <Stack 
                                direction="row" 
                                spacing={2} 
                                sx={{ 
                                  mt: 3,
                                  justifyContent: 'flex-end'
                                }}
                              >
                                {issueDetails && issueDetails.description && (
                                  <Button 
                                    variant="outlined" 
                                    color="primary" 
                                    size="small"
                                    startIcon={<SaveAltIcon />}
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
                                    sx={{
                                      textTransform: 'none',
                                      borderRadius: 1.5,
                                      px: 2
                                    }}
                                  >
                                    Save for LLM
                                  </Button>
                                )}
                                
                                <Button
                                  variant="contained"
                                  color="primary"
                                  size="small"
                                  startIcon={<OpenInNewIcon />}
                                  onClick={() => window.open(`${jiraBaseUrl}/browse/${selectedNode.data.key}`, '_blank')}
                                  sx={{
                                    textTransform: 'none',
                                    borderRadius: 1.5,
                                    px: 2
                                  }}
                                >
                                  Open in JIRA
                                </Button>
                              </Stack>
                            </Box>
                          )}
                          
                          {/* JSON Tab - Enhanced UI */}
                          {detailsTabValue === 2 && (
                            <Box sx={{ p: 2.5 }}>
                              <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 2 
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <CodeIcon color="primary" />
                                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                                    {selectedNode.data.key} - JSON Data
                                  </Typography>
                                </Box>
                                
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<ContentCopyIcon />}
                                  onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(selectedNode.data, null, 2));
                                    // Show a short notification using Material-UI Snackbar or simple alert
                                    alert('JSON data copied to clipboard');
                                  }}
                                  sx={{
                                    textTransform: 'none',
                                    borderRadius: 1.5
                                  }}
                                >
                                  Copy JSON
                                </Button>
                              </Box>
                              
                              <Paper 
                                variant="outlined"
                                sx={{ 
                                  borderRadius: 2, 
                                  overflow: 'hidden',
                                  border: '1px solid rgba(0, 0, 0, 0.08)',
                                  boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.05)'
                                }}
                              >
                                <Box 
                                  sx={{
                                    p: 0.5,
                                    backgroundColor: '#f5f5f5',
                                    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      ml: 1.5,
                                      gap: 0.8
                                    }}
                                  >
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f57' }} />
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#febc2e' }} />
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#28c840' }} />
                                  </Box>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      ml: 2, 
                                      color: 'text.secondary',
                                      userSelect: 'none'
                                    }}
                                  >
                                    JSON Viewer
                                  </Typography>
                                </Box>
                                
                                <Box 
                                  sx={{
                                    p: 2,
                                    maxHeight: '60vh',
                                    overflow: 'auto',
                                    backgroundColor: '#fafafa',
                                    fontSize: '0.85rem',
                                    fontFamily: '"Consolas", "Monaco", monospace',
                                    whiteSpace: 'pre-wrap',
                                    '& .json-key': {
                                      color: '#0451a5',
                                      fontWeight: 'bold'
                                    },
                                    '& .json-value-string': {
                                      color: '#a31515'
                                    },
                                    '& .json-value-number': {
                                      color: '#098658'
                                    },
                                    '& .json-value-boolean': {
                                      color: '#0000ff'
                                    },
                                    '& .json-value-null': {
                                      color: '#767676'
                                    }
                                  }}
                                >                              <div dangerouslySetInnerHTML={{ __html: formatJsonWithSyntaxHighlighting(selectedNode.data) }} />
                            </Box>
                              </Paper>
                            </Box>
                          )}
                          
                          {/* Test Case Tab */}
                          {detailsTabValue === 3 && (
                            <Box sx={{ p: 2 }}>
                              <Typography variant="subtitle2" color="primary" sx={{ fontSize: '0.9rem' }} gutterBottom>
                                Test Case for {selectedNode.data.key}
                              </Typography>
                              
                              {isGeneratingTestCase ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                                  <CircularProgress size={40} />
                                  <Typography variant="body1" sx={{ mt: 2 }}>
                                    Generating test case using AI...
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                    This may take a few moments
                                  </Typography>
                                </Box>
                              ) : generatedTestCase ? (
                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontSize: '0.95rem' }}>Test Case for {selectedNode?.data?.key}</Typography>
                                    <Box>
                                      <Stack direction="row" spacing={1}>
                                        <Button 
                                          variant="outlined" 
                                          startIcon={<FileCopyIcon />}
                                          size="small"
                                          onClick={() => {
                                            // Create formatted text for clipboard
                                            const testCaseText = `Summary: ${generatedTestCase.summary}\n\n` +
                                              `Description: ${generatedTestCase.description}\n\n` +
                                              `Precondition: ${generatedTestCase.precondition}\n\n` +
                                              `Type: ${generatedTestCase.type}\n` +
                                              `Priority: ${generatedTestCase.priority}\n\n` +
                                              `Steps:\n` +
                                              generatedTestCase.steps.map((step, i) => 
                                                `${i+1}. ${step.step}\n   Expected: ${step.expected}` +
                                                (step.data ? `\n   Data: ${step.data}` : '')
                                              ).join('\n\n');
                                      
                                            navigator.clipboard.writeText(testCaseText);
                                            alert("Test case copied to clipboard!");
                                          }}
                                        >
                                          Copy to Clipboard
                                        </Button>
                                        <Button 
                                          variant="contained" 
                                          color="primary"
                                          startIcon={<SaveAltIcon />}
                                          size="small"
                                          onClick={() => {
                                            downloadTestCaseAsCSV(generatedTestCase);
                                          }}
                                        >
                                          Download as CSV
                                        </Button>
                                      </Stack>
                                    </Box>
                                  </Box>
                                  
                                  <Box sx={{ 
                                    p: 2, 
                                    mb: 3, 
                                    border: '1px solid #e0e0e0', 
                                    borderRadius: 1,
                                    backgroundColor: '#f9f9f9'
                                  }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                      Test Summary
                                    </Typography>
                                    <Typography variant="body1" gutterBottom>
                                      {generatedTestCase.summary}
                                    </Typography>
                                    
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                                      Description
                                    </Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                      {generatedTestCase.description}
                                    </Typography>
                                    
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                                      Precondition
                                    </Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                      {generatedTestCase.precondition}
                                    </Typography>
                                    
                                    <Grid container spacing={2} sx={{ mt: 1 }}>
                                      <Grid item xs={6}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                          Test Type
                                        </Typography>
                                        <Typography variant="body2">
                                          {generatedTestCase.type}
                                        </Typography>
                                      </Grid>
                                      <Grid item xs={6}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                          Priority
                                        </Typography>
                                        <Typography variant="body2">
                                          {generatedTestCase.priority}
                                        </Typography>
                                      </Grid>
                                    </Grid>
                                  </Box>
                                  
                                  <Typography variant="subtitle1" gutterBottom>
                                    Test Steps
                                  </Typography>
                                  
                                  {generatedTestCase.steps.map((step, index) => (
                                    <Box 
                                      key={index}
                                      sx={{ 
                                        p: 2, 
                                        mb: 2, 
                                        border: '1px solid #e0e0e0', 
                                        borderRadius: 1
                                      }}
                                    >
                                      <Typography variant="subtitle2" gutterBottom>
                                        Step {index + 1}
                                      </Typography>
                                      
                                      <Box sx={{ ml: 2 }}>
                                        <Typography variant="body2" color="text.secondary">
                                          Action
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                          {step.step}
                                        </Typography>
                                        
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                          Expected Result
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                          {step.expected}
                                        </Typography>
                                        
                                        {step.data && (
                                          <>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                              Test Data
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                              {step.data}
                                            </Typography>
                                          </>
                                        )}
                                      </Box>
                                    </Box>
                                  ))}
                                  
                                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                    <Button 
                                      variant="contained" 
                                      color="primary"
                                      startIcon={<FileDownloadIcon />}
                                      onClick={() => {
                                        downloadTestCaseAsCSV(generatedTestCase);
                                      }}
                                    >
                                      Download as CSV
                                    </Button>
                                    <Button 
                                      variant="outlined" 
                                      color="primary"
                                      onClick={() => {
                                        setShowCreateTestCase(false);
                                        setGeneratedTestCase(null);
                                        setDetailsTabValue(0); // Switch back to overview tab
                                      }}
                                    >
                                      Discard
                                    </Button>
                                  </Stack>
                                </Box>
                              ) : (
                                <Box sx={{ textAlign: 'center', p: 4 }}>
                                  <Typography variant="body1">
                                    No test case generated yet for {selectedNode.data.key}.
                                  </Typography>
                                  {testCaseGenerationError ? (
                                    <Alert severity="error" sx={{ my: 2 }}>
                                      {testCaseGenerationError}
                                    </Alert>
                                  ) : null}
                                  <Button 
                                    variant="contained" 
                                    color="primary"
                                    sx={{ mt: 2 }}
                                    onClick={() => {
                                      // Create a temporary context menu node for test case generation
                                      const tempContextNode = selectedNode;
                                      setContextMenuNode(tempContextNode);
                                      handleCreateTestCase();
                                    }}
                                    disabled={isGeneratingTestCase}
                                  >
                                    {isGeneratingTestCase ? 'Generating...' : 'Generate Test Case'}
                                  </Button>
                                </Box>
                              )}
                            </Box>
                          )}
                          </Box> {/* Close the Box for tab content */}
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
              
              {/* JIRA Issue Type Summary */}
              <JiraIssueTypeSummary nodes={data.nodes} />
            </Box>
          </TabPanel>
        </Paper>
      )}

      {/* Test Case Status Modal */}
      {showTestCaseStatus && selectedNode && (
        <TestCaseStatusModal
          open={showTestCaseStatus}
          onClose={() => setShowTestCaseStatus(false)}
          issueKey={selectedNode.data.key}
        />
      )}
      
      {/* Test Case Generation Modal */}
      <TestCaseGenerationModal
        open={showGenerationModal}
        onClose={() => setShowGenerationModal(false)}
        isGenerating={isGeneratingTestCase}
        error={testCaseGenerationError}
      />
    </Container>
  );
};

// JIRA Issue Type Summary component
const JiraIssueTypeSummary = ({ nodes }) => {
  // Count issues by type
  const issueTypeCounts = nodes.reduce((counts, node) => {
    if (!node || !node.data || !node.data.issue_type) return counts;
    
    const issueType = node.data.issue_type.toLowerCase();
    counts[issueType] = (counts[issueType] || 0) + 1;
    return counts;
  }, {});

  // Get total issues
  const totalIssues = Object.values(issueTypeCounts).reduce((sum, count) => sum + count, 0);
  
  // Return null if no issues
  if (totalIssues === 0) return null;
  
  // Get colors for issue types
  const getIssueTypeColor = (type) => {
    const typeKey = type.toLowerCase();
    if (typeKey.includes('story')) return '#4dabf5';
    if (typeKey.includes('task')) return '#6a0dad';
    if (typeKey.includes('bug')) return '#f44336';
    if (typeKey.includes('epic')) return '#ff9800';
    if (typeKey.includes('test')) return '#66bb6a';
    if (typeKey.includes('sub-task')) return '#2196f3';
    return '#9e9e9e';
  };
  
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        JIRA Issue Types ({totalIssues} total)
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {Object.entries(issueTypeCounts).map(([issueType, count]) => (
          <Chip
            key={issueType}
            label={`${issueType}: ${count}`}
            sx={{
              backgroundColor: getIssueTypeColor(issueType),
              color: '#fff',
              fontWeight: issueType.toLowerCase() === 'task' ? 'bold' : 'normal'
            }}
          />
        ))}
      </Box>
      {issueTypeCounts.task && (
        <Typography variant="body2" sx={{ mt: 1, color: '#6a0dad', fontWeight: 'bold' }}>
          * {issueTypeCounts.task} task-type issues available for test case generation
        </Typography>
      )}
    </Paper>
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

// Function to format JSON with syntax highlighting for the JSON Tab
  const formatJsonWithSyntaxHighlighting = (json) => {
    if (!json) return '';
    
    const jsonStr = JSON.stringify(json, null, 2);
    
    // Escape HTML entities first to prevent XSS
    const escaped = jsonStr
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Use regular expressions to add spans with appropriate classes for syntax highlighting
    return escaped
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (match) => {
        let cls = 'json-value-number';
        
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
            // For key:value pairs, style only the key part
            return `<span class="${cls}">${match.substring(0, match.length - 1)}</span>:`;
          } else {
            cls = 'json-value-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-value-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-value-null';
        }
        
        // Add the span with the appropriate class
        return `<span class="${cls}">${match}</span>`;
      });
};
