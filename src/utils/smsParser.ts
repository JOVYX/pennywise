import { ParsedSmsTransaction, TransactionType, PaymentMethod, Category } from '../types';

/**
 * Intelligent parser for Indian Bank, UPI & Wallet SMS alerts.
 * Supports HDFC, SBI, ICICI, Axis, PNB, Kotak, Paytm, PhonePe, Google Pay, and CRED messages.
 */
export function parseIndianSms(smsText: string, categories: Category[] = []): ParsedSmsTransaction | null {
  if (!smsText || typeof smsText !== 'string' || smsText.trim().length < 5) {
    return null;
  }

  const text = smsText.trim();

  // 1. Determine Transaction Type
  let type: TransactionType = 'expense';
  const isCredit =
    /(?:credited|received|deposited|cashback|refund|added\s+to)/i.test(text) &&
    !/(?:debited|spent|paid|withdrawn)/i.test(text);

  if (isCredit) {
    type = 'income';
  } else if (/(?:self\s+transfer|transferred\s+to\s+own\s+a\/c)/i.test(text)) {
    type = 'transfer';
  }

  // 2. Extract Amount
  // Matches Rs. 150, Rs 150.50, INR 1,200.00, ₹500, debited by 150
  const amountPatterns = [
    /(?:rs\.?|inr|₹)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i,
    /(?:debited|spent|paid|sent|credited|deposited)(?:\s+by|\s+for|\s+with)?\s*(?:rs\.?|inr|₹)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i,
    /([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)/i
  ];

  let rawAmount = '';
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Validate it's not an account number (e.g. A/c 1234)
      const val = match[1].replace(/,/g, '');
      if (parseFloat(val) > 0) {
        rawAmount = val;
        break;
      }
    }
  }

  if (!rawAmount) {
    return null;
  }

  const parsedFloat = parseFloat(rawAmount);
  if (isNaN(parsedFloat) || parsedFloat <= 0) {
    return null;
  }

  const amountPaise = Math.round(parsedFloat * 100);

  // 3. Extract Merchant / Recipient
  let merchant = '';
  const merchantPatterns = [
    /(?:to|at|vpa|paid to|sent to|transfer to)\s+([A-Za-z0-9\s&'.-]{2,30}?)(?:\s+(?:on|via|ref|upi|utr|avl|bal|using|from|txn|id)|\.|\n|$)/i,
    /(?:from)\s+([A-Za-z0-9\s&'.-]{2,30}?)(?:\s+(?:on|via|ref|upi|utr|avl|bal|using|to|txn|id)|\.|\n|$)/i,
    /(?:info[:\s]+)([A-Za-z0-9\s&'.-]{2,25})/i
  ];

  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Filter out non-merchant noise keywords
      if (!/^(a\/c|account|bank|your|upi|ref|utr|inr|rs|balance|card|ending)/i.test(candidate)) {
        merchant = candidate;
        break;
      }
    }
  }

  // Clean up merchant name
  merchant = cleanMerchantName(merchant || (type === 'income' ? 'Income Transfer' : 'Expense'));

  // 4. Payment Method
  let paymentMethod: PaymentMethod = 'upi';
  if (/(?:credit\s+card|debit\s+card|card\s+ending|pos\s+terminal|rupay|visa|mastercard)/i.test(text)) {
    paymentMethod = 'card';
  } else if (/(?:netbanking|neft|rtgs|imps|internet\s+banking)/i.test(text)) {
    paymentMethod = 'netbanking';
  } else if (/(?:atm|cash\s+withdrawal)/i.test(text)) {
    paymentMethod = 'cash';
  } else if (/(?:upi|gpay|google\s+pay|phonepe|paytm|bhim|cred|vpa)/i.test(text)) {
    paymentMethod = 'upi';
  }

  // 5. Date Parsing
  let date = new Date().toISOString();
  const parsedDate = extractDate(text);
  if (parsedDate) {
    date = parsedDate;
  }

  // 6. Account hint (e.g. "A/c ending 1234")
  const accMatch = text.match(/(?:a\/c|acct|ending|card)\s*(?:no\.?)?\s*[*xX]*([0-9]{3,4})/i);
  const accountHint = accMatch ? `A/c ending ${accMatch[1]}` : undefined;

  // 7. Auto-categorize
  const categoryId = autoCategorize(merchant, text, type, categories);

  const confidence: 'high' | 'medium' | 'low' =
    amountPaise > 0 && merchant !== 'Expense' && merchant !== 'Income Transfer' ? 'high' : 'medium';

  return {
    type,
    amountPaise,
    merchant,
    categoryId,
    paymentMethod,
    date,
    confidence,
    accountHint,
    rawText: text
  };
}

/**
 * Cleans extracted merchant string from trailing artifacts
 */
function cleanMerchantName(raw: string): string {
  let cleaned = raw
    .replace(/[._\-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove common prefix noise like "VPA " or "Transfer to "
  cleaned = cleaned.replace(/^(vpa\s+|transfer\s+to\s+|paid\s+to\s+|to\s+)/i, '');

  // Remove trailing reference fragments like "Ref 1234"
  cleaned = cleaned.replace(/\s+(ref|utr|txn|upi|avl|bal).*$/i, '');

  if (cleaned.length <= 1) return 'General Merchant';

  // Capitalize properly if all uppercase
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
    cleaned = cleaned
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return cleaned.slice(0, 32);
}

/**
 * Extracts date from Indian SMS date formats:
 * - 20-Oct-26 or 20-Oct-2026
 * - 20/10/2026 or 20-10-2026
 * - 20Oct26
 */
function extractDate(text: string): string | null {
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  // Pattern 1: 20-Oct-2026 or 20-Oct-26
  const monPattern = /\b(\d{1,2})[-/\s](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-/\s](\d{2,4})\b/i;
  const match1 = text.match(monPattern);
  if (match1) {
    const day = parseInt(match1[1], 10);
    const month = months[match1[2].toLowerCase().slice(0, 3)];
    let year = parseInt(match1[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Pattern 2: 20Oct26
  const compactPattern = /\b(\d{1,2})(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(\d{2,4})\b/i;
  const match2 = text.match(compactPattern);
  if (match2) {
    const day = parseInt(match2[1], 10);
    const month = months[match2[2].toLowerCase().slice(0, 3)];
    let year = parseInt(match2[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Pattern 3: 20-10-2026 or 20/10/2026
  const numPattern = /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/;
  const match3 = text.match(numPattern);
  if (match3) {
    const day = parseInt(match3[1], 10);
    const month = parseInt(match3[2], 10) - 1;
    let year = parseInt(match3[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

/**
 * Maps merchant and SMS context to the most appropriate category ID
 */
export function autoCategorize(
  merchant: string,
  fullText: string,
  type: TransactionType,
  availableCategories: Category[] = []
): string {
  const combined = (merchant + ' ' + fullText).toLowerCase();

  if (type === 'income') {
    if (/(?:stipend|salary|internship)/i.test(combined)) return 'income-stipend';
    if (/(?:cashback|reward)/i.test(combined)) return 'income-cashback';
    if (/(?:pocket\s*money|allowance|parents|papa|mom)/i.test(combined)) return 'income-allowance';
    return 'income-allowance';
  }

  // Expenses
  if (/(?:swiggy|zomato|tapri|chai|tea|canteen|mess|mcdonald|burger|domino|pizza|starbucks|cafe|restaurant|kfc)/i.test(combined)) {
    return 'food-mess';
  }
  if (/(?:blinkit|zepto|instamart|bigbasket|dmart|grocery|supermarket|vegetable|milk)/i.test(combined)) {
    return 'food-groceries';
  }
  if (/(?:uber|ola|rapido|metro|dmrc|irctc|petrol|fuel|indian\s*oil|bpcl|hpcl|auto)/i.test(combined)) {
    return 'transport-metro';
  }
  if (/(?:netflix|spotify|prime|youtube|hotstar|sonyliv|steam|movie|pvr|inox|bookmyshow)/i.test(combined)) {
    return 'subscriptions';
  }
  if (/(?:jio|airtel|vi\b|vodafone|bescom|electricity|wifi|broadband|recharge|cylinder|gas)/i.test(combined)) {
    return 'utilities-bills';
  }
  if (/(?:amazon|flipkart|myntra|ajio|meesho|nykaa|zara|h&m|clothing|shopping)/i.test(combined)) {
    return 'shopping-personal';
  }
  if (/(?:xerox|books|college|stationery|library|coursera|udemy)/i.test(combined)) {
    return 'education-books';
  }
  if (/(?:pharmacy|apollo|pharmeasy|1mg|doctor|clinic|hospital|medplus)/i.test(combined)) {
    return 'health-medical';
  }
  if (/(?:rent|flat|pg\b|landlord|owner|housing)/i.test(combined)) {
    return 'rent-housing';
  }
  if (/(?:splitwise|borrowed|repayment|friend|loan)/i.test(combined)) {
    return 'debt-repayment';
  }

  // Fallback to first expense category available or 'food-mess'
  const fallback = availableCategories.find((c) => c.type === 'expense');
  return fallback ? fallback.id : 'food-mess';
}
