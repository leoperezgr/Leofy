import { formatMoney } from '../utils/formatMoney';

export type CreditCardTabItem = {
  cardId: string;
  name: string;
  colorClass: string;
  lastStatementRemaining: number;
  currentCycleAmount: number;
  cycleProgressPercent: number;
  cycleDayElapsed: number;
  cycleDayTotal: number;
  cycleLabel: string;
  totalCardBalance: number;
};

type DashboardSafeToSpendProps = {
  safeToSpend: number;
  netAvailable: number;
  totalCurrentCycleAmount: number;
  cardItems: CreditCardTabItem[];
  onGoToNetAvailable: () => void;
};

export function DashboardSafeToSpend({
  safeToSpend,
  netAvailable,
  totalCurrentCycleAmount,
  cardItems,
  onGoToNetAvailable,
}: DashboardSafeToSpendProps) {
  const isNegative = safeToSpend < 0;

  const barPercent = netAvailable > 0
    ? Math.min(Math.max((safeToSpend / netAvailable) * 100, 0), 100)
    : 0;
  const barColor = barPercent > 40 ? '#2DD4BF' : barPercent > 20 ? '#FACC15' : '#EF4444';

  return (
    <div className="db-overview">
      {/* 3.1 Comparative cards */}
      <div className="db-safe-compare">
        <div className="db-safe-compare__card db-safe-compare__card--income">
          <span className="db-safe-compare__label">Net Available</span>
          <span className="db-safe-compare__amount">${formatMoney(netAvailable)}</span>
          <button
            type="button"
            onClick={onGoToNetAvailable}
            className="db-safe-compare__link"
          >
            See breakdown &rarr;
          </button>
        </div>
        <div className="db-safe-compare__card db-safe-compare__card--expense">
          <span className="db-safe-compare__label">Cycle Charges</span>
          <span className="db-safe-compare__amount db-safe-compare__amount--red">
            ${formatMoney(totalCurrentCycleAmount)}
          </span>
          {cardItems.length > 0 && (
            <span className="db-safe-compare__sub">{cardItems[0].cycleLabel}</span>
          )}
        </div>
      </div>

      {/* 3.2 Result line */}
      <div className="db-safe-result">
        <p className="db-safe-result__caption">You can safely spend</p>
        <p className={`db-safe-result__amount ${isNegative ? 'db-safe-result__amount--red' : ''}`}>
          {isNegative ? '-' : ''}${formatMoney(Math.abs(safeToSpend))}
        </p>
        <div className="db-safe-result__bar">
          <div
            className="db-safe-result__fill"
            style={{ width: `${barPercent}%`, background: barColor }}
          />
        </div>
        <p className="db-safe-result__pct">
          {netAvailable > 0 ? `${barPercent.toFixed(0)}% of available` : '\u2014'}
        </p>
      </div>

      {/* 3.3 Per-card cycle breakdown — all visible, no expand */}
      <div className="db-card">
        <div className="db-card__header">
          <h3 className="db-card__title">Credit Card Cycles</h3>
          <span className="db-safe-cycles__badge">
            {cardItems.length} card{cardItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        {cardItems.length === 0 ? (
          <div className="db-empty">No credit cards found.</div>
        ) : (
          <div className="db-cyclev2-list">
            {cardItems.map((card) => {
              const total = card.lastStatementRemaining + card.currentCycleAmount;
              const hasPastDue = card.lastStatementRemaining > 0;

              return (
                <div key={card.cardId} className="db-cyclev2">
                  {/* Line 1: name + total */}
                  <div className="db-cyclev2__row1">
                    <div className="db-cyclev2__name-wrap">
                      <div className={`db-due-card__dot bg-gradient-to-br ${card.colorClass}`} />
                      <span className="db-cyclev2__name">{card.name}</span>
                      <span className="db-cyclev2__dates">{card.cycleLabel}</span>
                    </div>
                    <span className="db-cyclev2__total">${formatMoney(total)}</span>
                  </div>

                  {/* Line 2: mini cards */}
                  <div className="db-cyclev2__minis">
                    <div className={`db-cyclev2__mini ${hasPastDue ? 'db-cyclev2__mini--warn' : 'db-cyclev2__mini--neutral'}`}>
                      <span className="db-cyclev2__mini-label">Past Cycle</span>
                      <span className="db-cyclev2__mini-amount">${formatMoney(card.lastStatementRemaining)}</span>
                    </div>
                    <div className="db-cyclev2__mini db-cyclev2__mini--teal">
                      <span className="db-cyclev2__mini-label">Current Cycle</span>
                      <span className="db-cyclev2__mini-amount">${formatMoney(card.currentCycleAmount)}</span>
                    </div>
                  </div>

                  {/* Line 3: cycle progress bar */}
                  <div className="db-cyclev2__progress">
                    <div className="db-cyclev2__progress-track">
                      <div
                        className="db-cyclev2__progress-fill"
                        style={{ width: `${card.cycleProgressPercent}%` }}
                      />
                    </div>
                    <span className="db-cyclev2__progress-text">
                      Day {Math.max(card.cycleDayElapsed, 0)} of {card.cycleDayTotal}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
