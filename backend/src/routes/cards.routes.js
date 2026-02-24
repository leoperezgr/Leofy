// backend/src/routers/cardsRouter.ts (o donde lo tengas)
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const cardsRouter = Router();
cardsRouter.use(requireAuth);

const idSchema = z.object({
  cardId: z.string().regex(/^\d+$/),
});

const colorEnum = z.enum([
  "RED",
  "ORANGE",
  "BLUE",
  "GOLD",
  "BLACK",
  "PLATINUM",
  "SILVER",
  "PURPLE",
  "GREEN",
  "OTHER",
]);

const createSchema = z.object({
  name: z.string().min(1),
  last4: z.string().regex(/^\d{4}$/).optional().nullable(),
  brand: z.enum(["VISA", "MASTERCARD", "AMEX", "OTHER"]).optional(),
  credit_limit: z.number().positive().optional().nullable(),
  closing_day: z.number().int().min(1).max(31).optional().nullable(),
  due_day: z.number().int().min(1).max(31).optional().nullable(),
  color: colorEnum.optional(),
});

const updateSchema = createSchema.partial().refine((obj) => Object.keys(obj).length > 0, {
  message: "Provide at least one field to update",
});

cardsRouter.get("/", async (req, res) => {
  const cards = await prisma.creditCard.findMany({
    where: { user_id: BigInt(req.user.id) },
    orderBy: { created_at: "desc" },
  });
  res.json(cards);
});

cardsRouter.get("/:cardId", async (req, res) => {
  const parsedId = idSchema.safeParse(req.params);
  if (!parsedId.success) return res.status(400).json({ error: "Invalid cardId" });

  const cardId = BigInt(parsedId.data.cardId);

  const card = await prisma.creditCard.findFirst({
    where: { id: cardId, user_id: BigInt(req.user.id) },
  });

  if (!card) return res.status(404).json({ error: "Card not found" });
  res.json(card);
});

cardsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const card = await prisma.creditCard.create({
    data: { user_id: BigInt(req.user.id), ...parsed.data },
  });

  res.status(201).json(card);
});

cardsRouter.put("/:cardId", async (req, res) => {
  const parsedId = idSchema.safeParse(req.params);
  if (!parsedId.success) return res.status(400).json({ error: "Invalid cardId" });

  const parsedBody = updateSchema.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: parsedBody.error });

  const cardId = BigInt(parsedId.data.cardId);
  const userId = BigInt(req.user.id);

  const existing = await prisma.creditCard.findFirst({
    where: { id: cardId, user_id: userId },
    select: { id: true },
  });

  if (!existing) return res.status(404).json({ error: "Card not found" });

  const updated = await prisma.creditCard.update({
    where: { id: cardId },
    data: parsedBody.data,
  });

  res.json(updated);
});

cardsRouter.delete("/:cardId", async (req, res) => {
  const parsedId = idSchema.safeParse(req.params);
  if (!parsedId.success) return res.status(400).json({ error: "Invalid cardId" });

  const cardId = BigInt(parsedId.data.cardId);
  const userId = BigInt(req.user.id);

  const existing = await prisma.creditCard.findFirst({
    where: { id: cardId, user_id: userId },
    select: { id: true },
  });

  if (!existing) return res.status(404).json({ error: "Card not found" });

  await prisma.creditCard.delete({ where: { id: cardId } });

  // Si tu frontend intenta res.json(), mejor responder JSON:
  res.json({ ok: true });
});