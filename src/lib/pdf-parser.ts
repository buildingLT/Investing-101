import type { PDFParseResult, ParsedTrade, ParsedMarginStatement } from '@/types';

export function parseGrowwPDF(rawText: string): PDFParseResult {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const errors: string[] = [];

  // Detect document type
  const isContractNote = detectContractNote(text);
  const isMarginStatement = detectMarginStatement(text);

  if (isContractNote) {
    const trades = parseContractNote(text, errors);
    return {
      document_type: 'CONTRACT_NOTE',
      trades,
      raw_text: text,
      parse_errors: errors,
    };
  }

  if (isMarginStatement) {
    const marginStatement = parseMarginStatement(text, errors);
    return {
      document_type: 'MARGIN_STATEMENT',
      margin_statement: marginStatement || undefined,
      raw_text: text,
      parse_errors: errors,
    };
  }

  errors.push('Could not determine document type. Expected Groww Contract Note or Margin Statement.');
  return {
    document_type: 'UNKNOWN',
    raw_text: text,
    parse_errors: errors,
  };
}

function detectContractNote(text: string): boolean {
  const indicators = [
    /contract\s+note/i,
    /trade\s+confirmation/i,
    /scrip\s+name/i,
    /b\/s/i,
    /isin/i,
    /brokerage/i,
    /stt/i,
  ];
  return indicators.filter(r => r.test(text)).length >= 3;
}

function detectMarginStatement(text: string): boolean {
  const indicators = [
    /margin\s+statement/i,
    /daily\s+margin/i,
    /margin\s+available/i,
    /margin\s+used/i,
    /ledger\s+balance/i,
    /net\s+position/i,
  ];
  return indicators.filter(r => r.test(text)).length >= 2;
}

function parseContractNote(text: string, errors: string[]): ParsedTrade[] {
  const trades: ParsedTrade[] = [];

  // Extract trade date
  const dateMatch = text.match(/(?:trade\s+date|contract\s+date)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i)
    || text.match(/(\d{2}[-/]\d{2}[-/]\d{4})/);
  const tradeDate = dateMatch ? normalizeDate(dateMatch[1]) : new Date().toISOString().split('T')[0];

  // Try to parse table rows — Groww contract notes have structured table data
  // Pattern: ScripName | B/S | Qty | Rate | GrossAmt | Brokerage | STT | GST | Net
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (
      (line.includes('scrip') || line.includes('symbol') || line.includes('stock')) &&
      (line.includes('qty') || line.includes('quantity')) &&
      (line.includes('rate') || line.includes('price'))
    ) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx >= 0) {
    // Parse structured table
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.toLowerCase().includes('total') || line.toLowerCase().includes('grand total')) {
        continue;
      }

      const trade = parseContractNoteLine(line, tradeDate, errors);
      if (trade) {
        trades.push(trade);
      }
    }
  } else {
    // Fallback: regex-based extraction
    errors.push('Could not find structured table header. Attempting regex-based extraction.');
    const tradeBlocks = extractTradeBlocks(text, tradeDate, errors);
    trades.push(...tradeBlocks);
  }

  if (trades.length === 0) {
    errors.push('No trades could be extracted from the contract note.');
  }

  return trades;
}

function parseContractNoteLine(line: string, tradeDate: string, errors: string[]): ParsedTrade | null {
  // Try to extract: Name, B/S, Qty, Rate, Gross, Brokerage, STT, GST, Net
  // Groww format often uses tab or multiple spaces as delimiter
  const parts = line.split(/\s{2,}|\t/).map(p => p.trim()).filter(p => p.length > 0);

  if (parts.length < 4) return null;

  // Check if this looks like a trade row (has a B or S indicator and numbers)
  const hasBuyOrSell = parts.some(p => /^[BS]$/.test(p) || /^buy$/i.test(p) || /^sell$/i.test(p));
  const hasNumbers = parts.filter(p => /^[\d,.-]+$/.test(p.replace(/,/g, ''))).length >= 3;

  if (!hasBuyOrSell || !hasNumbers) return null;

  try {
    // Find the B/S indicator
    let bsIdx = parts.findIndex(p => /^[BS]$/.test(p) || /^buy$/i.test(p) || /^sell$/i.test(p));
    if (bsIdx < 0) return null;

    const name = parts.slice(0, bsIdx).join(' ').trim();
    if (!name) return null;

    const tradeType = /^[BS]$/.test(parts[bsIdx])
      ? parts[bsIdx] === 'B' ? 'BUY' : 'SELL'
      : parts[bsIdx].toUpperCase() as 'BUY' | 'SELL';

    const numbers = parts.slice(bsIdx + 1).map(p => parseFloat(p.replace(/,/g, '')) || 0);

    const quantity = numbers[0] || 0;
    const rate = numbers[1] || 0;
    const gross = numbers[2] || quantity * rate;
    const brokerage = numbers[3] || 0;
    const stt = numbers[4] || 0;
    const gst = numbers[5] || 0;
    const net = numbers[numbers.length - 1] || gross;

    if (quantity <= 0 || rate <= 0) return null;

    return {
      trade_date: tradeDate,
      name,
      symbol: extractSymbol(name),
      type: tradeType,
      quantity,
      rate,
      gross_amount: gross,
      brokerage,
      stt,
      gst,
      net_amount: net,
    };
  } catch {
    return null;
  }
}

function extractTradeBlocks(text: string, tradeDate: string, errors: string[]): ParsedTrade[] {
  const trades: ParsedTrade[] = [];

  // Look for patterns like: SYMBOL BUY/SELL QTY @ RATE
  const tradePattern = /([A-Z][A-Z0-9&.-]+(?:\s+[A-Z][A-Z0-9&.-]+)*)\s+(BUY|SELL|B|S)\s+([\d,]+)\s+(?:@|at|AT)?\s*([\d,.]+)/gi;
  let match;

  while ((match = tradePattern.exec(text)) !== null) {
    const [, name, side, qtyStr, rateStr] = match;
    const quantity = parseFloat(qtyStr.replace(/,/g, ''));
    const rate = parseFloat(rateStr.replace(/,/g, ''));

    if (quantity > 0 && rate > 0) {
      const gross = quantity * rate;
      trades.push({
        trade_date: tradeDate,
        name: name.trim(),
        symbol: extractSymbol(name.trim()),
        type: (side === 'B' || side.toUpperCase() === 'BUY') ? 'BUY' : 'SELL',
        quantity,
        rate,
        gross_amount: gross,
        brokerage: 0,
        stt: 0,
        gst: 0,
        net_amount: gross,
      });
    }
  }

  return trades;
}

function parseMarginStatement(text: string, errors: string[]): ParsedMarginStatement | null {
  try {
    const dateMatch = text.match(/(?:date|as\s+on)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i)
      || text.match(/(\d{2}[-/]\d{2}[-/]\d{4})/);
    const date = dateMatch ? normalizeDate(dateMatch[1]) : new Date().toISOString().split('T')[0];

    const clientIdMatch = text.match(/(?:client\s+id|client\s+code)[:\s]+([A-Z0-9]+)/i);
    const clientId = clientIdMatch ? clientIdMatch[1] : 'UNKNOWN';

    const marginAvailableMatch = text.match(/margin\s+available[:\s]+([\d,.-]+)/i)
      || text.match(/net\s+margin[:\s]+([\d,.-]+)/i);
    const marginAvailable = marginAvailableMatch ? parseFloat(marginAvailableMatch[1].replace(/,/g, '')) : 0;

    const marginUsedMatch = text.match(/margin\s+used[:\s]+([\d,.-]+)/i)
      || text.match(/exposure[:\s]+([\d,.-]+)/i);
    const marginUsed = marginUsedMatch ? parseFloat(marginUsedMatch[1].replace(/,/g, '')) : 0;

    const cashMatch = text.match(/(?:cash\s+balance|ledger\s+balance|cash\s+component)[:\s]+([\d,.-]+)/i);
    const cashComponent = cashMatch ? parseFloat(cashMatch[1].replace(/,/g, '')) : 0;

    const positionsMatch = text.match(/open\s+positions?[:\s]+([\d]+)/i);
    const openPositions = positionsMatch ? parseInt(positionsMatch[1]) : undefined;

    return {
      date,
      client_id: clientId,
      margin_available: marginAvailable,
      margin_used: marginUsed,
      cash_component: cashComponent,
      open_positions: openPositions,
    };
  } catch (err) {
    errors.push(`Failed to parse margin statement: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return null;
  }
}

function normalizeDate(dateStr: string): string {
  const parts = dateStr.split(/[-/]/);
  if (parts.length !== 3) return new Date().toISOString().split('T')[0];

  let day: string, month: string, year: string;

  if (parts[2].length === 4) {
    // DD/MM/YYYY or MM/DD/YYYY — assume DD/MM/YYYY for Indian context
    [day, month, year] = parts;
  } else if (parts[0].length === 4) {
    // YYYY/MM/DD
    [year, month, day] = parts;
  } else {
    // DD/MM/YY
    [day, month, year] = parts;
    year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
  }

  const d = parseInt(day);
  const m = parseInt(month);
  const y = parseInt(year);

  if (isNaN(d) || isNaN(m) || isNaN(y)) return new Date().toISOString().split('T')[0];

  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function extractSymbol(name: string): string {
  // Try to get a short symbol from the name
  const words = name.split(/\s+/);
  if (words.length === 1) return name.toUpperCase().substring(0, 10);
  // Use first meaningful word or acronym
  return words[0].toUpperCase().substring(0, 10);
}
