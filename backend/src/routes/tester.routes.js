import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const testerRouter = Router();
testerRouter.use(requireAuth);
testerRouter.use(requireRole("TESTER", "ADMIN"));

// Helper: clamp day to valid range for month
function safeDayInMonth(year, month, day) {
  const maxDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(1, day), maxDay));
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getNextMonthlyDate(dayOfMonth, ref) {
  const d = Math.max(1, Math.trunc(dayOfMonth || 1));
  const thisMonth = safeDayInMonth(ref.getFullYear(), ref.getMonth(), d);
  if (startOfDay(thisMonth).getTime() >= startOfDay(ref).getTime()) return thisMonth;
  return safeDayInMonth(ref.getFullYear(), ref.getMonth() + 1, d);
}

// POST /api/tester/test-cycle
// Body: { closingDay: number, dueDay: number, simulatedDate: string (ISO) }
testerRouter.post("/test-cycle", (req, res) => {
  const { closingDay, dueDay, simulatedDate } = req.body;
  if (!closingDay || !simulatedDate) {
    return res.status(400).json({ error: "closingDay and simulatedDate are required" });
  }

  const refDate = new Date(simulatedDate);
  if (Number.isNaN(refDate.getTime())) {
    return res.status(400).json({ error: "Invalid simulatedDate" });
  }

  const cutoffDay = Math.max(1, Math.trunc(closingDay));
  const cutoffActual = getNextMonthlyDate(cutoffDay, refDate);

  const prevMonth = new Date(cutoffActual);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const previousCutoff = safeDayInMonth(prevMonth.getFullYear(), prevMonth.getMonth(), cutoffDay);

  const cycleStart = new Date(previousCutoff);
  cycleStart.setDate(cycleStart.getDate() + 1);

  const cycleEnd = cutoffActual;

  let dueDate = null;
  if (dueDay) {
    const dueDayNum = Math.max(1, Math.trunc(dueDay));
    dueDate = safeDayInMonth(cutoffActual.getFullYear(), cutoffActual.getMonth(), dueDayNum);
    if (startOfDay(dueDate).getTime() <= startOfDay(cutoffActual).getTime()) {
      dueDate = safeDayInMonth(cutoffActual.getFullYear(), cutoffActual.getMonth() + 1, dueDayNum);
    }
  }

  return res.json({
    simulatedDate: refDate.toISOString(),
    cycleStart: cycleStart.toISOString(),
    cycleEnd: cycleEnd.toISOString(),
    dueDate: dueDate ? dueDate.toISOString() : null,
    closingDay: cutoffDay,
    dueDay: dueDay ? Math.max(1, Math.trunc(dueDay)) : null,
  });
});

// POST /api/tester/test-stats-range
// Body: { period: string, simulatedDate: string (ISO) }
testerRouter.post("/test-stats-range", (req, res) => {
  const { period, simulatedDate } = req.body;
  if (!period || !simulatedDate) {
    return res.status(400).json({ error: "period and simulatedDate are required" });
  }

  const today = new Date(simulatedDate);
  if (Number.isNaN(today.getTime())) {
    return res.status(400).json({ error: "Invalid simulatedDate" });
  }

  let start, end;

  switch (period) {
    case "week": {
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      break;
    }
    case "month": {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    }
    case "30days": {
      end = new Date(today);
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      break;
    }
    case "year": {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
      break;
    }
    default:
      return res.status(400).json({ error: "Invalid period. Use: week, month, 30days, year" });
  }

  return res.json({
    period,
    simulatedDate: today.toISOString(),
    dateRange: { start: start.toISOString(), end: end.toISOString() },
  });
});
