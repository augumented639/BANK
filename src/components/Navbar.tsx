import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Settings, 
  History, 
  Sun, 
  Moon, 
  FileSpreadsheet,
  Lock,
  Layers
} from 'lucide-react';
import { ExtractedStatement } from '../types';

interface NavbarProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
  onOpenHistory: () => void;
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
  statements,
  activeStatementId,
  onSelectStatement,
  historyCount,
}) => {
  return (
    <header className={`sticky top-0 z-40 w-full border-b transition-colors ${
      isDarkMode 
        ? 'bg-slate-900/95 border-slate-800 text-slate-100 backdrop-blur' 
        : 'bg-white/95 border-slate-200 text-slate-900 backdrop-blur'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
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
          {/* Privacy & Security Modal Button */}
          <button
            onClick={onOpenPrivacy}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isDarkMode
                ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200'
            }`}
            title="Privacy Guarantee & Zero-Retention Security"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Privacy & Security</span>
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
        </div>

      </div>
    </header>
  );
};
