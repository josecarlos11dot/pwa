import { getDb } from './db.js';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();
  const { imageUrl } = req.body || {};
  if (!imageUrl) return res.status(400).json({ ok:false, error:'imageUrl requerido' });

  const db = await getDb();
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  const key = `${yyyy}-${mm}-${dd}`;

  const counters = db.collection('counters');
  const { value } = await counters.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const folioDiario = value?.seq ?? 0;

  const entries = db.collection('entries');
  const doc = {
    imageUrl,
    status: 'pending',
    createdAt: new Date(),
    dateKey: key,
    folioDiario
  };
  const ins = await entries.insertOne(doc);
  res.status(200).json({ ok:true, _id: ins.insertedId, folioDiario, createdAt: doc.createdAt });
}
