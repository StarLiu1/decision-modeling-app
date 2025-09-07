// Fixed frontend/src/pages/dashboard/Dashboard.tsx
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiService } from '../../services/api'
import { DecisionTree } from '../../types/DecisionTree'

const Dashboard: React.FC = () => {
  const [trees, setTrees] = useState<DecisionTree[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Test API connection first
      const isConnected = await apiService.testConnection()
      setConnectionStatus(isConnected ? 'connected' : 'disconnected')

      if (isConnected) {
        // Load trees data
        const fetchedTrees = await apiService.getTrees()
        setTrees(fetchedTrees)
      } else {
        setError('Cannot connect to backend API. Please ensure the backend is running on http://localhost:8000')
      }
    } catch (err) {
      console.error('Dashboard API Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      setConnectionStatus('disconnected')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    loadDashboardData()
  }

  const getStatusColor = (status: typeof connectionStatus) => {
    switch (status) {
      case 'connected': return 'text-green-600'
      case 'disconnected': return 'text-red-600'
      case 'checking': return 'text-yellow-600'
    }
  }

  const getStatusText = (status: typeof connectionStatus) => {
    switch (status) {
      case 'connected': return 'Connected'
      case 'disconnected': return 'Disconnected'
      case 'checking': return 'Checking...'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-1">Overview of your decision trees and recent activity</p>
        </div>

        {/* Connection Status Banner */}
        <div className={`mb-6 p-4 rounded-lg border ${
          connectionStatus === 'connected' 
            ? 'bg-green-50 border-green-200' 
            : connectionStatus === 'disconnected'
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className={`font-medium ${getStatusColor(connectionStatus)}`}>
                Backend API: {getStatusText(connectionStatus)}
              </span>
            </div>
            {connectionStatus === 'disconnected' && (
              <button
                onClick={handleRetry}
                className="text-sm bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded transition-colors"
              >
                Retry Connection
              </button>
            )}
          </div>
          {connectionStatus === 'connected' && (
            <div className="text-sm text-green-700 mt-2">
              ✅ All services operational: FastAPI backend, PostgreSQL database, Redis cache
            </div>
          )}
          {connectionStatus === 'disconnected' && (
            <div className="text-sm text-red-700 mt-2">
              ❌ Cannot reach backend. Make sure the backend is running: <code className="bg-red-100 px-1 rounded">uvicorn app.main:app --reload</code>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
                <div className="mt-4">
                  <button
                    onClick={handleRetry}
                    className="text-sm bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {connectionStatus === 'connected' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📊</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Trees</dt>
                      <dd className="text-lg font-medium text-gray-900">{trees.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📝</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Nodes</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {trees.reduce((sum, tree) => sum + (tree.node_count || 0), 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">⭐</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Templates</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {trees.filter(tree => tree.is_template).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Trees */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Your Decision Trees</h3>
              <Link
                to="/modeling"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Create New Tree
              </Link>
            </div>
            
            {connectionStatus === 'connected' ? (
              trees.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-gray-400 text-xl">📊</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No decision trees yet</h3>
                  <p className="text-gray-500 mb-4">
                    Get started by creating your first decision tree to model complex decisions.
                  </p>
                  <Link
                    to="/modeling"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create Your First Tree
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {trees.map((tree) => (
                    <div key={tree.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{tree.name}</h4>
                          {tree.description && (
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">{tree.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                            <span>{tree.node_count || 0} nodes</span>
                            <span>Updated {new Date(tree.updated_at).toLocaleDateString()}</span>
                            {tree.is_template && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Template
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Link
                          to="/modeling"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Open in Modeling →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Connect to backend to view your decision trees</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {connectionStatus === 'connected' && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/modeling"
                className="flex items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center mr-3">
                  <span className="text-white text-sm">+</span>
                </div>
                <span className="font-medium text-gray-900">New Tree</span>
              </Link>

              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center mr-3">
                  <span className="text-white text-sm">📘</span>
                </div>
                <span className="font-medium text-gray-900">API Docs</span>
              </a>

              <button
                onClick={handleRetry}
                className="flex items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 bg-gray-500 rounded flex items-center justify-center mr-3">
                  <span className="text-white text-sm">🔄</span>
                </div>
                <span className="font-medium text-gray-900">Refresh Data</span>
              </button>

              <Link
                to="/analysis"
                className="flex items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center mr-3">
                  <span className="text-white text-sm">📈</span>
                </div>
                <span className="font-medium text-gray-900">Analysis</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard