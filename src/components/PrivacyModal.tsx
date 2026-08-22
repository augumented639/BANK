import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Trash2, 
  CheckCircle2, 
  EyeOff, 
  ServerCrash, 
  Cpu, 
  X,
  FileCheck,
  RefreshCw
} from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAllLocalData: () => void;
  isDarkMode: boolean;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  onClearAllLocalData,
  isDarkMode,
}) => {
  const [isWiped, setIsWiped] = useState(false);

  if (!isOpen) return null;

  const handleWipe = () => {
    onClearAllLocalData();
    setIsWiped(true);
    setTimeout(() => {
      setIsWiped(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-xl rounded-2xl border p-6 sm:p-7 shadow-2xl transition-all ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold">Privacy & Financial Security Architecture</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bank-grade zero-retention data protection protocols
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Principles */}
        <div className="py-5 space-y-3.5 text-xs">
          
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
            <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-900 dark:text-emerald-300 block">
                100% In-Memory Ephemeral OCR Processing
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                Uploaded statement files (PDF, images, spreadsheets) are analyzed exclusively in transient RAM. They are never written to permanent disk storage or persistent server-side databases.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-3">
            <EyeOff className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Automatic PII & Account Number Masking
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                Bank account numbers and routing credentials are automatically masked (e.g., •••• •••• 4912) before display to prevent shoulder-surfing and accidental disclosure.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                TLS 1.3 Transport Encryption & Zero Data Brokerage
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                All communications use TLS 1.3 HTTPS encryption. Financial transaction records are strictly private to your session and are never shared, monetized, or used for model training.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-3">
            <FileCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Local-Only Browser Cache
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                Any saved conversion history resides exclusively in your browser's local sandbox and can be purged instantly with one click.
              </p>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleWipe}
            disabled={isWiped}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all"
          >
            {isWiped ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Local Cache Cleared!</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wipe All Local Session Data</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all"
          >
            Understood & Close
          </button>
        </div>

      </div>
    </div>
  );
};
