import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';

export const maxDuration = 30;

const VALID_ROLES = new Set(['user', 'assistant']);

/**
 * Detect if stream text is actually an AI provider error
 * (Gemini JSON error, Vercel SDK error) rather than legitimate content.
 */
function isAIErrorContent(text: string): boolean {
  if (!text || text.length === 0) return false;
  return (
    text.includes('Error [AI_') ||
    text.includes('AI_RetryError') ||
    text.includes('AI_APICallError') ||
    text.includes('InvalidPromptError') ||
    text.includes('TypeValidationError') ||
    text.includes('RESOURCE_EXHAUSTED') ||
    (text.includes('"error":') && (text.includes('"code"') || text.includes('"message"')))
  );
}

/**
 * Validate and sanitize messages before passing to Gemini.
 * Returns the sanitized messages array, or a Response if validation fails.
 */
function sanitizeMessages(
  messages: unknown[],
): { sanitized: Array<{ role: 'user' | 'assistant'; content: string }> } | Response {
  const sanitized: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') {
      return new Response(
        JSON.stringify({ error: 'invalid_prompt', message: 'Invalid message format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const m = msg as Record<string, unknown>;
    const role = String(m.role ?? '');
    const content = String(m.content ?? '');

    // Map any unrecognized role to 'user' (safety net)
    const sanitizedRole = VALID_ROLES.has(role) ? (role as 'user' | 'assistant') : 'user';

    sanitized.push({ role: sanitizedRole, content });
  }

  return { sanitized };
}

/**
 * Build an error Response for the hook to detect as a fallback trigger.
 */
function errorResponse(status: number, displayMessage: string): Response {
  return new Response(JSON.stringify({ error: 'ai_error', message: displayMessage }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { systemPrompt } = body;
    const rawMessages = body.messages as unknown[];

    if (!rawMessages || !Array.isArray(rawMessages)) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', message: 'Missing or invalid messages' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Validate & sanitize messages before passing to streamText
    const sanitizedResult = sanitizeMessages(rawMessages);
    if (sanitizedResult instanceof Response) return sanitizedResult;

    // Gemini requires at least one message. When empty (initial greeting),
    // seed with a simple user message so the system prompt drives the response.
    const safeMessages =
      sanitizedResult.sanitized.length === 0
        ? [{ role: 'user' as const, content: 'Begin the session.' }]
        : sanitizedResult.sanitized;

    const result = await streamText({
      model: groq('llama-3.3-70b-versatile'),
      messages: safeMessages,
      system: systemPrompt,
      temperature: 0.7,
    });

    // The Vercel AI SDK's Google provider sometimes swallows Gemini 429 errors
    // and returns an empty/error stream as HTTP 200. To catch this, we read the
    // first chunk of the stream and check for error content before passing it through.
    // If the first chunk looks like an error, we return a proper error response so
    // the client-side hook can trigger its fallback logic.
    const textStream = result.textStream;
    const iterator = textStream[Symbol.asyncIterator]();
    const firstResult = await iterator.next();

    // Stream ended immediately with no content — likely an error
    if (firstResult.done) {
      console.warn('AI stream ended immediately with no content (likely provider error)');
      return errorResponse(
        503,
        'AI service returned empty response. The app will use fallback responses.',
      );
    }

    const firstChunk = firstResult.value;

    // Check if the first chunk contains error content
    if (isAIErrorContent(firstChunk)) {
      console.warn('AI stream returned error content, returning 503:', firstChunk.slice(0, 100));

      // Determine if it's rate limiting vs other errors
      const isRateLimit =
        firstChunk.includes('429') ||
        firstChunk.includes('quota') ||
        firstChunk.includes('rate limit') ||
        firstChunk.includes('RESOURCE_EXHAUSTED');

      return errorResponse(
        isRateLimit ? 429 : 503,
        isRateLimit
          ? 'AI is temporarily rate-limited. The app will use fallback responses.'
          : 'AI service encountered an error. The app will use fallback responses.',
      );
    }

    // Stream is valid — create a new stream that includes the first chunk + the rest
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(firstChunk));

          // Stream the remaining chunks
          while (true) {
            const next = await iterator.next();
            if (next.done) break;
            controller.enqueue(encoder.encode(next.value));
          }

          controller.close();
        } catch (streamErr) {
          console.error('Stream error after first chunk:', streamErr);
          controller.error(streamErr);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // Detect what kind of error this is for appropriate fallback signaling
    const errMessage = error instanceof Error ? error.message.toLowerCase() : '';

    let errorCode = 'server_error';
    let status = 500;
    let displayMessage = 'AI service unavailable. The app will use fallback responses.';

    if (
      errMessage.includes('429') ||
      errMessage.includes('rate') ||
      errMessage.includes('quota') ||
      errMessage.includes('too many requests') ||
      errMessage.includes('resource exhausted')
    ) {
      errorCode = 'rate_limited';
      status = 429;
      displayMessage = 'AI is temporarily rate-limited. The app will use fallback responses.';
    } else if (
      errMessage.includes('invalid prompt') ||
      errMessage.includes('invalid message') ||
      errMessage.includes('schema') ||
      errMessage.includes('validation')
    ) {
      errorCode = 'invalid_prompt';
      status = 422;
      displayMessage = 'AI received an invalid request. The app will use fallback responses.';
    } else if (
      errMessage.includes('api key') ||
      errMessage.includes('unauthorized') ||
      errMessage.includes('not found') ||
      errMessage.includes('model not found')
    ) {
      errorCode = 'auth_error';
      status = 401;
      displayMessage =
        'AI authentication failed. The app will use fallback responses. Check your API key.';
    }

    return new Response(JSON.stringify({ error: errorCode, message: displayMessage }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
