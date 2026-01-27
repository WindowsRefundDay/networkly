import { createVertex } from '@ai-sdk/google-vertex'
import { generateText, streamText, type ModelMessage, type Tool } from 'ai'
import { logger } from './utils/logger'

const GOOGLE_CONFIG = {
    project: process.env.GOOGLE_VERTEX_PROJECT!,
    location: process.env.GOOGLE_VERTEX_LOCATION || 'us-central1',
    modelId: 'gemini-2.5-flash',
}

if (!GOOGLE_CONFIG.project) {
    throw new Error('Missing GOOGLE_VERTEX_PROJECT environment variable')
}

const vertexProvider = createVertex({
    project: GOOGLE_CONFIG.project,
    location: GOOGLE_CONFIG.location,
})

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

export class GoogleModelManager {
    private model = vertexProvider(GOOGLE_CONFIG.modelId)

    constructor() {
        logger.info('GoogleModelManager', `Initialized strict model: ${GOOGLE_CONFIG.modelId}`)
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
                        contentParts.push({ type: 'text', text: msg.content })
                    }
                    
                    for (const tc of msg.toolCalls) {
                        contentParts.push({
                            type: 'tool-call',
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
                    type: 'tool-result',
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
