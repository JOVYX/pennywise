import readXlsxFile from 'read-excel-file/universal';
import { PaymentMethod, TransactionType, Category, Transaction } from '../types';
import { autoCategorize } from './smsParser';

export type BankStatementFormat = 'sbi' | 'hdfc' | 'icici' | 'axis' | 'generic';

export interface ParsedStatementTransaction {
  id: string; // temporary key for preview and selection
  date: string; // ISO date string
  rawDate: string;
  narration: string;
  merchant: string;
  type: TransactionType;
  amountPaise: number;
  balancePaise?: number;
  referenceNo?: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  isDuplicate: boolean;
  selected: boolean;
}

export interface StatementParseResult {
  detectedBank: BankStatementFormat;
  bankDisplayName: string;
  totalParsed: number;
  newCount: number;
  duplicateCount: number;
  transactions: ParsedStatementTransaction[];
  accountNumberHint?: string;
  errors: string[];
}

/**
 * Universal CSV line splitter compliant with RFC 4180
 * Handles quotes, commas, tabs, semicolons, and escaped quotes.
 */
export function parseCsvText(text: string): string[][] {
  if (!text || text.trim().length === 0) return [];

  // Detect delimiter: comma, tab, or semicolon
  const sampleLines = text.split('\n').slice(0, 15).join('\n');
  const commaCount = (sampleLines.match(/,/g) || []).length;
  const tabCount = (sampleLines.match(/\t/g) || []).length;
  const semiCount = (sampleLines.match(/;/g) || []).length;

  let delimiter = ',';
  if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';
  else if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Converts File (CSV or Excel) into a standard 2D string matrix.
 */
export async function fileToMatrix(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const rawRows = ((await readXlsxFile(file)) as unknown) as any[][];
    return rawRows.map((row: any[]) =>
      row.map((cell: any) => {
        if (cell === null || cell === undefined) return '';
        if (cell instanceof Date) {
          // Format ISO date
          return cell.toISOString().split('T')[0];
        }
        return String(cell).trim();
      })
    );
  }

  // Otherwise assume text / CSV
  const text = await file.text();
  return parseCsvText(text);
}

/**
 * Parses Bank Statement 2D matrix into structured financial transactions.
 */
export function parseStatementMatrix(
  rows: string[][],
  existingTransactions: Transaction[] = [],
  categories: Category[] = []
): StatementParseResult {
  const errors: string[] = [];

  if (!rows || rows.length === 0) {
    return {
      detectedBank: 'generic',
      bankDisplayName: 'Unknown Document',
      totalParsed: 0,
      newCount: 0,
      duplicateCount: 0,
      transactions: [],
      errors: ['File is empty or contains no readable rows']
    };
  }

  // 1. Detect Account Number Hint in header rows
  let accountNumberHint: string | undefined;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const rowStr = rows[i].join(' ');
    const accMatch = rowStr.match(/(?:account\s*(?:no\.?|number)|a\/c\s*no\.?)\s*[:\-]?\s*([0-9xX*]{6,18})/i);
    if (accMatch) {
      accountNumberHint = accMatch[1].trim();
      break;
    }
  }

  // 2. Locate Header Row Candidate
  let headerIndex = -1;
  let detectedBank: BankStatementFormat = 'generic';

  for (let i = 0; i < Math.min(35, rows.length); i++) {
    const row = rows[i].map((c) => c.toLowerCase());
    const rowStr = row.join(' ');

    const hasDate = row.some((c) => /date|txn\s*dt|tran\s*date|timestamp/i.test(c));
    const hasDesc = row.some((c) => /narration|description|particulars|details|remarks|merchant|payee/i.test(c));
    const hasAmount = row.some((c) => /debit|withdrawal|credit|deposit|amount|amt/i.test(c));

    if (hasDate && hasDesc && hasAmount) {
      headerIndex = i;

      // Identify Bank
      if (rowStr.includes('branch code') || (rowStr.includes('txn date') && rowStr.includes('ref no'))) {
        detectedBank = 'sbi';
      } else if (rowStr.includes('withdrawal amt') || rowStr.includes('deposit amt') || rowStr.includes('chq./ref.no')) {
        detectedBank = 'hdfc';
      } else if (rowStr.includes('transaction details') && (rowStr.includes('withdrawal amount') || rowStr.includes('cheque number'))) {
        detectedBank = 'icici';
      } else if (rowStr.includes('tran date') && rowStr.includes('particulars')) {
        detectedBank = 'axis';
      } else {
        detectedBank = 'generic';
      }
      break;
    }
  }

  if (headerIndex === -1) {
    return {
      detectedBank: 'generic',
      bankDisplayName: 'Generic Statement',
      totalParsed: 0,
      newCount: 0,
      duplicateCount: 0,
      transactions: [],
      errors: ['Could not identify table headers (Date, Description, Debit/Credit). Please check format.']
    };
  }

  const headerRow = rows[headerIndex].map((c) => c.toLowerCase().trim());
  const bankNames: Record<BankStatementFormat, string> = {
    sbi: 'State Bank of India (SBI)',
    hdfc: 'HDFC Bank',
    icici: 'ICICI Bank',
    axis: 'Axis Bank',
    generic: 'Universal Bank Statement'
  };

  // Find column indexes
  const colDate = findColumnIndex(headerRow, [
    'txn date',
    'transaction date',
    'tran date',
    'value date',
    'posting date',
    'date',
    'txn dt'
  ]);
  const colDesc = findColumnIndex(headerRow, [
    'narration',
    'description',
    'particulars',
    'transaction details',
    'remarks',
    'details',
    'merchant',
    'payee'
  ]);
  const colDebit = findColumnIndex(headerRow, [
    'debit',
    'withdrawal amt.',
    'withdrawal amt',
    'withdrawal amount',
    'withdrawal',
    'dr amt',
    'dr'
  ]);
  const colCredit = findColumnIndex(headerRow, [
    'credit',
    'deposit amt.',
    'deposit amt',
    'deposit amount',
    'deposit',
    'cr amt',
    'cr'
  ]);
  const colAmount = findColumnIndex(headerRow, ['amount', 'txn amount', 'net amount', 'total']);
  const colBalance = findColumnIndex(headerRow, ['balance', 'closing balance', 'bal', 'avl bal']);
  const colRef = findColumnIndex(headerRow, ['chq./ref.no.', 'ref no./cheque no.', 'cheque number', 'ref no', 'utr', 'chqno']);
  const colType = findColumnIndex(headerRow, ['type', 'cr/dr', 'd/c', 'dr/cr']);

  const parsedTransactions: ParsedStatementTransaction[] = [];

  // Parse Data Rows
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 2) continue;

    // Check if it's a footer or summary line
    const rowJoined = row.join(' ').toLowerCase();
    if (
      rowJoined.includes('statement summary') ||
      rowJoined.includes('total :') ||
      rowJoined.includes('total amount') ||
      rowJoined.includes('closing balance') ||
      rowJoined.includes('end of statement') ||
      rowJoined.includes('computer generated')
    ) {
      continue;
    }

    let rawDate = colDate >= 0 ? (row[colDate] || '').trim() : '';
    const rawDesc = colDesc >= 0 ? (row[colDesc] || '').trim() : '';

    if (!rawDesc) continue;

    let isoDate = normalizeDate(rawDate);
    // If configured date column failed, scan other row cells for a valid date
    if (!isoDate) {
      for (let c = 0; c < row.length; c++) {
        if (c !== colDesc && c !== colDebit && c !== colCredit && c !== colAmount) {
          const candidateIso = normalizeDate(row[c]);
          if (candidateIso) {
            rawDate = row[c];
            isoDate = candidateIso;
            break;
          }
        }
      }
    }

    if (!isoDate) continue; // invalid date, skip row

    // Amount & Type Determination
    let type: TransactionType = 'expense';
    let amountPaise = 0;

    const debitStr = colDebit >= 0 ? row[colDebit] : '';
    const creditStr = colCredit >= 0 ? row[colCredit] : '';
    const amountStr = colAmount >= 0 ? row[colAmount] : '';
    const typeIndicator = colType >= 0 ? (row[colType] || '').toLowerCase() : '';

    const debitVal = parseRupeeNumber(debitStr);
    const creditVal = parseRupeeNumber(creditStr);
    const genericAmountVal = parseRupeeNumber(amountStr);

    if (debitVal > 0) {
      type = 'expense';
      amountPaise = Math.round(debitVal * 100);
    } else if (creditVal > 0) {
      type = 'income';
      amountPaise = Math.round(creditVal * 100);
    } else if (genericAmountVal !== 0) {
      if (typeIndicator.includes('cr') || typeIndicator.includes('credit')) {
        type = 'income';
        amountPaise = Math.round(Math.abs(genericAmountVal) * 100);
      } else if (typeIndicator.includes('dr') || typeIndicator.includes('debit')) {
        type = 'expense';
        amountPaise = Math.round(Math.abs(genericAmountVal) * 100);
      } else if (genericAmountVal < 0) {
        type = 'expense';
        amountPaise = Math.round(Math.abs(genericAmountVal) * 100);
      } else {
        type = 'income';
        amountPaise = Math.round(genericAmountVal * 100);
      }
    }

    if (amountPaise <= 0) continue; // no transaction amount found, skip

    // Reference Number
    let referenceNo: string | undefined = colRef >= 0 && row[colRef] ? row[colRef].trim() : undefined;
    if (referenceNo === '-' || referenceNo === '0') referenceNo = undefined;

    // Balance
    let balancePaise: number | undefined;
    if (colBalance >= 0 && row[colBalance]) {
      const bVal = parseRupeeNumber(row[colBalance]);
      if (!isNaN(bVal) && bVal > 0) {
        balancePaise = Math.round(bVal * 100);
      }
    }

    // Clean Merchant & Payment Method
    const { merchant, paymentMethod, extractedRef } = extractMerchantAndMethod(rawDesc, type);
    if (!referenceNo && extractedRef) {
      referenceNo = extractedRef;
    }

    // Auto-categorize
    const categoryId = autoCategorize(merchant, rawDesc, type, categories);

    // Duplicate Detection against existing DB records
    const isDuplicate = checkIsDuplicate(
      { date: isoDate, amountPaise, type, merchant, narration: rawDesc },
      existingTransactions
    );

    parsedTransactions.push({
      id: `stmt-${r}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: isoDate,
      rawDate,
      narration: rawDesc,
      merchant,
      type,
      amountPaise,
      balancePaise,
      referenceNo,
      categoryId,
      paymentMethod,
      isDuplicate,
      selected: !isDuplicate // unselect duplicates by default
    });
  }

  const duplicateCount = parsedTransactions.filter((t) => t.isDuplicate).length;
  const newCount = parsedTransactions.length - duplicateCount;

  return {
    detectedBank,
    bankDisplayName: bankNames[detectedBank],
    totalParsed: parsedTransactions.length,
    newCount,
    duplicateCount,
    transactions: parsedTransactions,
    accountNumberHint,
    errors
  };
}

/**
 * Finds column index by matching aliases
 */
function findColumnIndex(headers: string[], aliases: string[]): number {
  // Pass 1: Exact matches
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h === alias);
    if (idx !== -1) return idx;
  }
  // Pass 2: Substring matches
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h.includes(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Cleans currency strings: "1,250.50", "₹ 500.00", "Rs. 320" -> float
 */
export function parseRupeeNumber(val: string | undefined | null): number {
  if (!val) return 0;
  const cleaned = String(val)
    .replace(/[₹,$\s]/g, '')
    .replace(/rs\.?/gi, '')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Normalizes varied Indian date formats to standard ISO string
 * - 20-Oct-2026, 20/10/2026, 20-10-2026, 2026-10-20, 20/10/26
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  // Format: 20-Oct-2026 or 20-Oct-26
  const monMatch = trimmed.match(/^(\d{1,2})[-/\s]([a-zA-Z]{3})[a-zA-Z]*[-/\s](\d{2,4})/);
  if (monMatch) {
    const day = parseInt(monMatch[1], 10);
    const mStr = monMatch[2].toLowerCase();
    const month = months[mStr] ?? 0;
    let year = parseInt(monMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Format: 20/10/2026 or 20-10-2026 or 20/10/26 (DD/MM/YYYY)
  const numMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const month = parseInt(numMatch[2], 10) - 1;
    let year = parseInt(numMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

/**
 * Extracts human-friendly merchant name and payment method from raw bank narration
 */
export function extractMerchantAndMethod(
  narration: string,
  type: TransactionType
): { merchant: string; paymentMethod: PaymentMethod; extractedRef?: string } {
  let merchant = '';
  let paymentMethod: PaymentMethod = 'upi';
  let extractedRef: string | undefined;

  const n = narration.trim();

  // 1. UPI Patterns:
  // UPI/DR/203948/Zomato/Axis
  // UPI-SWIGGY-swiggy@icici-123456789012
  // TO TRANSFER-UPI/DR/229.../SWIGGY
  // BY TRANSFER-UPI/CR/229.../STIPEND
  if (/upi/i.test(n)) {
    paymentMethod = 'upi';

    // Format: UPI-MERCHANT-VPA-REF
    const hdfcUpiMatch = n.match(/upi-([a-zA-Z0-9\s&'.-]+?)-([a-zA-Z0-9_.-]+@[a-zA-Z]+)(?:-([0-9]+))?/i);
    if (hdfcUpiMatch) {
      merchant = hdfcUpiMatch[1].trim();
      extractedRef = hdfcUpiMatch[3];
    } else {
      // Format: UPI/DR/.../MERCHANT or UPI/CR/.../MERCHANT
      const parts = n.split('/');
      if (parts.length >= 3) {
        // Find longest alphabetic part or last part
        for (let i = parts.length - 1; i >= 0; i--) {
          const candidate = parts[i].trim();
          if (
            candidate.length > 2 &&
            !/^(dr|cr|upi|transfer|to|by|ref|imps|neft|[0-9]+)$/i.test(candidate)
          ) {
            merchant = candidate;
            break;
          }
        }
      }
    }
  } else if (/pos\s+/i.test(n) || /card/i.test(n)) {
    paymentMethod = 'card';
    const posMatch = n.match(/pos\s+(?:[0-9xX*]+\s+)?([a-zA-Z0-9\s&'.-]+)/i);
    if (posMatch) {
      merchant = posMatch[1].trim();
    }
  } else if (/(neft|rtgs|imps|ach|inf\/inft)/i.test(n)) {
    paymentMethod = 'netbanking';
    // e.g. ACH C- TECH MAHINDRA
    const achMatch = n.match(/(?:ach|neft|imps|inf)\s*[cd]?[-:\s]+([a-zA-Z0-9\s&'.-]+)/i);
    if (achMatch) {
      merchant = achMatch[1].trim();
    }
  } else if (/atm|cash/i.test(n)) {
    paymentMethod = 'cash';
    merchant = 'Cash Withdrawal';
  }

  // Fallback merchant cleaning
  if (!merchant || merchant.length < 2) {
    merchant = n.replace(/^(to transfer|by transfer|transfer to|dr|cr|neft|imps|ach)[-:\s]+/i, '').trim();
    if (merchant.length > 32) {
      merchant = merchant.slice(0, 32);
    }
  }

  // Clean trailing reference numbers
  merchant = merchant
    .replace(/\s+(ref|utr|rrn|no|id|txn|avl).*$/i, '')
    .replace(/[^a-zA-Z0-9\s&'.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (merchant.length <= 1) {
    merchant = type === 'income' ? 'Bank Credit' : 'Bank Expense';
  }

  // Title case if uppercase
  if (merchant === merchant.toUpperCase() && merchant.length > 3) {
    merchant = merchant
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return { merchant, paymentMethod, extractedRef };
}

/**
 * Checks if candidate statement transaction matches any existing database transaction
 */
export function checkIsDuplicate(
  candidate: {
    date: string;
    amountPaise: number;
    type: TransactionType;
    merchant: string;
    narration: string;
  },
  existingTransactions: Transaction[]
): boolean {
  if (!existingTransactions || existingTransactions.length === 0) return false;

  const candidateTime = new Date(candidate.date).getTime();
  const cMerchant = candidate.merchant.toLowerCase();

  return existingTransactions.some((tx) => {
    // 1. Must match amount and type exactly
    if (tx.amountPaise !== candidate.amountPaise || tx.type !== candidate.type) {
      return false;
    }

    // 2. Date must be within 36 hours (accounting for bank clearing time vs transaction time)
    const txTime = new Date(tx.date).getTime();
    const timeDiffMs = Math.abs(candidateTime - txTime);
    const withinWindow = timeDiffMs <= 36 * 60 * 60 * 1000;

    if (!withinWindow) return false;

    // 3. Match merchant similarity
    const txMerchant = tx.merchant.toLowerCase();
    if (
      txMerchant === cMerchant ||
      txMerchant.includes(cMerchant) ||
      cMerchant.includes(txMerchant) ||
      candidate.narration.toLowerCase().includes(txMerchant)
    ) {
      return true;
    }

    // If date is on the exact same calendar day and exact same amount
    const candDay = candidate.date.split('T')[0];
    const txDay = tx.date.split('T')[0];
    if (candDay === txDay) {
      return true;
    }

    return false;
  });
}
