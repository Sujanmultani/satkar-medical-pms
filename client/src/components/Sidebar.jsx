import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Pill, 
  ShoppingBag, 
  ScanLine, 
  Receipt, 
  AlertTriangle, 
  Settings, 
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import logoAsset from '@/assets/satkar-logo.jpeg';
import { LogoWatermark } from './LogoWatermark';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Medical Stock', path: '/stock', icon: Pill, disabled: false },
    { label: 'Provision Store', path: '/provision', icon: ShoppingBag, disabled: false },
    { label: 'Invoice Scan', path: '/invoice-scan', icon: ScanLine, disabled: false },
    { label: 'Billing', path: '/billing', icon: Receipt, disabled: true },
    { label: 'Expiry Alerts', path: '/expiry-alerts', icon: AlertTriangle, disabled: true },
    { label: 'Settings', path: '/settings', icon: Settings, disabled: true },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="relative w-64 bg-primary text-white flex flex-col justify-between h-screen sticky top-0 overflow-hidden shadow-2xl z-30 select-none border-r border-white/10">
      {/* Subtle Logo Bleed Backdrop */}
      <LogoWatermark opacity={0.06} scale={1.8} position="sidebar" />

      {/* Top Section */}
      <div className="relative z-10 p-5">
        {/* Brand Header */}
        <div className="flex items-center gap-3 pb-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-md flex items-center justify-center shrink-0">
            <img src={logoAsset} alt="Satkar Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg tracking-tight text-white leading-none">
              SATKAR MEDICAL
            </h1>
            <p className="text-[10px] text-secondary-light/80 tracking-wider uppercase mt-1 font-mono">
              Pharmacy & Provision
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="mt-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.disabled ? '#' : item.path}
                onClick={(e) => item.disabled && e.preventDefault()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    item.disabled
                      ? 'opacity-45 cursor-not-allowed text-white/60'
                      : isActive
                      ? 'bg-secondary text-white shadow-md font-semibold'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-secondary-light/80'}`} />
                    <span className="flex-1">{item.label}</span>
                    {item.disabled && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono">
                        Phase 2+
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile Section */}
      <div className="relative z-10 p-4 border-t border-white/10 bg-primary-hover/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-secondary/30 border border-secondary text-white flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Admin User'}</p>
              <div className="flex items-center gap-1 text-[10px] text-accent font-mono">
                <ShieldCheck className="w-3 h-3" />
                <span>Admin</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/10 hover:bg-error/80 text-white text-xs font-medium transition-colors duration-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
