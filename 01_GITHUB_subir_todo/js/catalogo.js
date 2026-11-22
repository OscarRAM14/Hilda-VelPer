/* =====================================================================
   Catálogo · Producto · Editor de imágenes · Catálogo público
   ===================================================================== */
let catSel = 'Todos', busCat = '';
const precioTxt = p => p.precio ? (p.precio_desde ? 'Desde ' : '') + money(p.precio) : 'Cotizar';

function prodCard(p, href){
  return `<a class="prod" href="${href}">
    <div class="ph" style="background-image:url('${esc(p.foto_post_url || p.foto_url || 'img/logo.jpg')}')">
      ${p.destacado ? '<span class="star">★ Favorito</span>' : ''}${!p.publico ? '<span class="hid">oculto</span>' : ''}</div>
    <div class="tx"><b>${esc(p.nombre)}</b><span>${precioTxt(p)}</span>${p.personas ? ` <small class="muted">· ${p.personas} pers.</small>` : ''}</div></a>`;
}
function filtrarProds(lista){
  let l = lista.slice().sort((a,b) => (b.destacado - a.destacado) || (num(a.orden) - num(b.orden)) || a.nombre.localeCompare(b.nombre));
  if (catSel !== 'Todos') l = l.filter(p => p.categoria === catSel);
  if (busCat) l = l.filter(p => (p.nombre + ' ' + p.descripcion).toLowerCase().includes(busCat.toLowerCase()));
  return l;
}
function chipsCat(lista){
  const cats = ['Todos', ...CATEGORIAS.filter(c => lista.some(p => p.categoria === c))];
  return `<div class="chips">${cats.map(c => `<button class="chip ${catSel===c?'on':''}" onclick="catSel='${c}';render()">${c}</button>`).join('')}</div>`;
}

ruta('catalogo', () => {
  const l = filtrarProds(S.d.productos);
  pagina('Catálogo', `
    <div class="row" style="margin-bottom:10px">
      <input class="i grow" placeholder="🔍 Buscar" value="${esc(busCat)}" oninput="busCat=this.value;clearTimeout(window._tb);window._tb=setTimeout(()=>{render();const i=document.querySelector('main input');i.focus();i.setSelectionRange(99,99)},350)">
      ${isAdmin() ? '<a class="btn" href="#/producto-nuevo">＋ Nuevo</a>' : ''}
    </div>
    ${chipsCat(S.d.productos)}
    ${l.length ? `<div class="prod-grid">${l.map(p => prodCard(p, '#/producto/' + p.id)).join('')}</div>` : vacio('🎂','Aún no hay nada aquí.')}
    <div class="row wrap" style="margin-top:14px">
      <a class="btn sec chico" href="#/editor">📸 Crear publicación con otra foto</a>
      <a class="btn sec chico" href="?catalogo" target="_blank">👀 Ver catálogo público</a>
    </div>
  `);
});

/* ---------- DETALLE ---------- */
ruta('producto', id => {
  const p = byId('productos', id);
  if (!p) return pagina('Catálogo', vacio('🤔','No encontré ese producto.'), { atras:true, nav:'catalogo' });
  const pedidos = S.d.pedidos.filter(x => x.producto_id === id).length;
  pagina(p.nombre, `
    <img class="foto-det" src="${esc(p.foto_url || 'img/logo.jpg')}" alt="">
    <div class="card" style="margin-top:12px">
      <div class="row between"><h2 style="margin:0">${esc(p.nombre)}</h2><span class="money" style="color:var(--fucsia);font-size:19px">${precioTxt(p)}</span></div>
      <p class="muted">${esc(p.categoria)}${p.personas ? ' · ' + p.personas + ' personas' : ''}${pedidos ? ' · pedido ' + pedidos + ' veces' : ''}${p.publico ? '' : ' · <b>oculto del catálogo público</b>'}</p>
      <p>${esc(p.descripcion)}</p>
      <div class="row wrap">
        <a class="btn fucsia" href="#/editor/${p.id}">📸 Editar imagen para redes</a>
        ${isAdmin() ? `<a class="btn sec" href="#/producto-editar/${p.id}">✏️ Editar datos</a>` : ''}
      </div>
      <div class="row wrap" style="margin-top:10px">
        <button class="btn sec chico" onclick="nuevoPedidoDe('${p.id}')">＋ Pedido de este pastel</button>
        ${isAdmin() ? `<button class="btn sec chico" onclick="S.cotizacion={personas:${num(p.personas)||20},producto_id:'${p.id}'};ir('#/cotizar')">🧮 Cotizar</button>` : ''}
      </div>
    </div>
    ${p.foto_post_url ? `<div class="card"><h2>Publicación guardada</h2><img class="foto-det" src="${esc(p.foto_post_url)}">
      <button class="btn verde full" style="margin-top:10px" onclick="compartirURL('${esc(p.foto_post_url)}','${esc(p.nombre)}')">📤 Compartir</button></div>` : ''}
  `, { atras:true, nav:'catalogo' });
});
function nuevoPedidoDe(id){
  const p = byId('productos', id);
  S.borradorPedido = { producto_id:id, descripcion:p.nombre, personas:p.personas || 20, precio:p.precio || '' };
  ir('#/pedido-nuevo');
}
async function compartirURL(url, nombre){
  try { const b = await (await fetch(url)).blob(); await compartirBlob(b, nombre); }
  catch(e){ window.open(url, '_blank'); }
}
async function compartirBlob(blob, nombre, texto=''){
  const file = new File([blob], (nombre || 'hilda-velper').replace(/[^\w\-]+/g,'-').toLowerCase() + '.jpg', { type:'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files:[file] })){
    try { await navigator.share({ files:[file], text:texto }); return; } catch(e){ if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  toast('Imagen descargada en tu galería/descargas');
}

/* ---------- ALTA / EDICIÓN ---------- */
ruta('producto-nuevo', () => formProducto(null));
ruta('producto-editar', id => formProducto(byId('productos', id)));
function formProducto(p){
  if (!isAdmin()) return ir('#/catalogo');
  const nuevo = !p;
  p = { nombre:'', categoria:'Pasteles', descripcion:'', precio:'', precio_desde:true, personas:20, publico:true, destacado:false, orden:0, ...(p||{}) };
  pagina(nuevo ? 'Nuevo producto' : 'Editar producto', `
  <form id="fpr" class="card">
    <label class="f" style="margin-top:0">Foto ${nuevo ? '*' : ''}</label>
    <input class="i" type="file" accept="image/*" id="foto" ${nuevo ? 'required' : ''}>
    <img id="prev" src="${esc(p.foto_url || '')}" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px;margin-top:8px;${p.foto_url?'':'display:none'}">
    <label class="f">Nombre *</label><input class="i" name="nombre" required value="${esc(p.nombre)}" placeholder="Ej. Pastel de unicornio">
    <label class="f">Categoría</label><select class="i" name="categoria">${CATEGORIAS.map(c => `<option ${c===p.categoria?'selected':''}>${c}</option>`).join('')}</select>
    <label class="f">Descripción</label><textarea class="i" name="descripcion">${esc(p.descripcion)}</textarea>
    <div class="grid2">
      <div><label class="f">Precio (vacío = "Cotizar")</label><input class="i" type="number" inputmode="decimal" name="precio" value="${p.precio ?? ''}"></div>
      <div><label class="f">Personas</label><input class="i" type="number" inputmode="numeric" name="personas" value="${p.personas ?? ''}"></div>
    </div>
    <label class="check"><input type="checkbox" name="precio_desde" ${p.precio_desde?'checked':''}> Mostrar como "Desde $…"</label>
    <label class="check"><input type="checkbox" name="publico" ${p.publico?'checked':''}> Mostrar en el catálogo público</label>
    <label class="check"><input type="checkbox" name="destacado" ${p.destacado?'checked':''}> ★ Favorito (sale primero)</label>
    <button class="btn full" style="margin-top:8px">💾 Guardar</button>
    ${!nuevo ? '<button type="button" class="btn peligro full" style="margin-top:10px" id="borrar">Eliminar del catálogo</button>' : ''}
  </form>`, { atras:true, nav:'catalogo' });
  $('#foto').onchange = e => { const f = e.target.files[0]; if (f){ const i = $('#prev'); i.src = URL.createObjectURL(f); i.style.display = 'block'; } };
  $('#borrar') && ($('#borrar').onclick = async () => {
    if (!await confirmar('¿Eliminar "' + p.nombre + '" del catálogo?')) return;
    await guardar(() => DB.del('productos', p.id), 'Eliminado'); await recargar('productos'); ir('#/catalogo');
  });
  $('#fpr').onsubmit = async e => {
    e.preventDefault(); const btn = e.target.querySelector('.btn.full'); btn.disabled = true; btn.textContent = 'Subiendo…';
    try {
      const f = formData(e.target);
      const row = { nombre:f.nombre, categoria:f.categoria, descripcion:f.descripcion, precio:f.precio, personas:f.personas,
        precio_desde:f.precio_desde, publico:f.publico, destacado:f.destacado };
      const file = $('#foto').files[0];
      if (file) row.foto_url = await DB.subir(await comprimir(file), 'productos');
      const r = nuevo ? await DB.ins('productos', row) : await DB.upd('productos', p.id, row);
      await recargar('productos'); toast('✅ Guardado');
      history.replaceState(null, '', '#/producto/' + r.id); render();
    } catch(err){ toast('⚠️ ' + err.message, 4000); btn.disabled = false; btn.textContent = '💾 Guardar'; }
  };
}

/* =====================================================================
   EDITOR DE IMÁGENES PARA REDES
   ===================================================================== */
const FORMATOS = { cuadrado:[1080,1080,'⬜ Cuadrado'], vertical:[1080,1350,'▯ Vertical'], historia:[1080,1920,'📱 Historia'] };
let E = null;
const imgCache = {};
function cargarImg(src){
  if (imgCache[src]) return Promise.resolve(imgCache[src]);
  return new Promise((res, rej) => { const i = new Image(); if (!src.startsWith('data:') && !src.startsWith('blob:')) i.crossOrigin = 'anonymous';
    i.onload = () => { imgCache[src] = i; res(i); }; i.onerror = () => rej(new Error('No se pudo abrir la imagen')); i.src = src; });
}

ruta('editor', async (pid) => {
  const p = pid ? byId('productos', pid) : null;
  E = { pid, fmt:'vertical', zoom:1, ox:0, oy:0, brillo:105, contraste:105, satur:110, calidez:10,
        logo:true, logoPos:'br', logoSize:24, estilo:'banda', marco:true,
        titulo: p ? p.nombre : '', linea2: p ? (p.precio ? precioTxt(p) : 'Pedidos por WhatsApp') : 'Pedidos por WhatsApp',
        img:null, sello:null };
  pagina('Editor de imagen', `
    ${!p ? `<div class="card"><label class="f" style="margin-top:0">Elige una foto</label><input class="i" type="file" accept="image/*" id="efoto"></div>` : ''}
    <div class="editor-wrap"><canvas id="cv"></canvas></div>
    <p class="muted mini" style="text-align:center;margin:6px 0 10px">Arrastra la foto para acomodarla · pellizca para acercar</p>
    <div class="grid2" style="margin-bottom:10px">
      <button class="btn verde" id="ecomp">📤 Compartir</button>
      <button class="btn sec" id="edesc">⬇️ Descargar</button>
    </div>
    ${p && isAdmin() ? '<button class="btn full" style="margin-bottom:10px" id="eguard">💾 Guardar en el producto</button>' : ''}
    <div class="chips">${Object.entries(FORMATOS).map(([k,v]) => `<button class="chip ${E.fmt===k?'on':''}" data-fmt="${k}">${v[2]}</button>`).join('')}</div>
    <div class="card">
      <h3>Texto</h3>
      <div class="chips">${[['banda','Banda abajo'],['arriba','Banda arriba'],['ninguno','Sin texto']].map(([k,v]) => `<button class="chip ${E.estilo===k?'on':''}" data-est="${k}">${v}</button>`).join('')}</div>
      <label class="f">Título</label><input class="i" id="et1" value="${esc(E.titulo)}">
      <label class="f">Segunda línea</label><input class="i" id="et2" value="${esc(E.linea2)}">
    </div>
    <div class="card">
      <h3>Foto</h3>
      <label class="f">Acercar</label><input type="range" min="1" max="3" step="0.01" value="1" data-k="zoom">
      <label class="f">Brillo</label><input type="range" min="70" max="140" value="${E.brillo}" data-k="brillo">
      <label class="f">Contraste</label><input type="range" min="70" max="140" value="${E.contraste}" data-k="contraste">
      <label class="f">Color (saturación)</label><input type="range" min="50" max="170" value="${E.satur}" data-k="satur">
      <label class="f">Calidez</label><input type="range" min="-30" max="40" value="${E.calidez}" data-k="calidez">
    </div>
    <div class="card">
      <h3>Logo y marco</h3>
      <label class="check"><input type="checkbox" id="elogo" checked> Poner logo de Hilda VelPer</label>
      <div class="chips">${[['tl','↖'],['tr','↗'],['bl','↙'],['br','↘']].map(([k,v]) => `<button class="chip ${E.logoPos===k?'on':''}" data-pos="${k}">${v}</button>`).join('')}</div>
      <label class="f">Tamaño del logo</label><input type="range" min="12" max="40" value="${E.logoSize}" data-k="logoSize">
      <label class="check"><input type="checkbox" id="emarco" checked> Marco crema</label>
    </div>
  `, { atras:true, nav:'catalogo' });

  const cv = $('#cv');
  try { E.sello = await cargarImg('img/logo-sello.png'); } catch(e){}
  try { await document.fonts.load('700 80px "Dancing Script"'); await document.fonts.load('800 40px Nunito'); } catch(e){}
  if (p){ try { E.img = await cargarImg(p.foto_url); } catch(e){ toast('No se pudo abrir la foto'); } }
  dibujar();

  $('#efoto') && ($('#efoto').onchange = async e => { const f = e.target.files[0]; if (!f) return; E.img = await cargarImg(URL.createObjectURL(await comprimir(f, 2000, 0.92))); E.ox = E.oy = 0; dibujar(); });
  $$('[data-fmt]').forEach(b => b.onclick = () => { E.fmt = b.dataset.fmt; E.ox = E.oy = 0; $$('[data-fmt]').forEach(x => x.classList.toggle('on', x === b)); dibujar(); });
  $$('[data-est]').forEach(b => b.onclick = () => { E.estilo = b.dataset.est; $$('[data-est]').forEach(x => x.classList.toggle('on', x === b)); dibujar(); });
  $$('[data-pos]').forEach(b => b.onclick = () => { E.logoPos = b.dataset.pos; $$('[data-pos]').forEach(x => x.classList.toggle('on', x === b)); dibujar(); });
  $$('[data-k]').forEach(r => r.oninput = () => { E[r.dataset.k] = num(r.value); dibujar(); });
  $('#et1').oninput = e => { E.titulo = e.target.value; dibujar(); };
  $('#et2').oninput = e => { E.linea2 = e.target.value; dibujar(); };
  $('#elogo').onchange = e => { E.logo = e.target.checked; dibujar(); };
  $('#emarco').onchange = e => { E.marco = e.target.checked; dibujar(); };

  // arrastrar y pellizcar
  const ptrs = new Map(); let dist0 = 0, zoom0 = 1;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (ptrs.size === 2){ const [a,b] = [...ptrs.values()]; dist0 = Math.hypot(a.x-b.x, a.y-b.y); zoom0 = E.zoom; } });
  cv.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId); const k = cv.width / cv.clientWidth;
    ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (ptrs.size === 1){ E.ox += (e.clientX - prev.x) * k; E.oy += (e.clientY - prev.y) * k; }
    else if (ptrs.size === 2){ const [a,b] = [...ptrs.values()]; E.zoom = Math.min(3, Math.max(1, zoom0 * Math.hypot(a.x-b.x, a.y-b.y) / dist0)); const r = $('[data-k=zoom]'); if (r) r.value = E.zoom; }
    dibujar();
  });
  const fin = e => ptrs.delete(e.pointerId);
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);

  const nombre = () => (E.titulo || 'publicacion') + '-' + E.fmt;
  const exportar = () => new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
  $('#ecomp').onclick = async () => { if (!E.img) return toast('Primero elige una foto'); compartirBlob(await exportar(), nombre(), `${E.titulo}\n${E.linea2}`.trim()); };
  $('#edesc').onclick = async () => { if (!E.img) return toast('Primero elige una foto'); const b = await exportar(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nombre() + '.jpg'; a.click(); };
  $('#eguard') && ($('#eguard').onclick = async () => {
    const btn = $('#eguard'); btn.disabled = true; btn.textContent = 'Guardando…';
    try { const url = await DB.subir(await exportar(), 'publicaciones'); await DB.upd('productos', pid, { foto_post_url:url }); await recargar('productos'); toast('✅ Guardada en el producto'); ir('#/producto/' + pid); }
    catch(e){ toast('⚠️ ' + e.message, 4000); btn.disabled = false; btn.textContent = '💾 Guardar en el producto'; }
  });
});

function dibujar(){
  const cv = $('#cv'); if (!cv || !E) return;
  const [W, H] = FORMATOS[E.fmt]; cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#FFFBEA'; c.fillRect(0, 0, W, H);
  const m = E.marco ? 34 : 0;
  // foto
  if (E.img){
    const iw = E.img.naturalWidth, ih = E.img.naturalHeight;
    const s = Math.max((W-2*m)/iw, (H-2*m)/ih) * E.zoom;
    const dw = iw*s, dh = ih*s;
    // limitar el arrastre para que no queden huecos
    const maxX = Math.max(0, (dw-(W-2*m))/2), maxY = Math.max(0, (dh-(H-2*m))/2);
    E.ox = Math.max(-maxX, Math.min(maxX, E.ox)); E.oy = Math.max(-maxY, Math.min(maxY, E.oy));
    c.save();
    redondeado(c, m, m, W-2*m, H-2*m, E.marco ? 26 : 0); c.clip();
    c.filter = `brightness(${E.brillo}%) contrast(${E.contraste}%) saturate(${E.satur}%)`;
    c.drawImage(E.img, (W-dw)/2 + E.ox, (H-dh)/2 + E.oy, dw, dh);
    c.filter = 'none';
    if (E.calidez){
      c.globalCompositeOperation = 'soft-light';
      c.fillStyle = E.calidez > 0 ? `rgba(255,170,60,${E.calidez/100})` : `rgba(80,140,255,${-E.calidez/100})`;
      c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
    }
    // texto
    if (E.estilo !== 'ninguno' && (E.titulo || E.linea2)){
      const arriba = E.estilo === 'arriba';
      const bh = E.linea2 ? 250 : 170;
      const y0 = arriba ? m : H - m - bh;
      const g = c.createLinearGradient(0, arriba ? y0+bh : y0, 0, arriba ? y0 : y0+bh);
      g.addColorStop(0, 'rgba(78,36,102,0)'); g.addColorStop(0.35, 'rgba(78,36,102,.72)'); g.addColorStop(1, 'rgba(78,36,102,.9)');
      c.fillStyle = g; c.fillRect(m, y0, W-2*m, bh);
      c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 10;
      const ty = arriba ? y0 + 105 : y0 + (E.linea2 ? 130 : 120);
      c.fillStyle = '#FFFFFF'; c.font = `700 ${ajustarFuente(c, E.titulo, W-2*m-80, 96, '"Dancing Script"')}px "Dancing Script", cursive`;
      c.fillText(E.titulo, W/2, ty);
      if (E.linea2){ c.fillStyle = '#FBF1A9'; c.font = `800 ${ajustarFuente(c, E.linea2, W-2*m-80, 46, 'Nunito')}px Nunito, sans-serif`; c.fillText(E.linea2, W/2, ty + 72); }
      c.shadowBlur = 0;
    }
    c.restore();
  } else {
    c.fillStyle = '#9B78B4'; c.textAlign = 'center'; c.font = '800 46px Nunito, sans-serif'; c.fillText('Elige una foto 📸', W/2, H/2);
  }
  // marco
  if (E.marco){ c.lineWidth = 6; c.strokeStyle = '#9B78B4'; redondeado(c, m-10, m-10, W-2*m+20, H-2*m+20, 34); c.stroke(); }
  // logo
  if (E.logo && E.sello){
    const ls = W * E.logoSize / 100, pad = m + 22;
    const x = E.logoPos.includes('l') ? pad : W - pad - ls;
    let y = E.logoPos.includes('t') ? pad : H - pad - ls;
    if (E.estilo === 'banda' && E.logoPos.includes('b') && E.titulo) y -= (E.linea2 ? 250 : 170) - 10;
    if (E.estilo === 'arriba' && E.logoPos.includes('t') && E.titulo) y += (E.linea2 ? 250 : 170) - 10;
    c.save(); c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 14; c.drawImage(E.sello, x, y, ls, ls); c.restore();
  }
}
function redondeado(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x+r, y); c.arcTo(x+w, y, x+w, y+h, r); c.arcTo(x+w, y+h, x, y+h, r); c.arcTo(x, y+h, x, y, r); c.arcTo(x, y, x+w, y, r); c.closePath(); }
function ajustarFuente(c, txt, maxW, base, fam){ let s = base; c.font = `700 ${s}px ${fam}`; while (s > 26 && c.measureText(txt).width > maxW){ s -= 4; c.font = `700 ${s}px ${fam}`; } return s; }

/* =====================================================================
   CATÁLOGO PÚBLICO (para clientes, sin cuenta): tu-link/?catalogo
   ===================================================================== */
function vistaPublica(){
  const N = { ...NEGOCIO_DEF, ...S.negocio };
  const prods = (S.d.productos || []).filter(p => p.publico);
  document.title = `${N.nombre} · Catálogo`;
  const pintar = () => {
    const l = filtrarProds(prods);
    $('#app').innerHTML = `
      <div class="pub-hero"><img src="img/logo.jpg" alt="${esc(N.nombre)}">
        <h1 style="margin:6px 0 0">${esc(N.nombre)}</h1><p style="margin:0;color:var(--morado);font-weight:700">${esc(N.lema)}</p>
        <p class="muted">${esc(N.mensaje_catalogo)}</p>
        <div class="row" style="justify-content:center;gap:8px">
          ${N.facebook ? `<a class="btn sec chico" href="${esc(N.facebook)}" target="_blank">Facebook</a>` : ''}
          ${N.instagram ? `<a class="btn sec chico" href="${esc(N.instagram)}" target="_blank">Instagram</a>` : ''}
        </div></div>
      <main>${chipsCat(prods)}
        <div class="prod-grid">${l.map(p => `<div class="prod" onclick="verPub('${p.id}')" style="cursor:pointer">${prodCard(p,'javascript:void 0').replace(/^<a class="prod" href="[^"]*">|<\/a>$/g,'')}</div>`).join('')}</div>
        <p class="muted mini" style="text-align:center;margin-top:20px">Los precios pueden variar según el diseño y el número de personas.</p>
      </main>
      ${N.whatsapp ? `<a class="wa-float" target="_blank" href="${waLink(N.whatsapp, 'Hola, vi su catálogo y quiero cotizar un pastel 🎂')}">💬 Pedir por WhatsApp</a>` : ''}`;
  };
  window.render = pintar;
  window.verPub = id => {
    const p = prods.find(x => x.id === id);
    modal(`<img class="foto-det" src="${esc(p.foto_url)}">
      <h2 style="margin-top:12px">${esc(p.nombre)}</h2>
      <p class="money" style="color:var(--fucsia);font-size:19px;margin:0">${precioTxt(p)}${p.personas ? ` <span class="muted" style="font-size:14px">· ${p.personas} personas</span>` : ''}</p>
      <p>${esc(p.descripcion)}</p>
      ${N.whatsapp ? `<a class="btn verde full" target="_blank" href="${waLink(N.whatsapp, `Hola, me interesa el "${p.nombre}" que vi en su catálogo. ¿Me pueden cotizar para ___ personas el día ___?`)}">💬 Lo quiero, preguntar por WhatsApp</a>` : ''}
      <button class="btn sec full" style="margin-top:8px" onclick="closeModal()">Cerrar</button>`);
  };
  pintar();
}
