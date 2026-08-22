import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpDown, 
  Tag, 
  Check, 
  X, 
  Edit2, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  Calendar
} from 'lucide-react';
import { Transaction, ConversionSettings, DEFAULT_CATEGORIES } from '../types';
import { formatCurrency, formatDate } from '../utils/exportUtils';

interface TransactionTableProps {
  transactions: Transaction[];
  currencySymbol: string;
  settings: ConversionSettings;
  isDarkMode: boolean;
  onUpdateTransaction: (updatedTx: Transaction) => void;
  onDeleteTransactions: (ids: string[]) => void;
  onAddTransaction: (newTx: Transaction) => void;
  onBatchUpdateCategory: (ids: string[], newCategory: string) => void;
}

type SortField = 'date' | 'description' | 'reference' | 'debit' | 'credit' | 'balance' | 'confidence';
type SortOrder = 'asc' | 'desc';

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  currencySymbol,
  settings,
  isDarkMode,
  onUpdateTransaction,
  onDeleteTransactions,
  onAddTransaction,
  onBatchUpdateCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit' | 'flagged'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTxForm, setNewTxForm] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    debit: 0,
    credit: 0,
    balance: 0,
    category: 'Other / Uncategorized',
    type: 'debit',
    confidence: 1.0,
    isFlagged: false,
  });

  // Calculate quick count pills
  const counts = useMemo(() => {
    let debits = 0;
    let credits = 0;
    let flagged = 0;
    transactions.forEach((tx) => {
      if (tx.debit > 0) debits++;
      if (tx.credit > 0) credits++;
      if (tx.isFlagged) flagged++;
    });
    return { all: transactions.length, debits, credits, flagged };
  }, [transactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesDesc = tx.description.toLowerCase().includes(q);
          const matchesRef = tx.reference.toLowerCase().includes(q);
          const matchesDate = tx.date.toLowerCase().includes(q);
          const matchesCategory = tx.category.toLowerCase().includes(q);
          const matchesAmount = tx.debit.toString().includes(q) || tx.credit.toString().includes(q);
          if (!matchesDesc && !matchesRef && !matchesDate && !matchesCategory && !matchesAmount) {
            return false;
          }
        }

        // Type filter
        if (typeFilter === 'debit' && tx.debit <= 0) return false;
        if (typeFilter === 'credit' && tx.credit <= 0) return false;
        if (typeFilter === 'flagged' && !tx.isFlagged) return false;

        // Category filter
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [transactions, searchQuery, typeFilter, categoryFilter, sortField, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    if (pageSize === 9999) return filteredTransactions;
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Filtered totals
  const filteredTotals = useMemo(() => {
    let totalDebits = 0;
    let totalCredits = 0;
    filteredTransactions.forEach((tx) => {
      totalDebits += tx.debit;
      totalCredits += tx.credit;
    });
    return {
      totalDebits: Number(totalDebits.toFixed(2)),
      totalCredits: Number(totalCredits.toFixed(2)),
      net: Number((totalCredits - totalDebits).toFixed(2)),
    };
  }, [filteredTransactions]);

  // Handle sort header click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredTransactions.map((tx) => tx.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Inline editing handlers
  const startEditing = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm({ ...tx });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEditing = () => {
    if (editingId && editForm) {
      const existing = transactions.find((t) => t.id === editingId);
      if (existing) {
        const debit = parseFloat(String(editForm.debit || 0)) || 0;
        const credit = parseFloat(String(editForm.credit || 0)) || 0;
        const balance = parseFloat(String(editForm.balance || 0)) || 0;
        const type = credit > 0 && debit === 0 ? 'credit' : 'debit';

        onUpdateTransaction({
          ...existing,
          date: editForm.date || existing.date,
          description: (editForm.description || existing.description).trim(),
          reference: (editForm.reference || existing.reference).trim(),
          debit: Math.abs(debit),
          credit: Math.abs(credit),
          balance,
          category: editForm.category || existing.category,
          type,
          isFlagged: Boolean(editForm.isFlagged),
          isModified: true,
        });
      }
      setEditingId(null);
      setEditForm({});
    }
  };

  // Add new row handler
  const handleSaveNewTx = () => {
    if (!newTxForm.description?.trim()) return;

    const debit = parseFloat(String(newTxForm.debit || 0)) || 0;
    const credit = parseFloat(String(newTxForm.credit || 0)) || 0;
    const balance = parseFloat(String(newTxForm.balance || 0)) || 0;
    const type = credit > 0 && debit === 0 ? 'credit' : 'debit';

    const newTx: Transaction = {
      id: `tx-user-${Date.now()}`,
      date: newTxForm.date || new Date().toISOString().split('T')[0],
      originalDate: newTxForm.date || '',
      description: newTxForm.description.trim(),
      reference: newTxForm.reference?.trim() || '',
      debit: Math.abs(debit),
      credit: Math.abs(credit),
      balance,
      category: newTxForm.category || 'Other / Uncategorized',
      type,
      confidence: 1.0,
      isFlagged: false,
      isModified: true,
    };

    onAddTransaction(newTx);
    setIsAddingNew(false);
    setNewTxForm({
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference: '',
      debit: 0,
      credit: 0,
      balance: 0,
      category: 'Other / Uncategorized',
      type: 'debit',
      confidence: 1.0,
      isFlagged: false,
    });
  };

  return (
    <div className={`rounded-2xl border transition-all ${
      isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
    }`}>
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-3.5">
        
        {/* Top Controls: Search, Filter Tabs, Add Row Button */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, reference, amount..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all ${
                isDarkMode 
                  ? 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder-slate-400' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons & Add Row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            
            {/* Filter Buttons */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium">
              <button
                onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  typeFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All ({counts.all})
              </button>

              <button
                onClick={() => { setTypeFilter('debit'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  typeFilter === 'debit'
                    ? 'bg-rose-500 text-white shadow-xs font-semibold'
                    : 'text-rose-600 dark:text-rose-400 hover:text-rose-700'
                }`}
              >
                Debits ({counts.debits})
              </button>

              <button
                onClick={() => { setTypeFilter('credit'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  typeFilter === 'credit'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
                }`}
              >
                Credits ({counts.credits})
              </button>

              {counts.flagged > 0 && (
                <button
                  onClick={() => { setTypeFilter('flagged'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    typeFilter === 'flagged'
                      ? 'bg-amber-500 text-white shadow-xs font-semibold'
                      : 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
                  }`}
                >
                  Review ({counts.flagged})
                </button>
              )}
            </div>

            {/* Category Dropdown Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className={`px-2.5 py-1.5 rounded-xl text-xs border font-medium cursor-pointer focus:ring-1 focus:ring-emerald-500 ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-200' 
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="all">All Categories</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Add Transaction Button */}
            <button
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          </div>

        </div>

        {/* Bulk Action Bar (when rows are selected) */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">
              {selectedIds.size} transaction{selectedIds.size > 1 ? 's' : ''} selected
            </span>

            <div className="flex items-center gap-2">
              {/* Batch category update */}
              <div className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onBatchUpdateCategory(Array.from(selectedIds), e.target.value);
                      setSelectedIds(new Set());
                    }
                  }}
                  defaultValue=""
                  className="px-2 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-emerald-500/30 text-slate-800 dark:text-slate-200"
                >
                  <option value="" disabled>Reassign Category...</option>
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Delete selected button */}
              <button
                onClick={() => {
                  onDeleteTransactions(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1 text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Add New Row Inline Form */}
        {isAddingNew && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add New Transaction Row
              </span>
              <button onClick={() => setIsAddingNew(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Date</label>
                <input
                  type="date"
                  value={newTxForm.date}
                  onChange={(e) => setNewTxForm({ ...newTxForm, date: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Description / Particulars</label>
                <input
                  type="text"
                  placeholder="e.g. Amazon Store Order #1029"
                  value={newTxForm.description}
                  onChange={(e) => setNewTxForm({ ...newTxForm, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Reference / ID</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-9921"
                  value={newTxForm.reference}
                  onChange={(e) => setNewTxForm({ ...newTxForm, reference: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-rose-500 mb-1">Debit (-)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newTxForm.debit || ''}
                  onChange={(e) => setNewTxForm({ ...newTxForm, debit: parseFloat(e.target.value) || 0, credit: 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-rose-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-emerald-500 mb-1">Credit (+)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newTxForm.credit || ''}
                  onChange={(e) => setNewTxForm({ ...newTxForm, credit: parseFloat(e.target.value) || 0, debit: 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-emerald-600 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Running Balance</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newTxForm.balance || ''}
                  onChange={(e) => setNewTxForm({ ...newTxForm, balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Category</label>
                <select
                  value={newTxForm.category}
                  onChange={(e) => setNewTxForm({ ...newTxForm, category: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSaveNewTx}
                  className="w-full py-1.5 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                >
                  Confirm & Append Row
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Table Data Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
              isDarkMode 
                ? 'bg-slate-800/60 border-slate-800 text-slate-400' 
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              
              {/* Checkbox column */}
              <th className="py-3 px-3 w-8 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === filteredTransactions.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </th>

              {/* Date */}
              <th 
                onClick={() => handleSort('date')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Date</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>

              {/* Description */}
              <th 
                onClick={() => handleSort('description')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 min-w-[220px]"
              >
                <div className="flex items-center gap-1">
                  <span>Description / Particulars</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>

              {/* Reference */}
              <th 
                onClick={() => handleSort('reference')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Reference / ID</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>

              {/* Debit */}
              <th 
                onClick={() => handleSort('debit')}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1 text-rose-600 dark:text-rose-400">
                  <span>Debit ({currencySymbol})</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>

              {/* Credit */}
              <th 
                onClick={() => handleSort('credit')}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400">
                  <span>Credit ({currencySymbol})</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>

              {/* Balance */}
              <th 
                onClick={() => handleSort('balance')}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Balance ({currencySymbol})</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>

              {/* Category */}
              <th className="py-3 px-3 whitespace-nowrap">
                Category
              </th>

              {/* Confidence / Status */}
              <th 
                onClick={() => handleSort('confidence')}
                className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Confidence</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>

              {/* Actions */}
              <th className="py-3 px-3 text-right w-16">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500">
                  No transactions match your current filters.
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => {
                const isSelected = selectedIds.has(tx.id);
                const isEditing = editingId === tx.id;
                const isLowConfidence = settings.highlightLowConfidence && (tx.confidence < settings.confidenceThreshold || tx.isFlagged);

                if (isEditing) {
                  return (
                    <tr key={tx.id} className="bg-emerald-500/10 border-emerald-500">
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(tx.id)}
                          className="rounded border-slate-300 text-emerald-600"
                        />
                      </td>

                      {/* Edit Date */}
                      <td className="py-2 px-2">
                        <input
                          type="date"
                          value={editForm.date || ''}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          className="w-full px-2 py-1 rounded border bg-white dark:bg-slate-800 text-xs"
                        />
                      </td>

                      {/* Edit Description */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full px-2 py-1 rounded border bg-white dark:bg-slate-800 text-xs"
                        />
                      </td>

                      {/* Edit Reference */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={editForm.reference || ''}
                          onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })}
                          className="w-full px-2 py-1 rounded border bg-white dark:bg-slate-800 text-xs"
                        />
                      </td>

                      {/* Edit Debit */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.debit || ''}
                          onChange={(e) => setEditForm({ ...editForm, debit: parseFloat(e.target.value) || 0, credit: 0 })}
                          className="w-full px-2 py-1 rounded border bg-white dark:bg-slate-800 text-xs text-right font-mono text-rose-600"
                        />
                      </td>

                      {/* Edit Credit */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.credit || ''}
                          onChange={(e) => setEditForm({ ...editForm, credit: parseFloat(e.target.value) || 0, debit: 0 })}
                          className="w-full px-2 py-1 rounded border bg-white dark:bg-slate-800 text-xs text-right font-mono text-emerald-600"
                        />
                      </td>

                      {/* Edit Balance */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.balance || ''}
                          onChange={(e) => setEditForm({ ...editForm, balance: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 rounded border bg-white dark:bg-slate-800 text-xs text-right font-mono"
                        />
                      </td>

                      {/* Edit Category */}
                      <td className="py-2 px-2">
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="w-full px-2 py-1 rounded border bg-white dark:bg-slate-800 text-xs"
                        >
                          {DEFAULT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>

                      {/* Flag toggle */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, isFlagged: !editForm.isFlagged })}
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            editForm.isFlagged ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                          }`}
                        >
                          {editForm.isFlagged ? 'Flagged' : 'Normal'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={saveEditing}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                            title="Save changes"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={tx.id}
                    className={`transition-colors group ${
                      isSelected
                        ? 'bg-emerald-500/5'
                        : isLowConfidence
                        ? 'bg-amber-500/5 hover:bg-amber-500/10'
                        : isDarkMode
                        ? 'hover:bg-slate-800/40'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(tx.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>

                    {/* Date */}
                    <td 
                      onClick={() => startEditing(tx)}
                      className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="Click to edit date"
                    >
                      {formatDate(tx.date, settings.outputDateFormat)}
                    </td>

                    {/* Description */}
                    <td 
                      onClick={() => startEditing(tx)}
                      className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100 cursor-pointer"
                      title="Click to edit description"
                    >
                      <div className="flex items-center gap-1.5">
                        {isLowConfidence && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title={tx.notes || 'Low confidence OCR row'} />
                        )}
                        <span className="truncate max-w-sm sm:max-w-md">{tx.description}</span>
                        {tx.isModified && (
                          <span className="text-[9px] px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 uppercase">
                            edited
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Reference */}
                    <td 
                      onClick={() => startEditing(tx)}
                      className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer"
                      title="Click to edit reference"
                    >
                      {tx.reference || '-'}
                    </td>

                    {/* Debit */}
                    <td 
                      onClick={() => startEditing(tx)}
                      className="py-3 px-3 text-right font-mono font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap cursor-pointer"
                      title="Click to edit debit amount"
                    >
                      {tx.debit > 0 ? formatCurrency(tx.debit, currencySymbol) : '-'}
                    </td>

                    {/* Credit */}
                    <td 
                      onClick={() => startEditing(tx)}
                      className="py-3 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap cursor-pointer"
                      title="Click to edit credit amount"
                    >
                      {tx.credit > 0 ? formatCurrency(tx.credit, currencySymbol) : '-'}
                    </td>

                    {/* Balance */}
                    <td 
                      onClick={() => startEditing(tx)}
                      className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap cursor-pointer"
                      title="Click to edit balance"
                    >
                      {formatCurrency(tx.balance, currencySymbol)}
                    </td>

                    {/* Category Pill */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {tx.category}
                      </span>
                    </td>

                    {/* Confidence Score Pill */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {isLowConfidence ? (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          title={tx.notes || 'Confidence is below threshold. Please verify values before export.'}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {Math.round(tx.confidence * 100)}% Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          {Math.round(tx.confidence * 100)}%
                        </span>
                      )}
                    </td>

                    {/* Row Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(tx)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Edit transaction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTransactions([tx.id])}
                          className="p-1 rounded text-rose-400 hover:text-rose-600"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Filtered Summary & Pagination */}
      <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        
        {/* Filtered View Summary Strip */}
        <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
          <span>
            Showing <strong>{filteredTransactions.length}</strong> of <strong>{transactions.length}</strong> transactions
          </span>
          <span className="hidden sm:inline">&bull;</span>
          <span>
            Debits: <strong className="text-rose-600">{formatCurrency(filteredTotals.totalDebits, currencySymbol)}</strong>
          </span>
          <span className="hidden sm:inline">&bull;</span>
          <span>
            Credits: <strong className="text-emerald-600">{formatCurrency(filteredTotals.totalCredits, currencySymbol)}</strong>
          </span>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2">
          {/* Page size selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setCurrentPage(1);
            }}
            className="px-2 py-1 rounded-lg text-xs border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={9999}>All rows</option>
          </select>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
