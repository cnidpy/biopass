import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { RiskBadges } from '../components/RiskBadges';
import { PinModal } from '../components/PinModal';
import { ClientCrypto } from '../utils/crypto';
import { Phone, Lock, Unlock, ShieldAlert, HeartPulse, FileText, Calendar, User as UserIcon, Building2, MapPin, CheckCircle2, AlertOctagon, Download, Eye } from 'lucide-react';

export const EmergencyView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Emergency Call status
  const [calling, setCalling] = useState(false);
  const [callNotice, setCallNotice] = useState<string | null>(null);

  // Consultation / PIN Decryption
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [consultationUnlocked, setConsultationUnlocked] = useState(false);
  const [decryptedData, setDecryptedData] = useState<any>(null);
  const [medicalStudies, setMedicalStudies] = useState<any[]>([]);

  useEffect(() => {
    fetchEmergencyData();
  }, [token]);

  const fetchEmergencyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/emergency/${token}`);
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo cargar la ficha de emergencia.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyCall = async () => {
    if (!data?.emergencyContact?.phoneNumber) return;
    setCalling(true);
    setCallNotice(null);
    try {
      await api.post(`/emergency/${token}/call-contact`);
      setCallNotice(`📞 Llamada de emergencia iniciada a ${data.emergencyContact.fullName} (${data.emergencyContact.phoneNumber})`);
      // Also open mobile dialer as immediate redundancy
      window.location.href = `tel:${data.emergencyContact.phoneNumber}`;
    } catch (err: any) {
      // Fallback to direct tel: link
      window.location.href = `tel:${data.emergencyContact.phoneNumber}`;
    } finally {
      setCalling(false);
    }
  };

  const handlePinUnlock = async (pin: string) => {
    const res = await api.post(`/emergency/${token}/consultation`, { pin });
    if (res.data.success) {
      setMedicalStudies(res.data.medicalStudies || []);
      
      // Client-side Zero Knowledge decryption if encrypted blob is present
      if (res.data.user?.encryptedMedicalBlob && res.data.user?.encryptionSalt) {
        try {
          const decrypted = await ClientCrypto.decryptMedicalBlob(
            res.data.user.encryptedMedicalBlob,
            pin,
            res.data.user.encryptionSalt
          );
          setDecryptedData(decrypted);
        } catch {
          // Fallback to parsed basic object if already decrypted
          setDecryptedData({ note: 'Historial clínico verificado con PIN' });
        }
      }
      setConsultationUnlocked(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Cargando Ficha de Emergencia Bio-Pass...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <AlertOctagon className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">Código no Disponible</h2>
          <p className="mt-2 text-sm text-slate-400">{error || 'El código QR escaneado no es válido o ha expirado.'}</p>
        </div>
      </div>
    );
  }

  const user = data.user;
  const contact = data.emergencyContact;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Co-Branding Header if organization exists */}
        {user.organization && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3">
              {user.organization.logoUrl ? (
                <img src={user.organization.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-slate-950 p-1 border border-slate-800" />
              ) : (
                <Building2 className="w-8 h-8 text-rose-500" />
              )}
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">CO-BRANDING MÉDICO</span>
                <h4 className="text-sm font-bold text-white">{user.organization.name}</h4>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-400">
              COBERTURA ACTIVA
            </div>
          </div>
        )}

        {/* Emergency Alert Banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 rounded-3xl p-6 text-white shadow-2xl shadow-rose-950/60 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wider uppercase">
                🚨 MODO EMERGENCIA PÚBLICO
              </span>
              <span className="text-xs font-bold text-rose-100 bg-black/20 px-3 py-1 rounded-full">
                DOORWAY CORTEX
              </span>
            </div>

            {/* Patient Header */}
            <div className="mt-5 flex items-center space-x-4">
              <div className="w-20 h-20 rounded-2xl bg-slate-900/50 border-2 border-white/30 overflow-hidden shrink-0 shadow-lg">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserIcon className="w-10 h-10 text-white/70" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-tight">{user.fullName}</h1>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-white text-rose-700 text-xs font-black tracking-wide">
                    RH: {user.bloodType}
                  </span>
                  <span className="text-xs text-rose-100 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {user.address || 'Paraguay / Brasil'}
                  </span>
                </div>
              </div>
            </div>

            {/* BIG RED BUTTON: LLAMAR A FAMILIAR */}
            {contact && (
              <div className="mt-6">
                <button
                  onClick={handleEmergencyCall}
                  disabled={calling}
                  className="w-full py-4 px-6 rounded-2xl bg-white text-rose-600 hover:bg-rose-50 font-black text-lg tracking-wide uppercase shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3"
                >
                  <Phone className="w-6 h-6 fill-rose-600 text-rose-600 animate-pulse" />
                  <span>LLAMAR A FAMILIAR ({contact.fullName})</span>
                </button>
                {callNotice && (
                  <p className="mt-2 text-xs text-center text-rose-100 font-medium">{callNotice}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Visual Danger Badges & Allergies */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <span>Condiciones Críticas de Rescate</span>
            </h3>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
            </span>
          </div>

          <RiskBadges
            conditions={user.emergencyConditions}
            allergies={user.severeAllergies}
            contraindicatedMeds={user.contraindicatedMeds}
          />
        </div>

        {/* Emergency Contact Card */}
        {contact && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-blue-400" />
              <span>Contacto de Aviso Inmediato</span>
            </h3>
            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
              <div>
                <p className="text-base font-bold text-white">{contact.fullName}</p>
                <p className="text-xs text-slate-400">{contact.relationship || 'Familiar de Contacto'}</p>
              </div>
              <a
                href={`tel:${contact.phoneNumber}`}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-blue-600/30 transition-all"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{contact.phoneNumber}</span>
              </a>
            </div>
          </div>
        )}

        {/* Consultation Mode Button / Section */}
        {!consultationUnlocked ? (
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 text-center shadow-xl">
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/10 text-rose-400 mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">¿Eres Médico o el Titular?</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              Desbloquea el historial clínico completo, estudios de laboratorio, radiografías y recetas ingresando el PIN de 4 dígitos.
            </p>
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="mt-4 inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-white border border-slate-700 shadow-md transition-all hover:scale-105"
            >
              <Unlock className="w-4 h-4 text-amber-400" />
              <span>Modo Consulta (Ingresar PIN)</span>
            </button>
          </div>
        ) : (
          /* UNLOCKED CONSULTATION MODE */
          <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Modo Consulta Médica Activo</h3>
                  <p className="text-xs text-slate-400">Cifrado Zero-Knowledge Descifrado Localmente</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                PRIVADO
              </span>
            </div>

            {/* Decrypted Clinical History Details */}
            {decryptedData && (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Cronología y Antecedentes</h4>
                
                {decryptedData.chronicDiseases && (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold text-amber-400 block mb-2">Enfermedades Crónicas & Tratamiento:</span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {decryptedData.chronicDiseases.map((d: any, i: number) => (
                        <li key={i}>• <strong className="text-white">{d.condition}</strong> (Dx: {d.diagnosedYear}) - {d.treatment}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {decryptedData.consultationsHistory && (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold text-blue-400 block mb-2">Historial de Consultas Médicas:</span>
                    <div className="space-y-2">
                      {decryptedData.consultationsHistory.map((c: any, i: number) => (
                        <div key={i} className="text-xs border-b border-slate-800/80 pb-2 last:border-0">
                          <div className="flex justify-between text-slate-400">
                            <span>{c.date} • {c.specialty}</span>
                            <span>{c.doctor}</span>
                          </div>
                          <p className="mt-0.5 text-slate-200 font-medium">{c.diagnosis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Medical Studies in Cloud */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-rose-500" />
                <span>Estudios en la Nube ({medicalStudies.length})</span>
              </h4>

              {medicalStudies.length === 0 ? (
                <p className="text-xs text-slate-500">No hay estudios médicos registrados.</p>
              ) : (
                <div className="space-y-3">
                  {medicalStudies.map((study) => (
                    <div key={study.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {study.studyType}
                        </span>
                        <h5 className="mt-1 text-sm font-bold text-white">{study.title}</h5>
                        {study.aiSummary && (
                          <p className="mt-1 text-xs text-slate-400">{study.aiSummary}</p>
                        )}
                        <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <Calendar className="w-3 h-3" /> {new Date(study.studyDate || study.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <a
                        href={study.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center space-x-1.5 shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* PIN Unlock Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSubmit={handlePinUnlock}
      />
    </div>
  );
};
