/**
 * One-time script to seed your actual Groww portfolio into the app.
 * Run: npm run seed-portfolio
 * Make sure `npm run dev` is running first (needs the API on port 4000).
 *
 * Data below reflects the live Groww "Holdings" (Stocks) and "Investments"
 * (Mutual Funds) exports as of 27 Aug 2026. Re-running this script clears out
 * any existing GROWW-sourced rows first, so it's safe to run again whenever
 * you want to resync from a fresh export.
 */

const BASE = 'http://localhost:4000';

const investments = [
  // ── STOCKS (15 holdings) ────────────────────────────────────────────
  {
    asset_type: 'STOCK', name: 'SILVERBEES', symbol: 'SILVERBEES',
    quantity: 24, avg_buy_price: 232.50, current_price: 230.13,
    invested_amount: 5580.00, current_value: 5523.12,
    currency: 'INR', source: 'GROWW', notes: 'Silver ETF — NSE',
  },
  {
    asset_type: 'STOCK', name: 'Hero MotoCorp', symbol: 'HEROMOTOCO',
    quantity: 1, avg_buy_price: 5673.00, current_price: 5595.00,
    invested_amount: 5673.00, current_value: 5595.00,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'TATSILV', symbol: 'TATSILV',
    quantity: 206, avg_buy_price: 24.05, current_price: 23.36,
    invested_amount: 4954.30, current_value: 4812.16,
    currency: 'INR', source: 'GROWW', notes: 'Tata Silver ETF',
  },
  {
    asset_type: 'STOCK', name: 'Coal India', symbol: 'COALINDIA',
    quantity: 4, avg_buy_price: 416.65, current_price: 403.50,
    invested_amount: 1666.60, current_value: 1614.00,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'Power Grid Corp', symbol: 'POWERGRID',
    quantity: 10, avg_buy_price: 293.85, current_price: 265.20,
    invested_amount: 2938.50, current_value: 2652.00,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'Reliance Industries', symbol: 'RELIANCE',
    quantity: 1, avg_buy_price: 1336.00, current_price: 1298.00,
    invested_amount: 1336.00, current_value: 1298.00,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'SBI', symbol: 'SBIN',
    quantity: 1, avg_buy_price: 956.90, current_price: 1052.00,
    invested_amount: 956.90, current_value: 1052.00,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'NLC India', symbol: 'NLCINDIA',
    quantity: 1, avg_buy_price: 351.55, current_price: 271.40,
    invested_amount: 351.55, current_value: 271.40,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'HDFC Bank', symbol: 'HDFCBANK',
    quantity: 2, avg_buy_price: 789.60, current_price: 727.20,
    invested_amount: 1579.20, current_value: 1454.40,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'ITC', symbol: 'ITC',
    quantity: 2, avg_buy_price: 284.45, current_price: 270.25,
    invested_amount: 568.90, current_value: 540.50,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'Bharat Electronics', symbol: 'BEL',
    quantity: 2, avg_buy_price: 417.65, current_price: 406.90,
    invested_amount: 835.30, current_value: 813.80,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'SBI Funds Management', symbol: 'SBIFUNDS',
    quantity: 26, avg_buy_price: 574.00, current_price: 563.45,
    invested_amount: 14924.00, current_value: 14649.70,
    currency: 'INR', source: 'GROWW', notes: 'AMC stock',
  },
  {
    asset_type: 'STOCK', name: 'Central Depository Services', symbol: 'CDSL',
    quantity: 2, avg_buy_price: 1290.35, current_price: 1434.00,
    invested_amount: 2580.70, current_value: 2868.00,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'Eternal (Zomato)', symbol: 'ETERNAL',
    quantity: 4, avg_buy_price: 269.48, current_price: 327.00,
    invested_amount: 1077.92, current_value: 1308.00,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'Mirae Asset NYSE FANG+ ETF', symbol: 'MAFANG',
    quantity: 5, avg_buy_price: 194.20, current_price: 205.29,
    invested_amount: 971.00, current_value: 1026.45,
    currency: 'INR', source: 'GROWW', notes: 'International ETF',
  },

  // ── MUTUAL FUNDS (12 SIPs) ────────────────────────────────────────────
  {
    asset_type: 'MF', name: 'SBI Gold Direct Plan Growth', symbol: 'SBIGOLD',
    quantity: 1, avg_buy_price: 11997, current_price: 13109,
    invested_amount: 11997, current_value: 13109,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Commodity/Gold',
  },
  {
    asset_type: 'MF', name: 'ICICI Prudential Gold ETF FoF Direct Growth', symbol: 'ICICIGOLDETF',
    quantity: 1, avg_buy_price: 6000, current_price: 6388,
    invested_amount: 6000, current_value: 6388,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Gold ETF FoF',
  },
  {
    asset_type: 'MF', name: 'Parag Parikh Flexi Cap Fund Direct Growth', symbol: 'PPFCF',
    quantity: 1, avg_buy_price: 6000, current_price: 5959,
    invested_amount: 6000, current_value: 5959,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Flexi Cap',
  },
  {
    asset_type: 'MF', name: 'Motilal Oswal Flexi Cap Fund Direct Growth', symbol: 'MOFLEXI',
    quantity: 1, avg_buy_price: 6000, current_price: 6702,
    invested_amount: 6000, current_value: 6702,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Flexi Cap',
  },
  {
    asset_type: 'MF', name: 'Motilal Oswal Midcap Fund Direct Growth', symbol: 'MOMIDCAP',
    quantity: 1, avg_buy_price: 4000, current_price: 4570,
    invested_amount: 4000, current_value: 4570,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Mid Cap',
  },
  {
    asset_type: 'MF', name: 'Mirae Asset Healthcare Fund Direct Growth', symbol: 'MIRAEHC',
    quantity: 1, avg_buy_price: 4000, current_price: 4296,
    invested_amount: 4000, current_value: 4296,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Healthcare Sector',
  },
  {
    asset_type: 'MF', name: 'UTI Nifty 50 Index Fund Direct Growth', symbol: 'UTINIFTY50',
    quantity: 1, avg_buy_price: 3000, current_price: 3053,
    invested_amount: 3000, current_value: 3053,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Index/Passive',
  },
  {
    asset_type: 'MF', name: 'DSP Natural Resources and New Energy Fund Direct', symbol: 'DSPNRE',
    quantity: 1, avg_buy_price: 3000, current_price: 3035,
    invested_amount: 3000, current_value: 3035,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Natural Resources/Energy Sector',
  },
  {
    asset_type: 'MF', name: 'Nippon India Large Cap Fund Direct Growth', symbol: 'NIPPONLC',
    quantity: 1, avg_buy_price: 1000, current_price: 1103,
    invested_amount: 1000, current_value: 1103,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Large Cap',
  },
  {
    asset_type: 'MF', name: 'Tata India Consumer Fund Direct Growth', symbol: 'TATACONSUMER',
    quantity: 1, avg_buy_price: 2000, current_price: 2176,
    invested_amount: 2000, current_value: 2176,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Consumer Sector',
  },
  {
    asset_type: 'MF', name: 'SBI ELSS Tax Saver Fund Direct Growth', symbol: 'SBIELSS',
    quantity: 1, avg_buy_price: 2000, current_price: 2025,
    invested_amount: 2000, current_value: 2025,
    currency: 'INR', source: 'GROWW', notes: 'SIP — ELSS/Tax Saving',
  },
  {
    asset_type: 'MF', name: 'Invesco India Financial Services Fund Direct', symbol: 'INVESCOFIN',
    quantity: 1, avg_buy_price: 2000, current_price: 2081,
    invested_amount: 2000, current_value: 2081,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Financial Services Sector',
  },
];

async function clearExistingGrowwHoldings() {
  const res = await fetch(`${BASE}/api/investments`);
  if (!res.ok) return;
  const existing: { id: number; source: string }[] = await res.json();
  const growwRows = existing.filter(inv => inv.source === 'GROWW');

  if (growwRows.length === 0) return;

  console.log(`Clearing ${growwRows.length} existing GROWW-sourced row(s) before resync…`);
  for (const row of growwRows) {
    await fetch(`${BASE}/api/investments/${row.id}`, { method: 'DELETE' });
  }
}

async function seed() {
  await clearExistingGrowwHoldings();

  console.log(`Seeding ${investments.length} holdings into portfolio…\n`);

  const res = await fetch(`${BASE}/api/investments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(investments),
  });

  if (!res.ok) {
    console.error('Failed:', await res.text());
    process.exit(1);
  }

  const data = await res.json();
  console.log(`✓ Seeded ${data.ids?.length ?? 0} investments successfully.`);
  console.log('Open http://localhost:4000 to see your dashboard.');
}

seed();
