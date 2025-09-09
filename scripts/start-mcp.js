#!/usr/bin/env node
// scripts/start-mcp.js
// Script untuk menjalankan MCP Server Sinoman dengan validasi keamanan

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Starting Sinoman MCP Server with Security Integration\n')

// Check prerequisites
function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...')
  
  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found')
    console.log('   Run: cp .env.example .env.local')
    console.log('   Then configure your environment variables')
    process.exit(1)
  }
  
  // Check if MCP server file exists
  const serverPath = path.join(process.cwd(), 'mcp', 'server.ts')
  if (!fs.existsSync(serverPath)) {
    console.error('❌ MCP server file not found at mcp/server.ts')
    process.exit(1)
  }
  
  // Check if security config exists
  const securityConfigPath = path.join(process.cwd(), 'config', 'security.ts')
  if (!fs.existsSync(securityConfigPath)) {
    console.error('❌ Security configuration not found at config/security.ts')
    process.exit(1)
  }
  
  console.log('✅ Prerequisites check passed\n')
}

// Validate security configuration
function validateSecurity() {
  console.log('🔒 Validating security configuration...')
  
  try {
    const { execSync } = require('child_process')
    execSync('npm run security:validate', { stdio: 'inherit' })
    console.log('✅ Security validation passed\n')
  } catch (error) {
    console.error('❌ Security validation failed')
    console.log('   Please fix security issues before starting MCP server')
    process.exit(1)
  }
}

// Start MCP server
function startMCPServer() {
  console.log('🔧 Starting MCP Server...')
  
  const serverProcess = spawn('node', [
    '--loader', 'ts-node/esm',
    'mcp/server.ts'
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  })
  
  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start MCP server:', error)
    process.exit(1)
  })
  
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ MCP server exited with code ${code}`)
      process.exit(code)
    }
  })
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down MCP server...')
    serverProcess.kill('SIGINT')
  })
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down MCP server...')
    serverProcess.kill('SIGTERM')
  })
}

// Show usage information
function showUsage() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🔒 Sinoman MCP Server Startup Script

Usage: npm run mcp:start [options]

Options:
  --help, -h          Show this help message
  --skip-validation   Skip security validation (not recommended)
  --dev              Start in development mode
  --prod             Start in production mode

Environment Variables:
  NODE_ENV           Set to 'development' or 'production'
  LOG_LEVEL          Set log level: 'debug', 'info', 'warn', 'error'
  
Examples:
  npm run mcp:start
  npm run mcp:start -- --dev
  npm run mcp:start -- --prod
  
Security Features Included:
  ✅ Rate limiting (100 req/min)
  ✅ Audit logging
  ✅ Permission boundaries
  ✅ Multi-tenant isolation
  ✅ Real-time monitoring
  ✅ Suspicious activity detection
  ✅ Financial transaction limits

For more information, see:
  📚 KEAMANAN.md - Complete security documentation
  🚀 SETUP-KEAMANAN.md - Setup instructions
`)
    process.exit(0)
  }
}

// Main execution
function main() {
  showUsage()
  
  // Set environment based on arguments
  if (process.argv.includes('--dev')) {
    process.env.NODE_ENV = 'development'
    process.env.LOG_LEVEL = 'debug'
  } else if (process.argv.includes('--prod')) {
    process.env.NODE_ENV = 'production'
    process.env.LOG_LEVEL = 'warn'
  }
  
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📊 Log Level: ${process.env.LOG_LEVEL || 'info'}\n`)
  
  checkPrerequisites()
  
  if (!process.argv.includes('--skip-validation')) {
    validateSecurity()
  } else {
    console.log('⚠️  Skipping security validation (NOT RECOMMENDED FOR PRODUCTION)\n')
  }
  
  startMCPServer()
}

main()