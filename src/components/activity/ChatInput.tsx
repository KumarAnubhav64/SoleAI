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
      <input
        ref={inputRef}
        id="chat-input"
        name="chat-input"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={isTyping ? 'Expert is typing...' : 'Type your response...'}
        disabled={disabled || isTyping}
        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 transition-colors focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button
        type="button"
        onClick={onSimulateSpeech}
        disabled={disabled || isTyping}
        variant="secondary"
        size="sm"
        className="gap-1.5 text-xs"
        title="Simulate speech-to-text"
      >
        <Microphone size={14} />
        <span className="hidden sm:inline">Simulate</span>
      </Button>
      <Button
        type="submit"
        disabled={!text.trim() || disabled || isTyping}
        size="sm"
        className="gap-1.5"
      >
        <PaperPlaneRight size={14} weight="bold" />
      </Button>
    </form>
  );
}
