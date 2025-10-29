# Poke Integration Deployment Guide

## 🚀 Deploy Todoist MCP Server to Railway for Poke Integration

### 📋 Prerequisites
- Railway account
- Todoist API token
- Generated MCP_AUTH_TOKEN

### 🔧 Step 1: Generate Authentication Token

```bash
# Generate secure token for authentication
openssl rand -base64 32
```

Save this token - you'll need it for Railway variables.

### 🌐 Step 2: Deploy to Railway

#### Option A: Using Railway CLI (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway new

# Set project name
railway variables set RAILWAY_PROJECT_NAME=todoist-mcp-poke

# Add environment variables
railway variables set TODOIST_API_TOKEN=your_todoist_api_token_here
railway variables set MCP_AUTH_TOKEN=your_generated_mcp_auth_token_here

# Deploy
railway up
```

#### Option B: Using Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your forked repository
4. Configure environment variables:
   - `TODOIST_API_TOKEN`: Your Todoist API token
   - `MCP_AUTH_TOKEN`: Your generated authentication token

### ⚙️ Step 3: Configure Railway Settings

In your Railway project settings:

1. **Settings** → **Variables** - ensure both tokens are set
2. **Settings** → **Build** - make sure Dockerfile is selected
3. **Settings** → **Deploy** - healthcheck path should be `/health`

### 🔍 Step 4: Verify Deployment

Once deployed, test the endpoints:

```bash
# Health check
curl https://your-app-name.railway.app/health

# Should return:
{
  "status": "healthy",
  "service": "todoist-mcp-server-poke",
  "version": "1.0.0",
  "transport": "httpStream",
  "endpoint": "/mcp",
  "authentication": "enabled",
  "tools": 7,
  "timestamp": "2025-10-29T..."
}
```

### 🔗 Step 5: Connect to Poke

1. Go to [poke.com/settings/connections/integrations/new](https://poke.com/settings/connections/integrations/new)
2. **Connection name**: "Todoist Task Manager"
3. **Server URL**: `https://your-app-name.railway.app/mcp`
4. **API Key**: Your `MCP_AUTH_TOKEN` value
5. Click **Connect**

### 🧪 Step 6: Test Integration

Use the MCP Inspector to test:

```bash
npx @modelcontextprotocol/inspector
```

- Server URL: `https://your-app-name.railway.app/mcp`
- Connection Type: Via Proxy
- API Key: Your `MCP_AUTH_TOKEN`

### 📊 Available Tools

Your Poke integration will have access to:

1. **create_task** - Create new Todoist tasks
2. **get_tasks** - Retrieve tasks with filtering
3. **update_task** - Update existing tasks
4. **complete_task** - Mark tasks as complete
5. **delete_task** - Remove tasks
6. **get_projects** - List all projects
7. **test_connection** - Verify API connectivity

### 🔐 Security Features

- **Bearer Token Authentication** via MCP_AUTH_TOKEN
- **Request Logging** for monitoring
- **Health Check Endpoint** for Railway monitoring
- **Error Handling** with proper HTTP status codes

### 🐛 Troubleshooting

#### Health Check Fails
- Verify `TODOIST_API_TOKEN` is valid
- Check Railway logs for errors
- Ensure `MCP_AUTH_TOKEN` is set

#### Authentication Errors
- Double-check MCP_AUTH_TOKEN in Railway variables
- Verify Bearer token format in Poke settings
- Check Railway logs for auth failures

#### MCP Connection Issues
- Ensure `/mcp` endpoint is accessible
- Check FastMCP server logs
- Verify Railway deployment succeeded

### 📝 Example Usage in Poke

Once connected, you can use natural language:

> "Create a high-priority task called 'Review project proposal' due tomorrow"

> "Show me all tasks from the 'Work' project"

> "Complete the task with ID '123456'"

### 🔄 Updates and Maintenance

To update the deployment:
1. Push changes to GitHub
2. Railway will automatically redeploy
3. Monitor health check during deployment

### 📈 Monitoring

- **Health Endpoint**: `/health` - always available
- **Railway Logs**: Real-time server logs
- **Poke Dashboard**: Integration status and usage

---

**🎉 Your Todoist MCP Server is now ready for Poke integration!**
