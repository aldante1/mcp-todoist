// Express wrapper for Poke MCP Server with health endpoint
import express from "express";
import { createServer } from "http";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  const hasTodoistToken = !!process.env.TODOIST_API_TOKEN;
  const hasMcpToken = !!process.env.MCP_AUTH_TOKEN;
  
  res.json({
    status: 'healthy',
    service: 'todoist-mcp-server-poke',
    version: '1.0.0',
    transport: 'httpStream',
    endpoint: '/mcp',
    authentication: hasMcpToken ? 'enabled' : 'disabled',
    tools: 8,
    timestamp: new Date().toISOString(),
    environment: {
      todoist_api_configured: hasTodoistToken,
      mcp_auth_configured: hasMcpToken
    }
  });
});

// Root endpoint with info
app.get('/', (req, res) => {
  res.json({
    name: 'Todoist MCP Server for Poke',
    version: '1.0.0',
    description: 'MCP server for Todoist API optimized for Poke integration',
    endpoints: {
      health: '/health',
      mcp: '/mcp'
    },
    tools: 8,
    authentication: !!process.env.MCP_AUTH_TOKEN
  });
});

// Start MCP server in background
console.log('Starting FastMCP server for Poke...');

const mcpServer = spawn('node', [path.join(__dirname, 'poke-server.js')], {
  stdio: 'inherit',
  env: process.env
});

mcpServer.on('error', (error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

mcpServer.on('exit', (code) => {
  console.log(`MCP server exited with code ${code}`);
  process.exit(code);
});

// Create HTTP server
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Authentication: ${process.env.MCP_AUTH_TOKEN ? 'Enabled' : 'Disabled'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  mcpServer.kill('SIGTERM');
  server.close(() => {
    console.log('Express server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  mcpServer.kill('SIGINT');
  server.close(() => {
    console.log('Express server closed');
    process.exit(0);
  });
});
