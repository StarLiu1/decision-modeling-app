# backend/app/services/tree_analysis_service.py
from typing import Dict, List, Any, Optional
import networkx as nx
from app.models.decision_tree.decision_tree import DecisionTree, TreeNode, NodeType

class TreeAnalysisService:
    """Service for analyzing decision trees"""
    
    @staticmethod
    def calculate_expected_value(tree: DecisionTree) -> Dict[str, Any]:
        """Calculate expected values for all nodes in the tree"""
        if not tree.nodes:
            return {"error": "Tree has no nodes"}
        
        # Build networkx graph
        G = nx.DiGraph()
        node_dict = {str(node.id): node for node in tree.nodes}
        
        for node in tree.nodes:
            G.add_node(str(node.id), node_obj=node)
            if node.parent_node_id:
                G.add_edge(str(node.parent_node_id), str(node.id))
        
        # Calculate expected values bottom-up
        expected_values = {}
        
        def calculate_node_ev(node_id: str) -> float:
            if node_id in expected_values:
                return expected_values[node_id]
            
            node = node_dict[node_id]
            children = list(G.successors(node_id))
            
            if node.node_type == NodeType.TERMINAL:
                # Terminal node: utility minus cost
                ev = (node.utility or 0) - node.cost
                
            elif node.node_type == NodeType.DECISION:
                # Decision node: maximum expected value of children
                if not children:
                    ev = -node.cost
                else:
                    child_evs = [calculate_node_ev(child_id) for child_id in children]
                    ev = max(child_evs) - node.cost
                    
            elif node.node_type == NodeType.CHANCE:
                # Chance node: weighted average of children
                if not children:
                    ev = -node.cost
                else:
                    total_ev = 0
                    total_prob = 0
                    for child_id in children:
                        child_node = node_dict[child_id]
                        child_ev = calculate_node_ev(child_id)
                        prob = child_node.probability or 0
                        total_ev += prob * child_ev
                        total_prob += prob
                    
                    ev = total_ev - node.cost
            else:
                ev = 0
            
            expected_values[node_id] = ev
            return ev
        
        # Calculate for all nodes
        for node_id in G.nodes():
            calculate_node_ev(node_id)
        
        # Find root nodes
        root_nodes = [node for node in tree.nodes if node.parent_node_id is None]
        root_ev = expected_values.get(str(root_nodes[0].id), 0) if root_nodes else 0
        
        return {
            "root_expected_value": root_ev,
            "node_expected_values": {node_id: ev for node_id, ev in expected_values.items()},
            "analysis_complete": True
        }
    
    @staticmethod
    def validate_tree_structure(tree: DecisionTree) -> Dict[str, Any]:
        """Validate the tree structure and return any issues"""
        issues = []
        
        if not tree.nodes:
            return {"valid": False, "issues": ["Tree has no nodes"]}
        
        # Check for root node
        root_nodes = [node for node in tree.nodes if node.parent_node_id is None]
        if len(root_nodes) != 1:
            issues.append(f"Tree must have exactly one root node, found {len(root_nodes)}")
        
        # Check for orphaned nodes
        node_ids = {node.id for node in tree.nodes}
        for node in tree.nodes:
            if node.parent_node_id and node.parent_node_id not in node_ids:
                issues.append(f"Node '{node.name}' has invalid parent reference")
        
        # Check probability consistency for chance nodes
        for node in tree.nodes:
            if node.node_type == NodeType.CHANCE:
                children = [child for child in tree.nodes if child.parent_node_id == node.id]
                if children:
                    total_prob = sum(child.probability or 0 for child in children)
                    if abs(total_prob - 1.0) > 0.001:  # Allow small floating point errors
                        issues.append(f"Chance node '{node.name}' children probabilities sum to {total_prob}, should be 1.0")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "node_count": len(tree.nodes),
            "root_count": len(root_nodes)
        }