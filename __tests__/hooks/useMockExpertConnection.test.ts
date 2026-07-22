import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMockExpertConnection } from '@/hooks/useMockExpertConnection';
import type { ChatMessage } from '@/lib/types';
import { MOCK_EXPERT_DELAY_MIN } from '@/lib/constants';

function createExpertMessage(
  index: number,
  text: string,
  sender: 'expert' | 'user' = 'expert',
): ChatMessage {
  return {
    id: `${index}`,
    sender,
    text,
    timestamp: 0,
  };
}

const greeting = 'Hello, I am your Remote Expert. How can I help you today?';
const scopingQ = 'What equipment are you working on?';
const userAnswer = 'I am working on an HVAC unit with a critical fault.';
const expertResponse = 'I see. Let me look into the HVAC diagnostics.';

// Simulated scoping conversation
const scopingScript: ChatMessage[] = [
  createExpertMessage(0, greeting),
  createExpertMessage(1, scopingQ),
  createExpertMessage(2, userAnswer, 'user'),
  createExpertMessage(3, expertResponse),
  createExpertMessage(4, 'Does that help with the issue?', 'user'),
  createExpertMessage(5, 'Great. Proceed with the repair documentation.', 'expert'),
];

describe('useMockExpertConnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock Math.random to return 0 so getRandomDelay() is always MOCK_EXPERT_DELAY_MIN
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should start with empty messages and not typing when script is empty', () => {
      const { result } = renderHook(() => useMockExpertConnection([]));

      expect(result.current.messages).toEqual([]);
      expect(result.current.currentMessage).toBeNull();
      expect(result.current.isTyping).toBe(false);
      expect(result.current.isComplete).toBe(true);
      expect(result.current.currentStep).toBe(0);
    });

    it('should start with expert typing when first message is expert', () => {
      const { result } = renderHook(() =>
        useMockExpertConnection([createExpertMessage(0, greeting)]),
      );

      expect(result.current.messages).toEqual([]);
      expect(result.current.isTyping).toBe(true);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.currentStep).toBe(0);
    });

    it('should start waiting for user when first message is user', () => {
      const { result } = renderHook(() =>
        useMockExpertConnection([createExpertMessage(0, 'User message', 'user')]),
      );

      expect(result.current.messages).toEqual([]);
      expect(result.current.isTyping).toBe(false);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.currentStep).toBe(0);
    });
  });

  describe('message emission', () => {
    it('should emit expert message after artificial delay', () => {
      const { result } = renderHook(() =>
        useMockExpertConnection([createExpertMessage(0, greeting)]),
      );

      expect(result.current.currentMessage).toBeNull();

      act(() => {
        vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.currentMessage?.text).toBe(greeting);
      expect(result.current.currentMessage?.sender).toBe('expert');
      expect(result.current.isTyping).toBe(false);
      expect(result.current.isComplete).toBe(true);
      expect(result.current.currentStep).toBe(1);
    });

    it('should emit multiple expert messages in sequence', () => {
      const script = [createExpertMessage(0, 'First'), createExpertMessage(1, 'Second')];

      const { result } = renderHook(() => useMockExpertConnection(script));

      // First message emits after delay
      act(() => {
        vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.currentMessage?.text).toBe('First');
      // When next message is also expert, the useEffect immediately starts typing
      expect(result.current.isTyping).toBe(true);
      expect(result.current.currentStep).toBe(1);

      // Second message emits after delay
      act(() => {
        vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.currentMessage?.text).toBe('Second');
      expect(result.current.isComplete).toBe(true);
    });
  });

  describe('user input', () => {
    it('should accept user message and advance to next step', () => {
      const script = [
        createExpertMessage(0, greeting),
        createExpertMessage(1, 'How are you?'),
        createExpertMessage(2, 'Good thanks', 'user'),
      ];

      const { result } = renderHook(() => useMockExpertConnection(script));

      // Emit the first expert message
      act(() => {
        vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100);
      });

      expect(result.current.messages).toHaveLength(1);

      // Next message is expert, auto-starts typing
      act(() => {
        vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.currentMessage?.text).toBe('How are you?');

      // Now step is at index 2 (user message) — user responds
      act(() => {
        result.current.sendMessage('Good thanks');
      });

      expect(result.current.messages).toHaveLength(3);
      expect(result.current.currentMessage?.text).toBe('Good thanks');
      expect(result.current.currentMessage?.sender).toBe('user');
      expect(result.current.isComplete).toBe(true);
    });

    it('should not accept empty messages', () => {
      const script = [createExpertMessage(0, 'Say hi', 'user')];

      const { result } = renderHook(() => useMockExpertConnection(script));

      act(() => {
        result.current.sendMessage('');
      });

      expect(result.current.messages).toHaveLength(0);

      act(() => {
        result.current.sendMessage('   ');
      });

      expect(result.current.messages).toHaveLength(0);
    });

    it('should not send message when conversation is complete', () => {
      const { result } = renderHook(() =>
        useMockExpertConnection([createExpertMessage(0, 'Done')]),
      );

      act(() => {
        vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100);
      });

      expect(result.current.isComplete).toBe(true);

      act(() => {
        result.current.sendMessage('extra');
      });

      // No additional message
      expect(result.current.messages).toHaveLength(1);
    });
  });

  describe('simulateSpeech', () => {
    it('should auto-send the next user message from the script', () => {
      const script = [
        createExpertMessage(0, greeting),
        createExpertMessage(1, userAnswer, 'user'),
        createExpertMessage(2, expertResponse),
      ];

      const { result } = renderHook(() => useMockExpertConnection(script));

      // Emit greeting
      act(() => {
        vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100);
      });

      expect(result.current.currentStep).toBe(1);
      // Next is user message — waiting for input
      expect(result.current.isTyping).toBe(false);

      // Simulate speech
      act(() => {
        result.current.simulateSpeech();
      });

      const userMsg = result.current.messages.find((m) => m.sender === 'user');
      expect(userMsg?.text).toBe(userAnswer);
      expect(result.current.currentStep).toBe(2);

      // Next is expert — auto-starts typing
      expect(result.current.isTyping).toBe(true);
    });

    it('should do nothing when current message is not user', () => {
      const script = [createExpertMessage(0, greeting)];

      const { result } = renderHook(() => useMockExpertConnection(script));

      // Expert is typing — simulateSpeech should do nothing
      act(() => {
        result.current.simulateSpeech();
      });

      expect(result.current.messages).toHaveLength(0);
    });

    it('should do nothing when conversation is complete', () => {
      const { result } = renderHook(() =>
        useMockExpertConnection([createExpertMessage(0, 'Done')]),
      );

      act(() => {
        vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100);
      });

      act(() => {
        result.current.simulateSpeech();
      });

      expect(result.current.messages).toHaveLength(1);
    });

    it('should simulate the correct user message from the script', () => {
      const script = [
        createExpertMessage(0, 'Q1'),
        createExpertMessage(1, 'A1', 'user'),
        createExpertMessage(2, 'Q2'),
        createExpertMessage(3, 'A2', 'user'),
      ];

      const { result } = renderHook(() => useMockExpertConnection(script));

      // Q1
      act(() => vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100));
      // A1
      act(() => result.current.simulateSpeech());
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].text).toBe('A1');

      // Q2
      act(() => vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100));
      expect(result.current.messages).toHaveLength(3);

      // A2
      act(() => result.current.simulateSpeech());
      expect(result.current.messages).toHaveLength(4);
      expect(result.current.messages[3].text).toBe('A2');
      expect(result.current.isComplete).toBe(true);
    });
  });

  describe('resume from step', () => {
    it('should emit past messages instantly when resuming from a step', () => {
      const { result } = renderHook(() => useMockExpertConnection(scopingScript, undefined, 2));

      // Past messages should be emitted instantly
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].text).toBe(greeting);
      expect(result.current.messages[1].text).toBe(scopingQ);
      expect(result.current.currentStep).toBe(2);

      // Current step is user message — waiting for input, not typing
      expect(result.current.isTyping).toBe(false);
    });

    it('should start typing when resuming at an expert message', () => {
      const { result } = renderHook(() => useMockExpertConnection(scopingScript, undefined, 5));

      // Past messages (0-4) should be emitted instantly
      expect(result.current.messages).toHaveLength(5);
      expect(result.current.currentStep).toBe(5);

      // Current message is expert — auto-starts typing
      expect(result.current.isTyping).toBe(true);
    });

    it('should complete normally after resuming', () => {
      const { result } = renderHook(() => useMockExpertConnection(scopingScript, undefined, 5));

      // Past messages emitted, current is expert
      act(() => {
        vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100);
      });

      expect(result.current.messages).toHaveLength(6);
      expect(result.current.currentMessage?.text).toBe(
        'Great. Proceed with the repair documentation.',
      );
      expect(result.current.isComplete).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset the conversation to the beginning', () => {
      const { result } = renderHook(() =>
        useMockExpertConnection([createExpertMessage(0, greeting)]),
      );

      act(() => {
        vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100);
      });

      expect(result.current.isComplete).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.currentMessage).toBeNull();
      expect(result.current.currentStep).toBe(0);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.isTyping).toBe(true); // Should start typing again
    });
  });

  describe('cleanup', () => {
    it('should clear timers on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useMockExpertConnection([createExpertMessage(0, greeting)]),
      );

      unmount();

      // Should not throw after unmount
      act(() => {
        vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100);
      });

      expect(result.current.messages).toEqual([]);
    });
  });

  describe('full conversation flow', () => {
    it('should complete the full scoping conversation', () => {
      const { result } = renderHook(() => useMockExpertConnection(scopingScript));

      // Expert: Greeting
      act(() => vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100));
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.currentMessage?.text).toBe(greeting);

      // Next: expert scoping question (auto)
      act(() => vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100));
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.currentMessage?.text).toBe(scopingQ);

      // Next: user message - user types
      act(() => result.current.sendMessage(userAnswer));
      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[2].text).toBe(userAnswer);
      expect(result.current.messages[2].sender).toBe('user');

      // Next: expert response
      act(() => vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100));
      expect(result.current.messages).toHaveLength(4);
      expect(result.current.currentMessage?.text).toBe(expertResponse);

      // Next: user message - simulate speech
      act(() => result.current.simulateSpeech());
      expect(result.current.messages).toHaveLength(5);
      expect(result.current.messages[4].text).toBe('Does that help with the issue?');
      expect(result.current.messages[4].sender).toBe('user');

      // Next: expert final message
      act(() => vi.advanceTimersByTime(MOCK_EXPERT_DELAY_MIN + 100));
      expect(result.current.messages).toHaveLength(6);
      expect(result.current.currentMessage?.text).toBe(
        'Great. Proceed with the repair documentation.',
      );

      expect(result.current.isComplete).toBe(true);
    });
  });
});
