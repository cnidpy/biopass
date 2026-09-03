import React, { useState, useRef } from 'react';
import { Lock, KeyRound, X, AlertCircle, Loader2 } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
  title?: string;
  description?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title = 'Acceso a Bóveda Médica Cifrada',
  description = 'Ingresa el PIN de 4 dígitos del paciente para descifrar el historial clínico completo y estudios.',
}) => {
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...pinDigits];
    newDigits[index] = value.slice(-1);
    setPinDigits(newDigits);
    setError(null);

    // Auto focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pinDigits.join('');
    if (pin.length !== 4) {
      setError('Por favor ingresa los 4 dígitos de tu PIN');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(pin);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'PIN incorrecto o error al descifrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/40">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 mb-4 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">{description}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-center space-x-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Inputs */}
        <form onSubmit={handleFormSubmit} className="mt-6">
          <div className="flex justify-center gap-3.5 mb-6">
            {pinDigits.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-14 h-16 text-center text-2xl font-black text-white bg-slate-950 border-2 border-slate-700 rounded-2xl focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 outline-none transition-all"
                autoFocus={index === 0}
              />
            ))}
          </div>

          <div className="p-3 mb-6 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Zero-Knowledge: La clave de descifrado nunca sale de este dispositivo.</span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-3 px-4 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-sm font-bold text-white shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Descifrando...</span>
                </>
              ) : (
                <span>Desbloquear</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
