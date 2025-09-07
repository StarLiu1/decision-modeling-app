import { NodeType, TreeNode, DecisionTree, CreateTreeRequest, CreateNodeRequest } from '../types/DecisionTree';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// frontend/src/types/DecisionTree.ts

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Decision Tree API methods
  async getTrees(): Promise<DecisionTree[]> {
    return this.request<DecisionTree[]>('/trees');
  }

  async getTree(treeId: string): Promise<DecisionTree> {
    return this.request<DecisionTree>(`/trees/${treeId}`);
  }

  async createTree(data: CreateTreeRequest): Promise<DecisionTree> {
    return this.request<DecisionTree>('/trees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTree(treeId: string, data: Partial<CreateTreeRequest>): Promise<DecisionTree> {
    return this.request<DecisionTree>(`/trees/${treeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTree(treeId: string): Promise<void> {
    return this.request<void>(`/trees/${treeId}`, {
      method: 'DELETE',
    });
  }

  async duplicateTree(treeId: string, newName: string): Promise<DecisionTree> {
    return this.request<DecisionTree>(`/trees/${treeId}/duplicate?new_name=${encodeURIComponent(newName)}`, {
      method: 'POST',
    });
  }

  // Node API methods
  async createNode(treeId: string, data: CreateNodeRequest): Promise<TreeNode> {
    return this.request<TreeNode>(`/trees/${treeId}/nodes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNode(treeId: string, nodeId: string, data: Partial<CreateNodeRequest>): Promise<TreeNode> {
    return this.request<TreeNode>(`/trees/${treeId}/nodes/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNode(treeId: string, nodeId: string): Promise<void> {
    return this.request<void>(`/trees/${treeId}/nodes/${nodeId}`, {
      method: 'DELETE',
    });
  }

  async moveNode(treeId: string, nodeId: string, newParentId?: string, positionX?: number, positionY?: number): Promise<TreeNode> {
    const params = new URLSearchParams();
    if (newParentId) params.append('new_parent_id', newParentId);
    if (positionX !== undefined) params.append('position_x', positionX.toString());
    if (positionY !== undefined) params.append('position_y', positionY.toString());
    
    return this.request<TreeNode>(`/trees/${treeId}/nodes/${nodeId}/move?${params}`, {
      method: 'PATCH',
    });
  }

  // Analysis API methods
  async getExpectedValue(treeId: string): Promise<any> {
    return this.request<any>(`/trees/${treeId}/analysis/expected-value`);
  }

  async validateTree(treeId: string): Promise<any> {
    return this.request<any>(`/trees/${treeId}/validation`);
  }
}

export const apiService = new ApiService();