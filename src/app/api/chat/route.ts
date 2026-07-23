import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, systemPrompt } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', message: 'Missing or invalid messages' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const result = await streamText({
      model: google('gemini-2.5-flash'),
      messages,
      system: systemPrompt,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);

    // Detect rate-limiting (Google Gemini returns 429 or throws a specific error)
    const errMessage = error instanceof Error ? error.message.toLowerCase() : '';
    const isRateLimited =
      errMessage.includes('429') ||
      errMessage.includes('rate') ||
      errMessage.includes('quota') ||
      errMessage.includes('too many requests') ||
      errMessage.includes('resource exhausted');

    const errorCode = isRateLimited ? 'rate_limited' : 'server_error';
    const status = isRateLimited ? 429 : 500;
    const displayMessage = isRateLimited
      ? 'AI is temporarily rate-limited. The app will use fallback responses.'
      : 'AI service unavailable. The app will use fallback responses.';

    return new Response(JSON.stringify({ error: errorCode, message: displayMessage }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
