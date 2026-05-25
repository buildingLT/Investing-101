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

    const systemPrompt = `You are a personal investment advisor with full context of the user's portfolio. You provide clear, actionable, personalized advice.

${portfolioContext}

Guidelines:
- Always consider the user's investment rules when giving advice
- Be specific with rupee amounts and percentages
- Highlight rebalancing needs if allocation deviates significantly from targets
- Keep responses concise and structured (use bullet points and headers)
- Remind the user that prices in this app are not live — they should verify current prices before acting
- Do not provide generic disclaimers unless the advice involves significant risk
- Be direct and helpful like a knowledgeable friend who understands Indian markets`;

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
