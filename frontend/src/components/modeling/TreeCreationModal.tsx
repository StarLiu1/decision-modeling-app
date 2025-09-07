// frontend/src/components/modeling/TreeCreationModal.tsx
import React, { useState } from 'react';
import { NodeType, CreateTreeRequest } from '../../types/DecisionTree';

interface TreeCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTree: (data: CreateTreeRequest) => void;
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
    rootNodeName: 'Root',
    rootNodeType: NodeType.DECISION
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const createData: CreateTreeRequest = {
      name: formData.name,
      description: formData.description || undefined,
      root_node: {
        name: formData.rootNodeName,
        node_type: formData.rootNodeType,
        position_x: 100,
        position_y: 100
      }
    };

    onCreateTree(createData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create New Decision Tree</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tree Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter tree name"
            />
          </div>

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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Root Node Name
            </label>
            <input
              type="text"
              value={formData.rootNodeName}
              onChange={(e) => handleInputChange('rootNodeName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Root node name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Root Node Type
            </label>
            <select
              value={formData.rootNodeType}
              onChange={(e) => handleInputChange('rootNodeType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={NodeType.DECISION}>Decision</option>
              <option value={NodeType.CHANCE}>Chance</option>
              <option value={NodeType.TERMINAL}>Terminal</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
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
              disabled={isLoading || !formData.name.trim()}
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