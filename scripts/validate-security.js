#!/usr/bin/env node
// scripts/validate-security.js
// Script untuk validasi konfigurasi keamanan Sinoman SuperApp

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

console.log('🔒 Sinoman SuperApp Security Validator\n')

let errors = []
let warnings = []
let passed = 0

// Check environment file
function checkEnvironmentFile() {
  console.log('📋 Checking environment configuration...')
  
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    errors.push('❌ .env.local file not found. Copy .env.example to .env.local')
    return
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'SESSION_SECRET',
    'CSRF_SECRET'
  ]
  
  requiredVars.forEach(varName => {
    if (!envContent.includes(varName) || envContent.includes(`${varName}=your_`)) {
      errors.push(`❌ ${varName} is not properly configured`)
    } else {
      passed++
    }
  })
  
  // Check secret lengths
  const secretVars = ['JWT_SECRET', 'SESSION_SECRET', 'CSRF_SECRET']
  secretVars.forEach(secretVar => {
    const match = envContent.match(new RegExp(`${secretVar}=(.+)`))
    if (match && match[1].length < 32) {
      warnings.push(`⚠️  ${secretVar} should be at least 32 characters long`)
    }
  })
  
  console.log('✅ Environment file check completed\n')
}

// Check database schema
function checkDatabaseSchema() {
  console.log('🗄️  Checking database schema...')
  
  const schemaPath = path.join(process.cwd(), 'database')
  if (!fs.existsSync(schemaPath)) {
    warnings.push('⚠️  Database schema directory not found')
    return
  }
  
  const requiredTables = [
    'audit_logs',
    'security_alerts',
    'members',
    'tenants'
  ]
  
  // This is a simplified check - in production you'd connect to the database
  console.log('ℹ️  Database schema check would require database connection')
  console.log('   Run this after setting up your Supabase database\n')
}

// Check security configuration
function checkSecurityConfig() {
  console.log('⚙️  Checking security configuration...')
  
  const configPath = path.join(process.cwd(), 'config', 'security.ts')
  if (!fs.existsSync(configPath)) {
    errors.push('❌ Security configuration file not found at config/security.ts')
    return
  }
  
  const configContent = fs.readFileSync(configPath, 'utf8')
  
  // Check for important security configurations
  const checks = [
    { pattern: /rateLimit:/, description: 'Rate limiting configuration' },
    { pattern: /securityHeaders:/, description: 'Security headers configuration' },
    { pattern: /password:/, description: 'Password policy configuration' },
    { pattern: /csrf:/, description: 'CSRF protection configuration' },
  ]
  
  checks.forEach(check => {
    if (check.pattern.test(configContent)) {
      passed++
    } else {
      warnings.push(`⚠️  ${check.description} might be missing`)
    }
  })
  
  console.log('✅ Security configuration check completed\n')
}

// Check middleware
function checkMiddleware() {
  console.log('🛡️  Checking security middleware...')
  
  const middlewarePath = path.join(process.cwd(), 'middleware.ts')
  if (!fs.existsSync(middlewarePath)) {
    errors.push('❌ Middleware file not found')
    return
  }
  
  const middlewareContent = fs.readFileSync(middlewarePath, 'utf8')
  
  const securityFeatures = [
    { pattern: /applyRateLimit/, description: 'Rate limiting' },
    { pattern: /checkSuspiciousActivity/, description: 'Suspicious activity detection' },
    { pattern: /auditLogger/, description: 'Audit logging' },
    { pattern: /securityHeaders/, description: 'Security headers' },
  ]
  
  securityFeatures.forEach(feature => {
    if (feature.pattern.test(middlewareContent)) {
      passed++
    } else {
      warnings.push(`⚠️  ${feature.description} not implemented in middleware`)
    }
  })
  
  console.log('✅ Middleware check completed\n')
}

// Check test coverage
function checkTests() {
  console.log('🧪 Checking security tests...')
  
  const testPath = path.join(process.cwd(), 'tests', 'security')
  if (!fs.existsSync(testPath)) {
    warnings.push('⚠️  Security tests directory not found')
    return
  }
  
  const testFiles = fs.readdirSync(testPath).filter(file => file.endsWith('.test.ts'))
  if (testFiles.length === 0) {
    warnings.push('⚠️  No security test files found')
  } else {
    passed += testFiles.length
    console.log(`✅ Found ${testFiles.length} security test file(s)`)
  }
  
  console.log('✅ Security tests check completed\n')
}

// Generate security report
function generateReport() {
  console.log('📊 SECURITY VALIDATION REPORT')
  console.log('=' .repeat(50))
  
  console.log(`\n✅ Passed checks: ${passed}`)
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`)
    warnings.forEach(warning => console.log(`   ${warning}`))
  }
  
  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`)
    errors.forEach(error => console.log(`   ${error}`))
  }
  
  console.log('\n' + '='.repeat(50))
  
  if (errors.length === 0) {
    console.log('🎉 Security validation completed successfully!')
    console.log('✅ Your application appears to be properly secured.')
    
    if (warnings.length > 0) {
      console.log('\n💡 Consider addressing the warnings above for enhanced security.')
    }
  } else {
    console.log('🚨 Security validation failed!')
    console.log('❌ Please fix the errors above before deploying to production.')
    process.exit(1)
  }
}

// Generate random secret helper
function generateSecrets() {
  if (process.argv.includes('--generate-secrets')) {
    console.log('\n🔑 Generated secure secrets for .env.local:\n')
    
    const secrets = [
      'JWT_SECRET',
      'SESSION_SECRET', 
      'CSRF_SECRET'
    ]
    
    secrets.forEach(secretName => {
      const secret = crypto.randomBytes(32).toString('hex')
      console.log(`${secretName}=${secret}`)
    })
    
    console.log('\n⚠️  Copy these to your .env.local file and keep them secure!')
    return
  }
}

// Show usage
function showUsage() {
  if (process.argv.includes('--help')) {
    console.log('Usage: npm run security:validate [options]')
    console.log('\nOptions:')
    console.log('  --help              Show this help message')
    console.log('  --generate-secrets  Generate secure secrets for environment variables')
    console.log('\nExamples:')
    console.log('  npm run security:validate')
    console.log('  npm run security:validate -- --generate-secrets')
    return true
  }
  return false
}

// Main execution
function main() {
  if (showUsage()) return
  
  generateSecrets()
  if (process.argv.includes('--generate-secrets')) return
  
  console.log('Starting security validation...\n')
  
  checkEnvironmentFile()
  checkDatabaseSchema()
  checkSecurityConfig()
  checkMiddleware()
  checkTests()
  generateReport()
  
  console.log('\n📚 For more information, see KEAMANAN.md')
  console.log('🔗 Security documentation: https://docs.sinoman-app.com/security')
}

main()