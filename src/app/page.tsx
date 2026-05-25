'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import type { DashboardData, AssetBreakdown } from '@/types';
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from '@/types';

function StatCard({
  label,
  value,
  sub,
  positive,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          positive === undefined
            ? 'bg-blue-50 text-blue-600'
            : positive
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-red-50 text-red-600'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && (
          <p
            className={`text-sm mt-0.5 font-medium ${
              positive === undefined
                ? 'text-slate-500'
                : positive
                ? 'text-emerald-600'
                : 'text-red-500'
            }`}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const RADIAN = Math.PI / 180;
function CustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-500">Error loading dashboard: {error}</div>
    );
  }

  if (!data) return null;

  const pnlPositive = data.total_pnl >= 0;
  const chartData = data.by_asset_type
    .filter(b => b.current_value > 0)
    .map(b => ({
      name: ASSET_TYPE_LABELS[b.asset_type as keyof typeof ASSET_TYPE_LABELS] || b.asset_type,
      value: b.current_value,
      asset_type: b.asset_type,
    }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Portfolio Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Overview of your investments &mdash; prices are not live
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Current Value"
          value={formatINR(data.current_value)}
          icon={DollarSign}
        />
        <StatCard
          label="Invested Amount"
          value={formatINR(data.total_invested)}
          icon={BarChart3}
        />
        <StatCard
          label="Total P&L"
          value={formatINR(Math.abs(data.total_pnl))}
          sub={`${pnlPositive ? '+' : '-'}${Math.abs(data.pnl_pct).toFixed(2)}%`}
          positive={pnlPositive}
          icon={pnlPositive ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="Holdings"
          value={String(data.by_asset_type.length)}
          sub="Asset classes"
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Donut Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Asset Allocation</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={CustomLabel}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.asset_type}
                      fill={ASSET_TYPE_COLORS[entry.asset_type as keyof typeof ASSET_TYPE_COLORS] || '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatINR(value), 'Value']}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-slate-700">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No investment data yet. Add investments to see the chart.
            </div>
          )}
        </div>

        {/* Asset Breakdown Table */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Breakdown by Asset Class</h2>
          {data.by_asset_type.length > 0 ? (
            <div className="space-y-3">
              {data.by_asset_type.map((b: AssetBreakdown) => {
                const pnlPos = b.pnl >= 0;
                return (
                  <div key={b.asset_type} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ASSET_TYPE_COLORS[b.asset_type as keyof typeof ASSET_TYPE_COLORS] || '#6b7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {ASSET_TYPE_LABELS[b.asset_type as keyof typeof ASSET_TYPE_LABELS] || b.asset_type}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 ml-2">
                          {formatINR(b.current_value)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-slate-500">{b.allocation_pct.toFixed(1)}% of portfolio</span>
                        <span className={`text-xs font-medium flex items-center gap-0.5 ${pnlPos ? 'text-emerald-600' : 'text-red-500'}`}>
                          {pnlPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {pnlPos ? '+' : ''}{b.pnl_pct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No investments added yet.
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Transactions</h2>
        {data.recent_transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 text-slate-500 font-medium">Date</th>
                  <th className="text-left py-2 pr-4 text-slate-500 font-medium">Name</th>
                  <th className="text-left py-2 pr-4 text-slate-500 font-medium">Type</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_transactions.map(txn => (
                  <tr key={txn.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-4 text-slate-500">
                      {txn.trade_date
                        ? format(new Date(txn.trade_date), 'dd MMM yyyy')
                        : '—'}
                    </td>
                    <td className="py-2 pr-4 text-slate-800 font-medium">{txn.name}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          txn.type === 'BUY'
                            ? 'bg-emerald-100 text-emerald-700'
                            : txn.type === 'SELL'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {txn.type}
                      </span>
                    </td>
                    <td className="py-2 text-right text-slate-900 font-medium">
                      {formatINR(txn.net_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-8">
            No transactions yet. Import from Groww or add manually.
          </p>
        )}
      </div>
    </div>
  );
}
