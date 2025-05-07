# Test Case Generation with AI

This document provides detailed information about the test case generation feature in the JIRA Relationship Visualizer.

## Overview

The Test Case Generation feature uses the Ollama LLM (deepseek-r1:8b model) to automatically create comprehensive test cases in XRay format for your JIRA issues. This feature helps QA teams quickly generate structured test cases based on issue descriptions and requirements.

## Architecture

![Architecture Diagram](../docs/assets/test-case-generation-architecture.png)

The test case generation feature uses the following components:

1. **Frontend**: React components in the JiraVisualization that handle context menus, user interactions, and display of generated test cases
2. **Backend API**: FastAPI endpoint that processes requests and communicates with the Ollama LLM
3. **Ollama LLM Service**: Local or containerized LLM service running the deepseek-r1:8b model
4. **XRay Format Generator**: LLM prompt engineering to create properly formatted test cases

## How It Works

When a user right-clicks on a JIRA issue and selects "Create Test Case in XRay Format":

1. The frontend sends the issue details to the backend API
2. The backend constructs a carefully designed prompt for the LLM
3. The Ollama LLM generates a comprehensive test case in JSON format
4. The backend validates and processes the LLM output
5. The frontend displays the formatted test case in the UI

## LLM Prompting

The system uses a specialized prompt that instructs the LLM to generate well-structured test cases with:

- A clear summary
- Detailed description
- Preconditions
- Test type and priority
- Step-by-step test steps with expected results
- Optional test data fields

## Configuration

The feature is configured by environment variables:

- `OLLAMA_API_BASE`: The base URL for the Ollama API (default: http://localhost:11434)
- `DEFAULT_LLM_MODEL`: The model to use for test case generation (default: deepseek-r1:8b)

## Setup Options

### Using Local Ollama (Recommended)

This approach uses your locally installed Ollama instance instead of running it in a Docker container, which saves resources:

1. Install Ollama on your local machine:
   ```bash
   # On macOS/Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. Pull the required model:
   ```bash
   ollama pull deepseek-r1:8b
   ```

3. Start the application with:
   ```bash
   ./start_with_local_ollama.sh
   ```

   This script:
   - Checks if Ollama is installed locally
   - Starts Ollama if it's not already running
   - Checks and pulls the required model if needed
   - Starts the application with Docker Compose

### Using Containerized Ollama

For development environments that prefer everything in containers, the traditional setup is also supported:

```bash
./start_with_ollama.sh
```

This runs Ollama as a Docker container, which is more resource-intensive but keeps everything containerized.

## Fallback Mechanism

If the LLM service is unavailable or returns invalid responses, the system provides a fallback by generating a basic test case template with standard steps.

## Sample Test Case Output

```json
{
  "summary": "Test login functionality with valid credentials",
  "description": "This test case verifies that users can log in successfully with valid credentials",
  "precondition": "User account exists in the system",
  "type": "Functional",
  "priority": "High",
  "steps": [
    {
      "step": "Navigate to the login page",
      "expected": "Login form is displayed with username and password fields",
      "data": null
    },
    {
      "step": "Enter valid username",
      "expected": "Username is accepted",
      "data": "validuser123"
    },
    {
      "step": "Enter valid password",
      "expected": "Password is masked and accepted",
      "data": "SecureP@ss123"
    },
    {
      "step": "Click the login button",
      "expected": "User is successfully authenticated and redirected to dashboard",
      "data": null
    }
  ]
}
```

## Future Enhancements

Planned improvements for the test case generation feature:

1. Integration with JIRA/XRay API to save generated test cases directly
2. Support for customizing test case templates
3. Batch generation of test cases for multiple issues
4. Integration with test execution tracking
5. Support for additional LLM models and providers
