'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Save } from 'lucide-react';
import type { AllocationComparison, AssetType } from '@/types';
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from '@/types';

const ASSET_TYPES: AssetType[] = ['STOCK', 'MF', 'FD', 'INSURANCE', 'REAL_ESTATE', 'GOLD', 'CRYPTO', 'OTHER'];

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(n));
}

export default function MixPage() {
  const [comparison, setComparison] = useState<AllocationComparison[]>([]);
  const [targets, setTargets] = useState<Record<AssetType, number>>({} as Record<AssetType, number>);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadData = useCallback(async () => {
    const res = await fetch('/api/allocation');
    const data = await res.json();
    setComparison(data.comparison || []);
    const t: Record<string, number> = {};
    for (const row of (data.targets || [])) {
      t[row.asset_type] = row.target_percentage;
    }
    setTargets(t as Record<AssetType, number>);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalTarget = Object.values(targets).reduce((s, v) => s + (v || 0), 0);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/allocation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targets),
      });
      await loadData();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const chartData = ASSET_TYPES.map(at => ({
    name: ASSET_TYPE_LABELS[at],
    target: targets[at] || 0,
    actual: comparison.find(c => c.asset_type === at)?.actual_pct || 0,
    asset_type: at,
  }));

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
        <h1 className="text-2xl font-bold text-slate-900">Portfolio Mix</h1>
        <p className="text-slate-500 text-sm mt-1">Define your target allocation and see how your actual portfolio compares</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target Allocation Editor */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Target Allocation</h2>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                Math.abs(totalTarget - 100) < 0.1
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                Total: {totalTarget.toFixed(1)}%
              </span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 bg-brand-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {Math.abs(totalTarget - 100) >= 0.5 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Target percentages should sum to 100%. Currently: {totalTarget.toFixed(1)}%
            </p>
          )}

          <div className="space-y-4">
            {ASSET_TYPES.map(at => {
              const val = targets[at] || 0;
              const color = ASSET_TYPE_COLORS[at];
              return (
                <div key={at}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <label className="text-sm font-medium text-slate-700">{ASSET_TYPE_LABELS[at]}</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={val}
                        onChange={e => setTargets(prev => ({ ...prev, [at]: parseFloat(e.target.value) || 0 }))}
                        className="w-16 text-right border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all"
                      style={{ width: `${Math.min(val, 100)}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Target vs Actual</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barGap={4}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend
                formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
              />
              <Bar dataKey="target" name="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.asset_type} fill={ASSET_TYPE_COLORS[entry.asset_type as AssetType] + '55'} />
                ))}
              </Bar>
              <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.asset_type} fill={ASSET_TYPE_COLORS[entry.asset_type as AssetType]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rebalancing Suggestions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Rebalancing Suggestions</h2>
        {comparison.filter(c => Math.abs(c.deviation) >= 5).length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600">
            <Minus className="w-4 h-4" />
            <p className="text-sm">Your portfolio is well-aligned with your targets. No major rebalancing needed (all deviations &lt; 5%).</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comparison
              .filter(c => Math.abs(c.deviation) >= 5)
              .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
              .map(c => {
                const overweight = c.deviation > 0;
                return (
                  <div
                    key={c.asset_type}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${
                      overweight
                        ? 'bg-red-50 border-red-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className={`mt-0.5 ${overweight ? 'text-red-500' : 'text-blue-500'}`}>
                      {overweight ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${overweight ? 'text-red-800' : 'text-blue-800'}`}>
                        {ASSET_TYPE_LABELS[c.asset_type]} — {overweight ? 'Overweight' : 'Underweight'} by {Math.abs(c.deviation).toFixed(1)}%
                      </p>
                      <p className={`text-sm mt-0.5 ${overweight ? 'text-red-700' : 'text-blue-700'}`}>
                        {overweight
                          ? `Consider reducing by ${formatINR(c.rebalance_amount)} to align with ${c.target_pct.toFixed(1)}% target (currently ${c.actual_pct.toFixed(1)}%)`
                          : `Consider adding ${formatINR(Math.abs(c.rebalance_amount))} to align with ${c.target_pct.toFixed(1)}% target (currently ${c.actual_pct.toFixed(1)}%)`
                        }
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Full Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 mt-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Full Allocation Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-6 text-slate-500 font-medium">Asset Class</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Current Value</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Actual %</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Target %</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Deviation</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Rebalance</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map(c => {
                const deviation = c.deviation;
                const deviationAbs = Math.abs(deviation);
                return (
                  <tr key={c.asset_type} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ASSET_TYPE_COLORS[c.asset_type] }} />
                        <span className="font-medium text-slate-800">{ASSET_TYPE_LABELS[c.asset_type]}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">{formatINR(c.current_value)}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{c.actual_pct.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right text-slate-700">{c.target_pct.toFixed(1)}%</td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      deviationAbs < 2 ? 'text-slate-500' : deviation > 0 ? 'text-red-500' : 'text-blue-600'
                    }`}>
                      {deviation >= 0 ? '+' : ''}{deviation.toFixed(1)}%
                    </td>
                    <td className={`py-3 px-4 text-right text-xs font-medium ${
                      c.rebalance_amount > 0 ? 'text-red-500' : c.rebalance_amount < 0 ? 'text-blue-600' : 'text-slate-400'
                    }`}>
                      {c.rebalance_amount > 100 ? `Reduce ${formatINR(c.rebalance_amount)}` :
                       c.rebalance_amount < -100 ? `Add ${formatINR(Math.abs(c.rebalance_amount))}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
