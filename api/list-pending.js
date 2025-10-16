import { getDb } from './db.js';

export default async function handler(req, res){
  const db = await getDb();
  const items = await db.collection('entries')
    .find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(200)
    .toArray();
  res.status(200).json({ items });
}
