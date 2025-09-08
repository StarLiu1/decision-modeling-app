# Corrected backend/app/services/tree_analysis_service.py - Aligned with frontend calculator logic
from typing import Dict, List, Any, Optional
import networkx as nx
from app.models.decision_tree.decision_tree import DecisionTree, TreeNode, NodeType

class TreeAnalysisService:
    """Service for analyzing decision trees with proper expected value calculation"""
    
    @staticmethod
    def calculate_expected_value(tree: DecisionTree) -> Dict[str, Any]:
        """
        Calculate expected values for all nodes in the tree using proper recursive algorithm
        EV calculation rules:
        - Terminal nodes: EV = utility - cost
        - Chance nodes: EV = Σ(probability_i × EV_child_i) - cost
        - Decision nodes: EV = max(EV_child_i) - cost
        """
        if not tree.nodes:
            return {"error": "Tree has no nodes"}
        
        # Validate tree structure first
        validation = TreeAnalysisService.validate_tree_structure(tree)
        if not validation["valid"]:
            return {
                "error": "Tree validation failed",
                "validation_errors": validation["issues"]
            }
        
        # Build node maps for efficient lookup
        node_dict = {str(node.id): node for node in tree.nodes}
        children_map = {}
        
        for node in tree.nodes:
            children = [child for child in tree.nodes if child.parent_node_id == node.id]
            children_map[str(node.id)] = children
        
        # Find root node
        root_nodes = [node for node in tree.nodes if node.parent_node_id is None]
        if not root_nodes:
            return {"error": "No root node found"}
        
        root_node = root_nodes[0]
        
        # Calculate expected values recursively
        expected_values = {}
        calculation_breakdown = {}
        
        def calculate_node_ev(node: TreeNode) -> float:
            node_id = str(node.id)
            
            if node_id in expected_values:
                return expected_values[node_id]
            
            children = children_map.get(node_id, [])
            cost = node.cost or 0
            
            if node.node_type == "terminal":
                # Terminal node: utility - cost
                utility = node.utility or 0
                ev = utility - cost
                calculation_breakdown[node_id] = {
                    "type": "terminal",
                    "calculation": f"EV = {utility} (utility) - {cost} (cost) = {ev}",
                    "utility": utility,
                    "cost": cost
                }
                
            elif node.node_type == "decision":
                # Decision node: max(EV_child_i) - cost
                if not children:
                    ev = -cost
                    calculation_breakdown[node_id] = {
                        "type": "decision",
                        "calculation": f"EV = 0 (no options) - {cost} (cost) = {ev}",
                        "cost": cost
                    }
                else:
                    child_evs = [calculate_node_ev(child) for child in children]
                    max_ev = max(child_evs)
                    ev = max_ev - cost
                    
                    child_names = [f"{child.name}: {calculate_node_ev(child):.2f}" for child in children]
                    calculation_breakdown[node_id] = {
                        "type": "decision",
                        "calculation": f"EV = max({', '.join(child_names)}) - {cost} (cost) = {ev:.2f}",
                        "cost": cost,
                        "children_evs": child_evs
                    }
                    
            elif node.node_type == "chance":
                # Chance node: Σ(probability_i × EV_child_i) - cost
                if not children:
                    ev = -cost
                    calculation_breakdown[node_id] = {
                        "type": "chance",
                        "calculation": f"EV = 0 (no outcomes) - {cost} (cost) = {ev}",
                        "cost": cost
                    }
                else:
                    weighted_sum = 0
                    calculation_steps = []
                    
                    for child in children:
                        child_ev = calculate_node_ev(child)
                        probability = child.probability or 0
                        contribution = probability * child_ev
                        weighted_sum += contribution
                        calculation_steps.append(f"{probability} × {child_ev:.2f} = {contribution:.2f}")
                    
                    ev = weighted_sum - cost
                    calculation_breakdown[node_id] = {
                        "type": "chance",
                        "calculation": f"EV = ({' + '.join(calculation_steps)}) - {cost} (cost) = {ev:.2f}",
                        "cost": cost,
                        "weighted_sum": weighted_sum
                    }
            else:
                # Unknown node type
                ev = -cost
                calculation_breakdown[node_id] = {
                    "type": "unknown",
                    "calculation": f"EV = 0 (unknown type) - {cost} (cost) = {ev}",
                    "cost": cost
                }
            
            expected_values[node_id] = ev
            return ev
        
        # Calculate EV for all nodes starting from root
        root_ev = calculate_node_ev(root_node)
        
        return {
            "root_expected_value": root_ev,
            "node_expected_values": expected_values,
            "calculation_breakdown": calculation_breakdown,
            "analysis_complete": True,
            "calculation_method": "recursive",
            "root_node_id": str(root_node.id)
        }
    
    @staticmethod
    def validate_tree_structure(tree: DecisionTree) -> Dict[str, Any]:
        """
        Validate the tree structure for expected value calculation readiness
        Uses the same validation logic as the frontend
        """
        issues = []
        warnings = []
        
        if not tree.nodes:
            return {
                "valid": False, 
                "issues": ["Tree has no nodes"],
                "warnings": [],
                "node_count": 0,
                "root_count": 0
            }
        
        # Build parent-child relationships for context-aware validation
        node_map = {node.id: node for node in tree.nodes}
        parent_map = {}
        for node in tree.nodes:
            if node.parent_node_id:
                parent_map[node.id] = node_map.get(node.parent_node_id)
        
        # Find root nodes
        root_nodes = [node for node in tree.nodes if node.parent_node_id is None]
        
        if len(root_nodes) == 0:
            issues.append("Tree has no root node")
        elif len(root_nodes) > 1:
            warnings.append(f"Tree has {len(root_nodes)} root nodes (typically should have 1)")
        
        # Validate each node based on its type and context
        for node in tree.nodes:
            children = [child for child in tree.nodes if child.parent_node_id == node.id]
            parent = parent_map.get(node.id)
            
            if node.node_type == "terminal":
                # Terminal nodes must have utility values
                if node.utility is None:
                    issues.append(f"Terminal node '{node.name}' is missing utility value")
                
                # Terminal nodes should not have children
                if children:
                    warnings.append(f"Terminal node '{node.name}' has children (they will be ignored)")
                
                # Terminal nodes that are children of chance nodes need probabilities
                if parent and parent.node_type == "chance":
                    if node.probability is None:
                        issues.append(f"Terminal node '{node.name}' needs probability (child of chance node '{parent.name}')")
                    elif not (0 <= node.probability <= 1):
                        issues.append(f"Terminal node '{node.name}' has invalid probability: {node.probability} (must be 0-1)")
                elif parent and parent.node_type == "decision":
                    if node.probability is not None:
                        warnings.append(f"Terminal node '{node.name}' has probability but is not child of chance node")
                        
            elif node.node_type == "chance":
                # Chance nodes must have children
                if not children:
                    issues.append(f"Chance node '{node.name}' has no children - cannot calculate expected value")
                
                # Context-aware probability validation
                if parent and parent.node_type == "chance":
                    # Chance nodes that are children of other chance nodes need probabilities
                    if node.probability is None:
                        issues.append(f"Chance node '{node.name}' needs probability (child of chance node '{parent.name}')")
                    elif not (0 <= node.probability <= 1):
                        issues.append(f"Chance node '{node.name}' has invalid probability: {node.probability} (must be 0-1)")
                elif parent and parent.node_type == "decision":
                    # Chance nodes that are children of decision nodes don't need probabilities (they're choices)
                    if node.probability is not None:
                        warnings.append(f"Chance node '{node.name}' has probability but represents a choice (probability not needed)")
                
                # Chance nodes should not have utility
                if node.utility is not None:
                    warnings.append(f"Chance node '{node.name}' has utility but chance nodes should not have utilities")
                
                # Validate that children of chance nodes have probabilities that sum to 1
                if children:
                    total_probability = 0
                    missing_probabilities = 0
                    
                    for child in children:
                        if child.probability is None:
                            missing_probabilities += 1
                            issues.append(f"Child '{child.name}' of chance node '{node.name}' is missing probability")
                        else:
                            if not (0 <= child.probability <= 1):
                                issues.append(f"Child '{child.name}' has invalid probability: {child.probability} (must be 0-1)")
                            total_probability += child.probability
                    
                    # Check probability sum (only if no missing probabilities)
                    if missing_probabilities == 0 and abs(total_probability - 1.0) > 0.001:
                        issues.append(f"Children of chance node '{node.name}' have probabilities that sum to {total_probability:.3f}, should sum to 1.0")
                        
            elif node.node_type == "decision":
                # Decision nodes should have children (choices)
                if not children:
                    warnings.append(f"Decision node '{node.name}' has no choices to decide between")
                
                # Decision nodes should not have probabilities or utilities
                if node.probability is not None:
                    warnings.append(f"Decision node '{node.name}' has probability but decisions don't have probabilities")
                if node.utility is not None:
                    warnings.append(f"Decision node '{node.name}' has utility but decisions don't have utilities")
                
                # Warn if decision node has non-chance children (unusual structure)
                non_chance_children = [child for child in children if child.node_type != "chance"]
                if non_chance_children:
                    warnings.append(f"Decision node '{node.name}' has non-chance children - this is unusual in decision trees")
            
            # Validate cost (should not be negative)
            if node.cost is not None and node.cost < 0:
                warnings.append(f"Node '{node.name}' has negative cost: {node.cost}")
        
        # Additional structural validations
        # Check for orphaned nodes
        node_ids = {node.id for node in tree.nodes}
        for node in tree.nodes:
            if node.parent_node_id and node.parent_node_id not in node_ids:
                issues.append(f"Node '{node.name}' has invalid parent reference")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "node_count": len(tree.nodes),
            "root_count": len(root_nodes)
        }
    
    @staticmethod
    def get_optimal_path(tree: DecisionTree) -> Dict[str, Any]:
        """
        Get the optimal decision path through the tree
        """
        analysis = TreeAnalysisService.calculate_expected_value(tree)
        
        if "error" in analysis:
            return {"error": analysis["error"]}
        
        # Build path from root following optimal decisions
        node_dict = {str(node.id): node for node in tree.nodes}
        children_map = {}
        
        for node in tree.nodes:
            children = [child for child in tree.nodes if child.parent_node_id == node.id]
            children_map[str(node.id)] = children
        
        root_nodes = [node for node in tree.nodes if node.parent_node_id is None]
        if not root_nodes:
            return {"error": "No root node found"}
        
        path = []
        expected_values = analysis["node_expected_values"]
        
        def build_path(node: TreeNode, depth: int = 0):
            path.append({
                "step": len(path) + 1,
                "node_name": node.name,
                "node_type": node.node_type,
                "expected_value": expected_values.get(str(node.id), 0),
                "depth": depth
            })
            
            children = children_map.get(str(node.id), [])
            
            if node.node_type == "decision" and children:
                # For decision nodes, follow the child with highest expected value
                best_child = max(children, key=lambda child: expected_values.get(str(child.id), 0))
                path.append({
                    "step": len(path) + 1,
                    "action": f"Choose: {best_child.name}",
                    "expected_value": expected_values.get(str(best_child.id), 0),
                    "depth": depth + 1
                })
                build_path(best_child, depth + 2)
                
            elif node.node_type == "chance" and children:
                # For chance nodes, show all possible outcomes
                path.append({
                    "step": len(path) + 1,
                    "action": "Possible outcomes:",
                    "depth": depth + 1
                })
                
                for child in children:
                    probability = (child.probability or 0) * 100
                    child_ev = expected_values.get(str(child.id), 0)
                    path.append({
                        "step": len(path) + 1,
                        "action": f"• {child.name} ({probability:.1f}% chance, EV: {child_ev:.2f})",
                        "depth": depth + 2
                    })
                
                # Continue with most likely outcome
                most_likely_child = max(children, key=lambda child: child.probability or 0)
                if most_likely_child.node_type != "terminal":
                    path.append({
                        "step": len(path) + 1,
                        "action": f"Most likely path continues with: {most_likely_child.name}",
                        "depth": depth + 1
                    })
                    build_path(most_likely_child, depth + 2)
        
        build_path(root_nodes[0])
        
        return {
            "optimal_path": path,
            "root_expected_value": analysis["root_expected_value"]
        }
    
    @staticmethod
    def get_sensitivity_analysis(tree: DecisionTree, parameter_ranges: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
        """
        Perform sensitivity analysis by varying key parameters
        parameter_ranges format: {"node_id": {"utility": [min, max], "probability": [min, max]}}
        """
        # This is a placeholder for future sensitivity analysis implementation
        # Would vary parameters within specified ranges and recalculate expected values
        return {
            "message": "Sensitivity analysis not yet implemented",
            "suggested_parameters": ["utility values", "probability values", "cost values"]
        }