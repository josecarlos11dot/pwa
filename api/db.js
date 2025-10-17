// api/db.js
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI; // debe ser mongodb+srv://...kxito...
const dbName = process.env.MONGODB_DB || "carwash";

if (!uri) {
  throw new Error("Missing MONGODB_URI");
}

let clientPromise;

export async function getDb() {
  if (!clientPromise) {
    const client = new MongoClient(uri, {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    });
    clientPromise = client.connect();
  }
  const client = await clientPromise;
  return client.db(dbName);
}
