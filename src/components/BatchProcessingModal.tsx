import React, { useState } from 'react';
import { 
  Layers, 
  X, 
  Download, 
  Archive, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  ArrowRight,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { ExtractedStatement, ConversionSettings } from '../types';
import { formatCurrency, exportBatchToZIP } from '../utils/exportUtils';
import confetti from 'canvas-confetti';

interface BatchProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  statements: ExtractedStatement[];
  activeStatementId: string | null;
  onSelectStatement: (id: string) => void;
  onRemoveStatement: (id: string) => void;
  settings: ConversionSettings;
  isDarkMode: boolean;
}

export const BatchProcessingModal: React.FC<BatchProcessingModalProps> = ({
  isOpen,
  onClose,
  statements,
  activeStatementId,
  onSelectStatement,
  onRemoveStatement,
  settings,
  isDarkMode,
}) => {
  const [zipFormat, setZipFormat] = useState<'xlsx' | 'csv' | 'all'>('xlsx');
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  // Calculate batch aggregates
  const aggregate = statements.reduce(
    (acc, st) => {
      acc.totalRows += st.transactions.length;
      acc.totalDebits += st.summary.totalDebits;
      acc.totalCredits += st.summary.totalCredits;
      if (st.summary.reconciliationStatus === 'balanced') acc.balancedCount++;
      return acc;
    },
    { totalRows: 0, totalDebits: 0, totalCredits: 0, balancedCount: 0 }
  );

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await exportBatchToZIP(statements, zipFormat, settings);
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
    } catch (err) {
      console.error('ZIP export error:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl rounded-2xl border p-6 sm:p-7 shadow-2xl transition-all ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold">Batch Statement Management</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {statements.length} statements loaded &bull; {aggregate.totalRows} combined transactions
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregates Banner */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className={`p-3 rounded-xl border ${
            isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Statements</span>
            <div className="text-base font-bold mt-0.5">{statements.length} Files</div>
            <span className="text-[10px] text-emerald-500">{aggregate.balancedCount} Balanced</span>
          </div>

          <div className={`p-3 rounded-xl border ${
            isDarkMode ? 'bg-rose-950/20 border-rose-900/30' : 'bg-rose-50/50 border-rose-100'
          }`}>
            <span className="text-[10px] font-bold text-rose-500 uppercase">Total Debits</span>
            <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
              {formatCurrency(aggregate.totalDebits)}
            </div>
            <span className="text-[10px] text-slate-400">{aggregate.totalRows} rows</span>
          </div>

          <div className={`p-3 rounded-xl border ${
            isDarkMode ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-emerald-50/50 border-emerald-100'
          }`}>
            <span className="text-[10px] font-bold text-emerald-500 uppercase">Total Credits</span>
            <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(aggregate.totalCredits)}
            </div>
            <span className="text-[10px] text-emerald-500">Deposits</span>
          </div>
        </div>

        {/* Statements List */}
        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {statements.map((st) => {
            const isActive = st.id === activeStatementId;
            return (
              <div
                key={st.id}
                onClick={() => {
                  onSelectStatement(st.id);
                  onClose();
                }}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : isDarkMode
                    ? 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {st.summary.bankName}
                      </span>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {st.fileName} &bull; {st.transactions.length} rows &bull; {st.summary.currency} ({st.summary.currencySymbol})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveStatement(st.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Remove from batch"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>

        {/* ZIP Export Options & Action */}
        <div className="pt-5 mt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400">ZIP File Format:</span>
            <select
              value={zipFormat}
              onChange={(e) => setZipFormat(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium"
            >
              <option value="xlsx">Excel (.xlsx) Workbooks</option>
              <option value="csv">CSV Spreadsheets</option>
              <option value="all">Both Excel & CSV</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Close
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all"
            >
              <Archive className="w-4 h-4" />
              <span>{isZipping ? 'Archiving...' : 'Download All as ZIP'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
