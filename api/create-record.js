// api/create-record.js
import { getDb } from "./db.js";

export default async function handler(req, res) {
  try {
    // Solo POST
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // Asegurar que el body venga parseado (Vercel a veces lo pasa como string)
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { imageUrl } = body;

    if (!imageUrl) {
      return res.status(400).json({ ok: false, error: "imageUrl requerido" });
    }

    const db = await getDb();

    // 🔹 Crear folio diario (YYYY-MM-DD)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;

    // 🔹 Incrementar contador diario
    const counters = db.collection("counters");
    const { value } = await counters.findOneAndUpdate(
      { _id: key },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    const folioDiario = value?.seq ?? 0;

    // 🔹 Insertar registro principal
    const entries = db.collection("entries");
    const doc = {
      imageUrl,
      status: "pending",
      createdAt: new Date(),
      dateKey: key,
      folioDiario,
    };

    const ins = await entries.insertOne(doc);

    // ✅ Respuesta JSON válida
    return res.status(200).json({
      ok: true,
      _id: ins.insertedId,
      folioDiario,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    // 🚨 Captura errores para que siempre devuelva JSON
    console.error("❌ create-record error:", err);
    return res.status(500).json({
      ok: false,
      where: "create-record",
      error: String(err?.message || err),
      name: err?.name,
      code: err?.code,
    });
  }
}
