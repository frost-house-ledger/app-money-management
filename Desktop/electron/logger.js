import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { MongoClient } from "mongodb";

export function createAppLogger(dataDir) {
  const logPath = path.join(dataDir, "app-log.jsonl");
  const mongoUri = process.env.MONGODB_URI;
  let mongoClient = null;
  let mongoCollection = null;

  async function ensureMongo() {
    if (!mongoUri || mongoCollection) {
      return mongoCollection;
    }

    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    mongoCollection = mongoClient.db("money_management").collection("app_logs");
    return mongoCollection;
  }

  async function log(event, payload = {}) {
    const record = {
      at: new Date().toISOString(),
      event,
      payload
    };

    try {
      const collection = await ensureMongo();
      if (collection) {
        await collection.insertOne(record);
        return;
      }
    } catch {
      // MongoDB unavailable時はローカルログにフォールバックする。
    }

    fs.appendFileSync(logPath, `${JSON.stringify(record)}\n`, "utf8");
  }

  async function close() {
    if (mongoClient) {
      await mongoClient.close();
    }
  }

  return { log, close };
}

// Synchronous helper for logging errors from the Electron main process.
// This writes to the system temp directory to ensure it's writable in packaged apps.
export function logError(source, error) {
  try {
    const record = {
      at: new Date().toISOString(),
      source,
      message: error?.message || String(error),
      stack: error?.stack || null
    };
    const logPath = path.join(os.tmpdir(), "houseledger-main-errors.log");
    try {
      fs.appendFileSync(logPath, `${JSON.stringify(record)}\n`, "utf8");
    } catch (e) {
      // best-effort only
    }
    // also print to stderr for visibility in logs
    console.error("[HouseLedger][ERROR]", source, record.message, record.stack || "");
  } catch (e) {
    try { console.error("[HouseLedger][ERROR] could not log error", String(e)); } catch (e2) {}
  }
}
