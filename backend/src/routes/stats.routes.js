import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get("/summary", async (req, res) => {
  const tx = await prisma.transaction.findMany({
    where: { userId: req.user.id },
    select: { type: true, amount: true, category: true },
  });

  let income = 0, expense = 0;
  for (const t of tx) {
    const v = Number(t.amount);
    if (t.type === "income") income += v;
    else expense += v;
  }

  res.json({
    income,
    expense,
    balance: income - expense,
    count: tx.length,
  });
});

// GET /api/stats/dashboard?userId=2
statsRouter.get("/dashboard", async (req, res) => {
  const userId = BigInt(req.user.id);
  const now = new Date();
  const day = now.getDay(); // 0..6 (Sun..Sat)
  const mondayOffset = (day + 6) % 7; // Monday => 0
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const [incomeAgg, expenseAgg, recent, cards, txAll, weekExpenses] = await Promise.all([
    prisma.transaction.aggregate({
      where: { user_id: userId, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { user_id: userId, type: "EXPENSE" },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { user_id: userId },
      orderBy: { occurred_at: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        occurred_at: true,
        category_id: true,
        metadata: true,
      },
    }),
    prisma.creditCard.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        name: true,
        last4: true,
        brand: true,
        color: true,
        credit_limit: true,
      },
    }),
    prisma.transaction.findMany({
      where: { user_id: userId },
      select: { type: true, amount: true, card_id: true },
    }),
    prisma.transaction.findMany({
      where: {
        user_id: userId,
        type: "EXPENSE",
        occurred_at: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      select: { amount: true, occurred_at: true, card_id: true },
    }),
  ]);

  const income = Number(incomeAgg._sum.amount || 0);
  const expenses = Number(expenseAgg._sum.amount || 0);
  const balance = income - expenses;

  const creditCardIds = new Set(
    cards
      .filter((c) => Number(c.credit_limit || 0) > 0)
      .map((c) => c.id.toString())
  );

  const usedByCard = new Map();
  let debitAvailable = 0;
  let creditUsed = 0;

  for (const t of txAll) {
    const amount = Number(t.amount || 0);
    const cardId = t.card_id ? t.card_id.toString() : null;
    const isCreditCardTx = !!cardId && creditCardIds.has(cardId);

    if (t.type === "INCOME") {
      if (!isCreditCardTx) debitAvailable += amount;
      continue;
    }

    if (isCreditCardTx) {
      creditUsed += amount;
      usedByCard.set(cardId, (usedByCard.get(cardId) || 0) + amount);
    } else {
      debitAvailable -= amount;
    }
  }

  const weekDays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  const weeklySpending = weekDays.map((dayLabel) => ({ day: dayLabel, amount: 0 }));

  for (const t of weekExpenses) {
    const txDate = new Date(t.occurred_at);
    const idx = (txDate.getDay() + 6) % 7; // Monday=0 ... Sunday=6
    weeklySpending[idx].amount += Number(t.amount || 0);
  }

  const weeklyTotalExpenses = weeklySpending.reduce((sum, d) => sum + d.amount, 0);
  const netWorth = debitAvailable - creditUsed;

  const cardsWithUsage = cards.map((c) => ({
    ...c,
    used_amount: usedByCard.get(c.id.toString()) || 0,
  }));

  return res.json({
    income,
    expenses,
    balance,
    debit_available: debitAvailable,
    credit_used: creditUsed,
    net_worth: netWorth,
    weekly_spending: weeklySpending,
    weekly_total_expenses: weeklyTotalExpenses,
    recentTransactions: recent,
    cards: cardsWithUsage,
  });
});
