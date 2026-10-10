import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Settings, 
  History, 
  Sun, 
  Moon, 
  FileSpreadsheet, 
  Layers, 
  Gift, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  Database,
  ChevronDown,
  Phone,
  Smartphone,
  CheckCircle2,
  Menu,
  X,
  BookOpen,
  DollarSign
} from 'lucide-react';
import { ExtractedStatement, UserCredits } from '../types';
import { AppUser } from '../lib/supabase';

interface NavbarProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
  onOpenHistory: () => void;
  onOpenShareEarn: () => void;
  onOpenPhoneVerify?: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  user: AppUser | null;
  credits?: UserCredits;
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
  onOpenPhoneVerify,
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
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isBanksOpen, setIsBanksOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const banksMenuRef = useRef<HTMLDivElement>(null);

  const availableCredits = credits?.availableCredits ?? 10;

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setIsToolsOpen(false);
      }
      if (banksMenuRef.current && !banksMenuRef.current.contains(target)) {
        setIsBanksOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
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
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Bank Statement Converter
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                  OCR &amp; AI
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 hidden lg:block">
                PDF &amp; Scanned Images to Excel &amp; CSV
              </p>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav aria-label="Header Navigation" className="hidden xl:flex items-center gap-1 ml-4 text-xs font-bold text-slate-700 dark:text-slate-300">
            {/* Tools Dropdown */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                onClick={() => {
                  setIsToolsOpen(!isToolsOpen);
                  setIsBanksOpen(false);
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>Tools</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>
              {isToolsOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl border p-2 shadow-xl z-50 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
                  <a href="/pdf-bank-statement-to-excel" className="block px-3 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200">
                    <div className="font-bold">PDF to Excel (XLSX)</div>
                    <div className="text-[11px] text-slate-500">Vector &amp; table extraction</div>
                  </a>
                  <a href="/pdf-bank-statement-to-csv" className="block px-3 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200">
                    <div className="font-bold">PDF to CSV</div>
                    <div className="text-[11px] text-slate-500">Universal comma-separated format</div>
                  </a>
                  <a href="/scanned-bank-statement-to-excel" className="block px-3 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200">
                    <div className="font-bold">Scanned Bank Statement OCR</div>
                    <div className="text-[11px] text-slate-500">Paper scans &amp; photocopies</div>
                  </a>
                  <a href="/bank-statement-image-to-excel" className="block px-3 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200">
                    <div className="font-bold">Image to Excel (JPG/PNG)</div>
                    <div className="text-[11px] text-slate-500">Smartphone camera snapshots</div>
                  </a>
                  <a href="/passbook-to-excel" className="block px-3 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200">
                    <div className="font-bold">Passbook to Excel</div>
                    <div className="text-[11px] text-slate-500">Dot-matrix &amp; branch printouts</div>
                  </a>
                  <a href="/bank-statement-reconciliation-excel" className="block px-3 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200">
                    <div className="font-bold">Reconciliation in Excel</div>
                    <div className="text-[11px] text-slate-500">Automated balance check</div>
                  </a>
                </div>
              )}
            </div>

            {/* Bank Hubs Dropdown */}
            <div className="relative" ref={banksMenuRef}>
              <button
                onClick={() => {
                  setIsBanksOpen(!isBanksOpen);
                  setIsToolsOpen(false);
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>Banks</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>
              {isBanksOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl border p-2 shadow-xl z-50 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 grid grid-cols-2 gap-1">
                  <a href="/banks/sbi" className="p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">SBI Bank</a>
                  <a href="/banks/hdfc" className="p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">HDFC Bank</a>
                  <a href="/banks/icici" className="p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">ICICI Bank</a>
                  <a href="/banks/axis" className="p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">Axis Bank</a>
                  <a href="/banks/kotak" className="p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">Kotak 811</a>
                  <a href="/banks/pnb" className="p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">PNB</a>
                  <a href="/banks/chase" className="p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">Chase Bank</a>
                  <a href="/banks/bank-of-america" className="p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">Bank of America</a>
                  <a href="/banks/wells-fargo" className="p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">Wells Fargo</a>
                  <a href="/banks/citi" className="p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">Citibank</a>
                  <a href="/banks/barclays" className="p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">Barclays</a>
                  <a href="/banks/hsbc" className="p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">HSBC</a>
                  <a href="/banks" className="col-span-2 p-2 rounded-xl text-xs hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold border-t border-slate-100 dark:border-slate-800 text-center">View All Supported Banks &rarr;</a>
                </div>
              )}
            </div>

            <a href="/bank-statement-to-quickbooks" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">QuickBooks</a>
            <a href="/bank-statement-to-xero-csv" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Xero</a>
            <a href="/for-accountants-and-bookkeepers" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">For Accountants</a>
            <a href="/pricing" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Pricing</a>
            <a href="/security" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Security</a>
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Share & Earn Credits Pill */}
          <button
            onClick={onOpenShareEarn}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all group cursor-pointer ${
              availableCredits <= 2
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25'
            }`}
            title="Share with friends to get +10 more conversions"
          >
            <Gift className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-12 transition-transform" />
            <span>
              <strong className="font-mono">{availableCredits}</strong> Free Convert{availableCredits !== 1 ? 's' : ''}
            </span>
            <span className="hidden lg:inline text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-extrabold uppercase">
              +10 Share
            </span>
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all relative cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200'
            }`}
            title="Conversion History"
          >
            <History className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] flex items-center justify-center font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-lg text-xs transition-all cursor-pointer ${
              isDarkMode
                ? 'hover:bg-slate-800 text-slate-300'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Conversion Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-lg text-xs transition-all cursor-pointer ${
              isDarkMode
                ? 'hover:bg-slate-800 text-amber-400'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Auth Profile Menu */}
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-xl border transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-800/90 border-slate-700 hover:border-sky-500/50'
                    : 'bg-slate-50 border-slate-200 hover:border-sky-500/50 shadow-xs'
                }`}
                title="Account Menu"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 rounded-full object-cover border border-sky-500/50"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                    {getInitials(user.displayName, user.email)}
                  </div>
                )}
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-[11px] font-bold leading-tight max-w-[100px] truncate text-slate-900 dark:text-slate-100">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-0.5">
                    <Database className="w-2.5 h-2.5" /> Supabase
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
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt="Avatar"
                          className="w-9 h-9 rounded-full object-cover border border-sky-500/50"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                          {getInitials(user.displayName, user.email)}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold truncate">
                          {user.displayName || 'Account User'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenPhoneVerify?.();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-500" />
                        <span>Phone Verification</span>
                      </div>
                      {credits?.phoneVerified || user.phoneVerified ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">
                          +15 cr
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenShareEarn();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-amber-500" />
                        <span>Share &amp; Earn Credits</span>
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
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sm shadow-sky-600/20 transition-all hover:scale-[1.02] cursor-pointer"
              title="Sign in with Email or Google"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Navigation Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg xl:hidden text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>

      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tools</div>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <a href="/pdf-bank-statement-to-excel" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:text-sky-600">PDF to Excel</a>
            <a href="/pdf-bank-statement-to-csv" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:text-sky-600">PDF to CSV</a>
            <a href="/scanned-bank-statement-to-excel" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:text-sky-600">Scanned OCR</a>
            <a href="/bank-statement-image-to-excel" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:text-sky-600">Image to Excel</a>
            <a href="/passbook-to-excel" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:text-sky-600">Passbook</a>
            <a href="/bank-statement-to-quickbooks" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:text-sky-600">QuickBooks</a>
          </div>

          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pt-2">Target Banks</div>
          <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
            <a href="/banks" className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold col-span-3 text-center">View All Supported Banks &rarr;</a>
            <a href="/banks/sbi" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:text-sky-600">SBI</a>
            <a href="/banks/hdfc" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:text-sky-600">HDFC</a>
            <a href="/banks/icici" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:text-sky-600">ICICI</a>
            <a href="/banks/chase" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:text-sky-600">Chase</a>
            <a href="/banks/bank-of-america" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:text-sky-600">BofA</a>
            <a href="/banks/wells-fargo" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:text-sky-600">Wells Fargo</a>
          </div>

          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pt-2">Company &amp; Guides</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <a href="/blog" className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 font-bold">Blog Guides</a>
            <a href="/pricing" className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800">Pricing</a>
            <a href="/security" className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800">Security</a>
            <a href="/privacy" className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800">Privacy</a>
            <a href="/terms" className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800">Terms</a>
            <a href="/about" className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800">About</a>
            <a href="/contact" className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800">Contact</a>
            <a href="/faq" className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800">FAQ</a>
          </div>
        </div>
      )}
    </header>
  );
};
