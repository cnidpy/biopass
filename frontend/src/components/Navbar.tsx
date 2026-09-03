import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  HeartPulse,
  QrCode,
  CreditCard,
  Download,
  Bot,
  Lock,
  LogOut,
  Menu,
  X,
  Smartphone,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Mi Pasaporte', path: '/dashboard', icon: HeartPulse },
  { label: 'Kit & QR', path: '/stickers', icon: QrCode },
  { label: 'Exportar', path: '/export', icon: Download },
  { label: 'Pagos', path: '/payments', icon: CreditCard },
  { label: 'Auditoría', path: '/audit-logs', icon: Lock },
  { label: 'Bot', path: '/bot-simulator', icon: Bot },
  { label: 'Vincular', path: '/bot-connect', icon: Smartphone },
];

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('biopass_token');
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('biopass_token');
    localStorage.removeItem('biopass_user');
    setMobileOpen(false);
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group" onClick={() => setMobileOpen(false)}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 p-0.5 shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-rose-500" />
              </div>
            </div>
            <div className="leading-none">
              <span className="text-[15px] font-black tracking-tight text-white whitespace-nowrap flex items-center gap-1.5">
                DOORWAY CORTEX
                <span className="text-rose-500 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                  BIO-PASS
                </span>
              </span>
              <p className="hidden sm:block mt-1 text-[9px] text-slate-500 font-medium tracking-[0.15em] whitespace-nowrap">
                ZERO-KNOWLEDGE HEALTH PASSPORT
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
                  isActive(path)
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {token ? (
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-rose-950/40 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="hidden sm:block text-xs font-bold px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition-all hover:scale-105"
              >
                Iniciar Sesión
              </Link>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
              aria-label="Menú"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="lg:hidden pb-4 pt-1 grid grid-cols-2 gap-1.5">
            {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(path)
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
            {token ? (
              <button
                onClick={handleLogout}
                className="col-span-2 mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-rose-950/40 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="col-span-2 mt-1 text-center text-sm font-bold px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30"
              >
                Iniciar Sesión
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};
