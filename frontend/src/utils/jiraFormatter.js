/**
 * Utility functions to format JIRA content for display and LLM processing
 */

/**
 * Simple function to convert Atlassian Document Format (ADF) to plain text
 * This is a simplistic implementation - a real app would use a proper ADF parser
 * @param {Object|String} adfContent - The ADF content to convert
 * @returns {String} Plain text representation
 */
export const adfToText = (adfContent) => {
  // If the content is already a string, return it as is
  if (typeof adfContent === 'string') {
    return adfContent;
  }
  
  // If the content is null or undefined, return empty string
  if (!adfContent) {
    return '';
  }
  
  // Handle case where it might be JSON string
  if (typeof adfContent === 'string' && (
      adfContent.startsWith('{') || adfContent.startsWith('[')
    )) {
    try {
      adfContent = JSON.parse(adfContent);
    } catch (e) {
      return adfContent;
    }
  }
  
  try {
    // If it's an ADF document with content array
    if (adfContent.content) {
      return processAdfNodes(adfContent.content);
    }
    
    // If it's an array of nodes
    if (Array.isArray(adfContent)) {
      return processAdfNodes(adfContent);
    }
    
    // Fallback - just convert to string
    return String(adfContent);
  } catch (e) {
    console.error('Error processing ADF content:', e);
    return String(adfContent);
  }
};

/**
 * Process an array of ADF nodes to extract text
 */
function processAdfNodes(nodes) {
  if (!nodes || !Array.isArray(nodes)) {
    return '';
  }
  
  return nodes.map(node => {
    if (typeof node === 'string') {
      return node;
    }
    
    // Handle text nodes with marks (bold, italic, etc.)
    if (node.type === 'text') {
      let text = node.text || '';
      
      // Apply text formatting based on marks if present
      if (node.marks && Array.isArray(node.marks)) {
        node.marks.forEach(mark => {
          switch (mark.type) {
            case 'strong':
              text = `**${text}**`; // Bold text in Markdown
              break;
            case 'em':
              text = `*${text}*`; // Italic text in Markdown
              break;
            case 'code':
              text = `\`${text}\``; // Code in Markdown
              break;
            case 'underline':
              text = `_${text}_`; // Underline as italic in Markdown (approximation)
              break;
            case 'link':
              if (mark.attrs && mark.attrs.href) {
                text = `[${text}](${mark.attrs.href})`; // Links in Markdown
              }
              break;
            // Add more mark types as needed
          }
        });
      }
      
      return text;
    }
    
    // Handle paragraph and other block nodes
    if (node.content) {
      // Special handling for different node types
      switch (node.type) {
        case 'paragraph':
          return processAdfNodes(node.content) + '\n\n';
        case 'blockquote':
          return '> ' + processAdfNodes(node.content).replace(/\n/g, '\n> ') + '\n\n';
        case 'codeBlock':
          const language = node.attrs?.language || '';
          return '```' + language + '\n' + processAdfNodes(node.content) + '\n```\n\n';
        case 'panel':
          const panelType = node.attrs?.panelType || 'info';
          return `[${panelType.toUpperCase()}]\n${processAdfNodes(node.content)}\n\n`;
        case 'table':
          return processTableNode(node) + '\n\n';
        default:
          return processAdfNodes(node.content) + '\n';
      }
    }
    
    // Handle bullet lists
    if (node.type === 'bulletList' && node.content) {
      return node.content.map(item => {
        if (item.content) {
          return '• ' + processAdfNodes(item.content).trim();
        }
        return '';
      }).join('\n') + '\n\n';
    }
    
    // Handle ordered lists
    if (node.type === 'orderedList' && node.content) {
      return node.content.map((item, index) => {
        if (item.content) {
          return `${index + 1}. ` + processAdfNodes(item.content).trim();
        }
        return '';
      }).join('\n') + '\n\n';
    }
    
    // Handle headings
    if (node.type && node.type.startsWith('heading')) {
      const level = node.type.charAt(node.type.length - 1);
      const prefix = '#'.repeat(parseInt(level)) + ' ';
      return prefix + (node.content ? processAdfNodes(node.content) : '') + '\n\n';
    }
    
    // Handle special nodes like mentions, emojis, dates
    if (node.type === 'mention') {
      return `@${node.attrs?.text || ''}`;
    }
    
    if (node.type === 'emoji') {
      return node.attrs?.shortName || '';
    }
    
    if (node.type === 'date') {
      return node.attrs?.timestamp ? new Date(node.attrs.timestamp).toLocaleDateString() : '';
    }
    
    if (node.type === 'rule') {
      return '\n---\n\n';
    }
    
    return '';
  }).join('');
}

/**
 * Process an ADF table node into a markdown-like text format
 */
function processTableNode(tableNode) {
  if (!tableNode || !tableNode.content || !Array.isArray(tableNode.content)) {
    return '';
  }

  const rows = tableNode.content; // These are the rows of the table
  let tableText = '';
  let headerProcessed = false;
  
  for (const row of rows) {
    if (!row.content || !Array.isArray(row.content)) continue;
    
    const cells = row.content;
    const rowContent = cells.map(cell => {
      const cellContent = cell.content ? processAdfNodes(cell.content).trim() : '';
      // Replace any newlines within cells with spaces to keep the table format
      return cellContent.replace(/\n/g, ' ');
    }).join(' | ');
    
    tableText += '| ' + rowContent + ' |\n';
    
    // Add header separator after first row
    if (!headerProcessed) {
      const headerSeparator = '| ' + cells.map(() => '---').join(' | ') + ' |\n';
      tableText += headerSeparator;
      headerProcessed = true;
    }
  }
  
  return tableText;
}

/**
 * Format JIRA issue data specifically for LLM processing
 * Extracts and structures information to make it easier for the LLM to understand
 * @param {Object} issueData - Issue data including description, summary, etc.
 * @returns {Object} Formatted data optimized for LLM input
 */
export const formatJiraForLLM = (issueData) => {
  if (!issueData) {
    console.warn('formatJiraForLLM received empty issue data');
    return {
      key: '',
      summary: '',
      issue_type: '',
      status: '',
      description: '',
      structured_data: {}
    };
  }

  console.log('Formatting JIRA data for LLM processing:', {
    key: issueData.key,
    summary: issueData.summary?.substring(0, 30) + '...',
    description: issueData.description ? 'Present (length: ' + 
                 (typeof issueData.description === 'string' ? 
                 issueData.description.length : 'object') + ')' : 'Missing'
  });

  // Extract plain text description
  let description = '';
  if (issueData.description) {
    try {
      description = adfToText(issueData.description);
    } catch (e) {
      console.error('Error converting description with adfToText:', e);
      description = typeof issueData.description === 'string' ? 
                    issueData.description : 
                    JSON.stringify(issueData.description);
    }
  }
  
  // Extract key sections from the description
  const sections = extractSectionsFromDescription(description);
  
  // Add additional metadata that might be useful for the LLM
  const additionalData = {
    priority: issueData.priority || '',
    assignee: issueData.assignee || '',
    reporter: issueData.reporter || '',
    created: issueData.created || '',
    updated: issueData.updated || '',
    components: issueData.components || '',
    labels: issueData.labels || ''
  };
  
  // Build a comprehensive structured format for the LLM
  const result = {
    key: issueData.key || '',
    summary: issueData.summary || '',
    issue_type: issueData.issue_type || '',
    status: issueData.status || '',
    description: description,
    structured_data: {
      // Extracted sections
      acceptance_criteria: sections.acceptanceCriteria,
      requirements: sections.requirements,
      steps_to_reproduce: sections.stepsToReproduce,
      expected_behavior: sections.expectedBehavior,
      actual_behavior: sections.actualBehavior,
      
      // Additional metadata
      ...additionalData
    }
  };
  
  console.log('Formatted data for LLM:', {
    key: result.key,
    summary: result.summary?.substring(0, 30) + '...',
    descriptionLength: result.description?.length || 0,
    sections: Object.keys(result.structured_data)
      .filter(key => result.structured_data[key])
      .join(', ')
  });
  
  return result;
};

/**
 * Extract common sections from JIRA issue descriptions
 * This helps organize the description into structured data
 * @param {String} description - The plain text description
 * @returns {Object} Extracted sections
 */
function extractSectionsFromDescription(description) {
  const result = {
    acceptanceCriteria: '',
    requirements: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: ''
  };
  
  if (!description) {
    return result;
  }

  // Common section headers used in JIRA
  const sectionPatterns = [
    { key: 'acceptanceCriteria', patterns: [/acceptance criteria:?/i, /acceptance criteria\s*\n[-*]+/i, /#{1,3}\s*acceptance criteria/i] },
    { key: 'requirements', patterns: [/requirements:?/i, /business requirements:?/i, /#{1,3}\s*requirements/i] },
    { key: 'stepsToReproduce', patterns: [/steps to reproduce:?/i, /reproduction steps:?/i, /#{1,3}\s*steps to reproduce/i] },
    { key: 'expectedBehavior', patterns: [/expected behavior:?/i, /expected result:?/i, /expected outcome:?/i, /#{1,3}\s*expected/i] },
    { key: 'actualBehavior', patterns: [/actual behavior:?/i, /actual result:?/i, /observed behavior:?/i, /#{1,3}\s*actual/i] }
  ];
  
  // Split description by lines to process sections
  const lines = description.split('\n');
  let currentSection = null;
  const sections = {};
  
  // Initialize sections with empty content
  sectionPatterns.forEach(pattern => {
    sections[pattern.key] = [];
  });
  
  // Process line by line to identify and extract sections
  lines.forEach(line => {
    // Check if this line starts a new section
    let matchedSection = null;
    
    sectionPatterns.forEach(({key, patterns}) => {
      if (!matchedSection && patterns.some(pattern => pattern.test(line))) {
        matchedSection = key;
        currentSection = key;
        // Don't include the header line itself
        return;
      }
    });
    
    // If this line didn't match a section header and we're tracking a section, add to that section
    if (!matchedSection && currentSection) {
      sections[currentSection].push(line);
    }
    
    // If this line matched a new section, update tracking
    if (matchedSection) {
      currentSection = matchedSection;
    }
  });
  
  // Convert arrays to strings for each section
  Object.keys(sections).forEach(key => {
    result[key] = sections[key].join('\n').trim();
  });
  
  return result;
}
