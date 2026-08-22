export type TransactionType = 'debit' | 'credit';

export interface Transaction {
  id: string;
  date: string; // Standardized ISO string (YYYY-MM-DD)
  originalDate?: string;
  description: string;
  reference: string;
  debit: number; // 0 if none
  credit: number; // 0 if none
  balance: number;
  category: string;
  type: TransactionType;
  confidence: number; // 0.0 to 1.0
  isFlagged: boolean; // Flagged if low confidence or calculation discrepancy
  notes?: string;
  isModified?: boolean;
}

export interface StatementSummary {
  bankName: string;
  bankLogoKey?: string;
  accountHolder?: string;
  accountNumber?: string; // masked (e.g. *******1234)
  statementPeriod?: string;
  startDate?: string;
  endDate?: string;
  currency: string; // USD ($), INR (₹), EUR (€), GBP (£), etc.
  currencySymbol: string;
  dateFormat: string;
  openingBalance: number;
  closingBalance: number;
  calculatedClosingBalance: number;
  totalDebits: number;
  totalCredits: number;
  netChange: number;
  totalTransactions: number;
  flaggedCount: number;
  reconciliationStatus: 'balanced' | 'discrepancy';
  discrepancyAmount?: number;
}

export interface ExtractedStatement {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'jpg' | 'png' | 'csv' | 'xlsx' | 'other';
  fileSize: number; // in bytes
  uploadDate: string;
  status: 'idle' | 'uploading' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  processingProgress?: number; // 0 to 100
  processingStep?: string;
  layoutDetected: string;
  confidenceScore: number; // 0.0 to 1.0
  transactions: Transaction[];
  summary: StatementSummary;
  rawTextSnippet?: string;
}

export interface ConversionSettings {
  outputDateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'DD-MMM-YYYY';
  currencySymbol: string;
  defaultExportFormat: 'xlsx' | 'csv' | 'pdf';
  highlightLowConfidence: boolean;
  confidenceThreshold: number; // e.g. 0.85
  autoCleanDescriptions: boolean;
  fillMissingBalances: boolean;
  includeSummarySheetInExcel: boolean;
  categories: string[];
}

export const DEFAULT_CATEGORIES: string[] = [
  'Salary & Income',
  'Transfer & Remittance',
  'UPI / Digital Payment',
  'Grocery & Food',
  'Dining & Restaurants',
  'Utilities & Bills',
  'Shopping & Retail',
  'Travel & Transit',
  'Entertainment & Subscriptions',
  'Healthcare & Pharmacy',
  'Rent & Mortgage',
  'Bank Fees & Interest',
  'Investment & Savings',
  'Business Expense',
  'Other / Uncategorized'
];

export const DEFAULT_SETTINGS: ConversionSettings = {
  outputDateFormat: 'YYYY-MM-DD',
  currencySymbol: '$',
  defaultExportFormat: 'xlsx',
  highlightLowConfidence: true,
  confidenceThreshold: 0.85,
  autoCleanDescriptions: true,
  fillMissingBalances: true,
  includeSummarySheetInExcel: true,
  categories: DEFAULT_CATEGORIES,
};
