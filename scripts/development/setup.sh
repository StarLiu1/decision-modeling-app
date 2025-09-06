#!/bin/bash

echo "🚀 Setting up development environment..."

# Setup backend
echo "🐍 Setting up Python backend..."
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
echo "✅ Backend setup complete"

# Setup frontend
echo "⚛️ Setting up React frontend..."
cd ../frontend
npm install
echo "✅ Frontend setup complete"

echo "🎉 Development environment ready!"
echo "Run 'docker-compose up' to start all services"
