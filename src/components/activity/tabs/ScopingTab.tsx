'use client';

import { useEffect, useMemo } from 'react';
import { ChatPanel } from '@/components/activity/ChatPanel';
import { TabActionButton } from '@/components/activity/TabActionButton';
import { useAIExpertConnection } from '@/hooks/useAIExpertConnection';
import { useChatContext } from '@/components/activity/ChatContext';
import { loadState } from '@/lib/storage';

interface ScopingTabProps {
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

export default function ScopingTab({ onComplete, isSubmitting, isComplete }: ScopingTabProps) {
  const jobConfig = useMemo(() => loadState()?.jobConfig ?? null, []);

  const systemPrompt = useMemo(() => {
    const equipment = jobConfig
      ? (EQUIPMENT_LABELS[jobConfig.equipmentType] ?? jobConfig.equipmentType)
      : 'unknown equipment';
    const severity = jobConfig
      ? (SEVERITY_LABELS[jobConfig.severity] ?? jobConfig.severity)
      : 'unknown severity';

    return `You are a Remote Expert System helping a field technician with a **Scoping Assessment**.

Context:
- Equipment Type: ${equipment}
- Severity Level: ${severity}

Your role:
1. Greet the technician professionally and introduce yourself.
2. Ask them to describe the specific issue they are seeing with the ${equipment}.
3. Guide them through a structured initial assessment — ask targeted questions about symptoms, error codes, recent changes, and environmental factors.
4. When you have enough information to scope the problem, provide a concise summary of the likely issue and recommended next steps.
5. Keep responses concise (2-4 sentences). Be technical and direct — this is a professional field service context.

Do NOT ask about unrelated equipment or topics. Stay focused on the ${equipment} and the reported severity (${severity}).`;
  }, [jobConfig]);

  const {
    messages,
    isTyping,
    isComplete: chatComplete,
    sendMessage,
    simulateSpeech,
  } = useAIExpertConnection(systemPrompt, 'scoping');

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
