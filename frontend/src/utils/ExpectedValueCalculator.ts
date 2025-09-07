// ExpectedValueCalculator.ts
import { TreeNode } from '../types/DecisionTree';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface CalculationResult {
  expectedValue: number;
  breakdown: {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    value: number;
    children?: CalculationResult['breakdown'][];
  };
}

class ExpectedValueCalculator {
  /**
   * Validates if a tree is ready for expected value calculation
   */
  static validateTree(nodes: TreeNode[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!nodes || nodes.length === 0) {
      errors.push("Tree has no nodes");
      return { isValid: false, errors, warnings };
    }

    // Build hierarchy to check structure
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const rootNodes = nodes.filter(node => !node.parent_node_id);
    
    if (rootNodes.length === 0) {
      errors.push("Tree has no root node");
    } else if (rootNodes.length > 1) {
      errors.push("Tree has multiple root nodes");
    }

    // Check each node
    nodes.forEach(node => {
      const children = nodes.filter(child => child.parent_node_id === node.id);
      
      switch (node.node_type) {
        case 'decision':
          if (children.length === 0) {
            warnings.push(`Decision node "${node.name}" has no options to choose from`);
          }
          break;
          
        case 'chance':
          if (children.length === 0) {
            errors.push(`Chance node "${node.name}" has no outcome branches`);
          }
          
          if (node.probability === null || node.probability === undefined) {
            errors.push(`Chance node "${node.name}" is missing probability value`);
          } else if (node.probability < 0 || node.probability > 1) {
            errors.push(`Chance node "${node.name}" has invalid probability: ${node.probability} (must be 0-1)`);
          }
          
          // Check if probabilities of children sum to 1
          if (children.length > 0) {
            const childProbSum = children.reduce((sum, child) => {
              if (child.node_type === 'chance' && child.probability) {
                return sum + child.probability;
              }
              return sum;
            }, 0);
            
            if (Math.abs(childProbSum - 1.0) > 0.01 && childProbSum > 0) {
              warnings.push(`Children of chance node "${node.name}" have probabilities that don't sum to 1.0 (sum: ${childProbSum.toFixed(3)})`);
            }
          }
          break;
          
        case 'terminal':
          if (children.length > 0) {
            warnings.push(`Terminal node "${node.name}" has children (will be ignored)`);
          }
          
          if (node.utility === null || node.utility === undefined) {
            errors.push(`Terminal node "${node.name}" is missing utility/value`);
          }
          break;
          
        default:
          errors.push(`Node "${node.name}" has invalid type: ${node.node_type}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculates expected value using recursive approach
   */
  static calculateExpectedValue(nodes: TreeNode[]): CalculationResult | null {
    const validation = this.validateTree(nodes);
    
    if (!validation.isValid) {
      console.error("Tree validation failed:", validation.errors);
      return null;
    }

    if (validation.warnings.length > 0) {
      console.warn("Tree validation warnings:", validation.warnings);
    }

    // Build node map and find root
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const rootNode = nodes.find(node => !node.parent_node_id);
    
    if (!rootNode) {
      return null;
    }

    // Start recursive calculation from root
    return this.calculateNodeValue(rootNode, nodeMap, nodes);
  }

  /**
   * Recursive function to calculate expected value of a node
   */
  private static calculateNodeValue(
    node: TreeNode, 
    nodeMap: Map<string, TreeNode>, 
    allNodes: TreeNode[]
  ): CalculationResult {
    const children = allNodes.filter(child => child.parent_node_id === node.id);
    
    switch (node.node_type) {
      case 'terminal':
        // Base case: terminal node returns its utility minus any cost
        const terminalValue = (node.utility || 0) - (node.cost || 0);
        return {
          expectedValue: terminalValue,
          breakdown: {
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.node_type,
            value: terminalValue
          }
        };
        
      case 'decision':
        // Decision node: choose the best option (highest expected value)
        if (children.length === 0) {
          return {
            expectedValue: -(node.cost || 0),
            breakdown: {
              nodeId: node.id,
              nodeName: node.name,
              nodeType: node.node_type,
              value: -(node.cost || 0)
            }
          };
        }
        
        const decisionOptions = children.map(child => 
          this.calculateNodeValue(child, nodeMap, allNodes)
        );
        
        // Find the option with highest expected value
        const bestOption = decisionOptions.reduce((best, current) => 
          current.expectedValue > best.expectedValue ? current : best
        );
        
        const decisionValue = bestOption.expectedValue - (node.cost || 0);
        
        return {
          expectedValue: decisionValue,
          breakdown: {
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.node_type,
            value: decisionValue,
            children: decisionOptions.map(option => option.breakdown)
          }
        };
        
      case 'chance':
        // Chance node: weighted average of all outcomes
        if (children.length === 0) {
          return {
            expectedValue: -(node.cost || 0),
            breakdown: {
              nodeId: node.id,
              nodeName: node.name,
              nodeType: node.node_type,
              value: -(node.cost || 0)
            }
          };
        }
        
        const chanceOutcomes = children.map(child => 
          this.calculateNodeValue(child, nodeMap, allNodes)
        );
        
        // Calculate weighted average based on probabilities
        let weightedSum = 0;
        const chanceBreakdown = chanceOutcomes.map((outcome, index) => {
          const child = children[index];
          const probability = child.node_type === 'chance' ? (child.probability || 0) : 1;
          weightedSum += outcome.expectedValue * probability;
          return outcome.breakdown;
        });
        
        const chanceValue = weightedSum - (node.cost || 0);
        
        return {
          expectedValue: chanceValue,
          breakdown: {
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.node_type,
            value: chanceValue,
            children: chanceBreakdown
          }
        };
        
      default:
        throw new Error(`Unknown node type: ${node.node_type}`);
    }
  }

  /**
   * Formats calculation result for display
   */
  static formatCalculationResult(result: CalculationResult): string {
    const formatBreakdown = (breakdown: CalculationResult['breakdown'], indent = 0): string => {
      const spaces = '  '.repeat(indent);
      let output = `${spaces}${breakdown.nodeName} (${breakdown.nodeType}): $${breakdown.value.toFixed(2)}\n`;
      
      if (breakdown.children) {
        breakdown.children.forEach(child => {
          output += formatBreakdown(child, indent + 1);
        });
      }
      
      return output;
    };

    return `Expected Value: $${result.expectedValue.toFixed(2)}\n\nBreakdown:\n${formatBreakdown(result.breakdown)}`;
  }

  /**
   * Gets the optimal path through a decision tree
   */
  static getOptimalPath(result: CalculationResult): string[] {
    const path: string[] = [result.breakdown.nodeName];
    
    const findBestPath = (breakdown: CalculationResult['breakdown']): void => {
      if (breakdown.children) {
        if (breakdown.nodeType === 'decision') {
          // For decision nodes, find the child with highest value
          const bestChild = breakdown.children.reduce((best, current) => 
            current.value > best.value ? current : best
          );
          path.push(bestChild.nodeName);
          findBestPath(bestChild);
        } else if (breakdown.nodeType === 'chance') {
          // For chance nodes, show all possible outcomes
          breakdown.children.forEach(child => {
            const branchPath = [...path];
            branchPath.push(child.nodeName);
            findBestPath(child);
          });
        }
      }
    };
    
    findBestPath(result.breakdown);
    return path;
  }
}

export default ExpectedValueCalculator;
export type { ValidationResult, CalculationResult };