import React, { useEffect, useState } from 'react';
import { ShieldCheck, KeyRound, Loader2, Check, Lock } from 'lucide-react';
import { api } from '../utils/api';
import { ClientCrypto } from '../utils/crypto';
import { PinModal } from './PinModal';

interface VaultStatus {
  webVaultInitialized: boolean;
  encryptionSalt?: string | null;
  encryptedMedicalBlob?: string | null;
}

/**
 * First-web-login step for true client-side Zero-Knowledge:
 * decrypt the (server-created) blob locally, re-encrypt it with a browser-generated
 * salt, and push back only the ciphertext. After this the server cannot read it.
 */
export const VaultInit: React.FC = () => {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/vault/status')
      .then((r) => setStatus(r.data))
      .catch(() => setStatus({ webVaultInitialized: true })); // fail closed: hide the card
  }, []);

  if (!status || status.webVaultInitialized || done) return null;

  const handlePin = async (pin: string) => {
    setBusy(true);
    setError(null);
    try {
      // 1. Decrypt the current blob with the server-era salt (if there is one)
      let plain: unknown = { initializedFromWeb: true, consultationHistory: [] };
      if (status.encryptedMedicalBlob && status.encryptionSalt) {
        try {
          plain = await ClientCrypto.decryptMedicalBlob(status.encryptedMedicalBlob, pin, status.encryptionSalt);
        } catch {
          throw new Error('PIN incorrecto — no se pudo abrir la bóveda actual.');
        }
      }
      // 2. Fresh salt generated in the browser, re-encrypt locally
      const newSalt = ClientCrypto.generateSaltHex(16);
      const newBlob = await ClientCrypto.encryptMedicalBlob(plain, pin, newSalt);
      // 3. Send only ciphertext + salt + PIN proof
      await api.post('/vault/reinitialize', { encryptionSalt: newSalt, encryptedMedicalBlob: newBlob, pin });
      setDone(true);
      setOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'No se pudo activar el cifrado.');
      throw err; // keep the modal open
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white">Activá el cifrado de extremo a extremo</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Tu bóveda se creó durante el registro por WhatsApp. Reciframosla ahora <b>en tu navegador</b> con
              una clave que el servidor nunca ve — a partir de acá, ni nosotros podemos leer tu historial sin tu PIN.
            </p>
            {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
            <button
              onClick={() => setOpen(true)}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-colors"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              Activar ahora
            </button>
          </div>
        </div>
      </div>

      <PinModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={handlePin}
        title="Ciframos tu bóveda localmente"
        description="Ingresá tu PIN de 4 dígitos. Se usa solo en tu navegador para re-cifrar; no se envía al servidor en claro."
      />
    </>
  );
};
