#!/bin/bash

# Deployment script for Task Manager application
# Supports multiple environments: local, staging, production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="local"
SERVICES="all"
BUILD_IMAGES=false
PULL_IMAGES=false

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
    echo "  -e, --environment ENV    Environment to deploy (local|staging|production) [default: local]"
    echo "  -s, --services SERVICES  Services to deploy (all|frontend|auth|task|notification) [default: all]"
    echo "  -b, --build             Build Docker images before deployment"
    echo "  -p, --pull              Pull latest images before deployment"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy all services locally"
    echo "  $0 -e production -b                   # Build and deploy to production"
    echo "  $0 -e staging -s frontend -p          # Pull and deploy only frontend to staging"
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
        -b|--build)
            BUILD_IMAGES=true
            shift
            ;;
        -p|--pull)
            PULL_IMAGES=true
            shift
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
if [[ ! "$ENVIRONMENT" =~ ^(local|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_error "Valid environments: local, staging, production"
    exit 1
fi

# Validate services
if [[ ! "$SERVICES" =~ ^(all|frontend|auth|task|notification)$ ]]; then
    print_error "Invalid service: $SERVICES"
    print_error "Valid services: all, frontend, auth, task, notification"
    exit 1
fi

print_status "Starting deployment..."
print_status "Environment: $ENVIRONMENT"
print_status "Services: $SERVICES"
print_status "Build images: $BUILD_IMAGES"
print_status "Pull images: $PULL_IMAGES"

# Set environment variables based on environment
case $ENVIRONMENT in
    "local")
        COMPOSE_FILE="docker-compose.yml"
        print_status "Using local development configuration"
        ;;
    "staging")
        COMPOSE_FILE="infrastructure/docker/docker-compose.staging.yml"
        print_status "Using staging configuration"
        ;;
    "production")
        COMPOSE_FILE="infrastructure/docker/docker-compose.prod.yml"
        print_status "Using production configuration"
        ;;
esac

# Check if compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    print_error "Docker compose file not found: $COMPOSE_FILE"
    exit 1
fi

# Build images if requested
if [[ "$BUILD_IMAGES" == true ]]; then
    print_status "Building Docker images..."
    
    case $SERVICES in
        "all")
            docker-compose -f "$COMPOSE_FILE" build
            ;;
        "frontend")
            docker-compose -f "$COMPOSE_FILE" build frontend
            ;;
        "auth")
            docker-compose -f "$COMPOSE_FILE" build auth-service
            ;;
        "task")
            docker-compose -f "$COMPOSE_FILE" build task-service
            ;;
        "notification")
            docker-compose -f "$COMPOSE_FILE" build notification-service
            ;;
    esac
    
    print_success "Docker images built successfully"
fi

# Pull images if requested
if [[ "$PULL_IMAGES" == true ]]; then
    print_status "Pulling latest Docker images..."
    
    case $SERVICES in
        "all")
            docker-compose -f "$COMPOSE_FILE" pull
            ;;
        "frontend")
            docker-compose -f "$COMPOSE_FILE" pull frontend
            ;;
        "auth")
            docker-compose -f "$COMPOSE_FILE" pull auth-service
            ;;
        "task")
            docker-compose -f "$COMPOSE_FILE" pull task-service
            ;;
        "notification")
            docker-compose -f "$COMPOSE_FILE" pull notification-service
            ;;
    esac
    
    print_success "Docker images pulled successfully"
fi

# Stop existing services
print_status "Stopping existing services..."
docker-compose -f "$COMPOSE_FILE" down

# Start services
print_status "Starting services..."
case $SERVICES in
    "all")
        docker-compose -f "$COMPOSE_FILE" up -d
        ;;
    "frontend")
        docker-compose -f "$COMPOSE_FILE" up -d frontend
        ;;
    "auth")
        docker-compose -f "$COMPOSE_FILE" up -d auth-service
        ;;
    "task")
        docker-compose -f "$COMPOSE_FILE" up -d task-service
        ;;
    "notification")
        docker-compose -f "$COMPOSE_FILE" up -d notification-service
        ;;
esac

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Run health checks
print_status "Running health checks..."
./infrastructure/scripts/health-check.sh "$ENVIRONMENT"

print_success "Deployment completed successfully!"

# Show service URLs
print_status "Service URLs:"
if [[ "$ENVIRONMENT" == "local" ]]; then
    echo "  Frontend: http://localhost:3000"
    echo "  Auth Service: http://localhost:8080"
    echo "  Task Service: http://localhost:8081"
    echo "  Notification Service: http://localhost:8082"
else
    echo "  Check Railway dashboard for service URLs"
fi

print_status "Deployment finished!"
