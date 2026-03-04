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

const paymentMethodSchema = z.enum(["cash", "debit", "credit"]);

const installmentsSchema = z.object({
  months: z.coerce.number().int().min(2).max(60),
  monthlyAmount: z.coerce.number().positive().optional(),
  startAt: z.string().datetime().optional(),
});

const metadataSchema = z
  .object({
    paymentMethod: paymentMethodSchema.optional(),
    installments: installmentsSchema.optional(),
  })
  .passthrough();

const createSchema = z.object({
  type: z.enum(["income", "expense", "INCOME", "EXPENSE"]),
  amount: z.coerce.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
  occurred_at: z.string().datetime().optional(),
  card_id: z.string().regex(/^\d+$/).optional().nullable(),
  category_id: z.string().regex(/^\d+$/).optional().nullable(),
  paymentMethod: paymentMethodSchema.optional(),
  metadata: metadataSchema.optional(),
});

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const isPlainObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);

function normalizeInstallments(installments, amount, occurredAt) {
  const months = Number(installments.months);
  const monthlyAmountRaw =
    installments.monthlyAmount !== undefined
      ? Number(installments.monthlyAmount)
      : Number((amount / months).toFixed(2));

  if (!Number.isFinite(monthlyAmountRaw) || monthlyAmountRaw <= 0) {
    throw new Error("Invalid installments.monthlyAmount");
  }

  const startAtSource = installments.startAt || occurredAt.toISOString();
  const startAtDate = new Date(startAtSource);
  if (Number.isNaN(startAtDate.getTime())) {
    throw new Error("Invalid installments.startAt");
  }

  return {
    months,
    monthlyAmount: Number(monthlyAmountRaw.toFixed(2)),
    startAt: startAtDate.toISOString(),
  };
}

function buildCreateMetadata(payload, amount, occurredAt) {
  const incomingMetadata = isPlainObject(payload.metadata) ? { ...payload.metadata } : {};
  const metadata = { ...incomingMetadata, category_name: payload.category };

  const paymentMethod = incomingMetadata.paymentMethod || payload.paymentMethod;
  if (paymentMethod) {
    metadata.paymentMethod = paymentMethod;
    metadata.payment_method = paymentMethod;
  }

  if (incomingMetadata.installments) {
    metadata.installments = normalizeInstallments(incomingMetadata.installments, amount, occurredAt);
  }

  return metadata;
}

function buildUpdateMetadata(existingMetadata, payload, amount, occurredAt) {
  const oldMetadata = isPlainObject(existingMetadata) ? existingMetadata : {};
  const hasIncomingMetadata = hasOwn(payload, "metadata");
  const incomingMetadata = isPlainObject(payload.metadata) ? payload.metadata : {};

  const merged = hasIncomingMetadata ? { ...oldMetadata, ...incomingMetadata } : { ...oldMetadata };
  merged.category_name = payload.category;

  const paymentMethod =
    incomingMetadata.paymentMethod ||
    payload.paymentMethod ||
    merged.paymentMethod ||
    merged.payment_method;
  if (paymentMethod) {
    merged.paymentMethod = paymentMethod;
    merged.payment_method = paymentMethod;
  }

  if (hasIncomingMetadata && hasOwn(incomingMetadata, "installments")) {
    merged.installments = normalizeInstallments(incomingMetadata.installments, amount, occurredAt);
  }

  return merged;
}

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

  const amount = Number(parsed.data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const occurredAtRaw = parsed.data.occurred_at || parsed.data.date;
  const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return res.status(400).json({ error: "Invalid occurred_at/date" });
  }

  let metadata;
  try {
    metadata = buildCreateMetadata(parsed.data, amount, occurredAt);
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Invalid metadata.installments" });
  }

  const t = await prisma.transaction.create({
    data: {
      user_id: BigInt(req.user.id),
      type: String(parsed.data.type).toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE",
      amount,
      description: parsed.data.description,
      occurred_at: occurredAt,
      card_id: parsed.data.card_id ? BigInt(parsed.data.card_id) : null,
      category_id: parsed.data.category_id ? BigInt(parsed.data.category_id) : null,
      metadata,
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

  const amount = Number(parsed.data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const occurredAtRaw = parsed.data.occurred_at || parsed.data.date;
  const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return res.status(400).json({ error: "Invalid occurred_at/date" });
  }

  const txId = BigInt(parsedId.data.transactionId);
  const existing = await prisma.transaction.findFirst({
    where: { id: txId, user_id: userId },
  });
  if (!existing) return res.status(404).json({ error: "Transaction not found" });

  let metadata;
  try {
    metadata = buildUpdateMetadata(existing.metadata, parsed.data, amount, occurredAt);
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Invalid metadata.installments" });
  }

  const updated = await prisma.transaction.update({
    where: { id: txId },
    data: {
      type: String(parsed.data.type).toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE",
      amount,
      description: parsed.data.description,
      occurred_at: occurredAt,
      card_id: parsed.data.card_id ? BigInt(parsed.data.card_id) : null,
      category_id: parsed.data.category_id ? BigInt(parsed.data.category_id) : null,
      metadata,
    },
  });

  return res.json(updated);
});

transactionsRouter.delete("/:transactionId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsedId = idSchema.safeParse(req.params);
  if (!parsedId.success) return res.status(400).json({ error: "Invalid transactionId" });

  const txId = BigInt(parsedId.data.transactionId);
  const existing = await prisma.transaction.findFirst({
    where: { id: txId, user_id: userId },
  });
  if (!existing) return res.status(404).json({ error: "Transaction not found" });

  await prisma.transaction.delete({
    where: { id: txId },
  });

  return res.status(204).send();
});
