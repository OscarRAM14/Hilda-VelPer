/* =====================================================================
   Hoy · Pedidos · Calendario · Tareas · Pagos
   ===================================================================== */
const pagado = pid => S.d.pagos.filter(p => p.pedido_id === pid).reduce((s,p) => s + num(p.monto), 0);
const totalPedido = p => num(p.precio) + num(p.envio);
const saldo = p => totalPedido(p) - pagado(p.id);
const activos = () => S.d.pedidos.filter(p => !['entregado','cancelado','cotizacion'].includes(p.estado));

function tareaHTML(t, { conPedido=true } = {}){
  const [ic] = TIPO_TAREA[t.tipo] || TIPO_TAREA.otro;
  const p = t.pedido_id ? byId('pedidos', t.pedido_id) : null;
  const atrasada = !t.hecho && t.fecha < hoy();
  return `<div class="li ${t.hecho?'hecho':''}">
    <div class="ic ${t.tipo}">${ic}</div>
    <div class="grow" ${p && conPedido ? `onclick="ir('#/pedido/${p.id}')"` : ''}>
      <div class="t">${esc(t.titulo)}</div>
      <div class="muted mini">${fCorta(t.fecha)}${t.hora ? ' · ' + t.hora + ' h' : ''}${atrasada ? ' · <b style="color:var(--error)">atrasada</b>' : ''}
        ${t.asignado_a ? ' · 👤 ' + esc(nombrePerfil(t.asignado_a)) : ''}</div>
    </div>
    <input type="checkbox" style="width:26px;height:26px;accent-color:var(--ok)" ${t.hecho?'checked':''} onchange="marcarTarea('${t.id}', this.checked)">
  </div>`;
}
async function marcarTarea(id, v){
  await guardar(() => DB.upd('tareas', id, { hecho:v }), v ? '✅ ¡Listo!' : 'Desmarcada');
  await recargar('tareas'); render();
}

/* ---------- HOY ---------- */
ruta('hoy', () => {
  const h = hoy(); const en7 = ymd(addDays(new Date(), 7));
  const pend = S.d.tareas.filter(t => !t.hecho && t.fecha <= h).sort((a,b) => a.fecha.localeCompare(b.fecha));
  const prox = S.d.tareas.filter(t => !t.hecho && t.fecha > h && t.fecha <= en7).sort((a,b) => (a.fecha+(a.hora||'')).localeCompare(b.fecha+(b.hora||'')));
  const entregas = activos().filter(p => ymd(new Date(p.fecha_entrega)) >= h).sort((a,b) => a.fecha_entrega.localeCompare(b.fecha_entrega)).slice(0,4);
  const mes = h.slice(0,7);
  const ingMes = S.d.pagos.filter(p => (p.fecha||'').startsWith(mes)).reduce((s,p) => s+num(p.monto),0) + S.d.movimientos.filter(m => m.tipo==='ingreso' && m.fecha.startsWith(mes)).reduce((s,m)=>s+num(m.monto),0);
  const gasMes = S.d.movimientos.filter(m => m.tipo==='gasto' && m.fecha.startsWith(mes)).reduce((s,m)=>s+num(m.monto),0);
  const porCobrar = activos().reduce((s,p) => s + Math.max(0, saldo(p)), 0);
  const d = new Date();
  pagina('Hoy', `
    <h1>Hola, ${esc(S.perfil?.nombre || '')} 💜</h1>
    <p class="muted" style="margin-top:-8px">${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}</p>
    <div class="grid3" style="margin-bottom:12px">
      <a class="btn" href="#/pedido-nuevo">＋ Pedido</a>
      ${isAdmin() ? '<a class="btn fucsia" href="#/cotizar">🧮 Cotizar</a>' : '<a class="btn fucsia" href="#/compras">🛒 Compras</a>'}
      <a class="btn sec" href="#/editor">📸 Post</a>
    </div>
    ${isAdmin() ? `<div class="grid3" style="margin-bottom:12px">
      <div class="stat"><b>${activos().length}</b><small>pedidos activos</small></div>
      <div class="stat"><b>${money(porCobrar)}</b><small>por cobrar</small></div>
      <div class="stat"><b style="color:${ingMes-gasMes>=0?'var(--ok)':'var(--error)'}">${money(ingMes-gasMes)}</b><small>ganancia del mes</small></div>
    </div>` : ''}
    ${tarjetaSolicitudes()}
    ${tarjetaAlertas()}
    ${tarjetaMeta()}
    <div class="card"><h2>Para hoy ${pend.length ? `<span class="pill-cnt">${pend.length}</span>` : ''}</h2>
      ${pend.length ? pend.map(t => tareaHTML(t)).join('') : '<p class="muted">Nada pendiente para hoy 🎉</p>'}${rutaDelDia(h)}</div>
    ${tarjetaTemporada()}
    ${tarjetaEscribirle()}
    ${tarjetaRespaldo()}
    <div class="card"><h2>Próximos 7 días</h2>
      ${prox.length ? prox.map(t => tareaHTML(t)).join('') : '<p class="muted">Sin tareas esta semana.</p>'}</div>
    <div class="card"><div class="row between"><h2>Próximas entregas</h2><a href="#/pedidos" class="mini">Ver todos</a></div>
      ${entregas.length ? entregas.map(pedidoMini).join('') : '<p class="muted">No hay entregas próximas.</p>'}</div>
  `);
});

function pedidoMini(p){
  const prod = p.producto_id ? byId('productos', p.producto_id) : null;
  const s = saldo(p);
  return `<a class="li" href="#/pedido/${p.id}" style="text-decoration:none;color:inherit">
    <div class="ic" style="background:var(--amarillo) center/cover url('${esc(p.foto_ref_url || prod?.foto_url || '')}')">${(p.foto_ref_url || prod?.foto_url) ? '' : '🎂'}</div>
    <div class="grow"><div class="t">${esc(p.cliente)}</div>
      <div class="muted mini">${fLarga(p.fecha_entrega)} · ${p.personas} pers.</div></div>
    <div style="text-align:right"><span class="tag ${p.estado}">${ESTADOS[p.estado]}</span>
      ${s > 0 && p.estado !== 'cotizacion' ? `<div class="mini" style="color:var(--alerta);font-weight:800;margin-top:3px">resta ${money(s)}</div>` : ''}</div>
  </a>`;
}

/* ---------- LISTA DE PEDIDOS / CALENDARIO ---------- */
let filtroPed = 'activos', vistaPed = 'lista', busPed = '', mesCal = null, diaSel = null;
ruta('pedidos', () => {
  const filtros = { activos:'Activos', cotizacion:'Cotizaciones', entregado:'Entregados', todos:'Todos' };
  let lista = S.d.pedidos.slice();
  if (filtroPed === 'activos') lista = activos();
  else if (filtroPed !== 'todos') lista = lista.filter(p => p.estado === filtroPed);
  if (busPed) lista = lista.filter(p => (p.cliente + ' ' + p.descripcion + ' ' + p.folio).toLowerCase().includes(busPed.toLowerCase()));
  lista.sort((a,b) => filtroPed === 'entregado' || filtroPed === 'todos' ? b.fecha_entrega.localeCompare(a.fecha_entrega) : a.fecha_entrega.localeCompare(b.fecha_entrega));
  pagina('Pedidos', `
    <div class="row between" style="margin-bottom:10px">
      <div class="chips" style="margin:0"><button class="chip ${vistaPed==='lista'?'on':''}" onclick="vistaPed='lista';render()">📋 Lista</button>
      <button class="chip ${vistaPed==='cal'?'on':''}" onclick="vistaPed='cal';render()">📅 Calendario</button></div>
      <a class="btn chico" href="#/pedido-nuevo">＋ Nuevo</a>
    </div>
    ${vistaPed === 'cal' ? calendarioHTML() : `
      <div class="chips">${Object.entries(filtros).map(([k,v]) => `<button class="chip ${filtroPed===k?'on':''}" onclick="filtroPed='${k}';render()">${v}</button>`).join('')}</div>
      <input class="i" placeholder="🔍 Buscar cliente o pastel" value="${esc(busPed)}" oninput="busPed=this.value;clearTimeout(window._tb);window._tb=setTimeout(()=>{render();const i=document.querySelector('main input');i.focus();i.setSelectionRange(99,99)},350)" style="margin-bottom:10px">
      <div class="card">${lista.length ? lista.map(pedidoMini).join('') : vacio('📋','No hay pedidos aquí.')}</div>`}
  `);
});

function calendarioHTML(){
  const base = mesCal ? new Date(mesCal) : new Date(); base.setDate(1);
  const y = base.getFullYear(), m = base.getMonth();
  const ini = addDays(base, -base.getDay());
  const h = hoy(); diaSel = diaSel || h;
  const ent = {}; S.d.pedidos.filter(p => p.estado !== 'cancelado').forEach(p => { const k = ymd(new Date(p.fecha_entrega)); (ent[k] = ent[k] || []).push(p); });
  const tar = {}; S.d.tareas.filter(t => t.tipo !== 'entregar').forEach(t => { (tar[t.fecha] = tar[t.fecha] || []).push(t); });
  let celdas = '';
  for (let i = 0; i < 42; i++){
    const d = addDays(ini, i); const k = ymd(d);
    if (i >= 35 && d.getMonth() !== m) break;
    const lleno = (ent[k]||[]).filter(p => !['cotizacion'].includes(p.estado)).length >= (num(A().capacidad_dia) || 3);
    celdas += `<div class="d ${d.getMonth()!==m?'fuera':''} ${k===h?'hoy':''} ${k===diaSel?'sel':''}" ${lleno && k!==diaSel ? 'style="background:#fbe0e4"' : ''} onclick="diaSel='${k}';render()">${d.getDate()}
      <div class="dots">${(ent[k]||[]).map(() => '<span class="dot e"></span>').join('')}${(tar[k]||[]).slice(0,3).map(() => '<span class="dot"></span>').join('')}</div></div>`;
  }
  const delDia = (ent[diaSel] || []);
  const tDia = S.d.tareas.filter(t => t.fecha === diaSel && t.tipo !== 'entregar');
  return `<div class="card">
    <div class="row between"><button class="btn sec chico" onclick="mesCal=new Date(${y},${m-1},1);render()">‹</button>
      <h2 style="margin:0;text-transform:capitalize">${MESES[m]} ${y}</h2>
      <button class="btn sec chico" onclick="mesCal=new Date(${y},${m+1},1);render()">›</button></div>
    <div class="cal" style="margin-top:10px">${DIAS.map(d => `<div class="dn">${d}</div>`).join('')}${celdas}</div>
    <p class="mini muted" style="margin:8px 0 0"><span class="dot e" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--fucsia)"></span> entrega &nbsp; <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--lila)"></span> compra / horneado / decorado</p>
  </div>
  <div class="card"><h2>${fCorta(diaSel)}</h2>
    ${delDia.length ? delDia.map(pedidoMini).join('') : ''}
    ${tDia.length ? tDia.map(t => tareaHTML(t)).join('') : ''}
    ${!delDia.length && !tDia.length ? '<p class="muted">Día libre.</p>' : ''}
    ${avisoCapacidad(diaSel)}
    <a class="btn sec chico" href="#/pedido-nuevo/${diaSel}" style="margin-top:8px">＋ Pedido para este día</a> ${rutaDelDia(diaSel)}
  </div>`;
}

/* ---------- FORMULARIO DE PEDIDO ---------- */
ruta('pedido-nuevo', (fecha) => formPedido(null, fecha));
ruta('pedido-editar', id => formPedido(byId('pedidos', id)));
function formPedido(p, fecha){
  const borrador = S.borradorPedido || {}; S.borradorPedido = null;
  const nuevo = !p;
  let ent;
  if (p) ent = toLocalInput(p.fecha_entrega);
  else { const d = fecha ? parseYmd(fecha) : addDays(new Date(), 3); d.setHours(16,0,0,0); ent = `${ymd(d)}T${hm(d)}`; }
  if (borrador.fecha_entrega) ent = borrador.fecha_entrega;
  p = {cliente:'', telefono:'', producto_id:'', descripcion:'', personas:20, sabor:'', relleno:'', decoracion:'', tipo_entrega:'recoge',
        direccion:'', envio:0, precio:'', estado:'confirmado', notas:'', ...(p||{}), ...borrador };
  const recSel = new Set(borrador.recetas || (nuevo ? [] : S.d.pedido_recetas.filter(r => r.pedido_id === p.id).map(r => r.receta_id)));
  const prods = S.d.productos.slice().sort((a,b) => a.nombre.localeCompare(b.nombre));
  pagina(nuevo ? 'Nuevo pedido' : `Pedido #${p.folio}`, `
  <form id="fp">
    <div class="card"><h2>Cliente</h2>
      <label class="f">Nombre *</label><input class="i" name="cliente" required value="${esc(p.cliente)}" list="dlcli" autocomplete="off" placeholder="Escribe y elige de tus clientes">
      <datalist id="dlcli">${S.d.clientes.map(c => `<option value="${esc(c.nombre)}">${esc(c.telefono || '')}</option>`).join('')}</datalist>
      <label class="f">WhatsApp / teléfono</label><input class="i" name="telefono" type="tel" inputmode="tel" value="${esc(p.telefono)}" placeholder="10 dígitos">
    </div>
    <div class="card"><h2>Pastel</h2>
      <label class="f">Del catálogo (opcional)</label>
      <select class="i" name="producto_id"><option value="">— Diseño especial —</option>
        ${prods.map(x => `<option value="${x.id}" ${x.id===p.producto_id?'selected':''}>${esc(x.nombre)}</option>`).join('')}</select>
      <label class="f">Descripción / tema</label><textarea class="i" name="descripcion" placeholder="Ej. Pastel de unicornio rosa con nombre Sofi">${esc(p.descripcion)}</textarea>
      <div class="grid2">
        <div><label class="f">Personas</label><input class="i" name="personas" type="number" min="1" inputmode="numeric" value="${p.personas}"><div class="muted mini" id="pisosHint"></div></div>
        <div><label class="f">Sabor</label><input class="i" name="sabor" value="${esc(p.sabor)}"></div>
        <div><label class="f">Relleno</label><input class="i" name="relleno" value="${esc(p.relleno)}"></div>
        <div><label class="f">Decoración</label><input class="i" name="decoracion" value="${esc(p.decoracion)}"></div>
      </div>
      <label class="f">Foto de referencia (la que manda el cliente)</label>
      <input class="i" type="file" accept="image/*" id="fotoRef">
      ${p.foto_ref_url ? `<img src="${esc(p.foto_ref_url)}" style="width:110px;border-radius:12px;margin-top:8px">` : ''}
    </div>
    <div class="card"><h2>Entrega</h2>
      <label class="f">Fecha y hora *</label><input class="i" type="datetime-local" name="fecha_entrega" required value="${ent}">
      <div id="capAviso"></div>
      <div class="chips" style="margin-top:10px">
        <label class="chip ${p.tipo_entrega==='recoge'?'on':''}"><input type="radio" name="tipo_entrega" value="recoge" ${p.tipo_entrega==='recoge'?'checked':''} hidden onchange="this.closest('.chips').querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c.contains(this)));document.getElementById('dom').hidden=true"> 🏠 Recoge</label>
        <label class="chip ${p.tipo_entrega==='domicilio'?'on':''}"><input type="radio" name="tipo_entrega" value="domicilio" ${p.tipo_entrega==='domicilio'?'checked':''} hidden onchange="this.closest('.chips').querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c.contains(this)));document.getElementById('dom').hidden=false"> 🚗 A domicilio</label>
      </div>
      <div id="dom" ${p.tipo_entrega==='domicilio'?'':'hidden'}>
        <label class="f">Dirección</label><input class="i" name="direccion" value="${esc(p.direccion)}">
        <label class="f">Costo de envío (0 si no se cobra)</label><input class="i" name="envio" type="number" inputmode="decimal" value="${num(p.envio)}">
      </div>
    </div>
    <div class="card"><h2>Precio</h2>
      <div class="grid2">
        <div><label class="f">Precio del pastel</label><input class="i" name="precio" type="number" inputmode="decimal" value="${p.precio ?? ''}"><div class="muted mini" id="precioHint"></div></div>
        ${nuevo ? `<div><label class="f">Anticipo recibido</label><input class="i" name="anticipo" type="number" inputmode="decimal" value="${borrador.anticipo || ''}" placeholder="0"></div>` : ''}
      </div>
      ${isAdmin() ? `<button type="button" class="btn sec chico" style="margin-top:10px" id="aCot">🧮 Calcular con el cotizador</button>` : ''}
      <label class="f">Estado</label>
      <select class="i" name="estado">${Object.entries(ESTADOS).map(([k,v]) => `<option value="${k}" ${k===p.estado?'selected':''}>${v}</option>`).join('')}</select>
    </div>
    ${S.d.recetas.length ? `<div class="card"><h2>Recetas que lleva</h2><p class="muted mini" style="margin-top:-6px">Sirve para la lista de compras. Las cantidades se ajustan a las personas.</p>
      ${S.d.recetas.map(r => `<label class="check"><input type="checkbox" name="rec_${r.id}" ${recSel.has(r.id)?'checked':''}> ${esc(r.nombre)} <span class="muted mini">(${r.tipo})</span></label>`).join('')}</div>` : ''}
    <div class="card"><label class="f" style="margin-top:0">Notas</label><textarea class="i" name="notas">${esc(p.notas)}</textarea></div>
    <button class="btn full" style="padding:15px">💾 Guardar pedido</button>
    ${!nuevo && isAdmin() ? `<button type="button" class="btn peligro full" style="margin-top:10px" id="borrar">Eliminar pedido</button>` : ''}
  </form>`, { atras:true, nav:'pedidos' });

  const form = $('#fp');
  // capacidad por día
  const capUpd = () => { const v = form.fecha_entrega.value; $('#capAviso').innerHTML = v ? avisoCapacidad(v.slice(0,10), p.id) : ''; };
  form.fecha_entrega.addEventListener('change', capUpd); capUpd();
  // cliente: al elegir uno del directorio se llena su teléfono
  form.cliente.addEventListener('change', () => { const c = S.d.clientes.find(x => x.nombre.toLowerCase() === form.cliente.value.trim().toLowerCase());
    if (c && !form.telefono.value) form.telefono.value = c.telefono || ''; });
  // precio según la tabla de tamaños del producto
  let precioTocado = (!nuevo && num(p.precio) > 0) || !!borrador._precioFijo;
  form.precio.addEventListener('input', () => { precioTocado = true; });
  const precioUpd = () => { const prod = byId('productos', form.producto_id.value); const r = prod && precioPorTamano(prod, num(form.personas.value) || 1);
    $('#precioHint').textContent = r ? `Según tu tabla: ${money(r.precio)}${r.extra ? ' (calculado)' : ` (${r.tam} pers.)`}` : '';
    if (r && !precioTocado) form.precio.value = r.precio; };
  form.producto_id.addEventListener('change', precioUpd); form.personas.addEventListener('input', precioUpd); precioUpd();
  const pisosUpd = () => { const r = sugerirPisos(Math.max(1, num(form.personas.value))); $('#pisosHint').textContent = r ? '🎂 ' + textoPisos(r) : ''; };
  form.personas.addEventListener('input', pisosUpd); pisosUpd();
  $('#aCot') && ($('#aCot').onclick = () => {
    const f = formData(form);
    S.cotizacion = { ...(S.cotizacion||{}), personas: f.personas || 20, producto_id: f.producto_id || '', recetas: S.d.recetas.filter(r => f['rec_'+r.id]).map(r => r.id),
      envio: f.envio || 0, volverA: location.hash, borrador: f };
    ir('#/cotizar');
  });
  $('#borrar') && ($('#borrar').onclick = async () => {
    if (!await confirmar('¿Eliminar este pedido con sus tareas y pagos?')) return;
    await guardar(() => DB.del('pedidos', p.id), 'Pedido eliminado');
    if (LOCAL){ for (const t of ['tareas','pagos','pedido_recetas']) for (const r of S.d[t].filter(x => x.pedido_id === p.id)) await DB.del(t, r.id); }
    await recargar('pedidos','tareas','pagos','pedido_recetas'); ir('#/pedidos');
  });
  form.onsubmit = async e => {
    e.preventDefault();
    const btn = form.querySelector('button.btn.full'); btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      const f = formData(form);
      const row = { cliente:f.cliente.trim(), telefono:f.telefono, producto_id:f.producto_id || null, descripcion:f.descripcion, personas:f.personas || 1,
        sabor:f.sabor, relleno:f.relleno, decoracion:f.decoracion, fecha_entrega:new Date(f.fecha_entrega).toISOString(),
        tipo_entrega: form.querySelector('[name=tipo_entrega]:checked')?.value || 'recoge', direccion:f.direccion || '', envio:f.envio || 0,
        precio:f.precio || 0, estado:f.estado, notas:f.notas };
      const cli = await asegurarCliente(row.cliente, row.telefono); row.cliente_id = cli.id;
      if (borrador.costo != null) row.costo = borrador.costo;
      const file = $('#fotoRef').files[0];
      if (file) row.foto_ref_url = await DB.subir(await comprimir(file), 'referencias');
      else if (nuevo && borrador.foto_ref_url) row.foto_ref_url = borrador.foto_ref_url;
      let ped;
      if (nuevo){
        ped = await DB.ins('pedidos', row);
        if (num(f.anticipo) > 0) await DB.ins('pagos', { pedido_id:ped.id, monto:num(f.anticipo), tipo:'anticipo', metodo:'efectivo', fecha:hoy() });
      } else ped = await DB.upd('pedidos', p.id, row);
      // recetas del pedido
      await DB.delWhere('pedido_recetas', 'pedido_id', ped.id);
      for (const r of S.d.recetas) if (f['rec_'+r.id])
        await DB.ins('pedido_recetas', { pedido_id:ped.id, receta_id:r.id, factor:+(num(row.personas) / Math.max(1, num(r.rinde_personas))).toFixed(2) });
      await recargar('pedidos','pagos','pedido_recetas');
      await regenerarTareas(ped);
      await descontarAlacena(byId('pedidos', ped.id) || ped);
      toast('✅ Pedido guardado');
      if (borrador.solicitud_id){ await DB.upd('solicitudes', borrador.solicitud_id, { estado:'convertida', pedido_id:ped.id }); await recargar('solicitudes'); }
      history.replaceState(null, '', '#/pedido/' + ped.id); render();
    } catch(err){ console.error(err); toast('⚠️ ' + err.message, 4000); btn.disabled = false; btn.textContent = '💾 Guardar pedido'; }
  };
}

/* ---------- DETALLE DE PEDIDO ---------- */
ruta('pedido', id => {
  const p = byId('pedidos', id);
  if (!p) return pagina('Pedido', vacio('🤔','No encontré ese pedido.'), { atras:true });
  const prod = p.producto_id ? byId('productos', p.producto_id) : null;
  const pagos = S.d.pagos.filter(x => x.pedido_id === id).sort((a,b) => (a.fecha||'').localeCompare(b.fecha||''));
  const tareas = S.d.tareas.filter(t => t.pedido_id === id).sort((a,b) => a.fecha.localeCompare(b.fecha));
  const recs = S.d.pedido_recetas.filter(r => r.pedido_id === id).map(r => byId('recetas', r.receta_id)?.nombre).filter(Boolean);
  const s = saldo(p); const ent = new Date(p.fecha_entrega);
  const foto = p.foto_ref_url || prod?.foto_url;
  const fin = new Date(ent.getTime() + 30*60000);
  const detalle = `${p.descripcion}\n${p.personas} personas · ${p.sabor} ${p.relleno ? '/ ' + p.relleno : ''}\nTel: ${p.telefono}\nTotal ${money(totalPedido(p))} · Resta ${money(s)}`;
  pagina(`Pedido #${p.folio ?? ''}`, `
    <div class="card">
      <div class="row between"><h2 style="margin:0">${p.cliente_id ? `<a href="#/cliente/${p.cliente_id}" style="text-decoration:none">${p.cliente_id && esFrecuente(p.cliente_id) ? '⭐ ' : ''}${esc(p.cliente)} ›</a>` : esc(p.cliente)}</h2><span class="tag ${p.estado}">${ESTADOS[p.estado]}</span></div>
      <p class="big" style="margin:8px 0 2px">${fLarga(p.fecha_entrega)}</p>
      <p class="muted" style="margin:0">${p.tipo_entrega === 'domicilio' ? '🚗 A domicilio: ' + esc(p.direccion || 'sin dirección') : '🏠 Pasan a recoger'}</p>
      ${foto ? `<img src="${esc(foto)}" class="foto-det" style="margin-top:12px;max-height:320px;object-fit:cover">` : ''}
      <p style="margin:12px 0 4px"><b>${esc(p.descripcion || prod?.nombre || 'Pastel')}</b></p>
      <p class="muted" style="margin:0">${p.personas} personas${p.sabor ? ' · Sabor: ' + esc(p.sabor) : ''}${p.relleno ? ' · Relleno: ' + esc(p.relleno) : ''}${p.decoracion ? ' · ' + esc(p.decoracion) : ''}</p>
      ${recs.length ? `<p class="muted mini">Recetas: ${recs.map(esc).join(', ')}</p>` : ''}
      ${p.notas ? `<div class="nota">${esc(p.notas)}</div>` : ''}
      <div class="row wrap" style="margin-top:12px">
        <a class="btn chico" href="#/pedido-editar/${p.id}">✏️ Editar</a>
        <button class="btn sec chico" onclick="duplicarPedido('${p.id}')">🔁 Duplicar</button>
        <a class="btn sec chico" target="_blank" href="${gcalLink({ titulo:`🎂 Entregar pastel · ${p.cliente}`, inicio:ent, fin, detalles:detalle, lugar:p.direccion })}">📅 Google Calendar</a>
      </div>
    </div>
    <div class="card"><h2>💬 Mensajes al cliente</h2>${botonesPlantillas(p)}</div>
    <div class="card"><h2>Estado</h2><div class="chips" style="flex-wrap:wrap">
      ${Object.entries(ESTADOS).map(([k,v]) => `<button class="chip ${p.estado===k?'on':''}" onclick="cambiarEstado('${p.id}','${k}')">${v}</button>`).join('')}</div></div>
    <div class="card"><h2>📷 Pastel terminado</h2>
      ${p.foto_final_url ? `<div class="grid2">${p.foto_ref_url ? `<div><p class="muted mini" style="margin:0 0 4px">Inspiración</p><img src="${esc(p.foto_ref_url)}" class="foto-det" style="aspect-ratio:1;object-fit:cover"></div>` : ''}
        <div><p class="muted mini" style="margin:0 0 4px">Terminado</p><img src="${esc(p.foto_final_url)}" class="foto-det" style="aspect-ratio:1;object-fit:cover"></div></div>
        <div class="row wrap" style="margin-top:10px"><a class="btn fucsia chico" href="#/antes-despues/${p.id}">📸 Publicación antes/después</a>
        ${isAdmin() ? `<button class="btn sec chico" onclick="finalAlCatalogo('${p.id}')">＋ Al catálogo</button>` : ''}</div>` : '<p class="muted mini" style="margin-top:-4px">Toma una foto cuando esté listo: sirve para tu galería y tus redes.</p>'}
      <label class="btn sec chico" style="margin-top:10px">📷 ${p.foto_final_url ? 'Cambiar foto' : 'Subir foto del pastel'}<input type="file" accept="image/*" hidden onchange="subirFotoFinal('${p.id}', this)"></label>
    </div>
    <div class="card"><h2>Dinero</h2>
      <div class="res"><span>Pastel</span><span class="money">${money(p.precio)}</span></div>
      ${num(p.envio) ? `<div class="res"><span>Envío</span><span class="money">${money(p.envio)}</span></div>` : ''}
      ${pagos.map(x => `<div class="res"><span>${x.tipo === 'anticipo' ? 'Anticipo' : x.tipo === 'saldo' ? 'Pago del saldo' : 'Pago'} · ${fCorta(x.fecha)} <span class="muted mini">${esc(x.metodo)}</span>${x.comprobante_url ? ` <a href="${esc(x.comprobante_url)}" target="_blank" class="mini">🧾</a>` : ''}</span>
        <span class="money" style="color:var(--ok)">−${money(x.monto)} ${isAdmin() ? `<button class="btn peligro chico" style="padding:2px 7px" onclick="borrarPago('${x.id}')">✕</button>` : ''}</span></div>`).join('')}
      <div class="res total"><span>${s > 0 ? 'Resta por cobrar' : s < 0 ? 'Saldo a favor' : 'Pagado completo ✅'}</span><span style="color:${s>0?'var(--alerta)':'var(--ok)'}">${money(Math.abs(s))}</span></div>
      <button class="btn fucsia full" onclick="modalPago('${p.id}')">💵 Registrar pago</button>
      ${saldo(p) > 0 ? botonPago(p) : ''}
    </div>
    <div class="card"><h2>Tareas del pedido</h2>
      ${tareas.length ? tareas.map(t => `${tareaHTML(t, { conPedido:false })}
        <div class="row" style="padding:0 0 8px 50px;gap:6px">
          <select class="i" style="padding:5px 8px;font-size:13px;max-width:150px" onchange="asignar('${t.id}', this.value)">
            <option value="">👤 ¿Quién?</option>${S.d.perfiles.filter(x => x.activo).map(u => `<option value="${u.id}" ${t.asignado_a===u.id?'selected':''}>${esc(u.nombre)}</option>`).join('')}
          </select>
          <a class="btn sec chico" target="_blank" href="${t.hora ? gcalLink({ titulo:`${TIPO_TAREA[t.tipo][0]} ${t.titulo}`, inicio:ent, fin, detalles:detalle, lugar:p.direccion }) : gcalLink({ titulo:`${TIPO_TAREA[t.tipo][0]} ${t.titulo}`, inicio:t.fecha, todoElDia:true, detalles:detalle })}">📅</a>
        </div>`).join('') : '<p class="muted">Las cotizaciones y pedidos entregados no generan tareas.</p>'}
      <button class="btn sec chico" onclick="modalTarea('${p.id}')">＋ Otra tarea</button>
    </div>
  `, { atras:true, nav:'pedidos' });
});

function mensajeConfirmacion(p){
  const s = saldo(p); const ent = new Date(p.fecha_entrega);
  return `¡Hola ${p.cliente}! 🎂 Te confirmo tu pedido con ${S.negocio.nombre || 'Hilda VelPer'}:\n`
    + `• ${p.descripcion || 'Pastel'} para ${p.personas} personas\n`
    + (p.sabor ? `• Sabor: ${p.sabor}${p.relleno ? ', relleno de ' + p.relleno : ''}\n` : '')
    + `• ${p.tipo_entrega === 'domicilio' ? 'Entrega a domicilio' : 'Lo recoges'} el ${fLarga(ent)}\n`
    + `• Total: ${money(totalPedido(p))}${pagado(p.id) ? ` · Anticipo: ${money(pagado(p.id))} · Resta: ${money(s)}` : ''}\n`
    + `¡Gracias por tu preferencia! 💜`;
}
async function cambiarEstado(id, estado){
  const p = await guardar(() => DB.upd('pedidos', id, { estado }), 'Estado: ' + ESTADOS[estado]);
  await recargar('pedidos'); await regenerarTareas(p); await descontarAlacena(byId('pedidos', id) || p); render();
  if (estado === 'entregado' && p.telefono) toast('💜 Tip: en unos días mándale "Pedir reseña"', 3500);
}
async function asignar(tid, perfil){ await guardar(() => DB.upd('tareas', tid, { asignado_a: perfil || null }), perfil ? '👤 Asignada a ' + nombrePerfil(perfil) : 'Sin asignar'); await recargar('tareas'); }
async function borrarPago(id){ if (!await confirmar('¿Borrar este pago?')) return; await guardar(() => DB.del('pagos', id), 'Pago borrado'); await recargar('pagos'); render(); }
function modalPago(pid){
  const p = byId('pedidos', pid); const s = Math.max(0, saldo(p));
  modal(`<h2>Registrar pago</h2><form id="fpg">
    <label class="f">Monto</label><input class="i" name="monto" type="number" inputmode="decimal" required value="${s || ''}">
    <label class="f">Tipo</label><select class="i" name="tipo"><option value="anticipo" ${pagado(pid)?'':'selected'}>Anticipo</option><option value="saldo" ${pagado(pid)?'selected':''}>Pago del saldo</option><option value="otro">Otro</option></select>
    <label class="f">Forma de pago</label><select class="i" name="metodo"><option>efectivo</option><option>transferencia</option><option>tarjeta</option></select>
    <label class="f">Fecha</label><input class="i" type="date" name="fecha" value="${hoy()}">
    <label class="f">Foto del comprobante (opcional)</label><input class="i" type="file" accept="image/*" id="pgComp">
    <button class="btn full" style="margin-top:14px">Guardar pago</button></form>`, m => {
    $('#fpg', m).onsubmit = async e => { e.preventDefault(); const f = formData(e.target); const btn = e.target.querySelector('.btn.full'); btn.disabled = true;
      const fc = $('#pgComp', m).files[0]; const row = { pedido_id:pid, monto:f.monto, tipo:f.tipo, metodo:f.metodo, fecha:f.fecha };
      try { if (fc) row.comprobante_url = await DB.subir(await comprimir(fc, 1400, 0.8), 'comprobantes'); } catch(err){ toast('⚠️ No se subió el comprobante: ' + err.message, 4000); }
      await guardar(() => DB.ins('pagos', row), '💵 Pago registrado');
      await recargar('pagos'); closeModal(); render(); };
  });
}
function modalTarea(pid){
  modal(`<h2>Nueva tarea</h2><form id="ft">
    <label class="f">¿Qué hay que hacer?</label><input class="i" name="titulo" required placeholder="Ej. Comprar figuras de unicornio">
    <label class="f">Tipo</label><select class="i" name="tipo">${Object.entries(TIPO_TAREA).map(([k,v]) => `<option value="${k}" ${k==='otro'?'selected':''}>${v[0]} ${v[1]}</option>`).join('')}</select>
    <label class="f">Fecha</label><input class="i" type="date" name="fecha" required value="${hoy()}">
    <label class="f">¿Quién?</label><select class="i" name="asignado_a"><option value="">—</option>${S.d.perfiles.filter(x => x.activo).map(u => `<option value="${u.id}">${esc(u.nombre)}</option>`).join('')}</select>
    <button class="btn full" style="margin-top:14px">Agregar</button></form>`, m => {
    $('#ft', m).onsubmit = async e => { e.preventDefault(); const f = formData(e.target);
      await guardar(() => DB.ins('tareas', { pedido_id:pid || null, titulo:f.titulo, tipo:f.tipo, fecha:f.fecha, asignado_a:f.asignado_a || null, hecho:false, auto:false }), 'Tarea agregada');
      await recargar('tareas'); closeModal(); render(); };
  });
}
