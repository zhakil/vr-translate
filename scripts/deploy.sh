#!/bin/bash

# VR Translation Service Deployment Script

set -e  # Exit on any error

# Configuration
PROJECT_NAME="vr-translate"
BACKEND_DIR="backend"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    log_info "Dependencies check passed"
}

check_environment() {
    log_info "Checking environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        log_warn "Environment file $ENV_FILE not found"
        log_info "Creating from example..."
        if [ -f "$BACKEND_DIR/.env.example" ]; then
            cp "$BACKEND_DIR/.env.example" "$ENV_FILE"
            log_warn "Please edit $ENV_FILE with your actual API keys and configuration"
        else
            log_error "No .env.example file found to copy from"
            exit 1
        fi
    fi
    
    log_info "Environment check completed"
}

build_backend() {
    log_info "Building backend application..."
    
    cd "$BACKEND_DIR"
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        log_info "Installing Node.js dependencies..."
        npm install
    fi
    
    # Build TypeScript
    log_info "Building TypeScript..."
    npm run build
    
    # Run tests
    log_info "Running tests..."
    npm test
    
    cd ..
    log_info "Backend build completed"
}

deploy_production() {
    log_info "Deploying to production..."
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    
    # Build and start services
    log_info "Building and starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d --build
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    timeout 120 sh -c 'until docker-compose ps | grep -q "healthy"; do sleep 5; done' || {
        log_error "Services did not become healthy within timeout"
        docker-compose logs
        exit 1
    }
    
    log_info "Production deployment completed successfully"
}

deploy_development() {
    log_info "Deploying to development..."
    
    # Stop existing containers
    docker-compose -f docker-compose.dev.yml down --remove-orphans
    
    # Build and start development services
    docker-compose -f docker-compose.dev.yml up -d --build
    
    log_info "Development deployment completed"
}

show_status() {
    log_info "Service status:"
    docker-compose ps
    
    log_info "Service logs (last 20 lines):"
    docker-compose logs --tail=20
}

cleanup() {
    log_info "Cleaning up..."
    
    # Remove unused containers and images
    docker system prune -f
    
    # Remove unused volumes (be careful with this in production)
    if [ "$1" = "--volumes" ]; then
        log_warn "Removing unused volumes..."
        docker volume prune -f
    fi
    
    log_info "Cleanup completed"
}

show_help() {
    echo "VR Translation Service Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  build       Build the backend application"
    echo "  deploy      Deploy to production"
    echo "  dev         Deploy to development environment"
    echo "  status      Show service status and logs"
    echo "  cleanup     Clean up Docker resources"
    echo "  help        Show this help message"
    echo ""
    echo "Options:"
    echo "  --volumes   (with cleanup) Also remove unused volumes"
    echo ""
    echo "Examples:"
    echo "  $0 build"
    echo "  $0 deploy"
    echo "  $0 dev"
    echo "  $0 cleanup --volumes"
}

# Main script
main() {
    case "$1" in
        "build")
            check_dependencies
            build_backend
            ;;
        "deploy")
            check_dependencies
            check_environment
            build_backend
            deploy_production
            show_status
            ;;
        "dev")
            check_dependencies
            deploy_development
            show_status
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup "$2"
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            log_error "No command specified"
            show_help
            exit 1
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"