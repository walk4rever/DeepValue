#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== DeepValue Application Launcher ===${NC}"

# Start backend in the background
echo -e "${GREEN}Starting backend server...${NC}"
(cd "$(pwd)/backend" && source venv/bin/activate && python main.py) &
BACKEND_PID=$!

# Give the backend a moment to start
sleep 2

# Start frontend
echo -e "${GREEN}Starting frontend server...${NC}"
cd "$(pwd)/frontend" && npm run serve

# When frontend is terminated, also kill the backend
kill $BACKEND_PID 2>/dev/null

echo -e "${YELLOW}The application will be available at:${NC}"
echo -e "  ${GREEN}Frontend: http://localhost:8080${NC}"
echo -e "  ${GREEN}Backend API: http://localhost:8000${NC}"

echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
