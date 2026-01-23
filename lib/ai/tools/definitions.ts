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
      description: 'Basic search for opportunities. Use smart_search_opportunities instead for personalized results.',
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

  // Smart Search - Profile-Aware (Preferred)
  {
    type: 'function',
    function: {
      name: 'smart_search_opportunities',
      description: 'Search opportunities with automatic personalization based on user profile. This is the PREFERRED search - it automatically considers user interests, skills, grade level, and location. Use this for all opportunity searches.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (e.g., "robotics", "summer internship", "coding"). Can be empty to get personalized recommendations.'
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
            description: 'Maximum results to return (default 10)'
          }
        },
        required: []
      }
    }
  },

  // Filter by Deadline
  {
    type: 'function',
    function: {
      name: 'filter_by_deadline',
      description: 'Find opportunities with deadlines within a specific timeframe. Great for "what\'s due soon" or "deadlines this week/month" queries.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days from now to search within (e.g., 7 for next week, 30 for next month)'
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
            description: 'Maximum results to return (default 10)'
          }
        },
        required: ['days']
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
      description: 'Basic web search for opportunities. Use personalized_web_discovery instead for better results. Only call AFTER user agrees.',
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
  },

  // Personalized Web Discovery (preferred)
  {
    type: 'function',
    function: {
      name: 'personalized_web_discovery',
      description: 'Search the web for opportunities using the user profile (interests, skills, location). This is the PREFERRED web discovery tool. Only call AFTER user has explicitly agreed to look on the web. Takes 30-60 seconds.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Optional topic focus (e.g., "robotics", "summer programs"). If empty, uses user interests.'
          },
          category: {
            type: 'string',
            description: 'Category focus (optional)',
            enum: ['STEM', 'Arts', 'Business', 'Community Service', 'Sports']
          }
        },
        required: []
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
  'smart_search_opportunities': 'Finding personalized opportunities...',
  'filter_by_deadline': 'Checking deadlines...',
  'bookmark_opportunity': 'Saving to your bookmarks...',
  'trigger_web_discovery': 'Looking across the web...',
  'personalized_web_discovery': 'Searching the web based on your interests...',
}
