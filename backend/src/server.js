import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { authRouter } from "./routes/auth.routes.js";
import { onboardingRouter } from "./routes/onboarding.routes.js";
import { transactionsRouter } from "./routes/transactions.routes.js";
import { cardsRouter } from "./routes/cards.routes.js";
import { statsRouter } from "./routes/stats.routes.js";
import { categoriesRouter } from "./routes/categories.routes.js";
import { transfersRouter } from "./routes/transfers.routes.js";

// ✅ BigInt -> string en JSON
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/cards", cardsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/transfers", transfersRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
