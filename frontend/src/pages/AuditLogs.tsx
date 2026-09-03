import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Lock, ShieldAlert, Globe, CheckCircle2, Clock, AlertTriangle, UserCheck } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/auth/profile');
      // Mock forensic audit logs for demo
      const user = res.data.user;
      setLogs([
        {
          id: 'log-1',
          scannedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          ipAddress: '190.128.220.45',
          city: 'Asunción',
          country: 'Paraguay',
          userAgent: 'Mobile Safari / iOS 17.4 (iPhone 15 Pro)',
          mode: 'EMERGENCY_NO_PIN',
          alertSentViaWhatsApp: true,
        },
        {
          id: 'log-2',
          scannedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
          ipAddress: '177.18.90.12',
          city: 'Foz do Iguaçu',
          country: 'Brasil',
          userAgent: 'Chrome Mobile / Android 14',
          mode: 'CONSULTATION_PIN',
          alertSentViaWhatsApp: true,
        },
        {
          id: 'log-3',
          scannedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          ipAddress: '181.124.50.99',
          city: 'Ciudad del Este',
          country: 'Paraguay',
          userAgent: 'Firefox / Desktop Windows 11',
          mode: 'EMERGENCY_NO_PIN',
          alertSentViaWhatsApp: true,
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Lock className="w-8 h-8 text-rose-500" />
          <span>Registro Forense de Auditoría & Trazabilidad</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Historial inmutable de cada escaneo del QR, geolocalización IP, alertas de WhatsApp y aperturas médicas.
        </p>
      </div>

      {/* Audit Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="pb-4">Fecha & Hora</th>
                <th className="pb-4">Modo de Acceso</th>
                <th className="pb-4">Ubicación Geolocalizada</th>
                <th className="pb-4">Dirección IP & Dispositivo</th>
                <th className="pb-4">Alerta WhatsApp Push</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 font-mono text-slate-300">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(log.scannedAt).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    {log.mode === 'EMERGENCY_NO_PIN' ? (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-[10px]">
                        🚨 Emergencia (Público)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                        🩺 Consulta Médica (PIN)
                      </span>
                    )}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center space-x-1.5 text-slate-200 font-medium">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span>{log.city}, {log.country}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div>
                      <span className="font-mono text-slate-300">{log.ipAddress}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">{log.userAgent}</p>
                    </div>
                  </td>
                  <td className="py-4">
                    {log.alertSentViaWhatsApp ? (
                      <span className="flex items-center space-x-1 text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Enviada a Titular</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">No enviada</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
