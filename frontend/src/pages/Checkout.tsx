import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import {
  CreditCard,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  QrCode,
  Landmark,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface Order {
  referenceCode: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
  gateway: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  formattedAmount: string;
  plan?: string;
  aliasInfo?: string | null;
  pixPayload?: string | null;
  pixQrImage?: string | null;
  pixKey?: string;
  externalRedirect?: string;
  expiresAt?: string | null;
  customerName?: string | null;
}

const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label = 'Copiar' }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* noop */
        }
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
    >
      {done ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? 'Copiado' : label}
    </button>
  );
};

export const Checkout: React.FC = () => {
  const [params] = useSearchParams();
  const ref = params.get('ref') || '';
  const returnStatus = params.get('status'); // success | pending | cancel | error (from Bancard)

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const poll = useRef<number | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!ref) {
      setError('Falta el código de referencia (?ref=...).');
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get(`/payments/${encodeURIComponent(ref)}`);
      setOrder(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se encontró la orden de pago.');
    } finally {
      setLoading(false);
    }
  }, [ref]);

  useEffect(() => {
    fetchOrder();
    poll.current = window.setInterval(fetchOrder, 4000);
    return () => {
      if (poll.current) window.clearInterval(poll.current);
    };
  }, [fetchOrder]);

  useEffect(() => {
    if (order?.status === 'PAID' && poll.current) window.clearInterval(poll.current);
  }, [order?.status]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-white">Orden no disponible</h1>
          <p className="mt-1 text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  const isPY = order.currency === 'PYG';
  const paid = order.status === 'PAID';

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="text-center">
        <div className="inline-flex p-3 rounded-2xl bg-rose-500/10 text-rose-400 mb-3">
          <CreditCard className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Pago de tu Bio-Pass</h1>
        <p className="text-xs text-slate-400 mt-1">
          Ref <span className="font-mono text-slate-300">{order.referenceCode}</span>
          {order.customerName ? ` · ${order.customerName}` : ''}
        </p>
      </div>

      {returnStatus === 'cancel' && !paid && (
        <div className="rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 p-3 text-center">
          Cancelaste el pago en la pasarela. Podés reintentar abajo.
        </div>
      )}
      {returnStatus === 'error' && !paid && (
        <div className="rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 p-3 text-center">
          Hubo un problema al confirmar con la pasarela. Si ya pagaste, se acreditará en unos minutos.
        </div>
      )}

      {/* Amount card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              {order.plan === 'ANNUAL' ? 'Plan Anual' : order.plan === 'MONTHLY' ? 'Plan Mensual' : 'Bio-Pass'}
            </p>
            <p className="text-3xl font-black text-white mt-1">{order.formattedAmount}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              paid
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {paid ? 'PAGADO' : 'PENDIENTE'}
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-500">Método: {order.paymentMethod}</p>
      </div>

      {paid ? (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.06] p-8 text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white">¡Pago confirmado!</h2>
          <p className="mt-1 text-sm text-slate-300">
            Tu Bio-Pass está activo. Te enviamos el comprobante y el kit de stickers por WhatsApp.
          </p>
          <Link
            to="/dashboard"
            className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-600/30"
          >
            Ir a mi panel <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Bancard / external redirect */}
          {order.externalRedirect && (
            <a
              href={order.externalRedirect}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30 transition-all hover:scale-[1.01]"
            >
              <CreditCard className="w-5 h-5" /> Pagar con {isPY ? 'Bancard / Tarjeta / QR' : 'la pasarela'}
            </a>
          )}

          {/* PIX (Brasil) */}
          {order.pixPayload && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-rose-400" /> Pagá con PIX
              </h3>
              {order.pixQrImage && (
                <div className="bg-white p-3 rounded-2xl w-fit mx-auto">
                  <img src={order.pixQrImage} alt="QR PIX" className="w-52 h-52" />
                </div>
              )}
              <div>
                <p className="text-[11px] text-slate-400 mb-1">PIX copia e cola</p>
                <div className="flex items-start gap-2">
                  <code className="flex-1 text-[10px] break-all bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300">
                    {order.pixPayload}
                  </code>
                </div>
                <div className="mt-2">
                  <CopyButton text={order.pixPayload} label="Copiar código PIX" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Chave: <span className="font-mono">{order.pixKey}</span>. La confirmación es automática.
              </p>
            </div>
          )}

          {/* Alias / transfer (Paraguay) */}
          {order.aliasInfo && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-400" /> Transferencia / Tigo Money
              </h3>
              <pre className="text-xs whitespace-pre-wrap bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 font-mono">
                {order.aliasInfo}
              </pre>
              <div className="flex items-center gap-2">
                <CopyButton text={order.aliasInfo} label="Copiar datos" />
                <span className="text-[11px] text-slate-500">
                  Enviá el comprobante a soporte para acreditación manual si no usás Bancard.
                </span>
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Esperando confirmación del pago…
          </p>

          {import.meta.env.DEV && (
            <button
              onClick={async () => {
                await api.post(`/payments/${encodeURIComponent(order.referenceCode)}/dev-confirm`, {}).catch(() => {});
                fetchOrder();
              }}
              className="w-full py-2.5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/10 transition-colors"
            >
              🧪 Simular pago (solo desarrollo)
            </button>
          )}
        </>
      )}

      <p className="text-center text-[11px] text-slate-600 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5" /> Pago procesado de forma segura · Doorway Cortex
      </p>
    </div>
  );
};
