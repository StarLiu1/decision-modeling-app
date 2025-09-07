// Fixed frontend/src/App.tsx - Corrected routing and navigation
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/dashboard/Dashboard'
import ModelingPage from './pages/modeling/ModelingPage'
import './App.css'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/api/v1/trees" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/modeling" element={<ModelingPage />} />
          <Route path="/analysis" element={<div className="p-8 text-center text-gray-500">Analysis Page (Coming Soon)</div>} />
          <Route path="/settings" element={<div className="p-8 text-center text-gray-500">Settings Page (Coming Soon)</div>} />
          {/* Catch-all route for unknown paths */}
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App