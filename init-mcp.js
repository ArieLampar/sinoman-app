#!/usr/bin/env node
// Initialize Claude Code with MCP for Sinoman SuperApp

const fs = require('fs');
const path = require('path');

console.log('🚀 Initializing Claude Code with MCP for Sinoman SuperApp...\n');

// Check if MCP configuration exists
const mcpConfigPath = '.mcp/mcp-server.json';
const claudeConfigPath = '.mcp/claude_desktop_config.json';

if (fs.existsSync(mcpConfigPath)) {
  console.log('✅ MCP server configuration found:', mcpConfigPath);
} else {
  console.log('❌ MCP server configuration not found');
  process.exit(1);
}

if (fs.existsSync(claudeConfigPath)) {
  console.log('✅ Claude Desktop configuration found:', claudeConfigPath);
} else {
  console.log('❌ Claude Desktop configuration not found');
  process.exit(1);
}

// Update Claude Desktop config with current working directory
const claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
const currentDir = process.cwd();

// Update filesystem server path
if (claudeConfig.mcpServers['sinoman-filesystem']) {
  claudeConfig.mcpServers['sinoman-filesystem'].args[2] = currentDir;
  console.log('✅ Updated filesystem server path to:', currentDir);
}

// Write updated config
fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));

// Create audit logs directory
const auditDir = './audit-logs';
if (!fs.existsSync(auditDir)) {
  fs.mkdirSync(auditDir, { recursive: true });
  console.log('✅ Created audit logs directory:', auditDir);
}

// Create MCP status file
const statusConfig = {
  initialized: true,
  timestamp: new Date().toISOString(),
  version: "1.0.0",
  servers: {
    filesystem: {
      enabled: true,
      path: currentDir,
      security: "enabled"
    },
    database: {
      enabled: true,
      masking: "enabled",
      rls: "enabled"
    }
  },
  security: {
    auditLogging: true,
    rateLimiting: true,
    dataClassification: "sensitive"
  }
};

fs.writeFileSync('.mcp/status.json', JSON.stringify(statusConfig, null, 2));

console.log('\n🎉 Claude Code MCP initialization complete!');
console.log('📁 Configuration files updated:');
console.log('   - .mcp/claude_desktop_config.json');
console.log('   - .mcp/status.json');
console.log('📂 Audit directory created: ./audit-logs');
console.log('\n🔧 Next steps:');
console.log('   1. Copy .mcp/claude_desktop_config.json to Claude Desktop settings');
console.log('   2. Restart Claude Desktop to load MCP servers');
console.log('   3. Run: node verify-mcp.js to test connection');