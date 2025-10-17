const api = {
  sign: '/api/sign-cloudinary',
  create: '/api/create-record',
  listPending: '/api/list-pending',
  listRegistered: '/api/list-registered',
  register: '/api/register'
};

// Helpers
const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
const qs = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => [...r.querySelectorAll(s)];

// Capture page logic — preview en vivo + “capturar y enviar”
const video = qs('#preview');
const canvas = qs('#frame');
const snapBtn = qs('#snapAndSend');
const retryBtn = qs('#retry');
const statusEl = qs('#status');
const photoFallback = qs('#photoFallback');

async function startCamera() {
  try {
    statusEl.textContent = 'Inicializando cámara…';
    // Intenta cámara trasera; si no existe, que el navegador elija
    let constraints = { video: { facingMode: { exact: 'environment' } } };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      constraints = { video: { facingMode: 'environment' } };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    }
    video.srcObject = stream;
    await video.play();
    statusEl.textContent = 'Cámara lista.';

    // Botón Reintentar visible solo si hubo error
    retryBtn.hidden = true;
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'No se pudo acceder a la cámara. Usa el fallback.';
    // Mostrar fallback de archivo si falla getUserMedia
    photoFallback.hidden = false;
    retryBtn.hidden = false;
  }
}

async function captureToFile(quality = 0.9, maxW = 1600) {
  // Asegura que el video tiene dimensiones
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;

  // Escala si excede maxW manteniendo relación
  const scale = Math.min(1, maxW / vw);
  canvas.width = Math.round(vw * scale);
  canvas.height = Math.round(vh * scale);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convierte a Blob JPEG
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
  return file;
}

async function uploadToCloudinary(file) {
  const ts = Math.floor(Date.now() / 1000);
  const signRes = await fetch(api.sign + `?timestamp=${ts}`);
  const sign = await signRes.json();

  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', sign.api_key);
  fd.append('timestamp', sign.timestamp);
  fd.append('signature', sign.signature);
  fd.append('folder', sign.folder);

  const upUrl = `https://api.cloudinary.com/v1_1/${sign.cloud_name}/auto/upload`;
  const upRes = await fetch(upUrl, { method: 'POST', body: fd });
  const up = await upRes.json();
  if (!up.secure_url) throw new Error('Fallo en subida a Cloudinary');
  return up.secure_url;
}

async function createRecord(imageUrl) {
  const res = await fetch(api.create, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error al crear registro');
  return data;
}

if (video && snapBtn && canvas) {
  // Inicia cámara al cargar
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    startCamera();
  } else {
    statusEl.textContent = 'Este dispositivo no soporta cámara. Usa el selector.';
    photoFallback.hidden = false;
  }

  // Capturar frame del preview y enviarlo
  snapBtn.addEventListener('click', async () => {
    try {
      snapBtn.disabled = true;
      statusEl.textContent = 'Capturando…';
      const file = await captureToFile(0.9, 1600);

      statusEl.textContent = 'Subiendo foto…';
      const imageUrl = await uploadToCloudinary(file);

      statusEl.textContent = 'Creando tarjeta…';
      const created = await createRecord(imageUrl);

      statusEl.textContent = `✅ Enviado · Folio ${created.folioDiario}`;
    } catch (err) {
      console.error(err);
      statusEl.textContent = '❌ Error: ' + (err.message || err);
    } finally {
      snapBtn.disabled = false;
    }
  });

  // Reintentar activar cámara si falló
  retryBtn?.addEventListener('click', () => {
    startCamera();
  });

  // Fallback manual (si falla cámara)
  photoFallback?.addEventListener('change', async () => {
    const file = photoFallback.files?.[0];
    if (!file) return;
    try {
      snapBtn.disabled = true;
      statusEl.textContent = 'Subiendo (fallback)…';
      const imageUrl = await uploadToCloudinary(file);
      const created = await createRecord(imageUrl);
      statusEl.textContent = `✅ Enviado · Folio ${created.folioDiario}`;
    } catch (err) {
      statusEl.textContent = '❌ Error: ' + (err.message || err);
    } finally {
      snapBtn.disabled = false;
      photoFallback.value = '';
    }
  });
}



// Dashboard logic
const pendingBox = qs('#pending');
const regBox = qs('#registered');
const viewer = qs('#viewer');
const viewerImg = qs('#viewerImg');

async function loadPending(){
  if (!pendingBox) return;
  const res = await fetch(api.listPending);
  const data = await res.json();
  pendingBox.innerHTML = '';
  data.items.forEach(item => {
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `
      <img src="${item.imageUrl}" alt="foto" />
      <div class="meta">
        <div>
          <div>Folio <strong>${item.folioDiario}</strong></div>
          <small>${fmtTime(item.createdAt)}</small>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn" data-act="register" data-id="${item._id}">Registrar</button>
        </div>
      </div>`;
    const img = el.querySelector('img');
    img.addEventListener('click', ()=>{
      viewerImg.src = item.imageUrl;
      viewer.showModal();
    });
    pendingBox.appendChild(el);
  });
}

async function loadRegistered(){
  if (!regBox) return;
  const res = await fetch(api.listRegistered);
  const data = await res.json();
  regBox.innerHTML = '';
  data.items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'reg-item';
    el.innerHTML = `
      <img src="${item.imageUrl}" alt="foto" />
      <div>
        <div>Folio <strong>${item.folioDiario}</strong> · ${fmtTime(item.createdAt)}</div>
        <small>Registrado: ${item.registeredAt ? fmtTime(item.registeredAt) : '-'}</small>
      </div>`;
    regBox.appendChild(el);
  });
}

if (pendingBox || regBox){
  loadPending();
  loadRegistered();
  const refresher = qs('#refresh');
  refresher && refresher.addEventListener('click', ()=>{ loadPending(); loadRegistered(); });
  setInterval(()=>{ loadPending(); loadRegistered(); }, 5000);

  document.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-act="register"]');
    if (!btn) return;
    const id = btn.dataset.id;
    btn.disabled = true;
    await fetch(api.register, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
    await loadPending();
    await loadRegistered();
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            location.reload(); // recarga para usar la versión nueva
          }
        });
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
  });
}
