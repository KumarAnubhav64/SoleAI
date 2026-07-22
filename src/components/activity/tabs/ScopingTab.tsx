'use client';

import { useEffect } from 'react';
import { ChatPanel } from '@/components/activity/ChatPanel';
import { TabActionButton } from '@/components/activity/TabActionButton';
import { useMockExpertConnection } from '@/hooks/useMockExpertConnection';
import scopingScript from '@/data/scoping-script.json';
import type { ChatMessage } from '@/lib/types';
import { useChatContext } from '@/components/activity/ChatContext';

interface ScopingTabProps {
  onComplete: () => void;
  isSubmitting: boolean;
  isComplete: boolean;
}

export default function ScopingTab({ onComplete, isSubmitting, isComplete }: ScopingTabProps) {
  const {
    messages,
    isTyping,
    isComplete: chatComplete,
    sendMessage,
    simulateSpeech,
  } = useMockExpertConnection(scopingScript as ChatMessage[], 'scoping');

  const { syncScopingState } = useChatContext();

  // Sync scoping chat state to the accumulated transcript
  useEffect(() => {
    syncScopingState({
      messages,
      isTyping,
      isComplete: chatComplete,
    });
  }, [messages, isTyping, chatComplete, syncScopingState]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatPanel
          messages={messages}
          isTyping={isTyping}
          isComplete={chatComplete}
          onSend={sendMessage}
          onSimulateSpeech={simulateSpeech}
          title="Scoping Assessment"
        />
      </div>
      <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
        <p className="text-xs text-slate-600">
          Discuss the issue with the Remote Expert to scope the problem.
        </p>
        <TabActionButton
          isLastTab={false}
          isComplete={isComplete}
          onComplete={onComplete}
          disabled={!chatComplete}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}
