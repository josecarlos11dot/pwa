import { getDb } from './db.js';

function todayKey(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}

export default async function handler(req, res){
  const db = await getDb();
  const key = todayKey();
  const items = await db.collection('entries')
    .find({ status: 'registered', dateKey: key })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  res.status(200).json({ items });
}
