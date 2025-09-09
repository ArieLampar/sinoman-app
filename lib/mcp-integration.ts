// lib/mcp-integration.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class SinomanMCPIntegration {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected: boolean = false;
  
  constructor() {
    // Initialize will be called when needed
  }

  private async initialize() {
    if (this.client) return;

    try {
      // Create transport for filesystem operations
      this.transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", process.cwd()]
      });

      this.client = new Client({
        name: "sinoman-app",
        version: "1.0.0"
      }, {
        capabilities: {
          tools: {},
          resources: {}
        }
      });

      await this.client.connect(this.transport);
    } catch (error) {
      console.error('Failed to initialize MCP client:', error);
      throw error;
    }
  }

  async connect() {
    try {
      await this.initialize();
      this.isConnected = true;
      console.log('✅ MCP Connected successfully');
      
      // List available tools for verification
      await this.verifyConnection();
      
      return true;
    } catch (error) {
      console.error('❌ MCP Connection failed:', error);
      return false;
    }
  }

  async verifyConnection() {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP not connected');
    }

    try {
      const tools = await this.client.listTools();
      console.log(`✅ Connected to MCP server with ${tools.tools?.length || 0} tools available`);
      
      // Resources might not be available on all servers
      try {
        const resources = await this.client.listResources();
        console.log(`✅ Connected to MCP server with ${resources.resources?.length || 0} resources available`);
        return { tools: tools.tools || [], resources: resources.resources || [] };
      } catch (resourceError) {
        console.log('ℹ️  Resources not available on this MCP server');
        return { tools: tools.tools || [], resources: [] };
      }
    } catch (error) {
      console.error('Failed to verify MCP connection:', error);
      throw error;
    }
  }

  // Safe file operations with security checks
  async readFile(path: string) {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP not connected');
    }

    // Security check - no env files or sensitive paths
    if (path.includes('.env') || path.includes('credentials') || path.includes('secrets')) {
      throw new Error('❌ Cannot read sensitive files');
    }

    try {
      const result = await this.client.callTool('read_file', { path });
      return result;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  }

  // Safe directory listing with security checks
  async listDirectory(path: string) {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP not connected');
    }

    // Security check - restrict to project directory
    if (path.includes('..') || !path.startsWith(process.cwd())) {
      throw new Error('❌ Cannot access files outside project directory');
    }

    try {
      const result = await this.client.callTool('list_directory', { path });
      return result;
    } catch (error) {
      console.error('Failed to list directory:', error);
      throw error;
    }
  }

  // Secure query builder for database operations (placeholder for future database MCP server)
  async queryWithMasking(query: string, params?: any[]) {
    // Security check - automatically mask NIK fields
    if (query.includes('nik') && !query.includes('masked')) {
      console.warn('⚠️ Query contains NIK - applying masking');
      query = this.applyMasking(query);
    }

    // Log audit trail
    this.logAuditEvent('database_query', { 
      query: query.substring(0, 100), 
      masked: query.includes('masked'),
      timestamp: new Date().toISOString()
    });

    // This would use a database MCP server when available
    console.log('Prepared secure query:', query);
    return { query, params };
  }

  private applyMasking(query: string): string {
    // Auto-apply masking to sensitive fields
    return query.replace(
      /SELECT\s+nik/gi,
      "SELECT CONCAT(LEFT(nik, 6), 'XXXXXX', RIGHT(nik, 4)) as nik"
    ).replace(
      /SELECT\s+\*/gi,
      "SELECT id, nama, CONCAT(LEFT(nik, 6), 'XXXXXX', RIGHT(nik, 4)) as nik, email, phone, created_at"
    );
  }

  private logAuditEvent(action: string, details: any) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      user_id: 'system', // Would be actual user ID in real implementation
      session_id: Date.now().toString()
    };
    
    console.log('🔍 Audit Log:', auditEntry);
    // In production, this would write to secure audit log
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.close();
        this.isConnected = false;
        console.log('✅ MCP Disconnected successfully');
      } catch (error) {
        console.error('Error during disconnect:', error);
      }
    }
  }
}

export const mcp = new SinomanMCPIntegration();