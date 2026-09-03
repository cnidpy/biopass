import React from 'react';
import { AlertTriangle, Activity, Zap, Heart, ShieldAlert, Pill } from 'lucide-react';

interface RiskBadgesProps {
  conditions: string[] | string;
  allergies?: string;
  contraindicatedMeds?: string;
}

export const RiskBadges: React.FC<RiskBadgesProps> = ({
  conditions,
  allergies,
  contraindicatedMeds,
}) => {
  const condList = Array.isArray(conditions)
    ? conditions
    : typeof conditions === 'string'
    ? JSON.parse(conditions || '[]')
    : [];

  const getConditionIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('diabet')) return <Activity className="w-5 h-5 text-amber-400" />;
    if (lower.includes('epilep')) return <Zap className="w-5 h-5 text-purple-400" />;
    if (lower.includes('hipert') || lower.includes('presion')) return <Heart className="w-5 h-5 text-rose-400" />;
    if (lower.includes('marcapaso') || lower.includes('cardio')) return <Activity className="w-5 h-5 text-blue-400" />;
    return <AlertTriangle className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Visual Condition Badges */}
      {condList.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {condList.map((cond: string, idx: number) => (
            <div
              key={idx}
              className="flex items-center space-x-2.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 shadow-md"
            >
              <div className="p-1.5 rounded-lg bg-slate-800">
                {getConditionIcon(cond)}
              </div>
              <span className="text-sm font-bold text-slate-100 tracking-wide">{cond}</span>
            </div>
          ))}
        </div>
      )}

      {/* Severe Allergies Warning Box */}
      {allergies && allergies !== 'Ninguna declarada' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/70 to-rose-950/40 border border-red-500/50 shadow-lg shadow-red-950/40">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 mt-0.5">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <span>⚠️ ALERGIAS SEVERAS / RIESGO DE ANAFILAXIA</span>
              </h4>
              <p className="mt-1 text-base font-bold text-white leading-relaxed">
                {allergies}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contraindicated Medications Warning Box */}
      {contraindicatedMeds && contraindicatedMeds !== 'Ninguno declarado' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 to-orange-950/40 border border-amber-500/50 shadow-lg shadow-amber-950/40">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>⛔ MEDICAMENTOS CONTRAINDICADOS</span>
              </h4>
              <p className="mt-1 text-sm font-bold text-amber-100">
                {contraindicatedMeds}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
