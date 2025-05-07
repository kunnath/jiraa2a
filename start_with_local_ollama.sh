#!/bin/zsh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Run the setup script to ensure Ollama is installed and the model is available
echo -e "${YELLOW}Setting up Ollama and required model...${NC}"
./setup_ollama_model.sh

# Check if setup script was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ollama setup failed. Please check the error messages above.${NC}"
    exit 1
fi

# Start the application using docker-compose
echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}✅ Local Ollama setup complete!${NC}"
echo -e "${YELLOW}Starting application with docker-compose...${NC}"
echo -e "${BLUE}===========================================${NC}"

docker-compose -f docker-compose.local.yml up
