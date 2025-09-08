// Fixed NodeEditModal.tsx - Clearer decision tree structure logic
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

  // CLEARER: Helper to determine node context and requirements
  const getNodeContext = (nodeType: string, parentType?: string) => {
    if (nodeType === 'terminal') {
      return {
        needsProbability: false,
        needsUtility: true,
        context: 'Final outcome',
        description: 'An endpoint with a final utility value',
        probabilityNote: 'Terminal nodes never have probabilities (they come from parent chance nodes)',
        utilityNote: 'Required - the final payoff or value of this outcome'
      };
    }
    
    if (nodeType === 'chance') {
      if (parentType === 'decision') {
        return {
          needsProbability: false,
          needsUtility: false,
          context: 'Choice option',
          description: 'A choice available to the decision maker',
          probabilityNote: 'Choice options do not have probabilities - they represent available alternatives',
          utilityNote: 'Not needed - choices lead to uncertain events or outcomes'
        };
      } else {
        return {
          needsProbability: true,
          needsUtility: false,
          context: 'Uncertain event',
          description: 'An event with a probability of occurrence',
          probabilityNote: 'Required - the likelihood this event occurs (0.0 to 1.0)',
          utilityNote: 'Not needed - uncertain events lead to final outcomes'
        };
      }
    }
    
    if (nodeType === 'decision') {
      return {
        needsProbability: false,
        needsUtility: false,
        context: 'Decision point',
        description: 'A point where you choose between alternatives',
        probabilityNote: 'Decision nodes never have probabilities - they represent choices you control',
        utilityNote: 'Not needed - decisions lead to alternatives or outcomes'
      };
    }
    
    return {
      needsProbability: false,
      needsUtility: false,
      context: 'Unknown',
      description: 'Unknown node type',
      probabilityNote: '',
      utilityNote: ''
    };
  };

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
        // Creating new node - determine appropriate default type based on parent
        let defaultType: 'decision' | 'chance' | 'terminal' = 'decision';
        
        if (selectedParentNode) {
          // Suggest appropriate child types
          if (selectedParentNode.node_type === 'decision') {
            defaultType = 'chance'; // Decision → Chance (choice)
          } else if (selectedParentNode.node_type === 'chance') {
            defaultType = 'terminal'; // Chance → Terminal (outcome) is most common
          }
        }
        
        setFormData({
          name: '',
          node_type: defaultType,
          parent_node_id: selectedParentNode?.id,
          probability: undefined,
          cost: 0,
          utility: undefined,
        });
        
        // Set appropriate defaults based on context
        handleNodeTypeChange(defaultType, false);
      }
      setErrors({});
    }
  }, [isOpen, editingNode, selectedParentNode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Node name is required';
    }

    const parentType = selectedParentNode?.node_type;
    const context = getNodeContext(formData.node_type, parentType);

    // Validate based on node requirements
    if (context.needsProbability) {
      if (formData.probability === undefined || formData.probability === null) {
        newErrors.probability = 'This node type requires a probability value';
      } else if (formData.probability < 0 || formData.probability > 1) {
        newErrors.probability = 'Probability must be between 0 and 1';
      }
    } else {
      // Warn if probability is set when not needed
      if (formData.probability !== undefined && formData.probability !== null) {
        newErrors.probability = `${context.context} should not have a probability`;
      }
    }

    if (context.needsUtility) {
      if (formData.utility === undefined || formData.utility === null) {
        newErrors.utility = 'This node type requires a utility value';
      }
    } else {
      // Warn if utility is set when not needed
      if (formData.utility !== undefined && formData.utility !== null) {
        newErrors.utility = `${context.context} should not have a utility value`;
      }
    }

    // Validate cost
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
      const parentType = selectedParentNode?.node_type;
      const context = getNodeContext(formData.node_type, parentType);
      
      // Clean up data based on context requirements
      const cleanedData: CreateNodeRequest = {
        name: formData.name,
        node_type: formData.node_type,
        parent_node_id: formData.parent_node_id,
        cost: formData.cost || 0,
      };

      // Only include probability if needed
      if (context.needsProbability) {
        cleanedData.probability = formData.probability;
      }

      // Only include utility if needed
      if (context.needsUtility) {
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

  const handleNodeTypeChange = (newType: 'decision' | 'chance' | 'terminal', resetName: boolean = true) => {
    setFormData(prev => {
      const updated = { ...prev, node_type: newType };
      
      if (resetName) {
        updated.name = '';
      }
      
      const parentType = selectedParentNode?.node_type;
      const context = getNodeContext(newType, parentType);
      
      // Set appropriate defaults when changing type
      if (context.needsProbability) {
        updated.probability = updated.probability || 0.5; // Default probability
      } else {
        updated.probability = undefined; // Clear probability if not needed
      }
      
      if (context.needsUtility) {
        updated.utility = updated.utility || 0; // Default utility
      } else {
        updated.utility = undefined; // Clear utility if not needed
      }
      
      return updated;
    });
  };

  // Get valid child types for the parent node
  const getValidChildTypes = (): ('decision' | 'chance' | 'terminal')[] => {
    if (!selectedParentNode || editingNode) {
      return ['decision', 'chance', 'terminal']; // Allow all types when editing or no parent
    }
    
    switch (selectedParentNode.node_type) {
      case 'decision':
        return ['chance', 'terminal']; // Decisions can have choices (chance) or direct outcomes (terminal)
      case 'chance':
        return ['chance', 'terminal']; // Chance can have uncertain events (chance) or outcomes (terminal)
      case 'terminal':
        return []; // Terminal nodes cannot have children
      default:
        return ['decision', 'chance', 'terminal'];
    }
  };

  if (!isOpen) return null;

  const isEditing = !!editingNode;
  const parentType = selectedParentNode?.node_type;
  const nodeContext = getNodeContext(formData.node_type, parentType);
  const validChildTypes = getValidChildTypes();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <div className="font-medium">Adding child to: {selectedParentNode.name}</div>
                <div className="text-xs mt-1">
                  Parent type: <span className="font-medium">{selectedParentNode.node_type}</span> → 
                  Can add: <span className="font-medium">{validChildTypes.join(', ')}</span>
                </div>
              </div>
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
              {(['decision', 'chance', 'terminal'] as const)
                .filter(type => isEditing || validChildTypes.includes(type) || validChildTypes.length === 0)
                .map((type) => {
                const context = getNodeContext(type, parentType);
                const isDisabled = !isEditing && validChildTypes.length > 0 && !validChildTypes.includes(type);
                
                return (
                  <label key={type} className={`flex items-start p-3 border rounded-lg cursor-pointer ${
                    isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 
                    formData.node_type === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="node_type"
                      value={type}
                      checked={formData.node_type === type}
                      onChange={(e) => handleNodeTypeChange(e.target.value as 'decision' | 'chance' | 'terminal')}
                      disabled={isDisabled}
                      className="mr-3 mt-0.5"
                    />
                    <span className={`text-lg mr-2 mt-0.5 ${
                      type === 'decision' ? 'text-blue-600' : 
                      type === 'chance' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {type === 'decision' ? '□' : type === 'chance' ? '○' : '◊'}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium capitalize">{type}</div>
                      <div className="text-sm text-gray-600 mt-1">{context.description}</div>
                      <div className="text-xs text-blue-600 mt-1">{context.context}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Current Node Context Display */}
          <div className="bg-gray-50 border rounded-lg p-3">
            <div className="text-sm">
              <div className="font-medium text-gray-800 mb-2">
                Current Selection: {nodeContext.context}
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div><strong>Probability:</strong> {nodeContext.probabilityNote}</div>
                <div><strong>Utility:</strong> {nodeContext.utilityNote}</div>
              </div>
            </div>
          </div>

          {/* Probability (only when needed) */}
          {nodeContext.needsProbability && (
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
                {nodeContext.probabilityNote}
              </p>
            </div>
          )}

          {/* Utility (only when needed) */}
          {nodeContext.needsUtility && (
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
                {nodeContext.utilityNote}
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

          {/* Decision Tree Structure Guide */}
          {!isEditing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">💡 Decision Tree Structure:</div>
                <ul className="text-xs space-y-1">
                  <li><strong>Decision → Chance:</strong> Choice options (no probability needed)</li>
                  <li><strong>Decision → Terminal:</strong> Direct outcomes (need utility)</li>
                  <li><strong>Chance → Chance:</strong> Uncertain events (need probability)</li>
                  <li><strong>Chance → Terminal:</strong> Final outcomes (need utility only)</li>
                </ul>
              </div>
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