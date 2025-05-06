# JIRA Description and LLM Integration

This document explains how to use the JIRA description feature for integration with Large Language Models (LLMs).

## Overview

The JIRA Visualization tool now includes the ability to fetch, display, and process JIRA issue descriptions for use with LLMs. This feature enables you to:

1. View full JIRA issue descriptions in the visualization
2. Format JIRA data for LLM input
3. Export JSON data for LLM processing
4. Save formatted JIRA data for later use

## How to Use

### Viewing Issue Descriptions

1. After visualizing your JIRA issues, click on any node in the graph
2. The sidebar will show the issue details
3. Click on the "Description" tab to view the full issue description

### Using Descriptions with LLMs

There are several ways to use JIRA data with LLMs:

1. **Copy for LLM Input**: On the Description tab, click "Copy for LLM Input" to copy a formatted version of the issue data (including description) to your clipboard. This formatted text can be directly pasted into an LLM interface.

2. **Save Description**: Click "Save Description for LLM" to save just the description for later processing.

3. **Download as JSON**: On the JSON tab, click "Download as JSON" to download the complete issue data as a JSON file. This can be used for more advanced LLM processing.

## Data Format

The tool formats JIRA data for LLM processing in a structured way:

```
JIRA ISSUE: PROJECT-123
TITLE: Issue summary text
TYPE: Bug
STATUS: In Progress
PRIORITY: Medium
ASSIGNEE: John Doe
REPORTER: Jane Smith
CREATED: 5/5/2025, 10:30:00 AM
UPDATED: 5/6/2025, 9:15:00 AM

DESCRIPTION:
This is the issue description text. It may include:
- Bullet points
- Code blocks
- Other formatting

COMMENTS:
COMMENT #1:
Author: Bob Johnson
Date: 5/5/2025, 3:45:00 PM
This is a comment on the issue
---
```

## Technical Details

The feature uses the following components:

1. **Backend API**: A dedicated endpoint (`/api/jira/issue-details`) fetches complete issue details including descriptions.

2. **Formatter Utility**: The `jiraFormatter.js` utility converts JIRA's Atlassian Document Format (ADF) to plain text for better LLM processing.

3. **Session Storage**: Issue data is temporarily stored in session storage for easy access.

## Security Considerations

For demonstration purposes, JIRA credentials are stored in session storage. In a production environment, consider:

1. Using more secure authentication methods
2. Implementing server-side sessions
3. Using environment variables for sensitive data
4. Implementing proper data sanitization before LLM processing

## Next Steps

Future improvements could include:

1. Direct integration with specific LLM APIs
2. Custom prompt templates for different LLM use cases
3. Batch processing of multiple JIRA issues
4. Analysis of LLM responses to JIRA data
