/**
 * AI Tools - Export all tool definitions and executors
 */

export { AI_TOOLS, TOOL_ACTIONS } from './definitions'
export type { ToolDefinition } from './definitions'

export { 
  executeTool,
  getUserProfile,
  getExtracurriculars,
  getSavedOpportunities,
  getProjects,
  getGoals,
  searchOpportunities,
  bookmarkOpportunity,
} from './executors'
export type { ToolResult } from './executors'
