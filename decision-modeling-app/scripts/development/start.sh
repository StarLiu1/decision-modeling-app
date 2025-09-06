#!/bin/bash

echo "🚀 Starting development servers..."

# Start database services
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Start backend
echo "🐍 Starting backend..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &

# Start frontend
echo "⚛️ Starting frontend..."
cd ../frontend
npm run dev &

echo "✅ Development servers started!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
