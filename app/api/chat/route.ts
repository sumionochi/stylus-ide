import { OpenAI } from "openai";

export const runtime = "edge";
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert Rust and Arbitrum Stylus smart contract developer. You help developers write, debug, and optimize Stylus contracts.

Key knowledge:
- Stylus uses Rust + stylus-sdk (currently v0.9.x)
- Contracts use sol_storage! macro for storage
- #[public] macro for external functions
- alloy_primitives for types (U256, Address, etc.)
- View functions (read-only) vs write functions (state changes)
- WASM deployment with 24KB limit
- Common patterns: ERC-20, Counter, Storage examples

Response guidelines:
- Provide concise, actionable code
- Explain Stylus-specific patterns
- Point out common mistakes
- Suggest gas optimizations
- Format code in markdown with \`\`\`rust blocks
- Keep explanations brief but clear`;

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build messages with context
    const contextMessage = context
      ? {
          role: "system" as const,
          content: `Current context:\n${context}`,
        }
      : null;

    const allMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...(contextMessage ? [contextMessage] : []),
      ...messages,
    ];

    // 1. Create the completion with stream: true
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    // 2. Create a native ReadableStream to handle the response chunks
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          // Iterate over the async iterable provided by the OpenAI SDK
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              // Encode string to Uint8Array and enqueue
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    // 3. Return a standard Response with the stream
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Chat failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
