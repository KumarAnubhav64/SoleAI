'use client';

import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { Skeleton } from '@/components/ui/skeleton';
import { DotsThree, SpeakerHigh, SpeakerSlash, CheckCircle } from '@phosphor-icons/react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useHydratedValue } from '@/hooks/useHydratedValue';
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
  const userInteractedRef = useRef(false);
  const pendingSpeechRef = useRef<string | null>(null);
  const {
    speak,
    isSpeaking,
    isSupported: ttsSupported,
    isMuted,
    toggleMute,
  } = useTextToSpeech({ rate: 0.9, pitch: 1.0 });

  // Hydration-safe TTS support: render as 'available' on server & first client paint,
  // then correct to the real browser capability after hydration.
  const ttsAvailable = useHydratedValue(ttsSupported, true);

  // Flush pending speech when user interacts
  const handleUserInteraction = useCallback(() => {
    if (!userInteractedRef.current) {
      userInteractedRef.current = true;
      if (pendingSpeechRef.current) {
        speak(pendingSpeechRef.current);
        pendingSpeechRef.current = null;
      }
    }
  }, [speak]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Auto-speak new expert messages via TTS
  // Chrome blocks speechSynthesis without a prior user gesture.
  // If the user hasn't clicked yet, queue the text and speak it
  // on the first interaction.
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.sender !== 'expert') return;
    if (lastMessage.id === lastSpokenRef.current) return;

    lastSpokenRef.current = lastMessage.id;

    if (userInteractedRef.current) {
      speak(lastMessage.text);
    } else {
      // Queue for when user first interacts
      pendingSpeechRef.current = lastMessage.text;
    }
  }, [messages, speak]);

  return (
    <div className="flex min-h-0 flex-1 flex-col" onClick={handleUserInteraction}>
      {/* Header with TTS toggle */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
          </span>
          <p className="text-xs font-semibold tracking-wide text-slate-300">{title}</p>
        </div>
        {/* TTS toggle button */}
        <button
          onClick={() => {
            handleUserInteraction();
            toggleMute();
          }}
          disabled={!ttsAvailable}
          title={
            ttsAvailable
              ? isMuted
                ? 'Unmute voice'
                : 'Mute voice'
              : 'Text-to-speech not supported on this browser'
          }
          aria-label={
            ttsAvailable
              ? isMuted
                ? 'Enable text-to-speech'
                : 'Disable text-to-speech'
              : 'Text-to-speech unavailable'
          }
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
            !ttsAvailable
              ? 'border-slate-800 text-slate-700 cursor-not-allowed'
              : isMuted
                ? 'border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                : isSpeaking
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  : 'border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
          }`}
        >
          {isMuted || !ttsAvailable ? (
            <SpeakerSlash size={13} />
          ) : (
            <SpeakerHigh size={13} weight={isSpeaking ? 'fill' : 'regular'} />
          )}
          <span className="hidden sm:inline">
            {!ttsAvailable ? 'N/A' : isMuted ? 'Muted' : isSpeaking ? 'Speaking...' : 'Speak'}
          </span>
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700"
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full flex-col items-center justify-center gap-3"
            >
              {isTyping ? (
                <div className="flex w-full max-w-md flex-col gap-4 px-2">
                  {/* Expert skeleton bubble (left-aligned) */}
                  <div className="flex animate-[fadeIn_0.3s_ease-out] items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-xl bg-slate-800" />
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-24 rounded-full bg-slate-800" />
                      <Skeleton className="h-14 w-72 rounded-2xl rounded-tl-[4px] bg-slate-800" />
                    </div>
                  </div>
                  {/* User skeleton bubble (right-aligned) */}
                  <div className="flex animate-[fadeIn_0.3s_ease-out_0.5s_both] flex-row-reverse items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-xl bg-slate-800" />
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-20 rounded-full bg-slate-800" />
                      <Skeleton className="h-10 w-48 rounded-2xl rounded-tr-[4px] bg-slate-800" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/50">
                    <DotsThree size={20} className="text-slate-500" weight="bold" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-400">
                      Connecting to Remote Expert
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Establishing secure connection...</p>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <ChatBubble key={msg.id} message={msg} index={i} />
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex items-center gap-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-600/30 bg-gradient-to-br from-slate-700 to-slate-800">
                <DotsThree size={16} className="text-slate-400" weight="bold" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-slate-700/50 bg-slate-800/80 px-4 py-2.5 shadow-sm">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
              </div>
            </motion.div>
          )}

          {/* Complete message */}
          {isComplete && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex justify-center pt-2"
            >
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 px-5 py-2 shadow-sm">
                <CheckCircle size={14} weight="fill" />
                <p className="text-xs font-medium text-emerald-400">Chat session complete</p>
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
