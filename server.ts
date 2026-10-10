import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import twilio from 'twilio';
import { renderPageHtml, renderSitemapXml } from './src/server/htmlRenderer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});

// Production Canonical Domain & HTTPS Redirection
app.use((req, res, next) => {
  const host = req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  // If request hits naked domain or http in production, redirect to canonical https://www.aistatementconvert.online
  if (process.env.NODE_ENV === 'production' && (host === 'aistatementconvert.online' || proto === 'http')) {
    return res.redirect(301, `https://www.aistatementconvert.online${req.originalUrl}`);
  }
  next();
});

// Simple In-Memory IP Rate Limiter
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
function apiRateLimit(limit: number = 40, windowMs: number = 5 * 60 * 1000) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = ipRequestCounts.get(ip);
    if (!entry || now > entry.resetTime) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    if (entry.count >= limit) {
      return res.status(429).json({ error: 'Too many requests. Please wait a few moments before trying again.' });
    }
    entry.count += 1;
    next();
  };
}

// Support high payload size for base64 bank statements / scanned images / PDFs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy init Google GenAI client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Fallback parsing and demo modes will be used.');
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Helper to sanitize and reconcile transactions
function calculateReconciliation(
  transactions: any[],
  rawOpeningBalance: number = 0,
  rawClosingBalance: number = 0,
  currency: string = 'USD'
) {
  let totalDebits = 0;
  let totalCredits = 0;
  let flaggedCount = 0;

  const sanitizedTransactions = transactions.map((t, index) => {
    const debit = typeof t.debit === 'number' && !isNaN(t.debit) ? Math.abs(t.debit) : 0;
    const credit = typeof t.credit === 'number' && !isNaN(t.credit) ? Math.abs(t.credit) : 0;
    const balance = typeof t.balance === 'number' && !isNaN(t.balance) ? t.balance : 0;
    const confidence = typeof t.confidence === 'number' ? Math.max(0, Math.min(1, t.confidence)) : 0.95;
    const isFlagged = Boolean(t.isFlagged) || confidence < 0.85;

    if (isFlagged) flaggedCount++;
    totalDebits += debit;
    totalCredits += credit;

    // Currency symbol inference
    let type: 'debit' | 'credit' = debit > 0 ? 'debit' : 'credit';
    if (t.type === 'debit' || t.type === 'credit') {
      type = t.type;
    }

    return {
      id: t.id || `tx-${Date.now()}-${index}`,
      date: t.date || new Date().toISOString().split('T')[0],
      originalDate: t.originalDate || t.date || '',
      description: (t.description || 'Transaction').trim(),
      reference: (t.reference || '').trim(),
      debit: Number(debit.toFixed(2)),
      credit: Number(credit.toFixed(2)),
      balance: Number(balance.toFixed(2)),
      category: t.category || (type === 'credit' ? 'Salary & Income' : 'Other / Uncategorized'),
      type,
      confidence: Number(confidence.toFixed(2)),
      isFlagged,
      notes: t.notes || (confidence < 0.85 ? 'Verify low OCR confidence' : undefined),
    };
  });

  totalDebits = Number(totalDebits.toFixed(2));
  totalCredits = Number(totalCredits.toFixed(2));
  const netChange = Number((totalCredits - totalDebits).toFixed(2));

  let openingBalance = rawOpeningBalance;
  let closingBalance = rawClosingBalance;

  // If opening balance was not detected, infer from first transaction or balances
  if (!openingBalance && sanitizedTransactions.length > 0) {
    const firstTx = sanitizedTransactions[0];
    if (firstTx.balance !== 0) {
      if (firstTx.type === 'credit') {
        openingBalance = Number((firstTx.balance - firstTx.credit).toFixed(2));
      } else {
        openingBalance = Number((firstTx.balance + firstTx.debit).toFixed(2));
      }
    }
  }

  // If closing balance was not detected, take the last transaction balance
  if (!closingBalance && sanitizedTransactions.length > 0) {
    const lastTx = sanitizedTransactions[sanitizedTransactions.length - 1];
    closingBalance = lastTx.balance;
  }

  const calculatedClosingBalance = Number((openingBalance + netChange).toFixed(2));
  const discrepancy = Math.abs(calculatedClosingBalance - closingBalance);
  const isBalanced = discrepancy <= 0.05 || (openingBalance === 0 && closingBalance === 0);

  return {
    sanitizedTransactions,
    summary: {
      openingBalance: Number(openingBalance.toFixed(2)),
      closingBalance: Number(closingBalance.toFixed(2)),
      calculatedClosingBalance,
      totalDebits,
      totalCredits,
      netChange,
      totalTransactions: sanitizedTransactions.length,
      flaggedCount,
      reconciliationStatus: isBalanced ? ('balanced' as const) : ('discrepancy' as const),
      discrepancyAmount: isBalanced ? 0 : Number(discrepancy.toFixed(2)),
    },
  };
}

// Map currency code to symbol
function getCurrencySymbol(code: string = 'USD'): string {
  const map: Record<string, string> = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
    SGD: 'S$',
    AED: 'AED ',
    JPY: '¥',
    CHF: 'CHF ',
    CNY: '¥',
  };
  return map[code.toUpperCase()] || '$';
}

// In-memory rate limiting applied to conversion
app.post('/api/convert/process-statement', apiRateLimit(30, 5 * 60 * 1000), async (req, res) => {
  try {
    const { fileData, fileName, fileType, mimeType } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: 'Missing file data' });
    }

    // File size safety check (max 25MB base64 approx 35MB string)
    if (typeof fileData === 'string' && fileData.length > 35 * 1024 * 1024) {
      return res.status(413).json({ error: 'File size exceeds maximum allowed limit of 25MB.' });
    }

    // Sanitize filename to prevent directory traversal or control characters
    const cleanFileName = (fileName || 'statement.pdf').replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 120);

    const ai = getGenAI();

    // 1. If CSV or XLSX format, try quick direct parsing first to extract text content
    let extractedText = '';
    let isTableFile = fileType === 'csv' || fileType === 'xlsx' || fileName?.endsWith('.csv') || fileName?.endsWith('.xlsx');

    if (isTableFile) {
      try {
        const base64Content = fileData.includes(',') ? fileData.split(',')[1] : fileData;
        const buffer = Buffer.from(base64Content, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        extractedText = XLSX.utils.sheet_to_csv(worksheet);
      } catch (err) {
        console.warn('Direct XLSX/CSV parse error:', err);
      }
    }

    // 2. If Gemini is available, use Gemini 3.7 Flash for deep semantic extraction & OCR
    if (ai) {
      const systemInstruction = `You are an elite, highly accurate Bank Statement Conversion & Financial OCR Specialist.
Your mission is to extract EVERY SINGLE transaction and account metadata with 100% mathematical precision from bank statements, passbooks, online banking exports, and scans across all global banks (e.g. JPMorgan Chase, Bank of America, Wells Fargo, Citibank, HDFC Bank, ICICI Bank, State Bank of India (SBI), Axis Bank, Barclays, HSBC, Lloyds, Revolut, Standard Chartered, ANZ, etc.).

Extraction Rules:
1. Metadata:
   - Identify bankName (e.g. "JPMorgan Chase Bank", "HDFC Bank Limited", etc.)
   - Identify accountHolder (Account holder name or company name)
   - Identify accountNumber (Mask sensitive part e.g. "•••• •••• •••• 1234")
   - Identify statementPeriod (e.g. "Jul 01, 2026 to Jul 31, 2026")
   - Identify startDate (YYYY-MM-DD) and endDate (YYYY-MM-DD)
   - Identify currency code ("USD", "INR", "GBP", "EUR", "CAD", "AUD", etc.) and currencySymbol ("$", "₹", "£", "€", etc.)
   - Identify openingBalance (number) and closingBalance (number)
   - Identify layoutDetected (brief description of layout/format detected)

2. Transactions Table:
   - Extract ALL transaction rows in chronological order.
   - date: Standardized ISO date string "YYYY-MM-DD".
   - originalDate: The exact raw date text as printed in the statement (e.g. "05/08/2026", "23-JUL-26").
   - description: Clean, complete particulars/narration. Remove noise, repeating page headers, table headers, or footers, but keep critical transaction details (merchant name, payee, UPI handle, reference tags).
   - reference: Any cheque number, UTR number, UPI ID, reference number, or transaction ID (empty string if none).
   - debit: Amount debited/withdrawn as a positive number (0 if deposit).
   - credit: Amount credited/deposited as a positive number (0 if withdrawal).
   - balance: Account balance immediately following this transaction (number).
   - category: Assign one accurate category from:
     ["Salary & Income", "Transfer & Remittance", "UPI / Digital Payment", "Grocery & Food", "Dining & Restaurants", "Utilities & Bills", "Shopping & Retail", "Travel & Transit", "Entertainment & Subscriptions", "Healthcare & Pharmacy", "Rent & Mortgage", "Bank Fees & Interest", "Investment & Savings", "Business Expense", "Other / Uncategorized"]
   - type: "debit" or "credit"
   - confidence: A float between 0.00 and 1.00 indicating OCR/parsing confidence. (If text is faint, distorted, or ambiguously aligned, assign < 0.85).
   - isFlagged: true if confidence < 0.85 or if numbers are ambiguous.
   - notes: Any helpful verification note if flagged.

3. Strict Accuracy:
   - NEVER fabricate or invent transactions.
   - DO NOT skip any transaction row.
   - Calculate mathematical reconciliation strictly.`;

      let contents: any;

      if (isTableFile && extractedText) {
        contents = [
          {
            text: `Please convert this bank statement data table into clean structured JSON following the required schema:\n\n${extractedText.slice(0, 50000)}`,
          },
        ];
      } else {
        // PDF or Image
        const cleanBase64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
        let detectedMime = mimeType || (fileType === 'pdf' ? 'application/pdf' : 'image/jpeg');
        if (fileName?.endsWith('.pdf')) detectedMime = 'application/pdf';
        else if (fileName?.endsWith('.png')) detectedMime = 'image/png';
        else if (fileName?.endsWith('.jpg') || fileName?.endsWith('.jpeg')) detectedMime = 'image/jpeg';

        contents = {
          parts: [
            {
              inlineData: {
                mimeType: detectedMime,
                data: cleanBase64,
              },
            },
            {
              text: `Analyze this bank statement document. Extract all account header metadata, opening/closing balance, currency, date format, and the entire list of transactions with exact dates, descriptions, references, debits, credits, balances, categories, and confidence scores. Output strictly in valid JSON format matching the schema.`,
            },
          ],
        };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bankName: { type: Type.STRING },
              accountHolder: { type: Type.STRING },
              accountNumber: { type: Type.STRING },
              statementPeriod: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              currency: { type: Type.STRING },
              currencySymbol: { type: Type.STRING },
              openingBalance: { type: Type.NUMBER },
              closingBalance: { type: Type.NUMBER },
              layoutDetected: { type: Type.STRING },
              confidenceScore: { type: Type.NUMBER },
              transactions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    originalDate: { type: Type.STRING },
                    description: { type: Type.STRING },
                    reference: { type: Type.STRING },
                    debit: { type: Type.NUMBER },
                    credit: { type: Type.NUMBER },
                    balance: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                    type: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                    isFlagged: { type: Type.BOOLEAN },
                    notes: { type: Type.STRING },
                  },
                  required: ['date', 'description', 'debit', 'credit', 'balance', 'type'],
                },
              },
            },
            required: ['bankName', 'currency', 'transactions'],
          },
        },
      });

      const rawJson = response.text?.trim() || '{}';
      const parsed = JSON.parse(rawJson);

      const currency = parsed.currency || 'USD';
      const currencySymbol = parsed.currencySymbol || getCurrencySymbol(currency);
      const reconciliation = calculateReconciliation(
        parsed.transactions || [],
        parsed.openingBalance || 0,
        parsed.closingBalance || 0,
        currency
      );

      const result = {
        id: `statement-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        fileName: fileName || 'Statement.pdf',
        fileType: fileType || 'pdf',
        fileSize: fileData.length,
        uploadDate: new Date().toISOString(),
        status: 'ready',
        layoutDetected: parsed.layoutDetected || 'Auto-Detected Universal Bank Statement Layout',
        confidenceScore: parsed.confidenceScore || 0.96,
        summary: {
          bankName: parsed.bankName || 'Universal Bank',
          bankLogoKey: (parsed.bankName || '').toLowerCase().replace(/[^a-z]/g, ''),
          accountHolder: parsed.accountHolder || 'Account Holder',
          accountNumber: parsed.accountNumber || '•••• •••• ••••',
          statementPeriod: parsed.statementPeriod || 'Current Statement Cycle',
          startDate: parsed.startDate || '',
          endDate: parsed.endDate || '',
          currency,
          currencySymbol,
          dateFormat: 'YYYY-MM-DD',
          ...reconciliation.summary,
        },
        transactions: reconciliation.sanitizedTransactions,
      };

      return res.json({ success: true, statement: result });
    }

    // 3. Fallback when no Gemini API key is configured or for local CSV parsing
    if (isTableFile && extractedText) {
      const lines = extractedText.split('\n').filter((l) => l.trim().length > 0);
      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.replace(/^["']|["']$/g, '').trim());
        if (parts.length >= 3) {
          const dateStr = parts[0] || new Date().toISOString().split('T')[0];
          const desc = parts[1] || 'Transaction';
          const amt1 = parseFloat(parts[2]?.replace(/[^0-9.-]/g, '') || '0') || 0;
          const amt2 = parts[3] ? parseFloat(parts[3]?.replace(/[^0-9.-]/g, '') || '0') || 0 : 0;
          const bal = parts[4] ? parseFloat(parts[4]?.replace(/[^0-9.-]/g, '') || '0') || 0 : 0;

          const isCredit = amt2 > 0 || (amt1 > 0 && !parts[3]);
          rows.push({
            id: `tx-csv-${i}`,
            date: dateStr,
            originalDate: dateStr,
            description: desc,
            reference: '',
            debit: isCredit ? 0 : Math.abs(amt1),
            credit: isCredit ? (amt2 > 0 ? amt2 : amt1) : 0,
            balance: bal,
            category: isCredit ? 'Salary & Income' : 'Other / Uncategorized',
            type: isCredit ? 'credit' : 'debit',
            confidence: 0.95,
            isFlagged: false,
          });
        }
      }

      const rec = calculateReconciliation(rows, 0, 0, 'USD');
      const fallbackStatement = {
        id: `statement-${Date.now()}`,
        fileName: fileName || 'Imported_Statement.csv',
        fileType: fileType || 'csv',
        fileSize: fileData.length,
        uploadDate: new Date().toISOString(),
        status: 'ready',
        layoutDetected: 'Tabular CSV / Spreadsheet Auto-Mapping',
        confidenceScore: 0.95,
        summary: {
          bankName: 'Imported Bank Statement',
          accountHolder: 'Account Holder',
          accountNumber: '•••• •••• ••••',
          statementPeriod: 'Custom Period',
          currency: 'USD',
          currencySymbol: '$',
          dateFormat: 'YYYY-MM-DD',
          ...rec.summary,
        },
        transactions: rec.sanitizedTransactions,
      };

      return res.json({ success: true, statement: fallbackStatement });
    }

    // Default error response if neither OCR model nor CSV tabular structure could be processed
    return res.status(500).json({
      error: 'Unable to process document. Please ensure Gemini API Key is active or provide a valid CSV/Excel/PDF.',
    });
  } catch (error: any) {
    console.error('Statement processing error:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred while converting the bank statement.',
    });
  }
});

// In-memory store for tracking verified referral visits
const referralVisits = new Map<string, Set<string>>(); // referralCode -> Set of unique visitorIds
const claimedReferrals = new Map<string, number>(); // referralCode -> count of claimed rewards

// Register an actual visit from a shared referral link
app.post('/api/referral/register-visit', (req, res) => {
  const { referralCode, visitorId } = req.body;
  if (!referralCode || !visitorId) {
    return res.status(400).json({ success: false, error: 'Missing referralCode or visitorId' });
  }

  // Prevent self-referral if visitor has same id as referralCode
  if (referralCode === visitorId) {
    return res.json({ success: false, message: 'Self referral ignored' });
  }

  if (!referralVisits.has(referralCode)) {
    referralVisits.set(referralCode, new Set());
  }

  const visitors = referralVisits.get(referralCode)!;
  const isNew = !visitors.has(visitorId);
  visitors.add(visitorId);

  return res.json({
    success: true,
    isNewVisitor: isNew,
    totalReferrals: visitors.size,
    message: isNew ? 'Referral visit verified!' : 'Existing referral visit acknowledged.',
  });
});

// Check if any verified referral visits have occurred for a given referralCode
app.get('/api/referral/check-rewards/:referralCode', (req, res) => {
  const { referralCode } = req.params;
  const visitors = referralVisits.get(referralCode);
  const totalVerified = visitors ? visitors.size : 0;
  const alreadyClaimed = claimedReferrals.get(referralCode) || 0;
  const unclaimed = Math.max(0, totalVerified - alreadyClaimed);

  return res.json({
    success: true,
    totalVerified,
    alreadyClaimed,
    unclaimed,
    rewardCredits: unclaimed * 10,
  });
});

// Acknowledge claiming of verified referral rewards
app.post('/api/referral/claim-rewards', (req, res) => {
  const { referralCode } = req.body;
  if (!referralCode) {
    return res.status(400).json({ success: false, error: 'Missing referralCode' });
  }
  const visitors = referralVisits.get(referralCode);
  const totalVerified = visitors ? visitors.size : 0;
  claimedReferrals.set(referralCode, totalVerified);

  return res.json({
    success: true,
    claimedTotal: totalVerified,
  });
});

// ==========================================
// Twilio Phone Number Verification Service
// ==========================================

// Lazy init Twilio Client
let twilioClientInstance: any = null;
function getTwilioClient(): any {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return null;
  }
  if (!twilioClientInstance) {
    try {
      twilioClientInstance = twilio(accountSid, authToken);
    } catch (err) {
      console.error('Failed to initialize Twilio client:', err);
      return null;
    }
  }
  return twilioClientInstance;
}

// In-memory OTP storage for phone verifications
interface PhoneOtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
  isServiceVerify?: boolean;
}
const phoneOtpStore = new Map<string, PhoneOtpEntry>();

// Clean up expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of phoneOtpStore.entries()) {
    if (entry.expiresAt < now) {
      phoneOtpStore.delete(phone);
    }
  }
}, 5 * 60 * 1000);

// Helper to sanitize phone number into E.164 format
function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[\s\-()]/g, '');
  if (!cleaned.startsWith('+')) {
    // If no leading +, prepend + (or default +1 if 10 digits)
    if (cleaned.length === 10) {
      cleaned = '+1' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
}

// Check Twilio configuration status
app.get('/api/twilio/config', (req, res) => {
  const hasAccountSid = Boolean(process.env.TWILIO_ACCOUNT_SID);
  const hasAuthToken = Boolean(process.env.TWILIO_AUTH_TOKEN);
  const hasPhoneNumber = Boolean(process.env.TWILIO_PHONE_NUMBER);
  const hasVerifyService = Boolean(process.env.TWILIO_VERIFY_SERVICE_SID);

  res.json({
    configured: hasAccountSid && hasAuthToken,
    hasVerifyService,
    hasPhoneNumber,
    mode: (hasAccountSid && hasAuthToken) ? 'live' : 'test_ready',
  });
});

// Send verification OTP via Twilio SMS or Twilio Verify Service
app.post('/api/twilio/send-otp', async (req, res) => {
  try {
    const { phoneNumber, name } = req.body;
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid phone number is required.' });
    }

    const formattedPhone = sanitizePhoneNumber(phoneNumber);
    if (formattedPhone.length < 8 || !/^\+[0-9]{7,16}$/.test(formattedPhone)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide a valid phone number with country code (e.g. +1 555 123 4567 or +91 9876543210).' 
      });
    }

    // Rate limiting: cooldown 30 seconds between sends for same phone
    const existing = phoneOtpStore.get(formattedPhone);
    const now = Date.now();
    if (existing && (now - existing.createdAt) < 30 * 1000) {
      const waitSecs = Math.ceil((30 * 1000 - (now - existing.createdAt)) / 1000);
      return res.status(429).json({ 
        success: false, 
        error: `Please wait ${waitSecs} seconds before requesting a new verification code.` 
      });
    }

    const twilioClient = getTwilioClient();
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;

    // Generate standard 6-digit numeric OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + (10 * 60 * 1000); // 10 minutes

    // 1. Try Twilio Verify V2 Service if configured
    if (twilioClient && verifyServiceSid) {
      try {
        const verification = await twilioClient.verify.v2
          .services(verifyServiceSid)
          .verifications.create({ to: formattedPhone, channel: 'sms' });

        phoneOtpStore.set(formattedPhone, {
          code: '', // Twilio Verify manages the actual code
          expiresAt,
          attempts: 0,
          createdAt: now,
          isServiceVerify: true,
        });

        return res.json({
          success: true,
          status: verification.status,
          phoneNumber: formattedPhone,
          message: `Verification SMS sent to ${formattedPhone} via Twilio Verify Service.`,
          expiresIn: 600,
        });
      } catch (verifyErr: any) {
        console.warn('Twilio Verify Service error, attempting fallback SMS:', verifyErr.message);
      }
    }

    // 2. Try Twilio Programmable Messaging SMS if phone number is configured
    if (twilioClient && twilioFromNumber) {
      try {
        const messageBody = `Your Bank Statement Converter verification code is: ${generatedOtp}. This code expires in 10 minutes. Do not share it with anyone.`;
        const message = await twilioClient.messages.create({
          body: messageBody,
          from: twilioFromNumber,
          to: formattedPhone,
        });

        phoneOtpStore.set(formattedPhone, {
          code: generatedOtp,
          expiresAt,
          attempts: 0,
          createdAt: now,
          isServiceVerify: false,
        });

        return res.json({
          success: true,
          status: message.status,
          phoneNumber: formattedPhone,
          sid: message.sid,
          message: `Verification SMS sent to ${formattedPhone}.`,
          expiresIn: 600,
        });
      } catch (smsErr: any) {
        console.error('Twilio SMS delivery error:', smsErr.message);
        return res.status(500).json({
          success: false,
          error: `Twilio SMS delivery failed: ${smsErr.message || 'Unknown error'}. Please verify your Twilio phone number and balance.`,
        });
      }
    }

    // 3. Fallback / Test Sandbox Mode (when TWILIO keys are not yet configured in environment)
    phoneOtpStore.set(formattedPhone, {
      code: generatedOtp,
      expiresAt,
      attempts: 0,
      createdAt: now,
      isServiceVerify: false,
    });

    return res.json({
      success: true,
      phoneNumber: formattedPhone,
      simulated: true,
      demoCode: generatedOtp,
      message: `Verification code generated for ${formattedPhone}.`,
      hint: 'Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN & TWILIO_PHONE_NUMBER in Settings for live SMS delivery.',
      expiresIn: 600,
    });
  } catch (err: any) {
    console.error('Send OTP Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to send verification SMS.' });
  }
});

// Verify OTP code entered by user
app.post('/api/twilio/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
      return res.status(400).json({ success: false, error: 'Phone number and verification code are required.' });
    }

    const formattedPhone = sanitizePhoneNumber(phoneNumber);
    const cleanedCode = code.toString().trim();

    if (cleanedCode.length < 4 || cleanedCode.length > 8) {
      return res.status(400).json({ success: false, error: 'Please enter a valid verification code.' });
    }

    const record = phoneOtpStore.get(formattedPhone);
    const now = Date.now();

    const twilioClient = getTwilioClient();
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    // Check with Twilio Verify Service if applicable
    if (record?.isServiceVerify && twilioClient && verifyServiceSid) {
      try {
        const verificationCheck = await twilioClient.verify.v2
          .services(verifyServiceSid)
          .verificationChecks.create({ to: formattedPhone, code: cleanedCode });

        if (verificationCheck.status === 'approved') {
          phoneOtpStore.delete(formattedPhone);
          return res.json({
            success: true,
            verified: true,
            phoneNumber: formattedPhone,
            verifiedAt: new Date().toISOString(),
            message: 'Phone number verified successfully via Twilio Verify.',
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid verification code. Please check and try again.',
          });
        }
      } catch (checkErr: any) {
        console.error('Twilio Verify Check error:', checkErr);
        return res.status(400).json({
          success: false,
          error: checkErr.message || 'Verification check failed.',
        });
      }
    }

    // Direct OTP verification check
    if (!record) {
      return res.status(400).json({ 
        success: false, 
        error: 'No active verification code found for this phone number. Please request a new code.' 
      });
    }

    if (now > record.expiresAt) {
      phoneOtpStore.delete(formattedPhone);
      return res.status(400).json({ 
        success: false, 
        error: 'Verification code has expired. Please request a new code.' 
      });
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      phoneOtpStore.delete(formattedPhone);
      return res.status(429).json({ 
        success: false, 
        error: 'Too many incorrect attempts. Please request a new code.' 
      });
    }

    if (record.code !== cleanedCode) {
      return res.status(400).json({ 
        success: false, 
        error: `Incorrect code. ${5 - record.attempts} attempt(s) remaining.` 
      });
    }

    // Successfully verified!
    phoneOtpStore.delete(formattedPhone);

    return res.json({
      success: true,
      verified: true,
      phoneNumber: formattedPhone,
      verifiedAt: new Date().toISOString(),
      message: 'Phone number successfully verified with Twilio!',
    });
  } catch (err: any) {
    console.error('Verify OTP Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to verify code.' });
  }
});

// Sitemap XML Endpoint
app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(renderSitemapXml());
});

// Robots.txt Endpoint
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /history\nDisallow: /account\n\nSitemap: https://www.aistatementconvert.online/sitemap.xml\n`);
});

// Open Graph Static/Dynamic 1200x630 Branded Image
app.get('/og-image.png', (req, res) => {
  const svgPath = path.join(process.cwd(), 'public', 'og-image.svg');
  if (fs.existsSync(svgPath)) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.sendFile(svgPath);
  } else {
    res.status(404).send('OG Image not found');
  }
});

// Google Search Console verification file endpoint
app.get('/googleb39d2bb795486d21.html', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send('google-site-verification: googleb39d2bb795486d21.html');
});

// Start Express server and mount Vite middleware
async function startServer() {
  let vite: any = null;

  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
  }

  // Server-rendered crawlable semantic HTML for all page routes
  app.get('*', async (req, res, next) => {
    // Let static assets and API requests pass through
    if (req.path.startsWith('/api') || (req.path.includes('.') && !req.path.endsWith('.html'))) {
      return next();
    }

    try {
      const { html, status } = renderPageHtml(req.path);

      if (process.env.NODE_ENV !== 'production' && vite) {
        const transformedHtml = await vite.transformIndexHtml(req.url, html);
        return res.status(status).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(transformedHtml);
      } else {
        return res.status(status).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(html);
      }
    } catch (err: any) {
      if (vite) {
        vite.ssrFixStacktrace(err);
      }
      return next(err);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bank Statement Converter Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
