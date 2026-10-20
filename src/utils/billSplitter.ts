import { SplitMethod, SplitParticipant } from '../types';
import { formatINR } from './formatters';

export interface BillSplitInputParticipant {
  id: string;
  name: string;
  isSelf: boolean;
  shares?: number;
  exactPaise?: number;
}

export interface SplitResult {
  participants: SplitParticipant[];
  remainderPaise: number;
}

export interface SettlementBreakdown {
  userNetExpensePaise: number;
  debtsToCreate: Array<{
    name: string;
    lender: string;
    amountPaise: number;
    type: 'lent_to_friend' | 'personal_debt';
    notes: string;
  }>;
  shareableSummary: string;
}

/**
 * Accurately divides an amount among participants down to the exact paisa,
 * guaranteeing zero loss or inflation.
 */
export function calculateBillSplit(
  totalPaise: number,
  participants: BillSplitInputParticipant[],
  method: SplitMethod
): SplitResult {
  if (totalPaise <= 0 || participants.length === 0) {
    return {
      participants: participants.map((p) => ({
        id: p.id,
        name: p.name,
        isSelf: p.isSelf,
        amountPaise: 0,
        shares: p.shares ?? 1
      })),
      remainderPaise: 0
    };
  }

  const count = participants.length;

  if (method === 'equal') {
    const basePaise = Math.floor(totalPaise / count);
    let remainder = totalPaise % count;

    const computed = participants.map((p) => {
      let amount = basePaise;
      if (remainder > 0) {
        amount += 1;
        remainder -= 1;
      }
      return {
        id: p.id,
        name: p.name,
        isSelf: p.isSelf,
        amountPaise: amount,
        shares: 1
      };
    });

    return { participants: computed, remainderPaise: 0 };
  }

  if (method === 'shares') {
    const totalShares = participants.reduce((sum, p) => sum + Math.max(1, p.shares ?? 1), 0);
    let allocatedSum = 0;

    const preliminary = participants.map((p) => {
      const shares = Math.max(1, p.shares ?? 1);
      const allocated = Math.floor((totalPaise * shares) / totalShares);
      allocatedSum += allocated;
      return {
        id: p.id,
        name: p.name,
        isSelf: p.isSelf,
        amountPaise: allocated,
        shares
      };
    });

    let remainder = totalPaise - allocatedSum;
    // Distribute remaining paise starting from largest share
    const sortedIndices = preliminary
      .map((p, idx) => ({ idx, shares: p.shares }))
      .sort((a, b) => b.shares - a.shares);

    for (const item of sortedIndices) {
      if (remainder <= 0) break;
      preliminary[item.idx].amountPaise += 1;
      remainder -= 1;
    }

    return { participants: preliminary, remainderPaise: 0 };
  }

  // Exact custom amounts
  let currentSum = 0;
  const computed = participants.map((p) => {
    const amount = p.exactPaise ?? 0;
    currentSum += amount;
    return {
      id: p.id,
      name: p.name,
      isSelf: p.isSelf,
      amountPaise: amount,
      shares: 1
    };
  });

  return {
    participants: computed,
    remainderPaise: totalPaise - currentSum
  };
}

/**
 * Builds the debts and accounting records required when a split bill is logged.
 */
export function buildSplitSettlement(params: {
  billTitle: string;
  totalPaise: number;
  payerName: string;
  isPayerSelf: boolean;
  participants: SplitParticipant[];
}): SettlementBreakdown {
  const { billTitle, totalPaise, payerName, isPayerSelf, participants } = params;

  const userPart = participants.find((p) => p.isSelf) || {
    id: 'self',
    name: 'You',
    isSelf: true,
    amountPaise: 0
  };

  const debtsToCreate: SettlementBreakdown['debtsToCreate'] = [];

  if (isPayerSelf) {
    // User paid the entire bill.
    // Friends owe user their individual amounts.
    for (const p of participants) {
      if (!p.isSelf && p.amountPaise > 0) {
        debtsToCreate.push({
          name: `${billTitle} (${p.name}'s share)`,
          lender: p.name, // Debtor name (friend who owes)
          amountPaise: p.amountPaise,
          type: 'lent_to_friend',
          notes: `Lent for ${billTitle} on ${new Date().toLocaleDateString('en-IN')}`
        });
      }
    }
  } else {
    // A friend (e.g. Aman) paid the bill.
    // If user has a share, user owes the payer.
    if (userPart.amountPaise > 0) {
      debtsToCreate.push({
        name: `${billTitle} (My share to ${payerName})`,
        lender: payerName,
        amountPaise: userPart.amountPaise,
        type: 'personal_debt',
        notes: `Owed to ${payerName} for ${billTitle}`
      });
    }
  }

  const shareableSummary = formatWhatsAppSummary({
    billTitle,
    totalPaise,
    payerName,
    isPayerSelf,
    participants
  });

  return {
    userNetExpensePaise: userPart.amountPaise,
    debtsToCreate,
    shareableSummary
  };
}

/**
 * Generates an iPhone / WhatsApp friendly copy-paste text block.
 */
export function formatWhatsAppSummary(params: {
  billTitle: string;
  totalPaise: number;
  payerName: string;
  isPayerSelf: boolean;
  participants: SplitParticipant[];
}): string {
  const { billTitle, totalPaise, payerName, isPayerSelf, participants } = params;

  const lines = [
    `🧾 *Pennywise Bill Split: ${billTitle}*`,
    `💰 Total: ${formatINR(totalPaise)} (Paid by ${isPayerSelf ? 'You' : payerName})`,
    `─────────────────────────`
  ];

  for (const p of participants) {
    const label = p.isSelf ? 'You' : p.name;
    lines.push(`• ${label}: ${formatINR(p.amountPaise)}`);
  }

  lines.push(`─────────────────────────`);
  lines.push(`⚡ Settle up easily via UPI / GPay / PhonePe! 🪙`);

  return lines.join('\n');
}
