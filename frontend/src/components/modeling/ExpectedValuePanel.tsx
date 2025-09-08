// Corrected ExpectedValuePanel.tsx - Updated for new calculator logic
import React, { useState, useEffect } from 'react';
import { DecisionTree } from '../../types/DecisionTree';
import ExpectedValueCalculator, { ValidationResult, CalculationResult } from '../../utils/ExpectedValueCalculator';

interface ExpectedValuePanelProps {
  tree: DecisionTree;
}

const ExpectedValuePanel: React.FC<ExpectedValuePanelProps> = ({ tree }) => {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showOptimalPath, setShowOptimalPath] = useState(false);

  // Validate tree whenever it changes
  useEffect(() => {
    if (tree?.nodes && tree.nodes.length > 0) {
      const validationResult = ExpectedValueCalculator.validateTree(tree.nodes);
      setValidation(validationResult);
      
      // Auto-calculate if tree is valid
      if (validationResult.isValid) {
        calculateExpectedValue();
      } else {
        setCalculation(null);
      }
    } else {
      setValidation(null);
      setCalculation(null);
    }
  }, [tree]);

  const calculateExpectedValue = () => {
    if (!tree?.nodes) return;
    
    setIsCalculating(true);
    
    // Simulate async calculation for better UX
    setTimeout(() => {
      const result = ExpectedValueCalculator.calculateExpectedValue(tree.nodes || []);
      setCalculation(result);
      setIsCalculating(false);
    }, 100);
  };

  const renderValidationStatus = () => {
    if (!validation) return null;

    return (
      <div className="mb-4">
        <div className={`p-4 rounded-lg border ${
          validation.isValid 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center mb-3">
            <span className={`text-lg mr-2 ${
              validation.isValid ? 'text-green-600' : 'text-red-600'
            }`}>
              {validation.isValid ? '✓' : '✗'}
            </span>
            <span className={`font-medium ${
              validation.isValid ? 'text-green-800' : 'text-red-800'
            }`}>
              {validation.isValid ? 'Tree is ready for analysis' : 'Tree has validation errors'}
            </span>
          </div>
          
          {validation.errors.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-medium text-red-800 mb-2">Errors that must be fixed:</div>
              <ul className="text-sm text-red-700 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div>
              <div className="text-sm font-medium text-yellow-800 mb-2">Warnings (calculation will proceed):</div>
              <ul className="text-sm text-yellow-700 space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-yellow-500 mr-2">⚠</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCalculationResult = () => {
    if (!calculation) return null;

    const summary = ExpectedValueCalculator.getCalculationSummary(calculation);

    return (
      <div className="space-y-4">
        {/* Expected Value Display */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="text-center">
            <div className="text-sm font-medium text-blue-800 mb-2">Expected Value</div>
            <div className="text-4xl font-bold text-blue-900 mb-2">
              ${calculation.expectedValue.toFixed(2)}
            </div>
            <div className="text-sm text-blue-700">
              Optimal expected outcome of this decision
            </div>
          </div>
        </div>

        {/* Tree Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-900">{summary.totalNodes}</div>
            <div className="text-xs text-gray-600">Total Nodes</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-900">{summary.decisionNodes}</div>
            <div className="text-xs text-blue-700">Decisions</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-red-900">{summary.chanceNodes}</div>
            <div className="text-xs text-red-700">Chance Events</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-900">{summary.terminalNodes}</div>
            <div className="text-xs text-green-700">Outcomes</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
          >
            {showBreakdown ? 'Hide' : 'Show'} Calculation Breakdown
          </button>
          
          <button
            onClick={() => setShowOptimalPath(!showOptimalPath)}
            className="flex-1 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md transition-colors"
          >
            {showOptimalPath ? 'Hide' : 'Show'} Optimal Path
          </button>
          
          <button
            onClick={() => {
              const formatted = ExpectedValueCalculator.formatCalculationResult(calculation);
              navigator.clipboard.writeText(formatted);
            }}
            className="px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded-md transition-colors"
          >
            Copy Results
          </button>
        </div>

        {/* Optimal Decision Path */}
        {showOptimalPath && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm font-medium text-green-800 mb-3">
              🎯 Recommended Decision Path
            </div>
            <div className="space-y-2">
              {summary.optimalPath.map((step, index) => (
                <div key={index} className="flex items-start text-sm text-green-700">
                  <span className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Breakdown */}
        {showBreakdown && (
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="text-sm font-medium text-gray-800 mb-3">
              📊 Detailed Calculation Breakdown
            </div>
            <div className="space-y-3">
              {renderBreakdownNode(calculation.breakdown, 0)}
            </div>
            
            {/* Calculation Formula Guide */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-2 font-medium">Calculation Formulas:</div>
              <div className="text-xs text-gray-500 space-y-1">
                <div><strong>Terminal:</strong> EV = utility - cost</div>
                <div><strong>Chance:</strong> EV = Σ(probability × child_EV) - cost</div>
                <div><strong>Decision:</strong> EV = max(child_EV) - cost</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBreakdownNode = (breakdown: any, depth: number) => {
    const indent = depth * 24;
    const isDecision = breakdown.nodeType === 'decision';
    const isChance = breakdown.nodeType === 'chance';

    return (
      <div key={breakdown.nodeId} style={{ marginLeft: `${indent}px` }}>
        <div className={`p-3 rounded-lg border-l-4 ${
          isDecision ? 'border-blue-500 bg-blue-50' :
          isChance ? 'border-red-500 bg-red-50' :
          'border-green-500 bg-green-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-lg ${
                isDecision ? 'text-blue-600' :
                isChance ? 'text-red-600' :
                'text-green-600'
              }`}>
                {isDecision ? '□' : isChance ? '○' : '◊'}
              </span>
              <span className="font-medium text-gray-800">{breakdown.nodeName}</span>
              <span className="text-xs text-gray-500 capitalize px-2 py-1 bg-white rounded">
                {breakdown.nodeType}
              </span>
            </div>
            <div className="font-bold text-gray-900">
              EV: ${breakdown.expectedValue.toFixed(2)}
            </div>
          </div>
          
          {/* Show calculation details */}
          {breakdown.calculation && (
            <div className="text-xs text-gray-600 bg-white rounded p-2 font-mono">
              {breakdown.calculation}
            </div>
          )}
          
          {/* Show node-specific properties */}
          <div className="text-xs text-gray-600 mt-2 flex gap-4">
            {breakdown.utility !== undefined && (
              <span>Utility: {breakdown.utility}</span>
            )}
            {breakdown.probability !== undefined && (
              <span>Probability: {(breakdown.probability * 100).toFixed(1)}%</span>
            )}
            {breakdown.cost > 0 && (
              <span>Cost: ${breakdown.cost}</span>
            )}
          </div>
        </div>
        
        {breakdown.children && breakdown.children.map((child: any) => 
          renderBreakdownNode(child, depth + 1)
        )}
      </div>
    );
  };

  const renderRequirements = () => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="text-sm font-medium text-yellow-800 mb-3">
        📋 Requirements for Expected Value Calculation
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-yellow-800 mb-1">Decision Tree Structure:</div>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside ml-2">
            <li><strong>Decision nodes:</strong> Represent choices (no probability/utility needed)</li>
            <li><strong>Chance nodes:</strong> Represent uncertainty or choice options</li>
            <li><strong>Terminal nodes:</strong> Represent final outcomes (require utility)</li>
          </ul>
        </div>
        
        <div>
          <div className="text-sm font-medium text-yellow-800 mb-1">Probability Requirements:</div>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside ml-2">
            <li>Children of chance nodes must have probabilities (0.0 to 1.0)</li>
            <li>Probabilities of chance node children must sum to 1.0</li>
            <li>Choice options (chance nodes under decisions) don't need probabilities</li>
          </ul>
        </div>
        
        <div>
          <div className="text-sm font-medium text-yellow-800 mb-1">Other Requirements:</div>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside ml-2">
            <li>Tree must have a single root node</li>
            <li>No circular references in the tree structure</li>
            <li>Terminal nodes must have utility values</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Expected Value Analysis</h3>
        <p className="text-sm text-gray-600 mt-1">
          Calculate the optimal expected outcome using decision theory
        </p>
      </div>
      
      <div className="p-4">
        {!tree?.nodes || tree.nodes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-lg mb-2">No tree data</div>
            <div className="text-sm">Create nodes to begin analysis</div>
          </div>
        ) : (
          <>
            {renderValidationStatus()}
            
            {isCalculating && (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-gray-500">Calculating expected value...</div>
              </div>
            )}
            
            {calculation && renderCalculationResult()}
            
            {validation && !validation.isValid && renderRequirements()}
          </>
        )}
      </div>
    </div>
  );
};

export default ExpectedValuePanel;