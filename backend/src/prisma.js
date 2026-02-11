import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import pkg from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = pkg;

const dbUrl = process.env.DATABASE_URL;
const caPath = process.env.DB_SSL_CA_PATH;

if (!dbUrl) throw new Error("DATABASE_URL missing in .env");
if (!caPath) throw new Error("DB_SSL_CA_PATH missing in .env");

const host = new URL(dbUrl).hostname;

const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    ca: fs.readFileSync(caPath, "utf8"),
    rejectUnauthorized: true,
    servername: host, // 👈 ayuda a verify-full (SNI)
  },
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
