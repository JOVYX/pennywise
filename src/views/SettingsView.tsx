import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Lock,
  Fingerprint,
  KeyRound
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
import { hashPin, isBiometricsAvailable } from '../utils/security';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, accounts } = useApp();

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'bank' | 'wallet' | 'cash'>('bank');
  const [newAccBalStr, setNewAccBalStr] = useState('0');

  // Security / PIN state
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    isBiometricsAvailable().then((res) => setHasBiometrics(res));
  }, []);

  const handleStartSetPin = () => {
    setPinInput('');
    setPinConfirm('');
    setPinStep('create');
    setPinError('');
    setIsPinModalOpen(true);
  };

  const handleSavePin = async () => {
    if (pinInput.length !== 4) {
      setPinError('Passcode must be 4 digits');
      return;
    }
    if (pinInput !== pinConfirm) {
      setPinError('Passcodes do not match. Try again.');
      return;
    }

    const hash = await hashPin(pinInput);
    await updateSettings({
      security: {
        pinEnabled: true,
        pinHash: hash,
        biometricEnabled: settings.security?.biometricEnabled ?? false,
        autoLockMinutes: settings.security?.autoLockMinutes ?? 0
      }
    });

    setIsPinModalOpen(false);
    showToast('Passcode protection activated!');
  };

  const handleDisablePin = async () => {
    await updateSettings({
      security: {
        ...(settings.security || {}),
        pinEnabled: false
      }
    });
    showToast('Passcode protection turned off.');
  };

  const handleToggleBiometrics = async () => {
    const current = settings.security?.biometricEnabled ?? false;
    await updateSettings({
      security: {
        ...(settings.security || { pinEnabled: true }),
        biometricEnabled: !current
      }
    });
    showToast(!current ? 'Biometric unlock enabled' : 'Biometric unlock disabled');
  };

  const handleAutoLockChange = async (minutes: number) => {
    await updateSettings({
      security: {
        ...(settings.security || { pinEnabled: true }),
        autoLockMinutes: minutes
      }
    });
    showToast('Auto-lock interval updated');
  };

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
      <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Preferences & Display
        </h3>

        {/* Theme Segmented Switcher */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[13px] font-medium text-white block tracking-tight">Theme</span>
            <span className="text-[11px] text-neutral-500">Appearance style</span>
          </div>
          <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] text-xs font-medium">
            {(['dark', 'light', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateSettings({ theme: t })}
                className={`px-3 py-1 rounded-lg capitalize transition-all ${
                  settings.theme === t
                    ? 'bg-white/[0.14] text-white font-semibold shadow-sm ring-1 ring-white/10'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Currency Precision: Show Paise */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
          <div>
            <span className="text-[13px] font-medium text-white block tracking-tight">Show Paise Decimals</span>
            <span className="text-[11px] text-neutral-500">
              Display ₹1,250.50 instead of ₹1,250
            </span>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ showPaise: !settings.showPaise })}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
              settings.showPaise ? 'bg-emerald-500 justify-end' : 'bg-white/[0.1] justify-start'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* Next Expected Income Date */}
        <div className="pt-2.5 border-t border-white/[0.06]">
          <label className="text-[13px] font-medium text-white block mb-0.5 tracking-tight">
            Next Expected Income Date
          </label>
          <span className="text-[11px] text-neutral-500 block mb-2">
            Used by the daily spending assistant to budget remaining days
          </span>
          <input
            type="date"
            value={settings.nextExpectedIncomeDate || ''}
            onChange={(e) => updateSettings({ nextExpectedIncomeDate: e.target.value })}
            className="w-full bg-black/80 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Tracked Accounts
          </h3>
          <button
            type="button"
            onClick={() => setIsAddAccountOpen(true)}
            className="text-xs font-medium text-neutral-300 flex items-center gap-1 hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>

        <div className="space-y-2">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-3 bg-black/50 border border-white/[0.05] rounded-2xl flex items-center justify-between hover:border-white/[0.09] transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: acc.color || '#3b82f6' }}
                />
                <div>
                  <div className="text-[13px] font-medium text-white tracking-tight">{acc.name}</div>
                  <span className="text-[11px] text-neutral-500 capitalize">{acc.type}</span>
                </div>
              </div>
              <span className="text-[13px] font-semibold text-white tabular-nums tracking-tight">
                {formatINR(acc.openingBalancePaise)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* App Lock & Security */}
      <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] text-neutral-300 flex items-center justify-center">
              <Lock className="w-4 h-4 text-neutral-300" />
            </div>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                App Lock & Security
              </h3>
              <p className="text-[11px] text-neutral-500">Protect financial records with PIN & Face ID</p>
            </div>
          </div>
        </div>

        {/* PIN Enable / Disable Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/50 border border-white/[0.05]">
          <div>
            <span className="text-[13px] font-medium text-white block tracking-tight">4-Digit Passcode</span>
            <span className="text-[11px] text-neutral-500">
              {settings.security?.pinEnabled ? 'Passcode lock active' : 'No passcode set'}
            </span>
          </div>

          {settings.security?.pinEnabled ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartSetPin}
                className="px-2.5 py-1 text-[11px] font-medium bg-white/[0.08] text-neutral-300 hover:text-white rounded-lg transition-colors border border-white/[0.06]"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleDisablePin}
                className="px-2.5 py-1 text-[11px] font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors"
              >
                Turn Off
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartSetPin}
              className="px-3 py-1.5 text-xs font-semibold bg-white text-black rounded-xl active:scale-95 transition-all shadow-sm"
            >
              Turn On
            </button>
          )}
        </div>

        {settings.security?.pinEnabled && (
          <div className="space-y-2.5 pt-1">
            {/* Biometric Toggle if supported */}
            {hasBiometrics && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/50 border border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-[13px] font-medium text-white block tracking-tight">Face ID / Biometrics</span>
                    <span className="text-[11px] text-neutral-500">Unlock instantly without typing PIN</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleBiometrics}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    settings.security?.biometricEnabled ? 'bg-emerald-500 justify-end' : 'bg-white/[0.1] justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>
            )}

            {/* Auto Lock Timer */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/50 border border-white/[0.05]">
              <span className="text-[13px] font-medium text-white tracking-tight">Auto-Lock Delay</span>
              <select
                value={settings.security?.autoLockMinutes ?? 0}
                onChange={(e) => handleAutoLockChange(parseInt(e.target.value))}
                className="px-2.5 py-1 text-xs font-medium bg-black/80 border border-white/[0.08] text-white rounded-lg focus:outline-none"
              >
                <option value={0} className="bg-neutral-900 text-white">Immediately</option>
                <option value={1} className="bg-neutral-900 text-white">After 1 minute</option>
                <option value={5} className="bg-neutral-900 text-white">After 5 minutes</option>
                <option value={15} className="bg-neutral-900 text-white">After 15 minutes</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Backup, Restore & Data */}
      <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Data & Local Backups
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJson}
            className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.05] text-left hover:border-white/[0.1] transition-all flex flex-col justify-between"
          >
            <Download className="w-4 h-4 text-neutral-300 mb-2" />
            <div>
              <span className="text-[13px] font-medium text-white block tracking-tight">Export JSON</span>
              <span className="text-[10px] text-neutral-500">Full backup file</span>
            </div>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.05] text-left hover:border-white/[0.1] transition-all flex flex-col justify-between"
          >
            <FileSpreadsheet className="w-4 h-4 text-neutral-300 mb-2" />
            <div>
              <span className="text-[13px] font-medium text-white block tracking-tight">Export CSV</span>
              <span className="text-[10px] text-neutral-500">Excel / Sheets</span>
            </div>
          </button>
        </div>

        {/* Restore from JSON */}
        <label className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.05] flex items-center justify-between cursor-pointer hover:border-white/[0.1] transition-all">
          <div className="flex items-center space-x-2.5">
            <Upload className="w-4 h-4 text-neutral-300" />
            <div>
              <span className="text-[13px] font-medium text-white block tracking-tight">Restore from Backup</span>
              <span className="text-[10px] text-neutral-500">Import Pennywise JSON</span>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-medium bg-white/[0.08] text-neutral-200 rounded-lg border border-white/[0.06]">
            Choose File
          </span>
          <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
        </label>

        {/* Sample Data Controls */}
        <div className="pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={async () => {
              await seedSampleData();
              showToast('Sample student data loaded!');
            }}
            className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
            Load Sample Data
          </button>

          <button
            type="button"
            onClick={async () => {
              await clearSampleData();
              showToast('Sample data removed.');
            }}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-all"
          >
            Clear Sample Data
          </button>
        </div>

        {/* Reset All Data */}
        <div className="pt-1.5">
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset All Application Data
          </button>
        </div>
      </div>

      {/* Privacy Guarantee & Architecture */}
      <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-2">
        <div className="flex items-center space-x-2 text-neutral-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-300">Privacy & Storage Notice</h3>
        </div>
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          Pennywise is strictly local-first. All accounts, expenses, and savings plans reside solely
          inside your iPhone Safari browser via IndexedDB (Dexie.js). No external APIs, telemetry,
          or servers receive your financial records. Because browser caches can be cleared, we
          strongly recommend exporting periodic JSON backups to your iCloud Files or Google Drive.
        </p>
      </div>

      {/* iOS Safari Installation Guide */}
      <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-2">
        <div className="flex items-center space-x-2 text-neutral-300">
          <Smartphone className="w-4 h-4 text-neutral-300" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-300">Install on iPhone</h3>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#121214] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-3.5">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <h3 className="text-[13px] font-semibold text-white">Add New Account</h3>
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-medium text-neutral-300 block mb-1">
                Account Name
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Student, Pocket Cash"
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                className="w-full bg-black/80 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-neutral-300 block mb-1">Type</label>
              <select
                value={newAccType}
                onChange={(e) => setNewAccType(e.target.value as any)}
                className="w-full bg-black/80 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
              >
                <option value="bank" className="bg-neutral-900 text-white">Bank Account</option>
                <option value="wallet" className="bg-neutral-900 text-white">UPI / Digital Wallet</option>
                <option value="cash" className="bg-neutral-900 text-white">Cash</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-neutral-300 block mb-1">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                value={newAccBalStr}
                onChange={(e) => setNewAccBalStr(e.target.value)}
                className="w-full bg-black/80 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddAccount}
                className="flex-1 py-2.5 rounded-xl bg-white text-black text-xs font-semibold active:scale-95 transition-all shadow-sm"
              >
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Confirmation */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#121214] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-3.5">
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-[13px] font-semibold">Reset All Data?</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              This will permanently erase all local transactions, budgets, accounts, and savings
              goals from this device. This action cannot be undone.
            </p>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 text-xs font-medium transition-colors"
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
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold active:scale-95 transition-all"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Set Passcode */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xs bg-[#121214] border border-white/[0.1] rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-neutral-300 mx-auto flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-[15px] font-semibold text-white tracking-tight">
                {pinStep === 'create' ? 'Create Passcode' : 'Confirm Passcode'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {pinStep === 'create'
                  ? 'Enter a 4-digit passcode to lock Pennywise'
                  : 'Re-enter your 4 digits to confirm'}
              </p>
            </div>

            <div className="flex justify-center">
              <input
                type="password"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                autoFocus
                value={pinStep === 'create' ? pinInput : pinConfirm}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (pinStep === 'create') {
                    setPinInput(val);
                    if (val.length === 4) {
                      setPinStep('confirm');
                      setPinError('');
                    }
                  } else {
                    setPinConfirm(val);
                  }
                }}
                placeholder="••••"
                className="w-36 text-center tracking-[0.5em] text-2xl font-bold bg-black/80 border border-white/[0.1] rounded-2xl py-2.5 text-white focus:outline-none focus:border-white/40"
              />
            </div>

            {pinError && (
              <p className="text-xs text-rose-400 font-medium animate-in fade-in">{pinError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>

              {pinStep === 'confirm' && (
                <button
                  type="button"
                  onClick={handleSavePin}
                  disabled={pinConfirm.length !== 4}
                  className="flex-1 py-2.5 rounded-xl bg-white hover:bg-neutral-200 active:scale-95 text-black text-xs font-semibold transition-all disabled:opacity-40"
                >
                  Confirm PIN
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
