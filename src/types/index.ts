export type AssetType =
  | 'STOCK'
  | 'MF'
  | 'FD'
  | 'INSURANCE'
  | 'REAL_ESTATE'
  | 'GOLD'
  | 'CRYPTO'
  | 'OTHER';

export type TransactionType =
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'INTEREST'
  | 'DEPOSIT'
  | 'WITHDRAWAL';

export type InvestmentSource = 'GROWW' | 'MANUAL';

export interface Investment {
  id: number;
  asset_type: AssetType;
  name: string;
  symbol: string | null;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  invested_amount: number;
  current_value: number;
  currency: string;
  purchase_date: string | null;
  maturity_date: string | null;
  interest_rate: number | null;
  notes: string | null;
  source: InvestmentSource;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  investment_id: number | null;
  type: TransactionType;
  asset_type: AssetType;
  name: string;
  symbol: string | null;
  quantity: number;
  price: number;
  amount: number;
  charges: number;
  taxes: number;
  net_amount: number;
  exchange: string | null;
  segment: string | null;
  trade_date: string;
  source: InvestmentSource;
  raw_data: string | null;
  created_at: string;
}

export interface AllocationTarget {
  id: number;
  asset_type: AssetType;
  target_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface InvestmentRule {
  id: number;
  rule_text: string;
  is_active: number;
  created_at: string;
}

export interface DashboardData {
  total_invested: number;
  current_value: number;
  total_pnl: number;
  pnl_pct: number;
  by_asset_type: AssetBreakdown[];
  recent_transactions: Transaction[];
}

export interface AssetBreakdown {
  asset_type: AssetType;
  invested_amount: number;
  current_value: number;
  pnl: number;
  pnl_pct: number;
  allocation_pct: number;
}

export interface AllocationComparison {
  asset_type: AssetType;
  target_pct: number;
  actual_pct: number;
  deviation: number;
  current_value: number;
  rebalance_amount: number;
}

export interface ParsedTrade {
  trade_date: string;
  name: string;
  symbol: string;
  isin?: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  rate: number;
  gross_amount: number;
  brokerage: number;
  stt: number;
  gst: number;
  net_amount: number;
  exchange?: string;
  segment?: string;
}

export interface ParsedMarginStatement {
  date: string;
  client_id: string;
  margin_available: number;
  margin_used: number;
  cash_component: number;
  open_positions?: number;
}

export interface PDFParseResult {
  document_type: 'CONTRACT_NOTE' | 'MARGIN_STATEMENT' | 'UNKNOWN';
  trades?: ParsedTrade[];
  margin_statement?: ParsedMarginStatement;
  raw_text: string;
  parse_errors: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  STOCK: 'Stocks',
  MF: 'Mutual Funds',
  FD: 'Fixed Deposits',
  INSURANCE: 'Insurance',
  REAL_ESTATE: 'Real Estate',
  GOLD: 'Gold',
  CRYPTO: 'Crypto',
  OTHER: 'Other',
};

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  STOCK: '#4f6ef7',
  MF: '#10b981',
  FD: '#f59e0b',
  INSURANCE: '#8b5cf6',
  REAL_ESTATE: '#ef4444',
  GOLD: '#eab308',
  CRYPTO: '#06b6d4',
  OTHER: '#6b7280',
};
