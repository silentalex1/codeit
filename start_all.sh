#!/bin/bash

# Start Python AI backend in background
echo "Starting Python AI backend..."
python ai_backend.py &
PYTHON_PID=$!

# Wait for Python backend to start
sleep 10

# Start Node.js server
echo "Starting Node.js server..."
node server.js

# Clean up Python process on exit
trap "kill $PYTHON_PID" EXIT