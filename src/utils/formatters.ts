/**
 * Safely converts Rupee input (string or number) into integer paise.
 * Guaranteed to avoid JavaScript floating point errors like 19.99 * 100 = 1998.9999999999998
 */
export function rupeesToPaise(val: number | string): number {
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return 0;
    val = val.toFixed(2);
  }
  const clean = val.replace(/[^0-9.-]/g, '').trim();
  if (!clean || clean === '-' || clean === '.') return 0;

  const isNegative = clean.startsWith('-');
  const unsigned = isNegative ? clean.slice(1) : clean;

  const parts = unsigned.split('.');
  const wholePart = parts[0] ? parseInt(parts[0], 10) : 0;
  let fractionPart = 0;
  if (parts.length > 1 && parts[1]) {
    const fractionStr = parts[1].padEnd(2, '0').slice(0, 2);
    fractionPart = parseInt(fractionStr, 10);
  }

  const paise = wholePart * 100 + fractionPart;
  return isNegative ? -paise : paise;
}

/**
 * Safely converts integer paise to Rupee decimal number
 */
export function paiseToRupees(paise: number): number {
  if (!paise || isNaN(paise)) return 0;
  return paise / 100;
}

/**
 * Formats an integer amount of paise into Indian Rupee formatting (e.g., ₹1,25,000.00 or ₹1,25,000)
 * Uses the Indian numbering system: 2, 2, 3 digit grouping (Lakhs and Crores).
 */
export function formatINR(
  paise: number,
  options?: {
    showPaise?: boolean;
    compact?: boolean;
    symbol?: string;
    showSign?: boolean;
  }
): string {
  const {
    showPaise = false,
    compact = false,
    symbol = '₹',
    showSign = false
  } = options || {};

  if (isNaN(paise)) paise = 0;
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);

  if (compact && absPaise >= 10000000) {
    const rupees = absPaise / 100;
    if (rupees >= 10000000) {
      const cr = parseFloat((rupees / 10000000).toFixed(2));
      const prefix = isNegative ? '-' : showSign && paise > 0 ? '+' : '';
      return `${prefix}${symbol}${cr} Cr`;
    }
    if (rupees >= 100000) {
      const lk = parseFloat((rupees / 100000).toFixed(2));
      const prefix = isNegative ? '-' : showSign && paise > 0 ? '+' : '';
      return `${prefix}${symbol}${lk} L`;
    }
  }

  const rupees = Math.floor(absPaise / 100);
  const remainingPaise = absPaise % 100;

  // Format integer part using Indian grouping
  let rupeeStr = rupees.toString();
  if (rupeeStr.length > 3) {
    const lastThree = rupeeStr.substring(rupeeStr.length - 3);
    const otherNumbers = rupeeStr.substring(0, rupeeStr.length - 3);
    const formattedOthers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    rupeeStr = `${formattedOthers},${lastThree}`;
  }

  let formatted = `${symbol}${rupeeStr}`;
  if (showPaise) {
    formatted += `.${remainingPaise.toString().padStart(2, '0')}`;
  }

  if (isNegative) {
    return `-${formatted}`;
  }
  if (showSign && paise > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Returns a friendly date representation
 */
export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Get current month string in YYYY-MM
 */
export function getCurrentMonthKey(d = new Date()): string {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Format Month Key "2026-10" to "October 2026"
 */
export function formatMonthName(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * Formats ISO backup date into human relative time like "Today", "Yesterday", "3 days ago", or "Never"
 */
export function formatBackupAge(isoDate?: string, now = Date.now()): string {
  if (!isoDate) return 'Never';
  const timestamp = new Date(isoDate).getTime();
  if (isNaN(timestamp)) return 'Never';
  const diffMs = now - timestamp;
  if (diffMs < 0) return 'Just now';
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

