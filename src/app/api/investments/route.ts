import { NextRequest, NextResponse } from 'next/server';
import { getAllInvestments, createInvestment } from '@/lib/db';
import type { Investment } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const investments = getAllInvestments(type);
    return NextResponse.json(investments);
  } catch (error) {
    console.error('GET /api/investments error:', error);
    return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: Omit<Investment, 'id' | 'created_at' | 'updated_at'>[] = Array.isArray(body) ? body : [body];

    const ids: (number | bigint)[] = [];
    for (const item of items) {
      // Ensure numeric fields
      const data = {
        asset_type: item.asset_type,
        name: item.name,
        symbol: item.symbol ?? null,
        quantity: Number(item.quantity) || 0,
        avg_buy_price: Number(item.avg_buy_price) || 0,
        current_price: Number(item.current_price) || 0,
        invested_amount: Number(item.invested_amount) || 0,
        current_value: Number(item.current_value) || 0,
        currency: item.currency || 'INR',
        purchase_date: item.purchase_date ?? null,
        maturity_date: item.maturity_date ?? null,
        interest_rate: item.interest_rate != null ? Number(item.interest_rate) : null,
        notes: item.notes ?? null,
        source: item.source || 'MANUAL',
      };
      const id = createInvestment(data);
      ids.push(id);
    }

    return NextResponse.json({ success: true, ids }, { status: 201 });
  } catch (error) {
    console.error('POST /api/investments error:', error);
    return NextResponse.json({ error: 'Failed to create investment' }, { status: 500 });
  }
}
