'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Investment, AssetType } from '@/types';
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from '@/types';

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function PnlBadge({ pnl, pnlPct }: { pnl: number; pnlPct: number }) {
  const positive = pnl >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-sm font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
      {formatINR(Math.abs(pnl))} ({positive ? '+' : ''}{pnlPct.toFixed(2)}%)
    </span>
  );
}

function EditModal({ investment, onClose, onSaved }: {
  investment: Investment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    current_price: investment.current_price,
    current_value: investment.current_value,
    notes: investment.notes || '',
  });
  const [saving, setSaving] = useState(false);

  function handleChange(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updatedValue = form.current_price * investment.quantity;
      await fetch(`/api/investments/${investment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_price: Number(form.current_price),
          current_value: updatedValue,
          notes: form.notes,
        }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit {investment.name}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Price (₹)</label>
            <input
              type="number"
              value={form.current_price}
              onChange={e => handleChange('current_price', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssetGroup({ assetType, investments, onEdit, onDelete }: {
  assetType: AssetType;
  investments: Investment[];
  onEdit: (inv: Investment) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalInvested = investments.reduce((s, i) => s + i.invested_amount, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.current_value, 0);
  const totalPnl = totalCurrent - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const color = ASSET_TYPE_COLORS[assetType] || '#6b7280';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="font-semibold text-slate-900 flex-1">
          {ASSET_TYPE_LABELS[assetType]} ({investments.length})
        </span>
        <div className="hidden sm:flex items-center gap-6 text-sm">
          <span className="text-slate-500">Invested: <span className="text-slate-800 font-medium">{formatINR(totalInvested)}</span></span>
          <span className="text-slate-500">Value: <span className="text-slate-800 font-medium">{formatINR(totalCurrent)}</span></span>
          <PnlBadge pnl={totalPnl} pnlPct={pnlPct} />
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-6 text-slate-500 font-medium">Name</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Qty</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Avg Price</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Curr. Price</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Invested</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Curr. Value</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">P&L</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {investments.map(inv => {
                const pnl = inv.current_value - inv.invested_amount;
                const pnlPct = inv.invested_amount > 0 ? (pnl / inv.invested_amount) * 100 : 0;
                return (
                  <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-6">
                      <div className="font-medium text-slate-800">{inv.name}</div>
                      {inv.symbol && <div className="text-xs text-slate-400">{inv.symbol}</div>}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">{inv.quantity}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{formatINR(inv.avg_buy_price)}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{formatINR(inv.current_price)}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{formatINR(inv.invested_amount)}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">{formatINR(inv.current_value)}</td>
                    <td className="py-3 px-4 text-right">
                      <PnlBadge pnl={pnl} pnlPct={pnlPct} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => onEdit(inv)}
                          className="p-1.5 text-slate-400 hover:text-brand-500 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function HoldingsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Investment | null>(null);

  async function loadInvestments() {
    const res = await fetch('/api/investments');
    const data = await res.json();
    setInvestments(data);
    setLoading(false);
  }

  useEffect(() => { loadInvestments(); }, []);

  async function handleDelete(id: number) {
    if (!confirm('Delete this investment?')) return;
    await fetch(`/api/investments/${id}`, { method: 'DELETE' });
    await loadInvestments();
  }

  // Group by asset type
  const grouped = investments.reduce<Record<string, Investment[]>>((acc, inv) => {
    if (!acc[inv.asset_type]) acc[inv.asset_type] = [];
    acc[inv.asset_type].push(inv);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Holdings</h1>
        <p className="text-slate-500 text-sm mt-1">All your investments grouped by asset class</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-lg">No investments yet.</p>
          <p className="text-slate-400 text-sm mt-2">Add investments manually or import from Groww.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <AssetGroup
            key={type}
            assetType={type as AssetType}
            investments={items}
            onEdit={setEditTarget}
            onDelete={handleDelete}
          />
        ))
      )}

      {editTarget && (
        <EditModal
          investment={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={loadInvestments}
        />
      )}
    </div>
  );
}
