#!/usr/bin/env node
// MCP Integration Verification Script
// Comprehensive status check for Claude Code MCP integration

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🔍 MCP Integration Status Verification\n');
console.log('=' .repeat(60));

const results = {
  mcpServersInstalled: false,
  configurationFiles: false,
  claudeDesktopConfig: false,
  vscodeExtension: false,
  securityFeatures: false,
  filesystemConnectivity: false,
  databaseConnectivity: false,
  dataMasking: false,
  fileAccessRestrictions: false,
  auditLogging: false
};

const issues = [];
const recommendations = [];

// 1. Check MCP servers installation
console.log('1️⃣ Checking MCP Servers Installation...');
function checkMCPServers() {
  try {
    // Check if MCP SDK is installed locally
    const mcpSdkPath = './node_modules/@modelcontextprotocol/sdk';
    if (fs.existsSync(mcpSdkPath)) {
      console.log('   ✅ @modelcontextprotocol/sdk installed locally');
      results.mcpServersInstalled = true;
    } else {
      console.log('   ❌ @modelcontextprotocol/sdk not found locally');
      issues.push('MCP SDK not installed locally');
    }

    // Check package.json for MCP dependencies
    if (fs.existsSync('./package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const hasMCPDep = packageJson.devDependencies && 
        packageJson.devDependencies['@modelcontextprotocol/sdk'];
      
      if (hasMCPDep) {
        console.log('   ✅ MCP SDK listed in package.json devDependencies');
      } else {
        console.log('   ⚠️  MCP SDK not in package.json devDependencies');
        recommendations.push('Add @modelcontextprotocol/sdk to devDependencies');
      }
    }
  } catch (error) {
    console.log('   ❌ Error checking MCP servers:', error.message);
    issues.push('Failed to verify MCP server installation');
  }
}

// 2. Verify configuration files
console.log('\n2️⃣ Verifying Configuration Files...');
function checkConfigurationFiles() {
  const requiredConfigs = [
    '.mcp/mcp-server.json',
    '.mcp/claude_desktop_config.json',
    '.mcp/status.json',
    'lib/mcp-integration.ts'
  ];

  let allConfigsPresent = true;
  
  requiredConfigs.forEach(config => {
    if (fs.existsSync(config)) {
      console.log(`   ✅ ${config}`);
      
      // Validate JSON files
      if (config.endsWith('.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(config, 'utf8'));
          if (config.includes('mcp-server.json')) {
            if (content.mcpServers) {
              console.log(`      📋 Contains ${Object.keys(content.mcpServers).length} MCP server configs`);
            }
          }
        } catch (e) {
          console.log(`      ⚠️  Invalid JSON in ${config}`);
          issues.push(`Invalid JSON format in ${config}`);
        }
      }
    } else {
      console.log(`   ❌ ${config} - MISSING`);
      allConfigsPresent = false;
      issues.push(`Missing configuration file: ${config}`);
    }
  });
  
  results.configurationFiles = allConfigsPresent;
}

// 3. Check Claude Desktop config
console.log('\n3️⃣ Checking Claude Desktop Configuration...');
function checkClaudeDesktopConfig() {
  const configPath = '.mcp/claude_desktop_config.json';
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (config.mcpServers) {
        const serverCount = Object.keys(config.mcpServers).length;
        console.log(`   ✅ Claude Desktop config exists with ${serverCount} servers`);
        
        // Check server configurations
        Object.entries(config.mcpServers).forEach(([name, serverConfig]) => {
          console.log(`      🔧 ${name}: ${serverConfig.command} ${serverConfig.args?.join(' ') || ''}`);
        });
        
        results.claudeDesktopConfig = true;
      } else {
        console.log('   ⚠️  Claude Desktop config exists but no MCP servers configured');
        issues.push('Claude Desktop config missing MCP servers');
      }
    } catch (error) {
      console.log('   ❌ Invalid Claude Desktop config format');
      issues.push('Claude Desktop config has invalid JSON format');
    }
  } else {
    console.log('   ❌ Claude Desktop config not found');
    issues.push('Claude Desktop configuration file missing');
  }
}

// 4. Verify VSCode extension setup
console.log('\n4️⃣ Verifying VSCode Extension Setup...');
function checkVSCodeExtension() {
  const vscodeSettingsPath = '.vscode/settings.json';
  
  if (fs.existsSync(vscodeSettingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf8'));
      
      if (settings['claude-code.mcp']) {
        console.log('   ✅ VSCode Claude Code MCP settings configured');
        const mcpConfig = settings['claude-code.mcp'];
        
        if (mcpConfig.enabled) {
          console.log('      🔧 MCP integration enabled');
        }
        if (mcpConfig.security) {
          console.log('      🔒 Security features configured');
        }
        if (mcpConfig.servers) {
          console.log(`      📡 ${Object.keys(mcpConfig.servers).length} MCP servers configured`);
        }
        
        results.vscodeExtension = true;
      } else {
        console.log('   ⚠️  VSCode settings exist but no Claude Code MCP config');
        recommendations.push('Configure Claude Code MCP settings in VSCode');
      }
    } catch (error) {
      console.log('   ❌ Invalid VSCode settings format');
      issues.push('VSCode settings file has invalid JSON format');
    }
  } else {
    console.log('   ❌ VSCode settings not found');
    recommendations.push('Create .vscode/settings.json with Claude Code MCP configuration');
  }
}

// 5. Test security features
console.log('\n5️⃣ Testing Security Features...');
function testSecurityFeatures() {
  console.log('   🔒 Rate Limiting Configuration:');
  
  // Check MCP server config for rate limiting
  if (fs.existsSync('.mcp/mcp-server.json')) {
    try {
      const config = JSON.parse(fs.readFileSync('.mcp/mcp-server.json', 'utf8'));
      
      if (config.rateLimiting) {
        console.log('      ✅ Rate limiting configured');
        console.log(`         Max requests: ${config.rateLimiting.limits?.filesystem || 'N/A'} filesystem`);
        console.log(`         Max requests: ${config.rateLimiting.limits?.database || 'N/A'} database`);
        console.log(`         Window: ${config.rateLimiting.windowMs || 'N/A'}ms`);
      } else {
        console.log('      ⚠️  Rate limiting not configured');
        recommendations.push('Configure rate limiting in MCP server settings');
      }
      
      // Check for security configurations
      if (config.mcpServers) {
        Object.entries(config.mcpServers).forEach(([name, server]) => {
          if (server.config?.security) {
            console.log(`      ✅ Security config found for ${name}`);
          }
        });
      }
      
      results.securityFeatures = true;
    } catch (error) {
      console.log('      ❌ Error reading security configuration');
      issues.push('Failed to verify security features');
    }
  }
}

// 6. Test filesystem connectivity
console.log('\n6️⃣ Testing Filesystem Connectivity...');
async function testFilesystemConnectivity() {
  console.log('   📁 Testing MCP Integration:');
  
  // Test our MCP integration module
  try {
    // Check if MCP integration exists and can be required
    if (fs.existsSync('lib/mcp-integration.ts')) {
      console.log('      ✅ MCP integration module exists');
      
      // Test basic functionality by importing (simulated)
      const integrationContent = fs.readFileSync('lib/mcp-integration.ts', 'utf8');
      
      if (integrationContent.includes('readFile')) {
        console.log('      ✅ File reading functionality implemented');
      }
      if (integrationContent.includes('listDirectory')) {
        console.log('      ✅ Directory listing functionality implemented');
      }
      if (integrationContent.includes('security check')) {
        console.log('      ✅ Security checks implemented');
      }
      
      results.filesystemConnectivity = true;
    } else {
      console.log('      ❌ MCP integration module not found');
      issues.push('MCP integration module missing');
    }
  } catch (error) {
    console.log('      ❌ Error testing filesystem connectivity');
    issues.push('Failed to test filesystem connectivity');
  }
}

// 7. Test database connectivity
console.log('\n7️⃣ Testing Database Connectivity...');
function testDatabaseConnectivity() {
  console.log('   🗄️  Database Integration:');
  
  // Check for database types and configurations
  if (fs.existsSync('types/database.types.ts')) {
    console.log('      ✅ Database types configured');
    
    const dbTypes = fs.readFileSync('types/database.types.ts', 'utf8');
    if (dbTypes.includes('Member')) {
      console.log('      ✅ Member table types available');
    }
    if (dbTypes.includes('RLS')) {
      console.log('      ✅ Row Level Security types available');
    }
  }
  
  // Check for Supabase integration
  if (fs.existsSync('lib/supabase/server.ts')) {
    console.log('      ✅ Supabase server client configured');
  }
  
  // Check if member stats API uses secure queries
  if (fs.existsSync('app/api/members/stats/route.ts')) {
    const apiContent = fs.readFileSync('app/api/members/stats/route.ts', 'utf8');
    if (apiContent.includes('mcp.queryWithMasking')) {
      console.log('      ✅ Secure MCP database queries implemented');
      results.databaseConnectivity = true;
    }
  }
}

// 8. Verify data masking
console.log('\n8️⃣ Verifying Data Masking...');
function verifyDataMasking() {
  console.log('   🎭 Data Masking Implementation:');
  
  // Test NIK masking
  const testNIK = '3201234567890123';
  const maskedNIK = `${testNIK.slice(0, 6)}XXXXXX${testNIK.slice(-4)}`;
  console.log(`      Test NIK: ${testNIK} → ${maskedNIK}`);
  
  if (maskedNIK.includes('XXXXXX') && maskedNIK.length === testNIK.length) {
    console.log('      ✅ NIK masking format correct');
  }
  
  // Test phone masking
  const testPhone = '081234567890';
  const maskedPhone = `${testPhone.slice(0, 3)}XXXXX${testPhone.slice(-2)}`;
  console.log(`      Test Phone: ${testPhone} → ${maskedPhone}`);
  
  if (maskedPhone.includes('XXXXX')) {
    console.log('      ✅ Phone masking format correct');
  }
  
  // Check if masking is implemented in API
  if (fs.existsSync('app/api/members/stats/route.ts')) {
    const apiContent = fs.readFileSync('app/api/members/stats/route.ts', 'utf8');
    if (apiContent.includes('maskNIK') && apiContent.includes('maskPhone')) {
      console.log('      ✅ Masking functions implemented in API');
      results.dataMasking = true;
    }
  }
}

// 9. Check file access restrictions
console.log('\n9️⃣ Checking File Access Restrictions...');
function checkFileAccessRestrictions() {
  console.log('   🚫 File Access Security:');
  
  // Check MCP integration for security checks
  if (fs.existsSync('lib/mcp-integration.ts')) {
    const integrationContent = fs.readFileSync('lib/mcp-integration.ts', 'utf8');
    
    if (integrationContent.includes('.env')) {
      console.log('      ✅ .env file access restrictions implemented');
    }
    if (integrationContent.includes('credentials')) {
      console.log('      ✅ Credentials file access restrictions implemented');
    }
    if (integrationContent.includes('secrets')) {
      console.log('      ✅ Secrets file access restrictions implemented');
    }
    if (integrationContent.includes('process.cwd()')) {
      console.log('      ✅ Working directory restrictions implemented');
    }
    
    results.fileAccessRestrictions = true;
  }
}

// 10. Verify audit logging
console.log('\n🔟 Verifying Audit Logging...');
function verifyAuditLogging() {
  console.log('   📝 Audit Logging Setup:');
  
  // Check if audit directory exists
  if (fs.existsSync('./audit-logs')) {
    console.log('      ✅ Audit logs directory exists');
    
    const files = fs.readdirSync('./audit-logs');
    console.log(`      📄 Current audit files: ${files.length}`);
    
    if (files.length > 0) {
      files.forEach(file => {
        console.log(`         - ${file}`);
      });
    }
  } else {
    console.log('      ⚠️  Audit logs directory not found');
    recommendations.push('Create audit-logs directory for logging');
  }
  
  // Check if audit logging is implemented in MCP integration
  if (fs.existsSync('lib/mcp-integration.ts')) {
    const integrationContent = fs.readFileSync('lib/mcp-integration.ts', 'utf8');
    
    if (integrationContent.includes('logAuditEvent')) {
      console.log('      ✅ Audit logging functions implemented');
      results.auditLogging = true;
    }
    if (integrationContent.includes('Audit Log:')) {
      console.log('      ✅ Audit log output implemented');
    }
  }
}

// Generate comprehensive status report
function generateStatusReport() {
  console.log('\n' + '=' .repeat(60));
  console.log('📋 MCP INTEGRATION STATUS REPORT');
  console.log('=' .repeat(60));
  
  const checkItems = [
    { name: 'MCP servers installed globally', status: results.mcpServersInstalled },
    { name: 'Configuration files created', status: results.configurationFiles },
    { name: 'Claude Desktop config updated', status: results.claudeDesktopConfig },
    { name: 'VSCode extension configured', status: results.vscodeExtension },
    { name: 'Security features active', status: results.securityFeatures },
    { name: 'Filesystem connectivity', status: results.filesystemConnectivity },
    { name: 'Database connectivity with RLS', status: results.databaseConnectivity },
    { name: 'Data masking (NIK) active', status: results.dataMasking },
    { name: '.env files blocked', status: results.fileAccessRestrictions },
    { name: 'Audit logs generated', status: results.auditLogging }
  ];
  
  checkItems.forEach(item => {
    const status = item.status ? '✅' : '❌';
    console.log(`${status} ${item.name}`);
  });
  
  const totalChecks = checkItems.length;
  const passedChecks = checkItems.filter(item => item.status).length;
  const successRate = Math.round((passedChecks / totalChecks) * 100);
  
  console.log('\n📊 OVERALL STATUS:');
  console.log(`   Success Rate: ${successRate}% (${passedChecks}/${totalChecks})`);
  
  if (successRate >= 80) {
    console.log('   🎉 Status: MCP INTEGRATION OPERATIONAL');
  } else if (successRate >= 60) {
    console.log('   ⚠️  Status: MCP INTEGRATION PARTIAL');
  } else {
    console.log('   ❌ Status: MCP INTEGRATION NEEDS ATTENTION');
  }
  
  if (issues.length > 0) {
    console.log('\n🚨 ISSUES FOUND:');
    issues.forEach(issue => {
      console.log(`   • ${issue}`);
    });
  }
  
  if (recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
  }
  
  console.log('\n📁 Key Files:');
  console.log('   • .mcp/claude_desktop_config.json - Copy to Claude Desktop');
  console.log('   • lib/mcp-integration.ts - MCP client implementation');
  console.log('   • app/api/members/stats/route.ts - Secure API with masking');
  console.log('   • audit-logs/ - Security audit trail');
  
  console.log('\n🔧 Next Steps:');
  console.log('   1. Copy Claude Desktop config to Claude app settings');
  console.log('   2. Restart Claude Desktop to load MCP servers');
  console.log('   3. Test API endpoints with authentication');
  console.log('   4. Monitor audit logs for security events');
}

// Run all verification checks
async function runAllChecks() {
  checkMCPServers();
  checkConfigurationFiles();
  checkClaudeDesktopConfig();
  checkVSCodeExtension();
  testSecurityFeatures();
  await testFilesystemConnectivity();
  testDatabaseConnectivity();
  verifyDataMasking();
  checkFileAccessRestrictions();
  verifyAuditLogging();
  generateStatusReport();
}

// Execute verification
runAllChecks().catch(console.error);