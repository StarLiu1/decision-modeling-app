// Fixed frontend/src/types/DecisionTree.ts - Aligned with backend schemas
export enum NodeType {
  DECISION = 'decision',
  CHANCE = 'chance',
  TERMINAL = 'terminal'
}

export interface TreeNode {
  id: string;
  tree_id: string;
  parent_node_id?: string | null;
  node_type: 'decision' | 'chance' | 'terminal'; // Use string literal type for consistency
  name: string;
  description?: string | null;
  probability?: number | null; // For chance nodes (0.0 to 1.0)
  cost?: number | null; // Cost associated with this node
  utility?: number | null; // For terminal nodes (final value/utility)
  position_x?: number | null; // X coordinate for UI positioning
  position_y?: number | null; // Y coordinate for UI positioning
  node_metadata?: Record<string, any> | null; // Additional metadata
  children?: TreeNode[]; // For hierarchical tree representation
}

export interface DecisionTree {
  id: string;
  name: string;
  description?: string | null;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  is_template?: boolean;
  is_public?: boolean;
  node_count: number; // Number of nodes in the tree
  nodes?: TreeNode[]; // Tree nodes (included in detailed responses)
}

export interface CreateTreeRequest {
  name: string;
  description?: string;
  is_template?: boolean;
  is_public?: boolean;
  root_node?: CreateRootNodeRequest;
}

export interface CreateRootNodeRequest {
  name: string;
  node_type: NodeType;
  description?: string;
  probability?: number; // Required for chance nodes (0.0 to 1.0)
  utility?: number; // Required for terminal nodes
  position_x?: number;
  position_y?: number;
}

export interface CreateNodeRequest {
  name: string;
  node_type: NodeType | string; // Allow both enum and string for flexibility
  parent_node_id?: string;
  description?: string;
  probability?: number; // Required for chance nodes (0.0 to 1.0)
  cost?: number; // Optional cost value
  utility?: number; // Required for terminal nodes
  position_x?: number;
  position_y?: number;
  node_metadata?: Record<string, any>;
}

export interface UpdateTreeRequest {
  name?: string;
  description?: string;
  is_template?: boolean;
  is_public?: boolean;
}

export interface UpdateNodeRequest {
  name?: string;
  node_type?: NodeType | string;
  description?: string;
  probability?: number;
  cost?: number;
  utility?: number;
  position_x?: number;
  position_y?: number;
  node_metadata?: Record<string, any>;
}

// Analysis types
export interface ExpectedValueResult {
  root_expected_value: number;
  node_expected_values: Record<string, number>; // node_id -> expected_value
  analysis_complete: boolean;
  calculation_method?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[]; // List of validation errors
  warnings?: string[]; // List of validation warnings
  node_count: number;
  root_count: number;
}

// Tree structure types for hierarchical representation
export interface TreeStructure extends DecisionTree {
  nodes: TreeNodeHierarchy[];
}

export interface TreeNodeHierarchy extends TreeNode {
  children: TreeNodeHierarchy[];
}

// API Response types (for when backend returns different structure)
export interface ApiDecisionTreeResponse {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  is_template: boolean;
  is_public: boolean;
  node_count: number;
  nodes?: ApiTreeNodeResponse[];
}

export interface ApiTreeNodeResponse {
  id: string;
  tree_id: string;
  parent_node_id?: string | null;
  node_type: string;
  name: string;
  description?: string | null;
  probability?: number | null;
  cost?: number | null;
  utility?: number | null;
  position_x?: number | null;
  position_y?: number | null;
  node_metadata?: Record<string, any> | null;
}

// Utility types for frontend components
export interface TreeListItem {
  id: string;
  name: string;
  description?: string;
  node_count: number;
  updated_at: string;
  is_template: boolean;
}

export interface NodeFormData {
  name: string;
  node_type: NodeType;
  probability?: number;
  cost?: number;
  utility?: number;
  description?: string;
}

// Constants for validation
export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  [NodeType.DECISION]: 'Decision',
  [NodeType.CHANCE]: 'Chance',
  [NodeType.TERMINAL]: 'Terminal'
};

export const NODE_TYPE_DESCRIPTIONS: Record<NodeType, string> = {
  [NodeType.DECISION]: 'A choice point where you decide between options',
  [NodeType.CHANCE]: 'An uncertain event with a probability',
  [NodeType.TERMINAL]: 'An endpoint with a final outcome'
};

// Type guards for runtime type checking
export const isDecisionNode = (node: TreeNode): boolean => {
  return node.node_type === 'decision';
};

export const isChanceNode = (node: TreeNode): boolean => {
  return node.node_type === 'chance';
};

export const isTerminalNode = (node: TreeNode): boolean => {
  return node.node_type === 'terminal';
};

// Validation helpers
export const validateNodeForType = (node: Partial<TreeNode>): string[] => {
  const errors: string[] = [];

  if (!node.name || node.name.trim().length === 0) {
    errors.push('Node name is required');
  }

  if (!node.node_type) {
    errors.push('Node type is required');
    return errors; // Can't validate further without type
  }

  switch (node.node_type) {
    case 'chance':
      if (node.probability === undefined || node.probability === null) {
        errors.push('Chance nodes must have a probability value');
      } else if (node.probability < 0 || node.probability > 1) {
        errors.push('Probability must be between 0 and 1');
      }
      break;

    case 'terminal':
      if (node.utility === undefined || node.utility === null) {
        errors.push('Terminal nodes must have a utility value');
      }
      break;

    case 'decision':
      // Decision nodes don't require special validation
      break;

    default:
      errors.push(`Invalid node type: ${node.node_type}`);
  }

  if (node.cost !== undefined && node.cost !== null && node.cost < 0) {
    errors.push('Cost cannot be negative');
  }

  return errors;
};

// Helper functions for tree manipulation
export const findNodeById = (nodes: TreeNode[], nodeId: string): TreeNode | undefined => {
  return nodes.find(node => node.id === nodeId);
};

export const getNodeChildren = (nodes: TreeNode[], parentId: string): TreeNode[] => {
  return nodes.filter(node => node.parent_node_id === parentId);
};

export const getRootNodes = (nodes: TreeNode[]): TreeNode[] => {
  return nodes.filter(node => !node.parent_node_id);
};

export const buildTreeHierarchy = (nodes: TreeNode[]): TreeNodeHierarchy[] => {
  const nodeMap = new Map<string, TreeNodeHierarchy>();
  
  // Create map of all nodes
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });
  
  const rootNodes: TreeNodeHierarchy[] = [];
  
  // Build hierarchy
  nodes.forEach(node => {
    const hierarchyNode = nodeMap.get(node.id)!;
    
    if (node.parent_node_id) {
      const parent = nodeMap.get(node.parent_node_id);
      if (parent) {
        parent.children.push(hierarchyNode);
      }
    } else {
      rootNodes.push(hierarchyNode);
    }
  });
  
  return rootNodes;
};

// Default values for new nodes
export const getDefaultNodeData = (nodeType: NodeType): Partial<CreateNodeRequest> => {
  const base = {
    name: '',
    node_type: nodeType,
    cost: 0,
    position_x: 0,
    position_y: 0,
    node_metadata: {}
  };

  switch (nodeType) {
    case NodeType.CHANCE:
      return { ...base, probability: 0.5 };
    case NodeType.TERMINAL:
      return { ...base, utility: 0 };
    case NodeType.DECISION:
    default:
      return base;
  }
};