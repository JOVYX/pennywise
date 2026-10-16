import React, { useState } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Plus,
  X,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  exportDatabaseToJson,
  importDatabaseFromJson,
  exportTransactionsToCsv,
  seedSampleData,
  clearSampleData,
  resetAllData,
  db
} from '../db';
import { formatINR, rupeesToPaise } from '../utils/formatters';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, accounts } = useApp();

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'bank' | 'wallet' | 'cash'>('bank');
  const [newAccBalStr, setNewAccBalStr] = useState('0');

  const showToast = (text: string, error = false) => {
    setFeedbackMsg({ text, error });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Export JSON
  const handleExportJson = async () => {
    try {
      const json = await exportDatabaseToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pennywise-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup exported successfully!');
    } catch (err: any) {
      showToast(err?.message || 'Export failed', true);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const csv = await exportTransactionsToCsv();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pennywise-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('CSV spreadsheet downloaded!');
    } catch (err: any) {
      showToast(err?.message || 'CSV export failed', true);
    }
  };

  // Import JSON
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const res = await importDatabaseFromJson(text);
        if (res.success) {
          showToast(res.message);
        } else {
          showToast(res.message, true);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      showToast(err?.message || 'Restore failed', true);
    }
  };

  // Add Account
  const handleAddAccount = async () => {
    const paise = rupeesToPaise(newAccBalStr);
    if (!newAccName.trim()) return;

    const colors: Record<string, string> = {
      bank: '#3b82f6',
      wallet: '#10b981',
      cash: '#f59e0b'
    };

    const icons: Record<string, string> = {
      bank: 'Landmark',
      wallet: 'Smartphone',
      cash: 'Coins'
    };

    await db.accounts.put({
      id: `acc-${Date.now()}`,
      name: newAccName.trim(),
      type: newAccType,
      openingBalancePaise: paise,
      color: colors[newAccType] || '#8b5cf6',
      icon: icons[newAccType] || 'Wallet',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setIsAddAccountOpen(false);
    setNewAccName('');
    setNewAccBalStr('0');
    showToast('New account added.');
  };

  return (
    <div className="space-y-4 px-4 py-3 max-w-md mx-auto">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3 text-xs font-semibold rounded-2xl flex items-center justify-between border ${
            feedbackMsg.error
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button type="button" onClick={() => setFeedbackMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Preferences & Theme */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Preferences & Display
        </h3>

        {/* Theme Segmented Switcher */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white block">Theme</span>
            <span className="text-[10px] text-neutral-400">Appearance style</span>
          </div>
          <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-semibold">
            {(['dark', 'light', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateSettings({ theme: t })}
                className={`px-3 py-1 rounded-lg capitalize transition-all ${
                  settings.theme === t
                    ? 'bg-neutral-800 text-emerald-400 font-bold shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Currency Precision: Show Paise */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
          <div>
            <span className="text-xs font-bold text-white block">Show Paise Decimals</span>
            <span className="text-[10px] text-neutral-400">
              Display ₹1,250.50 instead of ₹1,250
            </span>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ showPaise: !settings.showPaise })}
            className={`w-11 h-6 rounded-full transition-colors p-1 flex items-center ${
              settings.showPaise ? 'bg-emerald-500 justify-end' : 'bg-neutral-800 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
          </button>
        </div>

        {/* Next Expected Income Date */}
        <div className="pt-2 border-t border-neutral-800">
          <label className="text-xs font-bold text-white block mb-0.5">
            Next Expected Income Date
          </label>
          <span className="text-[10px] text-neutral-400 block mb-2">
            Used by the daily spending assistant to budget remaining days
          </span>
          <input
            type="date"
            value={settings.nextExpectedIncomeDate || ''}
            onChange={(e) => updateSettings({ nextExpectedIncomeDate: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Tracked Accounts
          </h3>
          <button
            type="button"
            onClick={() => setIsAddAccountOpen(true)}
            className="text-xs font-bold text-emerald-400 flex items-center gap-1 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>

        <div className="space-y-2">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: acc.color || '#3b82f6' }}
                />
                <div>
                  <div className="text-xs font-bold text-white">{acc.name}</div>
                  <span className="text-[10px] text-neutral-400 capitalize">{acc.type}</span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-neutral-200 tabular-nums">
                {formatINR(acc.openingBalancePaise)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Backup, Restore & Data */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Data & Local Backups
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJson}
            className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-left hover:border-neutral-700 transition-all flex flex-col justify-between"
          >
            <Download className="w-4 h-4 text-emerald-400 mb-1" />
            <div>
              <span className="text-xs font-bold text-white block">Export JSON</span>
              <span className="text-[10px] text-neutral-500">Full encrypted backup</span>
            </div>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-left hover:border-neutral-700 transition-all flex flex-col justify-between"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-400 mb-1" />
            <div>
              <span className="text-xs font-bold text-white block">Export CSV</span>
              <span className="text-[10px] text-neutral-500">Excel / Google Sheets</span>
            </div>
          </button>
        </div>

        {/* Restore from JSON */}
        <label className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between cursor-pointer hover:border-neutral-700 transition-all">
          <div className="flex items-center space-x-2.5">
            <Upload className="w-4 h-4 text-blue-400" />
            <div>
              <span className="text-xs font-bold text-white block">Restore from Backup</span>
              <span className="text-[10px] text-neutral-500">Import valid Pennywise JSON</span>
            </div>
          </div>
          <span className="px-2 py-1 text-[11px] font-semibold bg-neutral-800 text-neutral-300 rounded-lg">
            Choose File
          </span>
          <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
        </label>

        {/* Sample Data Controls */}
        <div className="pt-2 border-t border-neutral-800/80 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={async () => {
              await seedSampleData();
              showToast('Sample student data loaded!');
            }}
            className="p-2.5 rounded-xl bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Load Sample Data
          </button>

          <button
            type="button"
            onClick={async () => {
              await clearSampleData();
              showToast('Sample data removed.');
            }}
            className="p-2.5 rounded-xl bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold transition-all"
          >
            Clear Sample Data
          </button>
        </div>

        {/* Reset All Data */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20 flex items-center justify-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset All Application Data
          </button>
        </div>
      </div>

      {/* Privacy Guarantee & Architecture */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg space-y-2.5">
        <div className="flex items-center space-x-2 text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Privacy & Storage Notice</h3>
        </div>
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          Pennywise is strictly local-first. All accounts, expenses, and savings plans reside solely
          inside your iPhone Safari browser via IndexedDB (Dexie.js). No external APIs, telemetry,
          or servers receive your financial records. Because browser caches can be cleared, we
          strongly recommend exporting periodic JSON backups to your iCloud Files or Google Drive.
        </p>
      </div>

      {/* iOS Safari Installation Guide */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg space-y-2.5">
        <div className="flex items-center space-x-2 text-blue-400">
          <Smartphone className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Install on iPhone</h3>
        </div>
        <ol className="text-[11px] text-neutral-400 space-y-1.5 list-decimal pl-4 leading-normal">
          <li>Open this app in <strong>Safari</strong> on your iPhone.</li>
          <li>Tap the <strong>Share</strong> button (box with upward arrow) at the bottom.</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong> in the top right. Pennywise will run standalone offline like a native iOS app!</li>
        </ol>
      </div>

      {/* Modal: Add Account */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">Add New Account</h3>
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Account Name
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Student, Pocket Cash"
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Type</label>
              <select
                value={newAccType}
                onChange={(e) => setNewAccType(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="bank">Bank Account</option>
                <option value="wallet">UPI / Digital Wallet</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                value={newAccBalStr}
                onChange={(e) => setNewAccBalStr(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(false)}
                className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddAccount}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-bold"
              >
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Confirmation */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-neutral-900 border border-rose-500/30 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold">Reset All Data?</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              This will permanently erase all local transactions, budgets, accounts, and savings
              goals from this device. This action cannot be undone.
            </p>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resetAllData();
                  setIsResetConfirmOpen(false);
                  showToast('Database reset to clean defaults.');
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
