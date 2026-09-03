import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { CreditCard, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

type Country = 'PARAGUAY' | 'BRASIL';
type Plan = 'MONTHLY' | 'ANNUAL';

export const Payments: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<Country>('PARAGUAY');
  const [plan, setPlan] = useState<Plan>('ANNUAL');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/auth/profile')
      .then((r) => setUser(r.data.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generate = async () => {
    setCreating(true);
    setError(null);
    try {
      const { data } = await api.post('/payments/create-order', {
        userId: user?.id,
        plan,
        country,
        isFine: user?.status === 'CANCELLED',
      });
      navigate(`/checkout?ref=${encodeURIComponent(data.referenceCode)}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'No se pudo generar la orden.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
      </div>
    );
  }

  const plans = {
    PARAGUAY: {
      flag: '🇵🇾',
      annual: 'Gs. 300.000 / año',
      monthly: 'Gs. 35.000 / mes',
      methods: ['Bancard · Tarjetas · QR', 'Transferencia SIPAP / Alias BIOPASS.PY', 'Tigo Money'],
    },
    BRASIL: {
      flag: '🇧🇷',
      annual: 'R$ 220,00 / ano',
      monthly: 'R$ 25,00 / mês',
      methods: ['PIX Instantâneo (Copia e Cola + QR)', 'Cartão de Crédito e Débito'],
    },
  }[country];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-rose-500" />
          Suscripción y Pagos
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Paraguay (Bancard / SIPAP / Tigo Money) y Brasil (PIX / Cartão).
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Estado del servicio</span>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-xl font-black text-white">{user?.fullName || 'Titular Bio-Pass'}</h2>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              {user?.status || 'ACTIVO'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Renovación con alertas D‑5 / D0 / D+3 / D+4 y purgado a D+30.</p>
        </div>
      </div>

      {/* Country toggle */}
      <div className="grid grid-cols-2 gap-3">
        {(['PARAGUAY', 'BRASIL'] as Country[]).map((c) => (
          <button
            key={c}
            onClick={() => setCountry(c)}
            className={`rounded-2xl border-2 p-4 text-left transition-all ${
              country === c ? 'border-rose-500 bg-rose-950/10' : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-2xl">{c === 'PARAGUAY' ? '🇵🇾' : '🇧🇷'}</span>
            <p className="mt-1 text-sm font-bold text-white">{c === 'PARAGUAY' ? 'Paraguay' : 'Brasil'}</p>
          </button>
        ))}
      </div>

      {/* Plan toggle */}
      <div className="grid grid-cols-2 gap-3">
        {(['ANNUAL', 'MONTHLY'] as Plan[]).map((p) => (
          <button
            key={p}
            onClick={() => setPlan(p)}
            className={`rounded-2xl border-2 p-5 text-left transition-all ${
              plan === p ? 'border-rose-500 bg-rose-950/10' : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {p === 'ANNUAL' ? 'Plan Anual' : 'Plan Mensual'}
            </p>
            <p className="mt-1 text-2xl font-black text-rose-500">
              {p === 'ANNUAL' ? plans.annual : plans.monthly}
            </p>
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-sm font-bold text-white mb-3">{plans.flag} Métodos disponibles</h3>
        <ul className="space-y-2 text-xs text-slate-300">
          {plans.methods.map((m) => (
            <li key={m} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {m}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 p-3 text-center">
          {error}
        </div>
      )}

      <button
        onClick={generate}
        disabled={creating}
        className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
      >
        {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Generar orden e ir al pago <ArrowRight className="w-5 h-5" /></>}
      </button>
    </div>
  );
};
