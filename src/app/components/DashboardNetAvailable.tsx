import { Link } from 'react-router-dom';
import { formatMoney } from '../utils/formatMoney';
import { type CreditDueCardItem } from '../utils/creditCycleCalculator';

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
    <div className="db-overview">
      {/* 2.1 Summary hero */}
      <div className="db-hero db-hero--slate">
        <div className="db-hero__shimmer" />
        <div className="db-hero__content">
          <p className="db-hero__label">Net Available</p>
          <h2 className="db-hero__amount">${formatMoney(netAvailable)}</h2>
        </div>
      </div>

      {/* 2.2 Debit + Credit totals */}
      <div className="db-net-totals">
        <div className="db-card db-net-totals__card">
          <span className="db-net-totals__label">Debit Available</span>
          <span className="db-net-totals__amount">${formatMoney(totalDebitAvailable)}</span>
        </div>
        <div className="db-card db-net-totals__card">
          <span className="db-net-totals__label">Credit Due This Cycle</span>
          <span className="db-net-totals__amount db-net-totals__amount--red">${formatMoney(totalCreditDueThisCycle)}</span>
        </div>
      </div>

      {/* 2.3 Credit cards due */}
      <div className="db-card">
        <div className="db-card__header">
          <div>
            <h3 className="db-card__title">Credit Due by Card</h3>
            <p className="db-card__subtitle">Last closed cycle within payment window</p>
          </div>
          <Link to="/cards" className="db-card__link">View all</Link>
        </div>

        {creditDueByCard.length === 0 ? (
          <div className="db-empty">No credit cards found</div>
        ) : (
          <div className="db-due-list">
            {creditDueByCard.map((item) => {
              const isSettled = item.isWaitingForCutoff || item.remainingDue <= 0;

              return (
                <div
                  key={item.cardId}
                  className={`db-due-card ${isSettled ? 'db-due-card--settled' : ''}`}
                >
                  {/* Status alerts */}
                  {item.isWaitingForCutoff && (
                    <div className="db-due-card__alert db-due-card__alert--info">
                      Waiting for next statement closing date
                    </div>
                  )}
                  {item.isOverdue && (
                    <div className="db-due-card__alert db-due-card__alert--danger">
                      Overdue by {item.daysOverdue} day{item.daysOverdue === 1 ? '' : 's'}
                    </div>
                  )}
                  {!item.isOverdue && item.isDueSoon && item.daysUntilDue !== null && (
                    <div className="db-due-card__alert db-due-card__alert--warn">
                      Due in {item.daysUntilDue} day{item.daysUntilDue === 1 ? '' : 's'}
                    </div>
                  )}

                  {/* Card header row */}
                  <div className="db-due-card__header">
                    <div className="db-due-card__name-row">
                      <div className={`db-due-card__dot bg-gradient-to-br ${item.colorClass}`} />
                      <span className="db-due-card__name">{item.name}</span>
                      <span className={`db-due-card__badge ${
                        item.isWaitingForCutoff ? 'db-due-card__badge--info'
                          : item.isPaid ? 'db-due-card__badge--ok'
                          : item.isOverdue ? 'db-due-card__badge--danger'
                          : 'db-due-card__badge--warn'
                      }`}>
                        {item.isWaitingForCutoff ? 'Waiting' : item.isPaid ? 'Paid' : 'Not paid'}
                      </span>
                    </div>
                    <span className={`db-due-card__remaining ${isSettled ? 'db-due-card__remaining--muted' : ''}`}>
                      ${formatMoney(item.remainingDue)}
                    </span>
                  </div>

                  {/* Cycle + dates */}
                  <div className="db-due-card__meta">
                    <span>{item.cycleLabel}</span>
                    <span>
                      Cutoff: {item.cutoffDate
                        ? `${item.cutoffDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${item.cutoffDeltaLabel})`
                        : item.cutoffDeltaLabel}
                    </span>
                    <span>
                      Due: {item.dueDate
                        ? `${item.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${item.dueDeltaLabel})`
                        : item.dueDeltaLabel}
                    </span>
                    {item.isWaitingForCutoff && (
                      <span>
                        Next cutoff: {item.nextCutoffDate
                          ? `${item.nextCutoffDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${item.nextCutoffDeltaLabel})`
                          : item.nextCutoffDeltaLabel}
                      </span>
                    )}
                  </div>

                  {/* Amounts row */}
                  <div className="db-due-card__amounts">
                    <div className="db-due-card__amount-item">
                      <span className="db-due-card__amount-label">Due (est.)</span>
                      <span className="db-due-card__amount-value">${formatMoney(item.dueEstimated)}</span>
                    </div>
                    <div className="db-due-card__amount-item">
                      <span className="db-due-card__amount-label">Paid</span>
                      <span className="db-due-card__amount-value">${formatMoney(item.paidInCycle)}</span>
                    </div>
                    <div className="db-due-card__amount-item">
                      <span className="db-due-card__amount-label">Remaining</span>
                      <span className={`db-due-card__amount-value ${isSettled ? '' : 'db-due-card__amount-value--bold'}`}>
                        ${formatMoney(item.remainingDue)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="db-due-card__progress">
                    <div className="db-due-card__progress-labels">
                      <span>Payment progress</span>
                      <span>{item.dueEstimated > 0 ? `${item.progressPercent.toFixed(0)}%` : '0%'}</span>
                    </div>
                    <div className="db-due-card__progress-track">
                      <div
                        className={`db-due-card__progress-fill ${isSettled ? 'db-due-card__progress-fill--muted' : ''}`}
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
    </div>
  );
}
