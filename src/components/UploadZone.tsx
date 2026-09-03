import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  FileSpreadsheet,
  Image as ImageIcon,
  Gift,
  Zap,
  Lock,
  Share2
} from 'lucide-react';
import { ExtractedStatement, UserCredits } from '../types';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample?: (sample: ExtractedStatement) => void;
  isProcessing: boolean;
  processingProgress: number;
  processingStep: string;
  isDarkMode: boolean;
  credits: UserCredits;
  onOpenShareEarn: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesSelected,
  isProcessing,
  processingProgress,
  processingStep,
  isDarkMode,
  credits,
  onOpenShareEarn,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExhausted = credits.availableCredits <= 0;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isExhausted) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isExhausted) {
      onOpenShareEarn();
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
      e.target.value = '';
    }
  };

  const handleZoneClick = () => {
    if (isProcessing) return;
    if (isExhausted) {
      onOpenShareEarn();
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-3.5">
      {/* Conversion Credits Strip */}
      <div className={`px-4 py-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 transition-all ${
        isExhausted
          ? 'bg-rose-500/10 border-rose-500/30'
          : isDarkMode
          ? 'bg-slate-900/80 border-slate-800'
          : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className={`p-2 rounded-lg shrink-0 ${
            isExhausted 
              ? 'bg-rose-500 text-white' 
              : 'bg-emerald-600 text-white'
          }`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {credits.availableCredits} Free Conversions Available
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Instant OCR
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Convert PDF statements, scanned images, passbooks & CSVs to clean Excel & CSV.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenShareEarn}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs shrink-0"
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Earn +10 Free Credits</span>
        </button>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleZoneClick}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/5 scale-[1.005]'
            : isExhausted
            ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
            : isDarkMode
            ? 'border-slate-700 hover:border-emerald-500/50 bg-slate-900/60 hover:bg-slate-900'
            : 'border-slate-300 hover:border-emerald-500/60 bg-white hover:bg-slate-50 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isProcessing || isExhausted}
        />

        {isProcessing ? (
          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-3 border-emerald-500/20 border-t-emerald-500 animate-spin flex items-center justify-center" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {processingStep || 'Converting Bank Statement...'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Structuring transactions and computing reconciliation
              </p>
            </div>

            <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(10, processingProgress)}%` }}
              />
            </div>
          </div>
        ) : isExhausted ? (
          <div className="space-y-3 py-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                You Have Reached 0 Remaining Conversions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Share the app with a colleague or friend to recharge +10 credits instantly.
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenShareEarn();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Share & Unlock 10 Free Conversions</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Upload your Bank Statement
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Drag & drop files here, or <span className="text-emerald-600 dark:text-emerald-400 font-semibold underline">browse from your computer</span>
              </p>
            </div>

            {/* Formats support strip */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <FileText className="w-3 h-3 text-rose-500" /> PDF Statements
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <ImageIcon className="w-3 h-3 text-sky-500" /> JPG / PNG Scans
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <FileSpreadsheet className="w-3 h-3 text-emerald-500" /> CSV & Excel
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Private & Secure &bull; In-Memory Zero Retention</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
