import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const cardsRouter = Router();
cardsRouter.use(requireAuth);

cardsRouter.get("/", async (req, res) => {
  const cards = await prisma.creditCard.findMany({
    where: { user_id: BigInt(req.user.id) },
    orderBy: { created_at: "desc" },
  });
  res.json(cards);
});

const createSchema = z.object({
  name: z.string().min(1),
  last4: z.string().regex(/^\d{4}$/).optional().nullable(),
  brand: z.enum(["VISA", "MASTERCARD", "AMEX", "OTHER"]).optional(),
  credit_limit: z.number().positive().optional().nullable(),
  closing_day: z.number().int().min(1).max(31).optional().nullable(),
  due_day: z.number().int().min(1).max(31).optional().nullable(),
});

cardsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const card = await prisma.creditCard.create({
    data: { user_id: BigInt(req.user.id), ...parsed.data },
  });

  res.status(201).json(card);
});