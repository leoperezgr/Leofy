import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

const payloadSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string().trim().min(1),
      type: z.enum(["income", "expense", "INCOME", "EXPENSE"]),
    })
  ),
});

categoriesRouter.get("/", async (req, res) => {
  const userId = BigInt(req.user.id);

  const items = await prisma.categories.findMany({
    where: { user_id: userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  res.json(items);
});

categoriesRouter.put("/", async (req, res) => {
  const userId = BigInt(req.user.id);
  const parsed = payloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  const seen = new Set();
  const normalized = parsed.data.categories
    .map((item) => ({
      name: item.name.trim(),
      type: String(item.type).toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE",
    }))
    .filter((item) => {
      const key = `${item.type}:${item.name.toLowerCase()}`;
      if (!item.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  await prisma.$transaction([
    prisma.categories.deleteMany({
      where: { user_id: userId },
    }),
    ...(normalized.length > 0
      ? [
          prisma.categories.createMany({
            data: normalized.map((item) => ({
              user_id: userId,
              name: item.name,
              type: item.type,
            })),
          }),
        ]
      : []),
  ]);

  const items = await prisma.categories.findMany({
    where: { user_id: userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  res.json(items);
});
