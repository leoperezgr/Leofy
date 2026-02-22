import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Tu JWT usa userId (NO sub)
    const userId = payload.userId || payload.sub;
    if (!userId) return res.status(401).json({ error: "Invalid token payload" });

    req.user = {
      id: userId,              // string
      email: payload.email,    // opcional
    };

    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}