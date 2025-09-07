// frontend/src/components/modeling/TreeList.tsx
import React, { useState, useEffect } from 'react';
import { DecisionTree, CreateTreeRequest } from '../../types/DecisionTree';
import { apiService } from '../../services/api';
import TreeCreationModal from './TreeCreationModal';

interface TreeListProps {
  onSelectTree: (tree: DecisionTree) => void;
  selectedTreeId?: string;
}

const TreeList: React.FC<TreeListProps> = ({ onSelectTree, selectedTreeId }) => {
  const [trees, setTrees] = useState<DecisionTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTrees();
  }, []);

  const loadTrees = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTrees = await apiService.getTrees();
      setTrees(fetchedTrees);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trees');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTree = async (data: CreateTreeRequest) => {
    try {
      setIsCreating(true);
      const newTree = await apiService.createTree(data);
      setTrees(prev => [newTree, ...prev]);
      setIsCreateModalOpen(false);
      onSelectTree(newTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tree');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTree = async (treeId: string, treeName: string) => {
    if (!confirm(`Are you sure you want to delete "${treeName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteTree(treeId);
      setTrees(prev => prev.filter(tree => tree.id !== treeId));
      if (selectedTreeId === treeId) {
        // If we deleted the selected tree, select another one or none
        const remainingTrees = trees.filter(tree => tree.id !== treeId);
        if (remainingTrees.length > 0) {
          onSelectTree(remainingTrees[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tree');
    }
  };

  const handleDuplicateTree = async (treeId: string, originalName: string) => {
    const newName = prompt(`Enter name for duplicate of "${originalName}":`, `Copy of ${originalName}`);
    if (!newName) return;

    try {
      const duplicatedTree = await apiService.duplicateTree(treeId, newName);
      setTrees(prev => [duplicatedTree, ...prev]);
      onSelectTree(duplicatedTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate tree');
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Decision Trees</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          New Tree
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={loadTrees}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}

      {trees.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No decision trees found.</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-2 text-blue-600 hover:text-blue-800 underline"
          >
            Create your first tree
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {trees.map((tree) => (
            <div
              key={tree.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedTreeId === tree.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onSelectTree(tree)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{tree.name}</h3>
                  {tree.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{tree.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>{tree.node_count} nodes</span>
                    <span>Updated {new Date(tree.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex space-x-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateTree(tree.id, tree.name);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Duplicate"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTree(tree.id, tree.name);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TreeCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTree={handleCreateTree}
        isLoading={isCreating}
      />
    </div>
  );
};

export default TreeList;