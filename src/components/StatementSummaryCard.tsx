import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  User, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowDownRight, 
  ArrowUpRight, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Copy, 
  Check,
  Sparkles,
  Wrench
} from 'lucide-react';
import { ExtractedStatement, ConversionSettings } from '../types';
import { formatCurrency, exportToExcel, exportToCSV, exportToPDF } from '../utils/exportUtils';
import confetti from 'canvas-confetti';

interface StatementSummaryCardProps {
  statement: ExtractedStatement;
  settings: ConversionSettings;
  isDarkMode: boolean;
  onAutoReconcile: () => void;
  onAddTransaction: () => void;
}

export const StatementSummaryCard: React.FC<StatementSummaryCardProps> = ({
  statement,
  settings,
  isDarkMode,
  onAutoReconcile,
  onAddTransaction,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const { summary } = statement;
  const sym = summary.currencySymbol;

  const handleExportExcel = () => {
    exportToExcel(statement, settings);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.85 } });
  };

  const handleExportCSV = () => {
    exportToCSV(statement, settings);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.85 } });
  };

  const handleExportPDF = () => {
    exportToPDF(statement, settings);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.85 } });
  };

  const handleCopySummary = () => {
    const text = `
Bank: ${summary.bankName}
Account Holder: ${summary.accountHolder || 'N/A'}
Account: ${summary.accountNumber || 'N/A'}
Period: ${summary.statementPeriod || 'N/A'}
Opening Balance: ${formatCurrency(summary.openingBalance, sym)}
Total Credits (+): ${formatCurrency(summary.totalCredits, sym)}
Total Debits (-): ${formatCurrency(summary.totalDebits, sym)}
Net Flow: ${formatCurrency(summary.netChange, sym)}
Closing Balance: ${formatCurrency(summary.closingBalance, sym)}
Transactions Count: ${summary.totalTransactions}
    `.trim();

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 transition-all ${
      isDarkMode 
        ? 'bg-slate-900/90 border-slate-800 shadow-xl' 
        : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Top row: Bank Info & Export Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        
        {/* Bank & Account Details */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
            <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {summary.bankName || 'Bank Statement'}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {summary.currency} ({sym})
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {statement.fileName}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {summary.accountHolder && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {summary.accountHolder}
                </span>
              )}
              {summary.accountNumber && (
                <span className="flex items-center gap-1 font-mono">
                  <CreditCard className="w-3.5 h-3.5" />
                  {summary.accountNumber}
                </span>
              )}
              {summary.statementPeriod && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {summary.statementPeriod}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Export Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 transition-all hover:scale-[1.02]"
            title="Download formatted Excel Spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all hover:scale-[1.02] ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Download CSV Spreadsheet (.csv)"
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all hover:scale-[1.02] ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Download Executive PDF Ledger Report (.pdf)"
          >
            <Download className="w-4 h-4 text-rose-500" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleCopySummary}
            className={`p-2 rounded-xl text-xs border transition-all ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
            title="Copy Summary Text to Clipboard"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Financial Metrics Strip (4 key pillars) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
        
        {/* 1. Opening Balance */}
        <div className={`p-4 rounded-xl border ${
          isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
        }`}>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Opening Balance
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(summary.openingBalance, sym)}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
            Initial cycle state
          </span>
        </div>

        {/* 2. Total Debits (-) */}
        <div className={`p-4 rounded-xl border ${
          isDarkMode ? 'bg-rose-950/10 border-rose-900/30' : 'bg-rose-50/50 border-rose-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Total Debits (-)
            </span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(summary.totalDebits, sym)}
          </div>
          <span className="text-[11px] text-rose-500/70 block mt-0.5">
            Withdrawals & charges
          </span>
        </div>

        {/* 3. Total Credits (+) */}
        <div className={`p-4 rounded-xl border ${
          isDarkMode ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-emerald-50/50 border-emerald-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Total Credits (+)
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(summary.totalCredits, sym)}
          </div>
          <span className="text-[11px] text-emerald-600/70 block mt-0.5">
            Deposits & income
          </span>
        </div>

        {/* 4. Closing Balance */}
        <div className={`p-4 rounded-xl border ${
          isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
        }`}>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Closing Balance
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(summary.closingBalance, sym)}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[11px] font-medium ${
              summary.netChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              Net: {summary.netChange >= 0 ? '+' : ''}{formatCurrency(summary.netChange, sym)}
            </span>
          </div>
        </div>

      </div>

      {/* Reconciliation Status Banner */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {summary.reconciliationStatus === 'balanced' ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              <strong>Reconciliation Verified:</strong> Opening Balance ({formatCurrency(summary.openingBalance, sym)}) + Credits ({formatCurrency(summary.totalCredits, sym)}) - Debits ({formatCurrency(summary.totalDebits, sym)}) = Exact Closing ({formatCurrency(summary.closingBalance, sym)})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Discrepancy of {formatCurrency(summary.discrepancyAmount || 0, sym)}:</strong> Calculated closing ({formatCurrency(summary.calculatedClosingBalance, sym)}) differs from extracted closing ({formatCurrency(summary.closingBalance, sym)}).
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {summary.reconciliationStatus !== 'balanced' && (
            <button
              onClick={onAutoReconcile}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Auto-Reconcile Balance</span>
            </button>
          )}

          <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
            Engine: {statement.layoutDetected}
          </span>
        </div>
      </div>

    </div>
  );
};
