// Final Corrected ExpectedValueCalculator.ts - Proper probability logic
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
  expectedValue: number;
  utility?: number;
  probability?: number;
  cost: number;
  children?: CalculationBreakdown[];
  calculation?: string; // Human-readable calculation explanation
}

interface CalculationResult {
  expectedValue: number;
  breakdown: CalculationBreakdown;
}

class ExpectedValueCalculator {
  /**
   * Helper function to determine if a chance node is a "choice node" 
   * (direct child of a decision node)
   */
  private static isChoiceNode(node: TreeNode, nodes: TreeNode[]): boolean {
    if (!isChanceNode(node) || !node.parent_node_id) return false;
    
    const parent = nodes.find(n => n.id === node.parent_node_id);
    return parent ? isDecisionNode(parent) : false;
  }

  /**
   * Helper function to determine if a chance node is a "regular chance node"
   * (has uncertainty, not a choice)
   */
  private static isRegularChanceNode(node: TreeNode, nodes: TreeNode[]): boolean {
    return isChanceNode(node) && !this.isChoiceNode(node, nodes);
  }

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

    // Find root nodes
    const rootNodes = nodes.filter(node => !node.parent_node_id);
    
    if (rootNodes.length === 0) {
      errors.push("Tree has no root node");
    } else if (rootNodes.length > 1) {
      warnings.push("Tree has multiple root nodes - using first root for calculation");
    }

    // Validate each node based on its type and context
    nodes.forEach(node => {
      const children = nodes.filter(child => child.parent_node_id === node.id);
      
      if (isTerminalNode(node)) {
        // Terminal nodes must have utility values, never probabilities
        if (node.utility === null || node.utility === undefined) {
          errors.push(`Terminal node "${node.name}" is missing utility value`);
        }
        
        if (node.probability !== null && node.probability !== undefined) {
          errors.push(`Terminal node "${node.name}" should not have probability (probabilities belong on chance nodes)`);
        }
        
        // Terminal nodes should not have children
        if (children.length > 0) {
          warnings.push(`Terminal node "${node.name}" has children (they will be ignored)`);
        }
        
      } else if (isChanceNode(node)) {
        const isChoice = this.isChoiceNode(node, nodes);
        const isRegular = this.isRegularChanceNode(node, nodes);
        
        if (isChoice) {
          // Choice nodes (direct children of decision nodes)
          if (node.probability !== null && node.probability !== undefined) {
            warnings.push(`Choice node "${node.name}" has probability but choices don't have probabilities`);
          }
          
          if (node.utility !== null && node.utility !== undefined) {
            warnings.push(`Choice node "${node.name}" has utility but choices don't have utilities`);
          }
          
          // Choice nodes should have children (the uncertain outcomes)
          if (children.length === 0) {
            errors.push(`Choice node "${node.name}" has no outcomes`);
          }
          
        } else if (isRegular) {
          // Regular chance nodes (uncertain events)
          if (node.probability === null || node.probability === undefined) {
            errors.push(`Chance node "${node.name}" is missing probability value`);
          } else if (node.probability < 0 || node.probability > 1) {
            errors.push(`Chance node "${node.name}" has invalid probability: ${node.probability} (must be 0-1)`);
          }
          
          if (node.utility !== null && node.utility !== undefined) {
            warnings.push(`Chance node "${node.name}" has utility but chance nodes should not have utilities`);
          }
          
          // Regular chance nodes should have children
          if (children.length === 0) {
            errors.push(`Chance node "${node.name}" has no outcomes`);
          }
        }
        
        // For regular chance nodes, validate that children probabilities sum to 1
        if (isRegular && children.length > 0) {
          const chanceChildren = children.filter(child => isChanceNode(child));
          if (chanceChildren.length > 0) {
            let totalProbability = 0;
            let missingProbabilities = 0;
            
            chanceChildren.forEach(child => {
              if (child.probability === null || child.probability === undefined) {
                missingProbabilities++;
                errors.push(`Child chance node "${child.name}" of chance node "${node.name}" is missing probability`);
              } else {
                if (child.probability < 0 || child.probability > 1) {
                  errors.push(`Child chance node "${child.name}" has invalid probability: ${child.probability} (must be 0-1)`);
                }
                totalProbability += child.probability;
              }
            });
            
            // Check probability sum (only if no missing probabilities)
            if (missingProbabilities === 0 && Math.abs(totalProbability - 1.0) > 0.001) {
              errors.push(`Children of chance node "${node.name}" have probabilities that sum to ${totalProbability.toFixed(3)}, should sum to 1.0`);
            }
          }
        }
        
      } else if (isDecisionNode(node)) {
        // Decision nodes should not have probabilities or utilities
        if (node.probability !== null && node.probability !== undefined) {
          warnings.push(`Decision node "${node.name}" has probability but decisions don't have probabilities`);
        }
        
        if (node.utility !== null && node.utility !== undefined) {
          warnings.push(`Decision node "${node.name}" has utility but decisions don't have utilities`);
        }
        
        // Decision nodes should have children (choices)
        if (children.length === 0) {
          warnings.push(`Decision node "${node.name}" has no choices to decide between`);
        }
        
        // Decision nodes typically have chance nodes as children
        const nonChanceChildren = children.filter(child => !isChanceNode(child));
        if (nonChanceChildren.length > 0) {
          warnings.push(`Decision node "${node.name}" has non-chance children - this is unusual in decision trees`);
        }
      }

      // Validate cost (should not be negative)
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
   * Calculates expected value using proper recursive algorithm
   * EV calculation rules:
   * - Terminal nodes: EV = utility - cost
   * - Chance nodes: EV = Σ(probability_i × EV_child_i) - cost
   * - Decision nodes: EV = max(EV_child_i) - cost
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

    // Find root node
    const rootNode = nodes.find(node => !node.parent_node_id);
    
    if (!rootNode) {
      console.error("No root node found");
      return null;
    }

    // Build node map for efficient lookup
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const childrenMap = new Map<string, TreeNode[]>();
    
    // Build children map
    nodes.forEach(node => {
      const children = nodes.filter(child => child.parent_node_id === node.id);
      childrenMap.set(node.id, children);
    });

    // Start recursive calculation from root
    const result = this.calculateNodeExpectedValue(rootNode, nodeMap, childrenMap, nodes);
    
    return {
      expectedValue: result.expectedValue,
      breakdown: result
    };
  }

  /**
   * Recursive function to calculate expected value of a node
   */
  private static calculateNodeExpectedValue(
    node: TreeNode,
    nodeMap: Map<string, TreeNode>,
    childrenMap: Map<string, TreeNode[]>,
    allNodes: TreeNode[]
  ): CalculationBreakdown {
    const children = childrenMap.get(node.id) || [];
    const cost = node.cost || 0;
    
    if (isTerminalNode(node)) {
      // Base case: Terminal node
      // EV = utility - cost
      const utility = node.utility || 0;
      const expectedValue = utility - cost;
      
      return {
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.node_type,
        expectedValue,
        utility,
        cost,
        calculation: `EV = ${utility} (utility) - ${cost} (cost) = ${expectedValue}`
      };
      
    } else if (isChanceNode(node)) {
      // Chance node: Expected value calculation depends on context
      if (children.length === 0) {
        // No children - treat as terminal with 0 utility
        const expectedValue = -cost;
        return {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.node_type,
          expectedValue,
          cost,
          calculation: `EV = 0 (no children) - ${cost} (cost) = ${expectedValue}`,
          children: []
        };
      }
      
      const isChoice = this.isChoiceNode(node, allNodes);
      
      if (isChoice) {
        // Choice node: doesn't have its own probability, just passes through children
        // Calculate EV for each child and take weighted average based on child probabilities
        const childBreakdowns = children.map(child => 
          this.calculateNodeExpectedValue(child, nodeMap, childrenMap, allNodes)
        );
        
        let weightedSum = 0;
        let calculationSteps: string[] = [];
        
        children.forEach((child, index) => {
          const childEV = childBreakdowns[index].expectedValue;
          if (isChanceNode(child)) {
            // Child is a chance node with probability
            const probability = child.probability || 0;
            const contribution = probability * childEV;
            weightedSum += contribution;
            calculationSteps.push(`${probability} × ${childEV.toFixed(2)} = ${contribution.toFixed(2)}`);
          } else {
            // Child is terminal or other type - equal weight
            weightedSum += childEV;
            calculationSteps.push(`${childEV.toFixed(2)}`);
          }
        });
        
        const expectedValue = weightedSum - cost;
        const calculationExplanation = `EV = (${calculationSteps.join(' + ')}) - ${cost} (cost) = ${expectedValue.toFixed(2)}`;
        
        return {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.node_type,
          expectedValue,
          cost,
          calculation: calculationExplanation,
          children: childBreakdowns
        };
        
      } else {
        // Regular chance node: has its own probability, used by parent for weighting
        // For internal calculation, just passes through to children
        const childBreakdowns = children.map(child => 
          this.calculateNodeExpectedValue(child, nodeMap, childrenMap, allNodes)
        );
        
        // If single child, pass through; if multiple, average them
        let childValue = 0;
        if (children.length === 1) {
          childValue = childBreakdowns[0].expectedValue;
        } else {
          childValue = childBreakdowns.reduce((sum, child) => sum + child.expectedValue, 0) / children.length;
        }
        
        const expectedValue = childValue - cost;
        const probability = node.probability || 0;
        
        return {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.node_type,
          expectedValue,
          probability,
          cost,
          calculation: `EV = ${childValue.toFixed(2)} (from children) - ${cost} (cost) = ${expectedValue.toFixed(2)}`,
          children: childBreakdowns
        };
      }
      
    } else if (isDecisionNode(node)) {
      // Decision node: Expected value = max(EV_child_i) - cost
      if (children.length === 0) {
        // No children - treat as terminal with 0 utility
        const expectedValue = -cost;
        return {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.node_type,
          expectedValue,
          cost,
          calculation: `EV = 0 (no options) - ${cost} (cost) = ${expectedValue}`,
          children: []
        };
      }
      
      // Calculate EV for each child recursively
      const childBreakdowns = children.map(child => 
        this.calculateNodeExpectedValue(child, nodeMap, childrenMap, allNodes)
      );
      
      // Find the maximum expected value among children
      const maxChildBreakdown = childBreakdowns.reduce((max, current) => 
        current.expectedValue > max.expectedValue ? current : max
      );
      
      const expectedValue = maxChildBreakdown.expectedValue - cost;
      
      const childValues = childBreakdowns.map(child => 
        `${child.nodeName}: ${child.expectedValue.toFixed(2)}`
      ).join(', ');
      
      const calculationExplanation = `EV = max(${childValues}) - ${cost} (cost) = ${expectedValue.toFixed(2)}`;
      
      return {
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.node_type,
        expectedValue,
        cost,
        calculation: calculationExplanation,
        children: childBreakdowns
      };
      
    } else {
      // Unknown node type - treat as terminal with 0 utility
      console.warn(`Unknown node type: ${node.node_type}, treating as terminal`);
      const expectedValue = -cost;
      return {
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.node_type,
        expectedValue,
        cost,
        calculation: `EV = 0 (unknown type) - ${cost} (cost) = ${expectedValue}`
      };
    }
  }

  /**
   * Formats calculation result for display
   */
  static formatCalculationResult(result: CalculationResult): string {
    const formatBreakdown = (breakdown: CalculationBreakdown, indent = 0): string => {
      const spaces = '  '.repeat(indent);
      let output = `${spaces}${breakdown.nodeName} (${breakdown.nodeType}): EV = ${breakdown.expectedValue.toFixed(2)}\n`;
      
      if (breakdown.calculation) {
        output += `${spaces}  Calculation: ${breakdown.calculation}\n`;
      }
      
      if (breakdown.children && breakdown.children.length > 0) {
        output += `${spaces}  Children:\n`;
        breakdown.children.forEach(child => {
          output += formatBreakdown(child, indent + 2);
        });
      }
      
      return output;
    };

    return `Expected Value Analysis\n${'='.repeat(25)}\n\nRoot Expected Value: ${result.expectedValue.toFixed(2)}\n\nDetailed Breakdown:\n${formatBreakdown(result.breakdown)}`;
  }

  /**
   * Gets the optimal decision path through the tree
   */
  static getOptimalPath(result: CalculationResult): string[] {
    const path: string[] = [];
    
    const findOptimalPath = (breakdown: CalculationBreakdown): void => {
      path.push(breakdown.nodeName);
      
      if (breakdown.children && breakdown.children.length > 0) {
        if (breakdown.nodeType === 'decision') {
          // For decision nodes, find the child with highest expected value
          const bestChild = breakdown.children.reduce((best, current) => 
            current.expectedValue > best.expectedValue ? current : best
          );
          path.push(`→ Choose: ${bestChild.nodeName}`);
          findOptimalPath(bestChild);
          
        } else if (breakdown.nodeType === 'chance') {
          // For chance nodes, show outcomes with their probabilities
          breakdown.children.forEach((child, index) => {
            if (index === 0) {
              path.push(`→ Possible outcomes:`);
            }
            const probability = (child.probability || 0) * 100;
            path.push(`   • ${child.nodeName} (${probability.toFixed(1)}% chance, EV: ${child.expectedValue.toFixed(2)})`);
          });
          
          // Continue with the most likely outcome for the path
          const mostLikelyChild = breakdown.children.reduce((best, current) => {
            const currentProb = current.probability || 0;
            const bestProb = best.probability || 0;
            return currentProb > bestProb ? current : best;
          });
          
          if (mostLikelyChild.children && mostLikelyChild.children.length > 0) {
            path.push(`→ Most likely path continues with: ${mostLikelyChild.nodeName}`);
            findOptimalPath(mostLikelyChild);
          }
        }
      }
    };
    
    findOptimalPath(result.breakdown);
    return path;
  }

  /**
   * Gets calculation summary statistics
   */
  static getCalculationSummary(result: CalculationResult): {
    totalNodes: number;
    decisionNodes: number;
    chanceNodes: number;
    terminalNodes: number;
    expectedValue: number;
    optimalPath: string[];
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
        case 'decision':
          stats.decisionNodes++;
          break;
        case 'chance':
          stats.chanceNodes++;
          break;
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
      optimalPath: this.getOptimalPath(result)
    };
  }
}

export default ExpectedValueCalculator;
export type { ValidationResult, CalculationResult, CalculationBreakdown };