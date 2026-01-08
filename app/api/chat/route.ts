import { consumeStream, convertToModelMessages, streamText, type UIMessage } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const prompt = convertToModelMessages(messages)

  const result = streamText({
    model: "openai/gpt-4o",
    system: `You are Networkly AI, a helpful career assistant for students and young professionals. You help with:
- Career advice and guidance
- Networking strategies and introductions
- Application assistance (cover letters, emails, follow-ups)
- Interview preparation
- Skill development recommendations
- Opportunity discovery

Be friendly, professional, and actionable in your advice. Keep responses concise but helpful.
When suggesting connections or opportunities, be specific about why they'd be a good match.`,
    messages: prompt,
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    onFinish: async ({ isAborted }) => {
      if (isAborted) {
        console.log("Aborted")
      }
    },
    consumeSseStream: consumeStream,
  })
}
