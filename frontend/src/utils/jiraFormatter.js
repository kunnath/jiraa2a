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
    
    // Handle text nodes
    if (node.type === 'text') {
      return node.text || '';
    }
    
    // Handle paragraph and other block nodes
    if (node.content) {
      return processAdfNodes(node.content) + '\n';
    }
    
    // Handle bullet lists
    if (node.type === 'bulletList' && node.content) {
      return node.content.map(item => {
        if (item.content) {
          return '• ' + processAdfNodes(item.content);
        }
        return '';
      }).join('\n');
    }
    
    // Handle ordered lists
    if (node.type === 'orderedList' && node.content) {
      return node.content.map((item, index) => {
        if (item.content) {
          return `${index + 1}. ` + processAdfNodes(item.content);
        }
        return '';
      }).join('\n');
    }
    
    // Handle headings
    if (node.type && node.type.startsWith('heading')) {
      const level = node.type.charAt(node.type.length - 1);
      const prefix = '#'.repeat(level) + ' ';
      return prefix + (node.content ? processAdfNodes(node.content) : '') + '\n\n';
    }
    
    // Handle code blocks
    if (node.type === 'codeBlock') {
      const language = node.attrs?.language || '';
      return '```' + language + '\n' + 
        (node.content ? processAdfNodes(node.content) : '') + 
        '\n```\n';
    }
    
    // Handle quote blocks
    if (node.type === 'blockquote') {
      return '> ' + (node.content ? processAdfNodes(node.content) : '') + '\n';
    }
    
    // Handle tables (simplified)
    if (node.type === 'table') {
      return '[Table content not displayed in plain text]\n';
    }
    
    // Handle links
    if (node.type === 'link' && node.content) {
      const text = processAdfNodes(node.content);
      const url = node.attrs?.href || '';
      return `${text} (${url})`;
    }
    
    // Handle mentions
    if (node.type === 'mention') {
      return `@${node.attrs?.text || '[mentioned user]'}`;
    }
    
    // Handle other node types or return empty string
    return node.text || '';
  }).join('');
}

/**
 * Format JIRA data for LLM processing
 * @param {Object} jiraData - The JIRA issue data
 * @returns {String} Formatted text for LLM input
 */
export const formatJiraForLLM = (jiraData) => {
  if (!jiraData) return '';
  
  // Convert description to plain text if needed
  const description = adfToText(jiraData.description);
  
  // Format the data in a way that's useful for LLM processing
  let formattedText = `JIRA ISSUE: ${jiraData.key}
TITLE: ${jiraData.summary}
TYPE: ${jiraData.issue_type}
STATUS: ${jiraData.status}
PRIORITY: ${jiraData.priority || 'Not specified'}
ASSIGNEE: ${jiraData.assignee || 'Unassigned'}
REPORTER: ${jiraData.reporter || 'Unknown'}
CREATED: ${jiraData.created ? new Date(jiraData.created).toLocaleString() : 'Unknown'}
UPDATED: ${jiraData.updated ? new Date(jiraData.updated).toLocaleString() : 'Unknown'}

DESCRIPTION:
${description || 'No description provided.'}
`;

  // Add comments if available
  if (jiraData.comments && jiraData.comments.length > 0) {
    formattedText += '\n\nCOMMENTS:\n';
    jiraData.comments.forEach((comment, index) => {
      formattedText += `
COMMENT #${index + 1}:
Author: ${comment.author}
Date: ${comment.created ? new Date(comment.created).toLocaleString() : 'Unknown'}
${adfToText(comment.body)}
---
`;
    });
  }

  return formattedText;
};
