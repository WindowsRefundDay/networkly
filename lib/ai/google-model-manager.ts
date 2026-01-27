import { createVertex } from '@ai-sdk/google-vertex'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, streamText, type ModelMessage, type Tool, type LanguageModel } from 'ai'
import { logger } from './utils/logger'

export type Role = 'system' | 'user' | 'assistant' | 'tool'

export interface Message {
    role: Role
    content: string
    toolCalls?: Array<{
        id?: string
        toolCallId?: string
        function: { name: string; arguments: string | Record<string, unknown> }
    }>
    toolCallId?: string
    name?: string
}

export interface GoogleModelConfig {
    project?: string
    location?: string
    apiKey?: string
    credentialsJson?: string
    modelId?: string
}

export class GoogleModelManager {
    private model: LanguageModel
    private modelId: string

    constructor(config?: GoogleModelConfig) {
        // Load config from params or env
        const project = config?.project || process.env.GOOGLE_VERTEX_PROJECT
        const location = config?.location || process.env.GOOGLE_VERTEX_LOCATION || 'us-central1'
        const apiKey = config?.apiKey || process.env.GOOGLE_API_KEY
        const credentialsJson = config?.credentialsJson || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

        this.modelId = config?.modelId || 'gemini-2.5-flash'

        // Priority 1: Vertex AI
        if (project) {
            let googleAuthOptions: { credentials?: any, keyFilename?: string } | undefined = undefined;

            if (credentialsJson) {
                try {
                    const parsed = JSON.parse(credentialsJson)
                    googleAuthOptions = { credentials: {
                        client_email: parsed.client_email,
                        private_key: parsed.private_key,
                        project_id: project
                    }}
                } catch (error) {
                    logger.error('GoogleModelManager', 'Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON', { error: String(error) })
                    // Fallback to ADC if JSON parsing fails? Or throw?
                    // Better to log and let it try ADC or fail naturally, but maybe we should rely on ADC if parsing failed.
                }
            }

            // If no JSON credentials provided or parsing failed, we don't set googleAuthOptions
            // This allows createVertex to default to ADC (e.g. keyFilename from GOOGLE_APPLICATION_CREDENTIALS or gcloud auth)
            // But wait, createVertex({ googleAuthOptions }) - if we pass undefined, it uses defaults.

            const vertexProvider = createVertex({
                project,
                location,
                googleAuthOptions,
            })

            this.model = vertexProvider(this.modelId)
            logger.info('GoogleModelManager', `Initialized with Vertex AI (${project}, ${location})`)

        }
        // Priority 2: Google AI (Gemini API)
        else if (apiKey) {
            const googleProvider = createGoogleGenerativeAI({
                apiKey,
            })
            this.model = googleProvider(this.modelId)
            logger.info('GoogleModelManager', `Initialized with Google AI (API Key)`)
        }
        else {
            throw new Error('Missing Google Cloud configuration. Please set GOOGLE_VERTEX_PROJECT (for Vertex AI) or GOOGLE_API_KEY (for Gemini API).')
        }
    }

    async complete(options: {
        messages: Message[]
        tools?: Record<string, Tool>
        maxTokens?: number
        temperature?: number
        system?: string
        experimental_context?: Record<string, unknown>
    }) {
        const { messages, tools, maxTokens = 2048, temperature = 0.7, system, experimental_context } = options
        const modelMessages = this.convertMessages(messages)

        try {
            const result = await generateText({
                model: this.model,
                messages: modelMessages,
                system,
                tools,
                maxOutputTokens: maxTokens,
                temperature,
                experimental_context,
            })

            return result
        } catch (error) {
            logger.error('GoogleModelManager', 'Completion failed', { error: String(error) })
            throw error
        }
    }

    async stream(options: {
        messages: Message[]
        tools?: Record<string, Tool>
        maxTokens?: number
        temperature?: number
        system?: string
        experimental_context?: Record<string, unknown>
    }) {
        const { messages, tools, maxTokens = 2048, temperature = 0.7, system, experimental_context } = options
        const modelMessages = this.convertMessages(messages)

        try {
            const result = streamText({
                model: this.model,
                messages: modelMessages,
                system,
                tools,
                maxOutputTokens: maxTokens,
                temperature,
                experimental_context,
            })

            return result
        } catch (error) {
            logger.error('GoogleModelManager', 'Stream failed', { error: String(error) })
            throw error
        }
    }

    private convertMessages(messages: Message[]): ModelMessage[] {
        return messages.map((msg): ModelMessage => {
            if (msg.role === 'system') {
                return { role: 'system', content: msg.content }
            }

            if (msg.role === 'user') {
                return { role: 'user', content: msg.content }
            }

            if (msg.role === 'assistant') {
                if (msg.toolCalls && msg.toolCalls.length > 0) {
                    const contentParts = []
                    
                    if (msg.content) {
                        contentParts.push({ type: 'text' as const, text: msg.content })
                    }
                    
                    for (const tc of msg.toolCalls) {
                        contentParts.push({
                            type: 'tool-call' as const,
                            toolCallId: tc.id || tc.toolCallId || 'unknown',
                            toolName: tc.function.name,
                            args: typeof tc.function.arguments === 'string'
                                ? JSON.parse(tc.function.arguments)
                                : tc.function.arguments,
                        })
                    }
                    
                    return { role: 'assistant', content: contentParts } as ModelMessage
                }
                return { role: 'assistant', content: msg.content || '' }
            }

            if (msg.role === 'tool') {
                const toolContent = [{
                    type: 'tool-result' as const,
                    toolCallId: msg.toolCallId || 'unknown',
                    toolName: msg.name || 'unknown',
                    output: { type: 'json', value: JSON.parse(msg.content || '{}') },
                }]
                return { role: 'tool', content: toolContent } as ModelMessage
            }

            return { role: 'user', content: String(msg.content) }
        })
    }
}

export const googleAI = new GoogleModelManager()
