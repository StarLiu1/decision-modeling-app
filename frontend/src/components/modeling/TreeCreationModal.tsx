// Fixed TreeCreationModal.tsx - Updated for correct decision tree structure guidance
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

      // Root node validation - typically should be a decision node
      if (formData.rootNodeType === 'terminal') {
        newErrors.rootNodeType = 'Root node should not be terminal (tree would have only one outcome)';
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
          // Note: Root nodes typically don't need probability or utility initially
          // - Decision root: Will have choice children
          // - Chance root: Will have outcome children  
          // - Terminal root: Would need utility but creates trivial tree
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
                    newType === 'chance' ? 'Root Event' :
                    'Root Outcome'
    }));
  };

  const getNodeTypeInfo = (type: string) => {
    switch (type) {
      case 'decision':
        return {
          icon: '□',
          color: 'text-blue-600',
          description: 'A choice point where you decide between alternatives',
          recommendation: '✅ Recommended - Most trees start with a decision',
          example: 'e.g., "Treatment Decision", "Investment Choice"',
          nextSteps: 'Will typically have choice options (chance nodes) as children'
        };
      case 'chance':
        return {
          icon: '○',
          color: 'text-red-600', 
          description: 'An uncertain event or choice option',
          recommendation: '⚠️ Less common as root - Usually a child of decisions',
          example: 'e.g., "Market Conditions", "Initial Event"',
          nextSteps: 'Will have uncertain events or outcomes as children'
        };
      case 'terminal':
        return {
          icon: '◊',
          color: 'text-green-600',
          description: 'An endpoint with a final outcome',
          recommendation: '❌ Not recommended - Creates single-outcome tree',
          example: 'Would create a tree with only one result',
          nextSteps: 'Cannot have children - tree would be complete'
        };
      default:
        return { 
          icon: '?', 
          color: 'text-gray-600', 
          description: 'Unknown node type', 
          recommendation: '', 
          example: '',
          nextSteps: ''
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                        <label key={type} className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.rootNodeType === type 
                            ? 'border-blue-500 bg-blue-50 shadow-sm' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                          <span className={`text-xl mr-3 ${info.color}`}>{info.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium capitalize text-lg">{type}</span>
                            </div>
                            <div className="text-sm text-gray-600 mb-1">{info.description}</div>
                            <div className={`text-xs font-medium mb-1 ${
                              isRecommended ? 'text-green-700' : 
                              isDiscouraged ? 'text-red-700' : 'text-yellow-700'
                            }`}>
                              {info.recommendation}
                            </div>
                            <div className="text-xs text-blue-600 mb-1">{info.example}</div>
                            <div className="text-xs text-gray-500">{info.nextSteps}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {errors.rootNodeType && <p className="text-red-500 text-xs mt-1">{errors.rootNodeType}</p>}
                </div>

                {/* UPDATED Decision Tree Structure Guide */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-2">💡 Decision Tree Structure Guide:</div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="font-medium text-blue-900">Common Structures:</div>
                      
                      <div className="pl-2">
                        <div><strong>Decision → Choice Options → Uncertain Events → Outcomes</strong></div>
                        <div className="text-blue-600 ml-2">
                          Decision (□) → Choice A (○, no probability) → Event A1 (○, probability) → Result (◊, utility)
                        </div>
                      </div>
                      
                      <div className="pl-2">
                        <div><strong>Decision → Direct Outcomes</strong></div>
                        <div className="text-blue-600 ml-2">
                          Decision (□) → Outcome A (◊, utility)
                        </div>
                      </div>
                      
                      <div className="pl-2">
                        <div><strong>Uncertain Event → Multiple Outcomes</strong></div>
                        <div className="text-blue-600 ml-2">
                          Event (○, probability) → Outcome A (◊, utility)
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-blue-200">
                      <div className="font-medium text-blue-900 mb-1">Key Principles:</div>
                      <ul className="text-xs space-y-1 list-disc list-inside ml-2">
                        <li><strong>Choice options</strong> (under decisions) don't need probabilities</li>
                        <li><strong>Uncertain events</strong> need probabilities (0.0 to 1.0)</li>
                        <li><strong>Final outcomes</strong> need utility values</li>
                        <li><strong>Probabilities of uncertain events</strong> under the same parent should sum to 1.0</li>
                      </ul>
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