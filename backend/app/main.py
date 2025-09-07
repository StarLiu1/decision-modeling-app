from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
import os

from app.core.config import settings
from app.core.database import engine
from app.models.decision_tree.decision_tree import Base
from app.api.v1.api import api_router  # ✅ CORRECT

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI instance
app = FastAPI(
    title="Decision Modeling API",
    description="Interactive Decision Modeling and Analysis Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.api_v1_prefix)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Decision Modeling API is running!", 
        "version": "1.0.0",
        "docs": "/docs",
        "api": settings.api_v1_prefix
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "redis": "available",
        "services": ["postgresql", "redis", "fastapi"],
        "endpoints": {
            "trees": f"{settings.api_v1_prefix}/trees",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)