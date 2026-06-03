/**
 * One-time script to seed your actual Groww portfolio into the app.
 * Run: npm run seed-portfolio
 * Make sure `npm run dev` is running first (needs the API on port 4000).
 */

const BASE = 'http://localhost:4000';

const investments = [
  // ── STOCKS ──────────────────────────────────────────────────────────
  {
    asset_type: 'STOCK', name: 'SILVERBEES', symbol: 'SILVERBEES',
    quantity: 24, avg_buy_price: 232.50, current_price: 246.79,
    invested_amount: 5580.00, current_value: 5922.96,
    currency: 'INR', source: 'GROWW', notes: 'Silver ETF — NSE',
  },
  {
    asset_type: 'STOCK', name: 'Hero MotoCorp', symbol: 'HEROMOTOCO',
    quantity: 1, avg_buy_price: 5673.00, current_price: 4840.90,
    invested_amount: 5673.00, current_value: 4840.90,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'TATSILV', symbol: 'TATSILV',
    quantity: 164, avg_buy_price: 24.18, current_price: 25.03,
    invested_amount: 3965.52, current_value: 4104.92,
    currency: 'INR', source: 'GROWW', notes: 'Tata Silver ETF',
  },
  {
    asset_type: 'STOCK', name: 'Coal India', symbol: 'COALINDIA',
    quantity: 4, avg_buy_price: 416.65, current_price: 472.30,
    invested_amount: 1666.60, current_value: 1889.20,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'Power Grid Corp', symbol: 'POWERGRID',
    quantity: 6, avg_buy_price: 299.40, current_price: 285.05,
    invested_amount: 1796.40, current_value: 1710.30,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'Reliance Industries', symbol: 'RELIANCE',
    quantity: 1, avg_buy_price: 1336.00, current_price: 1313.20,
    invested_amount: 1336.00, current_value: 1313.20,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'SBI', symbol: 'SBIN',
    quantity: 1, avg_buy_price: 956.90, current_price: 970.45,
    invested_amount: 956.90, current_value: 970.45,
    currency: 'INR', source: 'GROWW', notes: null,
  },
  {
    asset_type: 'STOCK', name: 'NLC India', symbol: 'NLCINDIA',
    quantity: 1, avg_buy_price: 351.55, current_price: 346.00,
    invested_amount: 351.55, current_value: 346.00,
    currency: 'INR', source: 'GROWW', notes: null,
  },

  // ── MUTUAL FUNDS ──────────────────────────────────────────────────────
  {
    asset_type: 'MF', name: 'SBI Gold Direct Plan Growth', symbol: 'SBIGOLD',
    quantity: 1, avg_buy_price: 10000, current_price: 10590,
    invested_amount: 10000, current_value: 10590,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Commodity/Gold',
  },
  {
    asset_type: 'MF', name: 'ICICI Prudential Gold ETF FoF Direct Growth', symbol: 'ICICIGOLDETF',
    quantity: 1, avg_buy_price: 6000, current_price: 6208,
    invested_amount: 6000, current_value: 6208,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Gold ETF FoF',
  },
  {
    asset_type: 'MF', name: 'Parag Parikh Flexi Cap Fund Direct Growth', symbol: 'PPFCF',
    quantity: 1, avg_buy_price: 4000, current_price: 3906,
    invested_amount: 4000, current_value: 3906,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Flexi Cap',
  },
  {
    asset_type: 'MF', name: 'Motilal Oswal Flexi Cap Fund Direct Growth', symbol: 'MOFLEXI',
    quantity: 1, avg_buy_price: 3000, current_price: 3028,
    invested_amount: 3000, current_value: 3028,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Flexi Cap',
  },
  {
    asset_type: 'MF', name: 'Motilal Oswal Midcap Fund Direct Growth', symbol: 'MOMIDCAP',
    quantity: 1, avg_buy_price: 2000, current_price: 2013,
    invested_amount: 2000, current_value: 2013,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Mid Cap',
  },
  {
    asset_type: 'MF', name: 'Mirae Asset Healthcare Fund Direct Growth', symbol: 'MIRAEHC',
    quantity: 1, avg_buy_price: 2000, current_price: 1991,
    invested_amount: 2000, current_value: 1991,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Healthcare Sector',
  },
  {
    asset_type: 'MF', name: 'UTI Nifty 50 Index Fund Direct Growth', symbol: 'UTINIFTY50',
    quantity: 1, avg_buy_price: 1500, current_price: 1506,
    invested_amount: 1500, current_value: 1506,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Index/Passive',
  },
  {
    asset_type: 'MF', name: 'DSP Natural Resources and New Energy Fund Direct', symbol: 'DSPNRE',
    quantity: 1, avg_buy_price: 1500, current_price: 1501,
    invested_amount: 1500, current_value: 1501,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Natural Resources/Energy Sector',
  },
  {
    asset_type: 'MF', name: 'Nippon India Large Cap Fund Direct Growth', symbol: 'NIPPONLC',
    quantity: 1, avg_buy_price: 1000, current_price: 1058,
    invested_amount: 1000, current_value: 1058,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Large Cap',
  },
  {
    asset_type: 'MF', name: 'Tata India Consumer Fund Direct Growth', symbol: 'TATACONSUMER',
    quantity: 1, avg_buy_price: 1000, current_price: 1005,
    invested_amount: 1000, current_value: 1005,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Consumer Sector',
  },
  {
    asset_type: 'MF', name: 'SBI ELSS Tax Saver Fund Direct Growth', symbol: 'SBIELSS',
    quantity: 1, avg_buy_price: 1000, current_price: 1002,
    invested_amount: 1000, current_value: 1002,
    currency: 'INR', source: 'GROWW', notes: 'SIP — ELSS/Tax Saving',
  },
  {
    asset_type: 'MF', name: 'Invesco India Financial Services Fund Direct', symbol: 'INVESCOFIN',
    quantity: 1, avg_buy_price: 1000, current_price: 998,
    invested_amount: 1000, current_value: 998,
    currency: 'INR', source: 'GROWW', notes: 'SIP — Financial Services Sector',
  },
];

async function seed() {
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
