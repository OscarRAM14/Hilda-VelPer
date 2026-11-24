/* =====================================================================
   v1.3.0 · Solicitudes desde el catálogo · Cotizar con la foto del cliente
            Simulador de pisos · Textos para redes · Datos de pago
            Alerta de precios · Reseñas · Respaldo en Excel · Modo oscuro
   ===================================================================== */

/* ---------- MODO OSCURO ---------- */
function aplicarTema(){
  const t = localStorage.getItem('hv_tema') || 'claro';
  const oscuro = t === 'oscuro' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.tema = oscuro ? 'oscuro' : 'claro';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = oscuro ? '#2A1D36' : '#7B4A9C';
}
function cambiarTema(t){ localStorage.setItem('hv_tema', t); aplicarTema(); render(); }
aplicarTema();

/* ---------- SOLICITUDES ---------- */
const solNuevas = () => (S.d.solicitudes || []).filter(s => s.estado === 'nueva');
let filtroSol = 'nueva';
ruta('solicitudes', () => {
  let l = (S.d.solicitudes || []).slice().sort((a,b) => (b.creado||'').localeCompare(a.creado||''));
  if (filtroSol !== 'todas') l = l.filter(s => s.estado === filtroSol);
  const lab = { nueva:'Nuevas', convertida:'Convertidas', descartada:'Descartadas', todas:'Todas' };
  pagina('Solicitudes', `
    <p class="muted">Lo que piden los clientes desde el catálogo público. Cotiza, conviértelo en pedido o contéstales por WhatsApp.</p>
    <div class="chips">${Object.entries(lab).map(([k,v]) => `<button class="chip ${filtroSol===k?'on':''}" onclick="filtroSol='${k}';render()">${v}${k==='nueva' && solNuevas().length ? ` <span class="pill-cnt">${solNuevas().length}</span>` : ''}</button>`).join('')}</div>
    ${l.length ? l.map(solicitudHTML).join('') : vacio('📝','No hay solicitudes aquí. Comparte tu catálogo para recibirlas.', '<a class="btn chico" href="#/compartir">🔗 Compartir catálogo</a>')}
  `, { atras:true, nav:'mas' });
});
function solicitudHTML(s){
  const prod = s.producto_id ? byId('productos', s.producto_id) : null;
  const msg = `¡Hola ${s.nombre}! 🎂 Recibimos tu solicitud${prod || s.producto_nombre ? ` del "${prod?.nombre || s.producto_nombre}"` : ''} para ${s.personas || '?'} personas${s.fecha_deseada ? ' el ' + fCorta(s.fecha_deseada) : ''}. `;
  return `<div class="card">
    <div class="row between"><h2 style="margin:0">${esc(s.nombre)}</h2><span class="tag ${s.estado === 'nueva' ? 'confirmado' : s.estado === 'convertida' ? 'listo' : 'cancelado'}">${s.estado}</span></div>
    <p class="muted mini" style="margin:4px 0 8px">Recibida ${s.creado ? fCorta(s.creado) + ' ' + hm(new Date(s.creado)) : ''} · 📱 ${esc(s.telefono)}</p>
    <div class="row" style="align-items:flex-start">
      ${s.foto_ref_url ? `<a href="${esc(s.foto_ref_url)}" target="_blank"><img src="${esc(s.foto_ref_url)}" style="width:96px;height:96px;object-fit:cover;border-radius:12px"></a>` : ''}
      <div class="grow">
        <b>${esc(prod?.nombre || s.producto_nombre || 'Diseño especial')}</b>
        <div class="muted mini">${s.personas ? '👥 ' + s.personas + ' personas' : ''}${s.fecha_deseada ? ' · 📅 ' + fCorta(s.fecha_deseada) : ''}${s.sabor ? ' · ' + esc(s.sabor) : ''}</div>
        ${s.mensaje ? `<p style="margin:6px 0 0;font-size:14px">“${esc(s.mensaje)}”</p>` : ''}
        ${s.fecha_deseada ? avisoCapacidad(s.fecha_deseada) : ''}
      </div></div>
    <div class="row wrap" style="margin-top:10px">
      <a class="btn verde chico" target="_blank" href="${waLink(s.telefono, msg)}">💬 Contestar</a>
      ${s.estado === 'nueva' ? `${isAdmin() ? `<button class="btn fucsia chico" onclick="cotizarSolicitud('${s.id}')">🧮 Cotizar</button>` : ''}
        <button class="btn chico" onclick="solicitudAPedido('${s.id}')">＋ Hacer pedido</button>
        <button class="btn peligro chico" onclick="estadoSolicitud('${s.id}','descartada')">Descartar</button>`
      : s.pedido_id ? `<a class="btn sec chico" href="#/pedido/${s.pedido_id}">Ver pedido</a>` : `<button class="btn sec chico" onclick="estadoSolicitud('${s.id}','nueva')">Regresar a nuevas</button>`}
    </div></div>`;
}
async function estadoSolicitud(id, estado){ await guardar(() => DB.upd('solicitudes', id, { estado }), estado === 'descartada' ? 'Descartada' : 'Listo'); await recargar('solicitudes'); render(); }
function extraDeSolicitud(s){
  const prod = s.producto_id ? byId('productos', s.producto_id) : null;
  return { cliente:s.nombre, telefono:s.telefono, producto_id:s.producto_id || '', descripcion:prod?.nombre || s.producto_nombre || 'Diseño especial',
    personas:s.personas || 20, sabor:s.sabor || '', notas:s.mensaje || '', foto_ref_url:s.foto_ref_url || null, solicitud_id:s.id,
    fecha_entrega: s.fecha_deseada ? s.fecha_deseada + 'T16:00' : undefined };
}
function solicitudAPedido(id){ const s = byId('solicitudes', id); S.borradorPedido = { ...extraDeSolicitud(s), estado:'cotizacion' }; ir('#/pedido-nuevo'); }
function cotizarSolicitud(id){
  const s = byId('solicitudes', id); const prod = s.producto_id ? byId('productos', s.producto_id) : null;
  S.cotizacion = { personas:s.personas || 20, producto_id:s.producto_id || '', fotoRef:s.foto_ref_url, extra:extraDeSolicitud(s),
    recetas: (prod?.recetas || []).filter(r => byId('recetas', r)) };
  if (S.cotizacion.recetas.length) S.cotizacion._init = true;
  ir('#/cotizar');
}
function tarjetaSolicitudes(){
  const n = solNuevas().length; if (!n) return '';
  return `<a class="card" href="#/solicitudes" style="display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit;border:2px solid var(--fucsia)">
    <span style="font-size:30px">📝</span><div class="grow"><b>${n} solicitud${n===1?'':'es'} nueva${n===1?'':'s'}</b><div class="muted mini">Clientes que pidieron cotización desde el catálogo</div></div><span style="color:var(--fucsia);font-size:22px">›</span></a>`;
}

/* Formulario público para pedir cotización */
function formSolicitudPublica(prodId){
  const N = { ...NEGOCIO_DEF, ...S.negocio };
  const prods = (S.d.productos || []).filter(p => p.publico).sort((a,b) => a.nombre.localeCompare(b.nombre));
  const min = ymd(addDays(new Date(), 2));
  modal(`<h2>📝 Pide tu cotización</h2><p class="muted mini" style="margin-top:-6px">Te contestamos por WhatsApp.</p>
    <form id="fsol">
      <label class="f">Tu nombre *</label><input class="i" name="nombre" required maxlength="80">
      <label class="f">Tu WhatsApp *</label><input class="i" name="telefono" type="tel" required minlength="10" maxlength="15" placeholder="10 dígitos">
      <label class="f">¿Qué pastel te gustó?</label><select class="i" name="producto_id"><option value="">✨ Diseño especial / otro</option>
        ${prods.map(p => `<option value="${p.id}" ${p.id===prodId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select>
      <div class="grid2">
        <div><label class="f">¿Para cuántas personas?</label><input class="i" name="personas" type="number" min="1" max="1000" inputmode="numeric" value="20"></div>
        <div><label class="f">¿Para qué día?</label><input class="i" name="fecha_deseada" type="date" min="${min}"></div>
      </div>
      <label class="f">Sabor que te gustaría</label><input class="i" name="sabor" maxlength="80" placeholder="Ej. vainilla con fresa">
      <label class="f">Cuéntanos la idea</label><textarea class="i" name="mensaje" maxlength="1000" placeholder="Tema, colores, nombre que lleva…"></textarea>
      <label class="f">Foto de referencia (opcional)</label><input class="i" type="file" accept="image/*" id="solFoto">
      <input name="web" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      <button class="btn fucsia full" style="margin-top:14px">Enviar solicitud</button>
    </form>`, m => {
    $('#fsol', m).onsubmit = async e => {
      e.preventDefault(); const f = formData(e.target); if (f.web) return; // anti-spam
      const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Enviando…';
      try {
        const prod = prods.find(p => p.id === f.producto_id);
        const row = { nombre:f.nombre.trim(), telefono:f.telefono.trim(), producto_id:f.producto_id || null, producto_nombre:prod?.nombre || '',
          personas:f.personas || null, fecha_deseada:f.fecha_deseada || null, sabor:f.sabor, mensaje:f.mensaje, estado:'nueva' };
        const file = $('#solFoto', m).files[0];
        if (file) row.foto_ref_url = await DB.subir(await comprimir(file, 1400, 0.8), 'solicitudes');
        if (LOCAL) await DB.ins('solicitudes', row);
        else { const { error } = await S.sb.from('solicitudes').insert(row); if (error) throw error; }
        const resumen = `Hola, acabo de pedir una cotización en su catálogo 🎂\n• ${prod?.nombre || 'Diseño especial'} para ${row.personas || '?'} personas${row.fecha_deseada ? '\n• Para el ' + fCorta(row.fecha_deseada) : ''}\n• Soy ${row.nombre}`;
        $('.modal').innerHTML = `<div style="text-align:center"><div style="font-size:60px">🎉</div><h2>¡Solicitud enviada!</h2>
          <p>Gracias, ${esc(row.nombre)}. Te contestamos pronto por WhatsApp.</p>
          ${N.whatsapp ? `<a class="btn verde full" target="_blank" href="${waLink(N.whatsapp, resumen)}">💬 Avisar por WhatsApp (más rápido)</a>` : ''}
          <button class="btn sec full" style="margin-top:8px" onclick="closeModal()">Cerrar</button></div>`;
      } catch(err){ console.error(err); toast('⚠️ No se pudo enviar: ' + err.message, 5000); btn.disabled = false; btn.textContent = 'Enviar solicitud'; }
    };
  });
}

/* ---------- SIMULADOR DE PISOS Y TAMAÑOS ---------- */
function moldes(){
  return String((S.negocio && S.negocio.moldes) || '15:12,20:22,25:35,30:50').split(',')
    .map(x => x.split(':').map(Number)).filter(([d,p]) => d > 0 && p > 0).map(([d,p]) => ({ d, p })).sort((a,b) => a.d - b.d);
}
function sugerirPisos(personas){
  const M = moldes(); if (!M.length) return null;
  const combos = [];
  const rec = (desde, actual) => { if (actual.length) combos.push(actual.slice()); if (actual.length === 3) return;
    for (let i = desde; i < M.length; i++) rec(i + 1, [...actual, M[i]]); };
  rec(0, []);
  let mejor = null;
  combos.forEach(c => { const tot = c.reduce((s,x) => s + x.p, 0); if (tot < personas) return;
    const score = (tot - personas) + (c.length - 1) * 8; if (!mejor || score < mejor.score) mejor = { pisos:c.slice().sort((a,b) => b.d - a.d), total:tot, score }; });
  if (mejor) return mejor;
  const tres = M.slice(-3).sort((a,b) => b.d - a.d); const tot = tres.reduce((s,x) => s + x.p, 0);
  return { pisos:tres, total:tot, extra: personas - tot };
}
function dibujoPisos(r){
  if (!r) return '';
  const maxD = Math.max(...r.pisos.map(x => x.d)); const W = 300, h = 54; const H = r.pisos.length * h + 40;
  const colores = ['#F4ECF8','#FBF1A9','#F9DDF5'];
  let y = H - 14, svg = '';
  svg += `<rect x="20" y="${H-14}" width="${W-40}" height="8" rx="4" fill="#9B78B4"/>`;
  r.pisos.forEach((t, i) => { const w = (W - 60) * (t.d / maxD); const x = (W - w) / 2; y -= h;
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h-4}" rx="10" fill="${colores[i%3]}" stroke="#9B78B4" stroke-width="3"/>
      <text x="${W/2}" y="${y + h/2 + 3}" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="800" font-size="15" fill="#4E2466">Ø ${t.d} cm · ${t.p} porc.</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:320px;display:block;margin:6px auto">${svg}</svg>`;
}
function textoPisos(r, personas){
  if (!r) return '';
  return `${r.pisos.length === 1 ? '1 piso' : r.pisos.length + ' pisos'} (${r.pisos.map(x => x.d + ' cm').join(' + ')}) · alcanza para ~${r.total} porciones`
    + (r.extra > 0 ? ` + un pastel de cocina para ${r.extra} más` : '');
}
function htmlSimulador(personas){
  const r = sugerirPisos(personas);
  return `${dibujoPisos(r)}<p style="text-align:center;font-weight:800;color:var(--morado-o);margin:4px 0">${textoPisos(r, personas)}</p>
    <p class="muted mini" style="text-align:center">Porciones de fiesta aproximadas. El tamaño final lo confirma Hilda según el diseño.</p>`;
}
ruta('simulador', () => {
  pagina('Simulador de pisos', `
    <div class="card"><label class="f" style="margin-top:0">¿Para cuántas personas?</label>
      <input class="i" type="number" inputmode="numeric" id="simP" value="40" style="font-size:22px;font-weight:800">
      <div id="simR"></div></div>
    <div class="card"><h3>Tus moldes</h3><p class="muted mini">Diámetro y porciones que salen de cada molde: <b>${moldes().map(m => `${m.d} cm = ${m.p}`).join(' · ')}</b>.
      ${isAdmin() ? 'Cámbialos en <a href="#/ajustes">Ajustes</a> con tus medidas reales.' : ''}</p></div>
  `, { atras:true, nav:'mas' });
  const upd = () => { $('#simR').innerHTML = htmlSimulador(Math.max(1, num($('#simP').value))); };
  $('#simP').oninput = upd; upd();
});
function simuladorPublico(){
  modal(`<h2>🎂 ¿De qué tamaño lo necesito?</h2>
    <label class="f">¿Cuántas personas van a comer?</label><input class="i" type="number" inputmode="numeric" id="simPP" value="30" style="font-size:22px;font-weight:800">
    <div id="simRP"></div>
    <button class="btn fucsia full" onclick="formSolicitudPublica('')">📝 Pedir cotización</button>
    <button class="btn sec full" style="margin-top:8px" onclick="closeModal()">Cerrar</button>`, m => {
    const upd = () => { $('#simRP', m).innerHTML = htmlSimulador(Math.max(1, num($('#simPP', m).value))); };
    $('#simPP', m).oninput = upd; upd();
  });
}

/* ---------- TEXTOS PARA REDES (plantillas, sin costo) ---------- */
const azar = a => a[Math.floor(Math.random() * a.length)];
function generarTextos(prod, ocasion, tono){
  const N = { ...NEGOCIO_DEF, ...S.negocio };
  const nombre = prod?.nombre || 'nuestros pasteles';
  const det = prod?.descripcion ? prod.descripcion.replace(/\.$/, '') : '';
  const precio = prod ? precioTxt(prod) : '';
  const tem = ocasion === 'temporada' ? proximasTemporadas()[0] : null;
  const ocas = { cumple:['para ese cumpleaños especial 🎉','para celebrar un año más 🥳','para el festejo de cumpleaños 🎈'], boda:['para tu boda o XV años 💍','para ese día inolvidable ✨'],
    baby:['para tu baby shower 🍼','para recibir al nuevo integrante de la familia 👶'], temporada: tem ? [`para ${tem.n} ${tem.e}`, `este ${tem.n} ${tem.e}`] : ['para esta temporada'], ninguna:['para cualquier ocasión 💜','para endulzar tu día 🍰'] }[ocasion] || [''];
  const ap = { alegre:['¡Mira nada más qué belleza! 😍','¡Recién salido de la cocina! 🎂','¡Así quedó este pastel y nos encantó! 💜'],
    elegante:['Detalles que hacen la diferencia.','Hecho a mano, con cariño y paciencia.','Cada pastel cuenta una historia.'],
    promo:['📣 ¡Ya estamos tomando pedidos!','⏰ ¡Aparta tu fecha!','🔥 ¡Últimos lugares de la semana!'] }[tono] || [''];
  const cta = [`Pide el tuyo por WhatsApp${N.whatsapp ? ' 👉 ' + N.whatsapp : ''}.`, 'Escríbenos por mensaje y te cotizamos sin compromiso.', 'Aparta tu fecha con anticipo. ¡Cupo limitado por día!'];
  const tags = ['#HildaVelPer', '#PastelesYPostres', '#PastelesPersonalizados', '#PastelesCaseros', '#Repostería', '#PurísimaDelRincón', '#SanFranciscoDelRincón', '#LeónGto',
    prod?.categoria === 'Cupcakes' ? '#Cupcakes' : prod?.categoria === 'Gelatinas' ? '#GelatinasArtísticas' : '#PastelDeCumpleaños', tem ? '#' + tem.n.replace(/\s+/g,'') : ''].filter(Boolean);
  return [0,1,2].map(i => [
    azar(ap), '',
    `${nombre}${det ? ': ' + det.charAt(0).toLowerCase() + det.slice(1) : ''}, ${azar(ocas)}.`,
    precio && precio !== 'Cotizar' && tono === 'promo' ? (preciosDe(prod).length ? `💰 Desde ${money(preciosDe(prod)[0][1])} (${preciosDe(prod)[0][0]} personas)` : `💰 ${precio}${prod?.personas ? ' (' + prod.personas + ' personas)' : ''}`) : '',
    azar(cta), '', tags.slice(0, 6 + i).join(' ')
  ].filter((x, k, a) => x !== '' || (k > 0 && a[k-1] !== '')).join('\n').trim());
}
function modalTextos(prodId){
  const prod = prodId ? byId('productos', prodId) : null;
  let oc = 'ninguna', to = 'alegre';
  const pintar = m => {
    const tx = generarTextos(prod, oc, to);
    $('#txo', m).innerHTML = tx.map((t, i) => `<div class="card" style="white-space:pre-wrap;font-size:14px">${esc(t)}
      <button class="btn chico" style="margin-top:8px" data-cp="${i}">📋 Copiar</button></div>`).join('');
    $$('[data-cp]', m).forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(tx[b.dataset.cp]); toast('📋 Copiado, pégalo en tu publicación'); } catch(e){ prompt('Copia:', tx[b.dataset.cp]); } });
  };
  modal(`<h2>✍️ Textos para redes</h2>${prod ? `<p class="muted mini" style="margin-top:-6px">${esc(prod.nombre)}</p>` : ''}
    <label class="f">Ocasión</label><div class="chips" style="flex-wrap:wrap" id="txOc">${[['ninguna','Cualquiera'],['cumple','Cumpleaños'],['boda','Boda / XV'],['baby','Baby shower'],['temporada','Temporada']]
      .map(([k,v]) => `<button class="chip ${k===oc?'on':''}" data-oc="${k}">${v}</button>`).join('')}</div>
    <label class="f">Tono</label><div class="chips" id="txTo">${[['alegre','😄 Alegre'],['elegante','✨ Elegante'],['promo','📣 Promoción']].map(([k,v]) => `<button class="chip ${k===to?'on':''}" data-to="${k}">${v}</button>`).join('')}</div>
    <div id="txo"></div>
    <div class="grid2"><button class="btn sec" id="txOtra">🔄 Otras ideas</button><button class="btn sec" onclick="closeModal()">Cerrar</button></div>`, m => {
    $$('[data-oc]', m).forEach(b => b.onclick = () => { oc = b.dataset.oc; $$('[data-oc]', m).forEach(x => x.classList.toggle('on', x === b)); pintar(m); });
    $$('[data-to]', m).forEach(b => b.onclick = () => { to = b.dataset.to; $$('[data-to]', m).forEach(x => x.classList.toggle('on', x === b)); pintar(m); });
    $('#txOtra', m).onclick = () => pintar(m);
    pintar(m);
  });
}

/* ---------- DATOS DE PAGO ---------- */
function mensajePago(p){
  const a = A(); const pg = pagado(p.id); const tot = totalPedido(p);
  const monto = pg > 0 ? Math.max(0, saldo(p)) : Math.ceil(tot * num(a.anticipo_pct || 50) / 100 / 10) * 10;
  return `Hola ${p.cliente} 🎂 ${pg > 0 ? `Para liquidar tu pedido restan ${money(monto)}` : `Para apartar tu pedido el anticipo es de ${money(monto)} (total ${money(tot)})`}.\n`
    + (a.pago_info ? `\n💳 ${a.pago_info}\n` : '') + (a.link_pago ? `\n🔗 También puedes pagar aquí: ${a.link_pago}\n` : '')
    + `\nCuando pagues, mándame tu comprobante por aquí. ¡Gracias! 💜`;
}
function botonPago(p){
  const a = A();
  if (!p.telefono) return '';
  if (!a.pago_info && !a.link_pago) return isAdmin() ? '<p class="muted mini">💳 Pon tus datos de pago (CLABE o link) en Ajustes para mandarlos con un toque.</p>' : '';
  return `<a class="btn sec full" style="margin-top:8px" target="_blank" href="${waLink(p.telefono, mensajePago(p))}">💳 Mandar datos de pago</a>`;
}

/* ---------- ALERTA DE PRECIOS ---------- */
function costoReceta2(rid, anterior=false){
  return S.d.receta_insumos.filter(x => x.receta_id === rid).reduce((s, x) => { const i = byId('insumos', x.insumo_id); if (!i) return s;
    const precio = anterior && num(i.precio_anterior) > 0 ? num(i.precio_anterior) : num(i.presentacion_precio);
    return s + num(x.cantidad) * precio / Math.max(0.0001, num(i.presentacion_cantidad)); }, 0);
}
function costoProducto(prod, personas){
  const a = A(); const rs = (prod.recetas || []).map(id => byId('recetas', id)).filter(Boolean); if (!rs.length) return null;
  let ing = 0, horas = 0;
  rs.forEach(r => { const f = personas / Math.max(1, num(r.rinde_personas)); ing += costoReceta2(r.id) * f; horas += num(r.horas) * Math.max(1, Math.sqrt(f)); });
  horas = Math.round(horas * 2) / 2;
  return ing + horas * num(a.tarifa_hora) + num(a.gastos_fijos_mes) / Math.max(1, num(a.pedidos_mes)) + num(a.empaque_default);
}
function analisisPrecios(){
  const a = A(); const lim = ymd(addDays(new Date(), -60)); const mm = num(a.margen_minimo || 25); const r = Math.max(1, num(a.redondeo));
  const insumos = S.d.insumos.filter(i => num(i.precio_anterior) > 0 && num(i.presentacion_precio) > num(i.precio_anterior) && (i.precio_cambio || '') >= lim)
    .map(i => ({ i, pct: (num(i.presentacion_precio) / num(i.precio_anterior) - 1) * 100 })).sort((x,y) => y.pct - x.pct);
  const productos = [];
  S.d.productos.forEach(p => preciosDe(p).forEach(([tam, precio]) => { const c = costoProducto(p, tam); if (c == null) return;
    const margen = (precio - c) / precio * 100;
    if (margen < mm) productos.push({ p, tam, precio, costo:c, margen, sugerido: Math.ceil(c * (1 + num(a.margen_pct)/100) / r) * r }); }));
  const recetas = S.d.recetas.map(rc => ({ rc, antes:costoReceta2(rc.id, true), ahora:costoReceta2(rc.id) })).filter(x => x.ahora > x.antes * 1.02);
  return { insumos, productos, recetas, mm };
}
ruta('alertas', () => {
  if (!isAdmin()) return ir('#/hoy');
  const R = analisisPrecios();
  const sinRecetas = S.d.productos.filter(p => preciosDe(p).length && !(p.recetas || []).length).length;
  pagina('Alerta de precios', `
    <p class="muted">Revisa si al subir los ingredientes algún pastel quedó dejando poca ganancia (menos de ${R.mm}%).</p>
    <div class="card"><h2>📈 Ingredientes que subieron</h2>
      ${R.insumos.length ? R.insumos.map(x => `<div class="li"><div class="grow"><div class="t">${esc(x.i.nombre)}</div><div class="muted mini">${money2(x.i.precio_anterior)} → ${money2(x.i.presentacion_precio)} · ${fCorta(x.i.precio_cambio)}</div></div>
        <b style="color:var(--error)">+${x.pct.toFixed(0)}%</b></div>`).join('') : '<p class="muted">Ningún aumento en los últimos 60 días. 👍</p>'}</div>
    ${R.recetas.length ? `<div class="card"><h2>📒 Recetas que salen más caras</h2>${R.recetas.map(x => `<div class="res"><span>${esc(x.rc.nombre)}</span><span>${money2(x.antes)} → <b style="color:var(--error)">${money2(x.ahora)}</b></span></div>`).join('')}</div>` : ''}
    <div class="card"><h2>⚠️ Precios con poca ganancia</h2>
      ${R.productos.length ? R.productos.map((x, k) => `<div class="li"><div class="grow"><div class="t">${esc(x.p.nombre)} · ${x.tam} pers.</div>
        <div class="muted mini">Cobras ${money(x.precio)} · te cuesta ${money(x.costo)} · ganas <b style="color:${x.margen < 0 ? 'var(--error)' : 'var(--alerta)'}">${x.margen.toFixed(0)}%</b></div></div>
        <button class="btn fucsia chico" onclick="ajustarPrecioTam('${x.p.id}',${x.tam},${x.sugerido})">Subir a ${money(x.sugerido)}</button></div>`).join('')
      : '<p class="muted">Todos tus precios por tamaño dejan buena ganancia. 🎉</p>'}
      ${sinRecetas ? `<p class="nota">${sinRecetas} producto(s) con tabla de precios no tienen recetas asignadas. Ábrelos en el catálogo → Editar datos → "Recetas que lleva" para que entren en esta revisión.</p>` : ''}</div>
  `, { atras:true, nav:'mas' });
});
async function ajustarPrecioTam(pid, tam, nuevo){
  const p = byId('productos', pid);
  await guardar(() => DB.upd('productos', pid, { precios: { ...(p.precios || {}), [tam]: nuevo } }), `✅ ${p.nombre} ${tam} pers. = ${money(nuevo)}`);
  await recargar('productos'); render();
}
function tarjetaAlertas(){
  if (!isAdmin()) return '';
  const R = analisisPrecios(); const n = R.productos.length + R.insumos.length; if (!n) return '';
  return `<a class="card" href="#/alertas" style="display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit;border:2px solid var(--alerta)">
    <span style="font-size:28px">📈</span><div class="grow"><b>Alerta de precios</b><div class="muted mini">${R.insumos.length ? R.insumos.length + ' ingrediente(s) subieron' : ''}${R.insumos.length && R.productos.length ? ' · ' : ''}${R.productos.length ? R.productos.length + ' precio(s) con poca ganancia' : ''}</div></div><span style="font-size:22px">›</span></a>`;
}

/* ---------- RESPALDO ---------- */
async function descargarRespaldo(){
  toast('Preparando respaldo…');
  try {
    if (!window.XLSX) await cargarScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    const wb = XLSX.utils.book_new();
    const plano = r => Object.fromEntries(Object.entries(r).map(([k,v]) => [k, v && typeof v === 'object' ? JSON.stringify(v) : (typeof v === 'string' && v.startsWith('data:') ? '(foto)' : v)]));
    const hojas = { pedidos:'Pedidos', clientes:'Clientes', pagos:'Pagos', movimientos:'Cuentas', productos:'Catálogo', insumos:'Materia prima', recetas:'Recetas',
      receta_insumos:'Recetas-ingredientes', pedido_recetas:'Pedidos-recetas', tareas:'Tareas', solicitudes:'Solicitudes', mejoras:'Mejoras' };
    Object.entries(hojas).forEach(([t, n]) => { const rows = (S.d[t] || []).map(plano); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ vacio:'' }]), n.slice(0,31)); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([plano(S.ajustes), plano(S.negocio)]), 'Ajustes');
    XLSX.writeFile(wb, `HildaVelPer-respaldo-${hoy()}.xlsx`);
    localStorage.setItem('hv_respaldo', hoy()); toast('✅ Respaldo descargado');
  } catch(e){ toast('⚠️ No se pudo crear el respaldo: ' + e.message, 5000); }
}
function tarjetaRespaldo(){
  if (!isAdmin()) return '';
  const u = localStorage.getItem('hv_respaldo');
  if (u && u >= ymd(addDays(new Date(), -30))) return '';
  return `<div class="card row"><span style="font-size:26px">💾</span><div class="grow"><b>Respaldo del mes</b><div class="muted mini">${u ? 'Último: ' + fCorta(u) : 'Aún no has hecho ninguno'}. Toma 5 segundos.</div></div>
    <button class="btn chico" onclick="descargarRespaldo().then(render)">Descargar</button></div>`;
}
