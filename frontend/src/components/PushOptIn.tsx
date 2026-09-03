import React, { useEffect, useState } from 'react';
import { BellRing, BellOff, Bell, Loader2, Check, AlertTriangle } from 'lucide-react';
import {
  getPushState,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPush,
  type PushState,
} from '../utils/push';

/**
 * Opt-in card for browser push notifications. Emergency scans then arrive as a
 * push alert on every device where the user accepted, on top of the WhatsApp message.
 */
export const PushOptIn: React.FC = () => {
  const [state, setState] = useState<PushState | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('error'));
  }, []);

  if (state === 'loading') {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex items-center gap-3 text-sm text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Comprobando notificaciones…
      </div>
    );
  }

  if (state === 'unsupported' || state === 'server-disabled') {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex items-center gap-3 text-xs text-slate-500">
        <BellOff className="w-4 h-4 shrink-0" />
        {state === 'unsupported'
          ? 'Este navegador no soporta notificaciones push.'
          : 'El servidor no tiene Web Push configurado (claves VAPID).'}
      </div>
    );
  }

  const handleEnable = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const next = await subscribeToPush();
      setState(next);
      if (next === 'denied') setNotice('Bloqueaste las notificaciones. Habilitalas desde los ajustes del navegador.');
      if (next === 'subscribed') setNotice('Listo. Te avisaremos aquí ante cada escaneo de emergencia.');
    } catch {
      setNotice('No se pudo activar. Intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await unsubscribeFromPush();
      setState('default');
      setNotice('Notificaciones desactivadas en este dispositivo.');
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const { sent } = await sendTestPush();
      setNotice(sent > 0 ? 'Enviamos una notificación de prueba.' : 'No hay dispositivos suscritos para este usuario.');
    } catch {
      setNotice('No se pudo enviar la prueba.');
    } finally {
      setBusy(false);
    }
  };

  const subscribed = state === 'subscribed';
  const denied = state === 'denied';

  return (
    <div
      className={`rounded-2xl border p-5 ${
        subscribed
          ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2.5 rounded-xl shrink-0 ${
            subscribed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}
        >
          {subscribed ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">
            {subscribed ? 'Notificaciones de emergencia activas' : 'Activar notificaciones push'}
          </h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            {subscribed
              ? 'Cada escaneo de tu QR llega como alerta a este dispositivo, además del aviso por WhatsApp.'
              : 'Recibí una alerta instantánea en el navegador cada vez que alguien escanea tu QR de rescate.'}
          </p>

          {notice && (
            <p className="mt-2 text-xs text-slate-300 flex items-center gap-1.5">
              {subscribed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
              {notice}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {!subscribed && !denied && (
              <button
                onClick={handleEnable}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-colors"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                Activar en este dispositivo
              </button>
            )}
            {subscribed && (
              <>
                <button
                  onClick={handleTest}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold transition-colors"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  Enviar prueba
                </button>
                <button
                  onClick={handleDisable}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-rose-950/40 hover:border-rose-500/40 disabled:opacity-50 text-slate-300 hover:text-rose-400 text-xs font-semibold transition-colors"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  Desactivar
                </button>
              </>
            )}
            {denied && (
              <span className="text-xs text-amber-400/90">
                Notificaciones bloqueadas en el navegador — habilitalas en el candado 🔒 de la barra de direcciones.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
