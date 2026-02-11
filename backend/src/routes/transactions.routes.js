import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

transactionsRouter.get("/", async (req, res) => {
  const items = await prisma.transaction.findMany({
    where: { userId: req.user.id },
    orderBy: { date: "desc" },
  });
  res.json(items);
});

const createSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string().datetime(), // ISO
});

transactionsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const t = await prisma.transaction.create({
    data: {
      userId: req.user.id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description,
      date: new Date(parsed.data.date),
    },
  });

  res.status(201).json(t);
});
