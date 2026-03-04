import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { formatMoney } from '../utils/formatMoney';
import { Link } from 'react-router';

export type CreditCardTabItem = {
  cardId: string;
  name: string;
  colorClass: string;
  lastStatementRemaining: number;
  currentCycleAmount: number;
  cycleProgressPercent: number;
  cycleLabel: string;
  totalCardBalance: number;
};

type DashboardSafeToSpendProps = {
  safeToSpend: number;
  netAvailable: number;
  totalCurrentCycleAmount: number;
  cardItems: CreditCardTabItem[];
};

export function DashboardSafeToSpend({
  safeToSpend,
  netAvailable,
  totalCurrentCycleAmount,
  cardItems,
}: DashboardSafeToSpendProps) {
  const isNegative = safeToSpend < 0;

  return (
    <>
      {/* Hero card */}
      <div
        className={`relative overflow-hidden rounded-2xl p-6 text-white mb-6 shadow-lg ${
          isNegative ? 'dashboard-hero-safe-negative' : 'dashboard-hero-safe'
        }`}
      >
        <div className="pointer-events-none absolute right-8 top-5 z-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-white/75 mb-2">Safe to Spend</p>
            <h2 className="text-4xl lg:text-5xl font-bold">
              {isNegative ? '-' : ''}${formatMoney(Math.abs(safeToSpend))}
            </h2>
            <p className="mt-2 text-sm text-white/75">
              Net Available minus current cycle spending
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            {isNegative ? (
              <AlertTriangle className="h-6 w-6" />
            ) : (
              <ShieldCheck className="h-6 w-6" />
            )}
          </div>
        </div>
        {isNegative && (
          <div className="relative z-10 mt-4 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>You've exceeded your safe spending limit</span>
          </div>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#64748B] mb-2">Net Available</p>
          <p className="text-3xl font-bold text-[#1F2933]">${formatMoney(netAvailable)}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#64748B] mb-2">Current Cycle Spending</p>
          <p className="text-3xl font-bold text-[#1F2933]">${formatMoney(totalCurrentCycleAmount)}</p>
        </div>
      </div>

      {/* Balance by Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#1F2933]">Balance by Card</h3>
          <Link to="/cards" className="text-sm font-medium text-[#2DD4BF] hover:text-[#14B8A6]">
            View all
          </Link>
        </div>

        {cardItems.length === 0 && (
          <p className="text-sm text-[#64748B] py-4 text-center">No credit cards found.</p>
        )}

        <div className="space-y-4">
          {cardItems.map((card) => (
            <div key={card.cardId} className="rounded-xl border border-gray-100 p-4">
              {/* Card header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-3 w-8 rounded-full bg-gradient-to-r ${card.colorClass}`}
                  />
                  <span className="text-sm font-semibold text-[#1F2933]">{card.name}</span>
                </div>
                <span className="text-sm font-bold text-[#1F2933]">
                  ${formatMoney(card.totalCardBalance)}
                </span>
              </div>

              {/* Per-card metrics */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-[#64748B] mb-0.5">Last Statement</p>
                  <p className="text-sm font-semibold text-[#EF4444]">
                    ${formatMoney(card.lastStatementRemaining)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] mb-0.5">Current Cycle</p>
                  <p className="text-sm font-semibold text-[#1F2933]">
                    ${formatMoney(card.currentCycleAmount)}
                  </p>
                </div>
              </div>

              {/* Cycle progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#64748B]">Cycle progress</span>
                  <span className="text-xs text-[#64748B]">{card.cycleLabel}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2DD4BF] transition-all"
                    style={{ width: `${card.cycleProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
