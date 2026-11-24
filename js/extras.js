/* =====================================================================
   v1.2.0 · Clientes · Plantillas de WhatsApp · Temporadas · Estadísticas
            Antes y después · Ruta de entregas · Precios por tamaño
            Alacena · Avisos en el celular · Meta del mes
   ===================================================================== */

/* ---------- CLIENTES ---------- */
const normTel = t => String(t || '').replace(/\D/g,'').slice(-10);
const pedidosDe = cid => S.d.pedidos.filter(p => p.cliente_id === cid && p.estado !== 'cancelado');
const vendidos = lista => lista.filter(p => !['cotizacion','cancelado'].includes(p.estado));
const totalCliente = cid => vendidos(pedidosDe(cid)).reduce((s,p) => s + totalPedido(p), 0);
const esFrecuente = cid => vendidos(pedidosDe(cid)).length >= 3;

/* Busca al cliente por teléfono o por nombre; si no existe lo crea */
async function asegurarCliente(nombre, telefono){
  const t = normTel(telefono), n = nombre.trim().toLowerCase();
  let c = (t && S.d.clientes.find(x => normTel(x.telefono) === t)) || S.d.clientes.find(x => x.nombre.trim().toLowerCase() === n);
  if (!c){ c = await DB.ins('clientes', { nombre:nombre.trim(), telefono:telefono || '', notas:'' }); await recargar('clientes'); }
  else if (t && !normTel(c.telefono)){ await DB.upd('clientes', c.id, { telefono }); await recargar('clientes'); }
  return c;
}

let busCli = '';
ruta('clientes', () => {
  let l = S.d.clientes.slice();
  if (busCli) l = l.filter(c => (c.nombre + ' ' + c.telefono).toLowerCase().includes(busCli.toLowerCase()));
  l.sort((a,b) => (vendidos(pedidosDe(b.id)).length - vendidos(pedidosDe(a.id)).length) || a.nombre.localeCompare(b.nombre));
  pagina('Clientes', `
    <div class="row" style="margin-bottom:10px"><input class="i grow" placeholder="🔍 Buscar cliente" value="${esc(busCli)}" oninput="busCli=this.value;clearTimeout(window._tb);window._tb=setTimeout(()=>{render();const i=document.querySelector('main input');i.focus();i.setSelectionRange(99,99)},350)">
      <button class="btn" onclick="modalCliente()">＋ Nuevo</button></div>
    <p class="muted mini">⭐ = cliente frecuente (3 pedidos o más)</p>
    <div class="card">${l.length ? l.map(c => { const n = vendidos(pedidosDe(c.id)).length; return `<a class="li" href="#/cliente/${c.id}" style="text-decoration:none;color:inherit">
      <div class="ic">${esFrecuente(c.id) ? '⭐' : '👤'}</div>
      <div class="grow"><div class="t">${esc(c.nombre)}</div><div class="muted mini">${n} pedido${n===1?'':'s'}${c.telefono ? ' · ' + esc(c.telefono) : ''}${c.cumpleanos ? ' · 🎂 ' + fCorta(c.cumpleanos).slice(4) : ''}</div></div>
      ${isAdmin() ? `<span class="money mini">${money(totalCliente(c.id))}</span>` : ''}</a>`; }).join('') : vacio('👥','Aún no hay clientes. Se agregan solos al guardar pedidos.')}</div>
  `, { atras:true, nav:'mas' });
});
ruta('cliente', id => {
  const c = byId('clientes', id);
  if (!c) return pagina('Cliente', vacio('🤔','No encontré ese cliente.'), { atras:true, nav:'mas' });
  const ps = pedidosDe(id).sort((a,b) => b.fecha_entrega.localeCompare(a.fecha_entrega));
  const v = vendidos(ps);
  pagina(c.nombre, `
    <div class="card">
      <div class="row between"><h2 style="margin:0">${esFrecuente(id) ? '⭐ ' : ''}${esc(c.nombre)}</h2><button class="btn sec chico" onclick="modalCliente('${id}')">✏️</button></div>
      <p class="muted" style="margin:6px 0">${c.telefono ? '📱 ' + esc(c.telefono) : 'Sin teléfono'}${c.cumpleanos ? ' · 🎂 ' + fCorta(c.cumpleanos).slice(4) : ''}</p>
      ${c.notas ? `<div class="nota">${esc(c.notas)}</div>` : ''}
      <div class="grid3" style="margin:10px 0">
        <div class="stat"><b>${v.length}</b><small>pedidos</small></div>
        ${isAdmin() ? `<div class="stat"><b>${money(totalCliente(id))}</b><small>en total</small></div>
        <div class="stat"><b>${v.length ? money(totalCliente(id) / v.length) : '—'}</b><small>promedio</small></div>` : ''}
      </div>
      <div class="row wrap">
        <button class="btn chico" onclick="S.borradorPedido={cliente:${esc(JSON.stringify(c.nombre))},telefono:${esc(JSON.stringify(c.telefono||''))},cliente_id:'${id}'};ir('#/pedido-nuevo')">＋ Pedido</button>
        ${ps[0] ? `<button class="btn sec chico" onclick="duplicarPedido('${ps[0].id}')">🔁 Repetir el último</button>` : ''}
        ${c.telefono ? `<a class="btn verde chico" target="_blank" href="${waLink(c.telefono, '¡Hola ' + c.nombre + '! ')}">💬 WhatsApp</a>` : ''}
      </div>
    </div>
    <div class="card"><h2>Sus pedidos</h2>${ps.length ? ps.map(pedidoMini).join('') : '<p class="muted">Sin pedidos.</p>'}</div>
  `, { atras:true, nav:'mas' });
});
function modalCliente(id){
  const c = id ? byId('clientes', id) : { nombre:'', telefono:'', cumpleanos:'', notas:'' };
  modal(`<h2>${id ? 'Editar' : 'Nuevo'} cliente</h2><form id="fcl">
    <label class="f">Nombre</label><input class="i" name="nombre" required value="${esc(c.nombre)}">
    <label class="f">WhatsApp / teléfono</label><input class="i" name="telefono" type="tel" value="${esc(c.telefono || '')}">
    <label class="f">Cumpleaños (opcional)</label><input class="i" name="cumpleanos" type="date" value="${esc(c.cumpleanos || '')}">
    <label class="f">Notas (gustos, alergias, cómo le gusta el pastel…)</label><textarea class="i" name="notas">${esc(c.notas || '')}</textarea>
    <button class="btn full" style="margin-top:14px">Guardar</button>
    ${id && isAdmin() ? '<button type="button" class="btn peligro full" style="margin-top:8px" id="bcl">Eliminar cliente</button>' : ''}</form>`, m => {
    $('#fcl', m).onsubmit = async e => { e.preventDefault(); const f = formData(e.target); f.cumpleanos = f.cumpleanos || null;
      const r = await guardar(() => id ? DB.upd('clientes', id, f) : DB.ins('clientes', f), '✅ Guardado');
      await recargar('clientes'); closeModal(); id ? render() : ir('#/cliente/' + r.id); };
    $('#bcl', m) && ($('#bcl', m).onclick = async () => { if (!await confirmar('¿Eliminar cliente? Sus pedidos se conservan.')) return;
      await guardar(() => DB.del('clientes', id), 'Eliminado'); await recargar('clientes'); closeModal(); ir('#/clientes'); });
  });
}

/* ---------- DUPLICAR PEDIDO ---------- */
function duplicarPedido(pid){
  const p = byId('pedidos', pid); if (!p) return;
  const campos = ['cliente','telefono','cliente_id','producto_id','descripcion','personas','sabor','relleno','decoracion','tipo_entrega','direccion','envio','precio','costo','notas'];
  S.borradorPedido = Object.fromEntries(campos.map(k => [k, p[k]]));
  S.borradorPedido.estado = 'confirmado'; S.borradorPedido._precioFijo = true;
  S.borradorPedido.recetas = S.d.pedido_recetas.filter(r => r.pedido_id === pid).map(r => r.receta_id);
  toast('🔁 Copié el pedido: solo elige la nueva fecha');
  ir('#/pedido-nuevo');
}

/* ---------- PLANTILLAS DE WHATSAPP ---------- */
const PLANTILLAS_DEF = {
  confirmacion: { t:'✅ Confirmar pedido', txt:'¡Hola {cliente}! 🎂 Te confirmo tu pedido con {negocio}:\n• {pastel} para {personas} personas\n• {entrega} el {fecha} a las {hora}\n• Total: {total} · Anticipo: {anticipo} · Resta: {resta}\n¡Gracias por tu preferencia! 💜' },
  listo:        { t:'🎂 Ya está listo', txt:'¡Hola {cliente}! Tu pastel ya está listo 🎉 {entrega} el {fecha} a las {hora}. Resta por pagar: {resta}. ¡Gracias!' },
  saldo:        { t:'💵 Recordar saldo', txt:'Hola {cliente}, te recuerdo con cariño que tu pedido del {fecha} tiene un saldo de {resta}. Puede ser en efectivo al recibirlo o por transferencia. ¡Gracias! 💜' },
  resena:       { t:'⭐ Pedir reseña', txt:'¡Hola {cliente}! ¿Qué tal estuvo el pastel? 🎂 Si te gustó, nos ayudarías muchísimo con una reseña aquí: {resena} ¡Mil gracias! 💜' },
  gracias:      { t:'💜 Dar las gracias', txt:'¡Gracias por tu preferencia, {cliente}! 💜 Esperamos que hayan disfrutado el pastel. Si te gustó, nos ayuda muchísimo que compartas una foto y nos etiquetes. — {negocio}' }
};
const plantilla = k => ({ ...PLANTILLAS_DEF[k], txt: ((S.ajustes.plantillas || {})[k]) || PLANTILLAS_DEF[k].txt });
function llenarPlantilla(txt, p){
  const e = new Date(p.fecha_entrega); const prod = p.producto_id ? byId('productos', p.producto_id) : null;
  const v = { cliente:p.cliente, negocio:S.negocio.nombre || 'Hilda VelPer', pastel:p.descripcion || prod?.nombre || 'Pastel', personas:p.personas,
    fecha:`${DIAS[e.getDay()]} ${e.getDate()} de ${MESES[e.getMonth()]}`, hora:hm(e), total:money(totalPedido(p)), anticipo:money(pagado(p.id)),
    resta:money(Math.max(0, saldo(p))), entrega: p.tipo_entrega === 'domicilio' ? 'Te lo llevamos' : 'Puedes pasar por él', sabor:p.sabor || '',
    resena: S.negocio.resena_google || S.negocio.resena_facebook || S.negocio.facebook || (location.origin + location.pathname + '?catalogo') };
  return txt.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
}
function botonesPlantillas(p){
  if (!p.telefono) return '<p class="muted mini">Agrega el teléfono del cliente para mandarle mensajes.</p>';
  return `<div class="grid2">${Object.keys(PLANTILLAS_DEF).map(k => `<a class="btn verde chico" target="_blank" href="${waLink(p.telefono, llenarPlantilla(plantilla(k).txt, p))}">${plantilla(k).t}</a>`).join('')}</div>`;
}

/* ---------- RUTA DE ENTREGAS ---------- */
function rutaDelDia(fecha){
  const l = S.d.pedidos.filter(p => p.tipo_entrega === 'domicilio' && p.direccion && !['cancelado','cotizacion'].includes(p.estado) && ymd(new Date(p.fecha_entrega)) === fecha)
    .sort((a,b) => a.fecha_entrega.localeCompare(b.fecha_entrega));
  if (!l.length) return '';
  const dirs = l.map(p => p.direccion);
  const url = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + encodeURIComponent(dirs[dirs.length-1])
    + (dirs.length > 1 ? '&waypoints=' + encodeURIComponent(dirs.slice(0,-1).join('|')) : '');
  return `<a class="btn sec chico" target="_blank" href="${url}" style="margin-top:8px">🗺️ Ruta de entregas (${l.length})</a>`;
}

/* ---------- CAPACIDAD POR DÍA ---------- */
const pedidosDelDia = (fecha, sinId) => S.d.pedidos.filter(p => p.id !== sinId && !['cancelado','cotizacion'].includes(p.estado) && ymd(new Date(p.fecha_entrega)) === fecha);
function avisoCapacidad(fecha, sinId){
  const n = pedidosDelDia(fecha, sinId).length; const cap = num(A().capacidad_dia) || 3;
  if (n >= cap) return `<div class="nota" style="border-color:var(--error)">⚠️ Ya hay <b>${n}</b> pedido${n===1?'':'s'} para ese día (tu límite es ${cap}). ¿Seguro que alcanza el tiempo?</div>`;
  if (n > 0) return `<p class="muted mini">Ese día ya hay ${n} pedido${n===1?'':'s'}.</p>`;
  return '';
}

/* ---------- PRECIOS POR TAMAÑO ---------- */
const tamanos = () => String(A().tamanos || '10,20,30,50').split(',').map(x => parseInt(x)).filter(x => x > 0).sort((a,b) => a-b);
const preciosDe = p => Object.entries(p?.precios || {}).map(([k,v]) => [parseInt(k), num(v)]).filter(([k,v]) => k > 0 && v > 0).sort((a,b) => a[0]-b[0]);
function precioPorTamano(prod, personas){
  const t = preciosDe(prod); if (!t.length) return null;
  const hit = t.find(([k]) => k >= personas);
  if (hit) return { precio:hit[1], tam:hit[0] };
  const [k, v] = t[t.length-1]; const r = Math.max(1, num(A().redondeo));
  return { precio: Math.ceil(v * personas / k / r) * r, tam: personas, extra:true };
}
function tablaTamanos(prod){
  const t = preciosDe(prod); if (!t.length) return '';
  return `<table class="tabla" style="margin-top:8px">${t.map(([k,v]) => `<tr><td>👥 ${k} personas</td><td class="r"><b style="color:var(--fucsia)">${money(v)}</b></td></tr>`).join('')}</table>`;
}

/* ---------- ANTES Y DESPUÉS ---------- */
ruta('galeria', () => {
  const l = S.d.pedidos.filter(p => p.foto_final_url).sort((a,b) => b.fecha_entrega.localeCompare(a.fecha_entrega));
  pagina('Antes y después', `
    <p class="muted">Pasteles terminados. Toca uno para ver la foto de referencia y crear la publicación.</p>
    ${l.length ? `<div class="prod-grid">${l.map(p => `<a class="prod" href="#/pedido/${p.id}"><div class="ph" style="background-image:url('${esc(p.foto_final_url)}')">${p.foto_ref_url ? '<span class="star">antes / después</span>' : ''}</div>
      <div class="tx"><b>${esc(p.descripcion || p.cliente)}</b><small class="muted">${fCorta(p.fecha_entrega)}</small></div></a>`).join('')}</div>`
      : vacio('📷','Cuando entregues un pastel, sube su foto en el pedido (sección "Pastel terminado").')}
  `, { atras:true, nav:'mas' });
});
ruta('antes-despues', async pid => {
  const p = byId('pedidos', pid);
  if (!p || !p.foto_final_url) return pagina('Antes y después', vacio('📷','Falta la foto del pastel terminado.'), { atras:true, nav:'pedidos' });
  pagina('Antes y después', `
    <div class="editor-wrap"><canvas id="cad"></canvas></div>
    <div class="grid2" style="margin:10px 0">
      <button class="btn verde" id="adc">📤 Compartir</button><button class="btn sec" id="add">⬇️ Descargar</button></div>
    <div class="card"><label class="f" style="margin-top:0">Título</label><input class="i" id="adt" value="${esc(p.foto_ref_url ? 'Lo soñaste · Lo hicimos' : (p.descripcion || 'Hecho con amor'))}">
      <p class="muted mini">${p.foto_ref_url ? 'Izquierda: la foto que mandó el cliente. Derecha: el pastel terminado.' : 'Este pedido no tiene foto de referencia: se usa solo la foto final.'}</p></div>
  `, { atras:true, nav:'pedidos' });
  const cv = $('#cad'); const W = 1080, H = 1350; cv.width = W; cv.height = H; const c = cv.getContext('2d');
  let ref = null, fin = null, sello = null;
  try { fin = await cargarImg(p.foto_final_url); } catch(e){}
  try { if (p.foto_ref_url) ref = await cargarImg(p.foto_ref_url); } catch(e){}
  try { sello = await cargarImg('img/logo-sello.png'); } catch(e){}
  try { await document.fonts.load('700 80px "Dancing Script"'); } catch(e){}
  const cubrir = (img, x, y, w, h) => { const s = Math.max(w/img.naturalWidth, h/img.naturalHeight); const dw = img.naturalWidth*s, dh = img.naturalHeight*s;
    c.save(); redondeado(c, x, y, w, h, 22); c.clip(); c.drawImage(img, x + (w-dw)/2, y + (h-dh)/2, dw, dh); c.restore(); };
  const dib = () => {
    c.fillStyle = '#FFFBEA'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#FBF1A9'; c.beginPath(); c.arc(W-80, 90, 260, 0, 7); c.fill();
    c.textAlign = 'center'; c.fillStyle = '#D61FC4'; c.font = `700 ${ajustarFuente(c, $('#adt').value, W-120, 86, '"Dancing Script"')}px "Dancing Script", cursive`;
    c.fillText($('#adt').value, W/2, 130);
    const top = 190, bot = H - 190, hh = bot - top;
    if (ref && fin){
      const w = (W - 40*2 - 24) / 2;
      cubrir(ref, 40, top, w, hh); cubrir(fin, 40 + w + 24, top, w, hh);
      [['Inspiración', 40 + w/2], ['Nuestro pastel', 40 + w + 24 + w/2]].forEach(([t, x]) => {
        c.fillStyle = 'rgba(78,36,102,.85)'; redondeado(c, x - 150, top + 20, 300, 64, 32); c.fill();
        c.fillStyle = '#fff'; c.font = '800 34px Nunito, sans-serif'; c.fillText(t, x, top + 64); });
    } else if (fin) cubrir(fin, 40, top, W-80, hh);
    if (sello) c.drawImage(sello, W/2 - 85, H - 180, 170, 170);
  };
  dib(); $('#adt').oninput = dib;
  const blob = () => new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
  $('#adc').onclick = async () => compartirBlob(await blob(), 'antes-despues-' + (p.cliente || ''), $('#adt').value);
  $('#add').onclick = async () => { const a = document.createElement('a'); a.href = URL.createObjectURL(await blob()); a.download = 'antes-despues.jpg'; a.click(); };
});
async function subirFotoFinal(pid, input){
  const f = input.files[0]; if (!f) return;
  toast('Subiendo foto…');
  try { const url = await DB.subir(await comprimir(f), 'terminados'); await DB.upd('pedidos', pid, { foto_final_url:url }); await recargar('pedidos'); toast('📷 Foto guardada'); render(); }
  catch(e){ toast('⚠️ ' + e.message, 4000); }
}
async function finalAlCatalogo(pid){
  const p = byId('pedidos', pid);
  const r = await guardar(() => DB.ins('productos', { nombre:p.descripcion || 'Pastel personalizado', categoria:'Pasteles', descripcion:[p.sabor, p.relleno, p.decoracion].filter(Boolean).join(' · '),
    personas:p.personas, foto_url:p.foto_final_url, precio:null, precio_desde:true, publico:false, destacado:false, precios:{} }), '✅ Agregado al catálogo (oculto, revísalo)');
  await recargar('productos'); ir('#/producto-editar/' + r.id);
}

/* ---------- TEMPORADAS ---------- */
function tercerDomingoJunio(y){ const d = new Date(y, 5, 1); const off = (7 - d.getDay()) % 7; return new Date(y, 5, 1 + off + 14); }
const TEMPORADAS = [
  ['🍞','Rosca de Reyes', y => new Date(y,0,6), 'Abre pedidos de rosca desde mediados de diciembre.'],
  ['💘','San Valentín', y => new Date(y,1,14), 'Pasteles chicos de corazón, cupcakes en caja de 4 y 6.'],
  ['🧸','Día del Niño', y => new Date(y,3,30), 'Gelatinas y cupcakes de personajes para escuelas.'],
  ['💐','Día de las Madres', y => new Date(y,4,10), 'La fecha más fuerte: pide anticipo y cierra la agenda con tiempo.'],
  ['🍎','Día del Maestro', y => new Date(y,4,15), 'Paquetes de cupcakes para que los grupos regalen.'],
  ['👔','Día del Padre', tercerDomingoJunio, 'Diseños de asador, fútbol, herramientas.'],
  ['🎓','Graduaciones', y => new Date(y,6,1), 'Pasteles con birrete y gelatinas para fiestas de fin de curso.'],
  ['🇲🇽','Fiestas Patrias', y => new Date(y,8,15), 'Gelatinas tricolor y pasteles de bandera.'],
  ['🎃','Halloween y Día de Muertos', y => new Date(y,9,31), 'Calabazas, calaveritas y pan de muerto.'],
  ['🎄','Navidad', y => new Date(y,11,24), 'Pasteles navideños, galletas decoradas y bolsitas para regalo.'],
  ['🥂','Año Nuevo', y => new Date(y,11,31), 'Pasteles para cena y gelatinas de mosaico.']
];
function proximasTemporadas(){
  const h = parseYmd(hoy());
  return TEMPORADAS.map(([e, n, f, idea]) => { let d = f(h.getFullYear()); if (d < h) d = f(h.getFullYear()+1);
    return { e, n, d, idea, dias: Math.round((d - h) / 864e5) }; }).sort((a,b) => a.dias - b.dias);
}
ruta('temporadas', () => {
  pagina('Temporadas', `
    <p class="muted">Fechas fuertes del año para preparar promociones con tiempo. En <b>Hoy</b> te aviso ${num(A().aviso_temporada) || 21} días antes.</p>
    <div class="card">${proximasTemporadas().map(t => `<div class="li"><div class="ic">${t.e}</div>
      <div class="grow"><div class="t">${t.n}</div><div class="muted mini">${fCorta(t.d)} · ${t.idea}</div></div>
      <div style="text-align:right"><b style="color:${t.dias <= 21 ? 'var(--fucsia)' : 'var(--morado-o)'}">${t.dias === 0 ? '¡Hoy!' : t.dias + ' días'}</b></div></div>`).join('')}</div>
    <a class="btn full" href="#/editor">📸 Crear publicación de temporada</a>
  `, { atras:true, nav:'mas' });
});
function tarjetaTemporada(){
  const lim = num(A().aviso_temporada) || 21;
  const t = proximasTemporadas().filter(x => x.dias <= lim);
  if (!t.length) return '';
  return `<div class="card amarillo">${t.map(x => `<div class="row" style="margin-bottom:6px"><span style="font-size:28px">${x.e}</span>
    <div class="grow"><b>${x.n}</b> ${x.dias === 0 ? 'es hoy' : `en ${x.dias} días`}<div class="mini">${x.idea}</div></div></div>`).join('')}
    <a class="btn chico" href="#/editor">📸 Crear promoción</a> <a class="btn sec chico" href="#/temporadas">Ver todas</a></div>`;
}

/* ---------- PARA ESCRIBIRLE (cumpleaños y pedidos de hace un año) ---------- */
function tarjetaEscribirle(){
  const h = parseYmd(hoy()); const items = [];
  S.d.clientes.forEach(c => {
    if (!c.cumpleanos || !c.telefono) return;
    const b = parseYmd(c.cumpleanos); let d = new Date(h.getFullYear(), b.getMonth(), b.getDate()); if (d < h) d = new Date(h.getFullYear()+1, b.getMonth(), b.getDate());
    const dias = Math.round((d - h) / 864e5);
    if (dias <= 14) items.push({ dias, html:`🎂 <b>${esc(c.nombre)}</b> cumple ${dias === 0 ? 'hoy' : `en ${dias} días`}`, tel:c.telefono,
      msg:`¡Hola ${c.nombre}! Se acerca tu cumpleaños 🎉 ¿Te gustaría que te preparemos un pastel? 🎂` });
  });
  vendidos(S.d.pedidos).forEach(p => {
    const e = new Date(p.fecha_entrega); const aniv = new Date(e.getFullYear()+1, e.getMonth(), e.getDate());
    const dias = Math.round((aniv - h) / 864e5);
    if (dias >= 0 && dias <= 21 && p.telefono) items.push({ dias, html:`🔁 Hace un año <b>${esc(p.cliente)}</b> pidió “${esc(p.descripcion || 'un pastel')}” para el ${fCorta(aniv)}`, tel:p.telefono,
      msg:`¡Hola ${p.cliente}! El año pasado te hicimos un pastel para estas fechas 🎂 ¿Este año también lo celebran? Con gusto te cotizo 💜` });
  });
  if (!items.length) return '';
  items.sort((a,b) => a.dias - b.dias);
  return `<div class="card lila"><h2>Para escribirle</h2>${items.slice(0,6).map(x => `<div class="li"><div class="grow mini" style="font-size:14px">${x.html}</div>
    <a class="btn verde chico" target="_blank" href="${waLink(x.tel, x.msg)}">💬</a></div>`).join('')}</div>`;
}

/* ---------- META DEL MES ---------- */
function ingresosMes(ym){
  return S.d.pagos.filter(p => (p.fecha||'').startsWith(ym)).reduce((s,p) => s + num(p.monto), 0)
    + S.d.movimientos.filter(m => m.tipo === 'ingreso' && (m.fecha||'').startsWith(ym)).reduce((s,m) => s + num(m.monto), 0);
}
function tarjetaMeta(){
  if (!isAdmin()) return '';
  const meta = num(A().meta_mes); const d = new Date(); const ym = hoy().slice(0,7);
  if (!meta) return `<div class="card"><p class="muted" style="margin:0">🎯 Ponte una meta de ventas del mes en <a href="#/ajustes">Ajustes</a> y aquí verás tu avance.</p></div>`;
  const ing = ingresosMes(ym); const pct = Math.min(100, Math.round(ing / meta * 100));
  const diasMes = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); const pctTiempo = Math.round(d.getDate() / diasMes * 100);
  return `<div class="card"><div class="row between"><h2 style="margin:0">🎯 Meta de ${MESES[d.getMonth()]}</h2><b style="color:var(--morado-o)">${pct}%</b></div>
    <div style="background:var(--linea);border-radius:999px;height:16px;margin:10px 0;position:relative;overflow:hidden">
      <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--lila),var(--fucsia));border-radius:999px"></div>
      <div style="position:absolute;left:${pctTiempo}%;top:0;bottom:0;width:2px;background:var(--morado-o)" title="hoy"></div></div>
    <p class="mini muted" style="margin:0">${money(ing)} de ${money(meta)} · ${pct >= 100 ? '¡Meta cumplida! 🎉' : `faltan ${money(meta - ing)} · va el ${pctTiempo}% del mes`}</p></div>`;
}

/* ---------- ESTADÍSTICAS: ranking y clientes frecuentes ---------- */
let perEst = 'mes';
ruta('estadisticas', () => {
  if (!isAdmin()) return ir('#/hoy');
  const h = new Date(); let desde = '0000';
  if (perEst === 'mes') desde = hoy().slice(0,7);
  else if (perEst === '3m') desde = ymd(new Date(h.getFullYear(), h.getMonth()-2, 1));
  else if (perEst === 'anio') desde = String(h.getFullYear());
  const ps = vendidos(S.d.pedidos).filter(p => ymd(new Date(p.fecha_entrega)) >= desde && ymd(new Date(p.fecha_entrega)) <= ymd(addDays(h, 365)));
  const porProd = {};
  ps.forEach(p => { const k = p.producto_id || '_esp'; const r = porProd[k] = porProd[k] || { n:0, venta:0, gan:0, conCosto:0 };
    r.n++; r.venta += num(p.precio); if (p.costo){ r.gan += num(p.precio) - num(p.costo); r.conCosto++; } });
  const prods = Object.entries(porProd).map(([k, r]) => ({ nombre: k === '_esp' ? '✨ Diseños especiales' : (byId('productos', k)?.nombre || 'Producto borrado'), ...r }))
    .sort((a,b) => b.n - a.n || b.venta - a.venta);
  const porCli = {};
  ps.forEach(p => { const k = p.cliente_id || p.cliente; const r = porCli[k] = porCli[k] || { nombre:p.cliente, id:p.cliente_id, n:0, total:0 }; r.n++; r.total += totalPedido(p); });
  const clis = Object.values(porCli).sort((a,b) => b.n - a.n || b.total - a.total).slice(0, 10);
  const venta = ps.reduce((s,p) => s + totalPedido(p), 0);
  const diasSem = [0,0,0,0,0,0,0]; ps.forEach(p => diasSem[new Date(p.fecha_entrega).getDay()]++);
  const topDia = diasSem.indexOf(Math.max(...diasSem));
  const perLab = { mes:'Este mes', '3m':'3 meses', anio:'Este año', todo:'Todo' };
  pagina('Estadísticas', `
    <div class="chips">${Object.entries(perLab).map(([k,v]) => `<button class="chip ${perEst===k?'on':''}" onclick="perEst='${k}';render()">${v}</button>`).join('')}</div>
    <div class="grid3" style="margin-bottom:12px">
      <div class="stat"><b>${ps.length}</b><small>pedidos</small></div>
      <div class="stat"><b>${money(venta)}</b><small>vendido</small></div>
      <div class="stat"><b>${ps.length ? money(venta / ps.length) : '—'}</b><small>por pedido</small></div>
    </div>
    ${ps.length ? `<p class="muted mini">El día con más entregas es el <b>${['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][topDia]}</b> · promedio ${Math.round(ps.reduce((s,p)=>s+num(p.personas),0)/ps.length)} personas por pastel.</p>` : ''}
    <div class="card"><h2>🏆 Lo más vendido</h2>
      ${prods.length ? `<table class="tabla"><tr><th>Pastel</th><th class="r">Veces</th><th class="r">Vendido</th><th class="r">Ganancia</th></tr>
      ${prods.map((r,i) => `<tr><td>${i < 3 ? ['🥇','🥈','🥉'][i] + ' ' : ''}${esc(r.nombre)}</td><td class="r">${r.n}</td><td class="r">${money(r.venta)}</td>
        <td class="r">${r.conCosto ? `<b style="color:var(--ok)">${money(r.gan)}</b>${r.conCosto < r.n ? '*' : ''}` : '<span class="muted">—</span>'}</td></tr>`).join('')}</table>
      <p class="muted mini">La ganancia sale de los pedidos que se cotizaron con el cotizador (* = solo algunos).</p>` : vacio('📊','Sin pedidos en este periodo.')}</div>
    <div class="card"><h2>⭐ Mejores clientes</h2>
      ${clis.length ? clis.map((c,i) => `<a class="li" ${c.id ? `href="#/cliente/${c.id}"` : ''} style="text-decoration:none;color:inherit"><div class="ic">${i < 3 ? ['🥇','🥈','🥉'][i] : '👤'}</div>
        <div class="grow"><div class="t">${esc(c.nombre)}</div><div class="muted mini">${c.n} pedido${c.n===1?'':'s'}</div></div><span class="money">${money(c.total)}</span></a>`).join('')
      : '<p class="muted">Sin datos.</p>'}
      <p class="muted mini">Idea: a tus 3 mejores clientes mándales un detalle o un descuento en su siguiente pedido.</p></div>
  `, { atras:true, nav:'mas' });
});

/* ---------- ALACENA (inventario) ---------- */
async function sumarExistencia(insumoId, delta){
  if (LOCAL){ const i = byId('insumos', insumoId); if (!i) return; await DB.upd('insumos', insumoId, { existencia: Math.max(0, num(i.existencia) + delta) }); return; }
  const { error } = await S.sb.rpc('sumar_existencia', { p_insumo: insumoId, p_delta: delta }); if (error) throw error;
}
function consumoPedido(p){
  const tot = {};
  S.d.pedido_recetas.filter(x => x.pedido_id === p.id).forEach(pr =>
    S.d.receta_insumos.filter(ri => ri.receta_id === pr.receta_id).forEach(ri => { tot[ri.insumo_id] = (tot[ri.insumo_id] || 0) + num(ri.cantidad) * num(pr.factor); }));
  return tot;
}
async function descontarAlacena(p){
  if (p.descontado || p.estado !== 'entregado') return;
  const tot = consumoPedido(p); if (!Object.keys(tot).length) return;
  for (const [iid, c] of Object.entries(tot)) await sumarExistencia(iid, -c);
  await DB.upd('pedidos', p.id, { descontado:true });
  await recargar('insumos','pedidos'); toast('🥚 Se descontaron los ingredientes de la alacena');
}

/* ---------- AVISOS EN EL CELULAR ---------- */
async function prepararAvisos(){
  try {
    if (!('caches' in window)) return;
    const h = hoy(); const lim = ymd(addDays(new Date(), 14));
    const tareas = S.d.tareas.filter(t => !t.hecho && t.fecha >= h && t.fecha <= lim).map(t => ({ id:t.id, fecha:t.fecha, hora:t.hora || '', titulo:`${(TIPO_TAREA[t.tipo]||TIPO_TAREA.otro)[0]} ${t.titulo}`, pedido:t.pedido_id }));
    const c = await caches.open('hv-avisos');
    await c.put('avisos.json', new Response(JSON.stringify({ generado:new Date().toISOString(), tareas }), { headers:{ 'Content-Type':'application/json' } }));
  } catch(e){ console.warn('avisos', e); }
}
async function avisoAlAbrir(){
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (localStorage.getItem('hv_aviso_dia') === hoy()) return;
    const hoyT = S.d.tareas.filter(t => !t.hecho && t.fecha <= hoy());
    if (!hoyT.length) return;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(`Hilda VelPer · ${hoyT.length} pendiente${hoyT.length===1?'':'s'} para hoy`, {
      body: hoyT.slice(0,4).map(t => '• ' + t.titulo).join('\n'), icon:'icons/icon-192.png', badge:'icons/icon-192.png', tag:'hv-hoy', data:{ url:'./#/hoy' } });
    localStorage.setItem('hv_aviso_dia', hoy());
  } catch(e){ console.warn(e); }
}
async function activarAvisos(){
  if (!('Notification' in window)) return toast('Este celular no permite avisos desde el navegador');
  const p = await Notification.requestPermission();
  if (p !== 'granted') return toast('Sin permiso: actívalo en los ajustes del celular → Apps → Chrome → Notificaciones', 5000);
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in reg){ try { await reg.periodicSync.register('hv-avisos', { minInterval: 12 * 60 * 60 * 1000 }); } catch(e){} }
    await prepararAvisos();
    await reg.showNotification('¡Avisos activados! 🎂', { body:'Te avisaré de las tareas del día (comprar, hornear, decorar, entregar).', icon:'icons/icon-192.png', tag:'hv-prueba' });
  } catch(e){}
  localStorage.removeItem('hv_aviso_dia'); avisoAlAbrir(); render();
}
