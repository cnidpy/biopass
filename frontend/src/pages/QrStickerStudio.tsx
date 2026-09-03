import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../utils/api';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Smartphone, HardHat, Wallet, ShieldCheck, Upload, Sparkles, AlertCircle, Building2 } from 'lucide-react';

export const QrStickerStudio: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [orgLogoFile, setOrgLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [updatingBranding, setUpdatingBranding] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await api.get('/auth/profile');
      setUser(res.data.user);
      if (res.data.user?.organization) {
        setOrgName(res.data.user.organization.name || '');
        setLogoPreview(res.data.user.organization.logoUrl || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOrgLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveCoBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingBranding(true);
    try {
      const formData = new FormData();
      formData.append('organizationName', orgName);
      if (orgLogoFile) {
        formData.append('logo', orgLogoFile);
      }
      const res = await api.post('/stickers/co-branding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser({ ...user, organization: res.data.organization });
      alert('¡Co-Branding actualizado con éxito!');
    } catch (err: any) {
      alert('Error: ' + (err?.response?.data?.error || err.message));
    } finally {
      setUpdatingBranding(false);
    }
  };

  const emergencyUrl = `${window.location.origin}/e/${user?.emergencyToken}`;
  const pdfDownloadUrl = `${API_BASE_URL}/stickers/${user?.emergencyToken}/pdf`;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <QrCode className="w-8 h-8 text-rose-500" />
            <span>Módulo de Generación de QR & Kit Físico (3x3 cm)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generación ilimitada de stickers de alta resolución listos para imprimir en vinilo resistente al agua.
          </p>
        </div>

        <a
          href={pdfDownloadUrl}
          className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-xl shadow-rose-600/30 transition-all hover:scale-105"
        >
          <Download className="w-5 h-5" />
          <span>DESCARGAR PDF LISTO PARA IMPRIMIR</span>
        </a>
      </div>

      {/* Main Grid: Visual Sticker Interactive Preview & Co-Branding */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: 3x3 cm Interactive Sticker Preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                VISTA PREVIA DEL STICKER (3x3 CM)
              </span>
              <span className="text-[11px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                Escala Real 1:1 + Sangrado 3mm
              </span>
            </div>

            {/* Simulated 3x3cm Sticker Canvas */}
            <div className="flex justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800/80">
              <div className="relative p-2 bg-slate-900 rounded-xl border-2 border-dashed border-rose-500/40 shadow-2xl">
                {/* 3x3 cm physical badge */}
                <div className="w-[180px] h-[180px] bg-white rounded-lg p-2.5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                  
                  {/* Top Header */}
                  <div className="bg-rose-600 text-white text-[9px] font-black uppercase text-center py-1 rounded-t-sm flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>EMERGENCIA BIO-PASS</span>
                  </div>

                  {/* High Res QR */}
                  <div className="flex justify-center my-1">
                    <QRCodeSVG value={emergencyUrl} size={110} level="H" />
                  </div>

                  {/* Co-Branding Logo Overlay if exists */}
                  {logoPreview && (
                    <div className="absolute top-[82px] left-[78px] w-6 h-6 bg-white rounded-full p-0.5 shadow-md flex items-center justify-center border border-slate-300">
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain rounded-full" />
                    </div>
                  )}

                  {/* Bottom Footer Band */}
                  <div className="bg-slate-950 text-white text-[8px] font-bold py-1 px-2 rounded-b-sm flex justify-between items-center">
                    <span>RH: {user?.bloodType || 'O+'}</span>
                    <span className="text-rose-400">SCAN ME</span>
                  </div>
                </div>

                <span className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-slate-500 font-semibold">
                  Medida: 30 x 30 mm (+3mm sangrado)
                </span>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center space-x-2 text-rose-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Especificación Técnica de Fabricación:</span>
              </div>
              <p>• Impresión recomendada en papel Contact (vinilo autoadhesivo laminado).</p>
              <p>• 100% resistente a la intemperie, agua, sudor y abrasión mecánica.</p>
              <p>• El PDF incluye marcas de corte perimetrales para guillotina o plotter.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Recommendations & Co-Branding Studio */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Print & Placement Recommendations */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-base font-black uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <span>📌 Recomendaciones Gráficas de Uso y Ubicación</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Celular Titular</h4>
                <p className="mt-1 text-xs text-slate-400">
                  Pega el sticker en la parte trasera de tu teléfono móvil o funda protectora.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                  <HardHat className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Casco de Seguridad</h4>
                <p className="mt-1 text-xs text-slate-400">
                  En cascos industriales, ciclismo o motociclismo para brigadistas y bomberos.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                  <Wallet className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Billetera o Carnet</h4>
                <p className="mt-1 text-xs text-slate-400">
                  Dentro de tu carnet corporativo o pegado junto a tu Cédula de Identidad (CI).
                </p>
              </div>

            </div>
          </div>

          {/* Co-Branding Customizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-base font-black uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-rose-500" />
              <span>Co-Branding Corporativo / Club Deportivo</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Sube el logo o escudo de tu empresa o club para que aparezca impreso en tus stickers.
            </p>

            <form onSubmit={handleSaveCoBranding} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Nombre de la Entidad / Empresa</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ej: Club Olimpia / Banco Continental"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Logo o Escudo Institucional</label>
                <div className="flex items-center space-x-4">
                  {logoPreview && (
                    <img src={logoPreview} alt="Logo" className="w-12 h-12 object-contain bg-slate-950 p-1 rounded-xl border border-slate-800" />
                  )}
                  <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>Seleccionar Imagen</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoSelect} />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingBranding}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-colors"
              >
                {updatingBranding ? 'Guardando Co-Branding...' : 'Aplicar Co-Branding al Kit Físico'}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
