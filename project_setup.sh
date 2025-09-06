#!/bin/bash

# Interactive Decision Modeling Software - Project Setup Script
# Run this script to create the initial project structure

PROJECT_NAME="decision-modeling-app"

echo "🚀 Setting up $PROJECT_NAME project structure..."

# Create root directory
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME

# Backend structure
echo "📁 Creating backend structure..."
mkdir -p backend/{app,tests,scripts,docs}
mkdir -p backend/app/{api,core,models,services,utils,schemas}
mkdir -p backend/app/api/{v1,dependencies}
mkdir -p backend/app/api/v1/{endpoints}
mkdir -p backend/app/core/{config,security}
mkdir -p backend/app/models/{decision_tree,markov,user}
mkdir -p backend/app/services/{modeling,analysis,export}
mkdir -p backend/tests/{unit,integration,e2e}

# Frontend structure
echo "📱 Creating frontend structure..."
mkdir -p frontend/{src,public,tests}
mkdir -p frontend/src/{components,pages,hooks,services,utils,types,store}
mkdir -p frontend/src/components/{common,modeling,visualization,layout}
mkdir -p frontend/src/pages/{dashboard,modeling,analysis,settings}
mkdir -p frontend/src/services/{api,modeling}
mkdir -p frontend/tests/{unit,integration,e2e}

# Shared resources
echo "🔗 Creating shared structure..."
mkdir -p shared/{types,constants,utils}
mkdir -p docs/{api,architecture,deployment}
mkdir -p scripts/{development,deployment,database}
mkdir -p docker/{backend,frontend,database}

# Configuration and environment files
echo "⚙️ Creating configuration structure..."
mkdir -p config/{development,production,testing}

# Create initial files
echo "📄 Creating initial configuration files..."

# Root level files
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
pip-log.txt
pip-delete-this-directory.txt

# IDE
.vscode/settings.json
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Database
*.db
*.sqlite3

# Build outputs
dist/
build/
*.egg-info/

# Testing
.coverage
htmlcov/
.pytest_cache/
coverage/

# Docker
*.pid
EOF

# Docker Compose for development
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: decision_modeling_db
    environment:
      POSTGRES_DB: decision_modeling
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/database:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    container_name: decision_modeling_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    container_name: decision_modeling_backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://admin:password123@postgres:5432/decision_modeling
      - REDIS_URL=redis://redis:6379
      - ENVIRONMENT=development
    volumes:
      - ./backend:/app
      - ./shared:/shared
    depends_on:
      - postgres
      - redis
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    container_name: decision_modeling_frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - ./shared:/shared
      - /app/node_modules
    environment:
      - REACT_APP_API_URL=http://localhost:8000
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
EOF

# Backend Python files
echo "🐍 Creating backend files..."

# Backend requirements
cat > backend/requirements.txt << 'EOF'
# Core Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0

# Database
sqlalchemy==2.0.23
alembic==1.12.1
psycopg2-binary==2.9.9
redis==5.0.1

# Authentication & Security
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6

# Background Tasks
celery==5.3.4

# Scientific Computing
numpy==1.25.2
scipy==1.11.4
pandas==2.1.3
networkx==3.2.1
scikit-learn==1.3.2

# Development
pytest==7.4.3
pytest-asyncio==0.21.1
black==23.11.0
isort==5.12.0
mypy==1.7.1
pre-commit==3.6.0

# Utilities
python-dotenv==1.0.0
httpx==0.25.2
EOF

# Backend Dockerfile
cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# Frontend package.json
echo "⚛️ Creating frontend files..."
cat > frontend/package.json << 'EOF'
{
  "name": "decision-modeling-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "react-query": "^3.39.3",
    "axios": "^1.6.2",
    "d3": "^7.8.5",
    "cytoscape": "^3.26.0",
    "plotly.js": "^2.27.1",
    "react-flow-renderer": "^10.3.17",
    "@reduxjs/toolkit": "^1.9.7",
    "react-redux": "^8.1.3",
    "tailwindcss": "^3.3.6",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@types/d3": "^7.4.3",
    "typescript": "^4.9.5",
    "@typescript-eslint/eslint-plugin": "^6.12.0",
    "@typescript-eslint/parser": "^6.12.0",
    "eslint": "^8.54.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.1.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "jest": "^29.7.0",
    "vite": "^4.5.0",
    "@vitejs/plugin-react": "^4.1.1"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write src/**/*.{ts,tsx,js,jsx}"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF

# Frontend Dockerfile
cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
EOF

# VSCode workspace settings
mkdir -p .vscode
cat > .vscode/settings.json << 'EOF'
{
    "python.defaultInterpreterPath": "./backend/venv/bin/python",
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": false,
    "python.linting.mypyEnabled": true,
    "python.formatting.provider": "black",
    "python.sortImports.args": ["--profile", "black"],
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.organizeImports": true
    },
    "files.associations": {
        "*.env*": "dotenv"
    },
    "typescript.preferences.quoteStyle": "single",
    "javascript.preferences.quoteStyle": "single"
}
EOF

# GitHub Actions CI/CD
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        
    - name: Run tests
      run: |
        cd backend
        pytest
        
    - name: Lint with black
      run: |
        cd backend
        black --check .
        
    - name: Type check with mypy
      run: |
        cd backend
        mypy app

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
        
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
        
    - name: Run tests
      run: |
        cd frontend
        npm test
        
    - name: Lint
      run: |
        cd frontend
        npm run lint
        
    - name: Build
      run: |
        cd frontend
        npm run build
EOF

# Development scripts
echo "🛠️ Creating development scripts..."

cat > scripts/development/setup.sh << 'EOF'
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
EOF

cat > scripts/development/start.sh << 'EOF'
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
EOF

chmod +x scripts/development/*.sh

# README
cat > README.md << 'EOF'
# Interactive Decision Modeling Software

A modern web-based decision modeling and analysis platform similar to TreeAge, built with Python/FastAPI backend and React frontend.

## 🚀 Quick Start

1. **Clone and setup:**
   ```bash
   git clone <your-repo-url>
   cd decision-modeling-app
   chmod +x scripts/development/setup.sh
   ./scripts/development/setup.sh
   ```

2. **Start development environment:**
   ```bash
   docker-compose up
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 🏗️ Architecture

### Backend (Python/FastAPI)
- **Framework:** FastAPI with async support
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Caching:** Redis for session and computation caching
- **Background Tasks:** Celery for heavy computations
- **Scientific Computing:** NumPy, SciPy, pandas, NetworkX

### Frontend (React/TypeScript)
- **Framework:** React 18 with TypeScript
- **Visualization:** D3.js, Cytoscape.js, Plotly.js
- **State Management:** Redux Toolkit
- **Styling:** Tailwind CSS
- **Build Tool:** Vite

## 📁 Project Structure

```
decision-modeling-app/
├── backend/               # Python API server
├── frontend/             # React web application
├── shared/               # Shared types and utilities
├── scripts/              # Development and deployment scripts
├── docs/                 # Documentation
└── docker/               # Docker configurations
```

## 🛠️ Development

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- Git

### Development Workflow
1. Make changes to backend or frontend code
2. Run tests: `npm test` (frontend) or `pytest` (backend)
3. Lint code: `npm run lint` (frontend) or `black .` (backend)
4. Commit and push changes

### Testing
- **Backend:** `cd backend && pytest`
- **Frontend:** `cd frontend && npm test`

## 🚢 Deployment

Production deployment configurations are available in the `docker/` directory and GitHub Actions workflows.

## 📚 Documentation

- [API Documentation](docs/api/)
- [Architecture Guide](docs/architecture/)
- [Deployment Guide](docs/deployment/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request
EOF

echo ""
echo "🎉 Project structure created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. cd $PROJECT_NAME"
echo "2. git init"
echo "3. Run: chmod +x scripts/development/setup.sh && ./scripts/development/setup.sh"
echo "4. Run: docker-compose up"
echo ""
echo "Your development environment will be ready at:"
echo "- Frontend: http://localhost:3000"
echo "- Backend: http://localhost:8000"
echo "- API Docs: http://localhost:8000/docs"
