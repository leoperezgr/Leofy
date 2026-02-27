import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export const transfersRouter = Router();
transfersRouter.use(requireAuth);

const createTransferSchema = z.object({
  fromCardId: z.string().regex(/^\d+$/),
  toCardId: z.string().regex(/^\d+$/),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
});

transfersRouter.post("/", async (req, res) => {
  const parsed = createTransferSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const userId = BigInt(req.user.id);
  const fromCardId = BigInt(parsed.data.fromCardId);
  const toCardId = BigInt(parsed.data.toCardId);
  const amount = Number(parsed.data.amount);

  if (fromCardId === toCardId) {
    return res.status(400).json({ error: "fromCardId and toCardId must be different" });
  }

  const occurredAt = parsed.data.date ? new Date(parsed.data.date) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return res.status(400).json({ error: "Invalid date" });
  }

  const [fromCard, toCard] = await Promise.all([
    prisma.creditCard.findFirst({
      where: { id: fromCardId, user_id: userId },
      select: { id: true, name: true, credit_limit: true },
    }),
    prisma.creditCard.findFirst({
      where: { id: toCardId, user_id: userId },
      select: { id: true, name: true, credit_limit: true },
    }),
  ]);

  if (!fromCard) return res.status(404).json({ error: "Source card/account not found" });
  if (!toCard) return res.status(404).json({ error: "Destination card/account not found" });

  const fromLimit = Number(fromCard.credit_limit || 0);
  if (fromLimit > 0) {
    return res.status(400).json({ error: "Transfers can only originate from a debit account" });
  }

  const transferId = randomUUID();
  const description = (parsed.data.description || "Transfer").trim() || "Transfer";
  const toIsCredit = Number(toCard.credit_limit || 0) > 0;

  const [outgoing, incoming] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        user_id: userId,
        type: "EXPENSE",
        amount,
        description,
        occurred_at: occurredAt,
        card_id: fromCardId,
        category_id: null,
        transfer_id: transferId,
        metadata: {
          category_name: "Transfer",
          paymentMethod: "debit",
          payment_method: "debit",
          transferRole: "outgoing",
          fromCardId: String(fromCardId),
          toCardId: String(toCardId),
        },
      },
    }),
    prisma.transaction.create({
      data: {
        user_id: userId,
        type: "INCOME",
        amount,
        description,
        occurred_at: occurredAt,
        card_id: toCardId,
        category_id: null,
        transfer_id: transferId,
        metadata: {
          category_name: "Transfer",
          paymentMethod: toIsCredit ? "credit" : "debit",
          payment_method: toIsCredit ? "credit" : "debit",
          transferRole: "incoming",
          fromCardId: String(fromCardId),
          toCardId: String(toCardId),
        },
      },
    }),
  ]);

  return res.status(201).json({
    id: transferId,
    fromCardId: String(fromCardId),
    toCardId: String(toCardId),
    amount,
    date: occurredAt.toISOString(),
    description,
    outgoingTransactionId: outgoing.id,
    incomingTransactionId: incoming.id,
  });
});
