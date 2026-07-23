'use client';

import { useEffect, useMemo } from 'react';
import { ChatPanel } from '@/components/activity/ChatPanel';
import { TabActionButton } from '@/components/activity/TabActionButton';
import { useAIExpertConnection } from '@/hooks/useAIExpertConnection';
import { useChatContext } from '@/components/activity/ChatContext';
import qaScript from '@/data/qa-script.json';
import type { ChatMessage } from '@/lib/types';
import { loadState } from '@/lib/storage';

interface QATabProps {
  onComplete: () => void;
  isSubmitting: boolean;
  isComplete: boolean;
}

const EQUIPMENT_LABELS: Record<string, string> = {
  hvac: 'HVAC System',
  'industrial-printer': 'Industrial Printer',
  'server-rack': 'Server Rack',
};

const SEVERITY_LABELS: Record<string, string> = {
  'routine-maintenance': 'Routine Maintenance',
  'critical-fault': 'Critical Fault',
};

export default function QATab({ onComplete, isSubmitting, isComplete }: QATabProps) {
  const jobConfig = useMemo(() => loadState()?.jobConfig ?? null, []);

  const systemPrompt = useMemo(() => {
    const equipment = jobConfig
      ? (EQUIPMENT_LABELS[jobConfig.equipmentType] ?? jobConfig.equipmentType)
      : 'unknown equipment';
    const severity = jobConfig
      ? (SEVERITY_LABELS[jobConfig.severity] ?? jobConfig.severity)
      : 'unknown severity';

    return `You are a Remote Expert System conducting a **Quality Assurance** follow-up with a field technician.

Context:
- Equipment Type: ${equipment}
- Severity Level: ${severity}
- The technician has completed the repair/scoping phase for this ${severity} issue on the ${equipment}.

Your role:
1. Greet the technician and explain that this is the QA follow-up.
2. Ask 1-2 targeted follow-up questions about the repair they performed.
3. Confirm whether the issue has been resolved and if the equipment is functioning normally.
4. When satisfied, thank the technician and provide a completion confirmation.
5. Keep responses concise (2-3 sentences). Be professional and precise.

Do NOT re-scope the problem. This is a confirmation and sign-off step.`;
  }, [jobConfig]);

  const {
    messages,
    isTyping,
    isComplete: chatComplete,
    sendMessage,
    simulateSpeech,
    isFallback,
  } = useAIExpertConnection(systemPrompt, 'qa', qaScript as ChatMessage[]);

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
          onSend={sendMessage}
          onSimulateSpeech={simulateSpeech}
          title="Quality Assurance"
        />
      </div>
      <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          {isFallback && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-amber-400">
              Fallback Mode
            </span>
          )}
          <p className="text-xs text-slate-600">
            Answer the Remote Expert&apos;s follow-up questions to complete the job.
          </p>
        </div>
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
