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
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-sm relative overflow-hidden">
      <div className="relative z-10">
        {/* Card Header & Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              AVAILABLE TO SPEND
            </span>
            {financialSummary.isOvercommitted ? (
              <span className="mono text-[9px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                OVER-COMMITTED
              </span>
            ) : (
              <span className="mono text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                CONFIRMED
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center space-x-1 mono text-[11px] font-medium text-slate-300 hover:text-white bg-[#161e2e] border border-[#28354b] px-2.5 py-1 rounded transition-all active:scale-95"
            aria-label="Toggle accounting details breakdown"
          >
            <span>Audit</span>
            {showBreakdown ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>

        {/* Main Available To Spend Figure */}
        <div className="mb-3">
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold text-white mono tabular-nums tracking-tight">
              {formatINR(financialSummary.availableToSpendPaise, {
                showPaise: settings.showPaise
              })}
            </span>
          </div>
          {financialSummary.isOvercommitted ? (
            <p className="text-xs text-rose-400 mt-1 font-medium">
              Allocations exceed cash assets by {formatINR(financialSummary.overcommittedPaise)}. Savings goals or pending bills exceed current vault funds.
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">
              Zero-risk cash reserve ready for immediate daily expenditure
            </p>
          )}
        </div>

        {/* Expandable Accounting Breakdown Drawer */}
        {showBreakdown && (
          <div className="mt-3 pt-3 border-t border-[#1f293d] space-y-2 text-xs animate-in slide-in-from-top-1 duration-150">
            <div className="flex justify-between items-center text-slate-300 py-1">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
                Gross Cash & Bank Assets:
              </span>
              <span className="mono font-semibold text-white tabular-nums">
                {formatINR(financialSummary.actualTotalBalancePaise)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-400 py-1 border-t border-[#1a2333]">
              <span className="pl-5">Savings Goals Ring-fenced:</span>
              <span className="mono font-medium text-amber-400 tabular-nums">
                -{formatINR(financialSummary.totalAllocatedToSavingsPaise)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-400 py-1 border-t border-[#1a2333]">
              <span className="pl-5">Reserved Bills & Debt Due:</span>
              <span className="mono font-medium text-rose-400 tabular-nums">
                -{formatINR(financialSummary.reservedForBillsAndDebtPaise)}
              </span>
            </div>

            {financialSummary.expectedFutureIncomeThisMonthPaise > 0 && (
              <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-[#1f293d]">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  Expected Stipend / Income:
                </span>
                <span className="mono font-semibold text-emerald-400 tabular-nums">
                  +{formatINR(financialSummary.expectedFutureIncomeThisMonthPaise)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tracked Accounts Grid */}
        <div className="mt-4 pt-3 border-t border-[#1f293d]">
          <span className="mono text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            TRACKED VAULT LEDGERS ({accounts.length})
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {accounts.map((acc) => {
              const balanceInfo = balancesByAccount[acc.id];
              const bal = balanceInfo ? balanceInfo.currentBalancePaise : acc.openingBalancePaise;
              return (
                <div
                  key={acc.id}
                  className="bg-[#161e2e] border border-[#28354b] rounded-lg px-3 py-2 shrink-0 min-w-[130px]"
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: acc.color || '#3b82f6' }}
                    />
                    <span className="text-[11px] font-medium text-slate-300 truncate max-w-[100px]">
                      {acc.name}
                    </span>
                  </div>
                  <div className="mono text-xs font-bold text-white tabular-nums">
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
