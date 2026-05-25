import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/db';
import type { DashboardData, Transaction, AssetType } from '@/types';

export async function GET() {
  try {
    const { totals, byAssetType, recentTransactions } = getDashboardStats();

    const totalPnl = totals.current_value - totals.total_invested;
    const pnlPct = totals.total_invested > 0 ? (totalPnl / totals.total_invested) * 100 : 0;

    const breakdown = byAssetType.map(row => ({
      asset_type: row.asset_type as AssetType,
      invested_amount: row.invested_amount,
      current_value: row.current_value,
      pnl: row.current_value - row.invested_amount,
      pnl_pct:
        row.invested_amount > 0
          ? ((row.current_value - row.invested_amount) / row.invested_amount) * 100
          : 0,
      allocation_pct:
        totals.current_value > 0 ? (row.current_value / totals.current_value) * 100 : 0,
    }));

    const data: DashboardData = {
      total_invested: totals.total_invested,
      current_value: totals.current_value,
      total_pnl: totalPnl,
      pnl_pct: pnlPct,
      by_asset_type: breakdown,
      recent_transactions: recentTransactions as Transaction[],
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
