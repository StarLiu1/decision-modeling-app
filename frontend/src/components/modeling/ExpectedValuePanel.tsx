// ExpectedValuePanel.tsx
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
    
    // Simulate async calculation (in case we want to add loading state)
    setTimeout(() => {
      const result = ExpectedValueCalculator.calculateExpectedValue(tree.nodes);
      setCalculation(result);
      setIsCalculating(false);
    }, 100);
  };

  const renderValidationStatus = () => {
    if (!validation) return null;

    return (
      <div className="mb-4">
        <div className={`p-3 rounded-lg border ${
          validation.isValid 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center mb-2">
            <span className={`text-sm font-medium ${
              validation.isValid ? 'text-green-800' : 'text-red-800'
            }`}>
              {validation.isValid ? '✓ Tree is ready for analysis' : '✗ Tree has validation errors'}
            </span>
          </div>
          
          {validation.errors.length > 0 && (
            <div className="mt-2">
              <div className="text-sm font-medium text-red-800 mb-1">Errors:</div>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div className="mt-2">
              <div className="text-sm font-medium text-yellow-800 mb-1">Warnings:</div>
              <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
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

    return (
      <div className="space-y-4">
        {/* Expected Value Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-sm font-medium text-blue-800 mb-1">Expected Value</div>
            <div className="text-3xl font-bold text-blue-900">
              ${calculation.expectedValue.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            {showBreakdown ? 'Hide' : 'Show'} Calculation Breakdown
          </button>
          
          <button
            onClick={() => {
              const formatted = ExpectedValueCalculator.formatCalculationResult(calculation);
              navigator.clipboard.writeText(formatted);
            }}
            className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md transition-colors"
          >
            Copy Results
          </button>
        </div>

        {/* Detailed Breakdown */}
        {showBreakdown && (
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="text-sm font-medium text-gray-800 mb-3">Calculation Breakdown</div>
            <div className="space-y-2">
              {renderBreakdownNode(calculation.breakdown, 0)}
            </div>
          </div>
        )}

        {/* Optimal Path */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm font-medium text-green-800 mb-2">Recommended Decision Path</div>
          <div className="space-y-1">
            {ExpectedValueCalculator.getOptimalPath(calculation).map((step, index) => (
              <div key={index} className="flex items-center text-sm text-green-700">
                <span className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                  {index + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderBreakdownNode = (breakdown: CalculationResult['breakdown'], depth: number) => {
    const indent = depth * 20;
    const isDecision = breakdown.nodeType === 'decision';
    const isChance = breakdown.nodeType === 'chance';
    const isTerminal = breakdown.nodeType === 'terminal';

    return (
      <div key={breakdown.nodeId} style={{ marginLeft: `${indent}px` }}>
        <div className={`p-2 rounded border-l-4 ${
          isDecision ? 'border-blue-500 bg-blue-50' :
          isChance ? 'border-red-500 bg-red-50' :
          'border-green-500 bg-green-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-lg ${
                isDecision ? 'text-blue-600' :
                isChance ? 'text-red-600' :
                'text-green-600'
              }`}>
                {isDecision ? '□' : isChance ? '○' : '◊'}
              </span>
              <span className="font-medium text-gray-800">{breakdown.nodeName}</span>
              <span className="text-xs text-gray-500 capitalize">({breakdown.nodeType})</span>
            </div>
            <div className="font-bold text-gray-900">
              ${breakdown.value.toFixed(2)}
            </div>
          </div>
        </div>
        
        {breakdown.children && breakdown.children.map(child => 
          renderBreakdownNode(child, depth + 1)
        )}
      </div>
    );
  };

  const renderRequirements = () => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="text-sm font-medium text-yellow-800 mb-2">Requirements for Expected Value Calculation</div>
      <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
        <li>All terminal nodes must have utility/value specified</li>
        <li>All chance nodes must have probability values (0.0 to 1.0)</li>
        <li>Tree must have a single root node</li>
        <li>No circular references in the tree structure</li>
      </ul>
    </div>
  );

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Expected Value Analysis</h3>
      </div>
      
      <div className="p-4">
        {!tree?.nodes || tree.nodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg mb-2">No tree data</div>
            <div className="text-sm">Create nodes to begin analysis</div>
          </div>
        ) : (
          <>
            {renderValidationStatus()}
            
            {isCalculating && (
              <div className="text-center py-4">
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