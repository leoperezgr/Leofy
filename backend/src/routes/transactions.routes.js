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

transactionsRouter.get("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const items = await prisma.transaction.findMany({
    where: { user_id: userId },
    orderBy: { occurred_at: "desc" },
  });

  res.json(items);
});

const createSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string().datetime(), // ISO
  card_id: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
});

transactionsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const t = await prisma.transaction.create({
    data: {
      user_id: BigInt(req.user.id), // ✅ user_id
      type: parsed.data.type === "income" ? "INCOME" : "EXPENSE", // ✅ enum DB
      amount: parsed.data.amount,
      description: parsed.data.description,
      occurred_at: new Date(parsed.data.date), // ✅ occurred_at

      // Opcionales si ya los quieres usar
      card_id: parsed.data.card_id ? BigInt(parsed.data.card_id) : null,
      category_id: parsed.data.category_id ? BigInt(parsed.data.category_id) : null,

      // Si quieres guardar el nombre de categoría “string” sin tabla,
      // úsalo en metadata:
      metadata: { category_name: parsed.data.category },
    },
  });

  res.status(201).json(t);
});