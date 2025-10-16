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

// Capture page logic
const captureForm = qs('#captureForm');
if (captureForm) {
  const statusEl = qs('#status');
  captureForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = qs('#photo').files[0];
    if (!file) return;
    statusEl.textContent = 'Preparando subida…';

    try {
      // 1) pedir firma al backend
      const ts = Math.floor(Date.now()/1000);
      const signRes = await fetch(api.sign + `?timestamp=${ts}`);
      const sign = await signRes.json();

      // 2) subir a Cloudinary
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', sign.api_key);
      fd.append('timestamp', sign.timestamp);
      fd.append('signature', sign.signature);
      fd.append('folder', sign.folder);
      const upUrl = `https://api.cloudinary.com/v1_1/${sign.cloud_name}/auto/upload`;
      statusEl.textContent = 'Subiendo foto…';
      const upRes = await fetch(upUrl, { method: 'POST', body: fd });
      const up = await upRes.json();
      if (!up.secure_url) throw new Error('Fallo subida Cloudinary');

      // 3) crear registro en backend
      statusEl.textContent = 'Creando tarjeta…';
      const createRes = await fetch(api.create, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: up.secure_url })
      });
      const created = await createRes.json();
      if (!created.ok) throw new Error(created.error || 'Error al crear');

      statusEl.textContent = `✅ Enviado. Folio ${created.folioDiario} (${fmtTime(created.createdAt)})`;
      qs('#photo').value = '';
    } catch (err) {
      console.error(err);
      statusEl.textContent = '❌ Error: ' + err.message;
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

// PWA register service worker
if ('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}
