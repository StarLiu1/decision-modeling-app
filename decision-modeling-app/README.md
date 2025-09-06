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
