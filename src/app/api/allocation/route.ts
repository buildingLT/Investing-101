import { NextRequest, NextResponse } from 'next/server';
import { getAllocationTargets, upsertAllocationTarget } from '@/lib/db';
import { computeAllocationComparison } from '@/lib/portfolio';

export async function GET() {
  try {
    const targets = getAllocationTargets();
    const comparison = computeAllocationComparison();
    return NextResponse.json({ targets, comparison });
  } catch (error) {
    console.error('GET /api/allocation error:', error);
    return NextResponse.json({ error: 'Failed to fetch allocation data' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, number>;
    // body: { STOCK: 40, MF: 25, ... }
    for (const [assetType, pct] of Object.entries(body)) {
      upsertAllocationTarget(assetType, Number(pct));
    }
    const targets = getAllocationTargets();
    const comparison = computeAllocationComparison();
    return NextResponse.json({ targets, comparison });
  } catch (error) {
    console.error('PUT /api/allocation error:', error);
    return NextResponse.json({ error: 'Failed to update allocation targets' }, { status: 500 });
  }
}
