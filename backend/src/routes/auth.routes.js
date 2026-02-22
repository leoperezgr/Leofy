import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
export const authRouter = Router();

authRouter.put("/me", requireAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const userId = BigInt(req.user.id);
    const { full_name, email } = req.body;

    if (full_name === undefined && email === undefined) {
      return res.status(400).json({ error: "Nada que actualizar" });
    }

    if (full_name !== undefined) {
      if (typeof full_name !== "string" || full_name.trim().length < 2) {
        return res.status(400).json({ error: "full_name inválido" });
      }
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "email inválido" });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(full_name !== undefined ? { full_name: full_name.trim() } : {}),
        ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        email_verified: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
      },
    });

    return res.json(updated);
  } catch (err) {
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Email ya registrado" });
    }

    console.error("ME PUT ERROR:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email y password son requeridos" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        full_name: true,
        email: true,
        password_hash: true,
        email_verified: true,
        is_active: true,
        created_at: true,
      },
    });

    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = jwt.sign(
      { userId: user.id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // No mandes password_hash al cliente
    const { password_hash, ...safeUser } = user;

    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "No autorizado" });

    const userId = BigInt(req.user.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        email: true,
        email_verified: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
      },
    });

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    return res.json(user);
  } catch (err) {
    console.error("ME GET ERROR:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});

// ✅ PUT /api/auth/me
authRouter.put("/me", requireAuth, async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "No autorizado" });

    const userId = BigInt(req.user.id);

    const { full_name, email } = req.body;
    if (full_name === undefined && email === undefined) {
      return res.status(400).json({ error: "Nada que actualizar" });
    }

    if (full_name !== undefined) {
      if (typeof full_name !== "string" || full_name.trim().length < 2) {
        return res.status(400).json({ error: "full_name inválido" });
      }
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "email inválido" });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(full_name !== undefined ? { full_name: full_name.trim() } : {}),
        ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        email_verified: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
      },
    });

    return res.json(updated);
  } catch (err) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Email ya registrado" });

    console.error("ME PUT ERROR:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});