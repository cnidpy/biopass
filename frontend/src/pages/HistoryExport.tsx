import React, { useState } from 'react';
import { api } from '../utils/api';
import { Download, ShieldCheck, Lock, Clock, FileArchive, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PinModal } from '../components/PinModal';

export const HistoryExport: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportData, setExportData] = useState<any>(null);

  const handleExport = async (pin: string) => {
    const res = await api.post('/export/full-vault', { pin });
    setExportData(res.data);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Download className="w-8 h-8 text-rose-500" />
          <span>Exportación de Historial Médico (Data Portability)</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Portabilidad de datos clínica y legal garantizada bajo el protocolo internacional GDPR y LGPD.
        </p>
      </div>

      {/* Hero Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mx-auto flex items-center justify-center shadow-inner">
          <FileArchive className="w-10 h-10" />
        </div>

        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-white">Descargar Bóveda Clínica Completa</h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Empaqueta todos tus documentos de identidad, estudios de laboratorio, radiografías, registros de escaneo forense y fichas de emergencia en un único archivo <strong>ZIP protegido con tu PIN de 4 dígitos</strong>.
          </p>
        </div>

        {/* Big Button */}
        <div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-lg shadow-2xl shadow-rose-600/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-3 mx-auto"
          >
            <Download className="w-6 h-6" />
            <span>DESCARGAR HISTORIAL COMPLETO</span>
          </button>
        </div>

        {/* Security Specs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-6 border-t border-slate-800">
          <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-white block">Cifrado AES-256</span>
              <span className="text-[11px] text-slate-400">La clave del ZIP es tu PIN</span>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <Clock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-white block">Enlace Temporal</span>
              <span className="text-[11px] text-slate-400">Expira en 24 horas</span>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-white block">GDPR / LGPD</span>
              <span className="text-[11px] text-slate-400">100% Autoservicio</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Output */}
      {exportData && (
        <div className="bg-emerald-950/50 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">¡Archivo ZIP Cifrado Listo para Descarga!</h3>
              <p className="text-xs text-emerald-300">
                Archivo: {exportData.filename} • Expira el: {new Date(exportData.expiresAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-mono text-slate-400 break-all">{exportData.downloadUrl}</span>
            <a
              href={exportData.downloadUrl}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 shrink-0 flex items-center space-x-2"
              download
            >
              <Download className="w-4 h-4" />
              <span>Descargar ZIP (24h)</span>
            </a>
          </div>
        </div>
      )}

      {/* Modal */}
      <PinModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleExport}
        title="Confirmar con PIN de Seguridad"
        description="El archivo ZIP descargado estará protegido con este PIN mediante cifrado criptográfico AES-256."
      />
    </div>
  );
};
