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
  LinearProgress,
  Menu,
  ListItemIcon,
  ListItemText
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
    setSelectedNode(node);
    // Fetch detailed information including description
    fetchIssueDetails(node);
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
      if (issueType !== 'requirement' && issueType !== 'story' && issueType !== 'task' && issueType !== 'feature') {
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
    if (!centralJiraId || !centralJiraId.trim()) {
      setError('Please enter a Central JIRA ID');
      return;
    }
    
    setLoadingVisualization(true);
    setError(null);
    
    try {
      // Create request with credentials and central JIRA ID
      const requestData = {
        ...jiraCredentials,
        central_jira_id: centralJiraId
      };
      
      const visualizationData = await apiService.visualizeJira(requestData);
      
      if (!visualizationData || !visualizationData.nodes || visualizationData.nodes.length === 0) {
        throw new Error('No JIRA issues found for visualization');
      }
      
      // Update the session storage with this data
      sessionStorage.setItem('jiraVisualizationData', JSON.stringify(visualizationData));
      
      // Reload the page to show the visualization
      window.location.reload();
    } catch (err) {
      console.error('Visualization error:', err);
      setError(err.message || 'Failed to fetch JIRA data');
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
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            
            <Box sx={{ mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loadingVisualization}
              >
                Visualize
              </Button>
              {loadingVisualization && <CircularProgress size={24} sx={{ ml: 2 }} />}
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
                      <CreateIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Generate Test Case</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleShowTestStatus}>
                    <ListItemIcon>
                      <InfoIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Show Test Status</ListItemText>
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
                      variant="scrollable"
                      scrollButtons="auto"
                    >
                      <Tab label="Overview" />
                      <Tab label="Description" />
                      <Tab label="JSON" />
                      {showCreateTestCase && <Tab label="Test Case" />}
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
                  
                  {/* Test Case Tab */}
                  {showCreateTestCase && detailsTabValue === 3 && (
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                        Generated Test Case for {selectedNode.data.key}
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
                            <Typography variant="h6">Test Case for {selectedNode?.data?.key}</Typography>
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
                              onClick={() => {
                                // Here you would implement saving the test case to xray/jira
                                alert('Test case would be saved to Xray/JIRA');
                              }}
                            >
                              Save to Xray
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
                            No test case generated yet.
                          </Typography>
                          <Button 
                            variant="contained" 
                            color="primary"
                            sx={{ mt: 2 }}
                            onClick={handleCreateTestCase}
                          >
                            Generate Test Case
                          </Button>
                        </Box>
                      )}
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

// Wrap the component with ReactFlowProvider to enable the useReactFlow hook
const JiraVisualizationWithProvider = (props) => {
  return (
    <ReactFlowProvider>
      <JiraVisualization {...props} />
    </ReactFlowProvider>
  );
};

export default JiraVisualizationWithProvider;
