import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { CreditCard, CheckCircle2, QrCode, Copy, Check, ShieldAlert, Sparkles, Building, PhoneCall } from 'lucide-react';

export const Payments: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<'PARAGUAY' | 'BRASIL'>('PARAGUAY');
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulatedSuccess, setSimulatedSuccess] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await api.get('/auth/profile');
      setUser(res.data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOrder = async () => {
    try {
      const res = await api.post('/payments/create-order', {
        userId: user?.id,
        plan: selectedPlan,
        country: selectedCountry,
        isFine: user?.status === 'CANCELLED',
      });
      setCurrentOrder(res.data);
      setSimulatedSuccess(false);
    } catch (err: any) {
      alert('Error creando orden de pago: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateWebhook = async () => {
    if (!currentOrder) return;
    setSimulating(true);
    try {
      await api.post('/payments/webhook', { referenceCode: currentOrder.referenceCode });
      setSimulatedSuccess(true);
      fetchUserData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-rose-500" />
          <span>Suscripciones y Pasarelas de Cobranza</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Pagos en Paraguay (SIPAP / Tigo Money / Tarjetas) y Brasil (PIX Instantâneo / Cartão).
        </p>
      </div>

      {/* Subscription Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">ESTADO ACTUAL DEL SERVICIO</span>
          <div className="mt-1 flex items-center space-x-3">
            <h2 className="text-2xl font-black text-white">{user?.fullName}</h2>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              {user?.status || 'ACTIVO'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Vigencia: 365 Días  •  Renovación con alertas a D-5, D0, D+3, D+4 y purgado a D+30.
          </p>
        </div>

        <button
          onClick={handleGenerateOrder}
          className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 transition-all hover:scale-105 shrink-0"
        >
          Generar Orden de Renovación
        </button>
      </div>

      {/* Plan Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Paraguay Option */}
        <div
          onClick={() => { setSelectedCountry('PARAGUAY'); setSelectedPlan('ANNUAL'); }}
          className={`cursor-pointer bg-slate-900 border-2 rounded-3xl p-6 sm:p-8 shadow-xl transition-all ${
            selectedCountry === 'PARAGUAY' ? 'border-rose-500 bg-rose-950/10' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">🇵🇾</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">PARAGUAY</span>
          </div>
          <h3 className="text-xl font-bold text-white">Plan Anual Paraguay</h3>
          <p className="text-3xl font-black text-rose-500 mt-2">Gs. 300.000 <span className="text-xs font-medium text-slate-400">/ año</span></p>
          <p className="text-xs text-slate-400 mt-2">Incluye Kit de Stickers (3x3 cm), QR ilimitado y Bóveda Cifrada.</p>

          <div className="mt-6 space-y-2 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Transferencia SIPAP directa con Alias <strong>BIOPASS.PY</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Billetera Tigo Money (0981123456)</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Tarjetas de Crédito, Débito y QR Bancard</span>
            </div>
          </div>
        </div>

        {/* Brasil Option */}
        <div
          onClick={() => { setSelectedCountry('BRASIL'); setSelectedPlan('ANNUAL'); }}
          className={`cursor-pointer bg-slate-900 border-2 rounded-3xl p-6 sm:p-8 shadow-xl transition-all ${
            selectedCountry === 'BRASIL' ? 'border-rose-500 bg-rose-950/10' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">🇧🇷</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">BRASIL</span>
          </div>
          <h3 className="text-xl font-bold text-white">Plano Anual Brasil</h3>
          <p className="text-3xl font-black text-rose-500 mt-2">R$ 220,00 <span className="text-xs font-medium text-slate-400">/ ano</span></p>
          <p className="text-xs text-slate-400 mt-2">Inclui QR Ilimitado, Kit de Adesivos 3x3 cm e suporte em Português.</p>

          <div className="mt-6 space-y-2 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>PIX Instantâneo com Chave e Código Copia-e-Cola</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Cartão de Crédito e Débito Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Liberação imediata via Webhook</span>
            </div>
          </div>
        </div>

      </div>

      {/* Generated Order Details */}
      {currentOrder && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-rose-400">ORDEN DE PAGO ACTIVA</span>
              <h3 className="text-lg font-bold text-white">Ref: {currentOrder.referenceCode}</h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-rose-400">{currentOrder.formattedAmount}</span>
            </div>
          </div>

          {/* Payment Instructions according to country */}
          {selectedCountry === 'PARAGUAY' ? (
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-rose-500" />
                <span>Datos para Transferencia SIPAP / Bancaria:</span>
              </h4>
              <div className="p-4 bg-slate-900 rounded-xl text-xs font-mono text-slate-300 whitespace-pre-line border border-slate-800">
                {currentOrder.aliasInfo}
              </div>
              <button
                onClick={() => handleCopy(currentOrder.aliasInfo)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center space-x-2 border border-slate-700"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>Copiar Datos Bancarios</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-rose-500" />
                <span>PIX Copia e Cola (Brasil):</span>
              </h4>
              <div className="p-4 bg-slate-900 rounded-xl text-xs font-mono text-slate-300 break-all border border-slate-800">
                {currentOrder.pixPayload}
              </div>
              <button
                onClick={() => handleCopy(currentOrder.pixPayload)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center space-x-2 border border-slate-700"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>Copiar Código PIX</span>
              </button>
            </div>
          )}

          {/* Webhook Simulator Action for instant developer testing */}
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-rose-200">
              <p className="font-bold">🧪 Modo de Prueba de Webhooks:</p>
              <p className="text-slate-400">Simula la confirmación bancaria automática y el envío del Kit de Stickers por WhatsApp.</p>
            </div>
            <button
              onClick={handleSimulateWebhook}
              disabled={simulating || simulatedSuccess}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center space-x-2 shrink-0 transition-all"
            >
              {simulating ? (
                <span>Confirmando...</span>
              ) : simulatedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Pago Confirmado!</span>
                </>
              ) : (
                <span>Simular Pago Exitoso</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
