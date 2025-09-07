from pydantic_settings import BaseSettings
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.services.decision_tree_service import DecisionTreeService, TreeNodeService
from app.schemas.decision_tree import (
    DecisionTreeResponse, CreateNodeRequest as TreeNodeCreate, TreeNodeUpdate, TreeNodeResponse
)
import os

router = APIRouter()

class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    database_url: str = "postgresql://admin:password123@localhost:5432/decision_modeling"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # API
    api_v1_prefix: str = "/api/v1"
    
    # Environment
    environment: str = "development"
    debug: bool = True
    
    # Security (for future auth implementation)
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()

# @router.get("/", response_model=List[DecisionTreeResponse])
# async def get_decision_trees(
#     skip: int = 0,
#     limit: int = 100,
#     db: Session = Depends(get_db)
# ):
#     """Get a list of decision trees"""

@router.delete("/{tree_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_decision_tree(
    tree_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a decision tree"""
    service = DecisionTreeService(db)
    deleted = service.delete_tree(tree_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tree not found")

@router.post("/{tree_id}/duplicate", response_model=DecisionTreeResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_decision_tree(
    tree_id: UUID,
    new_name: str = Query(..., min_length=1, max_length=255),
    db: Session = Depends(get_db)
):
    """Create a duplicate of an existing decision tree"""
    service = DecisionTreeService(db)
    new_tree = service.duplicate_tree(tree_id, new_name)
    if not new_tree:
        raise HTTPException(status_code=404, detail="Original tree not found")
    return DecisionTreeResponse.from_orm(new_tree)

# Node management endpoints
@router.post("/{tree_id}/nodes", response_model=TreeNodeResponse, status_code=status.HTTP_201_CREATED)
async def create_tree_node(
    tree_id: UUID,
    node_data: TreeNodeCreate,
    db: Session = Depends(get_db)
):
    """Create a new node in the tree"""
    try:
        # Verify tree exists
        tree_service = DecisionTreeService(db)
        tree = tree_service.get_tree(tree_id)
        if not tree:
            raise HTTPException(status_code=404, detail="Tree not found")
        
        node_service = TreeNodeService(db)
        node = node_service.create_node(tree_id, node_data)
        return TreeNodeResponse.from_orm(node)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{tree_id}/nodes", response_model=List[TreeNodeResponse])
async def get_tree_nodes(
    tree_id: UUID,
    db: Session = Depends(get_db)
):
    """Get all nodes for a tree"""
    # Verify tree exists
    tree_service = DecisionTreeService(db)
    tree = tree_service.get_tree(tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    node_service = TreeNodeService(db)
    nodes = node_service.get_tree_nodes(tree_id)
    return [TreeNodeResponse.from_orm(node) for node in nodes]

@router.put("/{tree_id}/nodes/{node_id}", response_model=TreeNodeResponse)
async def update_tree_node(
    tree_id: UUID,
    node_id: UUID,
    node_data: TreeNodeUpdate,
    db: Session = Depends(get_db)
):
    """Update a tree node"""
    try:
        node_service = TreeNodeService(db)
        node = node_service.get_node(node_id)
        if not node or node.tree_id != tree_id:
            raise HTTPException(status_code=404, detail="Node not found")
        
        updated_node = node_service.update_node(node_id, node_data)
        return TreeNodeResponse.from_orm(updated_node)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))