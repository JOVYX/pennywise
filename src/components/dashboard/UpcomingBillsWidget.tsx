import React, { useState } from 'react';
import { CalendarClock, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/formatters';

export const UpcomingBillsWidget: React.FC = () => {
  const { recurringRules, debts, accounts, markRecurringProcessed, recordDebtPayment } = useApp();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const activeBills = recurringRules.filter(
    (r) => r.isActive && r.type === 'expense'
  );
  const activeDebts = debts.filter((d) => !d.isPaidOff && d.currentBalancePaise > 0);

  if (activeBills.length === 0 && activeDebts.length === 0) {
    return null;
  }

  const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];

  const handlePayBill = async (ruleId: string) => {
    setProcessingId(ruleId);
    try {
      await markRecurringProcessed(ruleId, { recordTx: true });
    } finally {
      setProcessingId(null);
    }
  };

  const handlePayDebt = async (debtId: string, amountPaise: number) => {
    if (!defaultAccount) return;
    setProcessingId(debtId);
    try {
      await recordDebtPayment({
        debtId,
        amountPaise,
        accountId: defaultAccount.id
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center space-x-2">
          <CalendarClock className="w-4 h-4 text-amber-400" />
          <h3 className="mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
            PENDING DUES & BILL TIMELINE
          </h3>
        </div>
        <span className="mono text-[10px] font-semibold text-amber-400 tabular-nums px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
          {activeBills.length + activeDebts.length} PENDING
        </span>
      </div>

      <div className="space-y-2">
        {/* Recurring Bills */}
        {activeBills.slice(0, 3).map((bill) => (
          <div
            key={bill.id}
            className="flex items-center justify-between p-3 rounded-lg bg-[#161e2e] border border-[#28354b]"
          >
            <div>
              <div className="text-[13px] font-bold text-white truncate max-w-[160px] tracking-tight">
                {bill.name}
              </div>
              <div className="mono text-[11px] text-slate-400 font-normal">
                Due {bill.nextDueDate} • <span className="capitalize">{bill.frequency}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <span className="mono text-[13px] font-bold text-white tabular-nums tracking-tight">
                {formatINR(bill.amountPaise)}
              </span>
              <button
                type="button"
                disabled={processingId === bill.id}
                onClick={() => handlePayBill(bill.id)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#1f293d] hover:bg-emerald-500 hover:text-slate-950 border border-[#334155] text-slate-200 transition-all active:scale-95 flex items-center gap-1"
              >
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>Paid</span>
              </button>
            </div>
          </div>
        ))}

        {/* Active Debts Due */}
        {activeDebts.slice(0, 2).map((debt) => {
          const dueAmount = debt.minimumPaymentPaise || debt.emiAmountPaise || debt.currentBalancePaise;
          return (
            <div
              key={debt.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[#161e2e] border border-[#28354b]"
            >
              <div>
                <div className="text-[13px] font-bold text-white truncate max-w-[160px] tracking-tight">
                  {debt.name}
                </div>
                <div className="mono text-[11px] text-slate-400 font-normal">
                  Bal: {formatINR(debt.currentBalancePaise)}
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <span className="mono text-[13px] font-bold text-white tabular-nums tracking-tight">
                  {formatINR(dueAmount)}
                </span>
                <button
                  type="button"
                  disabled={processingId === debt.id}
                  onClick={() => handlePayDebt(debt.id, dueAmount)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#1f293d] hover:bg-amber-400 hover:text-slate-950 border border-[#334155] text-slate-200 transition-all active:scale-95 flex items-center gap-1"
                >
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Settle</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
