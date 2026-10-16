import React, { useState } from 'react';
import { ShieldCheck, Wallet, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/formatters';
import { calculateAccountBalances } from '../../utils/finance';

export const BalanceCard: React.FC = () => {
  const { financialSummary, accounts, transactions, settings } = useApp();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const { balancesByAccount } = calculateAccountBalances(accounts, transactions);

  return (
    <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
      {/* Decorative ambient radial glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Available To Spend
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center space-x-1 text-[11px] font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800/60 px-2 py-0.5 rounded-full"
          >
            <span>Breakdown</span>
            {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Main Available To Spend Figure */}
        <div className="mb-3">
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight tabular-nums">
              {formatINR(financialSummary.availableToSpendPaise, {
                showPaise: settings.showPaise
              })}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Unencumbered cash ready for daily use (excluding goals & bills)
          </p>
        </div>

        {/* Expandable Breakdown Drawer */}
        {showBreakdown && (
          <div className="mt-3 pt-3 border-t border-neutral-800/80 space-y-2 text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="flex justify-between items-center text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-blue-400" />
                Actual Total Bank & Cash Balance:
              </span>
              <span className="font-bold text-white tabular-nums">
                {formatINR(financialSummary.actualTotalBalancePaise)}
              </span>
            </div>

            <div className="flex justify-between items-center text-neutral-400">
              <span className="pl-5">Less: Reserved in Savings Goals:</span>
              <span className="font-medium text-emerald-400 tabular-nums">
                -{formatINR(financialSummary.totalAllocatedToSavingsPaise)}
              </span>
            </div>

            <div className="flex justify-between items-center text-neutral-400">
              <span className="pl-5">Less: Reserved for Upcoming Bills & Debts:</span>
              <span className="font-medium text-amber-400 tabular-nums">
                -{formatINR(financialSummary.reservedForBillsAndDebtPaise)}
              </span>
            </div>

            {financialSummary.expectedFutureIncomeThisMonthPaise > 0 && (
              <div className="flex justify-between items-center text-blue-400/90 pt-1 border-t border-neutral-800/50">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Expected Future Income (Not in Cash):
                </span>
                <span className="font-semibold tabular-nums">
                  +{formatINR(financialSummary.expectedFutureIncomeThisMonthPaise)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tracked Accounts Quick Pills */}
        <div className="mt-4 pt-3 border-t border-neutral-800/60">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2">
            Tracked Accounts
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {accounts.map((acc) => {
              const balanceInfo = balancesByAccount[acc.id];
              const bal = balanceInfo ? balanceInfo.currentBalancePaise : acc.openingBalancePaise;
              return (
                <div
                  key={acc.id}
                  className="bg-neutral-950/80 border border-neutral-800/90 rounded-2xl px-3 py-2 shrink-0 min-w-[130px]"
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: acc.color || '#3b82f6' }}
                    />
                    <span className="text-[11px] font-medium text-neutral-300 truncate max-w-[100px]">
                      {acc.name}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white tabular-nums">
                    {formatINR(bal, { showPaise: false })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
