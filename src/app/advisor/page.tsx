'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Plus, Trash2, AlertCircle, Bot, User, ToggleLeft, ToggleRight } from 'lucide-react';
import type { ChatMessage, InvestmentRule } from '@/types';

const RULE_PLACEHOLDERS = [
  "Don't invest in crypto more than 5% of portfolio",
  'Add to FD when interest rates are above 7%',
  'Rebalance portfolio every quarter',
  'Never invest emergency fund money',
  'Invest 30% of monthly savings in index funds',
];

function RulesPanel({
  rules,
  onAdd,
  onDelete,
  onToggle,
}: {
  rules: InvestmentRule[];
  onAdd: (text: string) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, active: boolean) => void;
}) {
  const [newRule, setNewRule] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % RULE_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  function handleAdd() {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewRule('');
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">Investment Rules</h2>
        <p className="text-xs text-slate-500 mt-0.5">These rules are shared with the AI advisor</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {rules.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">
            No rules yet. Add rules to guide the AI advisor.
          </p>
        )}
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`flex items-start gap-2 p-3 rounded-lg border text-sm transition-colors ${
              rule.is_active ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-slate-50 opacity-50'
            }`}
          >
            <button
              onClick={() => onToggle(rule.id, !rule.is_active)}
              className={`mt-0.5 flex-shrink-0 ${rule.is_active ? 'text-brand-500' : 'text-slate-300'}`}
              title={rule.is_active ? 'Disable rule' : 'Enable rule'}
            >
              {rule.is_active
                ? <ToggleRight className="w-4 h-4" />
                : <ToggleLeft className="w-4 h-4" />
              }
            </button>
            <span className={`flex-1 text-xs leading-relaxed ${rule.is_active ? 'text-slate-700' : 'text-slate-400'}`}>
              {rule.rule_text}
            </span>
            <button
              onClick={() => onDelete(rule.id)}
              className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={newRule}
            onChange={e => setNewRule(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder={RULE_PLACEHOLDERS[placeholderIdx]}
            className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleAdd}
            className="flex-shrink-0 w-8 h-8 bg-brand-500 text-white rounded-lg flex items-center justify-center hover:bg-brand-600"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-start gap-3 message-enter ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-600'
      }`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div className={`max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-brand-500 text-white rounded-tr-none'
          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
      }`}>
        {message.content}
      </div>
    </div>
  );
}

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: `Hello! I'm your AI investment advisor. I have full context of your portfolio and your investment rules.

I can help you with:
• Portfolio analysis and rebalancing suggestions
• Investment strategy based on your rules
• Analysis of specific asset classes
• General investment questions about Indian markets

What would you like to discuss?`,
};

export default function AdvisorPage() {
  const [rules, setRules] = useState<InvestmentRule[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/rules')
      .then(r => r.json())
      .then(data => setRules(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function addRule(text: string) {
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_text: text }),
    });
    const data = await res.json();
    setRules(prev => [{ id: data.id, rule_text: text, is_active: 1, created_at: new Date().toISOString() }, ...prev]);
  }

  async function deleteRule(id: number) {
    await fetch(`/api/rules?id=${id}`, { method: 'DELETE' });
    setRules(prev => prev.filter(r => r.id !== id));
  }

  async function toggleRule(id: number, active: boolean) {
    await fetch('/api/rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: active }),
    });
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: active ? 1 : 0 } : r));
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Placeholder for streaming response
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
    setMessages(msgs => [...msgs, assistantMsg]);

    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.filter(m => m.role !== 'assistant' || m.content !== ''),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 503) {
          setApiKeyMissing(true);
        }
        throw new Error(err.error || 'Request failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response stream');

      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setMessages(msgs => {
          const updated = [...msgs];
          updated[updated.length - 1] = { role: 'assistant', content: fullText };
          return updated;
        });
      }
    } catch (err) {
      setMessages(msgs => {
        const updated = [...msgs];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* Left: Rules Panel */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <RulesPanel
          rules={rules}
          onAdd={addRule}
          onDelete={deleteRule}
          onToggle={toggleRule}
        />
      </div>

      {/* Right: Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">AI Investment Advisor</h2>
            <p className="text-xs text-slate-500">Powered by Claude — knows your portfolio & rules</p>
          </div>
        </div>

        {/* API Key missing banner */}
        {apiKeyMissing && (
          <div className="flex items-start gap-3 bg-amber-50 border-b border-amber-200 px-6 py-3">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <strong>ANTHROPIC_API_KEY is not set.</strong> Add it to your <code className="font-mono bg-amber-100 px-1 rounded">.env.local</code> file and restart the server.
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-slate-50">
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          {loading && messages[messages.length - 1]?.content === '' && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-xl rounded-tl-none px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask about your portfolio, rebalancing, investment strategy..."
              disabled={loading}
              className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center hover:bg-brand-600 disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Portfolio prices are not live. Verify current prices before acting on advice.
          </p>
        </div>
      </div>
    </div>
  );
}
