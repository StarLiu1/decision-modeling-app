// Fixed ModelingPage.tsx - Added missing functionality and proper node selection
import React, { useState, useEffect } from 'react';
import { DecisionTree, TreeNode, CreateNodeRequest, NodeType } from '../../types/DecisionTree';
import { apiService } from '../../services/api';
import TreeList from '../../components/modeling/TreeList';
import SimpleTreeVisualization from '../../components/modeling/SimpleTreeVisualization';
import NodeEditModal from '../../components/modeling/NodeEditModal';
import ExpectedValuePanel from '../../components/modeling/ExpectedValuePanel';

const ModelingPage: React.FC = () => {
  const [selectedTree, setSelectedTree] = useState<DecisionTree | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null); // Added missing state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [selectedParentNode, setSelectedParentNode] = useState<TreeNode | null>(null);
  const [editingNode, setEditingNode] = useState<TreeNode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expectedValue, setExpectedValue] = useState<any>(null);

  const loadTreeDetails = async (tree: DecisionTree) => {
    try {
      setLoading(true);
      setError(null);
      const detailedTree = await apiService.getTree(tree.id);
      setSelectedTree(detailedTree);
      console.log('Loaded tree details:', detailedTree); // Debug logging
    } catch (err) {
      console.error('Failed to load tree:', err); // Debug logging
      setError(err instanceof Error ? err.message : 'Failed to load tree details');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTree = (tree: DecisionTree) => {
    setSelectedTree(tree);
    setSelectedNode(null); // Clear selected node when changing trees
    setExpectedValue(null);
    loadTreeDetails(tree);
  };

  // Added missing node selection handler
  const handleSelectNode = (node: TreeNode | null) => {
    setSelectedNode(node);
  };

  const handleAddChild = (parentNode: TreeNode) => {
    console.log('Adding child to parent:', parentNode); // Debug logging
    setSelectedParentNode(parentNode);
    setEditingNode(null);
    setIsNodeModalOpen(true);
  };

  const handleEditNode = (node: TreeNode) => {
    console.log('Editing node:', node); // Debug logging
    setEditingNode(node);
    setSelectedParentNode(null);
    setIsNodeModalOpen(true);
  };

  // Added missing node type conversion handler
  const handleChangeNodeType = async (node: TreeNode, newType: 'chance' | 'terminal') => {
    if (!selectedTree) return;

    try {
      setLoading(true);
      setError(null);

      // Convert string to NodeType enum
      const nodeType = newType === 'chance' ? NodeType.CHANCE : NodeType.TERMINAL;

      // Prepare update data
      const updateData: Partial<CreateNodeRequest> = {
        name: node.name,
        node_type: nodeType,
        cost: node.cost || 0,
      };

      // Set appropriate defaults for the new type
      if (newType === 'chance') {
        updateData.probability = 0.5; // Default probability
        updateData.utility = undefined; // Clear utility
      } else if (newType === 'terminal') {
        updateData.utility = 0; // Default utility
        updateData.probability = undefined; // Clear probability
      }

      // Update the node
      await apiService.updateNode(selectedTree.id, node.id, updateData);
      
      // Reload tree to get updated structure
      await loadTreeDetails(selectedTree);
      
      // Clear selection since the node has changed
      setSelectedNode(null);
      
    } catch (err) {
      console.error('Failed to change node type:', err);
      setError(err instanceof Error ? err.message : 'Failed to change node type');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNode = async (data: CreateNodeRequest): Promise<void> => {
    if (!selectedTree) return;

    try {
      setIsSaving(true);
      console.log('Saving node:', data); // Debug logging
      console.log('Parent node:', selectedParentNode); // Debug logging
      
      if (editingNode) {
        // Update existing node
        await apiService.updateNode(selectedTree.id, editingNode.id, data);
      } else {
        // Create new node
        await apiService.createNode(selectedTree.id, data);
      }
      
      // Reload tree to get updated structure
      await loadTreeDetails(selectedTree);
      setIsNodeModalOpen(false);
      setSelectedParentNode(null);
      setEditingNode(null);
      setSelectedNode(null); // Clear selection after save
    } catch (err) {
      console.error('Failed to save node:', err);
      setError(err instanceof Error ? err.message : 'Failed to save node');
      throw err; // Re-throw so the modal can handle the error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCalculateExpectedValue = async () => {
    if (!selectedTree) return;

    try {
      setLoading(true);
      const analysis = await apiService.getExpectedValue(selectedTree.id);
      setExpectedValue(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate expected value');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateTree = async () => {
    if (!selectedTree) return;

    try {
      setLoading(true);
      const validation = await apiService.validateTree(selectedTree.id);
      
      if (validation.valid) {
        alert('Tree structure is valid!');
      } else {
        alert(`Tree has issues:\n${validation.issues.join('\n')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate tree');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete node functionality
  const handleDeleteNode = async (node: TreeNode) => {
    if (!selectedTree) return;

    const confirmMessage = `Are you sure you want to delete "${node.name}"? This will also delete all child nodes.`;
    if (!confirm(confirmMessage)) return;

    try {
      setLoading(true);
      await apiService.deleteNode(selectedTree.id, node.id);
      
      // Reload tree to get updated structure
      await loadTreeDetails(selectedTree);
      setSelectedNode(null); // Clear selection
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete node');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Decision Tree Modeling</h1>
        <p className="text-gray-600 mt-1">Create and analyze decision trees for complex decision making.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <div className="mt-4">
                <button
                  onClick={() => setError(null)}
                  className="text-sm bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree List Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <TreeList
              onSelectTree={handleSelectTree}
              selectedTreeId={selectedTree?.id}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {selectedTree ? (
            <div className="space-y-6">
              {/* Tree Visualization */}
              <div className="bg-white shadow rounded-lg">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading tree...</p>
                  </div>
                ) : (
                  <SimpleTreeVisualization
                    tree={selectedTree}
                    selectedNode={selectedNode}
                    onSelectNode={handleSelectNode}
                    onEditNode={handleEditNode}
                    onAddChild={handleAddChild}
                    onChangeNodeType={handleChangeNodeType}
                  />
                )}
              </div>

              {/* Expected Value Panel */}
              <ExpectedValuePanel tree={selectedTree} />

              {/* Analysis Panel */}
              <div className="bg-white shadow rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Analysis Tools</h3>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-3 mb-4">
                    <button
                      onClick={handleCalculateExpectedValue}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      Calculate Expected Value
                    </button>
                    <button
                      onClick={handleValidateTree}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Validate Structure
                    </button>
                    {selectedNode && (
                      <button
                        onClick={() => handleDeleteNode(selectedNode)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete Selected Node
                      </button>
                    )}
                  </div>

                  {expectedValue && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                      <h4 className="font-medium text-green-800 mb-2">Expected Value Analysis</h4>
                      <div className="text-sm text-green-700">
                        <p><strong>Root Expected Value:</strong> {expectedValue.root_expected_value?.toFixed(2)}</p>
                        {expectedValue.node_expected_values && (
                          <div className="mt-3">
                            <p className="font-medium mb-1">Node Values:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(expectedValue.node_expected_values).map(([nodeId, value]) => (
                                <div key={nodeId} className="flex justify-between">
                                  <span>Node {nodeId.substring(0, 8)}...</span>
                                  <span>{(value as number).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tree Information */}
              <div className="bg-white shadow rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-gray-900">Tree Information</h3>
                    {selectedNode && (
                      <div className="text-sm text-blue-600">
                        Selected: {selectedNode.name} ({selectedNode.node_type})
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="text-sm text-gray-900">{selectedTree.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Nodes</dt>
                      <dd className="text-sm text-gray-900">{selectedTree.node_count}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(selectedTree.created_at).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Updated</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(selectedTree.updated_at).toLocaleDateString()}
                      </dd>
                    </div>
                    {selectedTree.description && (
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                        <dd className="text-sm text-gray-900">{selectedTree.description}</dd>
                      </div>
                    )}
                    {selectedNode && (
                      <div className="sm:col-span-2 pt-3 border-t border-gray-200">
                        <dt className="text-sm font-medium text-gray-500">Selected Node Details</dt>
                        <dd className="text-sm text-gray-900 mt-1">
                          <div><strong>Name:</strong> {selectedNode.name}</div>
                          <div><strong>Type:</strong> {selectedNode.node_type}</div>
                          {selectedNode.node_type === 'chance' && selectedNode.probability !== null && selectedNode.probability !== undefined && (
                            <div><strong>Probability:</strong> {(selectedNode.probability * 100).toFixed(1)}%</div>
                          )}
                          {selectedNode.node_type === 'terminal' && selectedNode.utility !== null && selectedNode.utility !== undefined && (
                            <div><strong>Utility:</strong> {selectedNode.utility}</div>
                          )}
                          {selectedNode.cost !== null && selectedNode.cost !== undefined && selectedNode.cost !== 0 && (
                            <div><strong>Cost:</strong> ${selectedNode.cost}</div>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg">
              <div className="p-8 text-center">
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tree selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a decision tree from the sidebar to start modeling.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Node Edit Modal */}
      <NodeEditModal
        isOpen={isNodeModalOpen}
        onClose={() => {
          setIsNodeModalOpen(false);
          setSelectedParentNode(null);
          setEditingNode(null);
        }}
        onSave={handleSaveNode}
        selectedParentNode={selectedParentNode}
        editingNode={editingNode}
      />
    </div>
  );
};

export default ModelingPage;