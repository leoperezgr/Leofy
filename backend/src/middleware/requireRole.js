import { prisma } from "../prisma.js";

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user?.id) return res.status(401).json({ error: "Not authenticated" });

    const role = req.user.role;
    if (role && allowedRoles.includes(role)) return next();

    // Fallback a DB si el JWT no tiene role (tokens viejos)
    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user.id) },
      select: { role: true },
    });
    if (user && allowedRoles.includes(user.role)) {
      req.user.role = user.role;
      return next();
    }

    return res.status(403).json({ error: "Insufficient permissions" });
  };
}
