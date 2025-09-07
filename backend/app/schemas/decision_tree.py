# backend/app/schemas/decision_tree.py
from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum

class NodeType(str, Enum):
    DECISION = "decision"
    CHANCE = "chance"
    TERMINAL = "terminal"

class TreeNodeBase(BaseModel):
    """Base schema for tree nodes"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    node_type: NodeType
    probability: Optional[float] = Field(None, ge=0, le=1)
    cost: float = Field(default=0.0)
    utility: Optional[float] = None
    position_x: int = Field(default=0)
    position_y: int = Field(default=0)
    node_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class CreateNodeRequest(BaseModel):
    """Schema for creating a new node"""
    name: str = Field(..., min_length=1, max_length=255, description="Node name")
    node_type: str = Field(..., pattern="^(decision|chance|terminal)$", description="Node type")
    parent_node_id: Optional[str] = Field(None, description="Parent node ID")
    probability: Optional[float] = Field(None, ge=0, le=1, description="Probability (0-1)")
    cost: Optional[float] = Field(None, description="Cost value")
    utility: Optional[float] = Field(None, description="Utility value")
    
    @validator('probability')
    def validate_probability(cls, v, values):
        if values.get('node_type') == NodeType.CHANCE and v is None:
            raise ValueError('Chance nodes must have a probability')
        return v
    
    @validator('utility')
    def validate_utility(cls, v, values):
        if values.get('node_type') == NodeType.TERMINAL and v is None:
            raise ValueError('Terminal nodes must have a utility value')
        return v

class TreeNodeUpdate(BaseModel):
    """Schema for updating a node"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    probability: Optional[float] = Field(None, ge=0, le=1)
    cost: Optional[float] = None
    utility: Optional[float] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    node_metadata: Optional[Dict[str, Any]] = None

class TreeNodeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    # Fix: Change id to handle UUID properly
    id: str = Field(..., description="Node ID")
    name: str = Field(..., description="Node name")
    node_type: str = Field(..., description="Node type: decision, chance, or terminal")
    parent_node_id: Optional[str] = Field(None, description="Parent node ID")
    probability: Optional[float] = Field(None, description="Probability for chance nodes")
    cost: Optional[float] = Field(None, description="Cost value")
    utility: Optional[float] = Field(None, description="Utility value")
    position_x: Optional[int] = Field(None, description="X coordinate for positioning")
    position_y: Optional[int] = Field(None, description="Y coordinate for positioning")
    node_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional node node_metadata")
    
    @classmethod
    def from_orm(cls, node: Any) -> "TreeNodeResponse":
        """Convert SQLAlchemy model to Pydantic model with proper UUID handling"""
        return cls(
            id=str(node.id),  # Convert UUID to string
            name=node.name,
            node_type=node.node_type,
            parent_node_id=str(node.parent_node_id) if node.parent_node_id else None,
            probability=node.probability,
            cost=node.cost,
            utility=node.utility,
            position_x=node.position_x,
            position_y=node.position_y,
            node_metadata=node.node_metadata
        )

class DecisionTreeBase(BaseModel):
    """Base schema for decision trees"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_template: bool = Field(default=False)
    is_public: bool = Field(default=False)

class CreateTreeRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Tree name")
    description: Optional[str] = Field(None, description="Tree description")
    root_node: Optional[CreateNodeRequest] = Field(None, description="Initial root node")

class DecisionTreeUpdate(BaseModel):
    """Schema for updating a decision tree"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_template: Optional[bool] = None
    is_public: Optional[bool] = None

class DecisionTreeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    # Fix: Change id to accept UUID type and convert to string
    id: str = Field(..., description="Tree ID")
    name: str = Field(..., description="Tree name")
    description: Optional[str] = Field(None, description="Tree description")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    # Fix: Add node_count field that was missing
    node_count: int = Field(0, description="Number of nodes in the tree")
    
    # Add nodes field for detailed tree responses
    nodes: Optional[List["TreeNodeResponse"]] = Field(None, description="Tree nodes")
    
    @classmethod
    def from_orm(cls, tree: Any) -> "DecisionTreeResponse":
        """Convert SQLAlchemy model to Pydantic model with proper UUID handling"""
        return cls(
            id=str(tree.id),  # Convert UUID to string
            name=tree.name,
            description=tree.description,
            created_at=tree.created_at,
            updated_at=tree.updated_at,
            node_count=len(tree.nodes) if tree.nodes else 0,  # Calculate node count
            nodes=[TreeNodeResponse.from_orm(node) for node in tree.nodes] if tree.nodes else []
        )

class DecisionTreeDetailResponse(DecisionTreeResponse):
    """Detailed tree response with full node structure"""
    nodes: List[TreeNodeResponse] = Field(default_factory=list)

# Update forward references
TreeNodeResponse.model_rebuild()