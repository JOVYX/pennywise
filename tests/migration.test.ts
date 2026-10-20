import Dexie from 'dexie';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PennywiseDB } from '../src/db';
import { AppSettings } from '../src/types';

class Version1TestDB extends Dexie {
  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      accounts: 'id, name, type, isArchived, createdAt',
      categories: 'id, name, type, classification, order',
      transactions: 'id, type, accountId, categoryId, date, [date+type], isDemo, createdAt',
      savingsGoals: 'id, priority, targetDate, isDemo, createdAt',
      debts: 'id, isPaidOff, dueDate, isDemo, createdAt',
      recurringRules: 'id, type, isActive, nextDueDate, isDemo, createdAt',
      budgets: 'month',
      settings: 'key'
    });
  }
}

describe('Dexie Database Schema Migration (Version 1 -> Version 2)', () => {
  const TEST_DB_NAME = 'MigrationTestDB';

  beforeEach(async () => {
    await Dexie.delete(TEST_DB_NAME);
  });

  afterEach(async () => {
    await Dexie.delete(TEST_DB_NAME);
  });

  it('migrates from Version 1 to Version 2 preserving all data and adding sane defaults', async () => {
    // 1. Seed database with Version 1 schema
    const dbV1 = new Version1TestDB(TEST_DB_NAME);
    await dbV1.open();

    expect(dbV1.verno).toBe(1);

    // Seed v1 records missing v2 properties
    await dbV1.table('accounts').bulkAdd([
      {
        id: 'acc-primary-bank',
        name: 'Primary SBI',
        type: 'bank',
        openingBalancePaise: 500000,
        createdAt: '2026-09-01T00:00:00Z'
        // Missing: isArchived, isDefault
      },
      {
        id: 'acc-wallet-test',
        name: 'Paytm Wallet',
        type: 'wallet',
        openingBalancePaise: 200000,
        createdAt: '2026-09-01T00:00:00Z'
        // Missing: isArchived, isDefault
      }
    ]);

    await dbV1.table('transactions').bulkAdd([
      {
        id: 'tx-old-1',
        type: 'expense',
        amountPaise: 12000,
        accountId: 'acc-primary-bank',
        categoryId: 'food-mess',
        date: '2026-09-02T10:00:00Z',
        merchant: 'Mess Canteen',
        createdAt: '2026-09-02T10:00:00Z',
        updatedAt: '2026-09-02T10:00:00Z'
        // Missing: paymentMethod
      }
    ]);

    await dbV1.table('settings').put({
      key: 'app_settings',
      value: {
        currency: 'INR',
        currencySymbol: '₹',
        theme: 'dark',
        showPaise: false
      }
    });

    // Verify v1 contents
    expect(await dbV1.table('accounts').count()).toBe(2);
    expect(await dbV1.table('transactions').count()).toBe(1);

    // Close v1 database
    dbV1.close();

    // 2. Open with Current PennywiseDB (which includes Version 2 and .upgrade())
    const dbCurrent = new PennywiseDB(TEST_DB_NAME);
    await dbCurrent.open();

    // Verify database upgraded to Version 2
    expect(dbCurrent.verno).toBe(2);

    // Verify all records survived
    const accounts = await dbCurrent.accounts.toArray();
    expect(accounts.length).toBe(2);

    const primaryAcc = accounts.find((a) => a.id === 'acc-primary-bank');
    expect(primaryAcc).toBeDefined();
    expect(primaryAcc?.name).toBe('Primary SBI');
    expect(primaryAcc?.isArchived).toBe(false);
    expect(primaryAcc?.isDefault).toBe(true);

    const walletAcc = accounts.find((a) => a.id === 'acc-wallet-test');
    expect(walletAcc).toBeDefined();
    expect(walletAcc?.name).toBe('Paytm Wallet');
    expect(walletAcc?.isArchived).toBe(false);
    expect(walletAcc?.isDefault).toBe(false);

    // Verify transaction records survived with sane defaults
    const transactions = await dbCurrent.transactions.toArray();
    expect(transactions.length).toBe(1);
    expect(transactions[0].id).toBe('tx-old-1');
    expect(transactions[0].amountPaise).toBe(12000);
    expect(transactions[0].paymentMethod).toBe('upi');

    // Verify settings records survived and merged with defaults
    const settingsRecord = await dbCurrent.settings.get('app_settings');
    expect(settingsRecord).toBeDefined();
    const settingsValue = settingsRecord?.value as AppSettings;
    expect(settingsValue.currency).toBe('INR');
    expect(settingsValue.dailyAllowanceStrategy).toBe('balanced'); // Sane default from DEFAULT_SETTINGS

    dbCurrent.close();
  });
});
