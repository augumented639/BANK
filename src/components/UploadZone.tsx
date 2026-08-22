import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileSpreadsheet,
  Image as ImageIcon,
  ArrowRight,
  Database
} from 'lucide-react';
import { SAMPLE_STATEMENTS } from '../data/sampleStatements';
import { ExtractedStatement } from '../types';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample: (sample: ExtractedStatement) => void;
  isProcessing: boolean;
  processingProgress: number;
  processingStep: string;
  isDarkMode: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesSelected,
  onLoadSample,
  isProcessing,
  processingProgress,
  processingStep,
  isDarkMode,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
      // Reset input value so same file can be re-uploaded if desired
      e.target.value = '';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Drag and Drop Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/5 scale-[1.008]'
            : isDarkMode
            ? 'border-slate-700 hover:border-slate-600 bg-slate-800/40 hover:bg-slate-800/60'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin flex items-center justify-center" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {processingStep || 'Extracting Bank Transactions...'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Applying intelligent OCR, column alignment & reconciliation checks
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(10, processingProgress)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Drop your Bank Statements here, or <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">browse files</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Supports single or batch upload for <strong>PDF (scanned & digital), JPG, PNG, CSV, and Excel</strong> statements.
              </p>
            </div>

            {/* File format badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <FileText className="w-3 h-3 text-rose-500" /> PDF Statements
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <ImageIcon className="w-3 h-3 text-sky-500" /> Scanned Images / Passbooks
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <FileSpreadsheet className="w-3 h-3 text-emerald-500" /> CSV / Excel Exports
              </span>
            </div>

            {/* Privacy indicator */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% In-Memory Processing &bull; Bank-Grade Privacy &bull; Zero Server Storage</span>
            </div>
          </div>
        )}
      </div>

      {/* Instant Demo / Sample Statements Picker */}
      <div className={`p-4 rounded-xl border ${
        isDarkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50/60 border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">
              No statement file ready? Try pre-loaded sample statements:
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            1-click instant preview
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {SAMPLE_STATEMENTS.map((sample) => (
            <button
              key={sample.id}
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample(sample);
              }}
              className={`flex flex-col p-2.5 rounded-lg border text-left transition-all hover:scale-[1.02] ${
                isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 hover:border-emerald-500/50'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-500/50 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {sample.summary.currency} ({sample.summary.currencySymbol})
                </span>
                <span className="text-[10px] uppercase font-mono text-slate-400">
                  {sample.fileType}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {sample.summary.bankName}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {sample.transactions.length} rows &bull; {sample.summary.reconciliationStatus === 'balanced' ? 'Balanced' : 'Discrepancy'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
