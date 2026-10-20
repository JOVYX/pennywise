import { describe, it, expect } from 'vitest';
import {
  parseCsvText,
  parseStatementMatrix,
  normalizeDate,
  parseRupeeNumber,
  extractMerchantAndMethod,
  checkIsDuplicate
} from '../src/utils/statementParser';
import { Category, Transaction } from '../src/types';

const mockCategories: Category[] = [
  { id: 'food-mess', name: 'Mess & Food', type: 'expense', classification: 'essential', icon: 'Utensils', color: '#10b981' },
  { id: 'food-groceries', name: 'Groceries', type: 'expense', classification: 'essential', icon: 'ShoppingBag', color: '#06b6d4' },
  { id: 'transport-metro', name: 'Metro & Transport', type: 'expense', classification: 'essential', icon: 'Bus', color: '#3b82f6' },
  { id: 'income-stipend', name: 'Stipend', type: 'income', classification: 'essential', icon: 'Award', color: '#10b981' },
  { id: 'income-allowance', name: 'Allowance', type: 'income', classification: 'essential', icon: 'Wallet', color: '#6366f1' }
];

describe('Bank Statement Parser & Utilities', () => {
  describe('parseCsvText', () => {
    it('parses standard comma-separated lines', () => {
      const csv = 'Date,Merchant,Amount\n2026-10-20,Tapri,150\n2026-10-19,Mess,2000';
      const matrix = parseCsvText(csv);
      expect(matrix).toHaveLength(3);
      expect(matrix[0]).toEqual(['Date', 'Merchant', 'Amount']);
      expect(matrix[1]).toEqual(['2026-10-20', 'Tapri', '150']);
    });

    it('handles quoted fields with commas and escaped quotes', () => {
      const csv = '"Date","Narration, Details","Amount"\n"2026-10-20","Swiggy, Bangalore ""Order""","450.00"';
      const matrix = parseCsvText(csv);
      expect(matrix).toHaveLength(2);
      expect(matrix[1][1]).toBe('Swiggy, Bangalore "Order"');
      expect(matrix[1][2]).toBe('450.00');
    });

    it('auto-detects tab-separated values', () => {
      const tsv = 'Date\tDescription\tDebit\tCredit\n20-10-2026\tUPI-SWIGGY\t320.00\t';
      const matrix = parseCsvText(tsv);
      expect(matrix).toHaveLength(2);
      expect(matrix[1][1]).toBe('UPI-SWIGGY');
    });
  });

  describe('normalizeDate', () => {
    it('converts DD-Mon-YYYY to ISO format', () => {
      const res = normalizeDate('20-Oct-2026');
      expect(res).toBeDefined();
      expect(res?.startsWith('2026-10-20')).toBe(true);
    });

    it('converts DD/MM/YYYY to ISO format', () => {
      const res = normalizeDate('15/08/2026');
      expect(res).toBeDefined();
      expect(res?.startsWith('2026-08-15')).toBe(true);
    });

    it('preserves existing ISO dates', () => {
      const res = normalizeDate('2026-10-20T10:00:00.000Z');
      expect(res).toBeDefined();
      expect(res?.startsWith('2026-10-20')).toBe(true);
    });
  });

  describe('parseRupeeNumber', () => {
    it('cleans currency symbols, commas, and whitespace', () => {
      expect(parseRupeeNumber('₹ 1,500.50')).toBe(1500.5);
      expect(parseRupeeNumber('Rs. 320.00')).toBe(320);
      expect(parseRupeeNumber('45,000')).toBe(45000);
      expect(parseRupeeNumber('')).toBe(0);
    });
  });

  describe('extractMerchantAndMethod', () => {
    it('extracts merchant from HDFC UPI narration', () => {
      const res = extractMerchantAndMethod('UPI-SWIGGY-swiggy@icici-123456789012', 'expense');
      expect(res.merchant).toContain('Swiggy');
      expect(res.paymentMethod).toBe('upi');
    });

    it('extracts merchant from SBI UPI narration', () => {
      const res = extractMerchantAndMethod('TRANSFER TO 49202394024 / UPI / 204929492 / ZOMATO', 'expense');
      expect(res.merchant).toContain('Zomato');
      expect(res.paymentMethod).toBe('upi');
    });

    it('extracts merchant from POS card swipe', () => {
      const res = extractMerchantAndMethod('POS 401249XXXXXX1234 BLINKIT COMMERCE BANGALORE', 'expense');
      expect(res.merchant).toContain('Blinkit Commerce');
      expect(res.paymentMethod).toBe('card');
    });

    it('extracts merchant from NEFT/ACH stipend', () => {
      const res = extractMerchantAndMethod('ACH C- TECH MAHINDRA INTERNSHIP', 'income');
      expect(res.merchant).toContain('Tech Mahindra');
      expect(res.paymentMethod).toBe('netbanking');
    });
  });

  describe('SBI Statement Parsing', () => {
    it('skips account header metadata and parses transactions accurately', () => {
      const sbiMatrix = [
        ['Account Name :', 'Mr. Student'],
        ['Address :', 'Hostel 4, IIT Bombay'],
        ['Account Number :', '00000039201920392'],
        ['Branch :', 'POWAI'],
        ['Date', 'Txn Date', 'Value Date', 'Description', 'Ref No./Cheque No.', 'Branch Code', 'Debit', 'Credit', 'Balance'],
        ['1', '20-Oct-2026', '20-Oct-2026', 'TRANSFER TO 49202394024 / UPI / 204929492 / SWIGGY', 'UPI/204929492', '002', '320.00', '', '45000.00'],
        ['2', '19-Oct-2026', '19-Oct-2026', 'BY TRANSFER-NEFT*STUDENT STIPEND*INTERN', 'NEFT998877', '002', '', '15000.00', '45320.00']
      ];

      const res = parseStatementMatrix(sbiMatrix, [], mockCategories);

      expect(res.detectedBank).toBe('sbi');
      expect(res.accountNumberHint).toBe('00000039201920392');
      expect(res.totalParsed).toBe(2);
      expect(res.newCount).toBe(2);

      // 1. Swiggy expense
      const swiggy = res.transactions[0];
      expect(swiggy.type).toBe('expense');
      expect(swiggy.amountPaise).toBe(32000); // ₹320 = 32000 paise
      expect(swiggy.merchant).toContain('Swiggy');
      expect(swiggy.categoryId).toBe('food-mess');
      expect(swiggy.selected).toBe(true);

      // 2. Stipend income
      const stipend = res.transactions[1];
      expect(stipend.type).toBe('income');
      expect(stipend.amountPaise).toBe(1500000); // ₹15,000 = 1500000 paise
      expect(stipend.categoryId).toBe('income-stipend');
      expect(stipend.selected).toBe(true);
    });
  });

  describe('HDFC Statement Parsing', () => {
    it('parses HDFC statements with withdrawal and deposit columns', () => {
      const hdfcMatrix = [
        ['HDFC BANK LIMITED'],
        ['ACCOUNT STATEMENT FOR SAVINGS ACCOUNT NO: 50100492819283'],
        ['Date', 'Narration', 'Chq./Ref.No.', 'Value Dt', 'Withdrawal Amt.', 'Deposit Amt.', 'Closing Balance'],
        ['20/10/26', 'UPI-SWIGGY-swiggy@icici-123456789012', '123456789012', '20/10/26', '450.00', '', '12500.00'],
        ['18/10/26', 'ACH C- TECH CORP STIPEND', '998877', '18/10/26', '', '12000.00', '12950.00']
      ];

      const res = parseStatementMatrix(hdfcMatrix, [], mockCategories);

      expect(res.detectedBank).toBe('hdfc');
      expect(res.totalParsed).toBe(2);
      expect(res.transactions[0].amountPaise).toBe(45000);
      expect(res.transactions[0].type).toBe('expense');
      expect(res.transactions[1].amountPaise).toBe(1200000);
      expect(res.transactions[1].type).toBe('income');
    });
  });

  describe('Duplicate Detection', () => {
    it('flags transaction as duplicate if same date, amount, and merchant exist in DB', () => {
      const existing: Transaction[] = [
        {
          id: 'tx-existing-1',
          amountPaise: 32000,
          type: 'expense',
          merchant: 'Swiggy',
          date: '2026-10-20T12:00:00.000Z',
          categoryId: 'food-mess',
          accountId: 'acc-1',
          paymentMethod: 'upi',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const isDup = checkIsDuplicate(
        {
          date: '2026-10-20T14:30:00.000Z',
          amountPaise: 32000,
          type: 'expense',
          merchant: 'Swiggy',
          narration: 'UPI-SWIGGY-swiggy@icici'
        },
        existing
      );

      expect(isDup).toBe(true);

      const isNotDup = checkIsDuplicate(
        {
          date: '2026-10-20T14:30:00.000Z',
          amountPaise: 95000, // different amount
          type: 'expense',
          merchant: 'Swiggy',
          narration: 'UPI-SWIGGY-swiggy@icici'
        },
        existing
      );

      expect(isNotDup).toBe(false);
    });

    it('sets selected=false on duplicates in matrix parser', () => {
      const existing: Transaction[] = [
        {
          id: 'tx-1',
          amountPaise: 32000,
          type: 'expense',
          merchant: 'Swiggy',
          date: '2026-10-20T12:00:00.000Z',
          categoryId: 'food-mess',
          accountId: 'acc-1',
          paymentMethod: 'upi',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const sbiMatrix = [
        ['Date', 'Txn Date', 'Description', 'Ref No./Cheque No.', 'Branch Code', 'Debit', 'Credit', 'Balance'],
        ['1', '20-Oct-2026', 'TRANSFER TO 49202394024 / UPI / 204929492 / SWIGGY', 'UPI/204929492', '002', '320.00', '', '45000.00'],
        ['2', '19-Oct-2026', 'TRANSFER TO 49202394024 / UPI / 204929492 / UBER', 'UPI/204929493', '002', '140.00', '', '45320.00']
      ];

      const res = parseStatementMatrix(sbiMatrix, existing, mockCategories);

      expect(res.totalParsed).toBe(2);
      expect(res.duplicateCount).toBe(1);
      expect(res.newCount).toBe(1);

      // Swiggy is duplicate => selected false
      expect(res.transactions[0].isDuplicate).toBe(true);
      expect(res.transactions[0].selected).toBe(false);

      // Uber is new => selected true
      expect(res.transactions[1].isDuplicate).toBe(false);
      expect(res.transactions[1].selected).toBe(true);
    });
  });
});
