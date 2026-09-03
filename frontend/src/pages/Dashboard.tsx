import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, HeartPulse, QrCode, FileText, Upload, Download, ExternalLink, Activity, Plus, Loader2 } from 'lucide-react';
import { PinModal } from '../components/PinModal';
import { PushOptIn } from '../components/PushOptIn';
import { VaultInit } from '../components/VaultInit';

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [studies, setStudies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await api.get('/auth/profile');
      setUser(res.data.user);

      const studiesRes = await api.get('/medical/studies');
      setStudies(studiesRes.data.studies || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

    setUploading(true);
    try {
      const res = await api.post('/medical/studies/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStudies([res.data.study, ...studies]);
    } catch (err: any) {
      alert('Error subiendo estudio: ' + (err?.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleExportSubmit = async (pin: string) => {
    const res = await api.post('/export/full-vault', { pin });
    setExportResult(res.data);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
      </div>
    );
  }

  const emergencyUrl = `${window.location.origin}/e/${user?.emergencyToken}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-rose-500 shrink-0 shadow-inner">
            <HeartPulse className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-white">{user?.fullName || 'Mi Pasaporte Bio-Pass'}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                {user?.status || 'ACTIVO'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Teléfono: {user?.phoneNumber}  •  Cédula: {user?.ciNumber || '4.892.310'}  •  RH: {user?.bloodType || 'O+'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/e/${user?.emergencyToken}`}
            target="_blank"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all"
          >
            <ExternalLink className="w-4 h-4 text-rose-400" />
            <span>Ver Ficha Pública</span>
          </Link>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Historial Completo</span>
          </button>
        </div>
      </div>

      {/* Export Result Notification Banner */}
      {exportResult && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-300">📦 Archivo ZIP Cifrado Generado</p>
            <p className="text-xs text-slate-400">Contraseña de apertura: Tu PIN de 4 dígitos. Expira en 24 horas.</p>
          </div>
          <a
            href={exportResult.downloadUrl}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
            download
          >
            Descargar Archivo
          </a>
        </div>
      )}

      {/* First web login: move encryption client-side */}
      <VaultInit />

      {/* Browser push opt-in — emergency scans also arrive here */}
      <PushOptIn />

      {/* Grid: QR Quick Card + Emergency Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* QR Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Tu Código QR de Rescate</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Escaneo ilimitado en situaciones de emergencia
          </p>

          <div className="p-4 bg-white rounded-2xl shadow-lg border border-slate-200">
            <QRCodeSVG value={emergencyUrl} size={180} level="H" />
          </div>

          <p className="text-[11px] text-slate-500 mt-4 break-all max-w-xs">{emergencyUrl}</p>

          <Link
            to="/stickers"
            className="mt-5 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-all flex items-center justify-center space-x-2"
          >
            <span>Generar Kit Físico (3x3 cm)</span>
          </Link>
        </div>

        {/* Medical Summary Vault */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500" />
                <span>Bóveda de Estudios Médicos ({studies.length})</span>
              </h3>
              
              <label className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center space-x-1.5 shadow-md shadow-rose-600/30 transition-all">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Subir Estudio</span>
                  </>
                )}
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" disabled={uploading} />
              </label>
            </div>

            {studies.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <Upload className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-sm font-medium">No has subido estudios todavía.</p>
                <p className="text-xs text-slate-600 mt-1">Sube análisis de sangre, radiografías o recetas para clasificarlos con IA.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {studies.map((study) => (
                  <div key={study.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-800 text-rose-400">
                        {study.studyType}
                      </span>
                      <h4 className="mt-2 text-sm font-bold text-white line-clamp-1">{study.title}</h4>
                      {study.aiSummary && (
                        <p className="mt-1 text-xs text-slate-400 line-clamp-2">{study.aiSummary}</p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500">
                      <span>{new Date(study.studyDate || study.createdAt).toLocaleDateString()}</span>
                      <a href={study.fileUrl} target="_blank" rel="noreferrer" className="text-rose-400 hover:underline font-semibold">
                        Ver Archivo
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Export PIN Modal */}
      <PinModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onSubmit={handleExportSubmit}
        title="Descargar Historial Completo (ZIP Cifrado)"
        description="Ingresa tu PIN de 4 dígitos para encriptar el archivo ZIP con protección AES-256."
      />
    </div>
  );
};
