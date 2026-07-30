import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Pill, 
  ShoppingBag, 
  ScanLine, 
  Receipt, 
  AlertTriangle, 
  FlaskConical,
  History,
  Settings, 
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Undo2,
  Building2,
  Download,
  Monitor,
  Smartphone,
  Apple,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import logoAsset from '@/assets/satkar-logo.jpeg';
import { LogoWatermark } from './LogoWatermark';
import { Button } from '@/components/ui/Button';

function InstallAppModal({ isOpen, onClose, deferredPrompt, onDirectInstall }) {
  const [activeTab, setActiveTab] = useState('pc');

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-surface p-6 rounded-2xl border border-primary/20 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-primary p-1 rounded-lg hover:bg-black/5"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 p-1.5 flex items-center justify-center border border-primary/20 shrink-0">
            <img src={logoAsset} alt="Satkar Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-heading text-primary flex items-center gap-2">
              <span>Install Satkar Medical App</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
            <p className="text-xs text-muted">Install on your PC or Phone as a standalone app shortcut.</p>
          </div>
        </div>

        {deferredPrompt && (
          <Button
            onClick={onDirectInstall}
            variant="default"
            size="md"
            className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 shadow-md"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span>Click Here to Install Directly Now</span>
          </Button>
        )}

        {/* Tab Buttons */}
        <div className="flex bg-background p-1 rounded-xl border border-primary/10">
          <button
            onClick={() => setActiveTab('pc')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'pc' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-primary'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>PC / Laptop</span>
          </button>

          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'android' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-primary'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'ios' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-primary'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>iPhone / iOS</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-background p-4 rounded-xl border border-primary/10 text-xs space-y-3">
          {activeTab === 'pc' && (
            <div className="space-y-2 text-primary">
              <p className="font-bold flex items-center gap-2 text-teal-700">
                <Monitor className="w-4 h-4 text-teal-600" />
                <span>Google Chrome & Microsoft Edge (PC)</span>
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-muted leading-relaxed">
                <li>Look at Chrome top-right menu <strong>(⋮)</strong> or address bar.</li>
                <li>Click 3 dots menu ➔ <strong>"Cast, save, and share"</strong> ➔ <strong>"Install Satkar Medical..."</strong>.</li>
                <li>Or click the 🖥️ computer icon on the right side of URL bar.</li>
              </ol>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-2 text-primary">
              <p className="font-bold flex items-center gap-2 text-teal-700">
                <Smartphone className="w-4 h-4 text-teal-600" />
                <span>Android Chrome Browser</span>
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-muted leading-relaxed">
                <li>Open Chrome menu <strong>(⋮)</strong> in top right.</li>
                <li>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</li>
                <li>Satkar Medical icon will be created on your phone home screen!</li>
              </ol>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-2 text-primary">
              <p className="font-bold flex items-center gap-2 text-teal-700">
                <Apple className="w-4 h-4 text-teal-600" />
                <span>iPhone / iPad Safari Browser</span>
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-muted leading-relaxed">
                <li>Open Safari and tap bottom <strong>Share button (⬆️)</strong>.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                <li>Tap <strong>"Add"</strong> in top right corner.</li>
              </ol>
            </div>
          )}
        </div>

        <Button
          onClick={onClose}
          variant="outline"
          size="sm"
          className="w-full text-xs font-semibold"
        >
          Close
        </Button>
      </div>
    </div>,
    document.body
  );
}

function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  React.useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
    }

    const handlePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleDirectInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
    setIsModalOpen(false);
  };

  if (isInstalled) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-1.5 mb-3 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>App Installed ✓</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 mb-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer border border-emerald-400/40"
      >
        <Download className="w-3.5 h-3.5 text-white animate-bounce shrink-0" />
        <span>Install App (PC & Mobile)</span>
      </button>

      <InstallAppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onDirectInstall={handleDirectInstall}
      />
    </>
  );
}

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Medical Stock', path: '/stock', icon: Pill, disabled: false },
    { label: 'Composition Search', path: '/composition-search', icon: FlaskConical, disabled: false },
    { label: 'Provision Store', path: '/provision', icon: ShoppingBag, disabled: false },
    { label: 'Invoice Scan', path: '/invoice-scan', icon: ScanLine, disabled: false },
    { label: 'Billing', path: '/billing', icon: Receipt, disabled: false },
    { label: 'Bill History', path: '/bill-history', icon: History, disabled: false },
    { label: 'Returns History', path: '/returns', icon: Undo2, disabled: false },
    { label: 'Suppliers', path: '/suppliers', icon: Building2, disabled: false },
    { label: 'Expiry Alerts', path: '/expiry-alerts', icon: AlertTriangle, disabled: false },
    { label: 'Settings', path: '/settings', icon: Settings, disabled: false },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavContent = () => (
    <>
      {/* Top Section */}
      <div className="relative z-10 p-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
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

          {/* Close button inside mobile menu */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-white/80 hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="mt-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.disabled ? '#' : item.path}
                onClick={(e) => {
                  if (item.disabled) {
                    e.preventDefault();
                  } else {
                    setMobileOpen(false);
                  }
                }}
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
            <div className="w-8 h-8 rounded-full bg-secondary/30 border border-secondary text-white flex items-center justify-center font-bold text-xs shrink-0">
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

        <InstallAppButton />

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/10 hover:bg-error/80 text-white text-xs font-medium transition-colors duration-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden w-full bg-primary text-white p-3 flex items-center justify-between sticky top-0 z-40 shadow-md border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white p-1 shadow-sm flex items-center justify-center shrink-0">
            <img src={logoAsset} alt="Satkar Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-sm tracking-tight leading-none">SATKAR MEDICAL</h1>
            <p className="text-[9px] text-secondary-light/80 font-mono">Pharmacy & Provision</p>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex relative w-64 bg-primary text-white flex-col justify-between h-screen sticky top-0 overflow-hidden shadow-2xl z-30 select-none border-r border-white/10 shrink-0">
        <LogoWatermark opacity={0.06} scale={1.8} position="sidebar" />
        <NavContent />
      </aside>

      {/* Mobile Slide-Over Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Sidebar Panel */}
          <aside className="relative w-72 bg-primary text-white flex flex-col justify-between h-full shadow-2xl z-10 select-none border-r border-white/10 overflow-y-auto">
            <LogoWatermark opacity={0.06} scale={1.8} position="sidebar" />
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
