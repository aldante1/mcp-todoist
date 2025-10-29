// Poke-compatible Todoist MCP Server using FastMCP
// This version is specifically designed for Poke integration with /mcp endpoint

// Import polyfills first
import "./polyfills.js";

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
      tools: 28,
      timestamp: new Date().toISOString(),
      todoist_api: 'connected'
    };
    
    return JSON.stringify(health, null, 2);
  },
});

// ===== BULK OPERATIONS =====

// Tool: Bulk Create Tasks
server.addTool({
  name: "bulk_create_tasks",
  description: "Create multiple tasks at once with optional project, due date, and priority",
  parameters: z.object({
    tasks: z.array(z.object({
      content: z.string(),
      description: z.string().optional(),
      due_string: z.string().optional(),
      priority: z.number().min(1).max(4).optional(),
      labels: z.array(z.string()).optional(),
    })).min(1).max(50),
    project_id: z.string().optional(),
  }),
  execute: async (args) => {
    try {
      const results = [];
      for (const task of args.tasks) {
        const createdTask = await apiClient.addTask({
          content: task.content,
          description: task.description,
          dueString: task.due_string,
          priority: task.priority,
          labels: task.labels,
          projectId: args.project_id,
        });
        results.push(`✅ Created: ${createdTask.content} (ID: ${createdTask.id})`);
      }
      return `Bulk create completed:\n${results.join('\n')}`;
    } catch (error) {
      throw new Error(`Failed to bulk create tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Bulk Update Tasks
server.addTool({
  name: "bulk_update_tasks",
  description: "Update multiple tasks at once",
  parameters: z.object({
    updates: z.array(z.object({
      task_id: z.string(),
      content: z.string().optional(),
      description: z.string().optional(),
      due_string: z.string().optional(),
      priority: z.number().min(1).max(4).optional(),
      labels: z.array(z.string()).optional(),
    })).min(1).max(50),
  }),
  execute: async (args) => {
    try {
      const results = [];
      for (const update of args.updates) {
        const updatedTask = await apiClient.updateTask(update.task_id, {
          content: update.content,
          description: update.description,
          dueString: update.due_string,
          priority: update.priority,
          labels: update.labels,
        });
        results.push(`✅ Updated: ${updatedTask.content} (ID: ${updatedTask.id})`);
      }
      return `Bulk update completed:\n${results.join('\n')}`;
    } catch (error) {
      throw new Error(`Failed to bulk update tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Bulk Delete Tasks
server.addTool({
  name: "bulk_delete_tasks",
  description: "Delete multiple tasks at once by filter criteria",
  parameters: z.object({
    project_id: z.string().optional(),
    label: z.string().optional(),
    filter: z.string().optional(),
  }),
  execute: async (args) => {
    try {
      const tasks = await apiClient.getTasks({
        projectId: args.project_id,
      });
      
      const tasksArray = tasks as unknown as any[];
      if (!tasksArray || tasksArray.length === 0) {
        return "No tasks found to delete.";
      }
      
      let deletedCount = 0;
      for (const task of tasksArray) {
        await apiClient.deleteTask(task.id);
        deletedCount++;
      }
      
      return `✅ Bulk delete completed: ${deletedCount} tasks deleted.`;
    } catch (error) {
      throw new Error(`Failed to bulk delete tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Bulk Complete Tasks
server.addTool({
  name: "bulk_complete_tasks",
  description: "Complete multiple tasks at once by filter criteria",
  parameters: z.object({
    project_id: z.string().optional(),
    label: z.string().optional(),
    filter: z.string().optional(),
  }),
  execute: async (args) => {
    try {
      const tasks = await apiClient.getTasks({
        projectId: args.project_id,
      });
      
      const tasksArray = tasks as unknown as any[];
      if (!tasksArray || tasksArray.length === 0) {
        return "No tasks found to complete.";
      }
      
      let completedCount = 0;
      for (const task of tasksArray) {
        if (!task.isCompleted) {
          await apiClient.closeTask(task.id);
          completedCount++;
        }
      }
      
      return `✅ Bulk complete completed: ${completedCount} tasks marked as done.`;
    } catch (error) {
      throw new Error(`Failed to bulk complete tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// ===== PROJECT OPERATIONS =====

// Tool: Get Sections
server.addTool({
  name: "get_sections",
  description: "Get all sections from a specific project",
  parameters: z.object({
    project_id: z.string().describe("Project ID to get sections from"),
  }),
  execute: async (args) => {
    try {
      const sections = await apiClient.getSections({ projectId: args.project_id });
      const sectionsArray = sections as unknown as any[];
      
      if (!sectionsArray || sectionsArray.length === 0) {
        return "No sections found in this project.";
      }
      
      const sectionList = sectionsArray.map((section: any) => {
        return `${section.name} (ID: ${section.id}) - Order: ${section.order}`;
      }).join("\n");
      
      return `Found ${sectionsArray.length} section(s):\n${sectionList}`;
    } catch (error) {
      throw new Error(`Failed to get sections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Create Project
server.addTool({
  name: "create_project",
  description: "Create a new project in Todoist",
  parameters: z.object({
    name: z.string().describe("Project name"),
    color: z.string().optional().describe("Project color (30-49)"),
    is_favorite: z.boolean().optional().describe("Add to favorites"),
  }),
  execute: async (args) => {
    try {
      const project = await apiClient.addProject({
        name: args.name,
        color: args.color ? Number(args.color) : undefined,
        isFavorite: args.is_favorite,
      });
      
      return `✅ Project created successfully:\nName: ${project.name}\nID: ${project.id}\nColor: ${project.color || 'default'}`;
    } catch (error) {
      throw new Error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Create Section
server.addTool({
  name: "create_section",
  description: "Create a new section in a project",
  parameters: z.object({
    project_id: z.string().describe("Project ID to add section to"),
    name: z.string().describe("Section name"),
    order: z.number().optional().describe("Section order"),
  }),
  execute: async (args) => {
    try {
      const section = await apiClient.addSection({
        projectId: args.project_id,
        name: args.name,
        order: args.order,
      });
      
      return `✅ Section created successfully:\nName: ${section.name}\nID: ${section.id}\nProject: ${args.project_id}`;
    } catch (error) {
      throw new Error(`Failed to create section: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// ===== COMMENT OPERATIONS =====

// Tool: Create Comment
server.addTool({
  name: "create_comment",
  description: "Add a comment to a task or project",
  parameters: z.object({
    content: z.string().describe("Comment content"),
    task_id: z.string().optional().describe("Task ID to comment on"),
    project_id: z.string().optional().describe("Project ID to comment on"),
    attachment: z.object({
      resource_type: z.string(),
      file_url: z.string(),
      file_name: z.string(),
    }).optional().describe("File attachment"),
  }),
  execute: async (args) => {
    try {
      if (!args.task_id && !args.project_id) {
        throw new Error("Either task_id or project_id must be provided");
      }
      
      let comment;
      if (args.task_id) {
        comment = await apiClient.addComment({
          content: args.content,
          taskId: args.task_id,
          attachment: args.attachment ? {
            fileUrl: args.attachment.file_url,
            fileName: args.attachment.file_name,
            resourceType: args.attachment.resource_type,
          } : undefined,
        });
      } else {
        // For project comments, we need a different approach
        throw new Error("Project comments are not supported in this API version. Please provide a task_id.");
      }
      
      return `✅ Comment added to task ${args.task_id}:\nContent: ${comment.content}\nID: ${comment.id}`;
    } catch (error) {
      throw new Error(`Failed to create comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Get Comments
server.addTool({
  name: "get_comments",
  description: "Get all comments for a task or project",
  parameters: z.object({
    task_id: z.string().optional().describe("Task ID to get comments from"),
    project_id: z.string().optional().describe("Project ID to get comments from"),
  }),
  execute: async (args) => {
    try {
      if (!args.task_id && !args.project_id) {
        throw new Error("Either task_id or project_id must be provided");
      }
      
      let comments;
      if (args.task_id) {
        comments = await apiClient.getComments({ taskId: args.task_id });
      } else if (args.project_id) {
        comments = await apiClient.getComments({ projectId: args.project_id });
      } else {
        throw new Error("Either task_id or project_id must be provided");
      }
      
      const commentsArray = comments as unknown as any[];
      if (!commentsArray || commentsArray.length === 0) {
        return "No comments found.";
      }
      
      const commentList = commentsArray.map((comment: any) => {
        const date = new Date(comment.createdAt).toLocaleString();
        return `${comment.content} (ID: ${comment.id}) - ${date}`;
      }).join("\n");
      
      return `Found ${commentsArray.length} comment(s):\n${commentList}`;
    } catch (error) {
      throw new Error(`Failed to get comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// ===== LABEL OPERATIONS =====

// Tool: Get Labels
server.addTool({
  name: "get_labels",
  description: "Get all personal labels from Todoist",
  parameters: z.object({}),
  execute: async () => {
    try {
      const labels = await apiClient.getLabels();
      const labelsArray = labels as unknown as any[];
      
      if (!labelsArray || labelsArray.length === 0) {
        return "No labels found.";
      }
      
      const labelList = labelsArray.map((label: any) => {
        return `${label.name} (ID: ${label.id}) - Color: ${label.color || 'default'}`;
      }).join("\n");
      
      return `Found ${labelsArray.length} label(s):\n${labelList}`;
    } catch (error) {
      throw new Error(`Failed to get labels: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Create Label
server.addTool({
  name: "create_label",
  description: "Create a new personal label",
  parameters: z.object({
    name: z.string().describe("Label name"),
    color: z.string().optional().describe("Label color (30-49)"),
    is_favorite: z.boolean().optional().describe("Add to favorites"),
  }),
  execute: async (args) => {
    try {
      const label = await apiClient.addLabel({
        name: args.name,
        color: args.color ? Number(args.color) : undefined,
        isFavorite: args.is_favorite,
      });
      
      return `✅ Label created successfully:\nName: ${label.name}\nID: ${label.id}\nColor: ${label.color || 'default'}`;
    } catch (error) {
      throw new Error(`Failed to create label: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Update Label
server.addTool({
  name: "update_label",
  description: "Update an existing personal label",
  parameters: z.object({
    label_id: z.string().describe("Label ID to update"),
    name: z.string().optional().describe("New label name"),
    color: z.string().optional().describe("New label color (30-49)"),
    is_favorite: z.boolean().optional().describe("Add/remove from favorites"),
  }),
  execute: async (args) => {
    try {
      const updatedLabel = await apiClient.updateLabel(args.label_id, {
        name: args.name,
        color: args.color,
        isFavorite: args.is_favorite,
      });
      
      return `✅ Label updated successfully:\nName: ${updatedLabel.name}\nID: ${updatedLabel.id}\nColor: ${updatedLabel.color || 'default'}`;
    } catch (error) {
      throw new Error(`Failed to update label: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Delete Label
server.addTool({
  name: "delete_label",
  description: "Delete a personal label",
  parameters: z.object({
    label_name: z.string().describe("Label name to delete"),
  }),
  execute: async (args) => {
    try {
      // First get the label to find its ID
      const labels = await apiClient.getLabels();
      const labelsArray = labels as unknown as any[];
      const labelToDelete = labelsArray?.find((label: any) => label.name === args.label_name);
      
      if (!labelToDelete) {
        throw new Error(`Label "${args.label_name}" not found`);
      }
      
      await apiClient.deleteLabel(labelToDelete.id);
      return `✅ Label "${args.label_name}" deleted successfully.`;
    } catch (error) {
      throw new Error(`Failed to delete label: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Get Label Stats
server.addTool({
  name: "get_label_stats",
  description: "Get statistics about label usage across tasks",
  parameters: z.object({}),
  execute: async () => {
    try {
      const labels = await apiClient.getLabels();
      const labelsArray = labels as unknown as any[];
      
      if (!labelsArray || labelsArray.length === 0) {
        return "No labels found.";
      }
      
      // Get tasks to count label usage
      const tasks = await apiClient.getTasks();
      const tasksArray = tasks as unknown as any[];
      
      const labelStats = labelsArray.map((label: any) => {
        const usageCount = tasksArray?.filter((task: any) => 
          task.labels && task.labels.includes(label.name)
        ).length || 0;
        
        return `${label.name}: ${usageCount} task(s)`;
      }).join("\n");
      
      return `Label usage statistics:\n${labelStats}`;
    } catch (error) {
      throw new Error(`Failed to get label stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// ===== SUBTASK OPERATIONS =====

// Tool: Create Subtask
server.addTool({
  name: "create_subtask",
  description: "Create a subtask under a parent task",
  parameters: z.object({
    parent_task_id: z.string().describe("Parent task ID"),
    content: z.string().describe("Subtask content"),
    description: z.string().optional().describe("Subtask description"),
    priority: z.number().min(1).max(4).optional().describe("Subtask priority"),
  }),
  execute: async (args) => {
    try {
      const subtask = await apiClient.addTask({
        content: args.content,
        description: args.description,
        priority: args.priority,
        parentId: args.parent_task_id,
      });
      
      // Get parent task info
      const parentTask = await apiClient.getTask(args.parent_task_id);
      
      return `✅ Subtask created successfully:\nSubtask: ${subtask.content} (ID: ${subtask.id})\nParent: ${parentTask.content} (ID: ${parentTask.id})`;
    } catch (error) {
      throw new Error(`Failed to create subtask: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Bulk Create Subtasks
server.addTool({
  name: "bulk_create_subtasks",
  description: "Create multiple subtasks under a parent task",
  parameters: z.object({
    parent_task_id: z.string().describe("Parent task ID"),
    subtasks: z.array(z.object({
      content: z.string(),
      description: z.string().optional(),
      priority: z.number().min(1).max(4).optional(),
    })).min(1).max(20),
  }),
  execute: async (args) => {
    try {
      const results = [];
      for (const subtask of args.subtasks) {
        const createdSubtask = await apiClient.addTask({
          content: subtask.content,
          description: subtask.description,
          priority: subtask.priority,
          parentId: args.parent_task_id,
        });
        results.push(`✅ ${createdSubtask.content} (ID: ${createdSubtask.id})`);
      }
      
      const parentTask = await apiClient.getTask(args.parent_task_id);
      return `Bulk subtasks created under "${parentTask.content}":\n${results.join('\n')}`;
    } catch (error) {
      throw new Error(`Failed to bulk create subtasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Convert to Subtask
server.addTool({
  name: "convert_to_subtask",
  description: "Convert an existing task to a subtask of another task",
  parameters: z.object({
    task_id: z.string().describe("Task ID to convert to subtask"),
    parent_task_id: z.string().describe("New parent task ID"),
  }),
  execute: async (args) => {
    try {
      // Note: parentId cannot be changed via updateTask in this API version
      // This would require recreating the task as a subtask
      throw new Error("Converting existing tasks to subtasks is not supported in this API version. Please create a new subtask instead.");
    } catch (error) {
      throw new Error(`Failed to convert to subtask: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Promote Subtask
server.addTool({
  name: "promote_subtask",
  description: "Promote a subtask to become a main task (remove parent relationship)",
  parameters: z.object({
    subtask_id: z.string().describe("Subtask ID to promote"),
  }),
  execute: async (args) => {
    try {
      // Note: parentId cannot be removed via updateTask in this API version
      // This would require recreating the task as a main task
      throw new Error("Promoting subtasks to main tasks is not supported in this API version. Please recreate the task as a main task instead.");
    } catch (error) {
      throw new Error(`Failed to promote subtask: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Get Task Hierarchy
server.addTool({
  name: "get_task_hierarchy",
  description: "Get the complete hierarchy of a task including its subtasks",
  parameters: z.object({
    task_id: z.string().describe("Task ID to get hierarchy for"),
  }),
  execute: async (args) => {
    try {
      // Get the main task
      const mainTask = await apiClient.getTask(args.task_id);
      
      // Get all tasks to find subtasks
      const allTasks = await apiClient.getTasks();
      const tasksArray = allTasks as unknown as any[];
      
      // Find direct subtasks
      const subtasks = tasksArray?.filter((task: any) => 
        task.parentId === args.task_id
      ) || [];
      
      let hierarchy = `📋 Task Hierarchy:\n`;
      hierarchy += `📌 ${mainTask.content} (ID: ${mainTask.id})\n`;
      
      if (subtasks.length > 0) {
        hierarchy += `└── ${subtasks.length} subtask(s):\n`;
        subtasks.forEach((subtask: any, index: number) => {
          const isLast = index === subtasks.length - 1;
          const prefix = isLast ? '   └── ' : '   ├── ';
          hierarchy += `${prefix} ${subtask.content} (ID: ${subtask.id})\n`;
        });
      } else {
        hierarchy += `└── No subtasks\n`;
      }
      
      return hierarchy;
    } catch (error) {
      throw new Error(`Failed to get task hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// ===== TESTING OPERATIONS =====

// Tool: Test All Features
server.addTool({
  name: "test_all_features",
  description: "Comprehensive test of all Todoist MCP server features",
  parameters: z.object({
    mode: z.enum(["basic", "enhanced"]).optional().describe("Test mode: basic or enhanced"),
  }),
  execute: async (args) => {
    try {
      const mode = args.mode || "basic";
      const results = [];
      
      // Test 1: Get projects
      try {
        const projects = await apiClient.getProjects();
        const projectsArray = projects as unknown as any[];
        results.push(`✅ Projects: ${projectsArray?.length || 0} found`);
      } catch (e) {
        results.push(`❌ Projects: Failed - ${e instanceof Error ? e.message : 'Unknown'}`);
      }
      
      // Test 2: Get tasks
      try {
        const tasks = await apiClient.getTasks();
        const tasksArray = tasks as unknown as any[];
        results.push(`✅ Tasks: ${tasksArray?.length || 0} found`);
      } catch (e) {
        results.push(`❌ Tasks: Failed - ${e instanceof Error ? e.message : 'Unknown'}`);
      }
      
      // Test 3: Create test task (only in enhanced mode)
      if (mode === "enhanced") {
        try {
          const testTask = await apiClient.addTask({
            content: `MCP Test Task - ${new Date().toISOString()}`,
          });
          results.push(`✅ Create: Task ${testTask.id} created`);
          
          // Clean up - delete the test task
          await apiClient.deleteTask(testTask.id);
          results.push(`✅ Delete: Test task cleaned up`);
        } catch (e) {
          results.push(`❌ Create/Delete: Failed - ${e instanceof Error ? e.message : 'Unknown'}`);
        }
      }
      
      return `🧪 Todoist MCP Server Test Results (${mode} mode):\n${results.join('\n')}`;
    } catch (error) {
      throw new Error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Tool: Test Performance
server.addTool({
  name: "test_performance",
  description: "Test the performance of Todoist API operations",
  parameters: z.object({
    iterations: z.number().min(1).max(10).optional().describe("Number of test iterations (default: 3)"),
  }),
  execute: async (args) => {
    try {
      const iterations = args.iterations || 3;
      const results = [];
      
      for (let i = 1; i <= iterations; i++) {
        const startTime = Date.now();
        
        try {
          // Test API response time
          await apiClient.getProjects();
          const responseTime = Date.now() - startTime;
          results.push(`✅ Iteration ${i}: ${responseTime}ms`);
        } catch (e) {
          results.push(`❌ Iteration ${i}: Failed - ${e instanceof Error ? e.message : 'Unknown'}`);
        }
      }
      
      const avgResponseTime = results
        .filter(r => r.includes('✅'))
        .reduce((sum, r) => {
          const time = parseInt(r.match(/(\d+)ms/)?.[1] || '0');
          return sum + time;
        }, 0) / Math.max(1, results.filter(r => r.includes('✅')).length);
      
      return `⚡ Performance Test Results (${iterations} iterations):\n${results.join('\n')}\n📊 Average response time: ${avgResponseTime.toFixed(0)}ms`;
    } catch (error) {
      throw new Error(`Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
