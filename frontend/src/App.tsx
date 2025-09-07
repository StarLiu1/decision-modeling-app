// frontend/src/App.tsx - Updated to include modeling page
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
          <Route path="/analysis" element={<div>Analysis Page (Coming Soon)</div>} />
          <Route path="/settings" element={<div>Settings Page (Coming Soon)</div>} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App