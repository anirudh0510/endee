#!/bin/bash

# Function to kill background processes on exit
cleanup() {
    echo "Stopping all services..."
    kill $ENDEE_PID $BACKEND_PID $FRONTEND_PID
    exit
}

trap cleanup SIGINT SIGTERM

echo "Starting Endee-io Vector Database..."
./run.sh &
ENDEE_PID=$!

echo "Starting FastAPI Backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 main.py &
BACKEND_PID=$!
cd ..

echo "Starting Vite Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "All services started!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8000"
echo "Endee-io: http://localhost:8080"

wait
