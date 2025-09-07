import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  
  // Development server configuration
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    open: false, // Don't auto-open browser in Docker
    
    // Proxy API calls to backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        timeout: 10000,
        // Add debugging for proxy issues
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url, '→', proxyReq.path);
          });
        }
      }
    },
    
    // Enable CORS for development
    cors: true,
    
    // Hot Module Replacement settings
    hmr: {
      port: 3001, // Use different port for HMR
      host: "0.0.0.0"
    }
  },

  // Build configuration
  build: {
    outDir: "dist",
    sourcemap: true, // Enable source maps for debugging
    target: "esnext", // Use modern JavaScript features
    minify: "terser", // Use terser for better minification
    
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['lodash'],
        }
      }
    },
    
    // Performance optimizations
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit
  },

  // Path resolution
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@utils": path.resolve(__dirname, "./src/utils"),
    }
  },

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:8000'),
  },

  // CSS configuration
  css: {
    devSourcemap: true, // Enable CSS source maps in development
    postcss: {
      plugins: [
        // Add autoprefixer and other PostCSS plugins as needed
      ]
    }
  },

  // Optimization settings
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
    exclude: [
      // Exclude any problematic dependencies
    ]
  },

  // Preview server configuration (for production builds)
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    cors: true
  },

  // Base URL for deployment
  base: "/",
  
  // Asset handling
  assetsInclude: ['**/*.md'], // Include markdown files as assets if needed
  
  // Plugin-specific configurations
  esbuild: {
    // Enable JSX in .js files if needed
    loader: 'tsx',
    include: /src\/.*\.[tj]sx?$/,
    exclude: []
  }
})