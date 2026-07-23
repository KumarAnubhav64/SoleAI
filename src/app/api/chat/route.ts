import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export const maxDuration = 30;

const VALID_ROLES = new Set(['user', 'assistant']);

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
      model: google('gemini-2.5-flash'),
      messages: safeMessages,
      system: systemPrompt,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
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
