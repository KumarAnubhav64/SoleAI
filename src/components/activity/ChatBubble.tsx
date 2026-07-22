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
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: index * 0.04,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
          isUser
            ? 'border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400'
            : 'border-slate-600/30 bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300'
        }`}
      >
        {isUser ? <User size={15} weight="fill" /> : <Robot size={15} weight="fill" />}
      </div>

      {/* Message */}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-[4px]'
              : 'border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-800/80 text-slate-200 rounded-tl-[4px]'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
        <div className={`mt-1 flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] font-medium tracking-wide text-slate-600">
            {time}
          </span>
          <span
            className={`h-1 w-1 rounded-full ${
              isUser ? 'bg-blue-500/30' : 'bg-slate-600/30'
            }`}
          />
          <span className="text-[10px] text-slate-700">
            {isUser ? 'Technician' : 'Remote Expert'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
