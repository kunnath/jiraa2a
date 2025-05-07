#!/bin/bash

# Start Ollama first
echo "Starting Ollama..."
docker compose up -d ollama

# Wait for Ollama to be ready
echo "Waiting for Ollama to be ready..."
attempt=0
max_attempts=30
until docker compose exec ollama curl -s -f http://localhost:11434/api/tags > /dev/null 2>&1
do
    attempt=$(($attempt+1))
    if [ $attempt -ge $max_attempts ]; then
        echo "Ollama failed to start after $max_attempts attempts"
        exit 1
    fi
    echo "Waiting for Ollama to be ready... ($attempt/$max_attempts)"
    sleep 3
done

echo "Ollama is ready!"

# Pull the required model
echo "Pulling deepseek-r1:8b model..."
docker compose exec ollama ollama pull deepseek-r1:8b

# Start the rest of the services
echo "Starting all services..."
docker compose up

echo "All services are running!"
