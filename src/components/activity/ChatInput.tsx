'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { PaperPlaneRight, Microphone } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useSpeechToText } from '@/hooks/useSpeechToText';

interface ChatInputProps {
  onSend: (text: string) => void;
  onSimulateSpeech: () => void;
  disabled?: boolean;
  isTyping?: boolean;
}

export function ChatInput({
  onSend,
  onSimulateSpeech,
  disabled = false,
  isTyping = false,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    status: sttStatus,
    isListening,
    transcript,
    startListening,
    stopListening,
    reset: resetStt,
  } = useSpeechToText();

  const sttHandledRef = useRef(false);

  // Focus input when not disabled/typing
  useEffect(() => {
    if (!disabled && !isTyping) {
      inputRef.current?.focus();
    }
  }, [disabled, isTyping]);

  // When a final transcript arrives from STT, send it as a message
  useEffect(() => {
    if (transcript && !sttHandledRef.current && !isListening) {
      sttHandledRef.current = true;
      const trimmed = transcript.trim();
      if (trimmed) {
        onSend(trimmed);
      }
      resetStt();
    }
  }, [transcript, isListening, onSend, resetStt]);

  // Reset the handled flag when listening starts again
  useEffect(() => {
    if (isListening) {
      sttHandledRef.current = false;
    }
  }, [isListening]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    if (isListening) stopListening();
    onSend(text.trim());
    setText('');
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      sttHandledRef.current = false;
      startListening();
    }
  };

  // STT status from silent on-mount probe
  const sttProbing = sttStatus === 'probing';
  const sttUnavailable = sttStatus === 'unavailable';
  const sttReady = sttStatus === 'ready';

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
      <div className="relative flex flex-1 items-center">
        <input
          ref={inputRef}
          id="chat-input"
          name="chat-input"
          type="text"
          value={isListening ? transcript || 'Listening...' : text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            isListening
              ? 'Speak now...'
              : isTyping
                ? 'Expert is typing...'
                : 'Type your response...'
          }
          disabled={disabled || isTyping || isListening}
          className="w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2.5 pl-4 text-sm text-slate-100 placeholder-slate-600 shadow-inner transition-all duration-200 focus:border-blue-500/50 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:shadow-blue-500/5 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Speech-to-Text button */}
      <motion.div layout transition={{ duration: 0.15 }}>
        <Button
          type="button"
          onClick={sttReady ? handleMicClick : onSimulateSpeech}
          disabled={sttProbing || disabled || isTyping}
          variant={isListening ? 'default' : 'secondary'}
          size="sm"
          title={
            sttProbing
              ? 'Checking voice support...'
              : sttUnavailable
                ? 'Voice input not supported on this browser'
                : isListening
                  ? 'Stop listening'
                  : 'Start voice input'
          }
          className={`gap-1.5 rounded-xl px-3 text-xs font-medium shadow-sm backdrop-blur-sm transition-all duration-200 ${
            isListening
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
              : sttUnavailable
                ? 'border border-slate-700/50 bg-slate-800/50 text-slate-500 cursor-help'
                : 'border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          {isListening ? (
            <>
              <span className="flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="hidden sm:inline">Stop</span>
            </>
          ) : (
            <>
              <Microphone size={14} />
              <span className="hidden sm:inline">
                {sttProbing ? '...' : sttUnavailable ? 'Unavailable' : 'Voice'}
              </span>
            </>
          )}
        </Button>
      </motion.div>

      {/* Send button */}
      <Button
        type="submit"
        disabled={!text.trim() || disabled || isTyping || isListening}
        size="sm"
        className="gap-1.5 rounded-xl px-3 shadow-sm transition-all duration-200"
      >
        <PaperPlaneRight size={15} weight="bold" />
      </Button>
    </form>
  );
}
