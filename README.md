# PWA Captura → Dashboard (Vercel + MongoDB + Cloudinary)

**Fecha:** 2025-10-16

## Deploy rápido
1. Crea MongoDB Atlas y copia `MONGODB_URI`.  
2. Crea cuenta Cloudinary y toma `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.  
3. En Vercel: importa repo y añade variables del `.env.local.example`.  
4. Abre `/capture.html` en el iPhone y `/` en la PC.

## Endpoints
- `POST /api/create-record` → crea pendiente con folio diario.
- `GET /api/list-pending` → tarjetas por registrar.
- `GET /api/list-registered` → registrados de hoy.
- `POST /api/register` → marcar como registrado.
- `GET /api/sign-cloudinary?timestamp=...` → firma segura para subir imagen.

## Notas
- El folio se reinicia cada día con colección `counters`.
- Las fotos se almacenan en Cloudinary; se conserva `imageUrl`.
- PWA básico con `manifest` y `sw.js`.
