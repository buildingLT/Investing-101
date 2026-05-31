import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getDashboardStats, getAllInvestments, getInvestmentRules } from '@/lib/db';
import { computeAllocationComparison } from '@/lib/portfolio';
import type { Investment } from '@/types';

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 503 }
    );
  }

  const { totals, byAssetType } = getDashboardStats();
  const investments = getAllInvestments() as Investment[];
  const rules = getInvestmentRules() as { rule_text: string; is_active: number }[];
  const allocation = computeAllocationComparison();

  const totalPnl = totals.current_value - totals.total_invested;
  const pnlPct = totals.total_invested > 0 ? (totalPnl / totals.total_invested) * 100 : 0;

  const portfolioText = `
## Portfolio Summary
- Total Invested: ₹${totals.total_invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
- Current Value: ₹${totals.current_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
- P&L: ₹${totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)

## Holdings (${investments.length} positions)
${investments.map(inv => {
  const pnl = inv.current_value - inv.invested_amount;
  const pnlPct = inv.invested_amount > 0 ? (pnl / inv.invested_amount) * 100 : 0;
  return `- [${inv.asset_type}] ${inv.name}${inv.symbol ? ` (${inv.symbol})` : ''}: invested ₹${inv.invested_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}, current ₹${inv.current_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)`;
}).join('\n') || 'No holdings yet.'}

## Allocation vs Targets
${allocation.map(a => `- ${a.asset_type}: actual ${a.actual_pct.toFixed(1)}% vs target ${a.target_pct.toFixed(1)}% (${a.deviation >= 0 ? '+' : ''}${a.deviation.toFixed(1)}% deviation)`).join('\n')}

## Active Investment Rules
${rules.filter(r => r.is_active).map(r => `- ${r.rule_text}`).join('\n') || 'None set.'}
`.trim();

  const auditPrompt = `You are auditing an investment portfolio against a strict rulebook. Be honest, direct, and specific.

${portfolioText}

---
RULEBOOK STANDARDS:

Stock thresholds: P/E under 30 | ROE above 15% | D/E under 1 | Revenue growth above 15% YoY | Profit growth above 20% YoY
MF thresholds: Alpha above 2 | Sharpe above 1 | Beta under 1.2 | Expense ratio under 1% | 3Y returns beat benchmark | Same fund manager 5+ years
ETF thresholds: Tracking error under 0.25% | Expense ratio under 0.25% | Daily volume above 1L shares

Red flags:
- Stocks: revenue falling 2+ quarters | promoter pledging shares | debt rising faster than revenue | negative cash flow
- MFs: negative alpha 2+ years | manager changed recently | expense ratio above 1.5% | AUM falling
- ETFs: tracking error above 0.5% | very low volume | large NAV premium

10 Golden Rules:
1. Never buy on 1Y returns alone — check 3Y and 5Y
2. Always compare to benchmark
3. Direct plan over regular always
4. Read the business, not just the price
5. High P/E can be justified by high growth
6. Sharpe beats raw returns for MF comparison
7. Check fund manager tenure
8. Sector funds max 25% of portfolio
9. Don't chase last year's top performer
10. Review annually, rebalance only if fundamentals changed

---

Produce a structured portfolio audit with these exact sections:

## Overall Health Score
Rate the portfolio /10 with a 1-sentence verdict.

## What's Working
Bullet points of strengths — what aligns with the rulebook.

## Red Flags
Bullet points of specific concerns — name the holding and the rule it violates.

## Allocation Issues
Comment on over/underweight positions vs targets.

## Immediate Actions (top 3)
The 3 most important things to do right now, ranked by priority.

## Watch List
Things to monitor but not act on yet.

Be specific. Name holdings. Use rupee amounts. Don't be vague.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: auditPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ audit: text, generated_at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Audit failed' },
      { status: 500 }
    );
  }
}
