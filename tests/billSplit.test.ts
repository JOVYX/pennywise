import { describe, it, expect } from 'vitest';
import {
  calculateBillSplit,
  buildSplitSettlement,
  formatWhatsAppSummary
} from '../src/utils/billSplitter';

describe('Bill Splitter Math and Settlement', () => {
  it('splits equally with exact paisa distribution and zero loss', () => {
    // ₹100 split among 3 people = 10000 paise / 3 = 3333 + 3333 + 3334
    const participants = [
      { id: '1', name: 'You', isSelf: true },
      { id: '2', name: 'Aman', isSelf: false },
      { id: '3', name: 'Rohan', isSelf: false }
    ];

    const result = calculateBillSplit(10000, participants, 'equal');
    expect(result.remainderPaise).toBe(0);

    const sum = result.participants.reduce((acc, p) => acc + p.amountPaise, 0);
    expect(sum).toBe(10000);

    expect(result.participants[0].amountPaise).toBe(3334);
    expect(result.participants[1].amountPaise).toBe(3333);
    expect(result.participants[2].amountPaise).toBe(3333);
  });

  it('splits by shares correctly', () => {
    // 30000 paise (₹300) split with shares: You (2), Priya (1) => 20000 and 10000
    const participants = [
      { id: '1', name: 'You', isSelf: true, shares: 2 },
      { id: '2', name: 'Priya', isSelf: false, shares: 1 }
    ];

    const result = calculateBillSplit(30000, participants, 'shares');
    expect(result.remainderPaise).toBe(0);
    expect(result.participants[0].amountPaise).toBe(20000);
    expect(result.participants[1].amountPaise).toBe(10000);
  });

  it('builds settlement debts when user paid the bill', () => {
    const participants = [
      { id: '1', name: 'You', isSelf: true, amountPaise: 30000 },
      { id: '2', name: 'Aman', isSelf: false, amountPaise: 30000 },
      { id: '3', name: 'Rohan', isSelf: false, amountPaise: 30000 }
    ];

    const settlement = buildSplitSettlement({
      billTitle: 'Swiggy Dinner',
      totalPaise: 90000,
      payerName: 'You',
      isPayerSelf: true,
      participants
    });

    expect(settlement.userNetExpensePaise).toBe(30000);
    expect(settlement.debtsToCreate.length).toBe(2);
    expect(settlement.debtsToCreate[0].type).toBe('lent_to_friend');
    expect(settlement.debtsToCreate[0].lender).toBe('Aman');
    expect(settlement.debtsToCreate[0].amountPaise).toBe(30000);
  });

  it('builds debt owed when friend paid the bill', () => {
    const participants = [
      { id: '1', name: 'You', isSelf: true, amountPaise: 40000 },
      { id: '2', name: 'Aman', isSelf: false, amountPaise: 40000 }
    ];

    const settlement = buildSplitSettlement({
      billTitle: 'Flat Wi-Fi',
      totalPaise: 80000,
      payerName: 'Aman',
      isPayerSelf: false,
      participants
    });

    expect(settlement.userNetExpensePaise).toBe(40000);
    expect(settlement.debtsToCreate.length).toBe(1);
    expect(settlement.debtsToCreate[0].type).toBe('personal_debt');
    expect(settlement.debtsToCreate[0].lender).toBe('Aman');
    expect(settlement.debtsToCreate[0].amountPaise).toBe(40000);
  });

  it('generates WhatsApp formatted share text', () => {
    const text = formatWhatsAppSummary({
      billTitle: 'Tapri Chai & Samosa',
      totalPaise: 9000,
      payerName: 'You',
      isPayerSelf: true,
      participants: [
        { id: '1', name: 'You', isSelf: true, amountPaise: 3000 },
        { id: '2', name: 'Rohan', isSelf: false, amountPaise: 6000 }
      ]
    });

    expect(text).toContain('Tapri Chai & Samosa');
    expect(text).toContain('Rohan');
    expect(text).toContain('UPI');
  });
});
