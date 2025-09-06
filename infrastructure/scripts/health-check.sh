#!/bin/bash

# Health check script for Task Manager application
# Checks all services and their dependencies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="local"
TIMEOUT=30
RETRIES=3

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
    echo "  -e, --environment ENV    Environment to check (local|staging|production) [default: local]"
    echo "  -t, --timeout SECONDS    Timeout for health checks [default: 30]"
    echo "  -r, --retries COUNT      Number of retries [default: 3]"
    echo "  -h, --help              Show this help message"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -r|--retries)
            RETRIES="$2"
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

# Set service URLs based on environment
case $ENVIRONMENT in
    "local")
        AUTH_URL="http://localhost:8080"
        TASK_URL="http://localhost:8081"
        NOTIFICATION_URL="http://localhost:8082"
        FRONTEND_URL="http://localhost:3000"
        ;;
    "staging"|"production")
        # These would be set from environment variables in CI/CD
        AUTH_URL="${AUTH_SERVICE_URL:-http://localhost:8080}"
        TASK_URL="${TASK_SERVICE_URL:-http://localhost:8081}"
        NOTIFICATION_URL="${NOTIFICATION_SERVICE_URL:-http://localhost:8082}"
        FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
        ;;
esac

print_status "Starting health checks for environment: $ENVIRONMENT"
print_status "Timeout: ${TIMEOUT}s, Retries: $RETRIES"

# Function to check service health
check_service() {
    local service_name="$1"
    local url="$2"
    local endpoint="$3"
    local retries="$RETRIES"
    
    print_status "Checking $service_name at $url$endpoint"
    
    while [[ $retries -gt 0 ]]; do
        if curl -f -s --max-time "$TIMEOUT" "$url$endpoint" > /dev/null 2>&1; then
            print_success "$service_name is healthy"
            return 0
        else
            print_warning "$service_name health check failed, retrying... ($retries attempts left)"
            sleep 5
            ((retries--))
        fi
    done
    
    print_error "$service_name health check failed after $RETRIES attempts"
    return 1
}

# Function to check service connectivity
check_connectivity() {
    local service_name="$1"
    local url="$2"
    local retries="$RETRIES"
    
    print_status "Checking $service_name connectivity at $url"
    
    while [[ $retries -gt 0 ]]; do
        if curl -f -s --max-time "$TIMEOUT" "$url" > /dev/null 2>&1; then
            print_success "$service_name is reachable"
            return 0
        else
            print_warning "$service_name connectivity check failed, retrying... ($retries attempts left)"
            sleep 5
            ((retries--))
        fi
    done
    
    print_error "$service_name connectivity check failed after $RETRIES attempts"
    return 1
}

# Track overall health status
HEALTH_STATUS=0

# Check auth service
if ! check_service "Auth Service" "$AUTH_URL" "/health"; then
    HEALTH_STATUS=1
fi

# Check task service
if ! check_service "Task Service" "$TASK_URL" "/health"; then
    HEALTH_STATUS=1
fi

# Check notification service
if ! check_service "Notification Service" "$NOTIFICATION_URL" "/health"; then
    HEALTH_STATUS=1
fi

# Check frontend (if not local, might not have health endpoint)
if [[ "$ENVIRONMENT" == "local" ]]; then
    if ! check_connectivity "Frontend" "$FRONTEND_URL"; then
        HEALTH_STATUS=1
    fi
fi

# Check service-to-service communication
print_status "Checking service-to-service communication..."

# Check if task service can reach auth service
if [[ "$ENVIRONMENT" == "local" ]]; then
    print_status "Checking task service -> auth service communication"
    if docker exec task-manager-task-service-1 curl -f -s --max-time 10 "http://auth-service:8080/health" > /dev/null 2>&1; then
        print_success "Task service can reach auth service"
    else
        print_error "Task service cannot reach auth service"
        HEALTH_STATUS=1
    fi
fi

# Database connectivity check (for local environment)
if [[ "$ENVIRONMENT" == "local" ]]; then
    print_status "Checking database connectivity..."
    
    # Check if SQLite files exist and are accessible
    if [[ -f "./data/auth.db" ]]; then
        print_success "Auth database file exists"
    else
        print_warning "Auth database file not found (will be created on first run)"
    fi
    
    if [[ -f "./data/tasks.db" ]]; then
        print_success "Task database file exists"
    else
        print_warning "Task database file not found (will be created on first run)"
    fi
fi

# Summary
echo ""
if [[ $HEALTH_STATUS -eq 0 ]]; then
    print_success "All health checks passed! ✅"
    print_status "Application is ready to use"
else
    print_error "Some health checks failed! ❌"
    print_status "Please check the logs and fix the issues"
fi

# Show service status
echo ""
print_status "Service Status Summary:"
echo "  Auth Service: $AUTH_URL"
echo "  Task Service: $TASK_URL"
echo "  Notification Service: $NOTIFICATION_URL"
if [[ "$ENVIRONMENT" == "local" ]]; then
    echo "  Frontend: $FRONTEND_URL"
fi

exit $HEALTH_STATUS
