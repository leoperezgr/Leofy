import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

const getUserId = (req) => {
  const id = req?.user?.id;
  if (id === undefined || id === null) return null;
  return BigInt(id);
};

const idSchema = z.object({
  transactionId: z.string().regex(/^\d+$/),
});

const createSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string().datetime(),
  card_id: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  paymentMethod: z.enum(["cash", "debit", "credit"]).optional(),
});

transactionsRouter.get("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const items = await prisma.transaction.findMany({
    where: { user_id: userId },
    orderBy: { occurred_at: "desc" },
  });

  res.json(items);
});

transactionsRouter.get("/:transactionId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsedId = idSchema.safeParse(req.params);
  if (!parsedId.success) return res.status(400).json({ error: "Invalid transactionId" });

  const txId = BigInt(parsedId.data.transactionId);
  const item = await prisma.transaction.findFirst({
    where: { id: txId, user_id: userId },
  });

  if (!item) return res.status(404).json({ error: "Transaction not found" });
  return res.json(item);
});

transactionsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const t = await prisma.transaction.create({
    data: {
      user_id: BigInt(req.user.id),
      type: parsed.data.type === "income" ? "INCOME" : "EXPENSE",
      amount: parsed.data.amount,
      description: parsed.data.description,
      occurred_at: new Date(parsed.data.date),
      card_id: parsed.data.card_id ? BigInt(parsed.data.card_id) : null,
      category_id: parsed.data.category_id ? BigInt(parsed.data.category_id) : null,
      metadata: {
        category_name: parsed.data.category,
        ...(parsed.data.paymentMethod ? { payment_method: parsed.data.paymentMethod } : {}),
      },
    },
  });

  res.status(201).json(t);
});

transactionsRouter.put("/:transactionId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsedId = idSchema.safeParse(req.params);
  if (!parsedId.success) return res.status(400).json({ error: "Invalid transactionId" });

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const txId = BigInt(parsedId.data.transactionId);
  const existing = await prisma.transaction.findFirst({
    where: { id: txId, user_id: userId },
  });
  if (!existing) return res.status(404).json({ error: "Transaction not found" });

  const updated = await prisma.transaction.update({
    where: { id: txId },
    data: {
      type: parsed.data.type === "income" ? "INCOME" : "EXPENSE",
      amount: parsed.data.amount,
      description: parsed.data.description,
      occurred_at: new Date(parsed.data.date),
      card_id: parsed.data.card_id ? BigInt(parsed.data.card_id) : null,
      category_id: parsed.data.category_id ? BigInt(parsed.data.category_id) : null,
      metadata: {
        ...(existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
        category_name: parsed.data.category,
        ...(parsed.data.paymentMethod ? { payment_method: parsed.data.paymentMethod } : {}),
      },
    },
  });

  return res.json(updated);
});
