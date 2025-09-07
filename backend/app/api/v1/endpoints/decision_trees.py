# Fixed backend/app/api/v1/endpoints/decision_trees.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID

from app.core.database import get_db
from app.models.decision_tree.decision_tree import DecisionTree, TreeNode
from app.schemas.decision_tree import (
    DecisionTreeResponse, 
    TreeNodeResponse, 
    CreateTreeRequest, 
    CreateNodeRequest,
    TreeNodeUpdate
)
from app.services.tree_analysis_service import TreeAnalysisService

router = APIRouter()

@router.get("/", response_model=List[DecisionTreeResponse])
async def get_decision_trees(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all decision trees for the current user"""
    try:
        trees = db.query(DecisionTree).offset(skip).limit(limit).all()
        
        response_trees = []
        for tree in trees:
            response_trees.append(DecisionTreeResponse.from_orm(tree))
        
        print(f"Returning {len(response_trees)} trees")  # Debug logging
        return response_trees
        
    except Exception as e:
        print(f"Error in get_decision_trees: {e}")
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
        
        print(f"Returning tree {tree.name} with {len(tree.nodes)} nodes")  # Debug logging
        return DecisionTreeResponse.from_orm(tree)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_decision_tree: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tree: {str(e)}"
        )

@router.post("/", response_model=DecisionTreeResponse)
async def create_decision_tree(tree_data: CreateTreeRequest, db: Session = Depends(get_db)):
    """Create a new decision tree"""
    try:
        print(f"Creating tree: {tree_data.name}")  # Debug logging
        
        # Create the tree
        tree = DecisionTree(
            name=tree_data.name,
            description=tree_data.description,
            is_template=tree_data.is_template or False,
            is_public=tree_data.is_public or False
        )
        db.add(tree)
        db.flush()  # Get the tree ID without committing
        
        # Create root node if provided
        if tree_data.root_node:
            print(f"Creating root node: {tree_data.root_node.name}")  # Debug logging
            
            root_node = TreeNode(
                tree_id=tree.id,
                name=tree_data.root_node.name,
                node_type=tree_data.root_node.node_type.value,  # Handle enum
                parent_node_id=None,  # Root node has no parent
                probability=getattr(tree_data.root_node, 'probability', None),
                cost=0.0,  # Default cost
                utility=getattr(tree_data.root_node, 'utility', None),
                position_x=tree_data.root_node.position_x or 100,
                position_y=tree_data.root_node.position_y or 100
            )
            db.add(root_node)
        
        db.commit()
        db.refresh(tree)
        
        print(f"Created tree {tree.id} successfully")  # Debug logging
        return DecisionTreeResponse.from_orm(tree)
        
    except Exception as e:
        db.rollback()
        print(f"Error in create_decision_tree: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tree: {str(e)}"
        )

@router.put("/{tree_id}", response_model=DecisionTreeResponse)
async def update_decision_tree(
    tree_id: str, 
    tree_data: CreateTreeRequest, 
    db: Session = Depends(get_db)
):
    """Update a decision tree"""
    try:
        tree = db.query(DecisionTree).filter(DecisionTree.id == tree_id).first()
        
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tree not found"
            )
        
        # Update tree fields
        tree.name = tree_data.name
        tree.description = tree_data.description
        if hasattr(tree_data, 'is_template'):
            tree.is_template = tree_data.is_template
        if hasattr(tree_data, 'is_public'):
            tree.is_public = tree_data.is_public
        
        db.commit()
        db.refresh(tree)
        
        return DecisionTreeResponse.from_orm(tree)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in update_decision_tree: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tree: {str(e)}"
        )

@router.delete("/{tree_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_decision_tree(tree_id: str, db: Session = Depends(get_db)):
    """Delete a decision tree and all its nodes"""
    try:
        tree = db.query(DecisionTree).filter(DecisionTree.id == tree_id).first()
        
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tree not found"
            )
        
        print(f"Deleting tree {tree.name}")  # Debug logging
        
        # Delete the tree (nodes will be deleted due to cascade)
        db.delete(tree)
        db.commit()
        
        return None  # 204 No Content
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in delete_decision_tree: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tree: {str(e)}"
        )

@router.post("/{tree_id}/duplicate", response_model=DecisionTreeResponse)
async def duplicate_decision_tree(
    tree_id: str,
    new_name: str = Query(..., min_length=1, max_length=255),
    db: Session = Depends(get_db)
):
    """Create a duplicate of an existing decision tree"""
    try:
        original_tree = db.query(DecisionTree).filter(DecisionTree.id == tree_id).first()
        
        if not original_tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Original tree not found"
            )
        
        print(f"Duplicating tree {original_tree.name} as {new_name}")  # Debug logging
        
        # Create new tree
        new_tree = DecisionTree(
            name=new_name,
            description=f"Copy of {original_tree.description or original_tree.name}",
            is_template=False,
            is_public=False
        )
        
        db.add(new_tree)
        db.flush()
        
        # Copy all nodes
        node_mapping = {}  # old_id -> new_id
        
        # First pass: create all nodes
        for node in original_tree.nodes:
            new_node = TreeNode(
                tree_id=new_tree.id,
                node_type=node.node_type,
                name=node.name,
                description=node.description,
                probability=node.probability,
                cost=node.cost,
                utility=node.utility,
                position_x=node.position_x,
                position_y=node.position_y,
                node_metadata=node.node_metadata
            )
            db.add(new_node)
            db.flush()
            node_mapping[node.id] = new_node.id
        
        # Second pass: set parent relationships
        for old_node in original_tree.nodes:
            if old_node.parent_node_id:
                new_node_id = node_mapping[old_node.id]
                new_parent_id = node_mapping[old_node.parent_node_id]
                
                new_node = db.query(TreeNode).filter(TreeNode.id == new_node_id).first()
                new_node.parent_node_id = new_parent_id
        
        db.commit()
        db.refresh(new_tree)
        
        return DecisionTreeResponse.from_orm(new_tree)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in duplicate_decision_tree: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to duplicate tree: {str(e)}"
        )

# Node management endpoints
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
        
        print(f"Creating node {node_data.name} in tree {tree.name}")  # Debug logging
        
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
            node_type=node_data.node_type.value if hasattr(node_data.node_type, 'value') else node_data.node_type,
            parent_node_id=node_data.parent_node_id,
            probability=node_data.probability,
            cost=node_data.cost or 0.0,
            utility=node_data.utility,
            position_x=node_data.position_x or 0,
            position_y=node_data.position_y or 0,
            node_metadata=node_data.node_metadata or {}
        )
        
        db.add(node)
        db.commit()
        db.refresh(node)
        
        print(f"Created node {node.id} successfully")  # Debug logging
        return TreeNodeResponse.from_orm(node)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in create_tree_node: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create node: {str(e)}"
        )

@router.get("/{tree_id}/nodes", response_model=List[TreeNodeResponse])
async def get_tree_nodes(
    tree_id: str,
    db: Session = Depends(get_db)
):
    """Get all nodes for a tree"""
    try:
        # Verify tree exists
        tree = db.query(DecisionTree).filter(DecisionTree.id == tree_id).first()
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tree not found"
            )
        
        nodes = db.query(TreeNode).filter(TreeNode.tree_id == tree_id).all()
        return [TreeNodeResponse.from_orm(node) for node in nodes]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_tree_nodes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get nodes: {str(e)}"
        )

@router.put("/{tree_id}/nodes/{node_id}", response_model=TreeNodeResponse)
async def update_tree_node(
    tree_id: str,
    node_id: str,
    node_data: CreateNodeRequest,  # Using CreateNodeRequest for consistency
    db: Session = Depends(get_db)
):
    """Update a tree node"""
    try:
        node = db.query(TreeNode).filter(
            TreeNode.id == node_id,
            TreeNode.tree_id == tree_id
        ).first()
        
        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found"
            )
        
        print(f"Updating node {node.name}")  # Debug logging
        
        # Update node fields
        node.name = node_data.name
        node.node_type = node_data.node_type.value if hasattr(node_data.node_type, 'value') else node_data.node_type
        node.probability = node_data.probability
        node.cost = node_data.cost or 0.0
        node.utility = node_data.utility
        
        # Update other optional fields if provided
        if hasattr(node_data, 'position_x') and node_data.position_x is not None:
            node.position_x = node_data.position_x
        if hasattr(node_data, 'position_y') and node_data.position_y is not None:
            node.position_y = node_data.position_y
        if hasattr(node_data, 'node_metadata') and node_data.node_metadata is not None:
            node.node_metadata = node_data.node_metadata
        
        db.commit()
        db.refresh(node)
        
        return TreeNodeResponse.from_orm(node)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in update_tree_node: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update node: {str(e)}"
        )

@router.delete("/{tree_id}/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tree_node(
    tree_id: str,
    node_id: str,
    db: Session = Depends(get_db)
):
    """Delete a tree node and all its descendants"""
    try:
        node = db.query(TreeNode).filter(
            TreeNode.id == node_id,
            TreeNode.tree_id == tree_id
        ).first()
        
        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found"
            )
        
        print(f"Deleting node {node.name} and its descendants")  # Debug logging
        
        # Get all descendant nodes recursively
        def get_descendants(node_id_to_check):
            children = db.query(TreeNode).filter(TreeNode.parent_node_id == node_id_to_check).all()
            descendants = [child.id for child in children]
            for child in children:
                descendants.extend(get_descendants(child.id))
            return descendants
        
        descendant_ids = get_descendants(node_id)
        
        # Delete all descendants first
        if descendant_ids:
            db.query(TreeNode).filter(TreeNode.id.in_(descendant_ids)).delete(synchronize_session=False)
        
        # Delete the node itself
        db.delete(node)
        db.commit()
        
        return None  # 204 No Content
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in delete_tree_node: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete node: {str(e)}"
        )

# Analysis endpoints
@router.get("/{tree_id}/analysis/expected-value")
async def get_expected_value_analysis(
    tree_id: str,
    db: Session = Depends(get_db)
):
    """Calculate expected value for the decision tree"""
    try:
        tree = db.query(DecisionTree).filter(DecisionTree.id == tree_id).first()
        
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tree not found"
            )
        
        print(f"Calculating expected value for tree {tree.name}")  # Debug logging
        
        analysis_result = TreeAnalysisService.calculate_expected_value(tree)
        return analysis_result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_expected_value_analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate expected value: {str(e)}"
        )

@router.get("/{tree_id}/validation")
async def validate_tree_structure(
    tree_id: str,
    db: Session = Depends(get_db)
):
    """Validate the tree structure"""
    try:
        tree = db.query(DecisionTree).filter(DecisionTree.id == tree_id).first()
        
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tree not found"
            )
        
        print(f"Validating tree structure for {tree.name}")  # Debug logging
        
        validation_result = TreeAnalysisService.validate_tree_structure(tree)
        return validation_result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in validate_tree_structure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate tree: {str(e)}"
        )