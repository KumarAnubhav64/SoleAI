'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { DotsThree, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import type { ChatMessage } from '@/lib/types';

interface ChatPanelProps {
  messages: ChatMessage[];
  isTyping: boolean;
  isComplete: boolean;
  onSend: (text: string) => void;
  onSimulateSpeech: () => void;
  disabled?: boolean;
  title?: string;
}

export function ChatPanel({
  messages,
  isTyping,
  isComplete,
  onSend,
  onSimulateSpeech,
  disabled = false,
  title = 'Remote Expert',
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string | null>(null);
  const {
    speak,
    isSpeaking,
    isSupported: ttsSupported,
    isMuted,
    toggleMute,
  } = useTextToSpeech({ rate: 0.9, pitch: 1.0 });

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Auto-speak new expert messages via TTS
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.sender !== 'expert') return;
    if (lastMessage.id === lastSpokenRef.current) return;

    lastSpokenRef.current = lastMessage.id;
    speak(lastMessage.text);
  }, [messages, speak]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header with TTS toggle */}
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <p className="text-xs font-medium text-slate-400">{title}</p>
        {ttsSupported && (
          <button
            onClick={toggleMute}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
              isMuted
                ? 'text-slate-600 hover:text-slate-400'
                : isSpeaking
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-slate-500 hover:text-slate-300'
            }`}
            title={isMuted ? 'Unmute voice' : 'Mute voice'}
            aria-label={isMuted ? 'Enable text-to-speech' : 'Disable text-to-speech'}
          >
            {isMuted ? (
              <SpeakerSlash size={14} />
            ) : (
              <SpeakerHigh size={14} weight={isSpeaking ? 'fill' : 'regular'} />
            )}
            <span className="hidden sm:inline">
              {isMuted ? 'Muted' : isSpeaking ? 'Speaking...' : 'Voice'}
            </span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700"
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full items-center justify-center"
            >
              <p className="text-xs text-slate-600">
                Waiting for the Remote Expert to connect...
              </p>
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <ChatBubble key={msg.id} message={msg} index={i} />
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700">
                <DotsThree size={16} className="text-slate-400" weight="bold" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-slate-800 px-3.5 py-2">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
              </div>
            </motion.div>
          )}

          {/* Complete message */}
          {isComplete && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5">
                <p className="text-xs text-emerald-400">
                  Chat session complete
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-3">
        <ChatInput
          onSend={onSend}
          onSimulateSpeech={onSimulateSpeech}
          disabled={disabled || isComplete}
          isTyping={isTyping}
        />
      </div>
    </div>
  );
}
