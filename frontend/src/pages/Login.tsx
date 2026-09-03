import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { ShieldCheck, Phone, KeyRound, ArrowRight, Loader2, Bot, Lock } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const expired = params.get('expired') === '1';
  const [phone, setPhone] = useState('595981123456');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('8492');
  const [step, setStep] = useState<'PHONE' | 'VERIFY'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await api.post('/auth/request-otp', { phoneNumber: phone });
      setStep('VERIFY');
      if (res.data?.devOtp) {
        setOtp(res.data.devOtp);
        setInfo(`Modo desarrollo: código autocompletado (${res.data.devOtp}).`);
      } else if (res.data?.channel === 'whatsapp') {
        setInfo('Te enviamos el código por WhatsApp. Revisá tu chat.');
      } else {
        setInfo('El bot de WhatsApp no está vinculado — mirá el código en el log del servidor o vinculá el bot.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error solicitando código OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/verify-login', {
        phoneNumber: phone,
        otp,
        pin,
      });

      localStorage.setItem('biopass_token', res.data.token);
      localStorage.setItem('biopass_user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'PIN o código OTP inválido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Acceso a Tu Bio-Pass</h2>
          <p className="text-xs text-slate-400 mt-1">Inicia sesión con tu Teléfono Maestro y tu PIN de Seguridad</p>
        </div>

        {expired && !error && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 text-center">
            Tu sesión expiró. Iniciá sesión de nuevo.
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 text-center">
            {error}
          </div>
        )}

        {info && !error && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 text-center">
            {info}
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Número de Teléfono Celular
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="595981123456"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:border-rose-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Demo preconfigurado: <span className="text-rose-400 font-mono">595981123456</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Continuar con OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Código OTP (WhatsApp)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="6 dígitos"
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-lg font-mono text-center tracking-[0.35em] text-white focus:border-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                PIN Secreto de 4 Dígitos
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="8492"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:border-rose-500 outline-none text-center tracking-widest text-lg"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                PIN Demo: <span className="text-amber-400 font-mono">8492</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Verificar y Entrar</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('PHONE')}
              className="w-full text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cambiar número de teléfono
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          ¿No tienes cuenta aún?{' '}
          <Link to="/bot-simulator" className="text-emerald-400 hover:underline font-bold">
            Regístrate en 3 min por WhatsApp Bot
          </Link>
        </div>
      </div>
    </div>
  );
};
