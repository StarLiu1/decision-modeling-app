// Corrected TreeCreationModal.tsx - Updated for proper decision tree structure
import React, { useState } from 'react';
import { CreateTreeRequest, NodeType } from '../../types/DecisionTree';

interface TreeCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTree: (data: CreateTreeRequest) => Promise<void>;
  isLoading?: boolean;
}

const TreeCreationModal: React.FC<TreeCreationModalProps> = ({
  isOpen,
  onClose,
  onCreateTree,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    createRootNode: true,
    rootNodeName: 'Root Decision',
    rootNodeType: 'decision' as 'decision' | 'chance' | 'terminal'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tree name is required';
    }

    if (formData.createRootNode) {
      if (!formData.rootNodeName.trim()) {
        newErrors.rootNodeName = 'Root node name is required';
      }

      // Root node validation - should typically be a decision node
      if (formData.rootNodeType === 'chance') {
        // Warn but allow chance root nodes
        // Note: This would be unusual but not necessarily invalid
      } else if (formData.rootNodeType === 'terminal') {
        newErrors.rootNodeType = 'Root node should not be terminal (tree would have only one node)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const createData: CreateTreeRequest = {
        name: formData.name,
        description: formData.description || undefined
      };

      // Only add root node if user wants one
      if (formData.createRootNode) {
        createData.root_node = {
          name: formData.rootNodeName,
          node_type: formData.rootNodeType as NodeType,
          position_x: 100,
          position_y: 100
          // Note: Root nodes typically don't need probability or utility
          // - Decision root: No probability/utility (will have choice children)
          // - Chance root: No probability (will have outcome children with probabilities)
          // - Terminal root: Would need utility but this creates a trivial tree
        };
      }

      await onCreateTree(createData);
      
      // Reset form on success
      setFormData({
        name: '',
        description: '',
        createRootNode: true,
        rootNodeName: 'Root Decision',
        rootNodeType: 'decision'
      });
      setErrors({});
      
    } catch (error) {
      console.error('Failed to create tree:', error);
      setErrors({ general: 'Failed to create tree. Please try again.' });
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear specific field errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNodeTypeChange = (newType: 'decision' | 'chance' | 'terminal') => {
    setFormData(prev => ({
      ...prev,
      rootNodeType: newType,
      // Update root node name to match type
      rootNodeName: newType === 'decision' ? 'Root Decision' :
                    newType === 'chance' ? 'Root Chance' :
                    'Root Outcome'
    }));
  };

  const getNodeTypeInfo = (type: string) => {
    switch (type) {
      case 'decision':
        return {
          icon: '□',
          color: 'text-blue-600',
          description: 'A choice point where you decide between options',
          recommendation: 'Recommended for most decision trees',
          example: 'e.g., "Treatment Decision", "Investment Choice"'
        };
      case 'chance':
        return {
          icon: '○',
          color: 'text-red-600',
          description: 'An uncertain event with multiple outcomes',
          recommendation: 'Less common as root node',
          example: 'e.g., "Market Conditions", "Weather Outcome"'
        };
      case 'terminal':
        return {
          icon: '◊',
          color: 'text-green-600',
          description: 'An endpoint with a final outcome',
          recommendation: 'Not recommended (creates trivial tree)',
          example: 'Would create a tree with only one outcome'
        };
      default:
        return { icon: '?', color: 'text-gray-600', description: 'Unknown node type', recommendation: '', example: '' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Create New Decision Tree</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            disabled={isLoading}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tree Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tree Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter tree name"
              disabled={isLoading}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional description"
              disabled={isLoading}
            />
          </div>

          {/* Root Node Configuration */}
          <div className="border-t pt-6">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="createRootNode"
                checked={formData.createRootNode}
                onChange={(e) => handleInputChange('createRootNode', e.target.checked)}
                className="mr-2"
                disabled={isLoading}
              />
              <label htmlFor="createRootNode" className="text-sm font-medium text-gray-700">
                Create root node automatically
              </label>
            </div>
            
            {formData.createRootNode && (
              <div className="space-y-4 ml-6 pl-4 border-l-2 border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Root Node Configuration</h3>
                
                {/* Root Node Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Root Node Name *
                  </label>
                  <input
                    type="text"
                    value={formData.rootNodeName}
                    onChange={(e) => handleInputChange('rootNodeName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.rootNodeName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Root node name"
                    disabled={isLoading}
                  />
                  {errors.rootNodeName && <p className="text-red-500 text-xs mt-1">{errors.rootNodeName}</p>}
                </div>

                {/* Root Node Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Root Node Type *
                  </label>
                  <div className="space-y-3">
                    {(['decision', 'chance', 'terminal'] as const).map((type) => {
                      const info = getNodeTypeInfo(type);
                      const isRecommended = type === 'decision';
                      const isDiscouraged = type === 'terminal';
                      
                      return (
                        <label key={type} className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.rootNodeType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                        } ${isDiscouraged ? 'opacity-75' : ''}`}>
                          <input
                            type="radio"
                            name="rootNodeType"
                            value={type}
                            checked={formData.rootNodeType === type}
                            onChange={(e) => handleNodeTypeChange(e.target.value as 'decision' | 'chance' | 'terminal')}
                            className="mr-3 mt-1"
                            disabled={isLoading}
                          />
                          <span className={`text-lg mr-3 ${info.color}`}>{info.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{type}</span>
                              {isRecommended && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                  Recommended
                                </span>
                              )}
                              {isDiscouraged && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                  Not Recommended
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{info.description}</div>
                            <div className="text-xs text-gray-500 mt-1">{info.recommendation}</div>
                            <div className="text-xs text-blue-600 mt-1">{info.example}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {errors.rootNodeType && <p className="text-red-500 text-xs mt-1">{errors.rootNodeType}</p>}
                </div>

                {/* Explanatory Text */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">💡 Decision Tree Structure Guide:</div>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li><strong>Decision nodes</strong> represent choices you can make</li>
                      <li><strong>Chance nodes</strong> represent uncertain events or outcomes</li>
                      <li><strong>Terminal nodes</strong> represent final payoffs or results</li>
                    </ul>
                    <div className="mt-2 text-xs">
                      <strong>Typical structure:</strong> Decision → Chance (choices) → Terminal (outcomes)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name.trim() || (formData.createRootNode && !formData.rootNodeName.trim())}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Tree'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TreeCreationModal;