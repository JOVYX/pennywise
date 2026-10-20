import React, { useState } from 'react';
import { Wallet, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/formatters';
import { calculateAccountBalances } from '../../utils/finance';

export const BalanceCard: React.FC = () => {
  const { financialSummary, accounts, transactions, settings } = useApp();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const { balancesByAccount } = calculateAccountBalances(accounts, transactions);

  return (
    <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-2xl relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Available To Spend
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center space-x-1 text-[11px] font-medium text-zinc-300 hover:text-white bg-white/[0.05] border border-white/[0.06] px-2.5 py-1 rounded-full transition-all"
          >
            <span>Details</span>
            {showBreakdown ? <ChevronUp className="w-3 h-3 text-zinc-400" /> : <ChevronDown className="w-3 h-3 text-zinc-400" />}
          </button>
        </div>

        {/* Main Available To Spend Figure */}
        <div className="mb-3">
          <div className="flex items-baseline space-x-1">
            <span className="text-4xl font-bold text-white tracking-[-0.03em] tabular-nums">
              {formatINR(financialSummary.availableToSpendPaise, {
                showPaise: settings.showPaise
              })}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Confirmed unencumbered liquidity ready to spend
          </p>
        </div>

        {/* Expandable Breakdown Drawer */}
        {showBreakdown && (
          <div className="mt-3 pt-3 border-t border-white/[0.07] space-y-2 text-xs animate-in slide-in-from-top-1 duration-150">
            <div className="flex justify-between items-center text-zinc-300 py-1">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-zinc-400" />
                Total Bank & Cash Balances:
              </span>
              <span className="font-semibold text-white tabular-nums">
                {formatINR(financialSummary.actualTotalBalancePaise)}
              </span>
            </div>

            <div className="flex justify-between items-center text-zinc-400 py-1 border-t border-white/[0.04]">
              <span className="pl-5">Savings Goals Allocated:</span>
              <span className="font-medium text-emerald-400 tabular-nums">
                -{formatINR(financialSummary.totalAllocatedToSavingsPaise)}
              </span>
            </div>

            <div className="flex justify-between items-center text-zinc-400 py-1 border-t border-white/[0.04]">
              <span className="pl-5">Reserved Bills & Debt Due:</span>
              <span className="font-medium text-rose-400 tabular-nums">
                -{formatINR(financialSummary.reservedForBillsAndDebtPaise)}
              </span>
            </div>

            {financialSummary.expectedFutureIncomeThisMonthPaise > 0 && (
              <div className="flex justify-between items-center text-zinc-300 pt-2 border-t border-white/[0.06]">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <Clock className="w-3.5 h-3.5" />
                  Expected Future Income:
                </span>
                <span className="font-semibold text-emerald-400 tabular-nums">
                  +{formatINR(financialSummary.expectedFutureIncomeThisMonthPaise)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tracked Accounts Quick Pills */}
        <div className="mt-4 pt-3 border-t border-white/[0.07]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
            Accounts
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {accounts.map((acc) => {
              const balanceInfo = balancesByAccount[acc.id];
              const bal = balanceInfo ? balanceInfo.currentBalancePaise : acc.openingBalancePaise;
              return (
                <div
                  key={acc.id}
                  className="bg-white/[0.035] border border-white/[0.06] rounded-2xl px-3 py-2 shrink-0 min-w-[130px]"
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: acc.color || '#3b82f6' }}
                    />
                    <span className="text-[11px] font-medium text-zinc-300 truncate max-w-[100px]">
                      {acc.name}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white tabular-nums">
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
