/**
 * MongoDB connection placeholder.
 * Safe to call even when MONGODB_URI is empty — app runs without a database.
 */
import { env } from "./env";

export async function connectDatabase(): Promise<void> {
  if (!env.mongoUri) {
    console.log("[db] MONGODB_URI not set — running without MongoDB (in-memory / stub mode)");
    return;
  }

  // Future: mongoose.connect(env.mongoUri)
  console.log("[db] MongoDB URI configured — connection wiring reserved for Phase 3");
}
