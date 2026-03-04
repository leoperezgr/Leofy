import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export const transfersRouter = Router();
transfersRouter.use(requireAuth);

const getUserId = (req) => {
  const id = req?.user?.id;
  if (id === undefined || id === null) return null;
  return BigInt(id);
};

const createTransferSchema = z.object({
  fromCardId: z.string().regex(/^\d+$/),
  toCardId: z.string().regex(/^\d+$/),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
});

const transferIdSchema = z.object({
  transferId: z.string().uuid(),
});

const buildTransferMetadata = (existingMetadata, role, fromCardId, toCardId, paymentMethod) => {
  const oldMetadata =
    existingMetadata && typeof existingMetadata === "object" && !Array.isArray(existingMetadata)
      ? existingMetadata
      : {};

  return {
    ...oldMetadata,
    category_name: "Transfer",
    paymentMethod,
    payment_method: paymentMethod,
    transferRole: role,
    fromCardId: String(fromCardId),
    toCardId: String(toCardId),
  };
};

const buildTransferResponse = ({ transferId, outgoing, incoming, fromCard, toCard }) => ({
  id: transferId,
  transferId,
  amount: Number(outgoing.amount ?? incoming.amount ?? 0),
  description: String(outgoing.description ?? incoming.description ?? "Transfer"),
  date: (outgoing.occurred_at ?? incoming.occurred_at ?? new Date()).toISOString(),
  fromCardId: String(fromCard.id),
  toCardId: String(toCard.id),
  fromCardIsCredit: Number(fromCard.credit_limit || 0) > 0,
  toCardIsCredit: Number(toCard.credit_limit || 0) > 0,
  outgoingTransactionId: String(outgoing.id),
  incomingTransactionId: String(incoming.id),
});

async function loadTransferBundle(userId, transferId) {
  const rows = await prisma.transaction.findMany({
    where: {
      user_id: userId,
      transfer_id: transferId,
    },
    orderBy: { created_at: "asc" },
  });

  if (rows.length === 0) {
    return { status: "missing" };
  }

  const outgoing =
    rows.find((row) => String(row?.metadata?.transferRole || "").toLowerCase() === "outgoing") ||
    rows.find((row) => String(row?.type || "").toUpperCase() === "EXPENSE") ||
    null;
  const incoming =
    rows.find((row) => String(row?.metadata?.transferRole || "").toLowerCase() === "incoming") ||
    rows.find((row) => String(row?.type || "").toUpperCase() === "INCOME") ||
    null;

  if (!outgoing || !incoming || rows.length !== 2) {
    return { status: "invalid", rows };
  }

  const fromCardIdRaw =
    outgoing?.metadata?.fromCardId ??
    outgoing?.card_id ??
    incoming?.metadata?.fromCardId ??
    null;
  const toCardIdRaw =
    incoming?.metadata?.toCardId ??
    incoming?.card_id ??
    outgoing?.metadata?.toCardId ??
    null;

  if (!fromCardIdRaw || !toCardIdRaw) {
    return { status: "invalid", rows };
  }

  const fromCardId = BigInt(String(fromCardIdRaw));
  const toCardId = BigInt(String(toCardIdRaw));
  const cards = await prisma.creditCard.findMany({
    where: {
      user_id: userId,
      id: { in: [fromCardId, toCardId] },
    },
    select: { id: true, name: true, credit_limit: true },
  });

  const fromCard = cards.find((card) => card.id === fromCardId) || null;
  const toCard = cards.find((card) => card.id === toCardId) || null;

  if (!fromCard || !toCard) {
    return { status: "invalid", rows };
  }

  return {
    status: "ok",
    outgoing,
    incoming,
    fromCard,
    toCard,
  };
}

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
    transferId,
    fromCardId: String(fromCardId),
    toCardId: String(toCardId),
    amount,
    date: occurredAt.toISOString(),
    description,
    outgoingTransactionId: String(outgoing.id),
    incomingTransactionId: String(incoming.id),
  });
});

transfersRouter.get("/:transferId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsedId = transferIdSchema.safeParse(req.params);
  if (!parsedId.success) return res.status(400).json({ error: "Invalid transferId" });

  const bundle = await loadTransferBundle(userId, parsedId.data.transferId);
  if (bundle.status === "missing") {
    return res.status(404).json({ error: "Transfer not found" });
  }
  if (bundle.status !== "ok") {
    return res.status(409).json({ error: "Transfer is incomplete or inconsistent" });
  }

  return res.json(
    buildTransferResponse({
      transferId: parsedId.data.transferId,
      outgoing: bundle.outgoing,
      incoming: bundle.incoming,
      fromCard: bundle.fromCard,
      toCard: bundle.toCard,
    })
  );
});

transfersRouter.put("/:transferId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsedId = transferIdSchema.safeParse(req.params);
  if (!parsedId.success) return res.status(400).json({ error: "Invalid transferId" });

  const parsed = createTransferSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

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

  const bundle = await loadTransferBundle(userId, parsedId.data.transferId);
  if (bundle.status === "missing") {
    return res.status(404).json({ error: "Transfer not found" });
  }
  if (bundle.status !== "ok") {
    return res.status(409).json({ error: "Transfer is incomplete or inconsistent" });
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

  if (Number(fromCard.credit_limit || 0) > 0) {
    return res.status(400).json({ error: "Transfers can only originate from a debit account" });
  }

  const description = (parsed.data.description || "Transfer").trim() || "Transfer";
  const toIsCredit = Number(toCard.credit_limit || 0) > 0;

  const [outgoing, incoming] = await prisma.$transaction([
    prisma.transaction.update({
      where: { id: bundle.outgoing.id },
      data: {
        type: "EXPENSE",
        amount,
        description,
        occurred_at: occurredAt,
        card_id: fromCardId,
        metadata: buildTransferMetadata(bundle.outgoing.metadata, "outgoing", fromCardId, toCardId, "debit"),
      },
    }),
    prisma.transaction.update({
      where: { id: bundle.incoming.id },
      data: {
        type: "INCOME",
        amount,
        description,
        occurred_at: occurredAt,
        card_id: toCardId,
        metadata: buildTransferMetadata(
          bundle.incoming.metadata,
          "incoming",
          fromCardId,
          toCardId,
          toIsCredit ? "credit" : "debit"
        ),
      },
    }),
  ]);

  return res.json(
    buildTransferResponse({
      transferId: parsedId.data.transferId,
      outgoing,
      incoming,
      fromCard,
      toCard,
    })
  );
});

transfersRouter.delete("/:transferId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsedId = transferIdSchema.safeParse(req.params);
  if (!parsedId.success) return res.status(400).json({ error: "Invalid transferId" });

  const bundle = await loadTransferBundle(userId, parsedId.data.transferId);
  if (bundle.status === "missing") {
    return res.status(404).json({ error: "Transfer not found" });
  }
  if (bundle.status !== "ok") {
    return res.status(409).json({ error: "Transfer is incomplete or inconsistent" });
  }

  await prisma.$transaction([
    prisma.transaction.delete({ where: { id: bundle.outgoing.id } }),
    prisma.transaction.delete({ where: { id: bundle.incoming.id } }),
  ]);

  return res.status(204).send();
});
