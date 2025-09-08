# Corrected backend/app/schemas/decision_tree.py - Updated validation for proper decision tree structure
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
    cost: Optional[float] = Field(default=0.0, ge=0)
    utility: Optional[float] = None
    position_x: Optional[int] = Field(default=0)
    position_y: Optional[int] = Field(default=0)
    node_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class CreateNodeRequest(BaseModel):
    """Schema for creating a new node with context-aware validation"""
    name: str = Field(..., min_length=1, max_length=255, description="Node name")
    node_type: NodeType = Field(..., description="Node type")
    parent_node_id: Optional[str] = Field(None, description="Parent node ID")
    description: Optional[str] = Field(None, description="Node description")
    probability: Optional[float] = Field(None, ge=0, le=1, description="Probability (0-1)")
    cost: Optional[float] = Field(0.0, ge=0, description="Cost value (non-negative)")
    utility: Optional[float] = Field(None, description="Utility value")
    position_x: Optional[int] = Field(0, description="X coordinate")
    position_y: Optional[int] = Field(0, description="Y coordinate")
    node_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Node name cannot be empty')
        return v.strip()
    
    @validator('cost')
    def validate_cost(cls, v):
        if v is not None and v < 0:
            raise ValueError('Cost cannot be negative')
        return v
    
    # Note: Context-aware validation (based on parent type) should be done in the service layer
    # where we have access to the parent node information

class TreeNodeUpdate(BaseModel):
    """Schema for updating a node"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    node_type: Optional[NodeType] = None
    probability: Optional[float] = Field(None, ge=0, le=1)
    cost: Optional[float] = Field(None, ge=0)
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
    probability: Optional[float] = Field(None, description="Probability for chance calculations")
    cost: Optional[float] = Field(None, description="Cost value")
    utility: Optional[float] = Field(None, description="Utility value for terminal nodes")
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
    position_x: Optional[int] = Field(100, description="X coordinate")
    position_y: Optional[int] = Field(100, description="Y coordinate")

    @validator('node_type')
    def validate_root_node_type(cls, v):
        if v == NodeType.TERMINAL:
            raise ValueError('Root node should not be terminal (creates trivial tree)')
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
    breakdown: Optional[Dict[str, Any]] = None

class ValidationResult(BaseModel):
    """Schema for tree validation results"""
    valid: bool
    issues: List[str]
    warnings: Optional[List[str]] = None
    node_count: int
    root_count: int

# Context-aware validation helper functions
def validate_node_in_context(node_data: Dict[str, Any], parent_node: Optional[Dict[str, Any]] = None) -> List[str]:
    """
    Validate a node based on its type and parent context
    Returns list of validation errors
    """
    errors = []
    node_type = node_data.get('node_type')
    parent_type = parent_node.get('node_type') if parent_node else None
    
    if node_type == NodeType.TERMINAL:
        # Terminal nodes must have utility
        if node_data.get('utility') is None:
            errors.append('Terminal nodes must have a utility value')
        
        # Terminal nodes need probability if parent is chance node
        if parent_type == NodeType.CHANCE:
            if node_data.get('probability') is None:
                errors.append('Terminal node needs probability (child of chance node)')
            elif not (0 <= node_data.get('probability', 0) <= 1):
                errors.append('Probability must be between 0 and 1')
        elif node_data.get('probability') is not None:
            errors.append('Terminal node should not have probability (not child of chance node)')
    
    elif node_type == NodeType.CHANCE:
        # Chance nodes need probability if parent is another chance node
        if parent_type == NodeType.CHANCE:
            if node_data.get('probability') is None:
                errors.append('Chance node needs probability (child of chance node)')
            elif not (0 <= node_data.get('probability', 0) <= 1):
                errors.append('Probability must be between 0 and 1')
        elif parent_type == NodeType.DECISION:
            # Chance nodes under decision nodes don't need probability (they're choices)
            if node_data.get('probability') is not None:
                errors.append('Chance node should not have probability (represents a choice)')
        
        # Chance nodes should not have utility
        if node_data.get('utility') is not None:
            errors.append('Chance nodes should not have utility values')
    
    elif node_type == NodeType.DECISION:
        # Decision nodes should not have probability or utility
        if node_data.get('probability') is not None:
            errors.append('Decision nodes should not have probabilities')
        if node_data.get('utility') is not None:
            errors.append('Decision nodes should not have utility values')
    
    # Validate cost
    cost = node_data.get('cost')
    if cost is not None and cost < 0:
        errors.append('Cost cannot be negative')
    
    return errors

def validate_tree_structure(nodes: List[Dict[str, Any]]) -> ValidationResult:
    """
    Validate the entire tree structure for expected value calculation readiness
    """
    errors = []
    warnings = []
    
    if not nodes:
        return ValidationResult(
            valid=False,
            issues=["Tree has no nodes"],
            warnings=[],
            node_count=0,
            root_count=0
        )
    
    # Build parent-child relationships
    node_map = {node['id']: node for node in nodes}
    parent_map = {}
    for node in nodes:
        if node.get('parent_node_id'):
            parent_map[node['id']] = node_map.get(node['parent_node_id'])
    
    # Find root nodes
    root_nodes = [node for node in nodes if not node.get('parent_node_id')]
    
    if len(root_nodes) == 0:
        errors.append("Tree has no root node")
    elif len(root_nodes) > 1:
        warnings.append(f"Tree has {len(root_nodes)} root nodes (typically should have 1)")
    
    # Validate each node in context
    for node in nodes:
        parent = parent_map.get(node['id'])
        node_errors = validate_node_in_context(node, parent)
        errors.extend(node_errors)
        
        # Additional structural validations
        children = [child for child in nodes if child.get('parent_node_id') == node['id']]
        
        if node['node_type'] == NodeType.CHANCE and children:
            # Check probability sum for chance node children
            total_prob = sum(child.get('probability', 0) for child in children 
                           if child.get('probability') is not None)
            if len([c for c in children if c.get('probability') is not None]) > 0:
                if abs(total_prob - 1.0) > 0.001:
                    errors.append(f"Children of chance node '{node['name']}' have probabilities that sum to {total_prob:.3f}, should sum to 1.0")
    
    return ValidationResult(
        valid=len(errors) == 0,
        issues=errors,
        warnings=warnings,
        node_count=len(nodes),
        root_count=len(root_nodes)
    )

# Update forward references
TreeNodeResponse.model_rebuild()
DecisionTreeResponse.model_rebuild()