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
  const userId = BigInt(req.query.userId || 2);

  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { user_id: userId, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { user_id: userId, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  const income = Number(incomeAgg._sum.amount || 0);
  const expenses = Number(expenseAgg._sum.amount || 0);
  const balance = income - expenses;

  const recent = await prisma.transaction.findMany({
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
    },
  });

  const cards = await prisma.creditCard.findMany({
    where: { user_id: userId },
    select: {
      id: true,
      name: true,
      last4: true,
      credit_limit: true,
    },
  });

  return res.json({
    income,
    expenses,
    balance,
    recentTransactions: recent,
    cards,
  });
});
