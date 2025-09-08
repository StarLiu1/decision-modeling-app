// Fixed ExpectedValueCalculator.ts - Correct decision tree structure logic
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
   * (direct child of a decision node - represents a choice option)
   */
  private static isChoiceNode(node: TreeNode, nodes: TreeNode[]): boolean {
    if (!isChanceNode(node) || !node.parent_node_id) return false;
    
    const parent = nodes.find(n => n.id === node.parent_node_id);
    return parent ? isDecisionNode(parent) : false;
  }

  /**
   * Helper function to determine if a chance node is an "uncertain event"
   * (has uncertainty with probability, not a choice)
   */
  private static isUncertainEvent(node: TreeNode, nodes: TreeNode[]): boolean {
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
          errors.push(`Terminal node "${node.name}" should not have probability - probabilities belong on uncertain chance nodes`);
        }
        
        // Terminal nodes should not have children
        if (children.length > 0) {
          warnings.push(`Terminal node "${node.name}" has children (they will be ignored)`);
        }
        
      } else if (isChanceNode(node)) {
        const isChoice = this.isChoiceNode(node, nodes);
        const isUncertain = this.isUncertainEvent(node, nodes);
        
        if (isChoice) {
          // Choice nodes (direct children of decision nodes)
          if (node.probability !== null && node.probability !== undefined) {
            warnings.push(`Choice node "${node.name}" has probability but choice options don't need probabilities`);
          }
          
          if (node.utility !== null && node.utility !== undefined) {
            warnings.push(`Choice node "${node.name}" has utility but choice options don't have utilities`);
          }
          
          // Choice nodes should have children (the outcomes)
          if (children.length === 0) {
            errors.push(`Choice node "${node.name}" has no outcomes - choices must lead somewhere`);
          }
          
        } else if (isUncertain) {
          // Uncertain event nodes (chance nodes that represent uncertainty)
          if (node.probability === null || node.probability === undefined) {
            errors.push(`Uncertain event "${node.name}" is missing probability value`);
          } else if (node.probability < 0 || node.probability > 1) {
            errors.push(`Uncertain event "${node.name}" has invalid probability: ${node.probability} (must be 0-1)`);
          }
          
          if (node.utility !== null && node.utility !== undefined) {
            warnings.push(`Uncertain event "${node.name}" has utility but uncertain events should not have utilities`);
          }
          
          // Uncertain events should have children
          if (children.length === 0) {
            errors.push(`Uncertain event "${node.name}" has no outcomes`);
          }
        }
        
        // For uncertain events with multiple children, validate probability sums
        if (isUncertain && children.length > 1) {
          // If children are also uncertain events, their probabilities should sum to 1
          const uncertainChildren = children.filter(child => this.isUncertainEvent(child, nodes));
          if (uncertainChildren.length > 1) {
            let totalProbability = 0;
            let missingProbabilities = 0;
            
            uncertainChildren.forEach(child => {
              if (child.probability === null || child.probability === undefined) {
                missingProbabilities++;
                errors.push(`Uncertain event "${child.name}" under "${node.name}" is missing probability`);
              } else {
                if (child.probability < 0 || child.probability > 1) {
                  errors.push(`Uncertain event "${child.name}" has invalid probability: ${child.probability}`);
                }
                totalProbability += child.probability;
              }
            });
            
            // Check probability sum (only if no missing probabilities)
            if (missingProbabilities === 0 && Math.abs(totalProbability - 1.0) > 0.001) {
              errors.push(`Uncertain events under "${node.name}" have probabilities that sum to ${totalProbability.toFixed(3)}, should sum to 1.0`);
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
   * Calculates expected value using proper recursive algorithm for the corrected tree structure
   * EV calculation rules:
   * - Terminal nodes: EV = utility - cost
   * - Choice nodes (chance under decision): EV = pass through to children, no probability weighting
   * - Uncertain events (chance with probability): EV = pass through, parent uses probability for weighting
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
      const isChoice = this.isChoiceNode(node, allNodes);
      const isUncertain = this.isUncertainEvent(node, allNodes);
      
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
      
      if (isChoice) {
        // Choice node: Calculate EV for each outcome and take probability-weighted average
        const childBreakdowns = children.map(child => 
          this.calculateNodeExpectedValue(child, nodeMap, childrenMap, allNodes)
        );
        
        let weightedSum = 0;
        let calculationSteps: string[] = [];
        
        // For choice nodes, we need to look at how the outcomes are structured
        children.forEach((child, index) => {
          const childEV = childBreakdowns[index].expectedValue;
          
          if (this.isUncertainEvent(child, allNodes)) {
            // Child is an uncertain event with probability
            const probability = child.probability || 0;
            const contribution = probability * childEV;
            weightedSum += contribution;
            calculationSteps.push(`${probability} × ${childEV.toFixed(2)} = ${contribution.toFixed(2)}`);
          } else {
            // Child is terminal or choice - equal weight or direct value
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
        
      } else if (isUncertain) {
        // Uncertain event: Pass through to children, parent will use our probability for weighting
        const childBreakdowns = children.map(child => 
          this.calculateNodeExpectedValue(child, nodeMap, childrenMap, allNodes)
        );
        
        // Calculate weighted average of children if multiple
        let childValue = 0;
        if (children.length === 1) {
          childValue = childBreakdowns[0].expectedValue;
        } else {
          // For multiple children under uncertain event, take weighted average
          let totalWeight = 0;
          children.forEach((child, index) => {
            if (this.isUncertainEvent(child, allNodes) && child.probability) {
              childValue += child.probability * childBreakdowns[index].expectedValue;
              totalWeight += child.probability;
            } else {
              // If child doesn't have probability, treat as equal weight
              childValue += childBreakdowns[index].expectedValue / children.length;
            }
          });
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
      } else {
        // Fallback for unclassified chance nodes
        const childBreakdowns = children.map(child => 
          this.calculateNodeExpectedValue(child, nodeMap, childrenMap, allNodes)
        );
        
        const avgValue = children.length > 0 
          ? childBreakdowns.reduce((sum, child) => sum + child.expectedValue, 0) / children.length
          : 0;
        
        const expectedValue = avgValue - cost;
        
        return {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.node_type,
          expectedValue,
          cost,
          calculation: `EV = ${avgValue.toFixed(2)} (average of children) - ${cost} (cost) = ${expectedValue.toFixed(2)}`,
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
      path.push(`${breakdown.nodeName} (${breakdown.nodeType})`);
      
      if (breakdown.children && breakdown.children.length > 0) {
        if (breakdown.nodeType === 'decision') {
          // For decision nodes, find the child with highest expected value
          const bestChild = breakdown.children.reduce((best, current) => 
            current.expectedValue > best.expectedValue ? current : best
          );
          path.push(`→ Choose: ${bestChild.nodeName}`);
          findOptimalPath(bestChild);
          
        } else if (breakdown.nodeType === 'chance') {
          // For chance nodes, show the structure
          if (breakdown.children.length === 1) {
            path.push(`→ Leads to: ${breakdown.children[0].nodeName}`);
            findOptimalPath(breakdown.children[0]);
          } else {
            path.push(`→ Possible outcomes:`);
            breakdown.children.forEach(child => {
              if (child.probability !== undefined) {
                const probability = (child.probability * 100).toFixed(1);
                path.push(`   • ${child.nodeName} (${probability}% chance, EV: ${child.expectedValue.toFixed(2)})`);
              } else {
                path.push(`   • ${child.nodeName} (EV: ${child.expectedValue.toFixed(2)})`);
              }
            });
            
            // Continue with the best outcome for demonstration
            const bestChild = breakdown.children.reduce((best, current) => 
              current.expectedValue > best.expectedValue ? current : best
            );
            
            if (bestChild.children && bestChild.children.length > 0) {
              path.push(`→ Best path continues with: ${bestChild.nodeName}`);
              findOptimalPath(bestChild);
            }
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