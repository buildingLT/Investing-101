import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'portfolio.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initializeSchema(db);
  return db;
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_type TEXT NOT NULL CHECK(asset_type IN ('STOCK','MF','FD','INSURANCE','REAL_ESTATE','GOLD','CRYPTO','OTHER')),
      name TEXT NOT NULL,
      symbol TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      avg_buy_price REAL NOT NULL DEFAULT 0,
      current_price REAL NOT NULL DEFAULT 0,
      invested_amount REAL NOT NULL DEFAULT 0,
      current_value REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'INR',
      purchase_date TEXT,
      maturity_date TEXT,
      interest_rate REAL,
      notes TEXT,
      source TEXT NOT NULL DEFAULT 'MANUAL' CHECK(source IN ('GROWW','MANUAL')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      investment_id INTEGER REFERENCES investments(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK(type IN ('BUY','SELL','DIVIDEND','INTEREST','DEPOSIT','WITHDRAWAL')),
      asset_type TEXT NOT NULL CHECK(asset_type IN ('STOCK','MF','FD','INSURANCE','REAL_ESTATE','GOLD','CRYPTO','OTHER')),
      name TEXT NOT NULL,
      symbol TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      charges REAL NOT NULL DEFAULT 0,
      taxes REAL NOT NULL DEFAULT 0,
      net_amount REAL NOT NULL DEFAULT 0,
      exchange TEXT,
      segment TEXT,
      trade_date TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'MANUAL' CHECK(source IN ('GROWW','MANUAL')),
      raw_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS allocation_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_type TEXT NOT NULL UNIQUE CHECK(asset_type IN ('STOCK','MF','FD','INSURANCE','REAL_ESTATE','GOLD','CRYPTO','OTHER')),
      target_percentage REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS investment_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_text TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_investments_asset_type ON investments(asset_type);
    CREATE INDEX IF NOT EXISTS idx_transactions_trade_date ON transactions(trade_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_investment_id ON transactions(investment_id);
  `);

  // Seed default allocation targets if empty
  const count = database.prepare('SELECT COUNT(*) as cnt FROM allocation_targets').get() as { cnt: number };
  if (count.cnt === 0) {
    const assetTypes = ['STOCK', 'MF', 'FD', 'INSURANCE', 'REAL_ESTATE', 'GOLD', 'CRYPTO', 'OTHER'];
    const insert = database.prepare(
      'INSERT INTO allocation_targets (asset_type, target_percentage) VALUES (?, ?)'
    );
    const defaults: Record<string, number> = {
      STOCK: 40,
      MF: 25,
      FD: 15,
      INSURANCE: 5,
      REAL_ESTATE: 5,
      GOLD: 5,
      CRYPTO: 3,
      OTHER: 2,
    };
    for (const at of assetTypes) {
      insert.run(at, defaults[at] || 0);
    }
  }
}

// ---- Investment CRUD ----

export function getAllInvestments(assetType?: string) {
  const db = getDb();
  if (assetType) {
    return db.prepare('SELECT * FROM investments WHERE asset_type = ? ORDER BY name').all(assetType);
  }
  return db.prepare('SELECT * FROM investments ORDER BY asset_type, name').all();
}

export function getInvestmentById(id: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM investments WHERE id = ?').get(id);
}

export function createInvestment(data: Omit<import('@/types').Investment, 'id' | 'created_at' | 'updated_at'>) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO investments (
      asset_type, name, symbol, quantity, avg_buy_price, current_price,
      invested_amount, current_value, currency, purchase_date, maturity_date,
      interest_rate, notes, source
    ) VALUES (
      @asset_type, @name, @symbol, @quantity, @avg_buy_price, @current_price,
      @invested_amount, @current_value, @currency, @purchase_date, @maturity_date,
      @interest_rate, @notes, @source
    )
  `);
  const result = stmt.run(data);
  return result.lastInsertRowid;
}

export function updateInvestment(id: number, data: Partial<import('@/types').Investment>) {
  const db = getDb();
  const fields = Object.keys(data)
    .filter(k => !['id', 'created_at'].includes(k))
    .map(k => `${k} = @${k}`)
    .join(', ');
  if (!fields) return;
  const stmt = db.prepare(`UPDATE investments SET ${fields}, updated_at = datetime('now') WHERE id = @id`);
  stmt.run({ ...data, id });
}

export function deleteInvestment(id: number) {
  const db = getDb();
  db.prepare('DELETE FROM investments WHERE id = ?').run(id);
}

// ---- Transaction CRUD ----

export function createTransaction(data: Omit<import('@/types').Transaction, 'id' | 'created_at'>) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO transactions (
      investment_id, type, asset_type, name, symbol, quantity, price, amount,
      charges, taxes, net_amount, exchange, segment, trade_date, source, raw_data
    ) VALUES (
      @investment_id, @type, @asset_type, @name, @symbol, @quantity, @price, @amount,
      @charges, @taxes, @net_amount, @exchange, @segment, @trade_date, @source, @raw_data
    )
  `);
  const result = stmt.run(data);
  return result.lastInsertRowid;
}

export function getRecentTransactions(limit = 10) {
  const db = getDb();
  return db.prepare('SELECT * FROM transactions ORDER BY trade_date DESC, created_at DESC LIMIT ?').all(limit);
}

export function getAllTransactions() {
  const db = getDb();
  return db.prepare('SELECT * FROM transactions ORDER BY trade_date DESC').all();
}

// ---- Allocation Targets ----

export function getAllocationTargets() {
  const db = getDb();
  return db.prepare('SELECT * FROM allocation_targets ORDER BY asset_type').all();
}

export function upsertAllocationTarget(assetType: string, targetPct: number) {
  const db = getDb();
  db.prepare(`
    INSERT INTO allocation_targets (asset_type, target_percentage)
    VALUES (?, ?)
    ON CONFLICT(asset_type) DO UPDATE SET
      target_percentage = excluded.target_percentage,
      updated_at = datetime('now')
  `).run(assetType, targetPct);
}

// ---- Investment Rules ----

export function getInvestmentRules() {
  const db = getDb();
  return db.prepare('SELECT * FROM investment_rules ORDER BY created_at DESC').all();
}

export function createInvestmentRule(ruleText: string) {
  const db = getDb();
  const result = db.prepare('INSERT INTO investment_rules (rule_text) VALUES (?)').run(ruleText);
  return result.lastInsertRowid;
}

export function deleteInvestmentRule(id: number) {
  const db = getDb();
  db.prepare('DELETE FROM investment_rules WHERE id = ?').run(id);
}

export function toggleInvestmentRule(id: number, isActive: boolean) {
  const db = getDb();
  db.prepare('UPDATE investment_rules SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
}

// ---- Dashboard Aggregates ----

export function getDashboardStats() {
  const db = getDb();

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(invested_amount), 0) as total_invested,
      COALESCE(SUM(current_value), 0) as current_value
    FROM investments
  `).get() as { total_invested: number; current_value: number };

  const byAssetType = db.prepare(`
    SELECT
      asset_type,
      COALESCE(SUM(invested_amount), 0) as invested_amount,
      COALESCE(SUM(current_value), 0) as current_value
    FROM investments
    GROUP BY asset_type
    ORDER BY current_value DESC
  `).all() as { asset_type: string; invested_amount: number; current_value: number }[];

  const recentTransactions = getRecentTransactions(10);

  return { totals, byAssetType, recentTransactions };
}

export default getDb;
