# backend/app/__init__.py
# This file makes the app directory a Python package

# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

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

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Decision Modeling API is running!", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",  # Will implement actual checks later
        "redis": "connected",
        "services": ["postgresql", "redis", "fastapi"]
    }

# API v1 routes (placeholder for now)
@app.get("/api/v1/")
async def api_v1_root():
    return {"message": "API v1 is ready", "endpoints": ["/models", "/auth", "/analysis"]}

# Temporary endpoints for testing
@app.get("/api/v1/models")
async def get_models():
    return {
        "models": [
            {
                "id": "1",
                "name": "Sample Decision Tree",
                "description": "A basic decision tree example",
                "created_at": "2025-09-06T19:23:00Z"
            }
        ]
    }

@app.get("/api/v1/models/{model_id}")
async def get_model(model_id: str):
    return {
        "id": model_id,
        "name": f"Decision Tree {model_id}",
        "description": "Sample model for testing",
        "nodes": [
            {
                "id": "root",
                "type": "decision",
                "name": "Root Decision",
                "children": []
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)