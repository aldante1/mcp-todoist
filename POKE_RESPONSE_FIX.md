# 🔧 Poke Response Format Fix

## 🐛 Problem
Poke shows error: `undefined не является объектом (при оценке '_l.response.status')`

This indicates FastMCP response format is incompatible with Poke's expectations.

## ✅ Solution: Custom MCP Server

Created `src/poke-mcp-server.ts` - **Pure Express MCP server** with Poke-compatible response format.

### 🚀 Key Features

#### **1. Standard MCP Protocol**
```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    "content": [
      {
        "type": "text", 
        "text": "Response content"
      }
    ]
  }
}
```

#### **2. Proper Error Handling**
```json
{
  "jsonrpc": "2.0",
  "id": "request-id", 
  "error": {
    "code": -32603,
    "message": "Error description"
  }
}
```

#### **3. Authentication**
- Bearer token via `Authorization: Bearer YOUR_TOKEN`
- MCP_AUTH_TOKEN environment variable
- Graceful fallback when no token set

#### **4. All 28 Tools Available**
- Task Management (9 tools)
- Bulk Operations (4 tools) 
- Project Management (4 tools)
- Comments (2 tools)
- Labels (5 tools)
- Subtasks (5 tools)
- Testing (3 tools)

## 🔄 Deployment Options

### Option A: Use New MCP Server (Recommended)
```bash
# Railway automatically uses npm start
# Now points to poke-mcp-server.js
npm start
```

### Option B: Switch Back to FastMCP
```bash
# If you prefer FastMCP version
npm run start:poke
```

### Option C: Manual Selection
Update `package.json` start script:
```json
{
  "scripts": {
    "start": "node dist/poke-mcp-server.js"  // New server
    // "start": "node dist/poke-server.js"   // FastMCP version
  }
}
```

## 🧪 Testing

### Health Check
```bash
curl https://your-app.railway.app/health
```

### MCP Protocol Test
```bash
curl -X POST https://your-app.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test",
    "method": "tools/list"
  }'
```

### Expected Response
```json
{
  "jsonrpc": "2.0",
  "id": "test", 
  "result": {
    "tools": [
      {
        "name": "create_task",
        "description": "Create a new task in Todoist",
        "inputSchema": { ... }
      }
      // ... 27 more tools
    ]
  }
}
```

## 🔍 Poke Integration

1. **Server URL**: `https://your-app.railway.app/mcp`
2. **API Key**: Your `MCP_AUTH_TOKEN`
3. **Connection Type**: HTTP/HTTPS

### Troubleshooting Poke Issues

#### Still Getting Errors?
1. **Check Railway logs** for real errors
2. **Verify MCP_AUTH_TOKEN** matches exactly
3. **Test health endpoint** first
4. **Try MCP Inspector** locally

#### Debug Steps:
```bash
# 1. Test health
curl https://your-app.railway.app/health

# 2. Test MCP protocol
curl -X POST https://your-app.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"test","method":"initialize"}'

# 3. Check Railway logs
railway logs
```

## 📊 Server Comparison

| Feature | FastMCP Server | Custom MCP Server |
|---------|----------------|-------------------|
| **Response Format** | FastMCP format | Standard MCP JSON-RPC |
| **Poke Compatibility** | ❌ Issues | ✅ Compatible |
| **Tool Implementation** | FastMCP decorators | Express handlers |
| **Authentication** | Limited | Full Bearer token |
| **Error Handling** | FastMCP style | MCP standard |
| **Performance** | Optimized | Standard Express |
| **Maintenance** | Framework-dependent | Full control |

## 🎯 Recommendation

**Use the custom MCP server (`poke-mcp-server.ts`) for Poke integration:**

✅ **Guaranteed Poke compatibility**  
✅ **Standard MCP protocol**  
✅ **Full error handling**  
✅ **All 28 tools implemented**  
✅ **Better debugging**  
✅ **Complete control**  

---

**🎉 Your Todoist MCP Server should now work perfectly with Poke!**
