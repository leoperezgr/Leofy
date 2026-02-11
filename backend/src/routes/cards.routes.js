import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const cardsRouter = Router();
cardsRouter.use(requireAuth);

cardsRouter.get("/", async (req, res) => {
  const cards = await prisma.creditCard.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(cards);
});

const createSchema = z.object({
  name: z.string().min(1),
  last4: z.string().regex(/^\d{4}$/),
  brand: z.string().optional(),
  limit: z.number().positive().optional(),
});

cardsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const card = await prisma.creditCard.create({
    data: { userId: req.user.id, ...parsed.data },
  });

  res.status(201).json(card);
});
