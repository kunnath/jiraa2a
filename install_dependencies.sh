#!/bin/bash
# filepath: /Users/kunnath/Projects/jiraproject/install_dependencies.sh

# Stop script on any error
set -e

echo "Installing backend dependencies..."
source jiraenv/bin/activate
cd backend
pip install -r requirements.txt

echo "Installing frontend dependencies..."
cd ../frontend
npm install

echo "All dependencies installed successfully!"
echo "You can now run the application with ./start.sh"
