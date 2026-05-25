'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import type { AssetType } from '@/types';
import { ASSET_TYPE_LABELS } from '@/types';

const ASSET_TYPES: AssetType[] = ['STOCK', 'MF', 'FD', 'INSURANCE', 'REAL_ESTATE', 'GOLD', 'CRYPTO', 'OTHER'];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
}: {
  type?: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
    />
  );
}

const EXCHANGES = ['NSE', 'BSE', 'MCX', 'NCDEX'];
const GOLD_FORMS = ['Physical', 'Digital', 'SGB', 'Gold ETF', 'Gold Fund'];

export default function AddInvestmentPage() {
  const router = useRouter();
  const [assetType, setAssetType] = useState<AssetType>('STOCK');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<Record<string, string>>({
    name: '',
    symbol: '',
    quantity: '',
    avg_buy_price: '',
    current_price: '',
    purchase_date: '',
    exchange: 'NSE',
    interest_rate: '',
    maturity_date: '',
    notes: '',
    gold_form: 'Physical',
    expected_yield: '',
    platform: '',
    sum_assured: '',
    premium: '',
  });

  function setField(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function buildPayload() {
    const qty = parseFloat(form.quantity) || 0;
    const avgPrice = parseFloat(form.avg_buy_price) || 0;
    const currPrice = parseFloat(form.current_price) || avgPrice;
    const investedAmount = qty * avgPrice;
    const currentValue = qty * currPrice;

    const base = {
      asset_type: assetType,
      name: form.name,
      symbol: form.symbol || null,
      quantity: qty,
      avg_buy_price: avgPrice,
      current_price: currPrice,
      invested_amount: investedAmount,
      current_value: currentValue,
      currency: 'INR',
      purchase_date: form.purchase_date || null,
      maturity_date: form.maturity_date || null,
      interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
      notes: form.notes || null,
      source: 'MANUAL',
    };

    // Override invested/current for FD and INSURANCE (amount-based)
    if (assetType === 'FD' || assetType === 'INSURANCE') {
      const amount = parseFloat(form.quantity) || 0; // quantity field used as principal amount
      base.invested_amount = amount;
      base.current_value = amount;
      base.avg_buy_price = 1;
      base.current_price = 1;
    }

    if (assetType === 'REAL_ESTATE') {
      const amount = parseFloat(form.quantity) || 0;
      base.invested_amount = amount;
      base.current_value = amount;
      base.notes = [form.platform ? `Platform: ${form.platform}` : null, form.expected_yield ? `Expected yield: ${form.expected_yield}%` : null, form.notes].filter(Boolean).join(' | ') || null;
    }

    if (assetType === 'GOLD') {
      const grams = parseFloat(form.quantity) || 0;
      const pricePerGram = parseFloat(form.avg_buy_price) || 0;
      base.invested_amount = grams * pricePerGram;
      base.current_value = grams * (parseFloat(form.current_price) || pricePerGram);
      base.notes = [form.gold_form ? `Form: ${form.gold_form}` : null, form.notes].filter(Boolean).join(' | ') || null;
    }

    return base;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.push('/holdings');
      }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save investment');
    } finally {
      setSaving(false);
    }
  }

  function renderTypeFields() {
    switch (assetType) {
      case 'STOCK':
      case 'MF':
      case 'CRYPTO':
        return (
          <>
            <Field label="Name *" hint={assetType === 'MF' ? 'e.g. Mirae Asset Large Cap Fund' : assetType === 'CRYPTO' ? 'e.g. Bitcoin' : 'e.g. Reliance Industries'}>
              <Input value={form.name} onChange={v => setField('name', v)} required placeholder="Full name" />
            </Field>
            <Field label="Symbol" hint={assetType === 'MF' ? 'Fund code (optional)' : 'Ticker symbol'}>
              <Input value={form.symbol} onChange={v => setField('symbol', v)} placeholder={assetType === 'STOCK' ? 'RELIANCE' : ''} />
            </Field>
            {assetType === 'STOCK' && (
              <Field label="Exchange">
                <select
                  value={form.exchange}
                  onChange={e => setField('exchange', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {EXCHANGES.map(ex => <option key={ex}>{ex}</option>)}
                </select>
              </Field>
            )}
            <Field label={assetType === 'MF' ? 'Units *' : 'Quantity *'}>
              <Input type="number" value={form.quantity} onChange={v => setField('quantity', v)} required placeholder="0" />
            </Field>
            <Field label={assetType === 'MF' ? 'Purchase NAV (₹) *' : 'Avg Buy Price (₹) *'}>
              <Input type="number" value={form.avg_buy_price} onChange={v => setField('avg_buy_price', v)} required placeholder="0.00" />
            </Field>
            <Field label={assetType === 'MF' ? 'Current NAV (₹)' : 'Current Price (₹)'} hint="Leave blank to use buy price">
              <Input type="number" value={form.current_price} onChange={v => setField('current_price', v)} placeholder="0.00" />
            </Field>
            <Field label="Purchase Date">
              <Input type="date" value={form.purchase_date} onChange={v => setField('purchase_date', v)} />
            </Field>
          </>
        );

      case 'FD':
        return (
          <>
            <Field label="Bank / Institution *">
              <Input value={form.name} onChange={v => setField('name', v)} required placeholder="e.g. HDFC Bank" />
            </Field>
            <Field label="Principal Amount (₹) *">
              <Input type="number" value={form.quantity} onChange={v => setField('quantity', v)} required placeholder="100000" />
            </Field>
            <Field label="Interest Rate (% p.a.) *">
              <Input type="number" value={form.interest_rate} onChange={v => setField('interest_rate', v)} required placeholder="7.5" />
            </Field>
            <Field label="Start Date">
              <Input type="date" value={form.purchase_date} onChange={v => setField('purchase_date', v)} />
            </Field>
            <Field label="Maturity Date">
              <Input type="date" value={form.maturity_date} onChange={v => setField('maturity_date', v)} />
            </Field>
          </>
        );

      case 'INSURANCE':
        return (
          <>
            <Field label="Policy Name *">
              <Input value={form.name} onChange={v => setField('name', v)} required placeholder="e.g. LIC Jeevan Anand" />
            </Field>
            <Field label="Annual Premium (₹) *">
              <Input type="number" value={form.quantity} onChange={v => setField('quantity', v)} required placeholder="50000" />
            </Field>
            <Field label="Sum Assured (₹)">
              <Input type="number" value={form.sum_assured} onChange={v => setField('sum_assured', v)} placeholder="1000000" />
            </Field>
            <Field label="Start Date">
              <Input type="date" value={form.purchase_date} onChange={v => setField('purchase_date', v)} />
            </Field>
            <Field label="Maturity Date">
              <Input type="date" value={form.maturity_date} onChange={v => setField('maturity_date', v)} />
            </Field>
          </>
        );

      case 'REAL_ESTATE':
        return (
          <>
            <Field label="Property / Platform Name *">
              <Input value={form.name} onChange={v => setField('name', v)} required placeholder="e.g. StREIT Office Space Bengaluru" />
            </Field>
            <Field label="Platform" hint="For fractional real estate, e.g. hBits, PropertyShare, StREIT">
              <Input value={form.platform} onChange={v => setField('platform', v)} placeholder="e.g. hBits" />
            </Field>
            <Field label="Amount Invested (₹) *">
              <Input type="number" value={form.quantity} onChange={v => setField('quantity', v)} required placeholder="100000" />
            </Field>
            <Field label="Expected Yield (% p.a.)">
              <Input type="number" value={form.expected_yield} onChange={v => setField('expected_yield', v)} placeholder="8.5" />
            </Field>
            <Field label="Investment Date">
              <Input type="date" value={form.purchase_date} onChange={v => setField('purchase_date', v)} />
            </Field>
          </>
        );

      case 'GOLD':
        return (
          <>
            <Field label="Gold Description *" hint="e.g. 24K Gold Bar, Sovereign Gold Bond 2024">
              <Input value={form.name} onChange={v => setField('name', v)} required placeholder="Description" />
            </Field>
            <Field label="Form">
              <select
                value={form.gold_form}
                onChange={e => setField('gold_form', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {GOLD_FORMS.map(f => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Quantity (grams) *">
              <Input type="number" value={form.quantity} onChange={v => setField('quantity', v)} required placeholder="10" />
            </Field>
            <Field label="Purchase Price per Gram (₹) *">
              <Input type="number" value={form.avg_buy_price} onChange={v => setField('avg_buy_price', v)} required placeholder="6000" />
            </Field>
            <Field label="Current Price per Gram (₹)" hint="Leave blank to use purchase price">
              <Input type="number" value={form.current_price} onChange={v => setField('current_price', v)} placeholder="6500" />
            </Field>
            <Field label="Purchase Date">
              <Input type="date" value={form.purchase_date} onChange={v => setField('purchase_date', v)} />
            </Field>
          </>
        );

      case 'OTHER':
      default:
        return (
          <>
            <Field label="Name *">
              <Input value={form.name} onChange={v => setField('name', v)} required placeholder="Investment name" />
            </Field>
            <Field label="Quantity *">
              <Input type="number" value={form.quantity} onChange={v => setField('quantity', v)} required placeholder="1" />
            </Field>
            <Field label="Avg Buy Price (₹) *">
              <Input type="number" value={form.avg_buy_price} onChange={v => setField('avg_buy_price', v)} required placeholder="0.00" />
            </Field>
            <Field label="Current Price (₹)" hint="Leave blank to use buy price">
              <Input type="number" value={form.current_price} onChange={v => setField('current_price', v)} placeholder="0.00" />
            </Field>
            <Field label="Purchase Date">
              <Input type="date" value={form.purchase_date} onChange={v => setField('purchase_date', v)} />
            </Field>
          </>
        );
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Add Investment</h1>
        <p className="text-slate-500 text-sm mt-1">Manually add any investment to your portfolio</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-emerald-800 font-medium">Investment added successfully! Redirecting...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Asset Type Selector */}
        <Field label="Asset Type *">
          <div className="grid grid-cols-4 gap-2">
            {ASSET_TYPES.map(at => (
              <button
                key={at}
                type="button"
                onClick={() => { setAssetType(at); setForm(f => ({ ...f, name: '', symbol: '' })); }}
                className={`text-xs font-medium py-2 px-2 rounded-lg border transition-colors ${
                  assetType === at
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {ASSET_TYPE_LABELS[at]}
              </button>
            ))}
          </div>
        </Field>

        <hr className="border-slate-100" />

        {/* Dynamic fields */}
        {renderTypeFields()}

        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            rows={2}
            placeholder="Any additional notes..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <button
          type="submit"
          disabled={saving || success}
          className="w-full bg-brand-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Add Investment'}
        </button>
      </form>
    </div>
  );
}
