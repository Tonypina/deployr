import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler, notFound } from "./middleware/error";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import clientRoutes from "./routes/client.routes";
import branchRoutes from "./routes/branch.routes";
import equipmentRoutes from "./routes/equipment.routes";
import productRoutes from "./routes/product.routes";
import ticketRoutes from "./routes/ticket.routes";
import reportRoutes from "./routes/report.routes";
import reportTemplateRoutes from "./routes/report-template.routes";
import cronRoutes from "./routes/cron.routes";
import inventoryRoutes from "./routes/inventory.routes";
import visitRoutes from "./routes/visit.routes";

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",");

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/clients/:clientId/branches", branchRoutes);
app.use("/api/clients/:clientId/branches/:branchId/equipment", equipmentRoutes);
app.use("/api/products", productRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/tickets/:ticketId/report", reportRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/report-templates", reportTemplateRoutes);
app.use("/api/cron", cronRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
