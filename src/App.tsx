import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { UploadZone } from './components/UploadZone';
import { StatementSummaryCard } from './components/StatementSummaryCard';
import { TransactionTable } from './components/TransactionTable';
import { ConversionSettingsModal } from './components/ConversionSettingsModal';
import { PrivacyModal } from './components/PrivacyModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { BatchProcessingModal } from './components/BatchProcessingModal';
import { ExtractedStatement, Transaction, ConversionSettings, DEFAULT_SETTINGS } from './types';
import { SAMPLE_STATEMENTS } from './data/sampleStatements';
import { 
  FileSpreadsheet, 
  Layers, 
  PlusCircle, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft,
  Trash2,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

const STORAGE_KEY_HISTORY = 'bank_converter_history_v1';
const STORAGE_KEY_SETTINGS = 'bank_converter_settings_v1';
const STORAGE_KEY_THEME = 'bank_converter_dark_theme';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Apply dark mode class to document
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, String(isDarkMode));
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (err) {
      console.error(err);
    }
  }, [isDarkMode]);

  // Conversion settings
  const [settings, setSettings] = useState<ConversionSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const handleSaveSettings = (newSettings: ConversionSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    } catch (err) {
      console.error(err);
    }
  };

  // History state
  const [history, setHistory] = useState<ExtractedStatement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) return JSON.parse(saved);
      // Pre-seed with the sample statements for immediate exploration
      return SAMPLE_STATEMENTS;
    } catch {
      return SAMPLE_STATEMENTS;
    }
  });

  const saveHistoryToStorage = (updatedHistory: ExtractedStatement[]) => {
    setHistory(updatedHistory);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));
    } catch (err) {
      console.error(err);
    }
  };

  // Active statements in current session
  const [statements, setStatements] = useState<ExtractedStatement[]>([SAMPLE_STATEMENTS[0]]);
  const [activeStatementId, setActiveStatementId] = useState<string | null>(SAMPLE_STATEMENTS[0].id);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);

  // Active statement object
  const activeStatement = useMemo(() => {
    return statements.find((s) => s.id === activeStatementId) || statements[0] || null;
  }, [statements, activeStatementId]);

  // Recalculate summary helper when transactions are edited
  const recalculateSummary = (statement: ExtractedStatement, updatedTransactions: Transaction[]): ExtractedStatement => {
    let totalDebits = 0;
    let totalCredits = 0;
    let flaggedCount = 0;

    updatedTransactions.forEach((tx) => {
      totalDebits += tx.debit;
      totalCredits += tx.credit;
      if (tx.isFlagged || (settings.highlightLowConfidence && tx.confidence < settings.confidenceThreshold)) {
        flaggedCount++;
      }
    });

    totalDebits = Number(totalDebits.toFixed(2));
    totalCredits = Number(totalCredits.toFixed(2));
    const netChange = Number((totalCredits - totalDebits).toFixed(2));
    const calculatedClosingBalance = Number((statement.summary.openingBalance + netChange).toFixed(2));
    const discrepancy = Math.abs(calculatedClosingBalance - statement.summary.closingBalance);
    const isBalanced = discrepancy <= 0.05 || (statement.summary.openingBalance === 0 && statement.summary.closingBalance === 0);

    return {
      ...statement,
      summary: {
        ...statement.summary,
        totalDebits,
        totalCredits,
        netChange,
        calculatedClosingBalance,
        totalTransactions: updatedTransactions.length,
        flaggedCount,
        reconciliationStatus: isBalanced ? 'balanced' : 'discrepancy',
        discrepancyAmount: isBalanced ? 0 : Number(discrepancy.toFixed(2)),
      },
      transactions: updatedTransactions,
    };
  };

  // Upload and process files
  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setGlobalError(null);
    setProcessingProgress(15);
    setProcessingStep(`Parsing ${files.length} statement file${files.length > 1 ? 's' : ''}...`);

    const newExtractedStatements: ExtractedStatement[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessingProgress(Math.round(((i + 1) / files.length) * 80));
      setProcessingStep(`Extracting ${file.name} (${i + 1}/${files.length})...`);

      try {
        // Read file as base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';

        const response = await fetch('/api/convert/process-statement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64Data,
            fileName: file.name,
            fileType: extension,
            mimeType: file.type,
            customSettings: settings,
          }),
        });

        const data = await response.json();

        if (data.success && data.statement) {
          newExtractedStatements.push(data.statement);
        } else {
          throw new Error(data.error || 'Failed to extract bank statement');
        }
      } catch (err: any) {
        console.error('File conversion error:', err);
        setGlobalError(`Error converting ${file.name}: ${err.message || 'Check document format'}`);
      }
    }

    setProcessingProgress(100);
    setProcessingStep('Conversion complete!');

    if (newExtractedStatements.length > 0) {
      setStatements((prev) => [...newExtractedStatements, ...prev]);
      setActiveStatementId(newExtractedStatements[0].id);

      // Append to history
      saveHistoryToStorage([...newExtractedStatements, ...history]);
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
    }

    setTimeout(() => {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingStep('');
    }, 600);
  };

  // Load a sample statement
  const handleLoadSample = (sample: ExtractedStatement) => {
    // Generate fresh ID to prevent collision if added repeatedly
    const freshSample: ExtractedStatement = {
      ...sample,
      id: `sample-${Date.now()}`,
      uploadDate: new Date().toISOString(),
    };

    setStatements((prev) => [freshSample, ...prev]);
    setActiveStatementId(freshSample.id);
    saveHistoryToStorage([freshSample, ...history]);
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
  };

  // Auto reconcile discrepancy by adjusting closing balance
  const handleAutoReconcile = () => {
    if (!activeStatement) return;
    const balancedStatement: ExtractedStatement = {
      ...activeStatement,
      summary: {
        ...activeStatement.summary,
        closingBalance: activeStatement.summary.calculatedClosingBalance,
        reconciliationStatus: 'balanced',
        discrepancyAmount: 0,
      },
    };

    setStatements((prev) => prev.map((s) => (s.id === activeStatement.id ? balancedStatement : s)));
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.85 } });
  };

  // Transaction row updates
  const handleUpdateTransaction = (updatedTx: Transaction) => {
    if (!activeStatement) return;
    const newTxList = activeStatement.transactions.map((tx) => (tx.id === updatedTx.id ? updatedTx : tx));
    const updated = recalculateSummary(activeStatement, newTxList);
    setStatements((prev) => prev.map((s) => (s.id === activeStatement.id ? updated : s)));
  };

  const handleDeleteTransactions = (idsToDelete: string[]) => {
    if (!activeStatement) return;
    const idSet = new Set(idsToDelete);
    const newTxList = activeStatement.transactions.filter((tx) => !idSet.has(tx.id));
    const updated = recalculateSummary(activeStatement, newTxList);
    setStatements((prev) => prev.map((s) => (s.id === activeStatement.id ? updated : s)));
  };

  const handleAddTransaction = (newTx: Transaction) => {
    if (!activeStatement) return;
    const newTxList = [newTx, ...activeStatement.transactions];
    const updated = recalculateSummary(activeStatement, newTxList);
    setStatements((prev) => prev.map((s) => (s.id === activeStatement.id ? updated : s)));
  };

  const handleBatchUpdateCategory = (ids: string[], newCategory: string) => {
    if (!activeStatement) return;
    const idSet = new Set(ids);
    const newTxList = activeStatement.transactions.map((tx) =>
      idSet.has(tx.id) ? { ...tx, category: newCategory, isModified: true } : tx
    );
    const updated = recalculateSummary(activeStatement, newTxList);
    setStatements((prev) => prev.map((s) => (s.id === activeStatement.id ? updated : s)));
  };

  const handleRemoveStatementFromSession = (id: string) => {
    const nextStatements = statements.filter((s) => s.id !== id);
    setStatements(nextStatements);
    if (activeStatementId === id) {
      setActiveStatementId(nextStatements[0]?.id || null);
    }
  };

  const handleClearAllLocalData = () => {
    setHistory([]);
    setStatements([]);
    setActiveStatementId(null);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* Top Navbar */}
      <Navbar
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        statements={statements}
        activeStatementId={activeStatementId}
        onSelectStatement={(id) => setActiveStatementId(id)}
        historyCount={history.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Error Alert if any */}
        {globalError && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{globalError}</span>
            </div>
            <button onClick={() => setGlobalError(null)} className="text-rose-500 hover:text-rose-700 font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Upload & Sample Section */}
        <UploadZone
          onFilesSelected={handleFilesSelected}
          onLoadSample={handleLoadSample}
          isProcessing={isProcessing}
          processingProgress={processingProgress}
          processingStep={processingStep}
          isDarkMode={isDarkMode}
        />

        {/* Active Statement Editor & Financial Breakdown */}
        {activeStatement ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Batch Navigation Strip if multiple statements are active */}
            {statements.length > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  <span className="font-bold text-slate-500 shrink-0">Batch Statements:</span>
                  {statements.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setActiveStatementId(st.id)}
                      className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                        st.id === activeStatement.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {st.summary.bankName || st.fileName} ({st.transactions.length})
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsBatchOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Batch Export & ZIP</span>
                  </button>

                  <button
                    onClick={() => handleRemoveStatementFromSession(activeStatement.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-md"
                    title="Close active statement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Statement Summary Card */}
            <StatementSummaryCard
              statement={activeStatement}
              settings={settings}
              isDarkMode={isDarkMode}
              onAutoReconcile={handleAutoReconcile}
              onAddTransaction={() => {}}
            />

            {/* Interactive Spreadsheet & Transactions Table */}
            <TransactionTable
              transactions={activeStatement.transactions}
              currencySymbol={activeStatement.summary.currencySymbol}
              settings={settings}
              isDarkMode={isDarkMode}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransactions={handleDeleteTransactions}
              onAddTransaction={handleAddTransaction}
              onBatchUpdateCategory={handleBatchUpdateCategory}
            />

          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-emerald-500/50" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No statement currently loaded
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload your bank statement PDF, scanned passbook image, or spreadsheet above to begin.
            </p>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className={`border-t py-6 text-xs transition-colors ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Bank Statement Converter
            </span>
            <span>&bull;</span>
            <span>Zero-Retention Financial OCR Engine</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPrivacyOpen(true)}
              className="hover:underline text-slate-600 dark:text-slate-400"
            >
              Privacy & Security Policy
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:underline text-slate-600 dark:text-slate-400"
            >
              Preferences
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ConversionSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        isDarkMode={isDarkMode}
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        onClearAllLocalData={handleClearAllLocalData}
        isDarkMode={isDarkMode}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectStatement={(st) => {
          setStatements((prev) => (prev.some((p) => p.id === st.id) ? prev : [st, ...prev]));
          setActiveStatementId(st.id);
        }}
        onDeleteHistoryItem={(id) => {
          saveHistoryToStorage(history.filter((h) => h.id !== id));
        }}
        onClearHistory={() => saveHistoryToStorage([])}
        settings={settings}
        isDarkMode={isDarkMode}
      />

      <BatchProcessingModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        statements={statements}
        activeStatementId={activeStatementId}
        onSelectStatement={(id) => setActiveStatementId(id)}
        onRemoveStatement={handleRemoveStatementFromSession}
        settings={settings}
        isDarkMode={isDarkMode}
      />

    </div>
  );
}
