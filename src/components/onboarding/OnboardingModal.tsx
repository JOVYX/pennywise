import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { seedSampleData, db } from '../../db';
import { rupeesToPaise } from '../../utils/formatters';

export const OnboardingModal: React.FC = () => {
  const { settings, updateSettings, accounts } = useApp();
  const [step, setStep] = useState<number>(1);

  // Form states
  const [bankBal, setBankBal] = useState('');
  const [walletBal, setWalletBal] = useState('');
  const [cashBal, setCashBal] = useState('');
  const [savingsGoalName, setSavingsGoalName] = useState('');
  const [savingsGoalTarget, setSavingsGoalTarget] = useState('');
  const [nextIncomeDate, setNextIncomeDate] = useState('');

  if (settings.onboardingCompleted) {
    return null;
  }

  const handleFinishOnboarding = async (useSampleData = false) => {
    if (useSampleData) {
      await seedSampleData();
    } else {
      // Save entered opening balances to default accounts
      const bankAcc = accounts.find((a) => a.type === 'bank') || accounts[0];
      const walletAcc = accounts.find((a) => a.type === 'wallet') || accounts[1];
      const cashAcc = accounts.find((a) => a.type === 'cash') || accounts[2];

      if (bankAcc) {
        await db.accounts.update(bankAcc.id, {
          openingBalancePaise: rupeesToPaise(bankBal),
          updatedAt: new Date().toISOString()
        });
      }
      if (walletAcc) {
        await db.accounts.update(walletAcc.id, {
          openingBalancePaise: rupeesToPaise(walletBal),
          updatedAt: new Date().toISOString()
        });
      }
      if (cashAcc) {
        await db.accounts.update(cashAcc.id, {
          openingBalancePaise: rupeesToPaise(cashBal),
          updatedAt: new Date().toISOString()
        });
      }

      // Create initial savings goal
      if (savingsGoalName.trim() && rupeesToPaise(savingsGoalTarget) > 0) {
        await db.savingsGoals.put({
          id: 'initial-goal-1',
          name: savingsGoalName.trim(),
          targetAmountPaise: rupeesToPaise(savingsGoalTarget),
          currentAmountPaise: 0,
          priority: 'high',
          icon: 'ShieldAlert',
          color: '#10b981',
          history: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    await updateSettings({
      onboardingCompleted: true,
      nextExpectedIncomeDate: nextIncomeDate || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-sm bg-[#111827] border border-[#1f293d] rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between max-h-[90vh]">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#1f293d]">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Welcome to Pennywise
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-semibold">Step {step} of 3</span>
        </div>

        {/* STEP 1: Welcome & Currency */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="w-13 h-13 rounded-xl bg-amber-400 text-black font-mono font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-400/20">
              ₹
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Personal Finance for Indian Students
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Take full control of irregular pocket money, PG rents, tapri chai expenses, and
                emergency savings on your device.
              </p>
            </div>

            <div className="p-3 bg-[#0b0f17] rounded-xl border border-[#1f293d] space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center text-white">
                <span className="text-slate-400">Default Currency:</span>
                <span className="font-bold text-amber-400">Indian Rupee (INR ₹)</span>
              </div>
              <div className="flex justify-between items-center text-white">
                <span className="text-slate-400">Storage Architecture:</span>
                <span className="font-bold text-slate-300">Local-First (IndexedDB)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <span>Set Up My Balances</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleFinishOnboarding(true)}
                className="w-full py-2.5 rounded-xl bg-[#161e2e] text-slate-300 font-mono font-medium text-xs border border-[#1f293d] flex items-center justify-center gap-1.5 hover:bg-[#1f293d] hover:text-white transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Explore with Student Sample Data</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Current Balances */}
        {step === 2 && (
          <div className="space-y-3.5 py-1">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Your Opening Balances</h3>
              <p className="text-[11px] text-slate-400">
                Enter your current cash available across your primary accounts.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block mb-1">
                  Primary Bank (SBI / HDFC / Canara) ₹
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={bankBal}
                  onChange={(e) => setBankBal(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono font-bold tabular-nums focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block mb-1">
                  UPI / Paytm / GPay Wallet ₹
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={walletBal}
                  onChange={(e) => setWalletBal(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono font-bold tabular-nums focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block mb-1">
                  Cash in Pocket ₹
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={cashBal}
                  onChange={(e) => setCashBal(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono font-bold tabular-nums focus:outline-none focus:border-amber-400/50"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-4 rounded-xl bg-[#161e2e] border border-[#1f293d] text-slate-300 font-mono font-medium text-xs hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Goals & Finish */}
        {step === 3 && (
          <div className="space-y-3.5 py-1">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Set Your First Savings Goal</h3>
              <p className="text-[11px] text-slate-400">
                Having an emergency fund prevents needing emergency loans or borrowing from friends.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block mb-1">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund"
                  value={savingsGoalName}
                  onChange={(e) => setSavingsGoalName(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block mb-1">
                  Target Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 10000"
                  value={savingsGoalTarget}
                  onChange={(e) => setSavingsGoalTarget(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono font-bold tabular-nums focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block mb-1">
                  Next Expected Income Date (Optional)
                </label>
                <input
                  type="date"
                  value={nextIncomeDate}
                  onChange={(e) => setNextIncomeDate(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-[#1f293d] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400/50"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-2.5 px-4 rounded-xl bg-[#161e2e] border border-[#1f293d] text-slate-300 font-mono font-medium text-xs hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleFinishOnboarding(false)}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-amber-400/20 active:scale-[0.98] transition-all"
              >
                <span>Complete Setup</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
