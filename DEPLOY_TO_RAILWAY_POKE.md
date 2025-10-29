# 🚀 Railway Deployment for Poke Integration

## 📋 Quick Setup Guide

### 1. Generate Authentication Token
```bash
openssl rand -base64 32
```
Save this token - you'll need it for Railway variables.

### 2. Deploy to Railway

#### Option A: Railway Dashboard (Easiest)
1. Go to [railway.app](https://railway.app) → "New Project"
2. Connect your GitHub repository
3. Railway will auto-detect Node.js and use the Dockerfile
4. Set Environment Variables in Settings → Variables:
   ```
   TODOIST_API_TOKEN=your_todoist_api_token_here
   MCP_AUTH_TOKEN=your_generated_token_here
   ```

#### Option B: Railway CLI
```bash
# Install CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway new
railway variables set TODOIST_API_TOKEN=your_token
railway variables set MCP_AUTH_TOKEN=your_auth_token
railway up
```

### 3. Verify Deployment
```bash
# Test health endpoint
curl https://your-app.railway.app/health

# Expected response:
{
  "status": "healthy",
  "service": "todoist-mcp-server-poke",
  "version": "1.0.0",
  "transport": "httpStream",
  "endpoint": "/mcp",
  "authentication": "enabled",
  "tools": 8,
  "timestamp": "2025-10-29T...",
  "environment": {
    "todoist_api_configured": true,
    "mcp_auth_configured": true
  }
}
```

### 4. Connect to Poke
1. Go to [poke.com/settings/connections/integrations/new](https://poke.com/settings/connections/integrations/new)
2. **Connection name**: "Todoist Task Manager"
3. **Server URL**: `https://your-app.railway.app/mcp`
4. **API Key**: Your `MCP_AUTH_TOKEN`
5. Click **Connect**

### 5. Test Integration
```bash
# Test with MCP Inspector
npx @modelcontextprotocol/inspector
# URL: https://your-app.railway.app/mcp
# API Key: your MCP_AUTH_TOKEN
```

## 🛠️ Available Tools (8 Total)

1. **create_task** - Create tasks with full parameters
2. **get_tasks** - Retrieve and filter tasks  
3. **update_task** - Update existing tasks
4. **complete_task** - Mark tasks complete
5. **delete_task** - Remove tasks
6. **get_projects** - List all projects
7. **test_connection** - Verify Todoist API
8. **health_check** - Server status

## 🔐 Security Features

- ✅ **Bearer Token Authentication** via MCP_AUTH_TOKEN
- ✅ **Request Logging** for monitoring
- ✅ **Health Check Endpoint** for Railway
- ✅ **Error Handling** with proper responses
- ✅ **Non-root container** for security

## 📊 Example Usage in Poke

Once connected, use natural language:

> "Create a high-priority task called 'Review project proposal' due tomorrow in the Work project"

> "Show me all incomplete tasks from today"

> "Complete the task 'Submit report' and create a follow-up task for next week"

> "Get all my projects and their task counts"

## 🐛 Troubleshooting

### Health Check Fails
- Check Railway logs for errors
- Verify TODOIST_API_TOKEN is valid
- Ensure MCP_AUTH_TOKEN is set

### Authentication Issues  
- Verify Bearer token format in Poke
- Check MCP_AUTH_TOKEN matches exactly
- Look at Railway logs for auth errors

### MCP Connection Problems
- Test `/mcp` endpoint accessibility
- Check FastMCP server startup logs
- Verify Railway deployment succeeded

## 📈 Monitoring

- **Health Endpoint**: `/health` - Railway monitoring
- **Railway Logs**: Real-time server logs  
- **Poke Dashboard**: Integration status
- **MCP Inspector**: Local testing tool

## 🔄 Updates

Push changes to GitHub → Railway auto-redeploys → Monitor health check

---

**🎉 Your Todoist MCP Server is ready for Poke!**

**Server URL**: `https://your-app.railway.app/mcp`  
**API Key**: Your MCP_AUTH_TOKEN  
**Health Check**: `https://your-app.railway.app/health`
