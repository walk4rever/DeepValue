#!/bin/bash

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run the FastAPI application
uvicorn main:app --reload --host 0.0.0.0 --port 3000
