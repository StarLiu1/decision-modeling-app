# backend/app/services/decision_tree_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from uuid import UUID
import uuid

from app.models.decision_tree.decision_tree import DecisionTree, TreeNode, NodeType
from app.schemas.decision_tree import (
    CreateTreeRequest as DecisionTreeCreate, DecisionTreeUpdate, 
    CreateNodeRequest as TreeNodeCreate, TreeNodeUpdate
)

class DecisionTreeService:
    """Service layer for decision tree operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_tree(self, tree_id: UUID) -> Optional[DecisionTree]:
        """Get a decision tree by ID"""
        return self.db.query(DecisionTree).filter(DecisionTree.id == tree_id).first()
    
    def get_trees(self, skip: int = 0, limit: int = 100, user_id: Optional[UUID] = None) -> List[DecisionTree]:
        """Get list of decision trees with pagination"""
        query = self.db.query(DecisionTree)
        if user_id:
            query = query.filter(DecisionTree.created_by == user_id)
        return query.offset(skip).limit(limit).all()
    
    def create_tree(self, tree_data: DecisionTreeCreate, user_id: Optional[UUID] = None) -> DecisionTree:
        """Create a new decision tree"""
        # Create the tree
        tree = DecisionTree(
            name=tree_data.name,
            description=tree_data.description,
            is_template=tree_data.is_template,
            is_public=tree_data.is_public,
            created_by=user_id
        )
        
        self.db.add(tree)
        self.db.flush()  # Get the tree ID
        
        # Create root node if provided
        if tree_data.root_node:
            root_node = TreeNode(
                tree_id=tree.id,
                parent_node_id=None,
                node_type=tree_data.root_node.node_type,
                name=tree_data.root_node.name,
                description=tree_data.root_node.description,
                probability=tree_data.root_node.probability,
                cost=tree_data.root_node.cost,
                utility=tree_data.root_node.utility,
                position_x=tree_data.root_node.position_x,
                position_y=tree_data.root_node.position_y,
                node_metadata=tree_data.root_node.node_metadata
            )
            self.db.add(root_node)
        
        self.db.commit()
        self.db.refresh(tree)
        return tree
    
    def update_tree(self, tree_id: UUID, tree_data: DecisionTreeUpdate) -> Optional[DecisionTree]:
        """Update a decision tree"""
        tree = self.get_tree(tree_id)
        if not tree:
            return None
        
        update_data = tree_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(tree, field, value)
        
        self.db.commit()
        self.db.refresh(tree)
        return tree
    
    def delete_tree(self, tree_id: UUID) -> bool:
        """Delete a decision tree"""
        tree = self.get_tree(tree_id)
        if not tree:
            return False
        
        self.db.delete(tree)
        self.db.commit()
        return True
    
    def duplicate_tree(self, tree_id: UUID, new_name: str, user_id: Optional[UUID] = None) -> Optional[DecisionTree]:
        """Create a duplicate of an existing tree"""
        original_tree = self.get_tree(tree_id)
        if not original_tree:
            return None
        
        # Create new tree
        new_tree = DecisionTree(
            name=new_name,
            description=f"Copy of {original_tree.description or original_tree.name}",
            is_template=False,
            is_public=False,
            created_by=user_id
        )
        
        self.db.add(new_tree)
        self.db.flush()
        
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
            self.db.add(new_node)
            self.db.flush()
            node_mapping[node.id] = new_node.id
        
        # Second pass: set parent relationships
        for old_node in original_tree.nodes:
            if old_node.parent_node_id:
                new_node_id = node_mapping[old_node.id]
                new_parent_id = node_mapping[old_node.parent_node_id]
                
                new_node = self.db.query(TreeNode).filter(TreeNode.id == new_node_id).first()
                new_node.parent_node_id = new_parent_id
        
        self.db.commit()
        self.db.refresh(new_tree)
        return new_tree

class TreeNodeService:
    """Service layer for tree node operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_node(self, node_id: UUID) -> Optional[TreeNode]:
        """Get a tree node by ID"""
        return self.db.query(TreeNode).filter(TreeNode.id == node_id).first()
    
    def get_tree_nodes(self, tree_id: UUID) -> List[TreeNode]:
        """Get all nodes for a tree"""
        return self.db.query(TreeNode).filter(TreeNode.tree_id == tree_id).all()
    
    def create_node(self, tree_id: UUID, node_data: TreeNodeCreate) -> TreeNode:
        """Create a new tree node"""
        # Validate parent exists if specified
        if node_data.parent_node_id:
            parent = self.get_node(UUID(node_data.parent_node_id))
            if not parent or parent.tree_id != tree_id:
                raise ValueError("Invalid parent node")
        
        node = TreeNode(
            tree_id=tree_id,
            parent_node_id=UUID(node_data.parent_node_id) if node_data.parent_node_id else None,
            node_type=node_data.node_type,
            name=node_data.name,
            description=node_data.description,
            probability=node_data.probability,
            cost=node_data.cost,
            utility=node_data.utility,
            position_x=node_data.position_x,
            position_y=node_data.position_y,
            node_metadata=node_data.node_metadata
        )
        
        # Validate the node
        errors = node.validate_node()
        if errors:
            raise ValueError("; ".join(errors))
        
        self.db.add(node)
        self.db.commit()
        self.db.refresh(node)
        return node
    
    def update_node(self, node_id: UUID, node_data: TreeNodeUpdate) -> Optional[TreeNode]:
        """Update a tree node"""
        node = self.get_node(node_id)
        if not node:
            return None
        
        update_data = node_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(node, field, value)
        
        # Validate updated node
        errors = node.validate_node()
        if errors:
            raise ValueError("; ".join(errors))
        
        self.db.commit()
        self.db.refresh(node)
        return node
    
    def delete_node(self, node_id: UUID) -> bool:
        """Delete a tree node and all its descendants"""
        node = self.get_node(node_id)
        if not node:
            return False
        
        # Get all descendant nodes
        def get_descendants(node_id: UUID) -> List[UUID]:
            children = self.db.query(TreeNode).filter(TreeNode.parent_node_id == node_id).all()
            descendants = [child.id for child in children]
            for child in children:
                descendants.extend(get_descendants(child.id))
            return descendants
        
        descendant_ids = get_descendants(node_id)
        
        # Delete all descendants first
        if descendant_ids:
            self.db.query(TreeNode).filter(TreeNode.id.in_(descendant_ids)).delete()
        
        # Delete the node itself
        self.db.delete(node)
        self.db.commit()
        return True
    
    def move_node(self, node_id: UUID, new_parent_id: Optional[UUID], position_x: int, position_y: int) -> Optional[TreeNode]:
        """Move a node to a new parent and position"""
        node = self.get_node(node_id)
        if not node:
            return None
        
        # Validate new parent if specified
        if new_parent_id:
            new_parent = self.get_node(new_parent_id)
            if not new_parent or new_parent.tree_id != node.tree_id:
                raise ValueError("Invalid new parent node")
            
            # Check for circular references
            current_parent = new_parent
            while current_parent:
                if current_parent.id == node_id:
                    raise ValueError("Cannot move node - would create circular reference")
                current_parent = current_parent.parent
        
        node.parent_node_id = new_parent_id
        node.position_x = position_x
        node.position_y = position_y
        
        self.db.commit()
        self.db.refresh(node)
        return node