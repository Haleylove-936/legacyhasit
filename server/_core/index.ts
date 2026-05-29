import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getAllowedOrigins, validateServerEnv } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => server.close(() => resolve(true)));
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  validateServerEnv();

  const app = express();
  const server = createServer(app);
  const allowedOrigins = new Set(getAllowedOrigins());

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    res.header("Vary", "Origin");
    res.header("X-Content-Type-Options", "nosniff");
    res.header("Referrer-Policy", "no-referrer");
    res.header("X-Frame-Options", "DENY");

    if (origin) {
      if (!allowedOrigins.has(origin)) {
        res.status(403).json({ error: "Origin not allowed" });
        return;
      }
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    }

    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") { res.sendStatus(200); return; }
    next();
  });

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  registerAuthRoutes(app);

  app.get("/api/health", (_req, res) => res.json({ ok: true, timestamp: Date.now() }));

  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log(`Port ${preferredPort} busy, using ${port}`);

  server.listen(port, "0.0.0.0", () => console.log(`[api] server listening on port ${port}`));
}

startServer().catch(console.error);
