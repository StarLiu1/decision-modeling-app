// Fixed API service with proper endpoints and error handling
import { TreeNode, DecisionTree, CreateTreeRequest, CreateNodeRequest } from '../types/DecisionTree';

const API_BASE_URL = 'http://localhost:8000/api/v1';

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log(`API Request: ${options?.method || 'GET'} ${url}`);
    if (options?.body) {
      console.log('Request body:', options.body);
    }
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    console.log(`API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.detail || error.message || errorMessage;
      } catch {
        // If response isn't JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('API Response data:', data);
    return data;
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

  async moveNode(
    treeId: string, 
    nodeId: string, 
    newParentId?: string, 
    positionX?: number, 
    positionY?: number
  ): Promise<TreeNode> {
    const params = new URLSearchParams();
    if (newParentId) params.append('new_parent_id', newParentId);
    if (positionX !== undefined) params.append('position_x', positionX.toString());
    if (positionY !== undefined) params.append('position_y', positionY.toString());
    
    return this.request<TreeNode>(`/trees/${treeId}/nodes/${nodeId}/move?${params}`, {
      method: 'PATCH',
    });
  }

  // Analysis API methods - these endpoints might not exist yet in backend
  async getExpectedValue(treeId: string): Promise<any> {
    try {
      return this.request<any>(`/trees/${treeId}/analysis/expected-value`);
    } catch (error) {
      console.warn('Expected value endpoint not available, using client-side calculation');
      // Fallback: could implement client-side expected value calculation here
      throw new Error('Expected value analysis not available - implement client-side calculation');
    }
  }

  async validateTree(treeId: string): Promise<any> {
    try {
      return this.request<any>(`/trees/${treeId}/validation`);
    } catch (error) {
      console.warn('Tree validation endpoint not available, using client-side validation');
      // Fallback: could implement client-side validation here
      throw new Error('Tree validation not available - implement client-side validation');
    }
  }

  // Health check method
  async healthCheck(): Promise<any> {
    return this.request<any>('/../../health'); // Goes to /health endpoint
  }

  // Test connection method
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();