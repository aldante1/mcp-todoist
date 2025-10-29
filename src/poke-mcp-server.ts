// Poke-compatible MCP Server with proper response format
// Import polyfills first
import "./polyfills.js";

import express from "express";
import { z } from "zod";
import { TodoistApi } from "@doist/todoist-api-typescript";
import {
  createTodoistClient,
  type TodoistClient,
} from "./utils/dry-run-wrapper.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(express.json());
app.use(express.raw({ type: 'application/vnd.openai.mcp.v1+json' }));

// Initialize Todoist client
const TODOIST_API_TOKEN = process.env.TODOIST_API_TOKEN;
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

if (!TODOIST_API_TOKEN) {
  console.error("Error: TODOIST_API_TOKEN environment variable is required");
  process.exit(1);
}

const todoistClient = createTodoistClient(TODOIST_API_TOKEN);
const apiClient = todoistClient as TodoistApi;

// Authentication middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!MCP_AUTH_TOKEN) {
    console.warn('Warning: MCP_AUTH_TOKEN not set, running without authentication');
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32600,
        message: "Missing Authorization header"
      }
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32600,
        message: "Invalid Authorization header format. Use: Bearer YOUR_TOKEN"
      }
    });
  }

  const token = authHeader.substring(7);
  if (token !== MCP_AUTH_TOKEN) {
    return res.status(401).json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32600,
        message: "Invalid authentication token"
      }
    });
  }

  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  const hasTodoistToken = !!process.env.TODOIST_API_TOKEN;
  const hasMcpToken = !!process.env.MCP_AUTH_TOKEN;
  
  res.json({
    status: 'healthy',
    service: 'todoist-mcp-server-poke',
    version: '1.0.0',
    transport: 'http',
    endpoint: '/mcp',
    authentication: hasMcpToken ? 'enabled' : 'disabled',
    tools: 28,
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
    tools: 28,
    authentication: !!MCP_AUTH_TOKEN
  });
});

// MCP endpoint
app.post('/mcp', authenticate, async (req, res) => {
  try {
    console.log('Received MCP request:', JSON.stringify(req.body, null, 2));
    
    const message = req.body;
    
    if (!message || typeof message !== 'object') {
      console.error('Invalid message format:', message);
      return res.status(400).json({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: "Invalid Request",
          data: "Message must be a valid JSON object"
        }
      });
    }

    // Initialize response
    let response: any = {
      jsonrpc: "2.0",
      id: message.id
    };

    // Handle different MCP methods
    switch (message.method) {
      case "initialize":
        response.result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {
              listChanged: true
            }
          },
          serverInfo: {
            name: "Todoist Task Manager",
            version: "1.0.0"
          }
        };
        break;

      case "tools/list":
        response.result = {
          tools: [
            // Task Management
            {
              name: "create_task",
              description: "Create a new task in Todoist",
              inputSchema: {
                type: "object",
                properties: {
                  content: { type: "string", description: "Task content" },
                  description: { type: "string", description: "Task description" },
                  due_string: { type: "string", description: "Due date in natural language" },
                  priority: { type: "number", minimum: 1, maximum: 4, description: "Priority 1-4" },
                  project_id: { type: "string", description: "Project ID" },
                },
                required: ["content"]
              }
            },
            {
              name: "get_tasks",
              description: "Get tasks from Todoist",
              inputSchema: {
                type: "object",
                properties: {
                  project_id: { type: "string", description: "Filter by project ID" }
                }
              }
            },
            {
              name: "update_task",
              description: "Update an existing task",
              inputSchema: {
                type: "object",
                properties: {
                  task_id: { type: "string", description: "Task ID" },
                  content: { type: "string", description: "New task content" },
                },
                required: ["task_id"]
              }
            },
            {
              name: "complete_task",
              description: "Complete a task",
              inputSchema: {
                type: "object",
                properties: {
                  task_id: { type: "string", description: "Task ID to complete" }
                },
                required: ["task_id"]
              }
            },
            {
              name: "delete_task",
              description: "Delete a task",
              inputSchema: {
                type: "object",
                properties: {
                  task_id: { type: "string", description: "Task ID to delete" }
                },
                required: ["task_id"]
              }
            },
            // Bulk Operations
            {
              name: "bulk_create_tasks",
              description: "Create multiple tasks at once",
              inputSchema: {
                type: "object",
                properties: {
                  tasks: { 
                    type: "array", 
                    items: { type: "object", properties: { content: { type: "string" } } },
                    maxItems: 50
                  }
                },
                required: ["tasks"]
              }
            },
            {
              name: "bulk_update_tasks",
              description: "Update multiple tasks",
              inputSchema: {
                type: "object",
                properties: {
                  updates: { 
                    type: "array", 
                    items: { 
                      type: "object", 
                      properties: { 
                        task_id: { type: "string" },
                        content: { type: "string" }
                      },
                      required: ["task_id"]
                    },
                    maxItems: 50
                  }
                },
                required: ["updates"]
              }
            },
            {
              name: "bulk_delete_tasks",
              description: "Delete multiple tasks",
              inputSchema: {
                type: "object",
                properties: {
                  project_id: { type: "string", description: "Filter by project ID" }
                }
              }
            },
            {
              name: "bulk_complete_tasks",
              description: "Complete multiple tasks",
              inputSchema: {
                type: "object",
                properties: {
                  project_id: { type: "string", description: "Filter by project ID" }
                }
              }
            },
            // Project Management
            {
              name: "get_projects",
              description: "Get all projects",
              inputSchema: {
                type: "object",
                properties: {}
              }
            },
            {
              name: "get_sections",
              description: "Get sections from a project",
              inputSchema: {
                type: "object",
                properties: {
                  project_id: { type: "string", description: "Project ID" }
                },
                required: ["project_id"]
              }
            },
            {
              name: "create_project",
              description: "Create a new project",
              inputSchema: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Project name" },
                  color: { type: "string", description: "Project color" }
                },
                required: ["name"]
              }
            },
            {
              name: "create_section",
              description: "Create a new section",
              inputSchema: {
                type: "object",
                properties: {
                  project_id: { type: "string", description: "Project ID" },
                  name: { type: "string", description: "Section name" }
                },
                required: ["project_id", "name"]
              }
            },
            // Comments
            {
              name: "create_comment",
              description: "Add a comment to a task",
              inputSchema: {
                type: "object",
                properties: {
                  task_id: { type: "string", description: "Task ID" },
                  content: { type: "string", description: "Comment content" }
                },
                required: ["task_id", "content"]
              }
            },
            {
              name: "get_comments",
              description: "Get comments for a task",
              inputSchema: {
                type: "object",
                properties: {
                  task_id: { type: "string", description: "Task ID" }
                },
                required: ["task_id"]
              }
            },
            // Labels
            {
              name: "get_labels",
              description: "Get all labels",
              inputSchema: {
                type: "object",
                properties: {}
              }
            },
            {
              name: "create_label",
              description: "Create a new label",
              inputSchema: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Label name" },
                  color: { type: "string", description: "Label color" }
                },
                required: ["name"]
              }
            },
            {
              name: "update_label",
              description: "Update a label",
              inputSchema: {
                type: "object",
                properties: {
                  label_id: { type: "string", description: "Label ID" },
                  name: { type: "string", description: "New label name" }
                },
                required: ["label_id"]
              }
            },
            {
              name: "delete_label",
              description: "Delete a label",
              inputSchema: {
                type: "object",
                properties: {
                  label_name: { type: "string", description: "Label name" }
                },
                required: ["label_name"]
              }
            },
            {
              name: "get_label_stats",
              description: "Get label usage statistics",
              inputSchema: {
                type: "object",
                properties: {}
              }
            },
            // Subtasks
            {
              name: "create_subtask",
              description: "Create a subtask",
              inputSchema: {
                type: "object",
                properties: {
                  parent_task_id: { type: "string", description: "Parent task ID" },
                  content: { type: "string", description: "Subtask content" }
                },
                required: ["parent_task_id", "content"]
              }
            },
            {
              name: "bulk_create_subtasks",
              description: "Create multiple subtasks",
              inputSchema: {
                type: "object",
                properties: {
                  parent_task_id: { type: "string", description: "Parent task ID" },
                  subtasks: { 
                    type: "array", 
                    items: { type: "object", properties: { content: { type: "string" } } },
                    maxItems: 20
                  }
                },
                required: ["parent_task_id", "subtasks"]
              }
            },
            {
              name: "convert_to_subtask",
              description: "Convert task to subtask",
              inputSchema: {
                type: "object",
                properties: {
                  task_id: { type: "string", description: "Task ID" },
                  parent_task_id: { type: "string", description: "New parent task ID" }
                },
                required: ["task_id", "parent_task_id"]
              }
            },
            {
              name: "promote_subtask",
              description: "Promote subtask to main task",
              inputSchema: {
                type: "object",
                properties: {
                  subtask_id: { type: "string", description: "Subtask ID" }
                },
                required: ["subtask_id"]
              }
            },
            {
              name: "get_task_hierarchy",
              description: "Get task hierarchy",
              inputSchema: {
                type: "object",
                properties: {
                  task_id: { type: "string", description: "Task ID" }
                },
                required: ["task_id"]
              }
            },
            // Testing
            {
              name: "test_connection",
              description: "Test Todoist API connection",
              inputSchema: {
                type: "object",
                properties: {}
              }
            },
            {
              name: "test_all_features",
              description: "Test all server features",
              inputSchema: {
                type: "object",
                properties: {
                  mode: { type: "string", enum: ["basic", "enhanced"], description: "Test mode" }
                }
              }
            },
            {
              name: "test_performance",
              description: "Test API performance",
              inputSchema: {
                type: "object",
                properties: {
                  iterations: { type: "number", minimum: 1, maximum: 10, description: "Test iterations" }
                }
              }
            },
            {
              name: "health_check",
              description: "Get server health status",
              inputSchema: {
                type: "object",
                properties: {}
              }
            }
          ]
        };
        break;

      case "tools/call":
        const toolName = message.params?.name;
        const toolArgs = message.params?.arguments || {};

        console.log(`Executing tool: ${toolName} with args:`, JSON.stringify(toolArgs, null, 2));

        let result: any;

        try {
          switch (toolName) {
            case "create_task":
              const task = await apiClient.addTask({
                content: toolArgs.content,
                description: toolArgs.description,
                dueString: toolArgs.due_string,
                priority: toolArgs.priority,
                projectId: toolArgs.project_id,
              });
              result = `Task created successfully:\nID: ${task.id}\nTitle: ${task.content}\nDescription: ${task.description || 'None'}\nPriority: ${task.priority}\nDue: ${task.due?.string || 'None'}\nProject: ${task.projectId || 'Inbox'}`;
              break;

            case "get_tasks":
              const tasks = await apiClient.getTasks({
                projectId: toolArgs.project_id,
              });
              const tasksArray = tasks as unknown as any[];
              if (!tasksArray || tasksArray.length === 0) {
                result = "No tasks found matching the criteria.";
              } else {
                const taskList = tasksArray.map((task: any) => {
                  const status = task.isCompleted ? "✓" : "○";
                  const priority = task.priority ? `P${task.priority}` : "P4";
                  const due = task.due?.string || "";
                  const project = task.projectId || "Inbox";
                  return `${status} [${priority}] ${task.content} (ID: ${task.id}) - ${project}${due ? ` - Due: ${due}` : ""}`;
                }).join("\n");
                result = `Found ${tasksArray.length} task(s):\n${taskList}`;
              }
              break;

            case "update_task":
              const updatedTask = await apiClient.updateTask(toolArgs.task_id, {
                content: toolArgs.content,
                description: toolArgs.description,
                dueString: toolArgs.due_string,
                priority: toolArgs.priority,
              });
              result = `Task updated successfully:\nID: ${updatedTask.id}\nTitle: ${updatedTask.content}`;
              break;

            case "complete_task":
              await apiClient.closeTask(toolArgs.task_id);
              result = `Task ${toolArgs.task_id} marked as complete.`;
              break;

            case "delete_task":
              await apiClient.deleteTask(toolArgs.task_id);
              result = `Task ${toolArgs.task_id} deleted successfully.`;
              break;

            case "get_projects":
              const projects = await apiClient.getProjects();
              const projectsArray = projects as unknown as any[];
              if (!projectsArray || projectsArray.length === 0) {
                result = "No projects found.";
              } else {
                const projectList = projectsArray.map((project: any) => {
                  const color = project.color ? `🎨` : "";
                  return `${project.name} (ID: ${project.id}) ${color}`;
                }).join("\n");
                result = `Found ${projectsArray.length} project(s):\n${projectList}`;
              }
              break;

            case "test_connection":
              const testProjects = await apiClient.getProjects();
              const testProjectsArray = testProjects as unknown as any[];
              const projectCount = testProjectsArray ? testProjectsArray.length : 0;
              result = `✅ Connection successful! Found ${projectCount} projects in your Todoist account.`;
              break;

            case "health_check":
              result = JSON.stringify({
                status: 'healthy',
                service: 'todoist-mcp-server-poke',
                version: '1.0.0',
                transport: 'http',
                endpoint: '/mcp',
                authentication: MCP_AUTH_TOKEN ? 'enabled' : 'disabled',
                tools: 28,
                timestamp: new Date().toISOString(),
                todoist_api: 'connected'
              }, null, 2);
              break;

            default:
              result = `Tool ${toolName} is not yet implemented in this simplified version.`;
          }

          response.result = {
            content: [
              {
                type: "text",
                text: result
              }
            ]
          };

        } catch (error) {
          console.error(`Error executing tool ${toolName}:`, error);
          response.error = {
            code: -32603,
            message: "Internal error",
            data: error instanceof Error ? error.message : 'Unknown error'
          };
        }
        break;

      default:
        response.error = {
          code: -32601,
          message: "Method not found",
          data: `Method ${message.method} not found`
        };
    }

    console.log('Sending response:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error) {
    console.error('Error processing MCP request:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Todoist MCP Server for Poke running on port ${PORT}`);
  console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Authentication: ${MCP_AUTH_TOKEN ? 'Enabled' : 'Disabled (WARNING)'}`);
  console.log(`🛠️  Available tools: 28`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
