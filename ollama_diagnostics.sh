#!/bin/zsh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}JIRA Relationship Visualizer - Ollama Diagnostics${NC}"
echo -e "${BLUE}===========================================${NC}"

# Check if Ollama is installed
echo -e "${YELLOW}Checking Ollama installation...${NC}"
if command -v ollama &> /dev/null; then
    ollama_version=$(ollama --version 2>/dev/null || echo "version unknown")
    echo -e "${GREEN}✅ Ollama is installed: ${ollama_version}${NC}"
    
    # Check installation path
    ollama_path=$(which ollama)
    echo -e "${GREEN}✅ Ollama path: ${ollama_path}${NC}"
else
    echo -e "${RED}❌ Ollama is not installed or not in PATH${NC}"
fi

# Check if Ollama process is running
echo -e "${YELLOW}Checking Ollama process...${NC}"
if pgrep -x "ollama" > /dev/null; then
    ollama_pid=$(pgrep -x "ollama")
    echo -e "${GREEN}✅ Ollama process is running. PID: ${ollama_pid}${NC}"
    
    echo -e "${YELLOW}Running process details:${NC}"
    ps -p $ollama_pid -o pid,ppid,user,%cpu,%mem,start,time,command
else
    echo -e "${RED}❌ Ollama process is not running${NC}"
fi

# Check if Ollama API is accessible
echo -e "${YELLOW}Checking Ollama API...${NC}"
if curl -s -f http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama API is accessible at http://localhost:11434${NC}"
    
    # Get models
    echo -e "${YELLOW}Listing available models:${NC}"
    curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | while read model; do
        echo -e "   - ${model}"
    done
else
    echo -e "${RED}❌ Ollama API is not accessible${NC}"
    echo -e "   Try starting Ollama with: ollama serve"
fi

# Check Docker connectivity to Ollama
echo -e "${YELLOW}Checking Docker to Ollama connectivity...${NC}"
if docker info &> /dev/null; then
    echo -e "${GREEN}✅ Docker is running${NC}"
    
    echo -e "${YELLOW}Testing connectivity from Docker to host.docker.internal:11434...${NC}"
    docker run --rm busybox sh -c "wget -q -T 5 -O- http://host.docker.internal:11434/api/tags > /dev/null 2>&1"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Docker can access Ollama through host.docker.internal${NC}"
    else
        echo -e "${RED}❌ Docker cannot access Ollama through host.docker.internal${NC}"
        echo -e "   This might be due to:"
        echo -e "   1. Missing --add-host=host.docker.internal:host-gateway in Docker run"
        echo -e "   2. Firewall blocking connections"
        echo -e "   3. Ollama not running"
    fi
else
    echo -e "${RED}❌ Docker is not running${NC}"
fi

# Check system resources
echo -e "${YELLOW}Checking system resources...${NC}"
total_mem=$(sysctl -n hw.memsize 2>/dev/null || echo "unknown")
if [ "$total_mem" != "unknown" ]; then
    total_mem_gb=$(echo "scale=2; $total_mem / 1024 / 1024 / 1024" | bc)
    echo -e "${GREEN}✅ Total system memory: ${total_mem_gb}GB${NC}"
    
    if (( $(echo "$total_mem_gb < 16" | bc -l) )); then
        echo -e "${YELLOW}⚠️ Warning: System memory may be low for running Ollama with deepseek models${NC}"
    fi
fi

# Disk space
echo -e "${YELLOW}Checking disk space in Ollama directory...${NC}"
ollama_dir="$HOME/.ollama"
if [ -d "$ollama_dir" ]; then
    disk_usage=$(du -sh "$ollama_dir" | cut -f1)
    echo -e "${GREEN}✅ Ollama directory size: ${disk_usage}${NC}"
    
    available_space=$(df -h "$ollama_dir" | tail -1 | awk '{print $4}')
    echo -e "${GREEN}✅ Available space: ${available_space}${NC}"
else
    echo -e "${YELLOW}⚠️ Ollama directory not found at $ollama_dir${NC}"
fi

echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}Diagnostics complete!${NC}"
echo -e "${BLUE}===========================================${NC}"

# Recommendations
echo -e "${YELLOW}Recommendations:${NC}"
if ! command -v ollama &> /dev/null; then
    echo -e "- Install Ollama: curl -fsSL https://ollama.com/install.sh | sh"
fi

if ! pgrep -x "ollama" > /dev/null; then
    echo -e "- Start Ollama: ollama serve"
fi

if ! curl -s -f http://localhost:11434/api/tags | grep -q "deepseek-r1:8b"; then
    echo -e "- Pull the required model: ollama pull deepseek-r1:8b"
fi

echo -e "- To fix Docker connectivity issues: Use docker-compose with 'extra_hosts: - \"host.docker.internal:host-gateway\"'"
echo -e "- For more information, visit: https://ollama.com/blog/ollama-docker"