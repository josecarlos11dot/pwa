import { ObjectId } from 'mongodb';
import { getDb } from './db.js';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ ok:false, error:'id requerido' });
  const db = await getDb();
  await db.collection('entries').updateOne(
    { _id: new ObjectId(id) },
    { $set: { status:'registered', registeredAt: new Date() } }
  );
  res.status(200).json({ ok:true });
}
