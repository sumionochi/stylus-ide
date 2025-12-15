import { OpenAI } from "openai";

export const runtime = "edge";
// Increased maxDuration for more complex completions if needed
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const COMPLETION_SYSTEM_PROMPT = `You are an AI code completion assistant for Arbitrum Stylus smart contracts.

Rules:
- ONLY output the code completion, no explanations
- Match the existing code style and indentation
- Complete the function, type, or statement being written
- Use Stylus SDK v0.9.x patterns
- Keep completions concise and relevant
- NO markdown formatting, just raw code`;

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const fullPrompt = `${context}\n\n// Complete this:\n${prompt}`;

    // 1. Create the completion with stream: true
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: COMPLETION_SYSTEM_PROMPT },
        { role: "user", content: fullPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      stream: true,
    });

    // 2. Create a native ReadableStream to handle the response chunks
    //
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          // Iterate over the async iterable provided by the OpenAI SDK
          for await (const chunk of response) {
            // Note: Completion responses are similar to chat, using 'content'
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
    console.error("Completion API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Completion failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
