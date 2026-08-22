import React from 'react';
import { Settings, X, Check, Save, RotateCcw, Sparkles } from 'lucide-react';
import { ConversionSettings, DEFAULT_SETTINGS } from '../types';

interface ConversionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ConversionSettings;
  onSaveSettings: (newSettings: ConversionSettings) => void;
  isDarkMode: boolean;
}

export const ConversionSettingsModal: React.FC<ConversionSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  isDarkMode,
}) => {
  const [form, setForm] = React.useState<ConversionSettings>(settings);

  React.useEffect(() => {
    setForm(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(form);
    onClose();
  };

  const handleReset = () => {
    setForm(DEFAULT_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Conversion & Formatting Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize date outputs, OCR sensitivity & Excel export preferences
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="py-5 space-y-4 text-xs">
          
          {/* Output Date Format */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Default Output Date Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MMM-YYYY'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setForm({ ...form, outputDateFormat: fmt })}
                  className={`p-2.5 rounded-xl border text-left font-mono font-medium transition-all ${
                    form.outputDateFormat === fmt
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Default Export Format */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Default Export File Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['xlsx', 'csv', 'pdf'] as const).map((ext) => (
                <button
                  key={ext}
                  type="button"
                  onClick={() => setForm({ ...form, defaultExportFormat: ext })}
                  className={`p-2 rounded-xl border font-bold uppercase transition-all ${
                    form.defaultExportFormat === ext
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {ext}
                </button>
              ))}
            </div>
          </div>

          {/* Highlight Low Confidence Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                Highlight Low-Confidence OCR Rows
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Flags rows with OCR clarity below {(form.confidenceThreshold * 100).toFixed(0)}% for manual verification
              </span>
            </div>
            <input
              type="checkbox"
              checked={form.highlightLowConfidence}
              onChange={(e) => setForm({ ...form, highlightLowConfidence: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </div>

          {/* Summary Sheet in Excel */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                Include Summary & Reconciliation Sheet in Excel
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Adds a dedicated metadata & reconciliation tab to .xlsx workbooks
              </span>
            </div>
            <input
              type="checkbox"
              checked={form.includeSummarySheetInExcel}
              onChange={(e) => setForm({ ...form, includeSummarySheetInExcel: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
