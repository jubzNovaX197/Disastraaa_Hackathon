'use client';

/**
 * AI Disaster Intelligence Assistant — Main Dashboard
 *
 * Professional conversational intelligence interface:
 * Desktop: Split 60/40 (Conversation / Operational Context)
 * Mobile: Responsive tabbed layout
 */

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Activity,
  Layers,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import { AssistantHeader } from './AssistantHeader';
import { AssistantMessageItem } from './AssistantMessageItem';
import { AssistantOperationalPanel } from './AssistantOperationalPanel';
import type { AssistantMessage, AssistantResponsePayload } from '@/lib/ai/types';
import { cn } from '@/lib/utils';

const INITIAL_WELCOME_MESSAGE: AssistantMessage = {
  id: 'msg-welcome',
  role: 'assistant',
  content: `### Situation\nIntelligence Assistant is active and synchronized with live disaster telemetry across coastal operational zones. Ask questions regarding hazard risks, active alerts, road transit impairments, shelter pressure, or logistics gaps.\n\n### Key Factors\n* Multi-hazard baseline synchronized with Riverine Flood and Severe Cyclone squalls\n* Live telemetry feed updating operational metrics continuously\n* Strictly constrained to verified application data without speculative claims\n\n### Operational Context\nSelect a specific district focus or inquiry from suggested prompts to begin analysis.\n\n### Data Freshness\nSynchronized Just now (Simulated Live Feed)`,
  timestamp: 'Just now',
  intent: 'SITUATION_SUMMARY',
  sources: ['Risk Intelligence', 'Active Alerts', 'Operational Command Center', 'Live Intelligence'],
  dataQuality: ['VERIFIED', 'PREDICTED', 'SIMULATED'],
  structuredSections: {
    situation:
      'Intelligence Assistant is active and synchronized with live disaster telemetry across coastal operational zones. Ask questions regarding hazard risks, active alerts, road transit impairments, shelter pressure, or logistics gaps.',
    keyFactors: [
      'Multi-hazard baseline synchronized with Riverine Flood and Severe Cyclone squalls',
      'Live telemetry feed updating operational metrics continuously',
      'Strictly constrained to verified application data without speculative claims',
    ],
    currentData: {
      'System State': 'Synchronized',
      'Telemetry Feed': 'Simulated Live Stream',
      'Active Hazard Models': 'Cyclone & Flood',
    },
    operationalContext:
      'Select a specific district focus or inquiry from suggested prompts to begin analysis.',
    dataFreshness: 'Synchronized Just now (Simulated Live Feed)',
  },
  providerUsed: 'Structured Intelligence Engine (Offline / Local)',
};

const SUGGESTED_CHIPS = [
  'Summarize the current situation.',
  'Which areas currently have the highest flood risk?',
  'What active alerts affect this region?',
  'Which roads are currently blocked?',
  'What shelters are under pressure?',
  'Where are the largest resource gaps?',
  'What changed recently?',
];

import type { AppEnvironment } from '@/lib/env';

function getInitialWelcomeMessage(env: AppEnvironment): AssistantMessage {
  if (env === 'REAL') {
    return {
      id: 'msg-welcome',
      role: 'assistant',
      content: `### Operational Standby\nIntelligence Assistant is active in **Live Operational Mode**. Disaster monitoring feeds, radar telemetry, and official early warning systems are standing by. You can query operational protocols, sector statuses, or field observations.\n\n### Operational Status\n* All operational sectors currently reporting normal conditions\n* Zero declared hazard emergencies in active queue\n* Verified authority and citizen telemetry feeds standing by`,
      timestamp: 'Just now',
      intent: 'SITUATION_SUMMARY',
      sources: ['Operational Command Core', 'National Early Warning (Standby)'],
      dataQuality: ['VERIFIED'],
      structuredSections: {
        situation: 'All operational sectors reporting normal conditions. Live radar and early warning feeds standing by.',
        keyFactors: ['Operational standby mode', 'Zero active disaster declarations'],
        currentData: {
          'System State': 'Operational Standby',
          'Environment': 'REAL',
          'Active Hazard Models': 'Awaiting Live Trigger',
        },
        operationalContext: 'Real operational environment active.',
        dataFreshness: 'Live Operational Feed',
      },
      providerUsed: 'Structured Intelligence Engine (Operational)',
    };
  }
  return INITIAL_WELCOME_MESSAGE;
}

export function IntelligenceAssistantDashboard() {
  const { overrides, secondsSinceSync, environment } = useLiveIntelligence();

  const [messages, setMessages] = useState<AssistantMessage[]>(() => [getInitialWelcomeMessage(environment)]);
  const [inputText, setInputText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Operational Sectors');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'context'>('chat');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom of message list on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    setError(null);
    setInputText('');

    const userMessage: AssistantMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      locationFocus: selectedLocation !== 'All Operational Sectors' ? selectedLocation : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          locationFocus:
            selectedLocation !== 'All Operational Sectors' ? selectedLocation : undefined,
          liveOverrides: overrides,
          secondsSinceSync,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Intelligence service returned status ${res.status}`);
      }

      const data: AssistantResponsePayload = await res.json();

      const assistantMessage: AssistantMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: data.intent,
        sources: data.sources,
        dataQuality: data.dataQuality,
        structuredSections: data.structuredSections,
        providerUsed: data.providerUsed,
        locationFocus: data.locationFocus,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Failed to query assistant:', err);
      setError(
        err.message ||
          'Operational intelligence service temporarily unable to analyze query. Please try again.',
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearMessages = () => {
    setMessages([getInitialWelcomeMessage(environment)]);
    setError(null);
  };

  useEffect(() => {
    setMessages([getInitialWelcomeMessage(environment)]);
  }, [environment]);

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col gap-2.5 p-3 sm:px-4 sm:pt-2 sm:pb-3 max-w-[1600px] w-full mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0">
        <AssistantHeader
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          onClearMessages={handleClearMessages}
          messageCount={messages.length}
        />
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex-shrink-0 flex lg:hidden rounded-xl bg-slate-100 dark:bg-surface-card p-1 border border-slate-200 dark:border-white/[0.08] text-xs">
        <button
          type="button"
          onClick={() => setActiveMobileTab('chat')}
          className={cn(
            'flex-1 py-1.5 font-bold rounded-lg transition-all',
            activeMobileTab === 'chat'
              ? 'bg-white dark:bg-surface-elevated text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
          )}
        >
          Conversation Stream
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('context')}
          className={cn(
            'flex-1 py-1.5 font-bold rounded-lg transition-all',
            activeMobileTab === 'context'
              ? 'bg-white dark:bg-surface-elevated text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
          )}
        >
          Operational Context &amp; Telemetry
        </button>
      </div>

      {/* Main Grid: 60/40 Split on Desktop */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch overflow-hidden">
        {/* Left Column: Conversation Area (Cols 1-8) - Pinned Input at Bottom */}
        <div
          className={cn(
            'lg:col-span-8 flex flex-col h-full min-h-0 bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-sm overflow-hidden',
            activeMobileTab === 'chat' ? 'flex' : 'hidden lg:flex',
          )}
        >
          {/* Scrollable Conversation Stream */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4.5 space-y-3.5">
            {messages.map((msg) => (
              <AssistantMessageItem key={msg.id} message={msg} />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-3 max-w-lg p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-elevated border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-600 dark:text-slate-300 animate-pulse">
                <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">
                    Synthesizing Operational Intelligence...
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Evaluating multi-hazard risk models, active alerts and telemetry feeds
                  </span>
                </div>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendMessage(messages[messages.length - 1]?.content)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-semibold text-[11px] hover:bg-rose-600 transition-colors flex-shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggested Chips (Fixed above Input) */}
          <div className="flex-shrink-0 px-3.5 py-1.5 border-t border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex-shrink-0 mr-1">
              Suggestions:
            </span>
            {SUGGESTED_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08] text-[11px] whitespace-nowrap transition-colors disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Message Input Bar - Pinned at Bottom */}
          <div className="flex-shrink-0 p-2.5 sm:p-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-white dark:bg-surface-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  selectedLocation !== 'All Operational Sectors'
                    ? `Ask about hazards, roads or shelters in ${selectedLocation}...`
                    : 'Ask about current flood risks, blocked roads, alerts or shelter pressure...'
                }
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-surface-elevated border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="px-3.5 py-2 sm:py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-xs flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 text-center">
              Intelligence Assistant synthesizes verified state emergency models. Read-only decision support only.
            </p>
          </div>
        </div>

        {/* Right Column: Operational Panel (Cols 8-12) - Independent Scroll */}
        <div
          className={cn(
            'lg:col-span-4 flex flex-col h-full min-h-0 overflow-hidden',
            activeMobileTab === 'context' ? 'flex' : 'hidden lg:flex',
          )}
        >
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <AssistantOperationalPanel
              onTriggerPrompt={handleSendMessage}
              selectedLocation={selectedLocation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
