import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  initializeDatabase,
  exportDatabaseToJson,
  importDatabaseFromJson,
  exportTransactionsToCsv,
  seedSampleData,
  clearSampleData,
  resetAllData
} from '../src/db';

describe('Database Storage & Backup Verification', () => {
  beforeEach(async () => {
    await resetAllData();
  });

  it('initializes default categories and accounts on fresh launch', async () => {
    await initializeDatabase();
    const categories = await db.categories.toArray();
    const accounts = await db.accounts.toArray();

    expect(categories.length).toBeGreaterThan(10);
    expect(accounts.length).toBe(3); // Bank, UPI Wallet, Cash
    const rentCat = categories.find((c) => c.id === 'rent-housing');
    expect(rentCat).toBeDefined();
    expect(rentCat?.classification).toBe('essential');
  });

  it('seeds sample data and cleanly removes it without touching user data', async () => {
    await initializeDatabase();

    // Add user's real transaction
    await db.transactions.put({
      id: 'real-user-tx-1',
      type: 'expense',
      amountPaise: 50000,
      accountId: 'acc-primary-bank',
      categoryId: 'food-mess',
      date: '2026-10-15T12:00:00Z',
      merchant: 'Real User Canteen',
      paymentMethod: 'upi',
      createdAt: '2026-10-15T12:00:00Z',
      updatedAt: '2026-10-15T12:00:00Z'
    });

    // Seed sample data
    await seedSampleData();
    const allTxAfterSeed = await db.transactions.toArray();
    expect(allTxAfterSeed.length).toBeGreaterThan(5);

    // Clear only sample data
    await clearSampleData();
    const remainingTx = await db.transactions.toArray();
    expect(remainingTx.length).toBe(1);
    expect(remainingTx[0].id).toBe('real-user-tx-1');
  });

  it('exports valid JSON and successfully restores with schema verification', async () => {
    await initializeDatabase();
    await seedSampleData();

    const jsonBackup = await exportDatabaseToJson();
    expect(jsonBackup).toContain('"app": "Pennywise"');

    // Wipe database
    await resetAllData();
    expect(await db.transactions.count()).toBe(0);

    // Restore from backup
    const result = await importDatabaseFromJson(jsonBackup);
    expect(result.success).toBe(true);

    const restoredTx = await db.transactions.count();
    expect(restoredTx).toBeGreaterThan(0);
  });

  it('rejects malformed or invalid backup files', async () => {
    const invalidJson = JSON.stringify({ app: 'NotPennywise', data: {} });
    const result = await importDatabaseFromJson(invalidJson);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Missing Pennywise signature');
  });

  it('exports transactions to valid CSV format', async () => {
    await initializeDatabase();
    await seedSampleData();

    const csv = await exportTransactionsToCsv();
    expect(csv).toContain('Transaction ID,Date,Type,Amount (₹)');
    expect(csv).toContain('Sharma PG Owner');
  });
});
