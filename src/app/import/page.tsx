'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import type { PDFParseResult, ParsedTrade } from '@/types';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);
}

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <label
      className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
        dragging ? 'border-brand-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-brand-400'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-2 text-center px-6">
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-1">
          <Upload className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-700">Drag &amp; drop a Groww PDF here</p>
        <p className="text-xs text-slate-400">or click to browse</p>
        <p className="text-xs text-slate-400 mt-1">Supports: Contract Note, Daily Margin Statement</p>
      </div>
      <input
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
      />
    </label>
  );
}

function TradePreview({ trades, onConfirm, saving }: {
  trades: ParsedTrade[];
  onConfirm: () => void;
  saving: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <span className="font-semibold text-slate-900">{trades.length} trade{trades.length !== 1 ? 's' : ''} detected</span>
        </div>
        <button
          onClick={onConfirm}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Import All'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left py-3 px-6 text-slate-500 font-medium">Date</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Type</th>
              <th className="text-right py-3 px-4 text-slate-500 font-medium">Qty</th>
              <th className="text-right py-3 px-4 text-slate-500 font-medium">Rate</th>
              <th className="text-right py-3 px-4 text-slate-500 font-medium">Gross</th>
              <th className="text-right py-3 px-4 text-slate-500 font-medium">Charges</th>
              <th className="text-right py-3 px-4 text-slate-500 font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                <td className="py-3 px-6 text-slate-500">{t.trade_date}</td>
                <td className="py-3 px-4 text-slate-800 font-medium">{t.name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    t.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>{t.type}</span>
                </td>
                <td className="py-3 px-4 text-right text-slate-700">{t.quantity}</td>
                <td className="py-3 px-4 text-right text-slate-700">{formatINR(t.rate)}</td>
                <td className="py-3 px-4 text-right text-slate-700">{formatINR(t.gross_amount)}</td>
                <td className="py-3 px-4 text-right text-slate-500 text-xs">
                  B:{formatINR(t.brokerage)} S:{formatINR(t.stt)} G:{formatINR(t.gst)}
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-900">{formatINR(t.net_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ImportPage() {
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<PDFParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleFile(file: File) {
    setParsing(true);
    setResult(null);
    setError(null);
    setSaved(false);
    setFileName(file.name);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parse failed');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse PDF');
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!result?.trades?.length) return;
    setSaving(true);
    try {
      // Save transactions
      const investments = result.trades.map(t => ({
        asset_type: 'STOCK',
        name: t.name,
        symbol: t.symbol,
        quantity: t.type === 'BUY' ? t.quantity : -t.quantity,
        avg_buy_price: t.rate,
        current_price: t.rate,
        invested_amount: t.type === 'BUY' ? t.net_amount : 0,
        current_value: t.type === 'BUY' ? t.net_amount : 0,
        currency: 'INR',
        purchase_date: t.trade_date,
        maturity_date: null,
        interest_rate: null,
        notes: `Imported from Groww contract note on ${format(new Date(), 'dd MMM yyyy')}`,
        source: 'GROWW',
      }));

      await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(investments),
      });

      setSaved(true);
      setResult(null);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    setFileName(null);
    setSaved(false);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Import from Groww</h1>
        <p className="text-slate-500 text-sm mt-1">Upload a Groww PDF to automatically extract trade data</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">How to get Groww PDFs</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>
            <strong>Contract Note:</strong> Groww sends a &quot;Contract Note&quot; email after every trading day with trades. Download the PDF attachment.
          </li>
          <li>
            <strong>Daily Margin Statement:</strong> Check Groww emails for &quot;Daily Margin Statement&quot; or download from the Groww app under Reports.
          </li>
          <li>Both PDF types are automatically detected and parsed.</li>
        </ul>
      </div>

      {saved && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-emerald-800 font-medium">Investments imported successfully!</p>
            <p className="text-emerald-700 text-sm">Your holdings have been updated.</p>
          </div>
          <button onClick={reset} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Dropzone */}
      {!result && !parsing && (
        <DropZone onFile={handleFile} />
      )}

      {/* Parsing indicator */}
      {parsing && (
        <div className="flex items-center justify-center h-52 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
          <div className="flex items-center gap-3 text-slate-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-500" />
            <span className="text-sm">Parsing {fileName}...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Parse error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button onClick={reset} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <span className="text-sm text-slate-600 font-medium">{fileName}</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                result.document_type === 'CONTRACT_NOTE'
                  ? 'bg-brand-100 text-brand-700'
                  : result.document_type === 'MARGIN_STATEMENT'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {result.document_type.replace('_', ' ')}
              </span>
            </div>
            <button onClick={reset} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {result.parse_errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-amber-800 text-xs font-medium mb-1">Parse warnings:</p>
              {result.parse_errors.map((e, i) => (
                <p key={i} className="text-amber-700 text-xs">{e}</p>
              ))}
            </div>
          )}

          {result.document_type === 'CONTRACT_NOTE' && result.trades && result.trades.length > 0 && (
            <TradePreview trades={result.trades} onConfirm={handleConfirm} saving={saving} />
          )}

          {result.document_type === 'MARGIN_STATEMENT' && result.margin_statement && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Margin Statement</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Date', value: result.margin_statement.date },
                  { label: 'Client ID', value: result.margin_statement.client_id },
                  { label: 'Margin Available', value: formatINR(result.margin_statement.margin_available) },
                  { label: 'Margin Used', value: formatINR(result.margin_statement.margin_used) },
                  { label: 'Cash Balance', value: formatINR(result.margin_statement.cash_component) },
                  { label: 'Open Positions', value: result.margin_statement.open_positions?.toString() || 'N/A' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-4">Margin statements are for reference only and are not saved to investments.</p>
            </div>
          )}

          {result.document_type === 'UNKNOWN' && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">Unknown document type</p>
                <p className="text-amber-700 text-sm">This PDF doesn&apos;t appear to be a Groww Contract Note or Margin Statement. Please verify you&apos;re uploading the correct file.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
