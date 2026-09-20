import http from "http";
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";
import apiRoutes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { initSocket } from "./sockets";

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (_req, res) => {
    res.json({
      status: "ok",
      message: "SCS30 Smart Care System API",
      docs: "/api/health",
    });
  });

  app.use("/api", apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  await connectDatabase();
  initSocket(server);

  server.listen(env.port, () => {
    console.log(`[server] SCS30 backend listening on http://localhost:${env.port}`);
    console.log(`[server] CORS allowed origin: ${env.clientUrl}`);
  });
}

bootstrap().catch(err => {
  console.error("[server] failed to start", err);
  process.exit(1);
});
