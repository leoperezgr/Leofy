import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

// POST /login
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email y password son requeridos" });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      select: {
        id: true,
        full_name: true,
        email: true,
        password_hash: true,
        email_verified: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
      },
    });

    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(String(password), user.password_hash);
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

// GET /me
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

// PUT /me
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
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Email ya registrado" });
    }

    console.error("ME PUT ERROR:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});

authRouter.put("/me/password", requireAuth, async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "No autorizado" });

    const userId = BigInt(req.user.id);
    const { current_password, new_password } = req.body;

    if (typeof current_password !== "string" || current_password.length === 0) {
      return res.status(400).json({ error: "La contraseña actual es requerida" });
    }

    if (typeof new_password !== "string" || new_password.length < 8) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password_hash: true,
      },
    });

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const isValidCurrent = await bcrypt.compare(current_password, user.password_hash);
    if (!isValidCurrent) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta" });
    }

    const samePassword = await bcrypt.compare(new_password, user.password_hash);
    if (samePassword) {
      return res.status(400).json({ error: "La nueva contraseña debe ser diferente a la actual" });
    }

    const password_hash = await bcrypt.hash(new_password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password_hash },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("ME PASSWORD PUT ERROR:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});
