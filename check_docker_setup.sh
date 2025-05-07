#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}JIRA Relationship Visualizer - Test Setup Script${NC}"
echo -e "${BLUE}====================================================${NC}"
echo ""

# Check if Docker is installed
echo -e "${YELLOW}Checking Docker installation...${NC}"
if command -v docker &> /dev/null; then
    docker_version=$(docker --version)
    echo -e "${GREEN}✓ Docker is installed: ${docker_version}${NC}"
else
    echo -e "${RED}✗ Docker is not installed or not in PATH${NC}"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker is running
echo -e "${YELLOW}Checking if Docker daemon is running...${NC}"
if docker info &> /dev/null; then
    echo -e "${GREEN}✓ Docker daemon is running${NC}"
else
    echo -e "${RED}✗ Docker daemon is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi

# Check Docker Compose
echo -e "${YELLOW}Checking Docker Compose...${NC}"
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose is available${NC}"
else
    echo -e "${RED}✗ Docker Compose is not installed or not in PATH${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if the required directories exist
echo -e "${YELLOW}Checking project structure...${NC}"
if [ -d ./frontend ] && [ -d ./backend ]; then
    echo -e "${GREEN}✓ Project structure looks good${NC}"
else
    echo -e "${RED}✗ Project structure is incomplete${NC}"
    echo "Please make sure you're running this script from the project root directory"
    exit 1
fi

# Check if the Docker files exist
echo -e "${YELLOW}Checking Docker configuration files...${NC}"
if [ -f ./docker-compose.yml ] && [ -f ./Dockerfile.backend ] && [ -f ./Dockerfile.frontend ]; then
    echo -e "${GREEN}✓ Docker configuration files found${NC}"
else
    echo -e "${RED}✗ Docker configuration files missing${NC}"
    echo "Please make sure docker-compose.yml, Dockerfile.backend, and Dockerfile.frontend exist"
    exit 1
fi

# Test Docker image pull
echo -e "${YELLOW}Testing access to Docker Hub...${NC}"
if docker pull hello-world &> /dev/null; then
    echo -e "${GREEN}✓ Docker Hub access confirmed${NC}"
else
    echo -e "${RED}✗ Cannot pull images from Docker Hub${NC}"
    echo "Please check your internet connection and Docker Hub access"
    exit 1
fi

# Check if local Ollama is installed (for local mode)
echo -e "${YELLOW}Checking local Ollama installation...${NC}"
if command -v ollama &> /dev/null; then
    ollama_version=$(ollama --version 2>/dev/null || echo "version unknown")
    echo -e "${GREEN}✓ Ollama is installed locally: ${ollama_version}${NC}"
    
    # Check if Ollama is running
    echo -e "${YELLOW}Checking if Ollama is running locally...${NC}"
    if curl -s http://localhost:11434/api/tags &> /dev/null; then
        echo -e "${GREEN}✓ Ollama is running${NC}"
        
        # Check for required model
        echo -e "${YELLOW}Checking if required model (deepseek-r1:8b) is available...${NC}"
        if curl -s http://localhost:11434/api/tags | grep -q "deepseek-r1:8b"; then
            echo -e "${GREEN}✓ deepseek-r1:8b model is available${NC}"
        else
            echo -e "${YELLOW}⚠ deepseek-r1:8b model is not found${NC}"
            echo "To pull the model, run: ollama pull deepseek-r1:8b"
        fi
    else
        echo -e "${YELLOW}⚠ Ollama is not running locally${NC}"
        echo "To start Ollama, run: ollama serve"
    fi
else
    echo -e "${YELLOW}⚠ Ollama is not installed locally${NC}"
    echo "For local mode, install Ollama: curl -fsSL https://ollama.com/install.sh | sh"
    echo "For container mode, no action is needed"
fi

# Check if port 8000 is available
echo -e "${YELLOW}Checking if port 8000 is available (backend)...${NC}"
if nc -z localhost 8000 &> /dev/null; then
    echo -e "${RED}✗ Port 8000 is already in use${NC}"
    echo "Please stop any services using port 8000 before starting the application"
else
    echo -e "${GREEN}✓ Port 8000 is available${NC}"
fi

# Check if port 3000 is available
echo -e "${YELLOW}Checking if port 3000 is available (frontend)...${NC}"
if nc -z localhost 3000 &> /dev/null; then
    echo -e "${RED}✗ Port 3000 is already in use${NC}"
    echo "Please stop any services using port 3000 before starting the application"
else
    echo -e "${GREEN}✓ Port 3000 is available${NC}"
fi

# Check if port 11434 is available
echo -e "${YELLOW}Checking if port 11434 is available (Ollama)...${NC}"
if nc -z localhost 11434 &> /dev/null; then
    echo -e "${YELLOW}⚠ Port 11434 is already in use${NC}"
    echo "This might mean Ollama is already running locally, which could conflict with the Docker version"
else
    echo -e "${GREEN}✓ Port 11434 is available${NC}"
fi

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}All checks complete! You can run the application with:${NC}"
echo -e "${YELLOW}./start_with_ollama.sh${NC}"
echo -e "${BLUE}====================================================${NC}"
