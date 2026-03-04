import { useState } from 'react';
import { Calendar, FlaskConical, BarChart3, CreditCard, Play } from 'lucide-react';
import { useAppDate } from '../contexts/AppDateContext';
import '../../styles/components/TesterPanel.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

type CycleResult = {
  simulatedDate: string;
  cycleStart: string;
  cycleEnd: string;
  dueDate: string | null;
  closingDay: number;
  dueDay: number | null;
};

type StatsResult = {
  period: string;
  simulatedDate: string;
  dateRange: { start: string; end: string };
};

export function TesterPanel() {
  const { dateOverride, setDateOverride, isOverrideActive, getAppDate } = useAppDate();

  // Global Date Override
  const [overrideEnabled, setOverrideEnabled] = useState(isOverrideActive);
  const [overrideDateStr, setOverrideDateStr] = useState(() =>
    dateOverride ? toInputDate(dateOverride) : toInputDate(new Date())
  );

  // Cycle tester
  const [cycleClosingDay, setCycleClosingDay] = useState(15);
  const [cycleDueDay, setCycleDueDay] = useState(5);
  const [cycleSimDate, setCycleSimDate] = useState(() => toInputDate(getAppDate()));
  const [cycleResult, setCycleResult] = useState<CycleResult | null>(null);
  const [cycleLoading, setCycleLoading] = useState(false);

  // Stats tester
  const [statsPeriod, setStatsPeriod] = useState('month');
  const [statsSimDate, setStatsSimDate] = useState(() => toInputDate(getAppDate()));
  const [statsResult, setStatsResult] = useState<StatsResult | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  function handleToggleOverride(checked: boolean) {
    setOverrideEnabled(checked);
    if (checked) {
      const d = new Date(overrideDateStr + 'T12:00:00');
      if (Number.isFinite(d.getTime())) setDateOverride(d);
    } else {
      setDateOverride(null);
    }
  }

  function handleDateChange(value: string) {
    setOverrideDateStr(value);
    if (overrideEnabled) {
      const d = new Date(value + 'T12:00:00');
      if (Number.isFinite(d.getTime())) setDateOverride(d);
    }
  }

  async function runCycleTest() {
    setCycleLoading(true);
    try {
      const token = localStorage.getItem('leofy_token');
      const res = await fetch(`${API_BASE}/api/tester/test-cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          closingDay: cycleClosingDay,
          dueDay: cycleDueDay,
          simulatedDate: new Date(cycleSimDate + 'T12:00:00').toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCycleResult(data);
    } catch (err) {
      console.error('Cycle test error:', err);
      setCycleResult(null);
    } finally {
      setCycleLoading(false);
    }
  }

  async function runStatsTest() {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem('leofy_token');
      const res = await fetch(`${API_BASE}/api/tester/test-stats-range`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          period: statsPeriod,
          simulatedDate: new Date(statsSimDate + 'T12:00:00').toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setStatsResult(data);
    } catch (err) {
      console.error('Stats test error:', err);
      setStatsResult(null);
    } finally {
      setStatsLoading(false);
    }
  }

  return (
    <div className="tester-page">
      <div className="tester-header">
        <h1 className="tester-title">Tester Panel</h1>
        <p className="tester-subtitle">Test app functions with custom parameters</p>
      </div>

      {/* Section A: Global Date Override */}
      <div className="tester-card">
        <h2 className="tester-card-title">
          <Calendar className="tester-card-icon" />
          Global Date Override
        </h2>

        <div className="tester-toggle-row">
          <label className="tester-toggle">
            <input
              type="checkbox"
              checked={overrideEnabled}
              onChange={(e) => handleToggleOverride(e.target.checked)}
            />
            <span className="tester-toggle-slider" />
          </label>
          <span className="tester-toggle-label">Override app date</span>
        </div>

        {overrideEnabled && (
          <div className="tester-form-group">
            <label className="tester-form-label">Simulated Date</label>
            <input
              type="date"
              className="tester-date-input"
              value={overrideDateStr}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>
        )}

        <div>
          {isOverrideActive ? (
            <span className="tester-active-badge">
              Active: {getAppDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          ) : (
            <span className="tester-inactive-badge">Using real time</span>
          )}
        </div>
      </div>

      {/* Section B: Billing Cycle Calculator */}
      <div className="tester-card">
        <h2 className="tester-card-title">
          <CreditCard className="tester-card-icon" />
          Billing Cycle Calculator
        </h2>

        <div className="tester-form-row">
          <div className="tester-form-group">
            <label className="tester-form-label">Closing Day</label>
            <input
              type="number"
              className="tester-number-input"
              min={1}
              max={31}
              value={cycleClosingDay}
              onChange={(e) => setCycleClosingDay(Number(e.target.value))}
            />
          </div>
          <div className="tester-form-group">
            <label className="tester-form-label">Due Day</label>
            <input
              type="number"
              className="tester-number-input"
              min={1}
              max={31}
              value={cycleDueDay}
              onChange={(e) => setCycleDueDay(Number(e.target.value))}
            />
          </div>
          <div className="tester-form-group">
            <label className="tester-form-label">Simulated Date</label>
            <input
              type="date"
              className="tester-date-input"
              value={cycleSimDate}
              onChange={(e) => setCycleSimDate(e.target.value)}
            />
          </div>
          <div className="tester-form-group">
            <button className="tester-run-btn" onClick={runCycleTest} disabled={cycleLoading}>
              <Play style={{ width: 14, height: 14 }} />
              {cycleLoading ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>

        {cycleResult && (
          <div className="tester-result">
            <div className="tester-result-title">Result</div>
            <div className="tester-result-row">
              <span className="tester-result-label">Simulated Date</span>
              <span className="tester-result-value">{formatDate(cycleResult.simulatedDate)}</span>
            </div>
            <div className="tester-result-row">
              <span className="tester-result-label">Cycle Start</span>
              <span className="tester-result-value">{formatDate(cycleResult.cycleStart)}</span>
            </div>
            <div className="tester-result-row">
              <span className="tester-result-label">Cycle End (Cutoff)</span>
              <span className="tester-result-value">{formatDate(cycleResult.cycleEnd)}</span>
            </div>
            <div className="tester-result-row">
              <span className="tester-result-label">Due Date</span>
              <span className="tester-result-value">
                {cycleResult.dueDate ? formatDate(cycleResult.dueDate) : 'N/A'}
              </span>
            </div>
            <div className="tester-result-row">
              <span className="tester-result-label">Closing Day</span>
              <span className="tester-result-value">{cycleResult.closingDay}</span>
            </div>
            <div className="tester-result-row">
              <span className="tester-result-label">Due Day</span>
              <span className="tester-result-value">{cycleResult.dueDay ?? 'N/A'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Section C: Stats Date Range */}
      <div className="tester-card">
        <h2 className="tester-card-title">
          <BarChart3 className="tester-card-icon" />
          Statistics Date Range
        </h2>

        <div className="tester-form-row">
          <div className="tester-form-group">
            <label className="tester-form-label">Period</label>
            <select
              className="tester-select"
              value={statsPeriod}
              onChange={(e) => setStatsPeriod(e.target.value)}
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="30days">Last 30 Days</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div className="tester-form-group">
            <label className="tester-form-label">Simulated Date</label>
            <input
              type="date"
              className="tester-date-input"
              value={statsSimDate}
              onChange={(e) => setStatsSimDate(e.target.value)}
            />
          </div>
          <div className="tester-form-group">
            <button className="tester-run-btn" onClick={runStatsTest} disabled={statsLoading}>
              <Play style={{ width: 14, height: 14 }} />
              {statsLoading ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>

        {statsResult && (
          <div className="tester-result">
            <div className="tester-result-title">Result</div>
            <div className="tester-result-row">
              <span className="tester-result-label">Period</span>
              <span className="tester-result-value">{statsResult.period}</span>
            </div>
            <div className="tester-result-row">
              <span className="tester-result-label">Simulated Date</span>
              <span className="tester-result-value">{formatDate(statsResult.simulatedDate)}</span>
            </div>
            <div className="tester-result-row">
              <span className="tester-result-label">Range Start</span>
              <span className="tester-result-value">{formatDate(statsResult.dateRange.start)}</span>
            </div>
            <div className="tester-result-row">
              <span className="tester-result-label">Range End</span>
              <span className="tester-result-value">{formatDate(statsResult.dateRange.end)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
