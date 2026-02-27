import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get("/", async (req, res) => {
  const userId = BigInt(req.user.id);

  const items = await prisma.categories.findMany({
    where: { user_id: userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  res.json(items);
});
