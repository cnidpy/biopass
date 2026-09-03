import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';
import { QrCode, CheckCircle2, Loader2, RefreshCw, Smartphone, AlertTriangle } from 'lucide-react';

interface BotStatus {
  connected: boolean;
  connecting?: boolean;
  qrCode?: string | null;
  reconnectAttempts?: number;
  gaveUp?: boolean;
  lastError?: string | null;
}

export const BotConnect: React.FC = () => {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const timer = useRef<number | null>(null);

  const poll = useCallback(async () => {
    try {
      const { data } = await api.get('/bot/status');
      setStatus(data);
    } catch {
      setStatus({ connected: false, lastError: 'No se pudo consultar el estado del bot.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    poll();
    timer.current = window.setInterval(poll, 3000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [poll]);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await api.post('/bot/reconnect', {});
      await poll();
    } finally {
      setReconnecting(false);
    }
  };

  const connected = status?.connected;
  const gaveUp = status?.gaveUp;
  const qr = status?.qrCode;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Smartphone className="w-8 h-8 text-emerald-400" />
          Vincular Bot de WhatsApp
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          El motor Baileys necesita vincularse una sola vez a un número de WhatsApp. Ese número
          envía los OTP de acceso, las alertas de escaneo y atiende el onboarding conversacional.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" /> Consultando estado…
          </div>
        ) : connected ? (
          <div className="text-center py-10">
            <div className="inline-flex p-4 rounded-2xl bg-emerald-500/15 text-emerald-400 mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-white">Bot conectado</h2>
            <p className="mt-1 text-sm text-slate-400">
              El número está vinculado y operativo. Los OTP y alertas ya salen por WhatsApp.
            </p>
          </div>
        ) : gaveUp ? (
          <div className="text-center py-8">
            <div className="inline-flex p-4 rounded-2xl bg-amber-500/15 text-amber-400 mb-4">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-white">El bot dejó de reintentar</h2>
            <p className="mt-1 text-sm text-slate-400 max-w-sm mx-auto">
              Se agotaron los intentos de reconexión automática
              {status?.lastError ? ` (${status.lastError})` : ''}. Pulsá para generar un QR nuevo.
            </p>
            <button
              onClick={handleReconnect}
              disabled={reconnecting}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-rose-600/30"
            >
              {reconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Reintentar conexión
            </button>
          </div>
        ) : qr ? (
          <div className="text-center">
            <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-rose-400" /> Escaneá este código
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              WhatsApp → <strong>Dispositivos vinculados</strong> → <strong>Vincular un dispositivo</strong>
            </p>
            <div className="mt-5 inline-block bg-white p-4 rounded-2xl">
              <img src={qr} alt="QR de vinculación de WhatsApp" className="w-56 h-56" />
            </div>
            <p className="mt-4 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              El código se refresca solo. Intentos: {status?.reconnectAttempts ?? 0}
            </p>
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="inline-flex p-4 rounded-2xl bg-slate-800 text-slate-400 mb-4">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-white">Generando código de vinculación…</h2>
            <p className="mt-1 text-sm text-slate-400">Esperá unos segundos.</p>
            <button
              onClick={handleReconnect}
              disabled={reconnecting}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              {reconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Forzar
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400 leading-relaxed">
        <strong className="text-slate-300">Nota:</strong> mientras el bot no esté vinculado, los OTP se
        registran en el log del servidor y (en desarrollo) se autocompletan en el login para poder probar.
      </div>
    </div>
  );
};
