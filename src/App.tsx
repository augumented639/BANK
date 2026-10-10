import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { UploadZone } from './components/UploadZone';
import { StatementSummaryCard } from './components/StatementSummaryCard';
import { TransactionTable } from './components/TransactionTable';
import { ConversionSettingsModal } from './components/ConversionSettingsModal';
import { PrivacyModal } from './components/PrivacyModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { BatchProcessingModal } from './components/BatchProcessingModal';
import { ShareEarnModal } from './components/ShareEarnModal';
import { AuthModal } from './components/AuthModal';
import { PhoneVerificationModal } from './components/PhoneVerificationModal';
import { 
  ExtractedStatement, 
  Transaction, 
  ConversionSettings, 
  DEFAULT_SETTINGS,
  UserCredits,
  INITIAL_USER_CREDITS
} from './types';
import { 
  FileSpreadsheet, 
  Layers, 
  AlertCircle, 
  Trash2,
  Database,
  CheckCircle2,
  Gift,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Cookie,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  AppUser,
  onSupabaseAuthStateChange,
  signOutUser,
  syncUserProfileToSupabase,
  loadUserCreditsFromSupabase,
  syncStatementToSupabase,
  clearStatementsFromSupabase,
  getCurrentSupabaseUser
} from './lib/supabase';
import { 
  ALL_SEO_PAGES, 
  getPageByPath, 
  CORE_PAGES, 
  BRAND_NAME, 
  SUPPORT_EMAIL, 
  DOMAIN,
  SeoPageData 
} from './data/seoPages';
import { trackEvent, getCookieConsent, setCookieConsent } from './utils/analytics';

const STORAGE_KEY_HISTORY = 'bank_converter_history_v1';
const STORAGE_KEY_SETTINGS = 'bank_converter_settings_v1';
const STORAGE_KEY_THEME = 'bank_converter_dark_theme';
const STORAGE_KEY_CREDITS = 'bank_converter_credits_v1';

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

  // Current client-side route pathname
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  // Cookie consent banner state
  const [showCookieBanner, setShowCookieBanner] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bank_converter_cookie_consent') === null;
    }
    return false;
  });

  // Listen to popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Intercept standard anchor links for client-side navigation
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (
        href && 
        href.startsWith('/') && 
        !href.startsWith('/api') && 
        !href.startsWith('//') && 
        !e.ctrlKey && 
        !e.metaKey && 
        !e.shiftKey
      ) {
        e.preventDefault();
        window.history.pushState({}, '', href);
        setCurrentPath(href);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  // Get active SEO metadata matching route
  const activeSeoPage: SeoPageData = useMemo(() => {
    return getPageByPath(currentPath) || CORE_PAGES.home;
  }, [currentPath]);

  // Auth state
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authNotification, setAuthNotification] = useState<string | null>(null);

  // Referral Notification
  const [referralNotification, setReferralNotification] = useState<string | null>(null);

  // Conversion credits state (10 free conversions for new users)
  const [userCredits, setUserCredits] = useState<UserCredits>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CREDITS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.referralCode) {
          parsed.referralCode = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        return parsed;
      }
      return {
        ...INITIAL_USER_CREDITS,
        referralCode: 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      };
    } catch {
      return {
        ...INITIAL_USER_CREDITS,
        referralCode: 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      };
    }
  });

  const saveCredits = (updatedCredits: UserCredits, currentUser?: AppUser | null) => {
    setUserCredits(updatedCredits);
    try {
      localStorage.setItem(STORAGE_KEY_CREDITS, JSON.stringify(updatedCredits));
    } catch (err) {
      console.error(err);
    }
    const targetUser = currentUser !== undefined ? currentUser : user;
    if (targetUser) {
      syncUserProfileToSupabase(targetUser.id, {
        email: targetUser.email,
        displayName: targetUser.displayName,
        credits: updatedCredits,
      });
    }
  };

  const handleClaimShareReward = (creditsToAdd: number = 10) => {
    const updatedCredits: UserCredits = {
      ...userCredits,
      availableCredits: userCredits.availableCredits + creditsToAdd,
      totalEarned: userCredits.totalEarned + creditsToAdd,
      sharesCount: userCredits.sharesCount + 1,
      lastShareVerificationDate: new Date().toISOString(),
      lastClaimDate: new Date().toISOString(),
    };
    saveCredits(updatedCredits);
    trackEvent('share_click', { credits_awarded: creditsToAdd });
  };

  // Process incoming referral query parameter ?ref=...
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const incomingRef = params.get('ref');
      
      if (incomingRef && incomingRef !== userCredits.referralCode && !userCredits.claimedReferralBonus) {
        fetch('/api/referral/register-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referralCode: incomingRef,
            visitorId: userCredits.referralCode || 'vis-' + Math.random().toString(36).substring(2, 8),
          }),
        }).catch((err) => console.warn('Referral registration ping failed:', err));

        // Award +5 bonus conversions to the referred user (total 15 initial conversions)
        const bonusCredits: UserCredits = {
          ...userCredits,
          availableCredits: userCredits.availableCredits + 5,
          totalEarned: userCredits.totalEarned + 5,
          claimedReferralBonus: true,
        };
        saveCredits(bonusCredits);
        setReferralNotification(`Welcome! You joined using referral code ${incomingRef}. +5 Bonus Conversion Credits added!`);
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
      }
    } catch (e) {
      console.warn('Failed to parse referral URL:', e);
    }
  }, []);

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
      return [];
    } catch {
      return [];
    }
  });

  const saveHistory = (updatedHistory: ExtractedStatement[], currentUser?: AppUser | null) => {
    setHistory(updatedHistory);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));
    } catch (err) {
      console.error(err);
    }
  };

  // Listen to Supabase Auth state
  useEffect(() => {
    getCurrentSupabaseUser().then((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
    });

    const subscription = onSupabaseAuthStateChange(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthNotification(`Welcome back, ${currentUser.displayName || currentUser.email}!`);
        setTimeout(() => setAuthNotification(null), 4000);

        const cloudCredits = await loadUserCreditsFromSupabase(currentUser.id);
        if (cloudCredits) {
          const merged: UserCredits = {
            availableCredits: Math.max(cloudCredits.availableCredits ?? 10, userCredits.availableCredits ?? 10),
            totalEarned: Math.max(cloudCredits.totalEarned ?? 10, userCredits.totalEarned ?? 10),
            totalUsed: Math.max(cloudCredits.totalUsed ?? 0, userCredits.totalUsed ?? 0),
            sharesCount: Math.max(cloudCredits.sharesCount ?? 0, userCredits.sharesCount ?? 0),
            lastClaimDate: cloudCredits.lastClaimDate || userCredits.lastClaimDate,
            referralCode: userCredits.referralCode || cloudCredits.referralCode || 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
            referredUsersCount: Math.max(cloudCredits.referredUsersCount ?? 0, userCredits.referredUsersCount ?? 0),
            claimedReferralBonus: userCredits.claimedReferralBonus || cloudCredits.claimedReferralBonus || false,
          };
          saveCredits(merged, currentUser);
        } else {
          syncUserProfileToSupabase(currentUser.id, {
            email: currentUser.email,
            displayName: currentUser.displayName,
            credits: userCredits,
          });
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await signOutUser();
    setUser(null);
    setAuthNotification('Signed out successfully.');
    setTimeout(() => setAuthNotification(null), 3000);
  };

  // Active statements in session
  const [statements, setStatements] = useState<ExtractedStatement[]>([]);
  const [activeStatementId, setActiveStatementId] = useState<string | null>(null);

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
  const [isShareEarnOpen, setIsShareEarnOpen] = useState(false);
  const [isPhoneVerifyOpen, setIsPhoneVerifyOpen] = useState(false);

  // Handle phone verification success
  const handlePhoneVerificationSuccess = (phoneNumber: string, bonusGranted: boolean) => {
    const wasAlreadyVerified = userCredits.phoneVerified;
    const bonusAmount = (!wasAlreadyVerified && bonusGranted) ? 15 : 0;
    
    const updatedCredits: UserCredits = {
      ...userCredits,
      phoneNumber: phoneNumber,
      phoneVerified: true,
      availableCredits: userCredits.availableCredits + bonusAmount,
      totalEarned: userCredits.totalEarned + bonusAmount,
    };

    saveCredits(updatedCredits);

    if (user) {
      setUser({
        ...user,
        phoneNumber: phoneNumber,
        phoneVerified: true,
      });
      syncUserProfileToSupabase(user.id, {
        email: user.email,
        displayName: user.displayName,
        phoneNumber: phoneNumber,
        phoneVerified: true,
        credits: updatedCredits,
      });
    }

    setAuthNotification(`Phone number ${phoneNumber} successfully verified with Twilio! ${bonusAmount > 0 ? '+15 Bonus Credits Added!' : ''}`);
    setTimeout(() => setAuthNotification(null), 5000);
  };

  // Active statement object
  const activeStatement = useMemo(() => {
    return statements.find((s) => s.id === activeStatementId) || statements[0] || null;
  }, [statements, activeStatementId]);

  // Recalculate summary helper
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
        discrepancyAmount: isBalanced ? 0 : discrepancy,
      },
      transactions: updatedTransactions,
    };
  };

  // Convert files handler
  const handleProcessFiles = async (files: File[]) => {
    if (files.length === 0) return;

    if (userCredits.availableCredits < files.length) {
      setGlobalError(
        `Insufficient conversion credits. You have ${userCredits.availableCredits} credit(s) available for ${files.length} file(s). Share with friends to get +10 more free conversions!`
      );
      setIsShareEarnOpen(true);
      return;
    }

    trackEvent('upload_start', { file_count: files.length });

    setIsProcessing(true);
    setProcessingProgress(10);
    setProcessingStep('Analyzing statement documents...');
    setGlobalError(null);

    const newExtractedStatements: ExtractedStatement[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progressBase = Math.round((i / files.length) * 80) + 10;
      setProcessingProgress(progressBase);
      setProcessingStep(`Parsing ${file.name} (${i + 1}/${files.length})...`);

      try {
        // Read file as base64 for backend AI extraction
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await fetch('/api/convert/process-statement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64Data,
            fileName: file.name,
            fileType: file.name.split('.').pop()?.toLowerCase() || 'pdf',
            mimeType: file.type || 'application/pdf',
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned error ${response.status}`);
        }

        const data = await response.json();
        if (data.statement) {
          newExtractedStatements.push(data.statement);
          if (user) {
            syncStatementToSupabase(user.id, data.statement);
          }
        } else {
          throw new Error('Invalid statement payload from server');
        }
      } catch (err: any) {
        console.warn(`Local client OCR fallback parsing for ${file.name}:`, err);
        
        const { parseFileLocally } = await import('./utils/ocrFallbackParser');
        const fallbackData = await parseFileLocally(file, settings);
        newExtractedStatements.push(fallbackData);

        if (user) {
          syncStatementToSupabase(user.id, fallbackData);
        }
      }
    }

    setProcessingProgress(100);
    setProcessingStep('Conversion complete!');

    if (newExtractedStatements.length > 0) {
      const usedCount = newExtractedStatements.length;
      const updatedCredits: UserCredits = {
        ...userCredits,
        availableCredits: Math.max(0, userCredits.availableCredits - usedCount),
        totalUsed: userCredits.totalUsed + usedCount,
      };
      saveCredits(updatedCredits);

      setStatements((prev) => [...newExtractedStatements, ...prev]);
      setActiveStatementId(newExtractedStatements[0].id);

      saveHistory([...newExtractedStatements, ...history]);
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
      trackEvent('convert_success', { count: newExtractedStatements.length });
    }

    setTimeout(() => {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingStep('');
    }, 600);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    if (!activeStatement) return;
    const newTxList = activeStatement.transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t));
    const updated = recalculateSummary(activeStatement, newTxList);
    setStatements((prev) => prev.map((s) => (s.id === activeStatement.id ? updated : s)));
    if (user) {
      syncStatementToSupabase(user.id, updated);
    }
  };

  const handleAutoReconcile = () => {
    if (!activeStatement) return;
    const verifiedTxList = activeStatement.transactions.map((tx) => ({
      ...tx,
      isFlagged: false,
      confidence: Math.max(tx.confidence, 0.95),
    }));
    const updated = recalculateSummary(activeStatement, verifiedTxList);
    setStatements((prev) => prev.map((s) => (s.id === activeStatement.id ? updated : s)));
  };

  const handleDeleteTransactions = (idsToDelete: string[]) => {
    if (!activeStatement) return;
    const idSet = new Set(idsToDelete);
    const newTxList = activeStatement.transactions.filter((tx) => !idSet.has(tx.id));
    const updated = recalculateSummary(activeStatement, newTxList);
    setStatements((prev) => prev.map((s) => (s.id === activeStatement.id ? updated : s)));
    if (user) {
      syncStatementToSupabase(user.id, updated);
    }
  };

  const handleAddTransaction = (newTx: Transaction) => {
    if (!activeStatement) return;
    const newTxList = [newTx, ...activeStatement.transactions];
    const updated = recalculateSummary(activeStatement, newTxList);
    setStatements((prev) => prev.map((s) => (s.id === activeStatement.id ? updated : s)));
    if (user) {
      syncStatementToSupabase(user.id, updated);
    }
  };

  const handleBatchUpdateCategory = (ids: string[], newCategory: string) => {
    if (!activeStatement) return;
    const idSet = new Set(ids);
    const newTxList = activeStatement.transactions.map((tx) =>
      idSet.has(tx.id) ? { ...tx, category: newCategory, isModified: true } : tx
    );
    const updated = recalculateSummary(activeStatement, newTxList);
    setStatements((prev) => prev.map((s) => (s.id === activeStatement.id ? updated : s)));
    if (user) {
      syncStatementToSupabase(user.id, updated);
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
    if (user) {
      clearStatementsFromSupabase(user.id);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Top Navbar with Real Links and Controls */}
      <Navbar
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenShareEarn={() => setIsShareEarnOpen(true)}
        onOpenPhoneVerify={() => setIsPhoneVerifyOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        user={user}
        credits={userCredits}
        statements={statements}
        activeStatementId={activeStatementId}
        onSelectStatement={(id) => setActiveStatementId(id)}
        historyCount={history.length}
      />

      {/* Auth Notification Toast */}
      {authNotification && (
        <div className="fixed top-20 right-4 z-50 p-3.5 rounded-xl bg-sky-600 text-white text-xs font-semibold shadow-xl shadow-sky-600/30 flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
          <Database className="w-4 h-4" />
          <span>{authNotification}</span>
        </div>
      )}

      {/* Referral Notification Toast */}
      {referralNotification && (
        <div className="fixed top-20 left-4 z-50 p-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-sky-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
          <Gift className="w-4 h-4" />
          <span>{referralNotification}</span>
          <button onClick={() => setReferralNotification(null)} className="ml-2 text-white/80 hover:text-white cursor-pointer">&times;</button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Breadcrumb Navigation on Inner Pages */}
        {activeSeoPage.breadcrumbs && activeSeoPage.breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="text-xs text-slate-600 dark:text-slate-400">
            <ol className="flex flex-wrap items-center gap-1.5">
              {activeSeoPage.breadcrumbs.map((b, idx, arr) => (
                <li key={`${b.path}-${idx}`} className="inline-flex items-center">
                  {idx > 0 && <span className="mx-1.5 text-slate-400">/</span>}
                  {idx === arr.length - 1 ? (
                    <span className="font-semibold text-slate-900 dark:text-white">{b.name}</span>
                  ) : (
                    <a href={b.path} className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                      {b.name}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto space-y-3">
          {activeSeoPage.heroBadge && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
              <span>★</span>
              <span>{activeSeoPage.heroBadge}</span>
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {activeSeoPage.h1}
          </h1>
          {activeSeoPage.introParagraphs.map((p, i) => (
            <p key={i} className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{globalError}</p>
            </div>
            <button
              onClick={() => setGlobalError(null)}
              className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Interactive Converter Workspace */}
        {activeStatement ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveStatementId(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  &larr; Upload Another Statement
                </button>
              </div>

              <button
                onClick={() => setIsBatchOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Batch Processing</span>
              </button>
            </div>

            {/* Summary & Bank Details Card */}
            <StatementSummaryCard
              statement={activeStatement}
              settings={settings}
              isDarkMode={isDarkMode}
              onAutoReconcile={handleAutoReconcile}
            />

            {/* Interactive Spreadsheet & Data Grid */}
            <TransactionTable
              statement={activeStatement}
              settings={settings}
              isDarkMode={isDarkMode}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransactions={handleDeleteTransactions}
              onAddTransaction={handleAddTransaction}
              onBatchUpdateCategory={handleBatchUpdateCategory}
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <UploadZone
              onProcessFiles={handleProcessFiles}
              isProcessing={isProcessing}
              processingProgress={processingProgress}
              processingStep={processingStep}
              isDarkMode={isDarkMode}
              credits={userCredits}
              availableCredits={userCredits.availableCredits}
              onOpenShareEarn={() => setIsShareEarnOpen(true)}
              hasActiveStatements={statements.length > 0}
            />
          </div>
        )}

        {/* Bank Specific Details Box if viewing a bank page */}
        {activeSeoPage.bankDetails && (
          <div className="p-6 rounded-2xl border border-sky-500/30 bg-sky-500/5 dark:bg-sky-950/20 max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              {activeSeoPage.h1} &mdash; Layout &amp; Password Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <strong>Jurisdiction / Currency:</strong> {activeSeoPage.bankDetails.country} ({activeSeoPage.bankDetails.currency})
              </div>
              <div>
                <strong>Default Date Notation:</strong> {activeSeoPage.bankDetails.defaultDateFormat}
              </div>
              <div className="md:col-span-2">
                <strong>Statement Layout:</strong> {activeSeoPage.bankDetails.statementLayoutNotes}
              </div>
              <div className="md:col-span-2">
                <strong>Password Pattern:</strong> {activeSeoPage.bankDetails.passwordConventionHelp}
              </div>
              <div className="md:col-span-2">
                <strong>Extracted Columns:</strong> {activeSeoPage.bankDetails.columnOrder.join(' • ')}
              </div>
            </div>
          </div>
        )}

        {/* How It Works Section */}
        <section className="my-12 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
            How It Works: Step-by-Step Conversion
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeSeoPage.howItWorksSteps.map((step) => (
              <div key={step.step} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white font-bold flex items-center justify-center text-sm mb-3">
                  {step.step}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Key Features Section */}
        <section className="my-12 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
            Key Features &amp; Financial Precision
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeSeoPage.keyFeatures.map((f, i) => (
              <div key={i} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Security & In-Memory Guarantee */}
        <section className="my-12 p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
            Security &amp; In-Memory Ephemeral Processing Guarantee
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
            {activeSeoPage.securityNote}
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5"><span className="text-emerald-500 font-bold">&check;</span> Zero Server Disk Retention</span>
            <span className="inline-flex items-center gap-1.5"><span className="text-emerald-500 font-bold">&check;</span> Formula Injection Sanitized</span>
            <span className="inline-flex items-center gap-1.5"><span className="text-emerald-500 font-bold">&check;</span> End-to-End TLS Encryption</span>
            <span className="inline-flex items-center gap-1.5"><span className="text-emerald-500 font-bold">&check;</span> Local Browser History Storage</span>
          </div>
        </section>

        {/* Visible Frequently Asked Questions */}
        <section className="my-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {activeSeoPage.faqs.map((faq, i) => (
              <div key={i} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">{faq.question}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Conversion Tools */}
        {activeSeoPage.relatedSlugs && activeSeoPage.relatedSlugs.length > 0 && (
          <section className="my-12 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
              Related Conversion Tools &amp; Hubs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSeoPage.relatedSlugs.map((slug) => {
                const relPage = ALL_SEO_PAGES[slug];
                if (!relPage) return null;
                return (
                  <a
                    key={slug}
                    href={relPage.urlPath}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-500 hover:shadow-md transition-all group block"
                  >
                    <div className="text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">{relPage.primaryKeyword}</div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      {relPage.h1}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">{relPage.metaDescription}</p>
                  </a>
                );
              })}
            </div>
          </section>
        )}

      </main>

      {/* Structured Semantic Footer with All 14 Page Categories */}
      <footer className="mt-auto bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            {/* Col 1: Tools */}
            <div>
              <div className="text-white font-bold text-sm mb-3">Conversion Tools</div>
              <ul className="space-y-2">
                <li><a href="/pdf-bank-statement-to-excel" className="hover:text-white transition-colors">PDF to Excel</a></li>
                <li><a href="/pdf-bank-statement-to-csv" className="hover:text-white transition-colors">PDF to CSV</a></li>
                <li><a href="/scanned-bank-statement-to-excel" className="hover:text-white transition-colors">Scanned OCR to Excel</a></li>
                <li><a href="/bank-statement-image-to-excel" className="hover:text-white transition-colors">Image &amp; Photo to Excel</a></li>
                <li><a href="/passbook-to-excel" className="hover:text-white transition-colors">Passbook to Excel</a></li>
                <li><a href="/bank-statement-reconciliation-excel" className="hover:text-white transition-colors">Reconciliation Audit</a></li>
              </ul>
            </div>

            {/* Col 2: Targeted Banks */}
            <div>
              <div className="text-white font-bold text-sm mb-3">Targeted Banks</div>
              <ul className="space-y-2">
                <li><a href="/banks/sbi" className="hover:text-white transition-colors">SBI (State Bank of India)</a></li>
                <li><a href="/banks/hdfc" className="hover:text-white transition-colors">HDFC Bank</a></li>
                <li><a href="/banks/icici" className="hover:text-white transition-colors">ICICI Bank</a></li>
                <li><a href="/banks/axis" className="hover:text-white transition-colors">Axis Bank</a></li>
                <li><a href="/banks/kotak" className="hover:text-white transition-colors">Kotak Mahindra Bank</a></li>
                <li><a href="/banks/pnb" className="hover:text-white transition-colors">Punjab National Bank</a></li>
              </ul>
            </div>

            {/* Col 3: US & Global Banks */}
            <div>
              <div className="text-white font-bold text-sm mb-3">Global &amp; US Banks</div>
              <ul className="space-y-2">
                <li><a href="/banks/chase" className="hover:text-white transition-colors">Chase Bank</a></li>
                <li><a href="/banks/bank-of-america" className="hover:text-white transition-colors">Bank of America</a></li>
                <li><a href="/banks/wells-fargo" className="hover:text-white transition-colors">Wells Fargo</a></li>
                <li><a href="/banks/citi" className="hover:text-white transition-colors">Citibank</a></li>
                <li><a href="/banks/barclays" className="hover:text-white transition-colors">Barclays Bank</a></li>
                <li><a href="/banks/hsbc" className="hover:text-white transition-colors">HSBC Global</a></li>
              </ul>
            </div>

            {/* Col 4: Accounting Software */}
            <div>
              <div className="text-white font-bold text-sm mb-3">Accounting Feeds</div>
              <ul className="space-y-2">
                <li><a href="/bank-statement-to-quickbooks" className="hover:text-white transition-colors">QuickBooks (QBO/CSV)</a></li>
                <li><a href="/bank-statement-to-xero-csv" className="hover:text-white transition-colors">Xero CSV Import</a></li>
                <li><a href="/bank-statement-to-google-sheets" className="hover:text-white transition-colors">Google Sheets</a></li>
                <li><a href="/for-accountants-and-bookkeepers" className="hover:text-white transition-colors">For CPAs &amp; Bookkeepers</a></li>
                <li><a href="/pricing" className="hover:text-white transition-colors">Pricing &amp; Free Credits</a></li>
              </ul>
            </div>

            {/* Col 5: Company & Legal */}
            <div>
              <div className="text-white font-bold text-sm mb-3">Company &amp; Legal</div>
              <ul className="space-y-2">
                <li><a href="/blog/how-to-convert-bank-statement-pdf-to-excel" className="hover:text-white transition-colors">PDF to Excel Guide</a></li>
                <li><a href="/blog/is-it-safe-to-upload-bank-statement-online" className="hover:text-white transition-colors">Security &amp; Safety Guide</a></li>
                <li><a href="/security" className="hover:text-white transition-colors">Security Architecture</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              &copy; {new Date().getFullYear()} {BRAND_NAME} ({DOMAIN}). All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Support: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sky-400 hover:underline">{SUPPORT_EMAIL}</a></span>
              <span>•</span>
              <a href="/security" className="hover:underline">In-Memory Zero Retention</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie Consent Banner for GA4 Analytics */}
      {showCookieBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <Cookie className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">Privacy &amp; Analytics Consent</span>
              We use lightweight analytics to understand conversion performance. Uploaded files are processed in-memory with zero disk retention.
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-xs">
            <button
              onClick={() => {
                setCookieConsent(false);
                setShowCookieBanner(false);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Decline
            </button>
            <button
              onClick={() => {
                setCookieConsent(true);
                setShowCookieBanner(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors cursor-pointer"
            >
              Accept Analytics
            </button>
          </div>
        </div>
      )}

      {/* Share & Earn Credits Modal */}
      <ShareEarnModal
        isOpen={isShareEarnOpen}
        onClose={() => setIsShareEarnOpen(false)}
        credits={userCredits}
        onClaimCredits={handleClaimShareReward}
        onClaimShareReward={handleClaimShareReward}
        onOpenPhoneVerify={() => {
          setIsShareEarnOpen(false);
          setIsPhoneVerifyOpen(true);
        }}
        referralCode={userCredits.referralCode}
        isDarkMode={isDarkMode}
      />

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        isDarkMode={isDarkMode}
        onOpenPhoneVerify={() => {
          setIsAuthOpen(false);
          setIsPhoneVerifyOpen(true);
        }}
        onAuthSuccess={(u) => {
          setUser(u);
          setIsAuthOpen(false);
        }}
      />

      {/* Twilio SMS Phone Verification Modal */}
      <PhoneVerificationModal
        isOpen={isPhoneVerifyOpen}
        onClose={() => setIsPhoneVerifyOpen(false)}
        isDarkMode={isDarkMode}
        currentPhoneNumber={userCredits.phoneNumber || user?.phoneNumber}
        isAlreadyVerified={userCredits.phoneVerified || user?.phoneVerified}
        onVerificationSuccess={handlePhoneVerificationSuccess}
      />

      {/* Conversion Settings Modal */}
      <ConversionSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        isDarkMode={isDarkMode}
      />

      {/* Privacy Guarantee Modal */}
      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectStatement={(st) => {
          setStatements((prev) => (prev.some((s) => s.id === st.id) ? prev : [st, ...prev]));
          setActiveStatementId(st.id);
        }}
        onDeleteHistoryItem={(id) => {
          const next = history.filter((h) => h.id !== id);
          saveHistory(next);
        }}
        onClearHistory={handleClearAllLocalData}
        settings={settings}
        isDarkMode={isDarkMode}
        user={user}
        onOpenAuth={() => {
          setIsHistoryOpen(false);
          setIsAuthOpen(true);
        }}
      />

      {/* Batch Processing Modal */}
      <BatchProcessingModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        statements={statements}
        onProcessBatch={handleProcessFiles}
        settings={settings}
        isDarkMode={isDarkMode}
        credits={userCredits}
        onOpenShareEarn={() => {
          setIsBatchOpen(false);
          setIsShareEarnOpen(true);
        }}
      />

    </div>
  );
}
