import { NextRequest, NextResponse } from 'next/server';
import { getInvestmentRules, createInvestmentRule, deleteInvestmentRule, toggleInvestmentRule } from '@/lib/db';

export async function GET() {
  try {
    const rules = getInvestmentRules();
    return NextResponse.json(rules);
  } catch (error) {
    console.error('GET /api/rules error:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { rule_text } = await request.json();
    if (!rule_text || typeof rule_text !== 'string') {
      return NextResponse.json({ error: 'rule_text is required' }, { status: 400 });
    }
    const id = createInvestmentRule(rule_text.trim());
    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/rules error:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    deleteInvestmentRule(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/rules error:', error);
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, is_active } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    toggleInvestmentRule(id, Boolean(is_active));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/rules error:', error);
    return NextResponse.json({ error: 'Failed to toggle rule' }, { status: 500 });
  }
}
