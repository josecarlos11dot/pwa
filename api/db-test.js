// api/db-test.js
import { getDb } from "./db";

export default async function handler(req, res) {
  try {
    const db = await getDb(); // usa el helper con conexión persistente
    await db.command({ ping: 1 }); // prueba de ping

    const colls = await db.listCollections().toArray();

    return res.status(200).json({
      ok: true,
      dbName: db.databaseName,
      hasCollections: colls.length,
      sample: colls.slice(0, 3).map(c => c.name),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      where: "db-test",
      error: String(err?.message || err),
      name: err?.name,
      code: err?.code,
    });
  }
}
