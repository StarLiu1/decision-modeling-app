// Fixed frontend/src/main.tsx - Enhanced with error handling and performance
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo })
    
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('React Error Boundary caught an error:', error, errorInfo)
    }
    
    // In production, you might want to send errors to a logging service
    // logErrorToService(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            
            <p className="text-gray-600 mb-4">
              The Decision Modeling Platform encountered an unexpected error. 
              Please try refreshing the page.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mb-4 bg-gray-50 p-3 rounded text-sm">
                <summary className="cursor-pointer font-medium text-red-600 mb-2">
                  Error Details (Development Mode)
                </summary>
                <pre className="whitespace-pre-wrap text-xs text-gray-700 overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                If this problem persists, please contact support or check the browser console for more details.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Performance monitoring
const startTime = performance.now()

// Initialize the app
function initializeApp() {
  const rootElement = document.getElementById('root')
  
  if (!rootElement) {
    throw new Error('Root element not found. Make sure there is an element with id="root" in your HTML.')
  }

  // Create React root
  const root = ReactDOM.createRoot(rootElement)
  
  // Render app with error boundary and strict mode
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )
  
  // Log performance metrics in development
  if (import.meta.env.DEV) {
    const loadTime = performance.now() - startTime
    console.log(`⚡ Decision Modeling Platform loaded in ${loadTime.toFixed(2)}ms`)
    
    // Log environment info
    console.log('🌍 Environment:', import.meta.env.MODE)
    console.log('📦 Vite version:', import.meta.env.VITE_VERSION || 'Unknown')
    console.log('⚛️ React version:', React.version)
    
    // Check if API is accessible
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    console.log('🔗 API Base URL:', apiBaseUrl)
  }
}

// Error handling for initialization
try {
  initializeApp()
} catch (error) {
  console.error('Failed to initialize Decision Modeling Platform:', error)
  
  // Fallback error display if React fails to mount
  const rootElement = document.getElementById('root')
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background-color: #f9fafb;
        margin: 0;
        padding: 20px;
      ">
        <div style="
          background: white;
          padding: 2rem;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 400px;
          width: 100%;
        ">
          <div style="
            width: 64px;
            height: 64px;
            background-color: #fee2e2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
          ">
            <span style="color: #dc2626; font-size: 24px;">⚠️</span>
          </div>
          
          <h2 style="color: #111827; margin-bottom: 0.5rem; font-size: 1.25rem; font-weight: 600;">
            Application Failed to Load
          </h2>
          
          <p style="color: #6b7280; margin-bottom: 1.5rem; line-height: 1.5;">
            The Decision Modeling Platform could not be initialized. This might be due to a browser compatibility issue or corrupted cache.
          </p>
          
          <button 
            onclick="window.location.reload()" 
            style="
              background-color: #3b82f6;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 0.375rem;
              cursor: pointer;
              font-weight: 500;
              margin-right: 0.5rem;
            "
          >
            Reload Page
          </button>
          
          <button 
            onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" 
            style="
              background-color: #6b7280;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 0.375rem;
              cursor: pointer;
              font-weight: 500;
            "
          >
            Clear Cache & Reload
          </button>
          
          <p style="color: #9ca3af; font-size: 0.75rem; margin-top: 1rem;">
            Error: ${error instanceof Error ? error.message : 'Unknown initialization error'}
          </p>
        </div>
      </div>
    `
  }
}

// Hot Module Replacement (HMR) for development
if (import.meta.env.DEV && import.meta.hot) {
  import.meta.hot.accept()
}