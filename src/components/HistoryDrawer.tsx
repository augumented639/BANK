import React from 'react';
import { 
  History, 
  X, 
  Trash2, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Building2, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Clock
} from 'lucide-react';
import { ExtractedStatement, ConversionSettings } from '../types';
import { formatCurrency, exportToExcel, exportToCSV, exportToPDF } from '../utils/exportUtils';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: ExtractedStatement[];
  onSelectStatement: (statement: ExtractedStatement) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  settings: ConversionSettings;
  isDarkMode: boolean;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectStatement,
  onDeleteHistoryItem,
  onClearHistory,
  settings,
  isDarkMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-md h-full flex flex-col border-l shadow-2xl transition-all ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Conversion History</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {history.length} converted statement{history.length !== 1 ? 's' : ''} saved locally
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of History Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto opacity-40 text-teal-500" />
              <p className="text-xs">No converted statements in history yet.</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all hover:border-teal-500/50 ${
                  isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.summary.bankName}
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteHistoryItem(item.id)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="truncate max-w-[200px]">{item.fileName}</span>
                  <span className="font-mono">
                    {item.transactions.length} rows &bull; {item.summary.currency} ({item.summary.currencySymbol})
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.uploadDate).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Re-export shortcuts */}
                    <button
                      onClick={() => exportToExcel(item, settings)}
                      className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      title="Quick export to Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => exportToPDF(item, settings)}
                      className="p-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                      title="Quick export to PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Open in editor */}
                    <button
                      onClick={() => {
                        onSelectStatement(item);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-all ml-1"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={onClearHistory}
              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
