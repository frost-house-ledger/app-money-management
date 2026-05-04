import fs from "node:fs";
import path from "node:path";
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
