# 🚀 Todoist MCP Server for Poke Integration

A fully-featured MCP (Model Context Protocol) server for Todoist API, optimized for [Poke](https://poke.com) integration with Railway deployment.

## ✨ Features

- 🔗 **Poke Compatible** - Uses FastMCP framework with `/mcp` endpoint
- 🔐 **Bearer Token Authentication** - Secure via `MCP_AUTH_TOKEN`
- 🏥 **Health Monitoring** - Built-in health checks for Railway
- 🛠️ **29 Tools Available** - Complete Todoist task management
- 🚀 **Railway Ready** - Optimized Docker deployment
- 📊 **Express Wrapper** - Health endpoint + MCP server
- 📅 **Daily Overview** - Combined tool for complete task summaries

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `create_task` | Create tasks with full parameters |
| `get_tasks` | Retrieve and filter tasks |
| `get_daily_overview` | **Complete daily task summary** - overdue, today, upcoming |
| `update_task` | Update existing tasks |
| `complete_task` | Mark tasks complete |
| `delete_task` | Remove tasks |
| `get_projects` | List all projects |
| `test_connection` | Verify Todoist API |
| `health_check` | Server status |

## 🚀 Quick Deploy to Railway

### 1. Generate Auth Token
```bash
openssl rand -base64 32
```

### 2. Deploy via Railway Dashboard
1. Go to [railway.app](https://railway.app) → "New Project"
2. Connect your GitHub repository
3. Set Environment Variables:
   ```
   TODOIST_API_TOKEN=your_todoist_token
   MCP_AUTH_TOKEN=your_generated_token
   ```
4. Deploy!

### 3. Connect to Poke
- **Server URL**: `https://your-app.railway.app/mcp`
- **API Key**: Your `MCP_AUTH_TOKEN`

## 📋 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TODOIST_API_TOKEN` | ✅ | Your Todoist API token |
| `MCP_AUTH_TOKEN` | ✅ | Authentication token for Poke |
| `PORT` | ❌ | Server port (default: 3000) |

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start local server
npm start

# Test with MCP Inspector
npx @modelcontextprotocol/inspector
# URL: http://localhost:3000/mcp
# API Key: your MCP_AUTH_TOKEN
```

## 📊 Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check for Railway monitoring |
| `/mcp` | POST | MCP endpoint for Poke integration |
| `/` | GET | Server information |

## 🔐 Security

- **Bearer Token Authentication** via Authorization header
- **Non-root container** for security
- **Request logging** for monitoring
- **Error handling** with proper HTTP responses

## 📱 Example Usage in Poke

Once connected to Poke, you can use natural language:

> "Create a high-priority task called 'Review project proposal' due tomorrow in the Work project"

> "Show me all incomplete tasks from today"

> "Complete the task 'Submit report' and create a follow-up task for next week"

> "Get all my projects and their task counts"

> "Show me my daily task overview"

> "What tasks are overdue today?"

> "Give me a summary of my tasks for this week"

## 🐛 Troubleshooting

### Health Check Issues
```bash
# Test health endpoint
curl https://your-app.railway.app/health
```

### Authentication Problems
- Verify `MCP_AUTH_TOKEN` matches exactly
- Check Bearer token format in Poke settings
- Review Railway logs for auth errors

### MCP Connection Issues
- Test `/mcp` endpoint accessibility
- Check FastMCP server logs
- Verify Railway deployment status

## 📈 Monitoring

- **Health Endpoint**: `/health` - Railway auto-monitoring
- **Railway Logs**: Real-time server logs
- **Poke Dashboard**: Integration status and usage
- **MCP Inspector**: Local testing tool

## 🔄 Updates

Push changes to GitHub → Railway auto-redeploys → Monitor health check

## 📁 Project Structure

```
src/
├── poke-server.ts           # FastMCP server for Poke
├── poke-express-server.ts   # Express wrapper with health endpoint
├── http-server.ts          # Original HTTP/SSE server
└── index.ts                # Stdio server for Claude Desktop
```

## 📄 License

MIT License - see LICENSE file for details.

---

**🎉 Ready for Poke Integration!**

**Server URL**: `https://your-app.railway.app/mcp`  
**API Key**: Your MCP_AUTH_TOKEN  
**Health Check**: `https://your-app.railway.app/health`
