'use client';

import { useState, useRef, useEffect } from 'react';
import { PaperPlaneRight, Microphone } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

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

  useEffect(() => {
    if (!disabled && !isTyping) {
      inputRef.current?.focus();
    }
  }, [disabled, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative flex flex-1 items-center">
        <input
          ref={inputRef}
          id="chat-input"
          name="chat-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isTyping ? 'Expert is typing...' : 'Type your response...'}
          disabled={disabled || isTyping}
          className="w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2.5 pl-4 text-sm text-slate-100 placeholder-slate-600 shadow-inner transition-all duration-200 focus:border-blue-500/50 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:shadow-blue-500/5 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <Button
        type="button"
        onClick={onSimulateSpeech}
        disabled={disabled || isTyping}
        variant="secondary"
        size="sm"
        className="gap-1.5 rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 text-xs font-medium text-slate-400 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200"
        title="Simulate speech-to-text"
      >
        <Microphone size={14} />
        <span className="hidden sm:inline">Simulate</span>
      </Button>
      <Button
        type="submit"
        disabled={!text.trim() || disabled || isTyping}
        size="sm"
        className="gap-1.5 rounded-xl px-3 shadow-sm transition-all duration-200"
      >
        <PaperPlaneRight size={15} weight="bold" />
      </Button>
    </form>
  );
}
