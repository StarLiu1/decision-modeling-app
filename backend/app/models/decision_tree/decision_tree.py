# backend/app/models/decision_tree.py
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any

Base = declarative_base()

class NodeType(str, Enum):
    DECISION = "decision"
    CHANCE = "chance" 
    TERMINAL = "terminal"

class DecisionTree(Base):
    """Main decision tree model"""
    __tablename__ = "decision_trees"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True))  # Will link to User model later
    is_template = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    
    # Relationships
    nodes = relationship("TreeNode", back_populates="tree", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "is_template": self.is_template,
            "is_public": self.is_public,
            "node_count": len(self.nodes) if self.nodes else 0
        }
    
    def get_tree_structure(self) -> Dict[str, Any]:
        """Get complete tree structure with all nodes"""
        root_nodes = [node for node in self.nodes if node.parent_node_id is None]
        
        def build_node_tree(node: 'TreeNode') -> Dict[str, Any]:
            children = [child for child in self.nodes if child.parent_node_id == node.id]
            return {
                **node.to_dict(),
                "children": [build_node_tree(child) for child in children]
            }
        
        return {
            **self.to_dict(),
            "nodes": [build_node_tree(root) for root in root_nodes]
        }

class TreeNode(Base):
    """Individual nodes in the decision tree"""
    __tablename__ = "tree_nodes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tree_id = Column(UUID(as_uuid=True), ForeignKey("decision_trees.id"), nullable=False)
    parent_node_id = Column(UUID(as_uuid=True), ForeignKey("tree_nodes.id"))
    
    # Node properties
    node_type = Column(String(50), nullable=False)  # decision, chance, terminal
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Decision modeling properties
    probability = Column(Float)  # For chance nodes
    cost = Column(Float, default=0.0)
    utility = Column(Float)  # For terminal nodes
    
    # UI positioning
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    
    # Additional node_metadata
    node_metadata = Column(JSON)  # Flexible storage for node-specific data
    
    # Relationships
    tree = relationship("DecisionTree", back_populates="nodes")
    parent = relationship("TreeNode", remote_side=[id])
    children = relationship("TreeNode")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "id": str(self.id),
            "tree_id": str(self.tree_id),
            "parent_node_id": str(self.parent_node_id) if self.parent_node_id else None,
            "node_type": self.node_type,
            "name": self.name,
            "description": self.description,
            "probability": self.probability,
            "cost": self.cost,
            "utility": self.utility,
            "position_x": self.position_x,
            "position_y": self.position_y,
            "node_metadata": self.node_metadata or {}
        }
    
    def validate_node(self) -> List[str]:
        """Validate node data based on type"""
        errors = []
        
        if self.node_type == NodeType.CHANCE:
            if self.probability is None or not (0 <= self.probability <= 1):
                errors.append("Chance nodes must have probability between 0 and 1")
                
        elif self.node_type == NodeType.TERMINAL:
            if self.utility is None:
                errors.append("Terminal nodes must have a utility value")
                
        elif self.node_type == NodeType.DECISION:
            # Decision nodes just need children
            pass
            
        return errors