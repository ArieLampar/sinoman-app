# 🗄️ MCP PostgreSQL Configuration for Sinoman SuperApp

This document explains how to configure the MCP PostgreSQL server to work securely with your Supabase database for the Sinoman cooperative system.

## 📋 **Available PostgreSQL MCP Servers**

We have installed two PostgreSQL MCP servers:

### 1. **mcp-postgres-server** (Basic)
- Read-only operations
- Safe for production
- Limited functionality
- Good for basic queries

### 2. **mcp-postgres-full-access** (Comprehensive)
- Full read/write capabilities
- Schema exploration
- DDL operations
- DML operations
- **Use with caution in production**

## 🔒 **Security-First Configuration**

### **Recommended Approach for Sinoman**

Since Sinoman handles financial cooperative data, we recommend a **layered approach**:

1. **Production**: Use basic MCP server with read-only connection
2. **Development**: Use full-access MCP server with restricted permissions
3. **Admin Operations**: Use custom Sinoman MCP server (already implemented)

## ⚙️ **Configuration Options**

### **Option 1: Supabase Connection (Recommended)**

Update your `mcp/claude-config.json`:

```json
{
  "mcpServers": {
    "sinoman-cooperative": {
      "command": "node",
      "args": ["--loader", "ts-node/esm", "mcp/server.ts"],
      "cwd": "C:\\Project\\sinoman-app"
    },
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "C:\\Project\\sinoman-app"]
    },
    "postgres-read-only": {
      "command": "npx",
      "args": ["mcp-postgres-server"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true",
        "POSTGRES_SCHEMA": "public",
        "POSTGRES_READ_ONLY": "true"
      }
    }
  }
}
```

### **Option 2: Development with Full Access**

For development environment only:

```json
{
  "postgres-development": {
    "command": "npx",
    "args": ["mcp-postgres-full-access"],
    "env": {
      "POSTGRES_CONNECTION_STRING": "postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require",
      "POSTGRES_MAX_CONNECTIONS": "5",
      "POSTGRES_TIMEOUT": "10000"
    }
  }
}
```

## 🔑 **Environment Variables Setup**

Add these to your `.env.local`:

```bash
# PostgreSQL MCP Configuration
POSTGRES_CONNECTION_STRING="postgresql://postgres.[your-project-id]:[your-password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
POSTGRES_SCHEMA="public"
POSTGRES_READ_ONLY="true"
POSTGRES_MAX_CONNECTIONS="3"
POSTGRES_TIMEOUT="5000"

# Supabase Connection Details
SUPABASE_DB_HOST="aws-0-[region].pooler.supabase.com"
SUPABASE_DB_PORT="6543"
SUPABASE_DB_NAME="postgres"
SUPABASE_DB_USER="postgres.[your-project-id]"
SUPABASE_DB_PASSWORD="[your-password]"
```

## 🛡️ **Security Considerations**

### **Database User Permissions**

Create a dedicated user for MCP access:

```sql
-- Create read-only user for MCP
CREATE USER mcp_readonly WITH PASSWORD 'secure_mcp_password';

-- Grant minimal permissions
GRANT CONNECT ON DATABASE postgres TO mcp_readonly;
GRANT USAGE ON SCHEMA public TO mcp_readonly;

-- Grant read access to specific tables only
GRANT SELECT ON members TO mcp_readonly;
GRANT SELECT ON savings_accounts TO mcp_readonly;
GRANT SELECT ON waste_balances TO mcp_readonly;
GRANT SELECT ON audit_logs TO mcp_readonly;
GRANT SELECT ON tenants TO mcp_readonly;

-- Do NOT grant access to sensitive tables
-- REVOKE ALL ON auth.users FROM mcp_readonly;
-- REVOKE ALL ON security_alerts FROM mcp_readonly;
```

### **Connection Pooling**

Use connection pooling to prevent connection exhaustion:

```json
{
  "env": {
    "POSTGRES_CONNECTION_STRING": "postgresql://mcp_readonly:password@host:port/database?sslmode=require&pgbouncer=true&pool_max_conns=3&pool_timeout=10"
  }
}
```

### **Read-Only Mode**

Enable read-only mode for safety:

```json
{
  "env": {
    "POSTGRES_READ_ONLY": "true",
    "POSTGRES_ALLOWED_OPERATIONS": "SELECT,EXPLAIN"
  }
}
```

## 🔧 **Testing the Configuration**

### **Test Connection**

```bash
# Test basic MCP PostgreSQL server
npx mcp-postgres-server

# Test with connection string
POSTGRES_CONNECTION_STRING="your_connection_string" npx mcp-postgres-server
```

### **Test with MCP Inspector**

```bash
# Start MCP inspector
npx @modelcontextprotocol/inspector-cli mcp/claude-config.json
```

### **Test Queries**

Once connected, test these safe queries:

```sql
-- Test basic connection
SELECT version();

-- Test table access (should work)
SELECT COUNT(*) FROM members;

-- Test read permissions
SELECT tenant_name FROM tenants LIMIT 5;

-- Test write permissions (should fail in read-only mode)
INSERT INTO audit_logs (action, resource) VALUES ('test', 'test');
```

## 🚀 **Integration with Sinoman MCP Server**

The PostgreSQL MCP server complements your existing Sinoman MCP server:

### **Sinoman MCP Tools** (Business Logic)
- `get_member_info` - High-level member operations
- `get_savings_balance` - Financial operations with validation
- `create_savings_transaction` - Secure financial transactions
- `get_security_metrics` - Security monitoring
- `get_audit_logs` - Audit trail access
- `validate_security_config` - Security validation

### **PostgreSQL MCP Tools** (Data Access)
- Direct SQL queries for analysis
- Schema exploration
- Data validation
- Performance monitoring
- Ad-hoc reporting

## 📊 **Example Usage Scenarios**

### **Scenario 1: Member Data Analysis**
```
Claude Query: "Show me the distribution of member roles across all tenants using SQL"

PostgreSQL MCP will execute:
SELECT role, COUNT(*) as count, tenant_id 
FROM members 
GROUP BY role, tenant_id 
ORDER BY tenant_id, role;
```

### **Scenario 2: Financial Report Generation**
```
Claude Query: "Generate a savings summary report for the last month"

PostgreSQL MCP will execute:
SELECT 
  t.tenant_name,
  COUNT(sa.id) as total_accounts,
  SUM(sa.total_balance) as total_savings,
  AVG(sa.total_balance) as average_balance
FROM savings_accounts sa
JOIN members m ON sa.member_id = m.id
JOIN tenants t ON m.tenant_id = t.id
WHERE sa.updated_at >= NOW() - INTERVAL '30 days'
GROUP BY t.tenant_id, t.tenant_name
ORDER BY total_savings DESC;
```

### **Scenario 3: Security Analysis**
```
Claude Query: "Show me failed login attempts by IP address in the last 24 hours"

PostgreSQL MCP will execute:
SELECT 
  ip_address, 
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM audit_logs 
WHERE action LIKE 'auth_%' 
  AND success = false 
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) >= 3
ORDER BY failed_attempts DESC;
```

## ⚠️ **Important Security Notes**

### **Do NOT:**
- Use admin/service role credentials for MCP
- Allow write access in production
- Expose sensitive tables (auth.users, security keys)
- Use without connection limits
- Skip SSL/TLS encryption

### **DO:**
- Create dedicated read-only users
- Use connection pooling
- Enable query logging
- Monitor connection usage
- Rotate credentials regularly
- Use least-privilege principle

## 🔄 **Production Deployment**

### **Production Configuration**

```json
{
  "postgres-production": {
    "command": "npx",
    "args": ["mcp-postgres-server"],
    "env": {
      "POSTGRES_CONNECTION_STRING": "postgresql://mcp_readonly:secure_password@production-host:5432/sinoman_db?sslmode=require&pool_max_conns=2",
      "POSTGRES_READ_ONLY": "true",
      "POSTGRES_SCHEMA": "public",
      "POSTGRES_TIMEOUT": "5000",
      "POSTGRES_ALLOWED_TABLES": "members,savings_accounts,waste_balances,tenants"
    }
  }
}
```

### **Monitoring & Alerting**

Monitor PostgreSQL MCP usage:

```sql
-- Create monitoring view
CREATE VIEW mcp_connection_stats AS
SELECT 
  application_name,
  state,
  COUNT(*) as connections,
  MAX(state_change) as last_activity
FROM pg_stat_activity 
WHERE application_name LIKE '%mcp%'
GROUP BY application_name, state;

-- Monitor long-running queries
SELECT 
  pid, 
  now() - pg_stat_activity.query_start AS duration, 
  query 
FROM pg_stat_activity 
WHERE application_name LIKE '%mcp%'
  AND (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

## 📚 **Additional Resources**

- **Supabase Docs**: [Database Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
- **MCP Postgres Server**: [GitHub Repository](https://www.npmjs.com/package/mcp-postgres-server)
- **PostgreSQL Security**: [Security Best Practices](https://www.postgresql.org/docs/current/security.html)

## 🎯 **Next Steps**

1. **Configure Connection**: Update your Supabase connection string
2. **Create Read-Only User**: Set up dedicated MCP database user
3. **Test Configuration**: Verify MCP server can connect safely
4. **Update Claude Config**: Add PostgreSQL server to your MCP configuration
5. **Monitor Usage**: Set up logging and monitoring

---

**🔒 Remember**: Always prioritize security when configuring database access for AI systems. The PostgreSQL MCP server should complement, not replace, your existing Sinoman MCP server's business logic and security controls.