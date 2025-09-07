// Fixed TreeCreationModal.tsx - Proper type handling and validation
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
    rootNodeName: 'Root Decision',
    rootNodeType: 'decision' as 'decision' | 'chance' | 'terminal',
    rootProbability: undefined as number | undefined,
    rootUtility: undefined as number | undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tree name is required';
    }

    if (!formData.rootNodeName.trim()) {
      newErrors.rootNodeName = 'Root node name is required';
    }

    // Validate based on root node type
    if (formData.rootNodeType === 'chance') {
      if (formData.rootProbability === undefined || formData.rootProbability === null) {
        newErrors.rootProbability = 'Probability is required for chance nodes';
      } else if (formData.rootProbability < 0 || formData.rootProbability > 1) {
        newErrors.rootProbability = 'Probability must be between 0 and 1';
      }
    }

    if (formData.rootNodeType === 'terminal') {
      if (formData.rootUtility === undefined || formData.rootUtility === null) {
        newErrors.rootUtility = 'Utility is required for terminal nodes';
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
        description: formData.description || undefined,
        root_node: {
          name: formData.rootNodeName,
          node_type: formData.rootNodeType as NodeType,
          position_x: 100,
          position_y: 100,
          // Only include probability for chance nodes
          ...(formData.rootNodeType === 'chance' && { probability: formData.rootProbability }),
          // Only include utility for terminal nodes
          ...(formData.rootNodeType === 'terminal' && { utility: formData.rootUtility }),
        }
      };

      await onCreateTree(createData);
      
      // Reset form on success
      setFormData({
        name: '',
        description: '',
        rootNodeName: 'Root Decision',
        rootNodeType: 'decision',
        rootProbability: undefined,
        rootUtility: undefined
      });
      setErrors({});
      
    } catch (error) {
      console.error('Failed to create tree:', error);
      setErrors({ general: 'Failed to create tree. Please try again.' });
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
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
      // Set appropriate defaults when changing type
      rootProbability: newType === 'chance' ? 0.5 : undefined,
      rootUtility: newType === 'terminal' ? 0 : undefined
    }));
  };

  const getNodeTypeInfo = (type: string) => {
    switch (type) {
      case 'decision':
        return {
          icon: '□',
          color: 'text-blue-600',
          description: 'A choice point where you decide between options',
          note: 'Most common starting point for decision trees'
        };
      case 'chance':
        return {
          icon: '○',
          color: 'text-red-600',
          description: 'An uncertain event with a probability',
          note: 'Requires probability value (0.0 to 1.0)'
        };
      case 'terminal':
        return {
          icon: '◊',
          color: 'text-green-600',
          description: 'An endpoint with a final outcome',
          note: 'Requires utility value, cannot have children'
        };
      default:
        return { icon: '?', color: 'text-gray-600', description: 'Unknown node type', note: '' };
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
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Root Node Configuration</h3>
            
            {/* Root Node Name */}
            <div className="mb-4">
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
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Root Node Type *
              </label>
              <div className="space-y-2">
                {(['decision', 'chance', 'terminal'] as const).map((type) => {
                  const info = getNodeTypeInfo(type);
                  return (
                    <label key={type} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="rootNodeType"
                        value={type}
                        checked={formData.rootNodeType === type}
                        onChange={(e) => handleNodeTypeChange(e.target.value as 'decision' | 'chance' | 'terminal')}
                        className="mr-3"
                        disabled={isLoading}
                      />
                      <span className={`text-lg mr-2 ${info.color}`}>{info.icon}</span>
                      <div>
                        <div className="font-medium capitalize">{type}</div>
                        <div className="text-sm text-gray-500">{info.description}</div>
                        <div className="text-xs text-gray-400">{info.note}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Probability (for chance nodes) */}
            {formData.rootNodeType === 'chance' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Probability * (0.0 to 1.0)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.rootProbability || ''}
                  onChange={(e) => handleInputChange('rootProbability', e.target.value ? parseFloat(e.target.value) : 0)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.rootProbability ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.50"
                  disabled={isLoading}
                />
                {errors.rootProbability && <p className="text-red-500 text-xs mt-1">{errors.rootProbability}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Example: 0.7 = 70% chance, 0.3 = 30% chance
                </p>
              </div>
            )}

            {/* Utility (for terminal nodes) */}
            {formData.rootNodeType === 'terminal' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Utility/Value *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rootUtility || ''}
                  onChange={(e) => handleInputChange('rootUtility', e.target.value ? parseFloat(e.target.value) : 0)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.rootUtility ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1000.00"
                  disabled={isLoading}
                />
                {errors.rootUtility && <p className="text-red-500 text-xs mt-1">{errors.rootUtility}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Expected value or utility of this outcome
                </p>
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
              disabled={isLoading || !formData.name.trim() || !formData.rootNodeName.trim()}
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