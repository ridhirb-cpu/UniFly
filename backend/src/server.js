import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { initializeDatabase } from "./db.js";
import authRoutes from "./routes/auth.js";
import airportRoutes from "./routes/airports.js";
import breakRoutes from "./routes/breaks.js";
import collegeRoutes from "./routes/colleges.js";
import dashboardRoutes from "./routes/dashboard.js";
import dealRoutes from "./routes/deals.js";
import flightRoutes from "./routes/flights.js";
import friendRoutes from "./routes/friends.js";
import notificationRoutes from "./routes/notifications.js";
import rideRoutes from "./routes/rides.js";
import tripRoutes from "./routes/trips.js";

dotenv.config();

let databaseInitialized = false;

function ensureDatabase() {
  if (!databaseInitialized) {
    initializeDatabase();
    databaseInitialized = true;
  }
}

export function createApp() {
  ensureDatabase();

  const app = express();
  const allowedOrigin = process.env.CLIENT_URL || true;

  app.use(
    cors({
      origin: allowedOrigin
    })
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "UniFly API" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/airports", airportRoutes);
  app.use("/api/colleges", collegeRoutes);
  app.use("/api/rides", rideRoutes);
  app.use("/api/deals", dealRoutes);
  app.use("/api/flights", flightRoutes);
  app.use("/api/breaks", breakRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/friends", friendRoutes);
  app.use("/api/trips", tripRoutes);
  app.use("/api/notifications", notificationRoutes);

  return app;
}

const app = createApp();
const PORT = process.env.PORT || 4000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`UniFly API running on port ${PORT}`);
  });
}

export default app;
