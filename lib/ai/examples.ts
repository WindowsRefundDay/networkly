/**
 * AI Model Manager - Example Usage
 * 
 * This file demonstrates various ways to use the AI Model Management System.
 * It is NOT meant to be run directly, but serves as documentation and examples.
 */

import {
  getAIManager,
  createAIManager,
  createGroqProvider,
  createOpenRouterProvider,
  type Message,
  type UseCase,
  type CompletionResult,
  AIProviderError,
  RateLimitError,
} from '@/lib/ai'

// =============================================================================
// BASIC USAGE
// =============================================================================

/**
 * Example 1: Simple chat completion using the singleton manager
 */
async function basicChatExample() {
  const ai = getAIManager()

  const result = await ai.complete({
    messages: [
      { role: 'user', content: 'What is the capital of France?' }
    ],
    useCase: 'chat',
  })

  console.log('Response:', result.content)
  console.log('Model used:', result.provider + '/' + result.model)
  console.log('Tokens:', result.usage.totalTokens)
  console.log('Latency:', result.latencyMs, 'ms')
}

/**
 * Example 2: Streaming response
 */
async function streamingExample() {
  const ai = getAIManager()

  process.stdout.write('AI: ')

  for await (const chunk of ai.stream({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Tell me a short story about a robot.' }
    ],
    useCase: 'chat',
    temperature: 0.8,
  })) {
    process.stdout.write(chunk.content)
  }

  console.log('\n--- Done ---')
}

// =============================================================================
// USE CASE-BASED ROUTING
// =============================================================================

/**
 * Example 3: Different use cases automatically route to optimal models
 */
async function useCaseExamples() {
  const ai = getAIManager()

  // Fast response - uses Groq's fast inference
  const quickAnswer = await ai.complete({
    messages: [{ role: 'user', content: 'What is 2+2?' }],
    useCase: 'fast-response',
  })
  console.log('Fast response:', quickAnswer.content)

  // High quality - uses Claude or GPT-4
  const qualityAnswer = await ai.complete({
    messages: [{ role: 'user', content: 'Explain quantum entanglement to a 5-year-old.' }],
    useCase: 'high-quality',
    maxTokens: 500,
  })
  console.log('Quality response:', qualityAnswer.content)

  // Code generation - uses coding-optimized models
  const code = await ai.complete({
    messages: [{ role: 'user', content: 'Write a TypeScript function to reverse a string' }],
    useCase: 'code-generation',
  })
  console.log('Generated code:', code.content)

  // Cost-effective - uses free/cheap models
  const cheapAnswer = await ai.complete({
    messages: [{ role: 'user', content: 'Summarize: The quick brown fox jumps over the lazy dog.' }],
    useCase: 'cost-effective',
  })
  console.log('Cost-effective response:', cheapAnswer.content)
}

// =============================================================================
// CUSTOM CONFIGURATION
// =============================================================================

/**
 * Example 4: Create a custom-configured manager
 */
async function customConfigExample() {
  const ai = createAIManager({
    providers: [
      {
        name: 'groq',
        apiKey: process.env.GROQ_API_KEY!,
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        defaultModel: 'llama-3.3-70b-versatile',
        enabled: true,
        timeout: 30000,
        maxRetries: 3,
        rateLimitRpm: 30,
        rateLimitTpm: 14400,
      },
      {
        name: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY!,
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        defaultModel: 'openai/gpt-4o-mini',
        enabled: true,
        timeout: 60000,
        maxRetries: 3,
      },
    ],
    useCases: [
      {
        useCase: 'chat',
        primaryModel: 'groq:llama-3.3-70b-versatile',
        fallbackModels: ['openrouter:openai/gpt-4o-mini'],
        defaultTemperature: 0.7,
      },
      {
        useCase: 'analysis',
        primaryModel: 'openrouter:anthropic/claude-3.5-sonnet',
        fallbackModels: ['groq:llama-3.3-70b-versatile'],
        defaultTemperature: 0.3,
        maxTokens: 4000,
      },
    ],
    globalTimeout: 30000,
    globalMaxRetries: 3,
    enableHealthChecks: true,
    healthCheckIntervalMs: 60000,
    enableLogging: true,
    logLevel: 'info',
  })

  const result = await ai.complete({
    messages: [{ role: 'user', content: 'Hello!' }],
    useCase: 'chat',
  })

  console.log(result.content)
  
  // Don't forget to cleanup
  ai.shutdown()
}

// =============================================================================
// DIRECT PROVIDER USAGE
// =============================================================================

/**
 * Example 5: Use providers directly for fine-grained control
 */
async function directProviderExample() {
  // Create Groq provider directly
  const groq = createGroqProvider(process.env.GROQ_API_KEY!)

  // List available models
  console.log('Groq models:', groq.getModels().map(m => m.id))

  // Make a request
  const result = await groq.complete({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is the meaning of life?' }
    ],
    temperature: 0.7,
    maxTokens: 200,
  })

  console.log(result.content)

  // Create OpenRouter provider
  const openrouter = createOpenRouterProvider(process.env.OPENROUTER_API_KEY!)
  
  // Use a specific model
  const gptResult = await openrouter.complete({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: 'Hello!' }],
  })

  console.log(gptResult.content)
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Example 6: Proper error handling
 */
async function errorHandlingExample() {
  const ai = getAIManager()

  try {
    const result = await ai.complete({
      messages: [{ role: 'user', content: 'Hello!' }],
      useCase: 'chat',
    })
    console.log(result.content)
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.error(`Rate limited by ${error.provider}. Retry after ${error.retryAfter}s`)
      // Wait and retry
      const retryAfter = error.retryAfter
      if (retryAfter) {
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
        // Retry the request...
      }
    } else if (error instanceof AIProviderError) {
      console.error(`Provider error (${error.provider}): ${error.message}`)
      if (error.retryable) {
        console.log('This error is retryable')
      }
    } else {
      console.error('Unexpected error:', error)
    }
  }
}

// =============================================================================
// HEALTH MONITORING
// =============================================================================

/**
 * Example 7: Monitor provider health
 */
async function healthMonitoringExample() {
  const ai = getAIManager()

  // Get current status of all providers
  const statuses = ai.getProviderStatuses()
  console.log('Provider statuses:', statuses)

  // Check specific provider
  const groqStatus = ai.getProviderStatus('groq')
  console.log('Groq healthy:', groqStatus?.healthy)

  // Run health checks manually
  const results = await ai.runHealthChecks()
  console.log('Health check results:', results)

  // Get only healthy providers
  const healthyProviders = ai.getHealthyProviders()
  console.log('Healthy providers:', healthyProviders)
}

// =============================================================================
// MODEL DISCOVERY
// =============================================================================

/**
 * Example 8: Discover available models
 */
function modelDiscoveryExample() {
  const ai = getAIManager()

  // Get all models
  const allModels = ai.getAllModels()
  console.log(`Total models available: ${allModels.length}`)

  // Get models by provider
  const groqModels = ai.getProviderModels('groq')
  const openrouterModels = ai.getProviderModels('openrouter')
  
  console.log(`Groq models: ${groqModels.length}`)
  console.log(`OpenRouter models: ${openrouterModels.length}`)

  // Filter by capabilities
  const visionModels = allModels.filter(m => m.supportsVision)
  console.log('Vision-capable models:', visionModels.map(m => m.id))

  const freeModels = allModels.filter(m => m.tier === 'free')
  console.log('Free models:', freeModels.map(m => m.id))

  const functionCallingModels = allModels.filter(m => m.supportsFunctionCalling)
  console.log('Function calling models:', functionCallingModels.map(m => m.id))
}

// =============================================================================
// DYNAMIC USE CASE CONFIGURATION
// =============================================================================

/**
 * Example 9: Configure use cases at runtime
 */
async function dynamicConfigExample() {
  const ai = getAIManager()

  // Add a custom use case configuration
  ai.configureUseCase({
    useCase: 'summarization',
    primaryModel: 'groq:llama-3.1-8b-instant',
    fallbackModels: ['groq:gemma2-9b-it'],
    defaultTemperature: 0.3,
    maxTokens: 500,
    systemPrompt: 'You are a concise summarization assistant.',
  })

  // Use the configured use case
  const result = await ai.complete({
    messages: [{
      role: 'user',
      content: 'Summarize: Artificial intelligence is transforming industries...'
    }],
    useCase: 'summarization',
  })

  console.log('Summary:', result.content)
}

// =============================================================================
// FUNCTION CALLING
// =============================================================================

/**
 * Example 10: Function/Tool calling
 */
async function functionCallingExample() {
  const ai = getAIManager()

  const result = await ai.complete({
    messages: [
      { role: 'user', content: 'What is the weather in San Francisco?' }
    ],
    model: 'groq:llama-3.3-70b-versatile',
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get the current weather in a given location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and state, e.g. San Francisco, CA',
              },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
              },
            },
            required: ['location'],
          },
        },
      },
    ],
    toolChoice: 'auto',
  })

  if (result.toolCalls) {
    console.log('Tool calls:', result.toolCalls)
    // Process tool calls and send results back...
  } else {
    console.log('Response:', result.content)
  }
}

// =============================================================================
// JSON MODE
// =============================================================================

/**
 * Example 11: JSON mode for structured output
 */
async function jsonModeExample() {
  const ai = getAIManager()

  const result = await ai.complete({
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that outputs JSON. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: 'List 3 programming languages with their year of creation'
      }
    ],
    model: 'groq:llama-3.3-70b-versatile',
    responseFormat: { type: 'json_object' },
    temperature: 0,
  })

  const parsed = JSON.parse(result.content)
  console.log('Parsed JSON:', parsed)
}

// Export examples for testing
export {
  basicChatExample,
  streamingExample,
  useCaseExamples,
  customConfigExample,
  directProviderExample,
  errorHandlingExample,
  healthMonitoringExample,
  modelDiscoveryExample,
  dynamicConfigExample,
  functionCallingExample,
  jsonModeExample,
}
