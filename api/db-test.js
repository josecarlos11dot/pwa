// api/db-test.js
import { MongoClient } from "mongodb";

export default async function handler(req, res) {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;

    if (!uri) return res.status(500).json({ ok: false, error: "Missing MONGODB_URI" });
    if (!dbName) return res.status(500).json({ ok: false, error: "Missing MONGODB_DB" });

    // Intento de conexión simple
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    // Prueba una operación mínima
    const colls = await db.listCollections().toArray();

    // Cierra y responde
    await client.close();
    return res.status(200).json({
      ok: true,
      dbName,
      hasCollections: colls.length,
      sample: colls.slice(0, 3).map(c => c.name),
    });
  } catch (err) {
    // Devuelve el error REAL para saber qué ocurre
    return res.status(500).json({
      ok: false,
      where: "db-test",
      error: String(err?.message || err),
      name: err?.name,
      code: err?.code,
    });
  }
}
