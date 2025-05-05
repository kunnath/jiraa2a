#!/bin/bash
# filepath: /Users/kunnath/Projects/jiraproject/start.sh

# Stop script on any error
set -e

# Start the backend
echo "Starting FastAPI backend..."
cd backend
source ../jiraenv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend running with PID: $BACKEND_PID"

# Wait for backend to start
sleep 2

# Start the frontend
echo "Starting React frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend running with PID: $FRONTEND_PID"

# Handle script termination
trap 'echo "Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

# Keep script running
wait $FRONTEND_PID
wait $BACKEND_PID
