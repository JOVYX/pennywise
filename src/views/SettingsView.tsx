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
  const { settings, updateSettings, accounts, setIsImportStatementOpen } = useApp();

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

    await db.accounts.put({
      id: `acc-${Date.now()}`,
      name: newAccName.trim(),
      type: newAccType,
      openingBalancePaise: paise,
      color: colors[newAccType] || '#8b5cf6',
      icon: 'Wallet',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setIsAddAccountOpen(false);
    setNewAccName('');
    setNewAccBalStr('0');
    showToast('New account registered.');
  };

  return (
    <div className="space-y-4 px-4 py-3 max-w-md mx-auto">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3 text-xs font-semibold rounded-lg flex items-center justify-between border ${
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
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
          PREFERENCES & DISPLAY
        </h3>

        {/* Currency Precision: Show Paise */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[13px] font-bold text-white block tracking-tight">Exact Paise Precision</span>
            <span className="mono text-[11px] text-slate-400">
              Display ₹1,250.50 with paise decimal places
            </span>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ showPaise: !settings.showPaise })}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
              settings.showPaise ? 'bg-amber-500 justify-end' : 'bg-[#1f293d] justify-start'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-slate-950 shadow" />
          </button>
        </div>

        {/* Next Expected Income Date */}
        <div className="pt-2.5 border-t border-[#1f293d]">
          <label className="mono text-[11px] font-bold text-slate-300 block mb-0.5 uppercase tracking-wider">
            NEXT EXPECTED STIPEND / ALLOWANCE DATE
          </label>
          <span className="text-[11px] text-slate-400 block mb-2">
            Used by the daily spending algorithm to compute remaining days
          </span>
          <input
            type="date"
            value={settings.nextExpectedIncomeDate || ''}
            onChange={(e) => updateSettings({ nextExpectedIncomeDate: e.target.value })}
            className="mono w-full bg-[#161e2e] border border-[#28354b] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
          />
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
            TRACKED VAULT LEDGERS
          </h3>
          <button
            type="button"
            onClick={() => setIsAddAccountOpen(true)}
            className="mono text-xs font-semibold text-amber-400 flex items-center gap-1 hover:text-amber-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            + ACCOUNT
          </button>
        </div>

        <div className="space-y-2">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-3 bg-[#161e2e] border border-[#28354b] rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: acc.color || '#3b82f6' }}
                />
                <div>
                  <div className="text-[13px] font-bold text-white tracking-tight">{acc.name}</div>
                  <span className="mono text-[11px] text-slate-400 capitalize">{acc.type}</span>
                </div>
              </div>
              <span className="mono text-[13px] font-bold text-white tabular-nums tracking-tight">
                {formatINR(acc.openingBalancePaise)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* App Lock & Security */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#161e2e] border border-[#28354b] text-amber-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                APP LOCK & SECURITY
              </h3>
              <p className="text-[11px] text-slate-400">Protect financial records with PIN & Biometrics</p>
            </div>
          </div>
        </div>

        {/* PIN Enable / Disable Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#161e2e] border border-[#28354b]">
          <div>
            <span className="text-[13px] font-bold text-white block tracking-tight">4-Digit Passcode</span>
            <span className="mono text-[11px] text-slate-400">
              {settings.security?.pinEnabled ? 'Passcode protection ACTIVE' : 'NO passcode active'}
            </span>
          </div>

          {settings.security?.pinEnabled ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartSetPin}
                className="px-2.5 py-1 text-[11px] font-semibold bg-[#111827] text-slate-300 hover:text-white rounded border border-[#1f293d] transition-colors"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleDisablePin}
                className="px-2.5 py-1 text-[11px] font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded transition-colors"
              >
                Disable
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartSetPin}
              className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded active:scale-95 transition-all shadow-sm"
            >
              Activate
            </button>
          )}
        </div>

        {settings.security?.pinEnabled && (
          <div className="space-y-2.5 pt-1">
            {/* Biometric Toggle if supported */}
            {hasBiometrics && (
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#161e2e] border border-[#28354b]">
                <div className="flex items-center gap-2.5">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-[13px] font-bold text-white block tracking-tight">Biometric Unlock</span>
                    <span className="text-[11px] text-slate-400">Unlock instantly via Touch ID / Face ID</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleBiometrics}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    settings.security?.biometricEnabled ? 'bg-emerald-500 justify-end' : 'bg-[#1f293d] justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-slate-950 shadow" />
                </button>
              </div>
            )}

            {/* Auto Lock Timer */}
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#161e2e] border border-[#28354b]">
              <span className="text-[13px] font-bold text-white tracking-tight">Auto-Lock Delay</span>
              <select
                value={settings.security?.autoLockMinutes ?? 0}
                onChange={(e) => handleAutoLockChange(parseInt(e.target.value))}
                className="mono px-2.5 py-1 text-xs font-semibold bg-[#111827] border border-[#1f293d] text-white rounded focus:outline-none"
              >
                <option value={0} className="bg-[#111827] text-white">Immediately</option>
                <option value={1} className="bg-[#111827] text-white">After 1 minute</option>
                <option value={5} className="bg-[#111827] text-white">After 5 minutes</option>
                <option value={15} className="bg-[#111827] text-white">After 15 minutes</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Backup, Restore & Data */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
          DATA & LOCAL BACKUPS
        </h3>

        {/* Import Bank Statement (CSV / Excel) */}
        <button
          type="button"
          onClick={() => setIsImportStatementOpen(true)}
          className="w-full p-3.5 rounded-lg bg-[#161e2e] border border-[#28354b] hover:border-amber-400/40 text-left transition-all flex items-center justify-between"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-[#111827] border border-[#1f293d] flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[13px] font-bold text-white block tracking-tight">
                Import Bank Statement
              </span>
              <span className="mono text-[10px] text-slate-400">
                SBI, HDFC, ICICI, Axis • CSV or Excel (.xlsx)
              </span>
            </div>
          </div>
          <span className="mono px-2.5 py-1 text-[11px] font-bold bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
            IMPORT
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJson}
            className="p-3.5 rounded-lg bg-[#161e2e] border border-[#28354b] text-left hover:border-slate-500 transition-all flex flex-col justify-between"
          >
            <Download className="w-4 h-4 text-amber-400 mb-2" />
            <div>
              <span className="text-[13px] font-bold text-white block tracking-tight">Export JSON</span>
              <span className="mono text-[10px] text-slate-400">Full device backup</span>
            </div>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="p-3.5 rounded-lg bg-[#161e2e] border border-[#28354b] text-left hover:border-slate-500 transition-all flex flex-col justify-between"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 mb-2" />
            <div>
              <span className="text-[13px] font-bold text-white block tracking-tight">Export CSV</span>
              <span className="mono text-[10px] text-slate-400">Excel / Google Sheets</span>
            </div>
          </button>
        </div>

        {/* Restore from JSON */}
        <label className="p-3.5 rounded-lg bg-[#161e2e] border border-[#28354b] flex items-center justify-between cursor-pointer hover:border-slate-500 transition-all">
          <div className="flex items-center space-x-2.5">
            <Upload className="w-4 h-4 text-slate-300" />
            <div>
              <span className="text-[13px] font-bold text-white block tracking-tight">Restore from Backup</span>
              <span className="mono text-[10px] text-slate-400">Import verified JSON schema</span>
            </div>
          </div>
          <span className="mono px-2.5 py-1 text-[11px] font-semibold bg-[#111827] text-slate-200 rounded border border-[#1f293d]">
            Choose File
          </span>
          <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
        </label>

        {/* Sample Data Controls */}
        <div className="pt-2 border-t border-[#1f293d] grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={async () => {
              await seedSampleData();
              showToast('Sample student data loaded!');
            }}
            className="p-2.5 rounded bg-[#161e2e] hover:bg-[#1f293d] text-slate-200 text-xs font-semibold border border-[#28354b] flex items-center justify-center gap-1.5 transition-all"
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
            className="p-2.5 rounded bg-[#161e2e] hover:bg-[#1f293d] text-slate-400 hover:text-white text-xs font-semibold border border-[#28354b] transition-all"
          >
            Clear Sample Data
          </button>
        </div>

        {/* Reset All Data */}
        <div className="pt-1.5">
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="w-full py-2.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Wipe Local Vault & Reset
          </button>
        </div>
      </div>

      {/* Privacy Guarantee */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="mono text-[10px] font-bold uppercase tracking-wider text-slate-300">LOCAL-FIRST PRIVACY INVARIANT</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Pennywise is strictly client-side. All accounts, expenses, and plans reside solely
          inside your iPhone Safari browser via IndexedDB (Dexie.js). No external APIs, telemetry,
          or servers receive your financial records. Export periodic JSON backups to local Files or iCloud Drive.
        </p>
      </div>

      {/* PWA iPhone Install Card */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-slate-300">
          <Smartphone className="w-4 h-4 text-amber-400" />
          <h3 className="mono text-[10px] font-bold uppercase tracking-wider text-slate-300">Install on iPhone</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Tap the Share button in Safari and select &ldquo;Add to Home Screen&rdquo; to use Pennywise as a native, offline-capable iOS app with Face ID biometric protection.
        </p>
      </div>

      {/* Modal: Add Account */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#111827] border border-[#1f293d] rounded-xl p-6 shadow-2xl space-y-3.5">
            <div className="flex justify-between items-center pb-3 border-b border-[#1f293d]">
              <h3 className="mono text-xs font-bold uppercase tracking-wider text-white">ADD NEW LEDGER ACCOUNT</h3>
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="mono text-[11px] font-bold text-slate-300 block mb-1">
                ACCOUNT NAME
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Student, Pocket Cash"
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                className="w-full bg-[#161e2e] border border-[#28354b] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="mono text-[11px] font-bold text-slate-300 block mb-1">TYPE</label>
              <select
                value={newAccType}
                onChange={(e) => setNewAccType(e.target.value as any)}
                className="mono w-full bg-[#161e2e] border border-[#28354b] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
              >
                <option value="bank" className="bg-[#111827] text-white">Bank Account</option>
                <option value="wallet" className="bg-[#111827] text-white">UPI / Digital Wallet</option>
                <option value="cash" className="bg-[#111827] text-white">Cash</option>
              </select>
            </div>

            <div>
              <label className="mono text-[11px] font-bold text-slate-300 block mb-1">
                OPENING BALANCE (₹)
              </label>
              <input
                type="number"
                value={newAccBalStr}
                onChange={(e) => setNewAccBalStr(e.target.value)}
                className="mono w-full bg-[#161e2e] border border-[#28354b] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(false)}
                className="flex-1 py-2.5 rounded bg-[#161e2e] hover:bg-[#1f293d] border border-[#28354b] text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddAccount}
                className="flex-1 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold active:scale-95 transition-all shadow-sm"
              >
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Confirmation */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#111827] border border-rose-500/40 rounded-xl p-6 shadow-2xl space-y-3.5">
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="mono text-xs font-bold uppercase tracking-wider">PERMANENT RESET CONFIRMATION</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently erase all local transactions, budgets, accounts, and savings
              goals from this device. This operation cannot be reversed.
            </p>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded bg-[#161e2e] hover:bg-[#1f293d] border border-[#28354b] text-slate-300 text-xs font-semibold transition-colors"
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
                className="flex-1 py-2.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold active:scale-95 transition-all"
              >
                Wipe Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Set Passcode */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-[#111827] border border-[#1f293d] rounded-xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded bg-[#161e2e] border border-[#28354b] text-amber-400 mx-auto flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="mono text-sm font-bold uppercase tracking-wider text-white">
                {pinStep === 'create' ? 'CREATE PASSCODE' : 'CONFIRM PASSCODE'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {pinStep === 'create'
                  ? 'Enter a 4-digit numeric passcode to secure Pennywise'
                  : 'Re-enter your 4 digits to verify'}
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
                className="mono w-36 text-center tracking-[0.5em] text-2xl font-bold bg-[#161e2e] border border-[#28354b] rounded py-2.5 text-white focus:outline-none focus:border-amber-400/50"
              />
            </div>

            {pinError && (
              <p className="text-xs text-rose-400 font-semibold animate-in fade-in">{pinError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="flex-1 py-2 rounded bg-[#161e2e] hover:bg-[#1f293d] border border-[#28354b] text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>

              {pinStep === 'confirm' && (
                <button
                  type="button"
                  onClick={handleSavePin}
                  disabled={pinConfirm.length !== 4}
                  className="flex-1 py-2 rounded bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold transition-all disabled:opacity-40"
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
