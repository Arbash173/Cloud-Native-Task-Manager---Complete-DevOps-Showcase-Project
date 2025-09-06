#!/bin/bash

# Health check script for Task Manager services
# This script checks if all services are running and responding

set -e

echo "Starting health checks for Task Manager services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service is healthy
check_service() {
    local service_name=$1
    local service_url=$2
    local max_attempts=10
    local attempt=1
    
    echo -e "${YELLOW}Checking $service_name at $service_url${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$service_url/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service_name is healthy${NC}"
            return 0
        else
            echo -e "${YELLOW}Attempt $attempt/$max_attempts: $service_name not ready yet...${NC}"
            sleep 5
            ((attempt++))
        fi
    done
    
    echo -e "${RED}✗ $service_name failed health check after $max_attempts attempts${NC}"
    return 1
}

# Check if services are deployed (this would be configured based on actual deployment)
# For now, we'll just echo that health checks would run here
echo "Health check script is ready!"
echo "In a real deployment, this would check:"
echo "- Auth Service: http://auth-service-url/health"
echo "- Task Service: http://task-service-url/health" 
echo "- Notification Service: http://notification-service-url/health"
echo "- Frontend: http://frontend-url"

# Example of how the actual health checks would work:
# check_service "Auth Service" "http://localhost:8080"
# check_service "Task Service" "http://localhost:8081"
# check_service "Notification Service" "http://localhost:8082"
# check_service "Frontend" "http://localhost:3000"

echo -e "${GREEN}Health check script completed successfully!${NC}"
