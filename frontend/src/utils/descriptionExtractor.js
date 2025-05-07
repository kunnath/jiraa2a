import { adfToText } from './jiraFormatter';

/**
 * Helper function to extract description text from JIRA issue data
 * This handles various formats that JIRA API might return
 */
export function extractDescription(issueData) {
  if (!issueData) {
    return '';
  }
  
  let description = '';
  
  // Check for description in fields (standard JIRA API)
  if (issueData.fields && issueData.fields.description) {
    const desc = issueData.fields.description;
    
    // Handle string format
    if (typeof desc === 'string') {
      description = desc;
    } 
    // Handle Atlassian Document Format (ADF)
    else if (typeof desc === 'object') {
      try {
        // If adfToText is available as imported function, use it
        if (typeof adfToText === 'function') {
          description = adfToText(desc);
          console.log('Used imported adfToText function for description');
        }
        // If adfToText is available globally, use it
        else if (typeof window !== 'undefined' && typeof window.adfToText === 'function') {
          description = window.adfToText(desc);
          console.log('Used window.adfToText function for description');
        } 
        // Simple extraction from content if available
        else if (Array.isArray(desc.content)) {
          description = desc.content
            .map(item => {
              if (item.text) return item.text;
              if (item.content) {
                return item.content
                  .map(content => content.text || '')
                  .filter(text => text)
                  .join(' ');
              }
              return '';
            })
            .filter(text => text)
            .join('\n');
          console.log('Used custom content extraction for ADF description');
        }
        // Try to get text value if it exists
        else if (desc.text) {
          description = desc.text;
          console.log('Used text property from description object');
        }
        // Try to get value property if it exists (some JIRA instances use this)
        else if (desc.value) {
          description = desc.value;
          console.log('Used value property from description object');
        }
        // Fallback to JSON stringify
        else {
          description = JSON.stringify(desc);
          console.log('Used JSON.stringify fallback for description object');
        }
      } catch (e) {
        console.warn('Error parsing ADF description:', e);
        description = 'Error extracting description';
      }
    }
  } 
  // Check for direct description property
  else if (issueData.description) {
    description = issueData.description;
    console.log('Used direct description property from issue data');
  }
  // Check for description in renderedFields (another JIRA API format)
  else if (issueData.renderedFields && issueData.renderedFields.description) {
    description = issueData.renderedFields.description;
    console.log('Used renderedFields.description from issue data');
  }
  
  return description || 'No description available';
}

export default extractDescription;
