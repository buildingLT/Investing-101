import { NextRequest, NextResponse } from 'next/server';
import { getInvestmentById, updateInvestment, deleteInvestment } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const investment = getInvestmentById(id);
    if (!investment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(investment);
  } catch (error) {
    console.error('GET /api/investments/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch investment' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const body = await request.json();
    updateInvestment(id, body);

    const updated = getInvestmentById(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/investments/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update investment' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    deleteInvestment(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/investments/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete investment' }, { status: 500 });
  }
}
