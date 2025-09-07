# Fixed backend/app/services/decision_tree_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from uuid import UUID
import uuid

from app.models.decision_tree.decision_tree import DecisionTree, TreeNode, NodeType
from app.schemas.decision_tree import (
    CreateTreeRequest, DecisionTreeUpdate, 
    CreateNodeRequest, TreeNodeUpdate
)

class DecisionTreeService:
    """Service layer for decision tree operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_tree(self, tree_id: str) -> Optional[DecisionTree]:
        """Get a decision tree by ID"""
        try:
            # Convert string ID to UUID if needed
            if isinstance(tree_id, str):
                tree_uuid = UUID(tree_id)
            else:
                tree_uuid = tree_id
            return self.db.query(DecisionTree).filter(DecisionTree.id == tree_uuid).first()
        except ValueError:
            # Invalid UUID format
            return None
    
    def get_trees(self, skip: int = 0, limit: int = 100, user_id: Optional[str] = None) -> List[DecisionTree]:
        """Get list of decision trees with pagination"""
        query = self.db.query(DecisionTree)
        if user_id:
            user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
            query = query.filter(DecisionTree.created_by == user_uuid)
        return query.offset(skip).limit(limit).all()
    
    def create_tree(self, tree_data: CreateTreeRequest, user_id: Optional[str] = None) -> DecisionTree:
        """Create a new decision tree"""
        # Create the tree
        tree = DecisionTree(
            name=tree_data.name,
            description=tree_data.description,
            is_template=tree_data.is_template or False,
            is_public=tree_data.is_public or False,
            created_by=UUID(user_id) if user_id else None
        )
        
        self.db.add(tree)
        self.db.flush()  # Get the tree ID
        
        # Create root node if provided
        if tree_data.root_node:
            root_node = TreeNode(
                tree_id=tree.id,
                parent_node_id=None,
                node_type=tree_data.root_node.node_type.value if hasattr(tree_data.root_node.node_type, 'value') else tree_data.root_node.node_type,
                name=tree_data.root_node.name,
                description=getattr(tree_data.root_node, 'description', None),
                probability=getattr(tree_data.root_node, 'probability', None),
                cost=0.0,  # Default cost
                utility=getattr(tree_data.root_node, 'utility', None),
                position_x=getattr(tree_data.root_node, 'position_x', 100),
                position_y=getattr(tree_data.root_node, 'position_y', 100),
                node_metadata={}
            )
            self.db.add(root_node)
        
        self.db.commit()
        self.db.refresh(tree)
        return tree
    
    def update_tree(self, tree_id: str, tree_data: DecisionTreeUpdate) -> Optional[DecisionTree]:
        """Update a decision tree"""
        tree = self.get_tree(tree_id)
        if not tree:
            return None
        
        # Update only provided fields
        if tree_data.name is not None:
            tree.name = tree_data.name
        if tree_data.description is not None:
            tree.description = tree_data.description
        if tree_data.is_template is not None:
            tree.is_template = tree_data.is_template
        if tree_data.is_public is not None:
            tree.is_public = tree_data.is_public
        
        self.db.commit()
        self.db.refresh(tree)
        return tree
    
    def delete_tree(self, tree_id: str) -> bool:
        """Delete a decision tree"""
        tree = self.get_tree(tree_id)
        if not tree:
            return False
        
        self.db.delete(tree)
        self.db.commit()
        return True
    
    def duplicate_tree(self, tree_id: str, new_name: str, user_id: Optional[str] = None) -> Optional[DecisionTree]:
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
            created_by=UUID(user_id) if user_id else None
        )
        
        self.db.add(new_tree)
        self.db.flush()
        
        # Copy all nodes if original tree has nodes
        if original_tree.nodes:
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
                    node_metadata=node.node_metadata or {}
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
                    if new_node:
                        new_node.parent_node_id = new_parent_id
        
        self.db.commit()
        self.db.refresh(new_tree)
        return new_tree

class TreeNodeService:
    """Service layer for tree node operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_node(self, node_id: str) -> Optional[TreeNode]:
        """Get a tree node by ID"""
        try:
            node_uuid = UUID(node_id) if isinstance(node_id, str) else node_id
            return self.db.query(TreeNode).filter(TreeNode.id == node_uuid).first()
        except ValueError:
            return None
    
    def get_tree_nodes(self, tree_id: str) -> List[TreeNode]:
        """Get all nodes for a tree"""
        try:
            tree_uuid = UUID(tree_id) if isinstance(tree_id, str) else tree_id
            return self.db.query(TreeNode).filter(TreeNode.tree_id == tree_uuid).all()
        except ValueError:
            return []
    
    def create_node(self, tree_id: str, node_data: CreateNodeRequest) -> TreeNode:
        """Create a new tree node"""
        # Validate parent exists if specified
        if node_data.parent_node_id:
            parent = self.get_node(node_data.parent_node_id)
            if not parent:
                raise ValueError("Invalid parent node")
            
            # Verify parent belongs to the same tree
            tree_uuid = UUID(tree_id) if isinstance(tree_id, str) else tree_id
            if parent.tree_id != tree_uuid:
                raise ValueError("Parent node belongs to different tree")
        
        node = TreeNode(
            tree_id=UUID(tree_id) if isinstance(tree_id, str) else tree_id,
            parent_node_id=UUID(node_data.parent_node_id) if node_data.parent_node_id else None,
            node_type=node_data.node_type.value if hasattr(node_data.node_type, 'value') else node_data.node_type,
            name=node_data.name,
            description=node_data.description,
            probability=node_data.probability,
            cost=node_data.cost or 0.0,
            utility=node_data.utility,
            position_x=node_data.position_x or 0,
            position_y=node_data.position_y or 0,
            node_metadata=node_data.node_metadata or {}
        )
        
        # Validate the node
        errors = node.validate_node()
        if errors:
            raise ValueError("; ".join(errors))
        
        self.db.add(node)
        self.db.commit()
        self.db.refresh(node)
        return node
    
    def update_node(self, node_id: str, node_data: CreateNodeRequest) -> Optional[TreeNode]:
        """Update a tree node using CreateNodeRequest (for consistency with API)"""
        node = self.get_node(node_id)
        if not node:
            return None
        
        # Update all provided fields
        node.name = node_data.name
        node.node_type = node_data.node_type.value if hasattr(node_data.node_type, 'value') else node_data.node_type
        node.description = node_data.description
        node.probability = node_data.probability
        node.cost = node_data.cost or 0.0
        node.utility = node_data.utility
        
        if hasattr(node_data, 'position_x') and node_data.position_x is not None:
            node.position_x = node_data.position_x
        if hasattr(node_data, 'position_y') and node_data.position_y is not None:
            node.position_y = node_data.position_y
        if hasattr(node_data, 'node_metadata') and node_data.node_metadata is not None:
            node.node_metadata = node_data.node_metadata
        
        # Validate updated node
        errors = node.validate_node()
        if errors:
            raise ValueError("; ".join(errors))
        
        self.db.commit()
        self.db.refresh(node)
        return node
    
    def delete_node(self, node_id: str) -> bool:
        """Delete a tree node and all its descendants"""
        node = self.get_node(node_id)
        if not node:
            return False
        
        # Get all descendant nodes recursively
        def get_descendants(check_node_id: UUID) -> List[UUID]:
            children = self.db.query(TreeNode).filter(TreeNode.parent_node_id == check_node_id).all()
            descendants = [child.id for child in children]
            for child in children:
                descendants.extend(get_descendants(child.id))
            return descendants
        
        descendant_ids = get_descendants(node.id)
        
        # Delete all descendants first
        if descendant_ids:
            self.db.query(TreeNode).filter(TreeNode.id.in_(descendant_ids)).delete(synchronize_session=False)
        
        # Delete the node itself
        self.db.delete(node)
        self.db.commit()
        return True
    
    def move_node(self, node_id: str, new_parent_id: Optional[str], position_x: int, position_y: int) -> Optional[TreeNode]:
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
                if current_parent.id == node.id:
                    raise ValueError("Cannot move node - would create circular reference")
                # Get parent through query to avoid session issues
                if current_parent.parent_node_id:
                    current_parent = self.get_node(str(current_parent.parent_node_id))
                else:
                    break
        
        node.parent_node_id = UUID(new_parent_id) if new_parent_id else None
        node.position_x = position_x
        node.position_y = position_y
        
        self.db.commit()
        self.db.refresh(node)
        return node