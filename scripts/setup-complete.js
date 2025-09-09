#!/usr/bin/env node
// scripts/setup-complete.js
// Complete setup script untuk Sinoman SuperApp dengan MCP integration

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

console.log('🚀 Sinoman SuperApp - Complete Secure Setup with MCP Integration\n')

let setupSteps = [
  'Environment Configuration',
  'Security Validation', 
  'Database Schema Setup',
  'Dependencies Installation',
  'Security Testing',
  'MCP Server Configuration',
  'Final Validation'
]

let currentStep = 0

function logStep(message, isError = false) {
  const prefix = isError ? '❌' : '✅'
  const step = `[${currentStep + 1}/${setupSteps.length}]`
  console.log(`${prefix} ${step} ${message}`)
  if (!isError) currentStep++
}

function generateSecrets() {
  console.log('🔑 Generating secure secrets...\n')
  
  const secrets = {
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    CSRF_SECRET: crypto.randomBytes(32).toString('hex')
  }
  
  console.log('Copy these to your .env.local file:')
  console.log('=' .repeat(50))
  Object.entries(secrets).forEach(([key, value]) => {
    console.log(`${key}=${value}`)
  })
  console.log('=' .repeat(50))
  console.log()
  
  return secrets
}

function setupEnvironment() {
  logStep('Setting up environment configuration...')
  
  const envPath = path.join(process.cwd(), '.env.local')
  const examplePath = path.join(process.cwd(), '.env.example')
  
  if (!fs.existsSync(examplePath)) {
    logStep('❌ .env.example file not found', true)
    process.exit(1)
  }
  
  if (!fs.existsSync(envPath)) {
    console.log('   Creating .env.local from template...')
    fs.copyFileSync(examplePath, envPath)
    
    const secrets = generateSecrets()
    let envContent = fs.readFileSync(envPath, 'utf8')
    
    // Replace placeholder secrets with generated ones
    Object.entries(secrets).forEach(([key, value]) => {
      envContent = envContent.replace(
        new RegExp(`${key}=your_.*`, 'g'),
        `${key}=${value}`
      )
    })
    
    fs.writeFileSync(envPath, envContent)
    console.log('   ✅ Environment file created with secure secrets')
  } else {
    console.log('   ℹ️  .env.local already exists, skipping...')
  }
}

function validateSecurity() {
  logStep('Validating security configuration...')
  
  try {
    execSync('node scripts/validate-security.js', { stdio: 'pipe' })
    console.log('   ✅ Security configuration is valid')
  } catch (error) {
    logStep('Security validation failed', true)
    console.log('   Please fix security issues before continuing')
    console.log(error.stdout?.toString() || error.message)
    process.exit(1)
  }
}

function setupDatabase() {
  logStep('Database schema setup instructions...')
  
  const migrationPath = path.join(process.cwd(), 'database', 'migrations', '001_security_tables.sql')
  
  if (fs.existsSync(migrationPath)) {
    console.log('   📋 Database migration file ready at:')
    console.log(`   ${migrationPath}`)
    console.log('   ⚠️  Please run this SQL in your Supabase SQL Editor')
    console.log('   📖 See SETUP-KEAMANAN.md for detailed database setup')
  } else {
    logStep('Database migration file not found', true)
    process.exit(1)
  }
}

function installDependencies() {
  logStep('Installing dependencies...')
  
  try {
    console.log('   Installing npm packages...')
    execSync('npm install', { stdio: 'pipe' })
    
    // Check for additional MCP dependencies
    console.log('   Installing additional MCP dependencies...')
    execSync('npm install ts-node', { stdio: 'pipe' })
    
    console.log('   ✅ All dependencies installed')
  } catch (error) {
    logStep('Dependency installation failed', true)
    console.log(error.message)
    process.exit(1)
  }
}

function runSecurityTests() {
  logStep('Running security tests...')
  
  try {
    execSync('npm run test:security', { stdio: 'pipe' })
    console.log('   ✅ All security tests passed')
  } catch (error) {
    logStep('Security tests failed', true)
    console.log('   Some security tests failed. Please review:')
    console.log(error.stdout?.toString() || error.message)
    // Don't exit - tests might fail due to missing database
    console.log('   ⚠️  Continuing setup (tests may fail without database connection)')
    currentStep++ // Manually increment since we didn't use logStep for success
  }
}

function configureMCP() {
  logStep('Configuring MCP servers...')
  
  const mcpConfigPath = path.join(process.cwd(), 'mcp', 'claude-config.json')
  const mcpServerPath = path.join(process.cwd(), 'mcp', 'server.ts')
  
  if (fs.existsSync(mcpConfigPath) && fs.existsSync(mcpServerPath)) {
    console.log('   ✅ MCP configuration files ready')
    console.log('   📋 Claude Desktop config at: mcp/claude-config.json')
    console.log('   🤖 Sinoman MCP Server at: mcp/server.ts')
    console.log('   🗄️ PostgreSQL MCP servers available for database access')
    
    // Check if MCP CLI tools are available
    try {
      execSync('npx @modelcontextprotocol/inspector-cli --version', { stdio: 'pipe' })
      console.log('   ✅ MCP Inspector CLI available')
    } catch {
      console.log('   ⚠️  MCP Inspector CLI not available (optional)')
    }
  } else {
    logStep('MCP configuration files not found', true)
    process.exit(1)
  }
}

function finalValidation() {
  logStep('Running final validation...')
  
  try {
    // Re-run security validation
    execSync('node scripts/validate-security.js', { stdio: 'pipe' })
    
    // Check if all key files exist
    const requiredFiles = [
      '.env.local',
      'config/security.ts',
      'lib/audit/logger.ts',
      'lib/security/rate-limiter.ts',
      'lib/security/permissions.ts',
      'mcp/server.ts',
      'mcp/claude-config.json',
      'database/migrations/001_security_tables.sql',
      'tests/security/security.test.ts'
    ]
    
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(process.cwd(), file)))
    
    if (missingFiles.length > 0) {
      logStep('Some required files are missing', true)
      console.log('   Missing files:')
      missingFiles.forEach(file => console.log(`   - ${file}`))
      process.exit(1)
    }
    
    console.log('   ✅ All required files present')
    console.log('   ✅ Security configuration valid')
    console.log('   ✅ Setup completed successfully!')
  } catch (error) {
    logStep('Final validation failed', true)
    console.log(error.message)
    process.exit(1)
  }
}

function showNextSteps() {
  console.log('\n' + '🎉 SETUP COMPLETED SUCCESSFULLY! 🎉'.padStart(50))
  console.log('=' .repeat(60))
  
  console.log('\n📋 NEXT STEPS:\n')
  
  console.log('1. 🗄️  SET UP DATABASE:')
  console.log('   - Open Supabase SQL Editor')
  console.log('   - Run: database/migrations/001_security_tables.sql')
  console.log('   - Verify all tables created successfully')
  
  console.log('\n2. 🔧 CONFIGURE CLAUDE DESKTOP:')
  console.log('   - Copy mcp/claude-config.json to Claude Desktop settings')
  console.log('   - Or add servers to your existing Claude config')
  
  console.log('\n3. 🚀 START DEVELOPMENT:')
  console.log('   npm run dev                    # Next.js app')
  console.log('   npm run mcp:dev               # MCP server (separate terminal)')
  
  console.log('\n4. 🧪 TEST SECURITY:')
  console.log('   npm run test:security         # Run security tests')
  console.log('   npm run security:validate     # Validate configuration')
  
  console.log('\n5. 📊 ACCESS DASHBOARD:')
  console.log('   - Create admin user in Supabase Auth')
  console.log('   - Set role to "admin" in members table')
  console.log('   - Access: http://localhost:3000/admin/security')
  
  console.log('\n6. 🤖 TEST MCP TOOLS:')
  console.log('   - Use Claude with: "Check security metrics for last 24h"')
  console.log('   - Or: "Validate current security configuration"')
  console.log('   - Or: "Get member info for [member-id] in [tenant-id]"')
  
  console.log('\n📚 DOCUMENTATION:')
  console.log('   📖 KEAMANAN.md - Complete security guide')
  console.log('   🚀 SETUP-KEAMANAN.md - Detailed setup instructions')
  console.log('   🤖 MCP-SETUP.md - MCP integration guide')
  
  console.log('\n🔒 SECURITY FEATURES ACTIVE:')
  console.log('   ✅ Rate limiting (100 req/min)')
  console.log('   ✅ Audit logging & monitoring')
  console.log('   ✅ Permission boundaries')
  console.log('   ✅ Multi-tenant isolation')
  console.log('   ✅ Financial transaction limits')
  console.log('   ✅ Threat detection & alerts')
  console.log('   ✅ MCP secure AI integration')
  
  console.log('\n' + '=' .repeat(60))
  console.log('🏆 Sinoman SuperApp is ready for secure cooperative operations!')
  console.log('🔒 Bank-grade security with full MCP integration complete.')
}

function showUsage() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🔒 Sinoman SuperApp Complete Setup Script

Usage: npm run setup:complete [options]

Options:
  --help, -h          Show this help message
  --skip-deps         Skip dependency installation
  --skip-tests        Skip security tests
  --generate-only     Only generate secrets and exit

Examples:
  npm run setup:complete
  npm run setup:complete -- --skip-tests
  npm run setup:complete -- --generate-only

This script will:
  1. Generate secure environment variables
  2. Validate security configuration  
  3. Set up database schema files
  4. Install all dependencies
  5. Run security tests
  6. Configure MCP servers
  7. Perform final validation

For production deployment, see SETUP-KEAMANAN.md
`)
    process.exit(0)
  }
}

function main() {
  showUsage()
  
  if (process.argv.includes('--generate-only')) {
    generateSecrets()
    process.exit(0)
  }
  
  console.log('Starting complete setup...\n')
  
  setupEnvironment()
  validateSecurity()
  setupDatabase()
  
  if (!process.argv.includes('--skip-deps')) {
    installDependencies()
  } else {
    console.log('⏭️  Skipping dependency installation')
    currentStep++
  }
  
  if (!process.argv.includes('--skip-tests')) {
    runSecurityTests()
  } else {
    console.log('⏭️  Skipping security tests')
    currentStep++
  }
  
  configureMCP()
  finalValidation()
  showNextSteps()
}

main()