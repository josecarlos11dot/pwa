import crypto from 'crypto';

export default async function handler(req, res){
  const timestamp = Number(req.query.timestamp) || Math.floor(Date.now()/1000);
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'carwash/capturas';
  const toSign = `folder=${folder}&timestamp=${timestamp}` + process.env.CLOUDINARY_API_SECRET;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');
  res.status(200).json({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature
  });
}
