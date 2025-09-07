# Fixed backend/app/schemas/decision_tree.py
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
    cost: Optional[float] = Field(default=0.0)
    utility: Optional[float] = None
    position_x: Optional[int] = Field(default=0)
    position_y: Optional[int] = Field(default=0)
    node_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class CreateNodeRequest(BaseModel):
    """Schema for creating a new node"""
    name: str = Field(..., min_length=1, max_length=255, description="Node name")
    node_type: NodeType = Field(..., description="Node type")
    parent_node_id: Optional[str] = Field(None, description="Parent node ID")
    description: Optional[str] = Field(None, description="Node description")
    probability: Optional[float] = Field(None, ge=0, le=1, description="Probability (0-1)")
    cost: Optional[float] = Field(0.0, description="Cost value")
    utility: Optional[float] = Field(None, description="Utility value")
    position_x: Optional[int] = Field(0, description="X coordinate")
    position_y: Optional[int] = Field(0, description="Y coordinate")
    node_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    
    @validator('probability')
    def validate_probability(cls, v, values):
        if values.get('node_type') == NodeType.CHANCE and v is None:
            raise ValueError('Chance nodes must have a probability')
        if v is not None and (v < 0 or v > 1):
            raise ValueError('Probability must be between 0 and 1')
        return v
    
    @validator('utility')
    def validate_utility(cls, v, values):
        if values.get('node_type') == NodeType.TERMINAL and v is None:
            raise ValueError('Terminal nodes must have a utility value')
        return v

    @validator('cost')
    def validate_cost(cls, v):
        if v is not None and v < 0:
            raise ValueError('Cost cannot be negative')
        return v

class TreeNodeUpdate(BaseModel):
    """Schema for updating a node"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    node_type: Optional[NodeType] = None
    probability: Optional[float] = Field(None, ge=0, le=1)
    cost: Optional[float] = None
    utility: Optional[float] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    node_metadata: Optional[Dict[str, Any]] = None

class TreeNodeResponse(BaseModel):
    """Response schema for tree nodes"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Node ID")
    tree_id: str = Field(..., description="Tree ID this node belongs to")
    name: str = Field(..., description="Node name")
    node_type: str = Field(..., description="Node type: decision, chance, or terminal")
    parent_node_id: Optional[str] = Field(None, description="Parent node ID")
    description: Optional[str] = Field(None, description="Node description")
    probability: Optional[float] = Field(None, description="Probability for chance nodes")
    cost: Optional[float] = Field(None, description="Cost value")
    utility: Optional[float] = Field(None, description="Utility value")
    position_x: Optional[int] = Field(None, description="X coordinate for positioning")
    position_y: Optional[int] = Field(None, description="Y coordinate for positioning")
    node_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional node metadata")
    
    @classmethod
    def from_orm(cls, node: Any) -> "TreeNodeResponse":
        """Convert SQLAlchemy model to Pydantic model with proper UUID handling"""
        return cls(
            id=str(node.id),
            tree_id=str(node.tree_id),
            name=node.name,
            node_type=node.node_type,
            parent_node_id=str(node.parent_node_id) if node.parent_node_id else None,
            description=node.description,
            probability=node.probability,
            cost=node.cost,
            utility=node.utility,
            position_x=node.position_x,
            position_y=node.position_y,
            node_metadata=node.node_metadata or {}
        )

class DecisionTreeBase(BaseModel):
    """Base schema for decision trees"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_template: Optional[bool] = Field(default=False)
    is_public: Optional[bool] = Field(default=False)

class CreateRootNodeRequest(BaseModel):
    """Schema for creating root node during tree creation"""
    name: str = Field(..., min_length=1, max_length=255, description="Root node name")
    node_type: NodeType = Field(..., description="Root node type")
    description: Optional[str] = Field(None, description="Root node description")
    probability: Optional[float] = Field(None, ge=0, le=1, description="Probability (for chance nodes)")
    utility: Optional[float] = Field(None, description="Utility (for terminal nodes)")
    position_x: Optional[int] = Field(100, description="X coordinate")
    position_y: Optional[int] = Field(100, description="Y coordinate")

    @validator('probability')
    def validate_probability_for_chance(cls, v, values):
        if values.get('node_type') == NodeType.CHANCE and v is None:
            raise ValueError('Chance nodes must have a probability')
        return v
    
    @validator('utility')
    def validate_utility_for_terminal(cls, v, values):
        if values.get('node_type') == NodeType.TERMINAL and v is None:
            raise ValueError('Terminal nodes must have a utility value')
        return v

class CreateTreeRequest(BaseModel):
    """Schema for creating a new decision tree"""
    name: str = Field(..., min_length=1, max_length=255, description="Tree name")
    description: Optional[str] = Field(None, description="Tree description")
    is_template: Optional[bool] = Field(False, description="Is this a template tree")
    is_public: Optional[bool] = Field(False, description="Is this tree public")
    root_node: Optional[CreateRootNodeRequest] = Field(None, description="Initial root node")

class DecisionTreeUpdate(BaseModel):
    """Schema for updating a decision tree"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_template: Optional[bool] = None
    is_public: Optional[bool] = None

class DecisionTreeResponse(BaseModel):
    """Response schema for decision trees"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Tree ID")
    name: str = Field(..., description="Tree name")
    description: Optional[str] = Field(None, description="Tree description")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    is_template: bool = Field(False, description="Is this a template tree")
    is_public: bool = Field(False, description="Is this tree public")
    node_count: int = Field(0, description="Number of nodes in the tree")
    nodes: Optional[List[TreeNodeResponse]] = Field(None, description="Tree nodes")
    
    @classmethod
    def from_orm(cls, tree: Any) -> "DecisionTreeResponse":
        """Convert SQLAlchemy model to Pydantic model with proper UUID handling"""
        nodes_list = []
        if hasattr(tree, 'nodes') and tree.nodes:
            nodes_list = [TreeNodeResponse.from_orm(node) for node in tree.nodes]
        
        return cls(
            id=str(tree.id),
            name=tree.name,
            description=tree.description,
            created_at=tree.created_at,
            updated_at=tree.updated_at,
            is_template=tree.is_template or False,
            is_public=tree.is_public or False,
            node_count=len(tree.nodes) if hasattr(tree, 'nodes') and tree.nodes else 0,
            nodes=nodes_list
        )

class DecisionTreeDetailResponse(DecisionTreeResponse):
    """Detailed tree response with full node structure"""
    nodes: List[TreeNodeResponse] = Field(default_factory=list)

# Analysis schemas
class ExpectedValueResult(BaseModel):
    """Schema for expected value analysis results"""
    root_expected_value: float
    node_expected_values: Dict[str, float]
    analysis_complete: bool
    calculation_method: str = "recursive"

class ValidationResult(BaseModel):
    """Schema for tree validation results"""
    valid: bool
    issues: List[str]
    warnings: Optional[List[str]] = None
    node_count: int
    root_count: int

# Update forward references
TreeNodeResponse.model_rebuild()
DecisionTreeResponse.model_rebuild()