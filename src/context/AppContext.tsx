import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  initializeDatabase,
  DEFAULT_SETTINGS
} from '../db';
import {
  Account,
  Category,
  Transaction,
  SavingsGoal,
  Debt,
  RecurringRule,
  BudgetConfig,
  AppSettings,
  FinancialSummary
} from '../types';
import { calculateMonthlySummary } from '../utils/finance';
import { getCurrentMonthKey } from '../utils/formatters';
import { shouldAutoLock, updateLastActive } from '../utils/security';
import { requestStoragePersistence } from '../utils/storage';

interface AppContextType {
  // Navigation & Month
  currentMonth: string;
  setCurrentMonth: (m: string) => void;
  selectedTab: 'home' | 'transactions' | 'budgets' | 'insights' | 'settings';
  setSelectedTab: (tab: 'home' | 'transactions' | 'budgets' | 'insights' | 'settings') => void;

  // Add / Edit Transaction Modal
  isAddTxOpen: boolean;
  setIsAddTxOpen: (open: boolean) => void;
  editingTx: Transaction | null;
  setEditingTx: (tx: Transaction | null) => void;

  // Bill Splitter Modal
  isSplitBillOpen: boolean;
  setIsSplitBillOpen: (open: boolean) => void;

  // Bank Statement Import Modal
  isImportStatementOpen: boolean;
  setIsImportStatementOpen: (open: boolean) => void;

  // Security App Lock
  isAppLocked: boolean;
  setIsAppLocked: (locked: boolean) => void;

  // Data from IndexedDB
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  debts: Debt[];
  recurringRules: RecurringRule[];
  budgets: BudgetConfig[];
  currentBudget?: BudgetConfig;
  settings: AppSettings;
  isLoading: boolean;

  // Computed Financials
  financialSummary: FinancialSummary;

  // Actions
  saveTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<string>;
  bulkImportTransactions: (txs: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<number>;
  deleteTransaction: (id: string) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  recordDebtPayment: (params: {
    debtId: string;
    amountPaise: number;
    accountId: string;
    principalPaise?: number;
    interestPaise?: number;
    notes?: string;
  }) => Promise<void>;
  updateSavingsGoalAllocation: (params: {
    goalId: string;
    amountPaise: number;
    type: 'deposit' | 'withdrawal';
    note?: string;
  }) => Promise<void>;
  markRecurringProcessed: (ruleId: string, options?: { recordTx?: boolean }) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonthKey());
  const [selectedTab, setSelectedTab] = useState<'home' | 'transactions' | 'budgets' | 'insights' | 'settings'>('home');
  const [isAddTxOpen, setIsAddTxOpen] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isSplitBillOpen, setIsSplitBillOpen] = useState<boolean>(false);
  const [isImportStatementOpen, setIsImportStatementOpen] = useState<boolean>(false);
  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);
  const [hasCheckedLockInitial, setHasCheckedLockInitial] = useState<boolean>(false);
  const [isDbReady, setIsDbReady] = useState<boolean>(false);

  useEffect(() => {
    initializeDatabase().then(() => setIsDbReady(true));
    requestStoragePersistence();
  }, []);

  // Live queries
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], [] as Account[]);
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), [], [] as Category[]);
  const transactions = useLiveQuery(
    () => db.transactions.reverse().sortBy('date'),
    [],
    [] as Transaction[]
  );
  const savingsGoals = useLiveQuery(() => db.savingsGoals.toArray(), [], [] as SavingsGoal[]);
  const debts = useLiveQuery(() => db.debts.toArray(), [], [] as Debt[]);
  const recurringRules = useLiveQuery(() => db.recurringRules.toArray(), [], [] as RecurringRule[]);
  const budgets = useLiveQuery(() => db.budgets.toArray(), [], [] as BudgetConfig[]);
  const settingsRecord = useLiveQuery(() => db.settings.get('app_settings'));

  const settings: AppSettings = useMemo(() => {
    return (settingsRecord?.value as AppSettings) || DEFAULT_SETTINGS;
  }, [settingsRecord]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  // Cold launch lock check
  useEffect(() => {
    if (!hasCheckedLockInitial && isDbReady) {
      if (settings.security?.pinEnabled && settings.security?.pinHash) {
        setIsAppLocked(true);
      }
      setHasCheckedLockInitial(true);
    }
  }, [hasCheckedLockInitial, isDbReady, settings.security]);

  // Visibility change auto-lock (e.g. backgrounding on iOS)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (settings.security?.pinEnabled && settings.security?.pinHash) {
          if (shouldAutoLock(settings.security.autoLockMinutes ?? 0)) {
            setIsAppLocked(true);
          }
        }
      } else if (document.visibilityState === 'hidden') {
        updateLastActive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [settings.security]);

  const currentBudget = useMemo(() => {
    return budgets.find((b) => b.month === currentMonth);
  }, [budgets, currentMonth]);

  // Financial summary
  const financialSummary = useMemo(() => {
    return calculateMonthlySummary({
      monthKey: currentMonth,
      accounts,
      transactions,
      categories,
      savingsGoals,
      debts,
      recurringRules,
      budget: currentBudget
    });
  }, [currentMonth, accounts, transactions, categories, savingsGoals, debts, recurringRules, currentBudget]);

  // Actions
  const saveTransaction = async (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<string> => {
    const now = new Date().toISOString();
    const id = data.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const txToSave: Transaction = {
      ...data,
      id,
      createdAt: (data as any).createdAt || now,
      updatedAt: now
    };

    await db.transactions.put(txToSave);
    return id;
  };

  const bulkImportTransactions = async (
    txs: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<number> => {
    if (!txs || txs.length === 0) return 0;
    const now = new Date().toISOString();
    const records: Transaction[] = txs.map((t, index) => ({
      ...t,
      id: `tx-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now
    }));
    await db.transactions.bulkAdd(records);
    return records.length;
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    await db.transactions.delete(id);
  };

  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<void> => {
    const merged = { ...settings, ...newSettings };
    await db.settings.put({ key: 'app_settings', value: merged });
  };

  const recordDebtPayment = async (params: {
    debtId: string;
    amountPaise: number;
    accountId: string;
    principalPaise?: number;
    interestPaise?: number;
    notes?: string;
  }) => {
    const debt = await db.debts.get(params.debtId);
    if (!debt) return;

    const principal = params.principalPaise ?? params.amountPaise;
    const interest = params.interestPaise ?? 0;
    const paymentId = `dp-${Date.now()}`;
    const now = new Date().toISOString();

    // 1. Create linked expense transaction
    const txId = await saveTransaction({
      type: 'expense',
      amountPaise: params.amountPaise,
      accountId: params.accountId,
      categoryId: 'debt-repayment',
      subCategory: `${debt.name} Repayment`,
      date: now,
      merchant: debt.lender,
      paymentMethod: 'upi',
      notes: params.notes || `Repayment for ${debt.name} (Principal: ₹${principal / 100})`
    });

    // 2. Update debt balance
    const updatedBalance = Math.max(0, debt.currentBalancePaise - principal);
    const updatedPayments = [
      ...debt.payments,
      {
        id: paymentId,
        date: now,
        amountPaise: params.amountPaise,
        principalPaise: principal,
        interestPaise: interest,
        transactionId: txId,
        note: params.notes
      }
    ];

    await db.debts.put({
      ...debt,
      currentBalancePaise: updatedBalance,
      isPaidOff: updatedBalance === 0,
      payments: updatedPayments,
      updatedAt: now
    });
  };

  const updateSavingsGoalAllocation = async (params: {
    goalId: string;
    amountPaise: number;
    type: 'deposit' | 'withdrawal';
    note?: string;
  }) => {
    const goal = await db.savingsGoals.get(params.goalId);
    if (!goal) return;

    const historyId = `gh-${Date.now()}`;
    const now = new Date().toISOString();

    let newAmount = goal.currentAmountPaise;
    if (params.type === 'deposit') {
      newAmount += params.amountPaise;
    } else {
      newAmount = Math.max(0, newAmount - params.amountPaise);
    }

    const updatedHistory = [
      ...goal.history,
      {
        id: historyId,
        date: now,
        amountPaise: params.amountPaise,
        type: params.type,
        note: params.note
      }
    ];

    await db.savingsGoals.put({
      ...goal,
      currentAmountPaise: newAmount,
      history: updatedHistory,
      updatedAt: now
    });
  };

  const markRecurringProcessed = async (ruleId: string, options?: { recordTx?: boolean }) => {
    const rule = await db.recurringRules.get(ruleId);
    if (!rule) return;

    const now = new Date().toISOString();

    if (options?.recordTx) {
      await saveTransaction({
        type: rule.type,
        amountPaise: rule.amountPaise,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        date: now,
        merchant: rule.merchant || rule.name,
        paymentMethod: rule.paymentMethod || 'upi',
        notes: `Auto-recorded from scheduled ${rule.name}`,
        recurringRuleId: rule.id
      });
    }

    // Advance next due date
    const currentDue = new Date(rule.nextDueDate);
    const nextDate = new Date(currentDue);
    if (rule.frequency === 'daily') {
      nextDate.setDate(nextDate.getDate() + (rule.intervalDays || 1));
    } else if (rule.frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (rule.frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setDate(nextDate.getDate() + (rule.intervalDays || 30));
    }

    await db.recurringRules.put({
      ...rule,
      nextDueDate: nextDate.toISOString().split('T')[0],
      updatedAt: now
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentMonth,
        setCurrentMonth,
        selectedTab,
        setSelectedTab,
        isAddTxOpen,
        setIsAddTxOpen,
        editingTx,
        setEditingTx,
        isSplitBillOpen,
        setIsSplitBillOpen,
        isImportStatementOpen,
        setIsImportStatementOpen,
        isAppLocked,
        setIsAppLocked,
        accounts,
        categories,
        transactions,
        savingsGoals,
        debts,
        recurringRules,
        budgets,
        currentBudget,
        settings,
        isLoading: !isDbReady,
        financialSummary,
        saveTransaction,
        bulkImportTransactions,
        deleteTransaction,
        updateSettings,
        recordDebtPayment,
        updateSavingsGoalAllocation,
        markRecurringProcessed
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
