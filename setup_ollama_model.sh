#!/bin/zsh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}JIRA Relationship Visualizer - Ollama Setup${NC}"
echo -e "${BLUE}===========================================${NC}"

# Check if Ollama is installed locally
echo -e "${YELLOW}Checking for local Ollama installation...${NC}"
if ! command -v ollama &> /dev/null; then
    echo -e "${RED}❌ Ollama is not installed locally.${NC}"
    echo "You can install it using:"
    echo "    curl -fsSL https://ollama.com/install.sh | sh"
    
    read -p "Would you like to install Ollama now? (y/n): " install_ollama
    if [[ "$install_ollama" == "y" || "$install_ollama" == "Y" ]]; then
        echo -e "${YELLOW}Installing Ollama...${NC}"
        curl -fsSL https://ollama.com/install.sh | sh
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to install Ollama.${NC}"
            exit 1
        else
            echo -e "${GREEN}✅ Ollama installed successfully!${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Skipping Ollama installation. The application will use fallbacks.${NC}"
        echo -e "${YELLOW}⚠️ For full functionality, please install Ollama and retry.${NC}"
        
        read -p "Continue anyway? (y/n): " continue_anyway
        if [[ "$continue_anyway" != "y" && "$continue_anyway" != "Y" ]]; then
            exit 1
        fi
    fi
else
    ollama_version=$(ollama --version 2>/dev/null || echo "version unknown")
    echo -e "${GREEN}✅ Ollama is installed: ${ollama_version}${NC}"
fi

# Check if Ollama process is running
echo -e "${YELLOW}Checking if Ollama server is running...${NC}"
if ! curl -s -f http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ Ollama server is not running. Starting it now...${NC}"
    
    # Start Ollama in the background
    ollama serve &
    OLLAMA_PID=$!
    
    # Wait for Ollama to start
    echo -e "${YELLOW}Waiting for Ollama to initialize...${NC}"
    attempt=0
    max_attempts=30
    until curl -s -f http://localhost:11434/api/tags > /dev/null 2>&1
    do
        attempt=$(($attempt+1))
        if [ $attempt -ge $max_attempts ]; then
            echo -e "${RED}❌ Failed to start Ollama after $max_attempts attempts${NC}"
            echo -e "${YELLOW}⚠️ The application will use fallbacks for test case generation.${NC}"
            
            read -p "Continue anyway? (y/n): " continue_anyway
            if [[ "$continue_anyway" != "y" && "$continue_anyway" != "Y" ]]; then
                exit 1
            fi
            break
        fi
        echo -e "Waiting for Ollama API to be ready... ($attempt/$max_attempts)"
        sleep 2
    done
    
    if [ $attempt -lt $max_attempts ]; then
        echo -e "${GREEN}✅ Ollama server started successfully${NC}"
    fi
else
    echo -e "${GREEN}✅ Ollama server is already running${NC}"
fi

# Check if the deepseek-r1:8b model is available
if command -v ollama &> /dev/null && curl -s -f http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}Checking if deepseek-r1:8b model is available...${NC}"
    if ! curl -s http://localhost:11434/api/tags | grep -q "deepseek-r1:8b"; then
        echo -e "${YELLOW}⚠️ The deepseek-r1:8b model is not found. Pulling it now...${NC}"
        echo -e "${YELLOW}This may take some time depending on your internet connection.${NC}"
        echo -e "${YELLOW}Size is approximately 8GB. Please be patient...${NC}"
        
        ollama pull deepseek-r1:8b
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to pull the model.${NC}"
            echo -e "${YELLOW}⚠️ The application will use fallbacks for test case generation.${NC}"
            
            read -p "Continue anyway? (y/n): " continue_anyway
            if [[ "$continue_anyway" != "y" && "$continue_anyway" != "Y" ]]; then
                exit 1
            fi
        else
            echo -e "${GREEN}✅ Model pulled successfully!${NC}"
        fi
    else
        echo -e "${GREEN}✅ deepseek-r1:8b model is available${NC}"
    fi
fi

echo -e "${GREEN}✅ Ollama setup complete!${NC}"
exit 0