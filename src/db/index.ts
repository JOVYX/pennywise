import Dexie, { type Table } from 'dexie';
import {
  Account,
  Category,
  Transaction,
  SavingsGoal,
  Debt,
  RecurringRule,
  BudgetConfig,
  AppSettings
} from '../types';
import { DEFAULT_CATEGORIES } from '../data/defaultCategories';

export interface SettingItem {
  key: string;
  value: any;
}

export class PennywiseDB extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  savingsGoals!: Table<SavingsGoal, string>;
  debts!: Table<Debt, string>;
  recurringRules!: Table<RecurringRule, string>;
  budgets!: Table<BudgetConfig, string>;
  settings!: Table<SettingItem, string>;

  constructor() {
    super('PennywiseDB');
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

export const db = new PennywiseDB();

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'INR',
  currencySymbol: '₹',
  theme: 'dark',
  firstDayOfWeek: 1, // Monday
  showPaise: false,
  dailyAllowanceStrategy: 'balanced',
  onboardingCompleted: false
};

/**
 * Initializes database with default categories, default accounts, and base settings if needed
 */
export async function initializeDatabase(): Promise<void> {
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  }

  const accountCount = await db.accounts.count();
  if (accountCount === 0) {
    const now = new Date().toISOString();
    await db.accounts.bulkAdd([
      {
        id: 'acc-primary-bank',
        name: 'Primary Bank (SBI / HDFC)',
        type: 'bank',
        openingBalancePaise: 0,
        color: '#3b82f6',
        icon: 'Landmark',
        isDefault: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'acc-upi-wallet',
        name: 'UPI / Paytm / GPay',
        type: 'wallet',
        openingBalancePaise: 0,
        color: '#10b981',
        icon: 'Smartphone',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'acc-cash',
        name: 'Cash in Pocket',
        type: 'cash',
        openingBalancePaise: 0,
        color: '#f59e0b',
        icon: 'Coins',
        createdAt: now,
        updatedAt: now
      }
    ]);
  }

  const settingsRecord = await db.settings.get('app_settings');
  if (!settingsRecord) {
    await db.settings.put({
      key: 'app_settings',
      value: DEFAULT_SETTINGS
    });
  }
}

/**
 * Exports all user data as a sanitized JSON backup
 */
export async function exportDatabaseToJson(): Promise<string> {
  const [
    accounts,
    categories,
    transactions,
    savingsGoals,
    debts,
    recurringRules,
    budgets,
    settings
  ] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.savingsGoals.toArray(),
    db.debts.toArray(),
    db.recurringRules.toArray(),
    db.budgets.toArray(),
    db.settings.toArray()
  ]);

  const backupData = {
    app: 'Pennywise',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      accounts,
      categories,
      transactions,
      savingsGoals,
      debts,
      recurringRules,
      budgets,
      settings
    }
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Restores all user data from a JSON backup with schema verification
 */
export async function importDatabaseFromJson(jsonContent: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = JSON.parse(jsonContent);
    if (!parsed || parsed.app !== 'Pennywise' || !parsed.data) {
      return { success: false, message: 'Invalid backup file: Missing Pennywise signature.' };
    }

    const {
      accounts,
      categories,
      transactions,
      savingsGoals,
      debts,
      recurringRules,
      budgets,
      settings
    } = parsed.data;

    if (!Array.isArray(accounts) || !Array.isArray(transactions)) {
      return { success: false, message: 'Invalid backup structure: accounts or transactions missing.' };
    }

    // Atomic wipe and restore
    await db.transaction(
      'rw',
      [
        db.accounts,
        db.categories,
        db.transactions,
        db.savingsGoals,
        db.debts,
        db.recurringRules,
        db.budgets,
        db.settings
      ],
      async () => {
        await Promise.all([
          db.accounts.clear(),
          db.categories.clear(),
          db.transactions.clear(),
          db.savingsGoals.clear(),
          db.debts.clear(),
          db.recurringRules.clear(),
          db.budgets.clear(),
          db.settings.clear()
        ]);

        if (accounts.length) await db.accounts.bulkAdd(accounts);
        if (categories && categories.length) await db.categories.bulkAdd(categories);
        if (transactions.length) await db.transactions.bulkAdd(transactions);
        if (savingsGoals && savingsGoals.length) await db.savingsGoals.bulkAdd(savingsGoals);
        if (debts && debts.length) await db.debts.bulkAdd(debts);
        if (recurringRules && recurringRules.length) await db.recurringRules.bulkAdd(recurringRules);
        if (budgets && budgets.length) await db.budgets.bulkAdd(budgets);
        if (settings && settings.length) await db.settings.bulkAdd(settings);

        // Update last backup date in settings
        const currentSettings = (await db.settings.get('app_settings'))?.value || DEFAULT_SETTINGS;
        currentSettings.lastBackupDate = new Date().toISOString();
        await db.settings.put({ key: 'app_settings', value: currentSettings });
      }
    );

    return { success: true, message: 'Data restored successfully.' };
  } catch (err: any) {
    return { success: false, message: `Failed to import data: ${err?.message || 'Unknown error'}` };
  }
}

/**
 * Exports transactions to CSV for Excel / Google Sheets
 */
export async function exportTransactionsToCsv(): Promise<string> {
  const [transactions, accounts, categories] = await Promise.all([
    db.transactions.toArray(),
    db.accounts.toArray(),
    db.categories.toArray()
  ]);

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = [
    'Transaction ID',
    'Date',
    'Type',
    'Amount (₹)',
    'Amount (Paise)',
    'Account',
    'To Account (Transfer)',
    'Category',
    'Subcategory',
    'Merchant / Recipient',
    'Payment Method',
    'Notes'
  ];

  const rows = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((t) => [
      t.id,
      t.date,
      t.type,
      (t.amountPaise / 100).toFixed(2),
      t.amountPaise.toString(),
      `"${accountMap.get(t.accountId) || t.accountId}"`,
      t.toAccountId ? `"${accountMap.get(t.toAccountId) || t.toAccountId}"` : '',
      `"${categoryMap.get(t.categoryId) || t.categoryId}"`,
      t.subCategory ? `"${t.subCategory}"` : '',
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      t.paymentMethod,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Resets all user data to clean slate
 */
export async function resetAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.categories,
      db.transactions,
      db.savingsGoals,
      db.debts,
      db.recurringRules,
      db.budgets,
      db.settings
    ],
    async () => {
      await Promise.all([
        db.accounts.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.savingsGoals.clear(),
        db.debts.clear(),
        db.recurringRules.clear(),
        db.budgets.clear(),
        db.settings.clear()
      ]);
    }
  );
  await initializeDatabase();
}

/**
 * Seeds realistic sample data for an Indian college student
 */
export async function seedSampleData(): Promise<void> {
  // Clear any existing demo data first
  await clearSampleData();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
  const monthKey = `${currentYear}-${currentMonth}`;

  const demoAccounts: Account[] = [
    {
      id: 'acc-sbi-student',
      name: 'SBI Student Savings',
      type: 'bank',
      openingBalancePaise: 1200000, // ₹12,000 opening
      color: '#3b82f6',
      icon: 'Landmark',
      isDefault: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'acc-paytm-upi',
      name: 'Paytm UPI Wallet',
      type: 'wallet',
      openingBalancePaise: 250000, // ₹2,500 opening
      color: '#10b981',
      icon: 'Smartphone',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'acc-pocket-cash',
      name: 'Cash in Pocket',
      type: 'cash',
      openingBalancePaise: 80000, // ₹800 opening
      color: '#f59e0b',
      icon: 'Coins',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  ];

  await db.accounts.bulkPut(demoAccounts);

  // Sample transactions throughout current month
  const d = (day: number, hours = 12, mins = 30) => {
    const dt = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28), hours, mins);
    return dt.toISOString();
  };

  const demoTransactions: Transaction[] = [
    // Income
    {
      id: 'demo-tx-1',
      type: 'income',
      amountPaise: 1500000, // ₹15,000 from parents
      accountId: 'acc-sbi-student',
      categoryId: 'income-family',
      subCategory: 'Monthly Pocket Money',
      date: d(1, 10, 0),
      merchant: 'Dad (UPI Transfer)',
      notes: 'Monthly allowance for rent and expenses',
      paymentMethod: 'upi',
      isDemo: true,
      createdAt: d(1),
      updatedAt: d(1)
    },
    {
      id: 'demo-tx-2',
      type: 'income',
      amountPaise: 400000, // ₹4,000 freelance
      accountId: 'acc-sbi-student',
      categoryId: 'income-freelance',
      subCategory: 'Coding / Design Gig',
      date: d(8, 16, 45),
      merchant: 'Frontend Landing Page Client',
      notes: 'Completed client website freelance work',
      paymentMethod: 'netbanking',
      isDemo: true,
      createdAt: d(8),
      updatedAt: d(8)
    },
    // Transfer to UPI
    {
      id: 'demo-tx-3',
      type: 'transfer',
      amountPaise: 300000, // ₹3,000 transferred to UPI
      accountId: 'acc-sbi-student',
      toAccountId: 'acc-paytm-upi',
      categoryId: 'miscellaneous',
      date: d(2, 11, 0),
      merchant: 'Self Transfer to UPI',
      notes: 'Loaded UPI for daily food & transport',
      paymentMethod: 'upi',
      isDemo: true,
      createdAt: d(2),
      updatedAt: d(2)
    },
    // Expenses
    {
      id: 'demo-tx-4',
      type: 'expense',
      amountPaise: 750000, // ₹7,500 PG rent
      accountId: 'acc-sbi-student',
      categoryId: 'rent-housing',
      subCategory: 'PG Rent',
      date: d(3, 9, 30),
      merchant: 'Sharma PG Owner',
      notes: 'October monthly room rent with electricity',
      paymentMethod: 'upi',
      isDemo: true,
      createdAt: d(3),
      updatedAt: d(3)
    },
    {
      id: 'demo-tx-5',
      type: 'expense',
      amountPaise: 280000, // ₹2,800 Mess
      accountId: 'acc-sbi-student',
      categoryId: 'food-mess',
      subCategory: 'Mess Bill',
      date: d(4, 14, 0),
      merchant: 'Campus Annapurna Mess',
      notes: 'Monthly lunch and dinner coupon card',
      paymentMethod: 'upi',
      isDemo: true,
      createdAt: d(4),
      updatedAt: d(4)
    },
    {
      id: 'demo-tx-6',
      type: 'expense',
      amountPaise: 60000, // ₹600 Metro recharge
      accountId: 'acc-paytm-upi',
      categoryId: 'transport',
      subCategory: 'Metro Smart Card',
      date: d(5, 8, 30),
      merchant: 'DMRC Metro Station Counter',
      notes: 'Recharge for college commute',
      paymentMethod: 'upi',
      isDemo: true,
      createdAt: d(5),
      updatedAt: d(5)
    },
    {
      id: 'demo-tx-7',
      type: 'expense',
      amountPaise: 29900, // ₹299 Mobile recharge
      accountId: 'acc-paytm-upi',
      categoryId: 'mobile-internet',
      subCategory: 'Jio / Airtel Recharge',
      date: d(6, 12, 0),
      merchant: 'Jio Prepaid App',
      notes: '1.5GB/day 28-day pack',
      paymentMethod: 'upi',
      isDemo: true,
      createdAt: d(6),
      updatedAt: d(6)
    },
    {
      id: 'demo-tx-8',
      type: 'expense',
      amountPaise: 45000, // ₹450 Chai and snacks
      accountId: 'acc-pocket-cash',
      categoryId: 'chai-snacks',
      subCategory: 'Chai Tapri',
      date: d(7, 17, 30),
      merchant: 'College Gate Tapri',
      notes: 'Evening ginger chai and samosas with friends',
      paymentMethod: 'cash',
      isDemo: true,
      createdAt: d(7),
      updatedAt: d(7)
    },
    {
      id: 'demo-tx-9',
      type: 'expense',
      amountPaise: 35000, // ₹350 Books and Xerox
      accountId: 'acc-paytm-upi',
      categoryId: 'college-education',
      subCategory: 'Printouts & Xerox',
      date: d(9, 11, 15),
      merchant: 'Sharma Stationery & Xerox',
      notes: 'Lab manuals and semester assignment binding',
      paymentMethod: 'upi',
      isDemo: true,
      createdAt: d(9),
      updatedAt: d(9)
    },
    {
      id: 'demo-tx-10',
      type: 'expense',
      amountPaise: 54000, // ₹540 Groceries & snacks
      accountId: 'acc-paytm-upi',
      categoryId: 'groceries',
      subCategory: 'Blinkit / Zepto',
      date: d(10, 20, 10),
      merchant: 'Blinkit Delivery',
      notes: 'Milk, oats, peanut butter, and biscuits',
      paymentMethod: 'upi',
      isDemo: true,
      createdAt: d(10),
      updatedAt: d(10)
    },
    {
      id: 'demo-tx-11',
      type: 'expense',
      amountPaise: 11900, // ₹119 Spotify
      accountId: 'acc-paytm-upi',
      categoryId: 'subscriptions',
      subCategory: 'Spotify / Apple Music',
      date: d(11, 9, 0),
      merchant: 'Spotify Premium Student',
      notes: 'Monthly student discount plan',
      paymentMethod: 'upi',
      isDemo: true,
      createdAt: d(11),
      updatedAt: d(11)
    },
    {
      id: 'demo-tx-12',
      type: 'expense',
      amountPaise: 45000, // ₹450 Movie hangout
      accountId: 'acc-paytm-upi',
      categoryId: 'entertainment-outings',
      subCategory: 'Movie Tickets',
      date: d(12, 19, 0),
      merchant: 'PVR Inox Cinemas',
      notes: 'Weekend movie ticket',
      paymentMethod: 'upi',
      isDemo: true,
      createdAt: d(12),
      updatedAt: d(12)
    }
  ];

  await db.transactions.bulkPut(demoTransactions);

  // Sample Savings Goals
  const demoGoals: SavingsGoal[] = [
    {
      id: 'demo-goal-emergency',
      name: 'College Emergency Fund',
      targetAmountPaise: 2500000, // ₹25,000 target
      currentAmountPaise: 1000000, // ₹10,000 saved
      targetDate: `${currentYear}-12-31`,
      priority: 'high',
      icon: 'ShieldAlert',
      color: '#10b981',
      notes: 'Safety cushion for medical emergency or sudden PG deposit',
      history: [
        {
          id: 'gh-1',
          date: d(2),
          amountPaise: 1000000,
          type: 'deposit',
          note: 'Allocated from stipend savings'
        }
      ],
      isDemo: true,
      createdAt: d(1),
      updatedAt: d(1)
    },
    {
      id: 'demo-goal-laptop',
      name: 'MacBook Air / Laptop Upgrade',
      targetAmountPaise: 7500000, // ₹75,000 target
      currentAmountPaise: 2200000, // ₹22,000 saved
      targetDate: `${currentYear + 1}-06-30`,
      priority: 'medium',
      icon: 'Laptop',
      color: '#3b82f6',
      notes: 'For coding, machine learning projects, and freelancing',
      history: [
        {
          id: 'gh-2',
          date: d(8),
          amountPaise: 2200000,
          type: 'deposit',
          note: 'Freelance web gig bonus allocated'
        }
      ],
      isDemo: true,
      createdAt: d(1),
      updatedAt: d(8)
    }
  ];

  await db.savingsGoals.bulkPut(demoGoals);

  // Sample Debts
  const demoDebts: Debt[] = [
    {
      id: 'demo-debt-roommate',
      name: 'Roommate (Rohan) - Wifi & Gas share',
      lender: 'Rohan (Roommate)',
      type: 'personal_debt',
      originalAmountPaise: 180000, // ₹1,800
      currentBalancePaise: 80000, // ₹800 remaining
      minimumPaymentPaise: 80000,
      dueDate: d(25),
      payments: [
        {
          id: 'dp-1',
          date: d(5),
          amountPaise: 100000,
          principalPaise: 100000,
          interestPaise: 0,
          note: 'Sent ₹1,000 via GPay'
        }
      ],
      isPaidOff: false,
      notes: 'Split of quarterly Wi-Fi router setup and gas cylinder',
      isDemo: true,
      createdAt: d(1),
      updatedAt: d(5)
    }
  ];

  await db.debts.bulkPut(demoDebts);

  // Sample Recurring Bills
  const demoRecurring: RecurringRule[] = [
    {
      id: 'demo-rec-rent',
      type: 'expense',
      name: 'Hostel / PG Rent',
      amountPaise: 750000, // ₹7,500
      accountId: 'acc-sbi-student',
      categoryId: 'rent-housing',
      frequency: 'monthly',
      nextDueDate: `${currentYear}-${(Number(currentMonth) % 12 + 1).toString().padStart(2, '0')}-03`,
      isActive: true,
      paymentMethod: 'upi',
      merchant: 'Sharma PG Owner',
      notes: 'Due on the 3rd of every month',
      isDemo: true,
      createdAt: d(1),
      updatedAt: d(1)
    },
    {
      id: 'demo-rec-spotify',
      type: 'expense',
      name: 'Spotify Premium Student',
      amountPaise: 11900, // ₹119
      accountId: 'acc-paytm-upi',
      categoryId: 'subscriptions',
      frequency: 'monthly',
      nextDueDate: `${currentYear}-${(Number(currentMonth) % 12 + 1).toString().padStart(2, '0')}-11`,
      isActive: true,
      paymentMethod: 'upi',
      merchant: 'Spotify',
      notes: 'Recurring auto-pay via UPI',
      isDemo: true,
      createdAt: d(1),
      updatedAt: d(1)
    }
  ];

  await db.recurringRules.bulkPut(demoRecurring);

  // Sample Budget Config
  const demoBudget: BudgetConfig = {
    month: monthKey,
    overallLimitPaise: 1600000, // ₹16,000 monthly spending limit
    categoryLimits: {
      'rent-housing': 750000,
      'food-mess': 350000,
      'chai-snacks': 100000,
      'transport': 100000,
      'groceries': 120000,
      'entertainment-outings': 80000
    },
    weeklyDiscretionaryLimitPaise: 60000, // ₹600/week discretionary
    enableRollover: false,
    warningThresholds: [70, 85, 100]
  };

  await db.budgets.put(demoBudget);

  // Mark app settings
  const settings = (await db.settings.get('app_settings'))?.value || DEFAULT_SETTINGS;
  settings.onboardingCompleted = true;
  settings.hasSampleData = true;
  await db.settings.put({ key: 'app_settings', value: settings });
}

/**
 * Removes only sample demo data without touching user's real data
 */
export async function clearSampleData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.transactions,
      db.savingsGoals,
      db.debts,
      db.recurringRules,
      db.settings
    ],
    async () => {
      await db.transactions.where('isDemo').equals(1 as any).delete();
      // Also delete by id prefix demo-
      const demoTxIds = (await db.transactions.toArray())
        .filter((t) => t.id.startsWith('demo-') || t.isDemo)
        .map((t) => t.id);
      if (demoTxIds.length) await db.transactions.bulkDelete(demoTxIds);

      const demoGoalIds = (await db.savingsGoals.toArray())
        .filter((g) => g.id.startsWith('demo-') || g.isDemo)
        .map((g) => g.id);
      if (demoGoalIds.length) await db.savingsGoals.bulkDelete(demoGoalIds);

      const demoDebtIds = (await db.debts.toArray())
        .filter((d) => d.id.startsWith('demo-') || d.isDemo)
        .map((d) => d.id);
      if (demoDebtIds.length) await db.debts.bulkDelete(demoDebtIds);

      const demoRecIds = (await db.recurringRules.toArray())
        .filter((r) => r.id.startsWith('demo-') || r.isDemo)
        .map((r) => r.id);
      if (demoRecIds.length) await db.recurringRules.bulkDelete(demoRecIds);

      // Clean up demo accounts
      const allAccounts = await db.accounts.toArray();
      const demoAccountIds = allAccounts
        .filter((a) => a.id.startsWith('demo-') || a.id.startsWith('acc-sbi-student') || a.id.startsWith('acc-paytm-upi') || a.id.startsWith('acc-pocket-cash'))
        .map((a) => a.id);
      if (demoAccountIds.length) {
        await db.accounts.bulkDelete(demoAccountIds);
      }

      // If no accounts remain, ensure the default 3 clean accounts exist with 0 opening balance
      const remainingAccounts = await db.accounts.count();
      if (remainingAccounts === 0) {
        const now = new Date().toISOString();
        await db.accounts.bulkAdd([
          {
            id: 'acc-primary-bank',
            name: 'Primary Bank (SBI / HDFC)',
            type: 'bank',
            openingBalancePaise: 0,
            color: '#3b82f6',
            icon: 'Landmark',
            isDefault: true,
            createdAt: now,
            updatedAt: now
          },
          {
            id: 'acc-upi-wallet',
            name: 'UPI / Paytm / GPay',
            type: 'wallet',
            openingBalancePaise: 0,
            color: '#10b981',
            icon: 'Smartphone',
            createdAt: now,
            updatedAt: now
          },
          {
            id: 'acc-cash',
            name: 'Cash in Pocket',
            type: 'cash',
            openingBalancePaise: 0,
            color: '#f59e0b',
            icon: 'Coins',
            createdAt: now,
            updatedAt: now
          }
        ]);
      }

      const settings = (await db.settings.get('app_settings'))?.value || DEFAULT_SETTINGS;
      settings.hasSampleData = false;
      await db.settings.put({ key: 'app_settings', value: settings });
    }
  );
}
