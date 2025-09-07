// Enhanced NodeEditModal.tsx - Fixed for proper node type handling
import React, { useState, useEffect } from 'react';
import { TreeNode, CreateNodeRequest, NodeType } from '../../types/DecisionTree';

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
    node_type: NodeType.DECISION,
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
          node_type: editingNode.node_type,
          parent_node_id: editingNode.parent_node_id || undefined,
          probability: editingNode.probability || undefined,
          cost: editingNode.cost || undefined,
          utility: editingNode.utility || undefined,
        });
      } else {
        // Creating new node - determine appropriate default type based on parent
        let defaultType: NodeType = NodeType.DECISION;
        
        if (selectedParentNode) {
          // If parent is decision or chance, default to chance node
          if (selectedParentNode.node_type === NodeType.DECISION || selectedParentNode.node_type === NodeType.CHANCE) {
            defaultType = NodeType.CHANCE;
          }
        }
        
        setFormData({
          name: '',
          node_type: defaultType,
          parent_node_id: selectedParentNode?.id,
          probability: defaultType === NodeType.CHANCE ? 0.5 : undefined, // Default probability for chance nodes
          cost: 0,
          utility: undefined, // Will be set to 0 if user selects terminal type
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

    // Validate based on node type
    if (formData.node_type === NodeType.CHANCE) {
      if (formData.probability === undefined || formData.probability === null) {
        newErrors.probability = 'Probability is required for chance nodes';
      } else if (formData.probability < 0 || formData.probability > 1) {
        newErrors.probability = 'Probability must be between 0 and 1';
      }
    }

    if (formData.node_type === NodeType.TERMINAL) {
      if (formData.utility === undefined || formData.utility === null) {
        newErrors.utility = 'Utility is required for terminal nodes';
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
      // Clean up data based on node type
      const cleanedData: CreateNodeRequest = {
        name: formData.name,
        node_type: formData.node_type,
        parent_node_id: formData.parent_node_id,
        cost: formData.cost || 0,
      };

      // Only include probability for chance nodes
      if (formData.node_type === NodeType.CHANCE) {
        cleanedData.probability = formData.probability;
      }

      // Only include utility for terminal nodes
      if (formData.node_type === NodeType.TERMINAL) {
        cleanedData.utility = formData.utility;
      }

      await onSave(cleanedData);
      onClose();
    } catch (error) {
      console.error('Failed to save node:', error);
      setErrors({ general: 'Failed to save node. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeTypeChange = (newType: NodeType) => {
    setFormData(prev => {
      const updated = { ...prev, node_type: newType };
      
      // Set appropriate defaults when changing type
      if (newType === NodeType.CHANCE && (prev.probability === undefined || prev.probability === null)) {
        updated.probability = 0.5; // Default probability
      } else if (newType !== NodeType.CHANCE) {
        updated.probability = undefined; // Clear probability for non-chance nodes
      }
      
      if (newType === NodeType.TERMINAL && (prev.utility === undefined || prev.utility === null)) {
        updated.utility = 0; // Default utility
      } else if (newType !== NodeType.TERMINAL) {
        updated.utility = undefined; // Clear utility for non-terminal nodes
      }
      
      return updated;
    });
  };

  const getNodeTypeInfo = (type: NodeType) => {
    switch (type) {
      case NodeType.DECISION:
        return {
          icon: '□',
          color: 'text-blue-600',
          description: 'A choice point where you decide between options',
          properties: 'No probability or utility required'
        };
      case NodeType.CHANCE:
        return {
          icon: '○',
          color: 'text-red-600',
          description: 'An uncertain event with a probability',
          properties: 'Requires probability (0.0 to 1.0)'
        };
      case NodeType.TERMINAL:
        return {
          icon: '◊',
          color: 'text-green-600',
          description: 'An endpoint with a final outcome',
          properties: 'Requires utility/value, cannot have children'
        };
      default:
        return { icon: '?', color: 'text-gray-600', description: 'Unknown node type', properties: '' };
    }
  };

  // Get valid child types for the parent node
  const getValidChildTypes = (): NodeType[] => {
    if (!selectedParentNode || editingNode) {
      return [NodeType.DECISION, NodeType.CHANCE, NodeType.TERMINAL]; // Allow all types when editing or no parent
    }
    
    switch (selectedParentNode.node_type) {
      case NodeType.DECISION:
        return [NodeType.CHANCE, NodeType.TERMINAL];
      case NodeType.CHANCE:
        return [NodeType.CHANCE, NodeType.TERMINAL];
      case NodeType.TERMINAL:
        return []; // Terminal nodes cannot have children
      default:
        return [NodeType.DECISION, NodeType.CHANCE, NodeType.TERMINAL];
    }
  };

  if (!isOpen) return null;

  const isEditing = !!editingNode;
  const nodeTypeInfo = getNodeTypeInfo(formData.node_type as NodeType);
  const validChildTypes = getValidChildTypes();

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
                <span className="text-xs block mt-1">
                  Can add: {validChildTypes.join(', ')} nodes
                </span>
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
              {([NodeType.DECISION, NodeType.CHANCE, NodeType.TERMINAL] as const)
                .filter(type => isEditing || validChildTypes.includes(type) || validChildTypes.length === 0)
                .map((type) => {
                const info = getNodeTypeInfo(type);
                const isDisabled = !isEditing && validChildTypes.length > 0 && !validChildTypes.includes(type);
                
                return (
                  <label key={type} className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                    isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="node_type"
                      value={type}
                      checked={formData.node_type === type}
                      onChange={(e) => handleNodeTypeChange(e.target.value as NodeType)}
                      disabled={isDisabled}
                      className="mr-3"
                    />
                    <span className={`text-lg mr-2 ${info.color}`}>{info.icon}</span>
                    <div>
                      <div className="font-medium capitalize">{type}</div>
                      <div className="text-sm text-gray-500">{info.description}</div>
                      <div className="text-xs text-gray-400">{info.properties}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Probability (only for chance nodes) */}
          {formData.node_type === NodeType.CHANCE && (
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

          {/* Utility (only for terminal nodes) */}
          {formData.node_type === NodeType.TERMINAL && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utility/Value *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.utility || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  utility: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.utility ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1000.00"
              />
              {errors.utility && <p className="text-red-500 text-xs mt-1">{errors.utility}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Expected value or utility of this outcome
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
              placeholder="0.00"
            />
            {errors.cost && <p className="text-red-500 text-xs mt-1">{errors.cost}</p>}
            <p className="text-xs text-gray-500 mt-1">
              Cost associated with this choice or outcome
            </p>
          </div>

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
                : 'bg-blue-600 hover:bg-blue-700'
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