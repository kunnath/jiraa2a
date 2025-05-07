#!/usr/bin/env python
import os
import time
import httpx
import sys

def check_ollama_ready():
    """Check if Ollama API is ready"""
    # Default to localhost but allow override from environment
    ollama_base = os.getenv("OLLAMA_API_BASE", "http://localhost:11434")
    
    # Check if we're running in Docker and using localhost
    if os.getenv("DOCKER_CONTAINER", "false") == "true" and "localhost" in ollama_base:
        print("Running in Docker container but configured for localhost Ollama")
        print("Switching to host.docker.internal to access host machine")
        ollama_base = ollama_base.replace("localhost", "host.docker.internal")
        
    max_retries = 30
    retry_count = 0
    
    print(f"Checking Ollama API at {ollama_base}...")
    
    while retry_count < max_retries:
        try:
            response = httpx.get(f"{ollama_base}/api/tags")
            if response.status_code == 200:
                print(f"✅ Ollama API is ready at {ollama_base}!")
                
                # Check if the required model is available
                models = response.json()
                model_found = any(model.get("name", "").startswith("deepseek-r1:8b") for model in models.get("models", []))
                
                if model_found:
                    print("✅ Model deepseek-r1:8b is available")
                else:
                    print("⚠️ Model deepseek-r1:8b is not found in Ollama")
                    print("Test case generation will use fallback options")
                    print("Consider pulling the model with: ollama pull deepseek-r1:8b")
                
                return True
        except Exception as e:
            pass
            
        retry_count += 1
        print(f"Waiting for Ollama API to be ready... ({retry_count}/{max_retries})")
        time.sleep(2)
    
    print(f"⚠️ Warning: Ollama API at {ollama_base} is not ready after maximum retries")
    print("The application will continue but test case generation may use fallbacks")
    return False

def pull_model(model_name):
    """Pull a specific model if it doesn't exist"""
    ollama_base = os.getenv("OLLAMA_API_BASE", "http://localhost:11434")
    
    # Check if model exists
    try:
        response = httpx.get(f"{ollama_base}/api/tags")
        models = response.json().get("models", [])
        
        # Check if our model is in the list
        model_exists = any(model.get("name") == model_name for model in models)
        
        if model_exists:
            print(f"Model {model_name} already exists")
            return True
    except Exception as e:
        print(f"Error checking model: {e}")
        return False
    
    # Pull the model
    print(f"Pulling model {model_name}...")
    try:
        response = httpx.post(
            f"{ollama_base}/api/pull",
            json={"name": model_name},
            timeout=600  # Long timeout for model downloading
        )
        
        if response.status_code == 200:
            print(f"Successfully pulled model {model_name}")
            return True
        else:
            print(f"Failed to pull model {model_name}: {response.text}")
            return False
    except Exception as e:
        print(f"Error pulling model: {e}")
        return False

if __name__ == "__main__":
    # Wait for Ollama to be ready
    if not check_ollama_ready():
        sys.exit(1)
    
    # Try to pull the required model
    model_name = "deepseek-r1:8b"
    if not pull_model(model_name):
        print(f"Could not pull model {model_name}, will use fallback when needed")
    
    print("Ollama setup complete")
