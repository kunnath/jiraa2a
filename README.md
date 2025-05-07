# JIRA Relationship Visualizer

A full-stack application that visualizes relationships between JIRA issues using Python (FastAPI) and React.

## Features

- Connect to JIRA using your credentials
- Visualize relationships between JIRA issues
- See requirements, test cases, and defects in an interactive graph
- Interactive tabbed UI with visualization and analytics views
- Advanced search and path highlighting to find connections between issues
- Filter visualization by issue types
- Multiple export options (PNG, JPEG, PDF, CSV)
- Comprehensive analytics with charts and statistics
- Zoom, pan, and explore the relationship graph
- Toggle between vertical and horizontal layout
- View full JIRA issue descriptions
- Format JIRA data for LLM (Large Language Model) processing
- Export issue data as JSON for advanced analysis
- **NEW**: Generate test cases in XRay format using AI (Ollama LLM)
- **NEW**: View test case status for issues

## Prerequisites

- Python 3.8+ with pip
- Node.js 16+ with npm
- JIRA account with API token
- Docker and Docker Compose (for containerized deployment)

## Setup

### Backend Setup

1. Activate the Python virtual environment:

```bash
source jiraenv/bin/activate
```

2. Install dependencies (if not already installed):

```bash
cd backend
pip install -r requirements.txt
```

3. Create a `.env` file in the `backend` directory with your JIRA settings (optional):

```bash
cp .env.example .env
```

Edit the `.env` file with your JIRA credentials.

### Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

## Running the Application

You can run the application in multiple ways:

### Using Docker with Local Ollama (Recommended)

This approach uses your locally installed Ollama instead of running Ollama in a Docker container, saving resources:

1. Install Ollama on your local machine:
   ```bash
   # On macOS/Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. Start the application with local Ollama:
   ```bash
   ./start_with_local_ollama.sh
   ```

   This script will:
   - Check if Ollama is installed locally
   - Start Ollama if it's not already running
   - Check and pull the required model if needed
   - Start the application with Docker Compose

### Using Docker with Containerized Ollama

If you prefer to run everything in containers:

```bash
./start_with_ollama.sh
```

Or manually:

```bash
docker-compose up
```

This will start both the backend and frontend services, along with the Ollama LLM service for test case generation. The application will be available at http://localhost:3000.

#### Note on LLM Features

When using the application in Docker:
- The first run may take some time as the Ollama LLM model (deepseek-r1:8b) is downloaded
- Test case generation will automatically use the containerized Ollama service

To check if the Ollama service is running properly:
```bash
curl http://localhost:11434/api/tags
```

This should return a JSON list that includes the "deepseek-r1:8b" model.

### Using the start script

You can also start both the frontend and backend with the provided start script:

```bash
./start.sh
```

### Running separately:

### Backend

```bash
cd backend
source ../jiraenv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm run dev
```

## Usage

1. Navigate to http://localhost:3000 in your browser
2. Enter your JIRA credentials and the central JIRA issue ID
3. Click "Visualize" to generate the relationship graph
4. Explore the visualization by zooming and panning
5. Export the visualization as a PNG if needed
6. View issue descriptions and prepare data for LLM analysis

For more information on using the JIRA data with LLMs, see [JIRA LLM Integration](docs/jira_llm_integration.md).

### Using Test Case Generation with AI

The application now supports generating test cases in XRay format using AI through the Ollama LLM service:

1. **Right-click on any JIRA issue node** in the visualization graph
2. Select **"Create Test Case in XRay Format"** from the context menu
3. The system will use the Ollama LLM (deepseek-r1:8b model) to analyze your issue and generate a test case
4. The generated test case will appear in a new tab next to the issue details
5. You can review the generated test case and choose to save it or discard it

#### Requirements for Test Case Generation

- Ollama service must be running (automatically managed in Docker setup)
- The deepseek-r1:8b model should be available in Ollama
- Issues should have good descriptions for better test case generation

#### Viewing Test Case Status

You can also view the status of test cases associated with an issue:

1. **Right-click on any JIRA issue node** in the visualization graph
2. Select **"Show Test Case Status"** from the context menu
3. A modal will appear showing all test cases linked to the issue along with their status

### Advanced AI Features

The test case generation feature is part of our expanding AI capabilities:

- **LLM-Ready Data Export**: Format and export JIRA data for use with external LLMs
- **AI-Generated Test Cases**: Create comprehensive test cases with proper XRay structure
- **Test Coverage Analysis**: Analyze test coverage across your requirements

## Utility Scripts

The project includes several utility scripts to help with setup and troubleshooting:

### Ollama Setup and Diagnostics

- `start_with_local_ollama.sh`: Starts the application using your locally installed Ollama instead of a Docker container
- `setup_ollama_model.sh`: Checks for Ollama installation, starts the Ollama service if needed, and downloads required models
- `ollama_diagnostics.sh`: Performs diagnostics on your Ollama setup to troubleshoot issues
- `check_docker_setup.sh`: Verifies that your Docker environment is properly configured for the application

### Usage

```bash
# Start with local Ollama (recommended approach)
./start_with_local_ollama.sh

# Run diagnostics if you're having issues with Ollama
./ollama_diagnostics.sh

# Check your Docker setup
./check_docker_setup.sh
```

## Security Note

This application stores JIRA credentials temporarily for the session. Your API token is sensitive information - never share it and use environment variables when possible.

## License

MIT
# jiraa2a
