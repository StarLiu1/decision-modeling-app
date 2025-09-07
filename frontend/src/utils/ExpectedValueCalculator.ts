// Fixed ExpectedValueCalculator.ts - Updated for new type system
import { TreeNode, NodeType, isDecisionNode, isChanceNode, isTerminalNode } from '../types/DecisionTree';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface CalculationBreakdown {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  value: number;
  children?: CalculationBreakdown[];
}

interface CalculationResult {
  expectedValue: number;
  breakdown: CalculationBreakdown;
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
      
      if (isDecisionNode(node)) {
        if (children.length === 0) {
          warnings.push(`Decision node "${node.name}" has no options to choose from`);
        }
      } else if (isChanceNode(node)) {
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
            if (isChanceNode(child) && child.probability !== null && child.probability !== undefined) {
              return sum + child.probability;
            }
            return sum;
          }, 0);
          
          if (Math.abs(childProbSum - 1.0) > 0.01 && childProbSum > 0) {
            warnings.push(`Children of chance node "${node.name}" have probabilities that don't sum to 1.0 (sum: ${childProbSum.toFixed(3)})`);
          }
        }
      } else if (isTerminalNode(node)) {
        if (children.length > 0) {
          warnings.push(`Terminal node "${node.name}" has children (will be ignored)`);
        }
        
        if (node.utility === null || node.utility === undefined) {
          errors.push(`Terminal node "${node.name}" is missing utility/value`);
        }
      } else {
        errors.push(`Node "${node.name}" has invalid type: ${node.node_type}`);
      }

      // Validate cost if present
      if (node.cost !== null && node.cost !== undefined && node.cost < 0) {
        warnings.push(`Node "${node.name}" has negative cost: ${node.cost}`);
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
    
    if (isTerminalNode(node)) {
      // Base case: terminal node returns its utility minus any cost
      const utility = node.utility || 0;
      const cost = node.cost || 0;
      const terminalValue = utility - cost;
      
      return {
        expectedValue: terminalValue,
        breakdown: {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.node_type,
          value: terminalValue
        }
      };
    } else if (isDecisionNode(node)) {
      // Decision node: choose the best option (highest expected value)
      const cost = node.cost || 0;
      
      if (children.length === 0) {
        return {
          expectedValue: -cost,
          breakdown: {
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.node_type,
            value: -cost
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
      
      const decisionValue = bestOption.expectedValue - cost;
      
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
    } else if (isChanceNode(node)) {
      // Chance node: weighted average of all outcomes
      const cost = node.cost || 0;
      
      if (children.length === 0) {
        return {
          expectedValue: -cost,
          breakdown: {
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.node_type,
            value: -cost
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
        // For chance nodes, use their probability; for others, assume equal probability
        const probability = isChanceNode(child) && child.probability !== null && child.probability !== undefined 
          ? child.probability 
          : 1 / children.length; // Equal probability if not specified
        
        weightedSum += outcome.expectedValue * probability;
        return outcome.breakdown;
      });
      
      const chanceValue = weightedSum - cost;
      
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
    } else {
      // Unknown node type - treat as terminal with 0 value
      console.warn(`Unknown node type: ${node.node_type}, treating as terminal with 0 utility`);
      const cost = node.cost || 0;
      return {
        expectedValue: -cost,
        breakdown: {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.node_type,
          value: -cost
        }
      };
    }
  }

  /**
   * Formats calculation result for display
   */
  static formatCalculationResult(result: CalculationResult): string {
    const formatBreakdown = (breakdown: CalculationBreakdown, indent = 0): string => {
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
    
    const findBestPath = (breakdown: CalculationBreakdown): void => {
      if (breakdown.children && breakdown.children.length > 0) {
        if (breakdown.nodeType === NodeType.DECISION || breakdown.nodeType === 'decision') {
          // For decision nodes, find the child with highest value
          const bestChild = breakdown.children.reduce((best, current) => 
            current.value > best.value ? current : best
          );
          path.push(`→ Choose: ${bestChild.nodeName}`);
          findBestPath(bestChild);
        } else if (breakdown.nodeType === NodeType.CHANCE || breakdown.nodeType === 'chance') {
          // For chance nodes, show the most likely outcome
          const mostLikelyChild = breakdown.children.reduce((best, current) => {
            // In a real implementation, you'd want to track probabilities through the breakdown
            // For now, just show the first child as an example
            return current.value > best.value ? current : best;
          });
          path.push(`→ If: ${mostLikelyChild.nodeName}`);
          findBestPath(mostLikelyChild);
        }
      }
    };
    
    findBestPath(result.breakdown);
    return path;
  }

  /**
   * Gets summary statistics for the calculation
   */
  static getCalculationSummary(result: CalculationResult): {
    totalNodes: number;
    decisionNodes: number;
    chanceNodes: number;
    terminalNodes: number;
    expectedValue: number;
    recommendedPath: string[];
  } {
    const stats = {
      totalNodes: 0,
      decisionNodes: 0,
      chanceNodes: 0,
      terminalNodes: 0
    };

    const countNodes = (breakdown: CalculationBreakdown): void => {
      stats.totalNodes++;
      
      switch (breakdown.nodeType) {
        case NodeType.DECISION:
        case 'decision':
          stats.decisionNodes++;
          break;
        case NodeType.CHANCE:
        case 'chance':
          stats.chanceNodes++;
          break;
        case NodeType.TERMINAL:
        case 'terminal':
          stats.terminalNodes++;
          break;
      }

      if (breakdown.children) {
        breakdown.children.forEach(child => countNodes(child));
      }
    };

    countNodes(result.breakdown);

    return {
      ...stats,
      expectedValue: result.expectedValue,
      recommendedPath: this.getOptimalPath(result)
    };
  }

  /**
   * Validates individual node for expected value calculation
   */
  static validateNode(node: TreeNode): string[] {
    const errors: string[] = [];

    if (!node.name || node.name.trim().length === 0) {
      errors.push('Node must have a name');
    }

    if (isChanceNode(node)) {
      if (node.probability === null || node.probability === undefined) {
        errors.push('Chance node must have a probability value');
      } else if (node.probability < 0 || node.probability > 1) {
        errors.push('Probability must be between 0 and 1');
      }
    } else if (isTerminalNode(node)) {
      if (node.utility === null || node.utility === undefined) {
        errors.push('Terminal node must have a utility value');
      }
    }

    if (node.cost !== null && node.cost !== undefined && node.cost < 0) {
      errors.push('Cost cannot be negative');
    }

    return errors;
  }
}

export default ExpectedValueCalculator;
export type { ValidationResult, CalculationResult, CalculationBreakdown };