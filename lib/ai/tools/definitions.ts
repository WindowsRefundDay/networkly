/**
 * AI Tool Definitions - OpenAI-compatible function calling schemas
 * 
 * These tools allow the AI to access user data and perform actions.
 * Tool names and technical details are never shown to users.
 */

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, {
        type: string
        description: string
        enum?: string[]
      }>
      required: string[]
    }
  }
}

export const AI_TOOLS: ToolDefinition[] = [
  // Profile & Data Access
  {
    type: 'function',
    function: {
      name: 'get_user_profile',
      description: 'Get the current user\'s profile including name, skills, interests, and career goals. Use this to personalize advice.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_extracurriculars',
      description: 'Get the user\'s extracurricular activities and experiences.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_saved_opportunities',
      description: 'Get opportunities the user has bookmarked/saved.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_projects',
      description: 'Get the user\'s projects.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_goals',
      description: 'Get the user\'s career goals and roadmaps.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },

  // Opportunity Search (Database)
  {
    type: 'function',
    function: {
      name: 'search_opportunities',
      description: 'Look for opportunities in the database. Returns matching opportunities or empty array if none found. Use this when user asks to find opportunities.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (e.g., "robotics", "STEM internship", "summer program")'
          },
          category: {
            type: 'string',
            description: 'Category filter (optional)',
            enum: ['STEM', 'Arts', 'Business', 'Community Service', 'Sports', 'Other']
          },
          type: {
            type: 'string',
            description: 'Type filter (optional)',
            enum: ['Internship', 'Competition', 'Summer Program', 'Research', 'Volunteer', 'Scholarship']
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return (default 5)'
          }
        },
        required: ['query']
      }
    }
  },

  // Bookmark (requires user confirmation via UI)
  {
    type: 'function',
    function: {
      name: 'bookmark_opportunity',
      description: 'Save an opportunity to the user\'s bookmarks. Only call this AFTER user has confirmed they want to bookmark via the UI button.',
      parameters: {
        type: 'object',
        properties: {
          opportunityId: {
            type: 'string',
            description: 'The opportunity ID to bookmark'
          },
          opportunityTitle: {
            type: 'string',
            description: 'The opportunity title (for confirmation message)'
          }
        },
        required: ['opportunityId', 'opportunityTitle']
      }
    }
  },

  // Web Discovery (requires user permission)
  {
    type: 'function',
    function: {
      name: 'trigger_web_discovery',
      description: 'Search the web for new opportunities. Only call this AFTER user has agreed to look on the web (clicked the button). This takes 30-60 seconds.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for web discovery'
          }
        },
        required: ['query']
      }
    }
  }
]

// Tool name to friendly action mapping (for internal use only)
export const TOOL_ACTIONS: Record<string, string> = {
  'get_user_profile': 'Looking at your profile...',
  'get_extracurriculars': 'Checking your activities...',
  'get_saved_opportunities': 'Looking at your bookmarks...',
  'get_projects': 'Checking your projects...',
  'get_goals': 'Looking at your goals...',
  'search_opportunities': 'Looking for opportunities...',
  'bookmark_opportunity': 'Saving to your bookmarks...',
  'trigger_web_discovery': 'Looking across the web...',
}
