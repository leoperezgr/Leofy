import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { formatMoney } from '../utils/formatMoney';

type CreditDueCardItem = {
  cardId: string;
  name: string;
  cycleLabel: string;
  dueEstimated: number;
  paidInCycle: number;
  remainingDue: number;
  progressPercent: number;
  colorClass: string;
  source: 'cutoff' | 'fallback';
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

type DashboardNetAvailableProps = {
  netAvailable: number;
  totalDebitAvailable: number;
  totalCreditDueThisCycle: number;
  creditDueByCard: CreditDueCardItem[];
};

export function DashboardNetAvailable({
  netAvailable,
  totalDebitAvailable,
  totalCreditDueThisCycle,
  creditDueByCard,
}: DashboardNetAvailableProps) {
  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] p-6 text-white mb-6 shadow-lg">
        <div className="pointer-events-none absolute right-8 top-5 z-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-white/75 mb-2">Net Available</p>
            <h2 className="text-4xl lg:text-5xl font-bold">${formatMoney(netAvailable)}</h2>
            <p className="mt-2 text-sm text-white/75">Debit Available − Credit Due (This Cycle)</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            <Wallet className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#64748B] mb-2">Debit Available</p>
          <p className="text-3xl font-bold text-[#1F2933]">${formatMoney(totalDebitAvailable)}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#64748B] mb-2">Credit Due This Cycle</p>
          <p className="text-3xl font-bold text-[#1F2933]">${formatMoney(totalCreditDueThisCycle)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1F2933]">Credit Due by Card</h3>
            <p className="text-sm text-[#64748B]">Last closed cycle still within its payment window.</p>
          </div>
          <Link to="/cards" className="text-sm text-[#2DD4BF] hover:text-[#14B8A6]">
            View all
          </Link>
        </div>

        {creditDueByCard.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-[#64748B]">
            No credit cards found
          </div>
        ) : (
          <div className="space-y-4">
            {creditDueByCard.map((item) => {
              const isSettled = item.isWaitingForCutoff || item.remainingDue <= 0;

              return (
                <div
                  key={item.cardId}
                  className={`rounded-2xl border p-5 transition-colors ${
                    isSettled
                      ? 'border-gray-100 bg-gray-50/80 opacity-80'
                      : 'border-gray-100 bg-white'
                  }`}
                >
                  {item.isWaitingForCutoff && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-xs font-bold">i</span>
                      <span>Wait for the next statement closing date.</span>
                    </div>
                  )}
                  {item.isOverdue && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-xs font-bold">!</span>
                      <span>This card is unpaid. You are {item.daysOverdue} day{item.daysOverdue === 1 ? '' : 's'} overdue.</span>
                    </div>
                  )}
                  {!item.isOverdue && item.isDueSoon && item.daysUntilDue !== null && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold">!</span>
                      <span>Payment is due in {item.daysUntilDue} day{item.daysUntilDue === 1 ? '' : 's'}.</span>
                    </div>
                  )}

                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.colorClass}`}>
                        <span className="text-xs font-semibold text-white">••••</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[#1F2933]">{item.name}</p>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.isWaitingForCutoff
                                ? 'bg-sky-50 text-sky-700'
                                : item.isPaid
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : item.isOverdue
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {item.isWaitingForCutoff ? 'Waiting' : item.isPaid ? 'Paid' : 'Not paid'}
                          </span>
                        </div>
                        <p className="text-sm text-[#64748B]">{item.cycleLabel}</p>
                        <div className="mt-1 space-y-1 text-xs text-[#64748B]">
                          <p>Cutoff: {item.cutoffDate
                            ? `${item.cutoffDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${item.cutoffDeltaLabel})`
                            : item.cutoffDeltaLabel}</p>
                          <p>Due: {item.dueDate
                            ? `${item.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${item.dueDeltaLabel})`
                            : item.dueDeltaLabel}</p>
                          {item.isWaitingForCutoff && (
                            <p>Next cutoff: {item.nextCutoffDate
                              ? `${item.nextCutoffDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${item.nextCutoffDeltaLabel})`
                              : item.nextCutoffDeltaLabel}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
                        {item.source === 'fallback'
                          ? 'Fallback Estimate'
                          : item.isWaitingForCutoff
                            ? 'Waiting For Next Cutoff'
                            : 'Last Closed Cycle'}
                      </p>
                      <p className={`text-sm font-semibold ${isSettled ? 'text-slate-500' : 'text-[#1F2933]'}`}>
                        Remaining: ${formatMoney(item.remainingDue)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-[#64748B] mb-1">Due (estimated)</p>
                      <p className="text-base font-semibold text-[#1F2933]">${formatMoney(item.dueEstimated)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-[#64748B] mb-1">Paid in cycle</p>
                      <p className="text-base font-semibold text-[#1F2933]">${formatMoney(item.paidInCycle)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-[#64748B] mb-1">Remaining</p>
                      <p className={`text-base font-semibold ${isSettled ? 'text-slate-500' : 'text-[#1F2933]'}`}>
                        ${formatMoney(item.remainingDue)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-[#64748B]">Payment progress</span>
                      <span className={isSettled ? 'text-slate-500' : 'text-[#1F2933]'}>
                        {item.dueEstimated > 0 ? `${item.progressPercent.toFixed(0)}%` : '0%'}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isSettled ? 'bg-slate-300' : 'bg-[#2DD4BF]'
                        }`}
                        style={{ width: `${Math.min(Math.max(item.progressPercent, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
