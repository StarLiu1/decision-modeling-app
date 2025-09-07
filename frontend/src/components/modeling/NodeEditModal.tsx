// Enhanced NodeEditModal.tsx
import React, { useState, useEffect } from 'react';
import { TreeNode } from '../../types/DecisionTree';

interface CreateNodeRequest {
  name: string;
  node_type: 'decision' | 'chance' | 'terminal';
  parent_node_id?: string;
  probability?: number;
  cost?: number;
  utility?: number;
}

interface NodeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateNodeRequest) => Promise<void>;
  selectedParentNode?: TreeNode | null;
  editingNode?: TreeNode | null;
}

const NodeEditModal: React.FC<NodeEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedParentNode,
  editingNode,
}) => {
  const [formData, setFormData] = useState<CreateNodeRequest>({
    name: '',
    node_type: 'decision',
    parent_node_id: undefined,
    probability: undefined,
    cost: undefined,
    utility: undefined,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingNode) {
        // Editing existing node
        setFormData({
          name: editingNode.name,
          node_type: editingNode.node_type as 'decision' | 'chance' | 'terminal',
          parent_node_id: editingNode.parent_node_id || undefined,
          probability: editingNode.probability || undefined,
          cost: editingNode.cost || undefined,
          utility: editingNode.utility || undefined,
        });
      } else {
        // Creating new node
        setFormData({
          name: '',
          node_type: 'decision',
          parent_node_id: selectedParentNode?.id,
          probability: undefined,
          cost: undefined,
          utility: undefined,
        });
      }
      setErrors({});
    }
  }, [isOpen, editingNode, selectedParentNode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Node name is required';
    }

    if (formData.node_type === 'chance') {
      if (formData.probability === undefined || formData.probability === null) {
        newErrors.probability = 'Probability is required for chance nodes';
      } else if (formData.probability < 0 || formData.probability > 1) {
        newErrors.probability = 'Probability must be between 0 and 1';
      }
    }

    if (formData.cost !== undefined && formData.cost < 0) {
      newErrors.cost = 'Cost cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save node:', error);
      setErrors({ general: 'Failed to save node. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getNodeTypeInfo = (type: string) => {
    switch (type) {
      case 'decision':
        return {
          icon: '□',
          color: 'text-blue-600',
          description: 'A choice point where you decide between options'
        };
      case 'chance':
        return {
          icon: '○',
          color: 'text-red-600',
          description: 'An uncertain event with a probability'
        };
      case 'terminal':
        return {
          icon: '◊',
          color: 'text-green-600',
          description: 'An endpoint with a final outcome'
        };
      default:
        return { icon: '?', color: 'text-gray-600', description: 'Unknown node type' };
    }
  };

  if (!isOpen) return null;

  const isEditing = !!editingNode;
  const nodeTypeInfo = getNodeTypeInfo(formData.node_type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEditing ? 'Edit Node' : 'Create New Node'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Parent Context */}
          {selectedParentNode && !isEditing && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Adding child node to: <span className="font-medium">{selectedParentNode.name}</span>
              </p>
            </div>
          )}

          {/* Node Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Node Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter node name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Node Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Node Type *
            </label>
            <div className="space-y-2">
              {(['decision', 'chance', 'terminal'] as const).map((type) => {
                const info = getNodeTypeInfo(type);
                return (
                  <label key={type} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="node_type"
                      value={type}
                      checked={formData.node_type === type}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        node_type: e.target.value as 'decision' | 'chance' | 'terminal',
                        // Clear probability if switching away from chance
                        probability: e.target.value === 'chance' ? formData.probability : undefined
                      })}
                      className="mr-3"
                    />
                    <span className={`text-lg mr-2 ${info.color}`}>{info.icon}</span>
                    <div>
                      <div className="font-medium capitalize">{type}</div>
                      <div className="text-sm text-gray-500">{info.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Probability (for chance nodes) */}
          {formData.node_type === 'chance' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Probability * (0.0 to 1.0)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.probability || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  probability: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.probability ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.50"
              />
              {errors.probability && <p className="text-red-500 text-xs mt-1">{errors.probability}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Example: 0.7 = 70% chance, 0.3 = 30% chance
              </p>
            </div>
          )}

          {/* Cost (optional for all nodes) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost (optional)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                cost: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
              className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.cost ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="100.00"
            />
            {errors.cost && <p className="text-red-500 text-xs mt-1">{errors.cost}</p>}
          </div>

          {/* Utility (mainly for terminal nodes) */}
          {(formData.node_type === 'terminal' || formData.utility !== undefined) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utility/Value (optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.utility || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  utility: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="1000.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Expected value or utility of this outcome
              </p>
            </div>
          )}

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className={`px-4 py-2 text-white rounded-md focus:ring-2 focus:ring-blue-500 ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : `bg-${nodeTypeInfo.color.includes('blue') ? 'blue' : nodeTypeInfo.color.includes('red') ? 'red' : 'green'}-600 hover:bg-${nodeTypeInfo.color.includes('blue') ? 'blue' : nodeTypeInfo.color.includes('red') ? 'red' : 'green'}-700`
            }`}
          >
            {isLoading ? 'Saving...' : (isEditing ? 'Update Node' : 'Create Node')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeEditModal;