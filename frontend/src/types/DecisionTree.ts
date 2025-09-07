export enum NodeType {
  DECISION = 'decision',
  CHANCE = 'chance',
  TERMINAL = 'terminal'
}

export interface TreeNode {
  id: string;
  tree_id: string;
  parent_node_id?: string;
  node_type: NodeType;
  name: string;
  description?: string;
  probability?: number;
  cost: number;
  utility?: number;
  position_x: number;
  position_y: number;
  node_metadata?: Record<string, any>;
  children?: TreeNode[];
}

export interface DecisionTree {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_template: boolean;
  is_public: boolean;
  node_count: number;
  nodes?: TreeNode[];
}

export interface CreateTreeRequest {
  name: string;
  description?: string;
  is_template?: boolean;
  is_public?: boolean;
  root_node?: {
    name: string;
    node_type: NodeType;
    description?: string;
    position_x?: number;
    position_y?: number;
  };
}

export interface CreateNodeRequest {
  name: string;
  node_type: NodeType;
  parent_node_id?: string;
  description?: string;
  probability?: number;
  cost?: number;
  utility?: number;
  position_x?: number;
  position_y?: number;
  node_metadata?: Record<string, any>;
}
