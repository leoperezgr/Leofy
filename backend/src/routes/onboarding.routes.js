import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const onboardingRouter = Router();

const onboardingSchema = z.object({
  name: z.string().min(1).optional(),
});

onboardingRouter.post("/complete", requireAuth, async (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { onboarded: true, ...(parsed.data.name ? { name: parsed.data.name } : {}) },
    select: { id: true, email: true, name: true, onboarded: true },
  });

  res.json({ user });
});
