import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { ExtractedStatement, ConversionSettings } from '../types';

// Format currency value helper
export function formatCurrency(amount: number, symbol: string = '$'): string {
  if (isNaN(amount)) return `${symbol}0.00`;
  const formatted = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

// Format date according to settings
export function formatDate(isoDate: string, format: ConversionSettings['outputDateFormat']): string {
  if (!isoDate) return '';
  try {
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    const [year, month, day] = parts;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(month, 10) - 1;

    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD-MMM-YYYY':
        return `${day}-${monthNames[monthIdx] || month}-${year}`;
      case 'YYYY-MM-DD':
      default:
        return `${year}-${month}-${day}`;
    }
  } catch {
    return isoDate;
  }
}

// Export single statement to Excel (.xlsx)
export function exportToExcel(statement: ExtractedStatement, settings: ConversionSettings) {
  const wb = XLSX.utils.book_new();

  // 1. Transactions Sheet
  const txRows = statement.transactions.map((tx, idx) => ({
    '#': idx + 1,
    'Date': formatDate(tx.date, settings.outputDateFormat),
    'Description / Particulars': tx.description,
    'Reference / Chq / ID': tx.reference || '',
    [`Debit (${statement.summary.currencySymbol})`]: tx.debit > 0 ? tx.debit : '',
    [`Credit (${statement.summary.currencySymbol})`]: tx.credit > 0 ? tx.credit : '',
    [`Balance (${statement.summary.currencySymbol})`]: tx.balance,
    'Category': tx.category,
    'Confidence': `${Math.round(tx.confidence * 100)}%`,
    'Status': tx.isFlagged ? 'Review Needed' : 'Verified',
  }));

  const wsTx = XLSX.utils.json_to_sheet(txRows);

  // Set column widths for transactions
  wsTx['!cols'] = [
    { wch: 5 },  // #
    { wch: 14 }, // Date
    { wch: 45 }, // Description
    { wch: 20 }, // Reference
    { wch: 16 }, // Debit
    { wch: 16 }, // Credit
    { wch: 16 }, // Balance
    { wch: 24 }, // Category
    { wch: 12 }, // Confidence
    { wch: 14 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');

  // 2. Summary Sheet
  if (settings.includeSummarySheetInExcel) {
    const summaryData = [
      ['BANK STATEMENT CONVERSION SUMMARY', ''],
      ['', ''],
      ['Bank Name', statement.summary.bankName],
      ['Account Holder', statement.summary.accountHolder || 'N/A'],
      ['Account Number', statement.summary.accountNumber || 'N/A'],
      ['Statement Period', statement.summary.statementPeriod || 'N/A'],
      ['Currency', `${statement.summary.currency} (${statement.summary.currencySymbol})`],
      ['Date Format', settings.outputDateFormat],
      ['Extraction Engine', statement.layoutDetected],
      ['', ''],
      ['FINANCIAL RECONCILIATION', ''],
      ['Opening Balance', statement.summary.openingBalance],
      ['Total Credits / Deposits (+)', statement.summary.totalCredits],
      ['Total Debits / Withdrawals (-)', statement.summary.totalDebits],
      ['Net Cash Flow', statement.summary.netChange],
      ['Extracted Closing Balance', statement.summary.closingBalance],
      ['Calculated Closing Balance', statement.summary.calculatedClosingBalance],
      ['Reconciliation Status', statement.summary.reconciliationStatus.toUpperCase()],
      ['Discrepancy Amount', statement.summary.discrepancyAmount || 0],
      ['Total Transactions', statement.summary.totalTransactions],
      ['Flagged Transactions', statement.summary.flaggedCount],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  }

  const cleanName = statement.fileName.replace(/\.[^/.]+$/, '');
  XLSX.writeFile(wb, `${cleanName}_Converted.xlsx`);
}

// Export single statement to CSV
export function exportToCSV(statement: ExtractedStatement, settings: ConversionSettings) {
  const headers = [
    'Date',
    'Description',
    'Reference',
    `Debit_${statement.summary.currency}`,
    `Credit_${statement.summary.currency}`,
    `Balance_${statement.summary.currency}`,
    'Category',
    'Type',
  ];

  const rows = statement.transactions.map((tx) => [
    `"${formatDate(tx.date, settings.outputDateFormat)}"`,
    `"${(tx.description || '').replace(/"/g, '""')}"`,
    `"${(tx.reference || '').replace(/"/g, '""')}"`,
    tx.debit > 0 ? tx.debit.toFixed(2) : '0.00',
    tx.credit > 0 ? tx.credit.toFixed(2) : '0.00',
    tx.balance.toFixed(2),
    `"${tx.category || 'Other'}"`,
    tx.type,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const cleanName = statement.fileName.replace(/\.[^/.]+$/, '');
  link.href = url;
  link.setAttribute('download', `${cleanName}_Converted.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export single statement to PDF report
export function exportToPDF(statement: ExtractedStatement, settings: ConversionSettings) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const sym = statement.summary.currencySymbol;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(statement.summary.bankName || 'Bank Statement', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Account: ${statement.summary.accountNumber || '••••'}  |  Holder: ${statement.summary.accountHolder || 'Valued Customer'}`, 14, 21);

  doc.text(`Period: ${statement.summary.statementPeriod || 'Current'}`, 196, 21, { align: 'right' });

  // Summary Metrics Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, 33, 182, 24, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 33, 182, 24, 2, 2, 'D');

  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFontSize(8);
  doc.text('OPENING BALANCE', 20, 40);
  doc.text('TOTAL DEBITS (-)', 66, 40);
  doc.text('TOTAL CREDITS (+)', 112, 40);
  doc.text('CLOSING BALANCE', 158, 40);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(statement.summary.openingBalance, sym), 20, 48);

  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(formatCurrency(statement.summary.totalDebits, sym), 66, 48);

  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(formatCurrency(statement.summary.totalCredits, sym), 112, 48);

  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(statement.summary.closingBalance, sym), 158, 48);

  // Table Data
  const tableData = statement.transactions.map((tx, idx) => [
    idx + 1,
    formatDate(tx.date, settings.outputDateFormat),
    tx.description,
    tx.reference || '-',
    tx.debit > 0 ? formatCurrency(tx.debit, sym) : '-',
    tx.credit > 0 ? formatCurrency(tx.credit, sym) : '-',
    formatCurrency(tx.balance, sym),
  ]);

  autoTable(doc, {
    startY: 62,
    head: [['#', 'Date', 'Description / Particulars', 'Reference', 'Debit', 'Credit', 'Balance']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 64 },
      3: { cellWidth: 26 },
      4: { cellWidth: 22, halign: 'right', textColor: [225, 29, 72] },
      5: { cellWidth: 22, halign: 'right', textColor: [16, 185, 129] },
      6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 2,
    },
    didDrawPage: (data) => {
      // Footer page number
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated by Bank Statement Converter  |  Page ${data.pageNumber} of ${pageCount}`,
        14,
        doc.internal.pageSize.height - 8
      );
    },
  });

  const cleanName = statement.fileName.replace(/\.[^/.]+$/, '');
  doc.save(`${cleanName}_Statement_Report.pdf`);
}

// Export batch statements to ZIP
export async function exportBatchToZIP(
  statements: ExtractedStatement[],
  format: 'xlsx' | 'csv' | 'pdf' | 'all',
  settings: ConversionSettings
) {
  const zip = new JSZip();

  for (const st of statements) {
    const cleanName = st.fileName.replace(/\.[^/.]+$/, '');

    if (format === 'xlsx' || format === 'all') {
      const wb = XLSX.utils.book_new();
      const txRows = st.transactions.map((tx, idx) => ({
        '#': idx + 1,
        'Date': formatDate(tx.date, settings.outputDateFormat),
        'Description': tx.description,
        'Reference': tx.reference || '',
        'Debit': tx.debit > 0 ? tx.debit : '',
        'Credit': tx.credit > 0 ? tx.credit : '',
        'Balance': tx.balance,
        'Category': tx.category,
      }));
      const wsTx = XLSX.utils.json_to_sheet(txRows);
      XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      zip.file(`${cleanName}.xlsx`, excelBuffer);
    }

    if (format === 'csv' || format === 'all') {
      const headers = ['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance', 'Category'];
      const rows = st.transactions.map((tx) => [
        `"${formatDate(tx.date, settings.outputDateFormat)}"`,
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        `"${(tx.reference || '').replace(/"/g, '""')}"`,
        tx.debit.toFixed(2),
        tx.credit.toFixed(2),
        tx.balance.toFixed(2),
        `"${tx.category || 'Other'}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      zip.file(`${cleanName}.csv`, csvContent);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Converted_Bank_Statements_${Date.now()}.zip`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
