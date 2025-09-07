# backend/app/api/v1/api.py
from fastapi import APIRouter

api_router = APIRouter()

# Direct import approach
from . import endpoints
from .endpoints import decision_trees

api_router.include_router(
    decision_trees.router, 
    prefix="/trees", 
    tags=["decision-trees"]
)