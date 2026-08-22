import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Settings, 
  History, 
  Sun, 
  Moon, 
  FileSpreadsheet, 
  Lock, 
  Layers, 
  Gift, 
  Zap,
  LogIn,
  LogOut,
  User as UserIcon,
  Cloud,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { ExtractedStatement, UserCredits } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface NavbarProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
  onOpenHistory: () => void;
  onOpenShareEarn: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  user: FirebaseUser | null;
  credits: UserCredits;
  statements: ExtractedStatement[];
  activeStatementId: string | null;
  onSelectStatement: (id: string) => void;
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isDarkMode,
  onToggleDarkMode,
  onOpenSettings,
  onOpenPrivacy,
  onOpenHistory,
  onOpenShareEarn,
  onOpenAuth,
  onLogout,
  user,
  credits,
  statements,
  activeStatementId,
  onSelectStatement,
  historyCount,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <header className={`sticky top-0 z-40 w-full border-b transition-colors ${
      isDarkMode 
        ? 'bg-slate-900/95 border-slate-800 text-slate-100 backdrop-blur' 
        : 'bg-white/95 border-slate-200 text-slate-900 backdrop-blur'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight">
                Bank Statement Converter
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                PRO OCR
              </span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} hidden sm:block`}>
              PDF, Image, CSV & Excel to Structured Spreadsheets
            </p>
          </div>
        </div>

        {/* Multi-statement Batch Switcher if > 1 statement */}
        {statements.length > 1 && (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium max-w-xs overflow-hidden">
            <Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-slate-500 shrink-0">Batch ({statements.length}):</span>
            <select
              value={activeStatementId || ''}
              onChange={(e) => onSelectStatement(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold focus:ring-0 cursor-pointer truncate"
            >
              {statements.map((st) => (
                <option key={st.id} value={st.id} className="dark:bg-slate-900">
                  {st.summary.bankName || st.fileName} ({st.transactions.length} rows)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Share & Earn Credits Pill */}
          <button
            onClick={onOpenShareEarn}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all group ${
              credits.availableCredits <= 2
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
            }`}
            title="Share with friends to get +10 more conversions"
          >
            <Gift className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-12 transition-transform" />
            <span>
              <strong className="font-mono">{credits.availableCredits}</strong> Free Convert{credits.availableCredits !== 1 ? 's' : ''}
            </span>
            <span className="hidden lg:inline text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-extrabold uppercase">
              +10 Share
            </span>
          </button>

          {/* Privacy & Security Modal Button */}
          <button
            onClick={onOpenPrivacy}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isDarkMode
                ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200'
            }`}
            title="Privacy Guarantee & Zero-Retention Security"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Privacy</span>
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
              isDarkMode
                ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200'
            }`}
            title="Conversion History"
          >
            <History className="w-3.5 h-3.5 text-teal-500" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-teal-500 text-white text-[10px] flex items-center justify-center font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-lg text-xs transition-all ${
              isDarkMode
                ? 'hover:bg-slate-800 text-slate-300'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Conversion Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-lg text-xs transition-all ${
              isDarkMode
                ? 'hover:bg-slate-800 text-amber-400'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Firebase Authentication Button / Profile Menu */}
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-xl border transition-all ${
                  isDarkMode
                    ? 'bg-slate-800/90 border-slate-700 hover:border-emerald-500/50'
                    : 'bg-slate-50 border-slate-200 hover:border-emerald-500/50 shadow-xs'
                }`}
                title="Account Menu"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 rounded-full object-cover border border-emerald-500/50"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                    {getInitials(user.displayName, user.email)}
                  </div>
                )}
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-[11px] font-bold leading-tight max-w-[90px] truncate text-slate-900 dark:text-slate-100">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                    <Cloud className="w-2.5 h-2.5" /> Synced
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown */}
              {isProfileMenuOpen && (
                <div className={`absolute right-0 mt-2 w-64 rounded-2xl border p-3 shadow-xl transition-all z-50 animate-in fade-in zoom-in-95 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="pb-3 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="Avatar"
                          className="w-9 h-9 rounded-full object-cover border border-emerald-500/50"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center">
                          {getInitials(user.displayName, user.email)}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold truncate">
                          {user.displayName || 'Firebase User'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cloud Sync Status */}
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Cloud Sync Active</span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">
                      {credits.availableCredits} cr
                    </span>
                  </div>

                  {/* Action options */}
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenShareEarn();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-amber-500" />
                        <span>Share & Earn Credits</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold">
                        +10
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm shadow-emerald-600/20 transition-all hover:scale-[1.02]"
              title="Sign in with Google or Email"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
