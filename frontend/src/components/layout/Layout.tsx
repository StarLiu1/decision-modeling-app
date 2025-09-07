// Fixed frontend/src/components/layout/Layout.tsx - Proper React Router navigation
import React from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()

  // Helper function to determine if a link is active
  const isActiveLink = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard'
    }
    return location.pathname === path
  }

  // Navigation link component with active state styling
  const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActiveLink(to)
          ? 'bg-blue-100 text-blue-900'
          : 'text-gray-700 hover:text-blue-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo/Title */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  {/* Icon placeholder - you can add a logo here */}
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">DT</span>
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Decision Modeling Platform
                  </h1>
                </div>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center space-x-1">
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/modeling">Modeling</NavLink>
              <NavLink to="/analysis">Analysis</NavLink>
              <NavLink to="/settings">Settings</NavLink>
            </div>

            {/* User Menu Placeholder */}
            <div className="flex items-center">
              <div className="relative">
                <button className="flex items-center text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 px-3 py-2 rounded-md">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium text-sm">U</span>
                  </div>
                  <span className="ml-2 hidden sm:block">User</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              <span>Decision Modeling Platform © 2025</span>
            </div>
            <div className="flex space-x-4">
              <span>Version 1.0.0</span>
              <span>•</span>
              <Link to="/help" className="hover:text-gray-700">Help</Link>
              <span>•</span>
              <a 
                href="http://localhost:8000/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-gray-700"
              >
                API Docs
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout