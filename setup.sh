#!/bin/bash

# AI Tutor Platform Setup Script
# This script helps set up the development environment

echo "🚀 AI Tutor Platform Setup Script"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if Python is installed
check_python() {
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        print_status "Python $PYTHON_VERSION found"
    else
        print_error "Python 3 is not installed. Please install Python 3.8+ first."
        exit 1
    fi
}

# Check if Node.js is installed
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js $NODE_VERSION found"
    else
        print_error "Node.js is not installed. Please install Node.js 16+ first."
        exit 1
    fi
}

# Check if PostgreSQL is installed
check_postgres() {
    if command -v psql &> /dev/null; then
        print_status "PostgreSQL found"
    else
        print_warning "PostgreSQL not found. Please install PostgreSQL 12+ first."
        print_info "You can install it from: https://www.postgresql.org/download/"
    fi
}

# Setup backend
setup_backend() {
    print_info "Setting up backend..."
    
    cd backend
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        print_info "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    print_info "Activating virtual environment..."
    source venv/bin/activate
    
    # Install dependencies
    print_info "Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_info "Creating .env file..."
        cat > .env << EOF
DB_PASSWORD=your_postgres_password_here
SECRET_KEY=your_jwt_secret_key_here_make_it_long_and_random
EOF
        print_warning "Please update the .env file with your actual database password and secret key"
    fi
    
    cd ..
    print_status "Backend setup completed"
}

# Setup frontend
setup_frontend() {
    print_info "Setting up frontend..."
    
    cd frontend
    
    # Install dependencies
    print_info "Installing Node.js dependencies..."
    npm install
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_info "Creating .env file..."
        cat > .env << EOF
VITE_API_URL=http://localhost:8000
EOF
    fi
    
    cd ..
    print_status "Frontend setup completed"
}

# Create database
create_database() {
    print_info "Creating database..."
    
    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw aittutor; then
        print_status "Database 'aittutor' already exists"
    else
        print_info "Creating database 'aittutor'..."
        createdb aittutor
        print_status "Database created successfully"
    fi
}

# Main setup function
main() {
    echo
    print_info "Checking system requirements..."
    
    check_python
    check_node
    check_postgres
    
    echo
    print_info "Setting up project..."
    
    setup_backend
    setup_frontend
    
    echo
    print_info "Database setup..."
    create_database
    
    echo
    print_status "Setup completed successfully!"
    echo
    print_info "Next steps:"
    echo "1. Update backend/.env with your database password and secret key"
    echo "2. Start the backend server: cd backend && python main.py"
    echo "3. Start the frontend server: cd frontend && npm run dev"
    echo "4. Open http://localhost:5173 in your browser"
    echo
    print_warning "Make sure PostgreSQL is running before starting the backend!"
}

# Run main function
main
