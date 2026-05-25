import { NextRequest, NextResponse } from 'next/server';
import { parseGrowwPDF } from '@/lib/pdf-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamically import pdf-parse to avoid SSR issues
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(buffer);

    const result = parseGrowwPDF(pdfData.text);

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/parse-pdf error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse PDF' },
      { status: 500 }
    );
  }
}
