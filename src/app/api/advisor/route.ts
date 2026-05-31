import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getDashboardStats, getInvestmentRules } from '@/lib/db';
import { computeAllocationComparison } from '@/lib/portfolio';
import type { ChatMessage } from '@/types';

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured. Please add it to your .env.local file.' },
      { status: 503 }
    );
  }

  try {
    const { messages } = await request.json() as { messages: ChatMessage[] };

    // Build portfolio context
    const { totals, byAssetType, recentTransactions } = getDashboardStats();
    const rules = getInvestmentRules() as { rule_text: string; is_active: number }[];
    const allocation = computeAllocationComparison();

    const totalPnl = totals.current_value - totals.total_invested;
    const pnlPct = totals.total_invested > 0 ? (totalPnl / totals.total_invested) * 100 : 0;

    const portfolioContext = `
## Portfolio Summary
- Total Invested: ₹${totals.total_invested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
- Current Value: ₹${totals.current_value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
- P&L: ₹${totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)

## Current Allocation
${byAssetType.map(a => {
  const pct = totals.current_value > 0 ? ((a.current_value / totals.current_value) * 100).toFixed(1) : '0.0';
  return `- ${a.asset_type}: ₹${a.current_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${pct}%)`;
}).join('\n')}

## Target vs Actual Allocation
${allocation.map(a => {
  const sign = a.deviation >= 0 ? '+' : '';
  return `- ${a.asset_type}: Target ${a.target_pct.toFixed(1)}%, Actual ${a.actual_pct.toFixed(1)}% (${sign}${a.deviation.toFixed(1)}% deviation)`;
}).join('\n')}

## User's Investment Rules
${rules.filter(r => r.is_active).length > 0
  ? rules.filter(r => r.is_active).map(r => `- ${r.rule_text}`).join('\n')
  : 'No active investment rules defined yet.'}

## Recent Transactions (last 5)
${(recentTransactions as unknown as Record<string, unknown>[]).slice(0, 5).map((t) =>
  `- ${t['trade_date']}: ${t['type']} ${t['name']} — ₹${Number(t['net_amount'] || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
).join('\n') || 'No recent transactions.'}
`.trim();

    const systemPrompt = `You are a personal investment advisor with full context of the user's portfolio. You provide clear, actionable, personalized advice calibrated to the investor rulebook below.

${portfolioContext}

---
## INVESTOR RULEBOOK (apply these standards to all advice)

### Stock Metrics — ideal thresholds
- P/E Ratio: under 20 = value territory | 20–40 = growth premium | above 60 = very expensive
- P/B Ratio: banks under 2 = good | tech 5–15 = normal
- ROE: above 15% = good | above 25% = excellent | below 10% = avoid
- Debt/Equity: under 0.5 = safe | 0.5–1.5 = acceptable | above 2 = risky
- Dividend Yield: above 3% = income stock | 0% = growth stock (reinvesting profits)
- Revenue growth: above 20% YoY = strong | 10–20% = healthy | negative = red flag

### Mutual Fund Metrics — ideal thresholds
- Alpha: above 2 = manager earning their fee | negative = buy index fund instead
- Beta: under 1 = defensive | 1–1.3 = market-like | above 1.5 = very aggressive
- Sharpe Ratio: above 1.5 = excellent | 1–1.5 = good | below 0.5 = poor risk management
- Expense Ratio: index funds under 0.25% | active funds 0.5–1% acceptable | above 1.5% = too expensive
- Rolling Returns: consistent across 1Y/3Y/5Y = SIP-worthy | erratic = avoid for SIP
- AUM: mid/small cap sweet spot ₹2,000–15,000Cr | large cap: bigger AUM = better

### ETF Metrics — ideal thresholds
- Tracking Error: under 0.20% = excellent | 0.20–0.50% = acceptable | above 0.50% = poor
- Liquidity/Volume: high volume = safe | low volume = liquidity trap
- Premium/Discount to NAV: within 0.5% = fair | above 2% premium = wait

### The 10 Golden Rules
1. Never buy on 1-year returns alone — always check 3Y and 5Y
2. Always compare to benchmark — a fund returning 15% when Nifty returned 18% destroyed value
3. Direct plan always over regular — same fund, 0.5–1% more returns annually
4. For stocks — read the business, not just the price. Is revenue growing? Is debt rising?
5. High P/E is not always bad — context matters (Eternal P/E 90 with profit +346% YoY is justified)
6. Sharpe ratio beats raw returns for MF comparison — higher Sharpe = smarter risk-taking
7. Check fund manager tenure — great past returns don't apply if manager left recently
8. Sector funds are satellite, not core — max 25% of portfolio in sector funds
9. Don't chase last year's top performer — returns mean-revert; buy consistent compounders
10. Review annually, not monthly — rebalance only if something fundamentally changed

### Red Flags — flag these immediately
- Stocks: revenue falling 2+ consecutive quarters | promoter pledging shares | debt rising faster than revenue | negative cash flow despite positive profit
- Mutual Funds: negative alpha 2+ years | fund manager changed recently | expense ratio above 1.5% | AUM falling | returns concentrated in 1–2 stocks
- ETFs: tracking error above 0.5% | very low daily volume | large premium to NAV
- Universal: anyone promising guaranteed returns above 12% in equity markets

---

Guidelines:
- Apply the rulebook standards above when evaluating any investment
- Be specific with rupee amounts and percentages
- Highlight rebalancing needs if allocation deviates significantly from targets
- Keep responses concise and structured (use bullet points and headers)
- Remind the user that prices in this app are not live — verify current prices before acting
- Be direct and helpful like a knowledgeable friend who understands Indian markets
- When asked to audit, go through each holding and flag rule violations explicitly`;

    const anthropic = new Anthropic({ apiKey });

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Return a streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('POST /api/advisor error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get advisor response' },
      { status: 500 }
    );
  }
}
