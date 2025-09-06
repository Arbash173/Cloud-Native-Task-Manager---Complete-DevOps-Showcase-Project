#!/bin/bash

# Blue-Green Deployment Script for Task Manager
# This script implements zero-downtime deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
SERVICES="all"
HEALTH_CHECK_TIMEOUT=60

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment to deploy (staging|production) [default: production]"
    echo "  -s, --services SERVICES  Services to deploy (all|frontend|auth|task|notification) [default: all]"
    echo "  -t, --timeout SECONDS    Health check timeout [default: 60]"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "This script implements blue-green deployment strategy:"
    echo "1. Deploy new version to 'green' environment"
    echo "2. Run health checks on green environment"
    echo "3. Switch traffic from 'blue' to 'green'"
    echo "4. Keep blue environment as rollback option"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--services)
            SERVICES="$2"
            shift 2
            ;;
        -t|--timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_error "Valid environments: staging, production"
    exit 1
fi

print_status "Starting blue-green deployment..."
print_status "Environment: $ENVIRONMENT"
print_status "Services: $SERVICES"
print_status "Health check timeout: ${HEALTH_CHECK_TIMEOUT}s"

# Set up Railway CLI if not already installed
if ! command -v railway &> /dev/null; then
    print_status "Installing Railway CLI..."
    curl -fsSL https://railway.app/install.sh | sh
    export PATH="$HOME/.railway/bin:$PATH"
fi

# Login to Railway
if [[ -z "$RAILWAY_TOKEN" ]]; then
    print_error "RAILWAY_TOKEN environment variable is required"
    exit 1
fi

print_status "Logging into Railway..."
railway login --token "$RAILWAY_TOKEN"

# Function to deploy service to green environment
deploy_service_to_green() {
    local service="$1"
    local service_dir="apps/$service"
    
    print_status "Deploying $service to green environment..."
    
    # Copy Railway configuration
    cp "infrastructure/railway/$service.toml" "$service_dir/railway.toml"
    
    # Deploy to Railway with green suffix
    cd "$service_dir"
    railway up --service "${service}-green"
    cd - > /dev/null
    
    print_success "$service deployed to green environment"
}

# Function to run health checks on green environment
check_green_health() {
    local service="$1"
    local green_url="https://${service}-green.railway.app"
    
    print_status "Running health checks on $service green environment..."
    
    local retries=0
    local max_retries=$((HEALTH_CHECK_TIMEOUT / 10))
    
    while [[ $retries -lt $max_retries ]]; do
        if curl -f -s --max-time 10 "$green_url/health" > /dev/null 2>&1; then
            print_success "$service green environment is healthy"
            return 0
        else
            print_warning "$service green environment health check failed, retrying... ($retries/$max_retries)"
            sleep 10
            ((retries++))
        fi
    done
    
    print_error "$service green environment health check failed after $max_retries attempts"
    return 1
}

# Function to switch traffic from blue to green
switch_traffic_to_green() {
    local service="$1"
    
    print_status "Switching traffic from blue to green for $service..."
    
    # In Railway, this would involve updating the service configuration
    # For now, we'll simulate this by updating environment variables
    railway variables set SERVICE_URL="https://${service}-green.railway.app" --service "$service"
    
    print_success "Traffic switched to green for $service"
}

# Function to rollback to blue environment
rollback_to_blue() {
    local service="$1"
    
    print_warning "Rolling back $service to blue environment..."
    
    railway variables set SERVICE_URL="https://${service}-blue.railway.app" --service "$service"
    
    print_success "Rolled back to blue for $service"
}

# Main deployment logic
case $SERVICES in
    "all")
        SERVICES_LIST=("auth-service" "task-service" "notification-service" "frontend")
        ;;
    "frontend")
        SERVICES_LIST=("frontend")
        ;;
    "auth")
        SERVICES_LIST=("auth-service")
        ;;
    "task")
        SERVICES_LIST=("task-service")
        ;;
    "notification")
        SERVICES_LIST=("notification-service")
        ;;
esac

# Track deployment status
DEPLOYMENT_SUCCESS=true

# Deploy all services to green environment
for service in "${SERVICES_LIST[@]}"; do
    if ! deploy_service_to_green "$service"; then
        DEPLOYMENT_SUCCESS=false
        break
    fi
done

if [[ "$DEPLOYMENT_SUCCESS" == false ]]; then
    print_error "Deployment to green environment failed"
    exit 1
fi

# Wait for all services to be ready
print_status "Waiting for all services to be ready..."
sleep 30

# Run health checks on green environment
for service in "${SERVICES_LIST[@]}"; do
    if ! check_green_health "$service"; then
        DEPLOYMENT_SUCCESS=false
        break
    fi
done

if [[ "$DEPLOYMENT_SUCCESS" == false ]]; then
    print_error "Health checks failed on green environment"
    print_status "Rolling back to blue environment..."
    
    for service in "${SERVICES_LIST[@]}"; do
        rollback_to_blue "$service"
    done
    
    exit 1
fi

# Switch traffic to green environment
print_status "All health checks passed. Switching traffic to green environment..."
for service in "${SERVICES_LIST[@]}"; do
    switch_traffic_to_green "$service"
done

# Final verification
print_status "Running final verification..."
sleep 10

# Run comprehensive health checks
if ./infrastructure/scripts/health-check.sh -e "$ENVIRONMENT"; then
    print_success "Blue-green deployment completed successfully! ✅"
    print_status "All services are running on green environment"
    print_status "Blue environment is available for rollback if needed"
else
    print_error "Final verification failed"
    print_status "Consider rolling back to blue environment"
    exit 1
fi

print_status "Blue-green deployment finished!"
