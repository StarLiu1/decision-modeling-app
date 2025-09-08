// Final Corrected NodeEditModal.tsx - Updated for correct probability logic
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

  // Helper function to determine if a chance node would be a "choice node"
  const wouldBeChoiceNode = (nodeType: string, parentType?: string): boolean => {
    return nodeType === 'chance' && parentType === 'decision';
  };

  // Helper function to determine if a chance node would be a "regular chance node" 
  const wouldBeRegularChanceNode = (nodeType: string, parentType?: string): boolean => {
    return nodeType === 'chance' && parentType !== 'decision';
  };

  // Helper function to determine if a node needs probability
  const needsProbability = (nodeType: string, parentType?: string): boolean => {
    // Only regular chance nodes need probability
    return wouldBeRegularChanceNode(nodeType, parentType);
  };

  // Helper function to determine if a node needs utility
  const needsUtility = (nodeType: string): boolean => {
    return nodeType === 'terminal';
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
          // Default child types based on parent
          if (selectedParentNode.node_type === 'decision') {
            defaultType = 'chance'; // Decision nodes have chance children (choices)
          } else if (selectedParentNode.node_type === 'chance') {
            defaultType = 'chance'; // Chance nodes can have chance children (uncertain events)
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
        
        // Set default values based on type and parent
        handleNodeTypeChange(defaultType, false); // false = don't reset name
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

    // Validate based on node type and parent context
    if (formData.node_type === 'terminal') {
      // Terminal nodes must have utility, never probability
      if (formData.utility === undefined || formData.utility === null) {
        newErrors.utility = 'Terminal nodes must have a utility value';
      }
      
      if (formData.probability !== undefined && formData.probability !== null) {
        newErrors.probability = 'Terminal nodes should not have probabilities (probabilities belong on chance nodes)';
      }
      
    } else if (formData.node_type === 'chance') {
      const isChoice = wouldBeChoiceNode(formData.node_type, parentType);
      const isRegular = wouldBeRegularChanceNode(formData.node_type, parentType);
      
      if (isChoice) {
        // Choice nodes don't need probability or utility
        if (formData.probability !== undefined && formData.probability !== null) {
          newErrors.probability = 'Choice nodes (children of decisions) should not have probabilities';
        }
        
        if (formData.utility !== undefined && formData.utility !== null) {
          newErrors.utility = 'Choice nodes should not have utilities';
        }
        
      } else if (isRegular) {
        // Regular chance nodes need probability
        if (formData.probability === undefined || formData.probability === null) {
          newErrors.probability = 'Chance nodes representing uncertainty must have probability';
        } else if (formData.probability < 0 || formData.probability > 1) {
          newErrors.probability = 'Probability must be between 0 and 1';
        }
        
        if (formData.utility !== undefined && formData.utility !== null) {
          newErrors.utility = 'Chance nodes should not have utilities';
        }
      }
      
    } else if (formData.node_type === 'decision') {
      // Decision nodes should not have probability or utility
      if (formData.probability !== undefined && formData.probability !== null) {
        newErrors.probability = 'Decision nodes should not have probabilities';
      }
      if (formData.utility !== undefined && formData.utility !== null) {
        newErrors.utility = 'Decision nodes should not have utilities';
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
      // Clean up data based on node type and context
      const cleanedData: CreateNodeRequest = {
        name: formData.name,
        node_type: formData.node_type,
        parent_node_id: formData.parent_node_id,
        cost: formData.cost || 0,
      };

      const parentType = selectedParentNode?.node_type;

      // Only include probability if needed (regular chance nodes only)
      if (needsProbability(formData.node_type, parentType)) {
        cleanedData.probability = formData.probability;
      }

      // Only include utility for terminal nodes
      if (needsUtility(formData.node_type)) {
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
      
      // Set appropriate defaults when changing type
      if (needsProbability(newType, parentType)) {
        updated.probability = updated.probability || 0.5; // Default probability for regular chance nodes
      } else {
        updated.probability = undefined; // Clear probability if not needed
      }
      
      if (needsUtility(newType)) {
        updated.utility = updated.utility || 0; // Default utility for terminal nodes
      } else {
        updated.utility = undefined; // Clear utility for non-terminal nodes
      }
      
      return updated;
    });
  };

  const getNodeTypeInfo = (type: string) => {
    const parentType = selectedParentNode?.node_type;
    
    switch (type) {
      case 'decision':
        return {
          icon: '□',
          color: 'text-blue-600',
          description: 'A choice point where you decide between options',
          properties: 'No probability or utility needed',
          context: 'Typically has chance nodes as children (choice options)'
        };
      case 'chance':
        const isChoice = wouldBeChoiceNode(type, parentType);
        const chanceProps = isChoice 
          ? 'No probability or utility needed (represents a choice option)'
          : 'Requires probability (0.0 to 1.0), no utility';
        const chanceContext = isChoice 
          ? 'Represents a choice option under a decision'
          : 'Represents an uncertain event with probability';
        return {
          icon: '○',
          color: 'text-red-600',
          description: isChoice ? 'A choice option' : 'An uncertain event',
          properties: chanceProps,
          context: chanceContext
        };
      case 'terminal':
        return {
          icon: '◊',
          color: 'text-green-600',
          description: 'An endpoint with a final outcome',
          properties: 'Requires utility, no probability (probabilities come from parent chance nodes)',
          context: 'Represents a final payoff or outcome'
        };
      default:
        return { icon: '?', color: 'text-gray-600', description: 'Unknown node type', properties: '', context: '' };
    }
  };

  // Get valid child types for the parent node
  const getValidChildTypes = (): ('decision' | 'chance' | 'terminal')[] => {
    if (!selectedParentNode || editingNode) {
      return ['decision', 'chance', 'terminal']; // Allow all types when editing or no parent
    }
    
    switch (selectedParentNode.node_type) {
      case 'decision':
        return ['chance']; // Decision nodes have chance children (choices)
      case 'chance':
        return ['chance', 'terminal']; // Chance nodes can have chance (uncertain events) or terminal outcomes
      case 'terminal':
        return []; // Terminal nodes cannot have children
      default:
        return ['decision', 'chance', 'terminal'];
    }
  };

  if (!isOpen) return null;

  const isEditing = !!editingNode;
  const nodeTypeInfo = getNodeTypeInfo(formData.node_type);
  const validChildTypes = getValidChildTypes();
  const parentType = selectedParentNode?.node_type;

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
                Adding child to: <span className="font-medium">{selectedParentNode.name}</span>
                <span className="text-xs block mt-1">
                  Parent type: {selectedParentNode.node_type} → Can add: {validChildTypes.join(', ')}
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
              {(['decision', 'chance', 'terminal'] as const)
                .filter(type => isEditing || validChildTypes.includes(type) || validChildTypes.length === 0)
                .map((type) => {
                const info = getNodeTypeInfo(type);
                const isDisabled = !isEditing && validChildTypes.length > 0 && !validChildTypes.includes(type);
                
                return (
                  <label key={type} className={`flex items-start p-3 border rounded-lg cursor-pointer ${
                    isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'
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
                    <span className={`text-lg mr-2 ${info.color} mt-0.5`}>{info.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium capitalize">{type}</div>
                      <div className="text-sm text-gray-500">{info.description}</div>
                      <div className="text-xs text-gray-400 mt-1">{info.properties}</div>
                      <div className="text-xs text-blue-600 mt-1">{info.context}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Probability (only for regular chance nodes) */}
          {needsProbability(formData.node_type, parentType) && (
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
                Required for uncertain events (chance nodes that are not choice options)
              </p>
            </div>
          )}

          {/* Utility (only for terminal nodes) */}
          {needsUtility(formData.node_type) && (
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
                Final payoff or outcome value (probability comes from parent chance node)
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
                  <li><strong>Decision → Chance (choices)</strong> - Choice options, no probability</li>
                  <li><strong>Chance → Chance (events)</strong> - Uncertain events, need probability</li>
                  <li><strong>Chance → Terminal</strong> - Final outcomes, need utility only</li>
                  <li><strong>Terminal nodes</strong> - Never have probability (comes from parent)</li>
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