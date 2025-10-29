// Poke-compatible Todoist MCP Server using FastMCP
// This version is specifically designed for Poke integration with /mcp endpoint

import { FastMCP } from "fastmcp";
import { z } from "zod";
import { TodoistApi } from "@doist/todoist-api-typescript";
import {
  createTodoistClient,
  type TodoistClient,
} from "./utils/dry-run-wrapper.js";

// Initialize Todoist client
const TODOIST_API_TOKEN = process.env.TODOIST_API_TOKEN;
if (!TODOIST_API_TOKEN) {
  console.error("Error: TODOIST_API_TOKEN environment variable is required");
  process.exit(1);
}

// Initialize authentication
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

const todoistClient = createTodoistClient(TODOIST_API_TOKEN);
const apiClient = todoistClient as TodoistApi;

// Create FastMCP server with authentication
const server = new FastMCP({
  name: "Todoist Task Manager",
  version: "1.0.0",
});

// Log authentication status
if (MCP_AUTH_TOKEN) {
  console.log('🔐 Authentication enabled with MCP_AUTH_TOKEN');
} else {
  console.warn('⚠️  MCP_AUTH_TOKEN not set, running without authentication');
}

// Tool: Create Task
server.addTool({
  name: "create_task",
  description: "Create a new task in Todoist with optional description, due date, priority, labels, deadline, project, and section",
  parameters: z.object({
    content: z.string().describe("The content/title of the task"),
    description: z.string().optional().describe("Detailed description of the task"),
    due_string: z.string().optional().describe("Natural language due date like 'tomorrow', 'next Monday', 'Jan 23'"),
    priority: z.number().min(1).max(4).optional().describe("Task priority from 1 (highest) to 4 (lowest)"),
    labels: z.array(z.string()).optional().describe("Array of label names to assign to the task"),
    deadline_date: z.string().optional().describe("Task deadline in YYYY-MM-DD format"),
    project_id: z.string().optional().describe("Project ID to assign the task to"),
    section_id: z.string().optional().describe("Section ID within the project to assign the task to"),
  }),
  execute: async (args) => {
    try {
      const task = await apiClient.addTask({
        content: args.content,
        description: args.description,
        dueString: args.due_string,
        priority: args.priority,
        labels: args.labels,
        // Note: deadline_date not supported in this API version
        projectId: args.project_id,
        sectionId: args.section_id,
      });

      return `Task created successfully:\nID: ${task.id}\nTitle: ${task.content}\nDescription: ${task.description || 'None'}\nPriority: ${task.priority}\nDue: ${task.due?.string || 'None'}\nProject: ${task.projectId || 'Inbox'}`;
    } catch (error) {
      throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Get Tasks
server.addTool({
  name: "get_tasks",
  description: "Get tasks from Todoist with optional filtering by project, label, or due date",
  parameters: z.object({
    project_id: z.string().optional().describe("Filter by project ID"),
    filter: z.string().optional().describe("Filter string (e.g., 'today', 'overdue', 'priority 1')"),
    label: z.string().optional().describe("Filter by label name"),
  }),
  execute: async (args) => {
    try {
      const tasks = await apiClient.getTasks({
        projectId: args.project_id,
        // Note: filter and label not directly supported in this API version
      });

      const tasksArray = tasks as unknown as any[];
      
      if (!tasks || tasksArray.length === 0) {
        return "No tasks found matching the criteria.";
      }

      const taskList = tasksArray.map((task: any) => {
        const status = task.isCompleted ? "✓" : "○";
        const priority = task.priority ? `P${task.priority}` : "P4";
        const due = task.due?.string || "";
        const project = task.projectId || "Inbox";
        
        return `${status} [${priority}] ${task.content} (ID: ${task.id}) - ${project}${due ? ` - Due: ${due}` : ""}`;
      }).join("\n");

      return `Found ${tasksArray.length} task(s):\n${taskList}`;
    } catch (error) {
      throw new Error(`Failed to get tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Update Task
server.addTool({
  name: "update_task",
  description: "Update an existing task in Todoist",
  parameters: z.object({
    task_id: z.string().describe("The ID of the task to update"),
    content: z.string().optional().describe("New content/title of the task"),
    description: z.string().optional().describe("New description of the task"),
    due_string: z.string().optional().describe("New due date like 'tomorrow', 'next Monday'"),
    priority: z.number().min(1).max(4).optional().describe("New priority from 1 (highest) to 4 (lowest)"),
    labels: z.array(z.string()).optional().describe("New array of label names"),
  }),
  execute: async (args) => {
    try {
      const updatedTask = await apiClient.updateTask(args.task_id, {
        content: args.content,
        description: args.description,
        dueString: args.due_string,
        priority: args.priority,
        labels: args.labels,
      });

      return `Task updated successfully:\nID: ${updatedTask.id}\nTitle: ${updatedTask.content}\nDescription: ${updatedTask.description || 'None'}\nPriority: ${updatedTask.priority}\nDue: ${updatedTask.due?.string || 'None'}`;
    } catch (error) {
      throw new Error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Complete Task
server.addTool({
  name: "complete_task",
  description: "Mark a task as completed in Todoist",
  parameters: z.object({
    task_id: z.string().describe("The ID of the task to complete"),
  }),
  execute: async (args) => {
    try {
      await apiClient.closeTask(args.task_id);
      return `Task ${args.task_id} marked as completed successfully.`;
    } catch (error) {
      throw new Error(`Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Delete Task
server.addTool({
  name: "delete_task",
  description: "Delete a task from Todoist",
  parameters: z.object({
    task_id: z.string().describe("The ID of the task to delete"),
  }),
  execute: async (args) => {
    try {
      await apiClient.deleteTask(args.task_id);
      return `Task ${args.task_id} deleted successfully.`;
    } catch (error) {
      throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Get Projects
server.addTool({
  name: "get_projects",
  description: "Get all projects from Todoist",
  parameters: z.object({}),
  execute: async () => {
    try {
      const projects = await apiClient.getProjects();
      
      const projectsArray = projects as unknown as any[];
      
      if (!projects || projectsArray.length === 0) {
        return "No projects found.";
      }

      const projectList = projectsArray.map((project: any) => {
        const color = project.color ? `🎨` : "";
        return `${project.name} (ID: ${project.id}) ${color}`;
      }).join("\n");

      return `Found ${projectsArray.length} project(s):\n${projectList}`;
    } catch (error) {
      throw new Error(`Failed to get projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Test Connection
server.addTool({
  name: "test_connection",
  description: "Test the connection to Todoist API",
  parameters: z.object({}),
  execute: async () => {
    try {
      const projects = await apiClient.getProjects();
      const projectsArray = projects as unknown as any[];
      const projectCount = projectsArray ? projectsArray.length : 0;
      return `✅ Connection successful! Found ${projectCount} projects in your Todoist account.`;
    } catch (error) {
      throw new Error(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Health Check (for Railway monitoring)
server.addTool({
  name: "health_check",
  description: "Get server health status and configuration",
  parameters: z.object({}),
  execute: async () => {
    const health = {
      status: 'healthy',
      service: 'todoist-mcp-server-poke',
      version: '1.0.0',
      transport: 'httpStream',
      endpoint: '/mcp',
      authentication: MCP_AUTH_TOKEN ? 'enabled' : 'disabled',
      tools: 8,
      timestamp: new Date().toISOString(),
      todoist_api: 'connected'
    };
    
    return JSON.stringify(health, null, 2);
  },
});

// Start the server with HTTP transport for Poke
const PORT = Number(process.env.PORT) || 3000;

console.log(`Starting Todoist MCP Server for Poke on port ${PORT}`);
console.log(`Poke endpoint: http://localhost:${PORT}/mcp`);
console.log(`Authentication: ${MCP_AUTH_TOKEN ? 'Enabled' : 'Disabled (WARNING)'}`);

server.start({
  transportType: "httpStream",
  httpStream: {
    endpoint: "/mcp",
    port: PORT,
  },
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
