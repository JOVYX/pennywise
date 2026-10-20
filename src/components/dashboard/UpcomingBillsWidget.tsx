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
    <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center space-x-2">
          <CalendarClock className="w-4 h-4 text-neutral-300" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Upcoming Bills & Repayments
          </h3>
        </div>
        <span className="text-[11px] font-medium text-neutral-400 tabular-nums px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
          {activeBills.length + activeDebts.length} pending
        </span>
      </div>

      <div className="space-y-2">
        {/* Recurring Bills */}
        {activeBills.slice(0, 3).map((bill) => (
          <div
            key={bill.id}
            className="flex items-center justify-between p-3 rounded-2xl bg-black/50 border border-white/[0.05] hover:border-white/[0.09] transition-colors"
          >
            <div>
              <div className="text-[13px] font-medium text-white truncate max-w-[160px] tracking-tight">
                {bill.name}
              </div>
              <div className="text-[11px] text-neutral-500 font-normal">
                Due {bill.nextDueDate} • <span className="capitalize">{bill.frequency}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <span className="text-[13px] font-semibold text-white tabular-nums tracking-tight">
                {formatINR(bill.amountPaise)}
              </span>
              <button
                type="button"
                disabled={processingId === bill.id}
                onClick={() => handlePayBill(bill.id)}
                className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white/[0.08] hover:bg-emerald-400 hover:text-black border border-white/[0.08] text-neutral-200 transition-all active:scale-95 flex items-center gap-1"
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
              className="flex items-center justify-between p-3 rounded-2xl bg-black/50 border border-white/[0.05] hover:border-white/[0.09] transition-colors"
            >
              <div>
                <div className="text-[13px] font-medium text-white truncate max-w-[160px] tracking-tight">
                  {debt.name}
                </div>
                <div className="text-[11px] text-neutral-500 font-normal">
                  Bal: {formatINR(debt.currentBalancePaise)}
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <span className="text-[13px] font-semibold text-white tabular-nums tracking-tight">
                  {formatINR(dueAmount)}
                </span>
                <button
                  type="button"
                  disabled={processingId === debt.id}
                  onClick={() => handlePayDebt(debt.id, dueAmount)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white/[0.08] hover:bg-neutral-200 hover:text-black border border-white/[0.08] text-neutral-200 transition-all active:scale-95 flex items-center gap-1"
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
