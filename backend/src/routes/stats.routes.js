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
