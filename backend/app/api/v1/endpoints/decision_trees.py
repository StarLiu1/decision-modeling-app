# Fix 2: Update the API endpoint in backend/app/api/v1/endpoints/decision_trees.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.decision_tree.decision_tree import DecisionTree, TreeNode
from app.schemas.decision_tree import (
    DecisionTreeResponse, 
    TreeNodeResponse, 
    CreateTreeRequest, 
    CreateNodeRequest
)

router = APIRouter()

@router.get("/", response_model=List[DecisionTreeResponse])
async def get_decision_trees(db: Session = Depends(get_db)):
    """Get all decision trees for the current user"""
    try:
        trees = db.query(DecisionTree).all()
        
        # Use the fixed from_orm method that handles UUID conversion
        response_trees = []
        for tree in trees:
            response_trees.append(DecisionTreeResponse.from_orm(tree))
        
        return response_trees
        
    except Exception as e:
        print(f"Error in get_decision_trees: {e}")  # Debug logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve trees: {str(e)}"
        )

@router.get("/{tree_id}", response_model=DecisionTreeResponse)
async def get_decision_tree(tree_id: str, db: Session = Depends(get_db)):
    """Get a specific decision tree with all its nodes"""
    try:
        tree = db.query(DecisionTree).filter(DecisionTree.id == tree_id).first()
        
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tree not found"
            )
        
        return DecisionTreeResponse.from_orm(tree)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_decision_tree: {e}")  # Debug logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tree: {str(e)}"
        )

@router.post("/", response_model=DecisionTreeResponse)
async def create_decision_tree(tree_data: CreateTreeRequest, db: Session = Depends(get_db)):
    """Create a new decision tree"""
    try:
        # Create the tree
        tree = DecisionTree(
            name=tree_data.name,
            description=tree_data.description
        )
        db.add(tree)
        db.flush()  # Get the tree ID without committing
        
        # Create root node if provided
        if tree_data.root_node:
            root_node = TreeNode(
                tree_id=tree.id,
                name=tree_data.root_node.name,
                node_type=tree_data.root_node.node_type,
                parent_node_id=None,  # Root node has no parent
                probability=tree_data.root_node.probability,
                cost=tree_data.root_node.cost,
                utility=tree_data.root_node.utility
            )
            db.add(root_node)
        
        db.commit()
        db.refresh(tree)
        
        return DecisionTreeResponse.from_orm(tree)
        
    except Exception as e:
        db.rollback()
        print(f"Error in create_decision_tree: {e}")  # Debug logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tree: {str(e)}"
        )

@router.post("/{tree_id}/nodes", response_model=TreeNodeResponse)
async def create_tree_node(
    tree_id: str, 
    node_data: CreateNodeRequest, 
    db: Session = Depends(get_db)
):
    """Create a new node in the specified tree"""
    try:
        # Verify tree exists
        tree = db.query(DecisionTree).filter(DecisionTree.id == tree_id).first()
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tree not found"
            )
        
        # Verify parent node exists if specified
        if node_data.parent_node_id:
            parent_node = db.query(TreeNode).filter(
                TreeNode.id == node_data.parent_node_id,
                TreeNode.tree_id == tree_id
            ).first()
            if not parent_node:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent node not found"
                )
        
        # Create the new node
        node = TreeNode(
            tree_id=tree_id,
            name=node_data.name,
            node_type=node_data.node_type,
            parent_node_id=node_data.parent_node_id,
            probability=node_data.probability,
            cost=node_data.cost,
            utility=node_data.utility
        )
        
        db.add(node)
        db.commit()
        db.refresh(node)
        
        return TreeNodeResponse.from_orm(node)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in create_tree_node: {e}")  # Debug logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create node: {str(e)}"
        )
    
@router.delete("/{tree_id}")
async def delete_decision_tree(tree_id: str, db: Session = Depends(get_db)):
    """Delete a decision tree and all its nodes"""
    try:
        tree = db.query(DecisionTree).filter(DecisionTree.id == tree_id).first()
        
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tree not found"
            )
        
        # Delete the tree (nodes will be deleted due to cascade)
        db.delete(tree)
        db.commit()
        
        return {"message": "Tree deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in delete_decision_tree: {e}")  # Debug logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tree: {str(e)}"
        )