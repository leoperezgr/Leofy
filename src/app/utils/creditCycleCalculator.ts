// ─── Shared types ────────────────────────────────────────────────────────────

export type ApiTx = {
  id: string | number;
  type: 'INCOME' | 'EXPENSE' | 'income' | 'expense';
  amount: number | string;
  description?: string | null;
  occurred_at?: string;
  created_at?: string;
  date?: string;
  category?: string | { name?: string | null; icon?: string | null } | null;
  category_name?: string | null;
  category_id?: string | number | null;
  categoryId?: string | number | null;
  card_id?: string | number | null;
  cardId?: string | number | null;
  card?: { id?: string | number | null } | null;
  metadata?: {
    category_name?: string | null;
    categoryName?: string | null;
    paymentMethod?: string | null;
    payment_method?: string | null;
    transferRole?: string | null;
    fromCardId?: string | number | null;
    toCardId?: string | number | null;
    installments?: {
      months?: number | string;
      monthlyAmount?: number | string;
      startAt?: string;
    } | null;
    [key: string]: unknown;
  } | null;
};

export type ApiCard = {
  id: string | number;
  name: string;
  last4: string | null;
  brand?: 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER' | null;
  color?: string | null;
  credit_limit: number | string | null;
  closing_day?: number | string | null;
  closingDay?: number | string | null;
  cutoff_day?: number | string | null;
  cutoffDay?: number | string | null;
  due_day?: number | string | null;
  dueDay?: number | string | null;
  due_date?: string | Date | null;
  dueDate?: string | Date | null;
  cutoff_date?: string | Date | null;
  cutoffDate?: string | Date | null;
};

export type CycleRangeSource = 'cutoff' | 'fallback';

export type CycleRange = {
  start: Date;
  end: Date;
  label: string;
};

export type CurrentCycleInfo = {
  start: Date;
  end: Date;
  label: string;
  source: CycleRangeSource;
  cutoffDate: Date | null;
  dueDate: Date | null;
  nextCutoffDate: Date | null;
  isWithinPaymentWindow: boolean;
};

export type CreditDueCardItem = {
  cardId: string;
  name: string;
  cycleLabel: string;
  dueEstimated: number;
  paidInCycle: number;
  remainingDue: number;
  progressPercent: number;
  colorClass: string;
  source: CycleRangeSource;
  cutoffDate: Date | null;
  dueDate: Date | null;
  nextCutoffDate: Date | null;
  cutoffDeltaLabel: string;
  dueDeltaLabel: string;
  nextCutoffDeltaLabel: string;
  isPaid: boolean;
  isOverdue: boolean;
  daysOverdue: number;
  isDueSoon: boolean;
  daysUntilDue: number | null;
  isWaitingForCutoff: boolean;
};

export type InstallmentsInfo = {
  months: number;
  monthlyAmount: number;
  currentMonth: number;
  remainingMonths: number;
};

export type ThreeCycleBreakdown = {
  pastCycle: CycleRange | null;
  currentCycle: CycleRange | null;
  nextCycle: CycleRange | null;
  dueDate: Date | null;
  closingDay: number;
};

export type ThreeCycleAmounts = {
  pastCycleAmount: number;
  pastCyclePaidAmount: number;
  pastCycleRemainingAmount: number;
  currentCycleAmount: number;
  currentCyclePaidAmount: number;
  currentCycleRemainingAmount: number;
  nextCycleAmount: number;
  nextCyclePaidAmount: number;
  nextCycleRemainingAmount: number;
  pastCycle: CycleRange | null;
  currentCycle: CycleRange | null;
  nextCycle: CycleRange | null;
  dueDate: Date | null;
};

// ─── Primitive helpers ───────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

export function toNumber(v: unknown) {
  const n = typeof v === 'string' ? Number(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function toId(v: string | number) {
  return String(v);
}

export function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function addMonths(date: Date, n: number) {
  const firstTargetMonth = new Date(date.getFullYear(), date.getMonth() + n, 1);
  return safeDayInMonth(firstTargetMonth.getFullYear(), firstTargetMonth.getMonth(), date.getDate());
}

export function safeDayInMonth(year: number, monthIndex0: number, day: number) {
  const normalizedDay = Math.max(1, Math.trunc(day || 1));
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  return new Date(year, monthIndex0, Math.min(normalizedDay, lastDay));
}

export function diffMonths(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export function daysDiff(from: Date, to: Date) {
  const fromMs = startOfDay(from).getTime();
  const toMs = startOfDay(to).getTime();
  return Math.round((toMs - fromMs) / DAY_MS);
}

export function formatRangeLabel(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

export function formatDayDelta(target: Date, now: Date) {
  const signedDays = daysDiff(now, target);
  const absDays = Math.abs(signedDays);

  if (signedDays < 0) {
    return {
      label: `was ${absDays} day${absDays === 1 ? '' : 's'} ago`,
      isPast: true,
      absDays,
      signedDays,
    };
  }

  if (signedDays === 0) {
    return {
      label: 'is today',
      isPast: false,
      absDays: 0,
      signedDays: 0,
    };
  }

  return {
    label: `in ${signedDays} day${signedDays === 1 ? '' : 's'}`,
    isPast: false,
    absDays,
    signedDays,
  };
}

export function safeParseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  if (typeof value === 'string' && value.trim()) {
    const raw = value.trim();
    const calendarMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (calendarMatch) {
      const year = Number(calendarMatch[1]);
      const month = Number(calendarMatch[2]);
      const day = Number(calendarMatch[3]);
      const parsedCalendar = new Date(year, month - 1, day);
      return Number.isFinite(parsedCalendar.getTime()) ? parsedCalendar : null;
    }

    const parsed = new Date(raw);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  return null;
}

export function cardColorToGradient(color?: string | null) {
  switch ((color || 'OTHER').toUpperCase()) {
    case 'RED':
      return 'from-red-500 to-rose-600';
    case 'ORANGE':
      return 'from-orange-500 to-amber-600';
    case 'BLUE':
      return 'from-blue-500 to-indigo-600';
    case 'GOLD':
      return 'from-yellow-400 to-amber-600';
    case 'BLACK':
      return 'from-gray-900 to-gray-700';
    case 'PLATINUM':
      return 'from-slate-300 to-slate-500';
    case 'SILVER':
      return 'from-gray-300 to-gray-500';
    case 'PURPLE':
      return 'from-purple-500 to-fuchsia-600';
    case 'GREEN':
      return 'from-emerald-500 to-teal-600';
    default:
      return 'from-[#2DD4BF] to-[#14B8A6]';
  }
}

// ─── Transaction helpers ─────────────────────────────────────────────────────

export function getTransactionCardId(tx: ApiTx) {
  const raw = tx.card_id ?? tx.cardId ?? tx.card?.id ?? null;
  if (raw === null || raw === undefined) return '';
  return toId(raw);
}

export function sumAmounts(rows: ApiTx[]) {
  return rows.reduce((sum, row) => sum + toNumber(row.amount), 0);
}

export function computeNetUsedByCard(
  transactions: ApiTx[],
  allowedCardIds?: Set<string>
) {
  const balanceByCard = new Map<string, number>();

  for (const tx of transactions) {
    const cardId = getTransactionCardId(tx);
    if (!cardId) continue;
    if (allowedCardIds && !allowedCardIds.has(cardId)) continue;

    const amount = toNumber(tx.amount);
    if (amount <= 0) continue;

    const txType = String(tx.type || '').toUpperCase();
    const current = balanceByCard.get(cardId) ?? 0;

    if (txType === 'EXPENSE') {
      balanceByCard.set(cardId, current + amount);
      continue;
    }

    if (txType === 'INCOME') {
      balanceByCard.set(cardId, current - amount);
    }
  }

  const normalized = new Map<string, number>();
  for (const [cardId, balance] of balanceByCard.entries()) {
    normalized.set(cardId, Math.max(0, balance));
  }

  return normalized;
}

export function getTransactionCategoryName(tx: ApiTx) {
  const direct = typeof tx.category === 'string' ? tx.category.trim() : '';
  if (direct) return direct;

  const metadata = tx.metadata;
  if (metadata && typeof metadata === 'object') {
    const categoryName =
      typeof metadata.category_name === 'string'
        ? metadata.category_name.trim()
        : typeof (metadata as any).categoryName === 'string'
          ? String((metadata as any).categoryName).trim()
          : '';
    if (categoryName) return categoryName;
  }

  return '';
}

export function isLikelyCreditCardPayment(tx: ApiTx) {
  const category = getTransactionCategoryName(tx).toLowerCase();
  const description = String(tx.description || '').trim().toLowerCase();
  const metadata = tx.metadata && typeof tx.metadata === 'object' ? tx.metadata : null;
  const txType = String(tx.type || '').trim().toUpperCase();
  const transferRole = String(metadata?.transferRole || '').trim().toLowerCase();
  const paymentMethod = String(metadata?.paymentMethod ?? metadata?.payment_method ?? '').trim().toLowerCase();
  const exactCategorySignals = new Set([
    'credit card payment',
    'card payment',
    'payment to card',
    'credit payment',
    'pago tarjeta',
    'pago de tarjeta',
    'pago tc',
    'pago tdc',
  ]);
  const exactDescriptionSignals = new Set([
    'credit card payment',
    'card payment',
    'payment to card',
    'payment to credit card',
    'pago tarjeta',
    'pago de tarjeta',
    'pago tc',
    'pago tdc',
  ]);

  if (category && exactCategorySignals.has(category)) return true;
  if (description && exactDescriptionSignals.has(description)) return true;

  if (description.startsWith('payment to card')) return true;
  if (description.startsWith('payment to credit card')) return true;
  if (description.startsWith('pago de tarjeta')) return true;
  if (description.startsWith('pago tarjeta')) return true;

  if (
    txType === 'INCOME' &&
    transferRole === 'incoming' &&
    category === 'transfer' &&
    ['credit', 'cash', 'debit'].includes(paymentMethod)
  ) {
    return true;
  }

  return false;
}

// ─── Card helpers ────────────────────────────────────────────────────────────

export function getClosingDay(card: ApiCard): number {
  const raw =
    (card as any).cutoffDay ??
    (card as any).cutoff_day ??
    (card as any).closingDay ??
    (card as any).closing_day;
  const n = Math.trunc(toNumber(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function getDueDay(card: ApiCard): number {
  const raw = (card as any).dueDay ?? (card as any).due_day;
  const n = Math.trunc(toNumber(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ─── Cycle calculation ───────────────────────────────────────────────────────

function getLast30DaysRange(ref: Date) {
  return {
    start: startOfDay(addDays(ref, -30)),
    end: endOfDay(ref),
  };
}

export function getCurrentCycleInfo(card: ApiCard, refDate: Date): CurrentCycleInfo {
  const explicitDueDate = safeParseDate(
    (card as any).dueDate ?? (card as any).due_date
  );
  const cutoffDay = getClosingDay(card);
  const dueDay = getDueDay(card);

  if (cutoffDay <= 0) {
    const fallback = getLast30DaysRange(refDate);
    const dueDate = explicitDueDate ? startOfDay(explicitDueDate) : null;
    return {
      start: fallback.start,
      end: fallback.end,
      label: 'Last 30 Days',
      source: 'fallback',
      cutoffDate: null,
      dueDate,
      nextCutoffDate: null,
      isWithinPaymentWindow: dueDate ? startOfDay(refDate).getTime() <= dueDate.getTime() : true,
    };
  }

  const today = startOfDay(refDate);
  const cutoffThisMonth = startOfDay(safeDayInMonth(today.getFullYear(), today.getMonth(), cutoffDay));
  const cutoffActual = today.getTime() >= cutoffThisMonth.getTime()
    ? cutoffThisMonth
    : startOfDay(safeDayInMonth(today.getFullYear(), today.getMonth() - 1, cutoffDay));
  const previousCutoff = safeDayInMonth(cutoffActual.getFullYear(), cutoffActual.getMonth() - 1, cutoffDay);
  const cycleStart = startOfDay(addDays(previousCutoff, 1));
  const nextCutoffDate = startOfDay(safeDayInMonth(cutoffActual.getFullYear(), cutoffActual.getMonth() + 1, cutoffDay));

  const dueDate = dueDay > 0
    ? startOfDay(safeDayInMonth(cutoffActual.getFullYear(), cutoffActual.getMonth() + 1, dueDay))
    : explicitDueDate
      ? startOfDay(explicitDueDate)
      : null;

  return {
    start: cycleStart,
    end: endOfDay(cutoffActual),
    label: formatRangeLabel(cycleStart, cutoffActual),
    source: 'cutoff',
    cutoffDate: startOfDay(cutoffActual),
    dueDate,
    nextCutoffDate,
    isWithinPaymentWindow: dueDate ? today.getTime() <= dueDate.getTime() : true,
  };
}

// ─── Installments ────────────────────────────────────────────────────────────

export function getInstallmentCycleEnd(startAtDate: Date, closingDay: number) {
  const purchaseDate = startOfDay(startAtDate);
  const sameMonthCutoff = safeDayInMonth(purchaseDate.getFullYear(), purchaseDate.getMonth(), closingDay);

  if (purchaseDate.getTime() <= startOfDay(sameMonthCutoff).getTime()) {
    return startOfDay(sameMonthCutoff);
  }

  return startOfDay(safeDayInMonth(purchaseDate.getFullYear(), purchaseDate.getMonth() + 1, closingDay));
}

export function getInstallmentsInfo(
  tx: ApiTx,
  referenceDate: Date,
  closingDay?: number
): InstallmentsInfo | null {
  const installments = tx?.metadata?.installments;
  if (!installments || typeof installments !== 'object') return null;

  const months = Math.trunc(toNumber((installments as any).months));
  if (months < 2 || months > 60) return null;

  const amount = toNumber(tx?.amount);
  const monthlyAmountRaw =
    (installments as any).monthlyAmount !== undefined
      ? toNumber((installments as any).monthlyAmount)
      : Number((amount / months).toFixed(2));
  if (monthlyAmountRaw <= 0) return null;

  const startRaw = (installments as any).startAt || tx?.occurred_at;
  const startAt = startRaw ? new Date(startRaw) : null;

  let currentMonth = 1;
  if (startAt && !Number.isNaN(startAt.getTime())) {
    if (closingDay && closingDay > 0) {
      const firstCycleEnd = getInstallmentCycleEnd(startAt, closingDay);
      const monthsElapsed = diffMonths(firstCycleEnd, startOfDay(referenceDate));
      currentMonth = Math.max(1, Math.min(months, monthsElapsed + 1));
    } else {
      const monthsElapsed =
        (referenceDate.getFullYear() - startAt.getFullYear()) * 12 +
        (referenceDate.getMonth() - startAt.getMonth());
      currentMonth = Math.max(1, Math.min(months, monthsElapsed + 1));
    }
  }

  return {
    months,
    monthlyAmount: Number(monthlyAmountRaw.toFixed(2)),
    currentMonth,
    remainingMonths: Math.max(0, months - currentMonth),
  };
}

// ─── Cycle expense computation ───────────────────────────────────────────────

export function computeCycleExpenseDue(
  transactions: ApiTx[],
  currentCardId: string,
  start: Date,
  end: Date,
  closingDay: number
) {
  return Math.max(0, transactions.reduce((sum, tx) => {
    const txCardId = getTransactionCardId(tx);
    if (!txCardId || txCardId !== currentCardId) return sum;

    const txType = String(tx.type || '').toUpperCase();
    if (txType !== 'EXPENSE') return sum;
    if (isLikelyCreditCardPayment(tx)) return sum;

    const amount = toNumber(tx.amount);
    if (amount <= 0) return sum;

    const rawDate = tx.occurred_at || tx.created_at || tx.date;
    if (!rawDate) return sum;

    const occurredAt = new Date(rawDate);
    if (!Number.isFinite(occurredAt.getTime())) return sum;

    const installments = (tx as any)?.metadata?.installments;
    if (installments && typeof installments === 'object') {
      const months = Math.trunc(toNumber((installments as any).months));
      if (months < 2 || months > 60) return sum;

      const monthlyAmount =
        (installments as any).monthlyAmount !== undefined
          ? toNumber((installments as any).monthlyAmount)
          : toNumber(Number((amount / months).toFixed(2)));
      if (monthlyAmount <= 0) return sum;

      const startAtRaw = (installments as any).startAt || rawDate;
      const startAtDate = new Date(startAtRaw);
      if (!Number.isFinite(startAtDate.getTime())) return sum;

      const firstCycleEnd = Number.isFinite(closingDay) && closingDay > 0
        ? getInstallmentCycleEnd(startAtDate, closingDay)
        : startOfDay(startAtDate);
      const monthsElapsed = diffMonths(firstCycleEnd, startOfDay(end));
      if (monthsElapsed >= 0 && monthsElapsed < months) {
        return sum + monthlyAmount;
      }
      return sum;
    }

    return occurredAt >= start && occurredAt <= end ? sum + amount : sum;
  }, 0));
}

export function computeCyclePaymentTotal(
  transactions: ApiTx[],
  currentCardId: string,
  start: Date,
  end: Date
) {
  return Math.max(0, transactions.reduce((sum, tx) => {
    const txCardId = getTransactionCardId(tx);
    if (!txCardId || txCardId !== currentCardId) return sum;

    const txType = String(tx.type || '').toUpperCase();
    if (txType !== 'INCOME' && txType !== 'EXPENSE') return sum;
    if (!isLikelyCreditCardPayment(tx)) return sum;

    const amount = toNumber(tx.amount);
    if (amount <= 0) return sum;

    const rawDate = tx.occurred_at || tx.created_at || tx.date;
    if (!rawDate) return sum;

    const txDate = new Date(rawDate);
    if (!Number.isFinite(txDate.getTime())) return sum;
    if (txDate < start || txDate > end) return sum;

    return sum + amount;
  }, 0));
}

// ─── Three-cycle breakdown ───────────────────────────────────────────────────

export function getThreeCycleRanges(card: ApiCard, refDate: Date): ThreeCycleBreakdown {
  const closingDay = getClosingDay(card);
  const dueDay = getDueDay(card);

  if (closingDay <= 0) {
    return { pastCycle: null, currentCycle: null, nextCycle: null, dueDate: null, closingDay: 0 };
  }

  const today = startOfDay(refDate);

  const closingThisMonth = startOfDay(safeDayInMonth(today.getFullYear(), today.getMonth(), closingDay));

  // Next closing: if today hasn't passed this month's closing, it's this month; otherwise next month
  const nextClosingDate = today.getTime() <= closingThisMonth.getTime()
    ? closingThisMonth
    : startOfDay(safeDayInMonth(today.getFullYear(), today.getMonth() + 1, closingDay));

  // Last closing: the one that already passed
  const lastClosingDate = today.getTime() > closingThisMonth.getTime()
    ? closingThisMonth
    : startOfDay(safeDayInMonth(today.getFullYear(), today.getMonth() - 1, closingDay));

  const prevClosingDate = startOfDay(safeDayInMonth(lastClosingDate.getFullYear(), lastClosingDate.getMonth() - 1, closingDay));
  const afterNextClosingDate = startOfDay(safeDayInMonth(nextClosingDate.getFullYear(), nextClosingDate.getMonth() + 1, closingDay));

  // Past cycle: prevClosing+1 ... lastClosing (the closed cycle being paid)
  const pastCycleStart = startOfDay(addDays(prevClosingDate, 1));
  const pastCycleEnd = endOfDay(lastClosingDate);

  // Current cycle: lastClosing+1 ... nextClosing (the active spending cycle)
  const currentCycleStart = startOfDay(addDays(lastClosingDate, 1));
  const currentCycleEnd = endOfDay(nextClosingDate);

  // Next cycle: nextClosing+1 ... afterNextClosing (upcoming committed charges)
  const nextCycleStart = startOfDay(addDays(nextClosingDate, 1));
  const nextCycleEnd = endOfDay(afterNextClosingDate);

  const dueDate = dueDay > 0
    ? startOfDay(safeDayInMonth(lastClosingDate.getFullYear(), lastClosingDate.getMonth() + 1, dueDay))
    : null;

  return {
    pastCycle: {
      start: pastCycleStart,
      end: pastCycleEnd,
      label: formatRangeLabel(pastCycleStart, lastClosingDate),
    },
    currentCycle: {
      start: currentCycleStart,
      end: currentCycleEnd,
      label: formatRangeLabel(currentCycleStart, nextClosingDate),
    },
    nextCycle: {
      start: nextCycleStart,
      end: nextCycleEnd,
      label: formatRangeLabel(nextCycleStart, afterNextClosingDate),
    },
    dueDate,
    closingDay,
  };
}

export function computeThreeCycleAmounts(
  card: ApiCard,
  transactions: ApiTx[],
  refDate: Date
): ThreeCycleAmounts {
  const ranges = getThreeCycleRanges(card, refDate);
  const cardId = toId(card.id);
  const paymentRangeEnd = endOfDay(refDate);

  const pastCycleAmount = ranges.pastCycle
    ? computeCycleExpenseDue(transactions, cardId, ranges.pastCycle.start, ranges.pastCycle.end, ranges.closingDay)
    : 0;
  const totalPaidSinceStatement = ranges.pastCycle
    ? computeCyclePaymentTotal(transactions, cardId, ranges.pastCycle.start, paymentRangeEnd)
    : 0;
  const pastCyclePaidApplied = Math.min(pastCycleAmount, totalPaidSinceStatement);
  const pastCycleRemainingAmount = Math.max(pastCycleAmount - pastCyclePaidApplied, 0);

  const currentCycleAmount = ranges.currentCycle
    ? computeCycleExpenseDue(transactions, cardId, ranges.currentCycle.start, ranges.currentCycle.end, ranges.closingDay)
    : 0;

  const nextCycleAmount = ranges.nextCycle
    ? computeCycleExpenseDue(transactions, cardId, ranges.nextCycle.start, ranges.nextCycle.end, ranges.closingDay)
    : 0;

  let remainingPaymentToAllocate = totalPaidSinceStatement;
  remainingPaymentToAllocate = Math.max(0, remainingPaymentToAllocate - pastCyclePaidApplied);
  const currentCyclePaidAmount = Math.min(currentCycleAmount, remainingPaymentToAllocate);
  remainingPaymentToAllocate = Math.max(0, remainingPaymentToAllocate - currentCyclePaidAmount);
  const nextCyclePaidAmount = Math.min(nextCycleAmount, remainingPaymentToAllocate);

  return {
    pastCycleAmount,
    pastCyclePaidAmount: pastCyclePaidApplied,
    pastCycleRemainingAmount,
    currentCycleAmount,
    currentCyclePaidAmount,
    currentCycleRemainingAmount: Math.max(currentCycleAmount - currentCyclePaidAmount, 0),
    nextCycleAmount,
    nextCyclePaidAmount,
    nextCycleRemainingAmount: Math.max(nextCycleAmount - nextCyclePaidAmount, 0),
    pastCycle: ranges.pastCycle,
    currentCycle: ranges.currentCycle,
    nextCycle: ranges.nextCycle,
    dueDate: ranges.dueDate,
  };
}
