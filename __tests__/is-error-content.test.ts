import { describe, it, expect } from 'vitest';

// Duplicate the logic from useAIExpertConnection.ts
function isErrorContent(text: string): boolean {
  return (
    text.startsWith('Error [AI_') ||
    text.includes('Error [AI_') ||
    text.startsWith('AI_InvalidPromptError') ||
    text.startsWith('AI_TypeValidationError') ||
    text.includes('InvalidPromptError') ||
    text.includes('TypeValidationError') ||
    text.includes('AI_RetryError') ||
    text.includes('AI_APICallError') ||
    text.includes('RESOURCE_EXHAUSTED') ||
    (text.includes('"error":') && (text.includes('"code"') || text.includes('"message"')))
  );
}

describe('isErrorContent', () => {
  it('detects Gemini 429 quota exceeded JSON', () => {
    const errorJson = `{
  "error": {
    "code": 429,
    "message": "You exceeded your current quota",
    "status": "RESOURCE_EXHAUSTED"
  }
}`;
    expect(isErrorContent(errorJson)).toBe(true);
  });

  it('detects RESOURCE_EXHAUSTED', () => {
    expect(isErrorContent('RESOURCE_EXHAUSTED')).toBe(true);
  });

  it('detects quoted error + code JSON pattern', () => {
    expect(isErrorContent('{"error": {"code": 429}}')).toBe(true);
  });

  it('detects quoted error + message JSON pattern', () => {
    expect(isErrorContent('{"error": {"message": "quota"}}')).toBe(true);
  });

  it('detects Vercel AI SDK error format', () => {
    expect(isErrorContent('Error [AI_APICallError]: quota exceeded')).toBe(true);
  });

  it('detects AI_InvalidPromptError', () => {
    expect(isErrorContent('AI_InvalidPromptError: invalid prompt')).toBe(true);
  });

  it('detects TypeValidationError', () => {
    expect(isErrorContent('AI_TypeValidationError: schema mismatch')).toBe(true);
  });

  it('detects AI_RetryError (mid-stream content)', () => {
    expect(isErrorContent('Hello... Error [AI_RetryError]: Failed after 3 attempts')).toBe(true);
  });

  it('detects AI_APICallError', () => {
    expect(isErrorContent('AI_APICallError: quota exceeded')).toBe(true);
  });

  it('detects Error [AI_X] mid-stream (valid text before the error)', () => {
    expect(isErrorContent('Some valid text before the error: Error [AI_RetryError]: failed')).toBe(
      true,
    );
  });

  it('does NOT flag normal AI response', () => {
    const normalResponse =
      'Hello! I am your Remote Expert. Please describe the issue you are seeing with the HVAC system.';
    expect(isErrorContent(normalResponse)).toBe(false);
  });

  it('does NOT flag response that mentions "error" in conversation', () => {
    const errorMention = 'I checked the error code on the display panel. It showed code E-42.';
    expect(isErrorContent(errorMention)).toBe(false);
  });

  it('does NOT flag response with quoted "code" and "error" in human context', () => {
    const humanContext = 'The "code" on the panel shows "error" 42';
    expect(isErrorContent(humanContext)).toBe(false);
  });
});
