'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { DotsThree, Robot } from '@phosphor-icons/react';
import { TabContainer } from '@/components/activity/TabContainer';
import { ChatBubble } from '@/components/activity/ChatBubble';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { ChatProvider, useChatContext } from '@/components/activity/ChatContext';

export default function ActivityPage() {
  return (
    <ChatProvider>
      <ActivityPageInner />
    </ChatProvider>
  );
}

function ActivityPageInner() {
  const router = useRouter();
  const { stream, requestPermission } = useCameraPermission();
  const { accumulatedMessages: messages, isTyping, title } = useChatContext();
  const rightPanelScrollRef = useRef<HTMLDivElement>(null);

  // Request camera on mount
  useEffect(() => {
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll the right panel when new messages arrive
  useEffect(() => {
    if (rightPanelScrollRef.current) {
      rightPanelScrollRef.current.scrollTop = rightPanelScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleAllComplete = useCallback(() => {
    router.push('/performance');
  }, [router]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Split-screen workspace */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left Panel — Tab Content */}
        <div className="flex w-full flex-1 flex-col border-b border-slate-800 lg:border-b-0">
          <TabContainer stream={stream} onAllComplete={handleAllComplete} />
        </div>

        {/* Divider line between panels */}
        <div className="hidden w-px shrink-0 bg-gradient-to-b from-slate-700 via-slate-600 to-slate-700 lg:block" />

        {/* Right Panel — Persistent Remote Expert Chat Transcript */}
        <div className="flex w-full flex-1 flex-col border-t border-slate-800 bg-slate-950/50 lg:border-t-0">
          {/* Header */}
          <div className="border-b border-slate-800 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
              </span>
              <p className="text-xs font-medium text-slate-300">Remote Expert — {title}</p>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={rightPanelScrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700"
          >
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full flex-col items-center justify-center gap-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/50">
                    <Robot size={20} className="text-slate-500" weight="bold" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-400">Remote Expert</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Chat transcript appears here as you work through each tab.
                    </p>
                  </div>
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
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
