'use client';

import { useState } from 'react';
import { ShieldCheck, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

function parseAudit(text: string) {
  const sections: { title: string; content: string }[] = [];
  const lines = text.split('\n');
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push({ title: current.title, content: current.lines.join('\n').trim() });
      current = { title: line.replace('## ', '').trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push({ title: current.title, content: current.lines.join('\n').trim() });
  return sections;
}

function sectionIcon(title: string) {
  if (title.toLowerCase().includes('health')) return <ShieldCheck className="w-4 h-4" />;
  if (title.toLowerCase().includes('working')) return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (title.toLowerCase().includes('red flag')) return <AlertTriangle className="w-4 h-4 text-red-500" />;
  if (title.toLowerCase().includes('immediate')) return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  if (title.toLowerCase().includes('watch')) return <Clock className="w-4 h-4 text-blue-500" />;
  return <ShieldCheck className="w-4 h-4 text-slate-400" />;
}

function sectionColor(title: string) {
  if (title.toLowerCase().includes('working')) return 'border-emerald-200 bg-emerald-50';
  if (title.toLowerCase().includes('red flag')) return 'border-red-200 bg-red-50';
  if (title.toLowerCase().includes('immediate')) return 'border-amber-200 bg-amber-50';
  if (title.toLowerCase().includes('watch')) return 'border-blue-200 bg-blue-50';
  return 'border-slate-200 bg-white';
}

export default function AuditPage() {
  const [audit, setAudit] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAudit() {
    setLoading(true);
    setError(null);
    setAudit(null);
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed');
      setAudit(data.audit);
      setGeneratedAt(data.generated_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run audit');
    } finally {
      setLoading(false);
    }
  }

  const sections = audit ? parseAudit(audit) : [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portfolio Audit</h1>
          <p className="text-slate-500 text-sm mt-1">AI-powered review against your investor rulebook</p>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Auditing...' : audit ? 'Re-run Audit' : 'Run Audit'}
        </button>
      </div>

      {!audit && !loading && !error && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No audit yet</p>
          <p className="text-slate-400 text-sm mt-1">Click "Run Audit" to get an AI-powered review of your portfolio against your rulebook.</p>
          <p className="text-slate-400 text-xs mt-3">Requires ANTHROPIC_API_KEY in .env.local</p>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Analysing your portfolio...</p>
          <p className="text-slate-400 text-sm mt-1">Checking against rulebook standards. This takes ~10 seconds.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Audit failed</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {sections.length > 0 && (
        <>
          {generatedAt && (
            <p className="text-xs text-slate-400 mb-4">
              Generated {new Date(generatedAt).toLocaleString('en-IN')} · Prices may not be live
            </p>
          )}
          <div className="space-y-4">
            {sections.map((section) => (
              <div
                key={section.title}
                className={`rounded-xl border p-5 ${sectionColor(section.title)}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {sectionIcon(section.title)}
                  <h2 className="font-semibold text-slate-900 text-sm">{section.title}</h2>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
