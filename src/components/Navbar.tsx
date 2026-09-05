import React from 'react';
import { ArrowRight, RefreshCw, Sparkles, Wifi, WifiOff, Store, Waves, Users, Settings } from 'lucide-react';
import { ScreenType, UserRole } from '../types';
import { useOrders } from '../context/OrderContext';

interface NavbarProps {
  currentScreen: ScreenType;
  currentRole: UserRole | null;
  onNavigate: (screen: ScreenType) => void;
  onSwitchRole?: () => void;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  currentRole,
  onNavigate,
  onSwitchRole,
  title,
  subtitle,
  showBack = currentScreen !== 'home' && currentScreen !== 'role-select' && currentScreen !== 'laundry-station',
}) => {
  const { isOnline, loading } = useOrders();

  const getScreenTitle = () => {
    if (title) return title;
    switch (currentScreen) {
      case 'role-select':
        return 'اختيار الدور';
      case 'home':
        return 'المحل (الاستقبال)';
      case 'laundry-station':
        return 'قسم الغسيل';
      case 'add':
        return 'إضافة طلب جديد';
      case 'search':
        return 'البحث عن طلب';
      case 'ready':
        return 'الطلبات الجاهزة (السدة)';
      case 'all':
        return 'سجل كل الطلبات';
      case 'details':
        return 'تفاصيل الطلب';
      case 'settings':
        return 'إعدادات SMS و SimGate';
      default:
        return 'مغسلة الأفرشة';
    }
  };

  const handleBack = () => {
    if (currentRole === 'laundry') {
      onNavigate('laundry-station');
    } else {
      onNavigate('home');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Right side: Back button or App Brand */}
          <div className="flex items-center gap-2">
            {showBack ? (
              <button
                id="navbar-back-btn"
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 border border-slate-700 transition font-bold text-sm"
              >
                <ArrowRight className="w-4 h-4" />
                <span>رجوع</span>
              </button>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center shadow-inner">
                {currentRole === 'laundry' ? (
                  <Waves className="w-5 h-5 text-white" />
                ) : (
                  <Store className="w-5 h-5 text-white" />
                )}
              </div>
            )}

            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                {getScreenTitle()}
              </h1>
              {currentRole && (
                <span className="text-[11px] text-teal-300 font-bold block">
                  {currentRole === 'shop' ? 'هاتف المحل' : 'هاتف قسم الغسيل'}
                </span>
              )}
            </div>
          </div>

          {/* Left side: Settings + Role switcher + Sync status indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="navbar-settings-btn"
              type="button"
              onClick={() => onNavigate('settings')}
              className={`p-2 rounded-xl text-xs font-bold transition border ${
                currentScreen === 'settings'
                  ? 'bg-cyan-600 text-white border-cyan-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="إعدادات SMS و SimGate"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {onSwitchRole && currentRole && (
              <button
                id="navbar-switch-role-btn"
                type="button"
                onClick={onSwitchRole}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition"
                title="تبديل الدور"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تبديل الدور</span>
              </button>
            )}

            {/* Sync status indicator between the 2 phones */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs font-semibold">
              {loading ? (
                <span className="flex items-center gap-1 text-amber-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">مزامنة...</span>
                </span>
              ) : isOnline ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">مباشر</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-400">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="text-[11px]">أوفلاين</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
