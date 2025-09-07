// Enhanced SimpleTreeVisualization.tsx with corrected node addition logic
import React from 'react';
import { DecisionTree, TreeNode } from '../../types/DecisionTree';

interface SimpleTreeVisualizationProps {
  tree: DecisionTree;
  selectedNode: TreeNode | null;
  onSelectNode: (node: TreeNode | null) => void;
  onEditNode: (node: TreeNode) => void;
  onAddChild: (parentNode: TreeNode) => void;
  onChangeNodeType: (node: TreeNode, newType: 'chance' | 'terminal') => void;
}

const SimpleTreeVisualization: React.FC<SimpleTreeVisualizationProps> = ({
  tree,
  selectedNode,
  onSelectNode,
  onEditNode,
  onAddChild,
  onChangeNodeType,
}) => {
  // Build tree hierarchy from flat array
  const buildTreeHierarchy = (nodes: TreeNode[]): any[] => {
    const nodeMap = new Map();
    
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });
    
    const rootNodes: any[] = [];

    nodes.forEach(node => {
      const nodeWithChildren = nodeMap.get(node.id);
      if (node.parent_node_id) {
        const parent = nodeMap.get(node.parent_node_id);
        if (parent) {
          parent.children.push(nodeWithChildren);
        }
      } else {
        rootNodes.push(nodeWithChildren);
      }
    });

    return rootNodes;
  };

  // Get node styling based on type and selection state
  const getNodeStyles = (node: any, isSelected: boolean) => {
    const baseStyles = {
      decision: {
        container: 'bg-blue-100 border-2 border-blue-500 rounded-lg',
        shape: 'w-24 h-16 flex items-center justify-center',
        text: 'text-blue-800 font-semibold text-sm',
        addButton: 'bg-blue-500 hover:bg-blue-600'
      },
      chance: {
        container: 'bg-red-100 border-2 border-red-500 rounded-full',
        shape: 'w-20 h-20 flex items-center justify-center',
        text: 'text-red-800 font-semibold text-sm',
        addButton: 'bg-red-500 hover:bg-red-600'
      },
      terminal: {
        container: 'bg-green-100 border-2 border-green-500',
        shape: 'w-20 h-16 flex items-center justify-center transform rotate-45',
        text: 'text-green-800 font-semibold text-xs transform -rotate-45',
        addButton: 'bg-gray-400 cursor-not-allowed'
      }
    };

    const styles = baseStyles[node.node_type as keyof typeof baseStyles] || baseStyles.decision;
    
    // Add selection styling
    if (isSelected) {
      styles.container = styles.container.replace('border-2', 'border-4').replace('border-blue-500', 'border-yellow-400').replace('border-red-500', 'border-yellow-400').replace('border-green-500', 'border-yellow-400');
    }

    return styles;
  };

  // FIXED: Correct logic for what types of children a node can have
  const getValidChildTypes = (nodeType: string): ('decision' | 'chance' | 'terminal')[] => {
    switch (nodeType) {
      case 'decision':
        return ['chance', 'terminal']; // Decision nodes can have chance OR terminal children
      case 'chance':
        return ['chance', 'terminal']; // Chance nodes can have chance OR terminal children
      case 'terminal':
        return []; // Terminal nodes cannot have children
      default:
        return [];
    }
  };

  // Check if node can have children added
  const canAddChildren = (nodeType: string) => {
    return getValidChildTypes(nodeType).length > 0;
  };

  // Check if node can be converted to different type
  const canConvertNodeType = (nodeType: string) => {
    return nodeType === 'terminal'; // Only terminal nodes can be converted to chance nodes
  };

  // Render individual node
  const renderNode = (node: any, level: number = 0) => {
    const isSelected = selectedNode?.id === node.id;
    const styles = getNodeStyles(node, isSelected);
    const hasChildren = node.children && node.children.length > 0;
    const validChildTypes = getValidChildTypes(node.node_type);
    
    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node */}
        <div className="relative group">
          <div
            className={`${styles.container} ${styles.shape} cursor-pointer hover:shadow-lg transition-all duration-200 ${
              isSelected ? 'ring-2 ring-yellow-300 shadow-lg' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode(isSelected ? null : node);
            }}
          >
            <div className={styles.text}>
              <div className="text-center leading-tight">
                {node.name}
              </div>
              {node.node_type === 'chance' && node.probability !== null && node.probability !== undefined && (
                <div className="text-xs opacity-75">
                  {(node.probability * 100).toFixed(0)}%
                </div>
              )}
              {node.node_type === 'terminal' && node.utility !== null && node.utility !== undefined && (
                <div className="text-xs opacity-75">
                  U: {node.utility}
                </div>
              )}
              {(node.cost !== null && node.cost !== undefined && node.cost !== 0) && (
                <div className="text-xs opacity-75">
                  C: ${node.cost}
                </div>
              )}
            </div>
          </div>
          
          {/* Selection Indicator */}
          {isSelected && (
            <div className="absolute -top-3 -right-3 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          )}
          
          {/* Node Type Indicator */}
          <div className="absolute -top-2 -left-2 text-xs font-bold bg-white rounded-full w-6 h-6 flex items-center justify-center border shadow-sm">
            {node.node_type === 'decision' && '□'}
            {node.node_type === 'chance' && '○'}
            {node.node_type === 'terminal' && '◊'}
          </div>

          {/* Edit Button (appears on hover) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditNode(node);
            }}
            className="absolute -bottom-1 -left-1 w-5 h-5 bg-gray-600 hover:bg-gray-700 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            title={`Edit ${node.name}`}
          >
            ✎
          </button>
        </div>

        {/* Children */}
        {hasChildren && (
          <>
            <div className="w-0.5 h-8 bg-gray-400 my-2"></div>
            <div className="flex flex-row gap-8 items-start">
              {node.children.map((child: any, index: number) => (
                <div key={child.id} className="flex flex-col items-center">
                  {node.children.length > 1 && (
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-4 bg-gray-400"></div>
                      <div 
                        className={`h-0.5 bg-gray-400 ${
                          index === 0 ? 'w-4 translate-x-2' : 
                          index === node.children.length - 1 ? 'w-4 -translate-x-2' : 'w-8'
                        }`}
                      ></div>
                      <div className="w-0.5 h-4 bg-gray-400"></div>
                    </div>
                  )}
                  {renderNode(child, level + 1)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderTree = () => {
    if (!tree?.nodes || tree.nodes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <div className="text-lg mb-2">No nodes in this tree</div>
          <div className="text-sm">Create your first node to get started</div>
        </div>
      );
    }

    const hierarchicalNodes = buildTreeHierarchy(tree.nodes);
    
    if (hierarchicalNodes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <div className="text-lg mb-2">Tree structure error</div>
          <div className="text-sm">Unable to build tree hierarchy</div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-8 p-8">
        {hierarchicalNodes.map(rootNode => renderNode(rootNode))}
      </div>
    );
  };

  // Click outside to deselect
  const handleBackgroundClick = () => {
    onSelectNode(null);
  };

  return (
    <div className="w-full h-full overflow-auto bg-white" onClick={handleBackgroundClick}>
      {/* Header */}
      <div className="bg-gray-50 border-b px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-800">{tree.name}</h2>
        {tree.description && (
          <p className="text-sm text-gray-600 mt-1">{tree.description}</p>
        )}
      </div>
      
      {/* Instructions */}
      <div className="bg-blue-50 border-b px-4 py-2">
        <div className="text-sm text-blue-800">
          {!selectedNode ? (
            "Click on a node to select it and see available actions"
          ) : (
            <>
              <span className="font-medium">{selectedNode.name}</span> is selected. 
              {canAddChildren(selectedNode.node_type) ? (
                ` Can add: ${getValidChildTypes(selectedNode.node_type).join(', ')} nodes`
              ) : canConvertNodeType(selectedNode.node_type) ? (
                " Can be converted to a chance node to add children"
              ) : (
                " No children can be added to this node type"
              )}
            </>
          )}
        </div>
      </div>
      
      {/* UPDATED Legend */}
      <div className="bg-gray-50 border-b px-4 py-2">
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-blue-100 border border-blue-500 rounded"></div>
            <span>Decision → Chance/Terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-500 rounded-full"></div>
            <span>Chance → Chance/Terminal (with probability)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-green-100 border border-green-500 transform rotate-45"></div>
            <span>Terminal (with utility, no children)</span>
          </div>
        </div>
      </div>

      {/* Tree Visualization */}
      <div className="relative">
        {renderTree()}
      </div>

      {/* UPDATED Selection Panel */}
      {selectedNode && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">
              {selectedNode.node_type === 'decision' ? '□' : 
               selectedNode.node_type === 'chance' ? '○' : '◊'}
            </span>
            <div>
              <div className="font-medium">{selectedNode.name}</div>
              <div className="text-sm text-gray-500 capitalize">{selectedNode.node_type} node</div>
              {selectedNode.node_type === 'chance' && selectedNode.probability !== null && selectedNode.probability !== undefined && (
                <div className="text-xs text-gray-600">Probability: {(selectedNode.probability * 100).toFixed(0)}%</div>
              )}
              {selectedNode.node_type === 'terminal' && selectedNode.utility !== null && selectedNode.utility !== undefined && (
                <div className="text-xs text-gray-600">Utility: {selectedNode.utility}</div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            {/* Add Children Buttons - UPDATED */}
            {canAddChildren(selectedNode.node_type) && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Add Child Node:</div>
                <button
                  onClick={() => onAddChild(selectedNode)}
                  className="w-full p-2 text-sm bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 rounded transition-colors mb-1"
                >
                  Add Child Node
                </button>
                <div className="text-xs text-gray-500">
                  Can add: {getValidChildTypes(selectedNode.node_type).join(' or ')} nodes
                </div>
              </div>
            )}
            
            {/* Convert Terminal Node */}
            {canConvertNodeType(selectedNode.node_type) && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Convert Node:</div>
                <button
                  onClick={() => onChangeNodeType(selectedNode, 'chance')}
                  className="w-full p-2 text-sm bg-yellow-50 border border-yellow-200 text-yellow-800 hover:bg-yellow-100 rounded transition-colors"
                >
                  Convert to Chance Node
                </button>
                <div className="text-xs text-gray-500 mt-1">
                  This will allow you to add child nodes
                </div>
              </div>
            )}
            
            {/* Edit Button */}
            <button
              onClick={() => onEditNode(selectedNode)}
              className="w-full p-2 text-sm bg-gray-50 border border-gray-200 text-gray-800 hover:bg-gray-100 rounded transition-colors"
            >
              Edit Node Properties
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleTreeVisualization;