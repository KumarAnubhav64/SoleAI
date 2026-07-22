'use client';

import { motion } from 'motion/react';
import { User, Robot } from '@phosphor-icons/react';
import type { ChatMessage } from '@/lib/types';

interface ChatBubbleProps {
  message: ChatMessage;
  index: number;
}

export function ChatBubble({ message, index }: ChatBubbleProps) {
  const isUser = message.sender === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-slate-700 text-slate-400'
        }`}
      >
        {isUser ? <User size={14} weight="fill" /> : <Robot size={14} weight="fill" />}
      </div>

      {/* Message */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-md'
              : 'bg-slate-800 text-slate-200 rounded-tl-md'
          }`}
        >
          {message.text}
        </div>
        <span className="mt-0.5 px-1 text-[10px] text-slate-600">
          {time}
        </span>
      </div>
    </motion.div>
  );
}
