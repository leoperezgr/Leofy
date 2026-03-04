import { useEffect, useMemo, useState } from 'react';
import { normalizeTransactions } from '../utils/transactionsMapper';
import { DashboardOverview } from './DashboardOverview';
import { DashboardNetAvailable } from './DashboardNetAvailable';
import { applyCardOrder } from '../utils/cardOrder';
import { LoadingScreen } from './LoadingScreen';
import { useAppDate } from '../contexts/AppDateContext';
import '../../styles/components/Dashboard.css';

type DashboardData = {
  income: number;
  expenses: number;
  balance: number;
  weekly_spending?: Array<{ day: string; amount: number }>;
  weekly_total_expenses?: number;
  recentTransactions: Array<{
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string | null;
    occurred_at: string;
    category_id: string | null;
  }>;
};

type ApiTx = {
  id: string | number;
  type: 'INCOME' | 'EXPENSE' | 'income' | 'expense';
  amount: number | string;
  description?: string | null;
  occurred_at?: string;
  created_at?: string;
  date?: string;
  category?: string | null;
  category_id?: string | number | null;
  metadata?: {
    category_name?: string;
    [key: string]: unknown;
  } | null;
  card_id?: string | number | null;
  cardId?: string | number | null;
  card?: {
    id?: string | number | null;
  } | null;
};

type ApiCard = {
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

type Period = 'month' | 'week' | '30days' | 'year' | 'custom';
type DashboardTab = 'overview' | 'net';
type CycleRangeSource = 'cutoff' | 'fallback';
type CurrentCycleInfo = {
  start: Date;
  end: Date;
  label: string;
  source: CycleRangeSource;
  cutoffDate: Date | null;
  dueDate: Date | null;
  nextCutoffDate: Date | null;
  isWithinPaymentWindow: boolean;
};
type CreditDueCardItem = {
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

const DAY_MS = 24 * 60 * 60 * 1000;

function toNumber(v: unknown) {
  const n = typeof v === 'string' ? Number(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toId(v: string | number) {
  return typeof v === 'number' ? String(v) : String(v);
}

function cardColorToGradient(color?: string | null) {
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

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfMonth(d: Date) {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function startOfWeek(d: Date) {
  const next = startOfDay(d);
  const diff = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

function startOfYear(d: Date) {
  return startOfDay(new Date(d.getFullYear(), 0, 1));
}

function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function safeDayInMonth(year: number, monthIndex0: number, day: number) {
  const normalizedDay = Math.max(1, Math.trunc(day || 1));
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  return new Date(year, monthIndex0, Math.min(normalizedDay, lastDay));
}

function daysDiff(from: Date, to: Date) {
  const fromMs = startOfDay(from).getTime();
  const toMs = startOfDay(to).getTime();
  return Math.round((toMs - fromMs) / DAY_MS);
}

function diffMonths(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function toInputDateValue(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string, fallback: Date) {
  const [yearRaw, monthRaw, dayRaw] = String(value || '').split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return fallback;
  }

  return new Date(year, month - 1, day);
}

function getDateRange(period: Period, customStartDate: string, customEndDate: string, today: Date = new Date()) {

  switch (period) {
    case 'week':
      return { start: startOfWeek(today), end: endOfDay(today) };
    case '30days':
      return { start: startOfDay(addDays(today, -30)), end: endOfDay(today) };
    case 'year':
      return { start: startOfYear(today), end: endOfDay(today) };
    case 'custom': {
      const start = startOfDay(parseInputDate(customStartDate, today));
      const end = endOfDay(parseInputDate(customEndDate, today));
      if (end < start) {
        return { start, end: endOfDay(start) };
      }
      return { start, end };
    }
    case 'month':
    default:
      return { start: startOfMonth(today), end: endOfDay(today) };
  }
}

function getPeriodLabel(period: Period) {
  switch (period) {
    case 'week':
      return 'This Week';
    case '30days':
      return 'Last 30 Days';
    case 'year':
      return 'This Year';
    case 'custom':
      return 'Custom Range';
    case 'month':
    default:
      return 'This Month';
  }
}

function formatRangeLabel(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

function formatDayDelta(target: Date, now: Date) {
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

function safeParseDate(value: unknown): Date | null {
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


function getLast30DaysRange(ref: Date) {
  return {
    start: startOfDay(addDays(ref, -30)),
    end: endOfDay(ref),
  };
}

function getCurrentCycleInfo(card: ApiCard, refDate: Date): CurrentCycleInfo {
  const explicitDueDate = safeParseDate(
    (card as any).dueDate ??
    (card as any).due_date
  );
  const cutoffDayRaw =
    (card as any).cutoffDay ??
    (card as any).cutoff_day ??
    (card as any).closingDay ??
    (card as any).closing_day;
  const dueDayRaw =
    (card as any).dueDay ??
    (card as any).due_day;
  const cutoffDay = Math.trunc(toNumber(cutoffDayRaw));
  const dueDay = Math.trunc(toNumber(dueDayRaw));

  if (!Number.isFinite(cutoffDay) || cutoffDay <= 0) {
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

  const dueDate = Number.isFinite(dueDay) && dueDay > 0
    ? startOfDay(
        safeDayInMonth(cutoffActual.getFullYear(), cutoffActual.getMonth() + 1, dueDay)
      )
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

function getTransactionCategoryName(tx: ApiTx) {
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

function isLikelyCreditCardPayment(tx: ApiTx) {
  const category = getTransactionCategoryName(tx).toLowerCase();
  const description = String(tx.description || '').trim().toLowerCase();
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

  return false;
}

function getInstallmentCycleEnd(startAtDate: Date, closingDay: number) {
  const purchaseDate = startOfDay(startAtDate);
  const sameMonthCutoff = safeDayInMonth(purchaseDate.getFullYear(), purchaseDate.getMonth(), closingDay);

  if (purchaseDate.getTime() <= startOfDay(sameMonthCutoff).getTime()) {
    return startOfDay(sameMonthCutoff);
  }

  return startOfDay(safeDayInMonth(purchaseDate.getFullYear(), purchaseDate.getMonth() + 1, closingDay));
}

function computeCycleExpenseDue(
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

function sumAmounts(rows: ApiTx[]) {
  return rows.reduce((sum, row) => sum + toNumber(row.amount), 0);
}

function getTransactionCardId(tx: ApiTx) {
  const raw = tx.card_id ?? tx.cardId ?? tx.card?.id ?? null;
  if (raw === null || raw === undefined) return '';
  return toId(raw);
}

export function Dashboard() {
  const { getAppDate } = useAppDate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const userName = useMemo(() => {
    try {
      const raw = localStorage.getItem('leofy_user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return (
        String(parsed?.full_name || parsed?.name || '').trim() ||
        String(parsed?.email || '').split('@')[0] ||
        ''
      );
    } catch {
      return '';
    }
  }, []);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<ApiTx[]>([]);
  const [cards, setCards] = useState<ApiCard[]>([]);
  const [period, setPeriod] = useState<Period>('month');
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [customStartDate, setCustomStartDate] = useState(() => toInputDateValue(startOfMonth(getAppDate())));
  const [customEndDate, setCustomEndDate] = useState(() => toInputDateValue(getAppDate()));

  useEffect(() => {
  let cancelled = false;

  async function load() {
    try {
      setLoading(true);

      const userId = localStorage.getItem('leofy_user')
        ? JSON.parse(localStorage.getItem('leofy_user') as string).id
        : '2';

      const token = localStorage.getItem('leofy_token');

      const res = await fetch(
        `${API_BASE}/api/stats/dashboard?userId=${encodeURIComponent(userId)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      const txRes = await fetch(`${API_BASE}/api/transactions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const cardsRes = await fetch(`${API_BASE}/api/cards`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const text = await res.text(); // ðŸ‘ˆ lee aunque no sea JSON
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // no era JSON
      }

      if (!res.ok) {
        console.error('DASHBOARD non-OK response:', {
          status: res.status,
          statusText: res.statusText,
          body: json ?? text,
        });
        throw new Error((json?.error || json?.message || text || 'Failed to load dashboard').toString());
      }
      const txJson = await txRes.json().catch(() => null);
      const cardsJson = await cardsRes.json().catch(() => null);
      if (!txRes.ok) {
        throw new Error((txJson?.error || txJson?.message || 'Failed to load transactions').toString());
      }
      if (!cardsRes.ok) {
        throw new Error((cardsJson?.error || cardsJson?.message || 'Failed to load cards').toString());
      }

       if (!cancelled) setData(json);
       if (!cancelled) setTransactions(Array.isArray(txJson) ? txJson : []);
       if (!cancelled) setCards(Array.isArray(cardsJson) ? cardsJson : []);
     } catch (e) {
       console.error('LOAD DASHBOARD ERROR:', e);
       if (!cancelled) {
         setData(null);
        setTransactions([]);
        setCards([]);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
    
  }

  load();

  return () => {
     cancelled = true;
   };
}, [API_BASE]);

  const selectedRange = useMemo(
    () => getDateRange(period, customStartDate, customEndDate, getAppDate()),
    [period, customStartDate, customEndDate, getAppDate]
  );

  const filteredTx = useMemo(() => {
    return transactions.filter((tx) => {
      const rawDate = tx.occurred_at || tx.created_at || tx.date;
      if (!rawDate) return false;
      const txDate = new Date(rawDate);
      if (!Number.isFinite(txDate.getTime())) return false;
      return txDate >= selectedRange.start && txDate <= selectedRange.end;
    });
  }, [transactions, selectedRange]);

  const income = useMemo(() => {
    return filteredTx.reduce((sum, tx) => {
      return String(tx.type || '').toUpperCase() === 'INCOME' ? sum + toNumber(tx.amount) : sum;
    }, 0);
  }, [filteredTx]);

  const expenses = useMemo(() => {
    return filteredTx.reduce((sum, tx) => {
      return String(tx.type || '').toUpperCase() === 'EXPENSE' ? sum + toNumber(tx.amount) : sum;
    }, 0);
  }, [filteredTx]);

  const balance = income - expenses;

  const chartData = useMemo(() => {
    const expenseRows = filteredTx
      .filter((tx) => String(tx.type || '').toUpperCase() === 'EXPENSE')
      .map((tx) => {
        const rawDate = tx.occurred_at || tx.created_at || tx.date;
        const txDate = rawDate ? new Date(rawDate) : new Date();
        return {
          amount: toNumber(tx.amount),
          date: startOfDay(txDate),
        };
      })
      .filter((row) => Number.isFinite(row.date.getTime()));

    if (period === 'week') {
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return labels.map((day, index) => {
        const bucketDate = startOfDay(addDays(selectedRange.start, index));
        const amount = expenseRows.reduce((sum, row) => {
          return row.date.getTime() === bucketDate.getTime() ? sum + row.amount : sum;
        }, 0);

        return { day, amount };
      });
    }

    if (period === 'month') {
      const daysInScope =
        Math.floor((startOfDay(selectedRange.end).getTime() - selectedRange.start.getTime()) / DAY_MS) + 1;
      const bucketCount = Math.max(1, Math.ceil(daysInScope / 7));

      return Array.from({ length: bucketCount }, (_, index) => {
        const amount = expenseRows.reduce((sum, row) => {
          const dayIndex = Math.floor((row.date.getTime() - selectedRange.start.getTime()) / DAY_MS);
          return Math.floor(dayIndex / 7) === index ? sum + row.amount : sum;
        }, 0);

        return { day: `W${index + 1}`, amount };
      });
    }

    if (period === '30days') {
      return Array.from({ length: 6 }, (_, index) => {
        const startDay = index * 5 + 1;
        const endDay = index === 5 ? 30 : (index + 1) * 5;
        const amount = expenseRows.reduce((sum, row) => {
          const dayIndex = Math.floor((row.date.getTime() - selectedRange.start.getTime()) / DAY_MS);
          return Math.min(5, Math.floor(dayIndex / 5)) === index ? sum + row.amount : sum;
        }, 0);

        return { day: `${startDay}-${endDay}`, amount };
      });
    }

    if (period === 'year') {
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthLabels.map((day, index) => {
        const amount = expenseRows.reduce((sum, row) => {
          return row.date.getMonth() === index ? sum + row.amount : sum;
        }, 0);

        return { day, amount };
      });
    }

    const totalDays =
      Math.floor((startOfDay(selectedRange.end).getTime() - selectedRange.start.getTime()) / DAY_MS) + 1;

    if (totalDays <= 14) {
      return Array.from({ length: totalDays }, (_, index) => {
        const bucketDate = startOfDay(addDays(selectedRange.start, index));
        const amount = expenseRows.reduce((sum, row) => {
          return row.date.getTime() === bucketDate.getTime() ? sum + row.amount : sum;
        }, 0);

        return {
          day: `${bucketDate.getMonth() + 1}/${bucketDate.getDate()}`,
          amount,
        };
      });
    }

    if (totalDays <= 62) {
      const bucketCount = Math.max(1, Math.ceil(totalDays / 7));
      return Array.from({ length: bucketCount }, (_, index) => {
        const amount = expenseRows.reduce((sum, row) => {
          const dayIndex = Math.floor((row.date.getTime() - selectedRange.start.getTime()) / DAY_MS);
          return Math.floor(dayIndex / 7) === index ? sum + row.amount : sum;
        }, 0);

        return { day: `W${index + 1}`, amount };
      });
    }

    const monthCount =
      (selectedRange.end.getFullYear() - selectedRange.start.getFullYear()) * 12 +
      (selectedRange.end.getMonth() - selectedRange.start.getMonth()) +
      1;

    return Array.from({ length: monthCount }, (_, index) => {
      const bucketDate = new Date(selectedRange.start.getFullYear(), selectedRange.start.getMonth() + index, 1);
      const amount = expenseRows.reduce((sum, row) => {
        return row.date.getFullYear() === bucketDate.getFullYear() && row.date.getMonth() === bucketDate.getMonth()
          ? sum + row.amount
          : sum;
      }, 0);

      return {
        day: bucketDate.toLocaleDateString('en-US', { month: 'short' }),
        amount,
      };
    });
  }, [filteredTx, period, selectedRange]);

  const recentUi = useMemo(() => {
    return normalizeTransactions(filteredTx)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [filteredTx]);

  const spendingByCategory = useMemo(() => {
    const totals = new Map<string, number>();

    normalizeTransactions(filteredTx)
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        const key = String(tx.category || 'Uncategorized');
        totals.set(key, (totals.get(key) ?? 0) + toNumber(tx.amount));
      });

    return Array.from(totals.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [filteredTx]);

  const topCategoryAmount = spendingByCategory[0]?.amount ?? 0;

  const creditCards = useMemo(
    () => applyCardOrder(cards.filter((c) => toNumber(c.credit_limit) > 0)),
    [cards]
  );
  const debitCardIds = useMemo(
    () => new Set(cards.filter((c) => toNumber(c.credit_limit) <= 0).map((c) => toId(c.id))),
    [cards]
  );

  const totalCreditLimit = creditCards.reduce((sum, c) => sum + toNumber(c.credit_limit), 0);
  const totalCreditUsed = useMemo(() => {
    const creditIds = new Set(creditCards.map((card) => toId(card.id)));

    return transactions.reduce((sum, tx) => {
      const txCardId = getTransactionCardId(tx);
      if (!txCardId || !creditIds.has(txCardId)) return sum;
      if (String(tx.type || '').toUpperCase() !== 'EXPENSE') return sum;
      if (isLikelyCreditCardPayment(tx)) return sum;
      return sum + toNumber(tx.amount);
    }, 0);
  }, [creditCards, transactions]);
  const creditUsagePercent = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;
  const totalDebitAvailable = useMemo(() => {
    return transactions.reduce((sum, t) => {
      const cardIdRaw = (t as any).card_id ?? (t as any).cardId ?? null;
      if (!cardIdRaw) return sum;
      const cardId = toId(cardIdRaw);
      if (!debitCardIds.has(cardId)) return sum;

      const amount = toNumber((t as any).amount);
      const type = String((t as any).type || '').toUpperCase();
      if (type === 'INCOME') return sum + amount;
      if (type === 'EXPENSE') return sum - amount;
      return sum;
    }, 0);
  }, [transactions, debitCardIds]);

  const creditDueByCard = useMemo<CreditDueCardItem[]>(() => {
    const today = getAppDate();

    return creditCards
      .map((card) => {
        const cardId = toId(card.id);
        const cycle = getCurrentCycleInfo(card, today);
        const cycleRows = transactions.filter((tx) => {
          const txCardId = getTransactionCardId(tx);
          if (!txCardId || txCardId !== cardId) return false;

          const rawDate = tx.occurred_at || tx.created_at || tx.date;
          if (!rawDate) return false;

          const txDate = new Date(rawDate);
          if (!Number.isFinite(txDate.getTime())) return false;

          return txDate >= cycle.start && txDate <= cycle.end;
        });

        const paymentRows = cycleRows.filter((tx) => {
          const txType = String(tx.type || '').toUpperCase();
          if (txType === 'INCOME') return true;
          if (txType !== 'EXPENSE') return false;
          return isLikelyCreditCardPayment(tx);
        });
        const cutoffDay = Math.trunc(
          toNumber(
            (card as any).cutoffDay ??
            (card as any).cutoff_day ??
            (card as any).closingDay ??
            (card as any).closing_day
          )
        );
        const dueEstimated = computeCycleExpenseDue(
          transactions,
          cardId,
          cycle.start,
          cycle.end,
          cutoffDay
        );
        const paidInCycle = sumAmounts(paymentRows);
        const remainingDue = Math.max(dueEstimated - paidInCycle, 0);
        const progressPercent = dueEstimated > 0
          ? Math.min((paidInCycle / dueEstimated) * 100, 100)
          : 0;
        const cutoffDate = cycle.cutoffDate;
        const dueDate = cycle.dueDate;
        const nextCutoffDate = cycle.nextCutoffDate;
        const cutoffDelta = cutoffDate ? formatDayDelta(cutoffDate, today) : null;
        const dueDelta = dueDate ? formatDayDelta(dueDate, today) : null;
        const nextCutoffDelta = nextCutoffDate ? formatDayDelta(nextCutoffDate, today) : null;
        const isPaid = remainingDue <= 0.01;
        const isOverdue = Boolean(dueDate && dueDelta?.isPast && !isPaid);
        const isWaitingForCutoff = !cycle.isWithinPaymentWindow && isPaid;
        const daysOverdue = isOverdue ? dueDelta?.absDays ?? 0 : 0;
        const daysUntilDue = dueDate && !dueDelta?.isPast ? dueDelta?.signedDays ?? 0 : null;
        const isDueSoon = Boolean(
          !isWaitingForCutoff &&
          dueDate &&
          !isOverdue &&
          !isPaid &&
          daysUntilDue !== null &&
          daysUntilDue <= 3
        );

        return {
          cardId,
          name: card.name,
          cycleLabel: cycle.label,
          dueEstimated,
          paidInCycle,
          remainingDue,
          progressPercent,
          colorClass: cardColorToGradient(card.color),
          source: cycle.source,
          cutoffDate,
          dueDate,
          nextCutoffDate,
          cutoffDeltaLabel: cutoffDelta ? cutoffDelta.label : 'Not set',
          dueDeltaLabel: dueDelta ? dueDelta.label : 'Not set',
          nextCutoffDeltaLabel: nextCutoffDelta ? nextCutoffDelta.label : 'Not set',
          isPaid,
          isOverdue,
          daysOverdue,
          isDueSoon,
          daysUntilDue,
          isWaitingForCutoff,
        };
      })
      .sort((a, b) => {
        if (a.isWaitingForCutoff && b.isWaitingForCutoff) {
          return (a.nextCutoffDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.nextCutoffDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
        }
        if (a.isWaitingForCutoff) return 1;
        if (b.isWaitingForCutoff) return -1;

        if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue;
        if (a.isOverdue) return -1;
        if (b.isOverdue) return 1;

        if (a.isDueSoon && b.isDueSoon) return (a.daysUntilDue ?? 999) - (b.daysUntilDue ?? 999);
        if (a.isDueSoon) return -1;
        if (b.isDueSoon) return 1;

        return b.remainingDue - a.remainingDue;
      });
  }, [creditCards, transactions, getAppDate]);

  const totalCreditDueThisCycle = useMemo(
    () => creditDueByCard.reduce((sum, item) => sum + item.remainingDue, 0),
    [creditDueByCard]
  );

  const netAvailable = totalDebitAvailable - totalCreditDueThisCycle;

  if (loading) {
    return (
      <LoadingScreen
        title={userName ? `Welcome, ${userName}` : 'Dashboard'}
        message="Loading your financial overview..."
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="dashboard-header mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">
            {userName ? `Welcome, ${userName}` : 'Welcome'}
          </h1>
          <p className="text-[#64748B]">Here's your financial overview for {getPeriodLabel(period).toLowerCase()}</p>
        </div>
        <div className="dashboard-header-badges">
          <span className="dashboard-badge">{getPeriodLabel(period)}</span>
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#2DD4BF] text-white shadow-sm'
              : 'bg-white text-[#64748B] border border-gray-200'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('net')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === 'net'
              ? 'bg-[#2DD4BF] text-white shadow-sm'
              : 'bg-white text-[#64748B] border border-gray-200'
          }`}
        >
          Net Available
        </button>
      </div>

      {activeTab === 'overview' && (
        <DashboardOverview
          totalDebitAvailable={totalDebitAvailable}
          period={period}
          periodLabel={getPeriodLabel(period)}
          onPeriodChange={(nextPeriod) => setPeriod(nextPeriod as Period)}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomStartDateChange={setCustomStartDate}
          onCustomEndDateChange={setCustomEndDate}
          balance={balance}
          income={income}
          expenses={expenses}
          chartData={chartData}
          spendingByCategory={spendingByCategory}
          topCategoryAmount={topCategoryAmount}
          totalCreditUsed={totalCreditUsed}
          totalCreditLimit={totalCreditLimit}
          creditUsagePercent={creditUsagePercent}
          creditCards={creditCards}
          cardColorToGradient={cardColorToGradient}
          recentUi={recentUi}
        />
      )}

      {activeTab === 'net' && (
        <DashboardNetAvailable
          netAvailable={netAvailable}
          totalDebitAvailable={totalDebitAvailable}
          totalCreditDueThisCycle={totalCreditDueThisCycle}
          creditDueByCard={creditDueByCard}
        />
      )}
    </div>
  );
}
