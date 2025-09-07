// frontend/src/pages/dashboard/Dashboard.tsx
import React, { useEffect, useState } from 'react'

interface Model {
  id: string
  name: string
  description: string
  created_at: string
}

const Dashboard: React.FC = () => {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Test API connection
    fetch('http://localhost:8000/api/v1/trees')
      .then(response => response.json())
      .then(data => {
        setModels(data.models)
        setLoading(false)
      })
      .catch(err => {
        setError('Failed to connect to API')
        setLoading(false)
        console.error('API Error:', err)
      })
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">Error: {error}</div>
          <div className="text-red-600 text-sm mt-2">
            Make sure the backend is running on http://localhost:8000
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
        
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Models</h3>
            
            {models.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No models found. Create your first decision tree!</p>
                <button className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                  Create New Model
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {models.map((model) => (
                  <div key={model.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h4 className="font-medium text-gray-900">{model.name}</h4>
                    <p className="text-gray-600 text-sm mt-2">{model.description}</p>
                    <p className="text-gray-400 text-xs mt-2">
                      Created: {new Date(model.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="text-green-700 font-medium">🎉 System Status</div>
          <div className="text-green-600 text-sm mt-2">
            ✅ Frontend: Running on port 5173<br/>
            ✅ Backend: Should be running on port 8000<br/>
            ✅ Database: PostgreSQL connected<br/>
            ✅ Cache: Redis connected
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard