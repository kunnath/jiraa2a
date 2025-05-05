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

## Prerequisites

- Python 3.8+ with pip
- Node.js 16+ with npm
- JIRA account with API token

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

### Using Docker (Recommended)

The easiest way to run the application is using Docker Compose:

```bash
docker-compose up
```

This will start both the backend and frontend services. The application will be available at http://localhost:3000.

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

## Security Note

This application stores JIRA credentials temporarily for the session. Your API token is sensitive information - never share it and use environment variables when possible.

## License

MIT
# jiraa2a
