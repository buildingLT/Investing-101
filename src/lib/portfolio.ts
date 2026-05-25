import type { AllocationComparison, AssetBreakdown, AssetType, Investment } from '@/types';
import { getAllInvestments, getAllocationTargets } from './db';

export function computePortfolioSummary() {
  const investments = getAllInvestments() as Investment[];

  let totalInvested = 0;
  let totalCurrent = 0;

  const byAssetType: Record<string, { invested: number; current: number }> = {};

  for (const inv of investments) {
    totalInvested += inv.invested_amount;
    totalCurrent += inv.current_value;

    if (!byAssetType[inv.asset_type]) {
      byAssetType[inv.asset_type] = { invested: 0, current: 0 };
    }
    byAssetType[inv.asset_type].invested += inv.invested_amount;
    byAssetType[inv.asset_type].current += inv.current_value;
  }

  const breakdown: AssetBreakdown[] = Object.entries(byAssetType).map(([asset_type, vals]) => {
    const pnl = vals.current - vals.invested;
    const pnl_pct = vals.invested > 0 ? (pnl / vals.invested) * 100 : 0;
    const allocation_pct = totalCurrent > 0 ? (vals.current / totalCurrent) * 100 : 0;
    return {
      asset_type: asset_type as AssetType,
      invested_amount: vals.invested,
      current_value: vals.current,
      pnl,
      pnl_pct,
      allocation_pct,
    };
  });

  return {
    total_invested: totalInvested,
    current_value: totalCurrent,
    total_pnl: totalCurrent - totalInvested,
    pnl_pct: totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0,
    breakdown,
  };
}

export function computeAllocationComparison(): AllocationComparison[] {
  const targets = getAllocationTargets() as { asset_type: AssetType; target_percentage: number }[];
  const { current_value: totalCurrent, breakdown } = computePortfolioSummary();

  const actualMap: Record<string, { current_value: number; actual_pct: number }> = {};
  for (const b of breakdown) {
    actualMap[b.asset_type] = {
      current_value: b.current_value,
      actual_pct: b.allocation_pct,
    };
  }

  return targets.map(t => {
    const actual = actualMap[t.asset_type] || { current_value: 0, actual_pct: 0 };
    const deviation = actual.actual_pct - t.target_percentage;

    // Rebalance amount: how much to move to align with target
    // Positive = overweight (sell/reduce), negative = underweight (buy/add)
    const targetValue = (t.target_percentage / 100) * totalCurrent;
    const rebalance_amount = actual.current_value - targetValue;

    return {
      asset_type: t.asset_type,
      target_pct: t.target_percentage,
      actual_pct: actual.actual_pct,
      deviation,
      current_value: actual.current_value,
      rebalance_amount,
    };
  });
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPct(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}
