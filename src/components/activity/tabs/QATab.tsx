'use client';

import { useEffect } from 'react';
import { ChatPanel } from '@/components/activity/ChatPanel';
import { TabActionButton } from '@/components/activity/TabActionButton';
import { useMockExpertConnection } from '@/hooks/useMockExpertConnection';
import qaScript from '@/data/qa-script.json';
import type { ChatMessage } from '@/lib/types';
import { useChatContext } from '@/components/activity/ChatContext';

interface QATabProps {
  onComplete: () => void;
  isSubmitting: boolean;
  isComplete: boolean;
}

export default function QATab({ onComplete, isSubmitting, isComplete }: QATabProps) {
  const {
    messages,
    isTyping,
    isComplete: chatComplete,
    sendMessage,
    simulateSpeech,
  } = useMockExpertConnection(qaScript as ChatMessage[], 'qa');

  const { syncQAState } = useChatContext();

  // Sync QA chat state to the accumulated transcript
  useEffect(() => {
    syncQAState({
      messages,
      isTyping,
      isComplete: chatComplete,
    });
  }, [messages, isTyping, chatComplete, syncQAState]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatPanel
          messages={messages}
          isTyping={isTyping}
          isComplete={chatComplete}
          onSend={sendMessage}
          onSimulateSpeech={simulateSpeech}
          title="Quality Assurance"
        />
      </div>
      <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
        <p className="text-xs text-slate-600">
          Answer the Remote Expert&apos;s follow-up questions to complete the job.
        </p>
        <TabActionButton
          isLastTab={true}
          isComplete={isComplete}
          onComplete={onComplete}
          disabled={!chatComplete}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}
