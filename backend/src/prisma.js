import "dotenv/config";
import pkg from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = pkg;

// Pool de pg usando tu DATABASE_URL del .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }, // Aiven normalmente requiere SSL
});

// Adapter Prisma <-> pg
const adapter = new PrismaPg(pool);

// PrismaClient con adapter (esto es lo que Prisma 7 exige)
export const prisma = new PrismaClient({ adapter });
