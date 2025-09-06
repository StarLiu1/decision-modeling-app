// frontend/src/components/layout/Layout.tsx
import React from 'react'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Decision Modeling Platform
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/" className="text-gray-700 hover:text-gray-900">Dashboard</a>
              <a href="/modeling" className="text-gray-700 hover:text-gray-900">Modeling</a>
              <a href="/analysis" className="text-gray-700 hover:text-gray-900">Analysis</a>
              <a href="/settings" className="text-gray-700 hover:text-gray-900">Settings</a>
            </div>
          </div>
        </div>
      </nav>
      <main>
        {children}
      </main>
    </div>
  )
}

export default Layout