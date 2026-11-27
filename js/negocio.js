/* =====================================================================
   Cotizador · Insumos · Recetas · Compras · Cuentas · Más / Ajustes
   ===================================================================== */
const A = () => ({ ...AJUSTES_DEF, ...S.ajustes });
const costoUnit = i => num(i.presentacion_precio) / Math.max(0.0001, num(i.presentacion_cantidad));
const costoReceta = rid => S.d.receta_insumos.filter(x => x.receta_id === rid)
  .reduce((s, x) => { const i = byId('insumos', x.insumo_id); return s + (i ? num(x.cantidad) * costoUnit(i) : 0); }, 0);
const TIPOS_REC = { base:'🍰 Pan / base', relleno:'🍓 Relleno', betun:'🧁 Betún / cubierta', decoracion:'🎨 Decoración', otro:'📦 Otro' };
const NIVELES = [['Sencillo',0],['Medio',1],['Elaborado',2.5],['Muy elaborado',4]];
const soloAdmin = () => { if (!isAdmin()){ ir('#/hoy'); return true; } return false; };

/* ---------- COTIZADOR ---------- */
ruta('cotizar', () => {
  if (soloAdmin()) return;
  const a = A();
  const Q = S.cotizacion = { personas:20, producto_id:'', recetas:[], extras:[], horas:null, empaque:a.empaque_default, envio:0, margen:a.margen_pct, ...(S.cotizacion||{}) };
  const prodIni = Q.producto_id ? byId('productos', Q.producto_id) : null;
  if (!Q.recetas.length && !Q._init){ Q.recetas = (prodIni?.recetas || []).filter(r => byId('recetas', r)); if (!Q.recetas.length) Q.recetas = S.d.recetas.filter(r => r.tipo !== 'decoracion' && r.tipo !== 'otro').map(r => r.id); }
  if (Q.nivel == null) Q.nivel = 0;
  Q._init = true;
  const prod = Q.producto_id ? byId('productos', Q.producto_id) : null;
  const insOpts = S.d.insumos.slice().sort((x,y) => x.nombre.localeCompare(y.nombre)).map(i => `<option value="${i.id}">${esc(i.nombre)} (${i.unidad})</option>`).join('');
  pagina('Cotizador', `
    ${Q.fotoRef ? `<div class="card"><h2>📷 Foto que mandó el cliente</h2><img src="${esc(Q.fotoRef)}" class="foto-det" style="max-height:300px;object-fit:contain">
      <p class="muted mini">Elige abajo qué tan elaborada se ve la decoración: suma horas de trabajo al precio.</p></div>` : ''}
    <div class="nota">💡 <b>Método provisional:</b> costo de ingredientes + horas de trabajo + gastos fijos + empaque, y encima la ganancia. Cuando Hilda nos explique cómo saca sus precios, lo ajustamos.</div>
    ${prod ? `<div class="card row"><img src="${esc(prod.foto_url)}" style="width:60px;height:60px;object-fit:cover;border-radius:12px"><div class="grow"><b>${esc(prod.nombre)}</b><div class="muted mini">Precio actual: ${precioTxt(prod)}</div></div><button class="btn sec chico" onclick="S.cotizacion.producto_id='';render()">✕</button></div>` : ''}
    <div class="card">
      <label class="f" style="margin-top:0">¿Para cuántas personas?</label>
      <input class="i" type="number" inputmode="numeric" id="qper" value="${Q.personas}" style="font-size:22px;font-weight:800">
    </div>
    <div class="card"><h2>Recetas</h2>
      ${S.d.recetas.length ? Object.entries(TIPOS_REC).map(([t, lab]) => {
        const rs = S.d.recetas.filter(r => r.tipo === t); if (!rs.length) return '';
        return `<p class="muted mini" style="margin:8px 0 0;font-weight:800">${lab}</p>` + rs.map(r => `<label class="check" style="margin:6px 0">
          <input type="checkbox" data-rec="${r.id}" ${Q.recetas.includes(r.id)?'checked':''}> <span class="grow">${esc(r.nombre)}</span>
          <span class="muted mini" data-rc="${r.id}"></span></label>`).join('');
      }).join('') : vacio('📒','Aún no hay recetas.', '<a class="btn chico" href="#/recetas">Crear recetas</a>')}
    </div>
    <div class="card"><h2>Material extra</h2><p class="muted mini" style="margin-top:-6px">Figuras, toppers, velas, fruta… lo que no está en las recetas.</p>
      <div id="qext">${Q.extras.map((x, k) => filaExtra(x, k, insOpts)).join('')}</div>
      <button class="btn sec chico" id="qaddx">＋ Agregar material</button>
    </div>
    <div class="card"><h2>Trabajo y otros</h2>
      <label class="f" style="margin-top:0">¿Qué tan elaborada es la decoración?</label>
      <div class="chips" style="flex-wrap:wrap">${NIVELES.map(([n,h],k) => `<button type="button" class="chip ${Q.nivel===k?'on':''}" data-niv="${k}">${n}${h ? ' +' + h + ' h' : ''}</button>`).join('')}</div>
      <div class="grid2">
        <div><label class="f">Horas de trabajo</label><input class="i" type="number" step="0.5" inputmode="decimal" id="qhoras" value="${Q.horas ?? ''}"></div>
        <div><label class="f">Empaque (base, caja)</label><input class="i" type="number" inputmode="decimal" id="qemp" value="${Q.empaque}"></div>
        <div><label class="f">Envío</label><input class="i" type="number" inputmode="decimal" id="qenv" value="${Q.envio}"></div>
        <div><label class="f">Ganancia: <b id="qmv">${Q.margen}%</b></label><input type="range" min="0" max="150" step="5" id="qmar" value="${Q.margen}"></div>
      </div>
      <p class="muted mini">Tu hora vale ${money(a.tarifa_hora)} · gastos fijos ${money(a.gastos_fijos_mes)} al mes entre ${a.pedidos_mes} pedidos. <a href="#/ajustes">Cambiar</a></p>
    </div>
    <div class="card" id="qres"></div>
    <div class="grid2" style="margin-bottom:10px">
      <button class="btn" id="qped">${Q.volverA ? '↩ Usar en el pedido' : '＋ Crear pedido'}</button>
      <button class="btn verde" id="qwa">💬 Copiar cotización</button>
    </div>
    ${prod ? '<div class="grid2"><button class="btn sec" id="qprod">💾 Precio base del catálogo</button><button class="btn sec" id="qtam">📏 Guardar en tabla de tamaños</button></div>' : ''}
  `, { atras: !!Q.volverA });

  const calc = () => {
    Q.personas = Math.max(1, num($('#qper').value));
    Q.recetas = $$('[data-rec]').filter(c => c.checked).map(c => c.dataset.rec);
    Q.extras = $$('.qx').map(r => ({ insumo_id:$('select', r).value, cantidad:num($('input', r).value) }));
    Q.empaque = num($('#qemp').value); Q.envio = num($('#qenv').value); Q.margen = num($('#qmar').value);
    let ing = 0, horasAuto = 0;
    S.d.recetas.forEach(r => {
      const f = Q.personas / Math.max(1, num(r.rinde_personas)); const c = costoReceta(r.id) * f;
      const el = $(`[data-rc="${r.id}"]`); if (el) el.textContent = money(c);
      if (Q.recetas.includes(r.id)){ ing += c; horasAuto += num(r.horas) * Math.max(1, Math.sqrt(f)); }
    });
    Q.extras.forEach(x => { const i = byId('insumos', x.insumo_id); if (i) ing += x.cantidad * costoUnit(i); });
    const hEl = $('#qhoras');
    if (!Q.horasManual){ Q.horas = Math.round((horasAuto + NIVELES[Q.nivel][1]) * 2) / 2; hEl.value = Q.horas || ''; } else Q.horas = num(hEl.value);
    const mo = Q.horas * num(a.tarifa_hora);
    const fijos = num(a.gastos_fijos_mes) / Math.max(1, num(a.pedidos_mes));
    const costo = ing + mo + fijos + Q.empaque;
    const r = Math.max(1, num(a.redondeo));
    const sug = Math.ceil(costo * (1 + Q.margen/100) / r) * r;
    const pctIng = sug ? ing / sug * 100 : 0;
    Q.resultado = { ing, mo, fijos, costo, sug, total: sug + Q.envio };
    $('#qmv').textContent = Q.margen + '%';
    $('#qres').innerHTML = `<h2>Resultado</h2>
      <div class="res"><span>Ingredientes y material</span><span class="money">${money2(ing)}</span></div>
      <div class="res"><span>Mano de obra (${Q.horas} h)</span><span class="money">${money2(mo)}</span></div>
      <div class="res"><span>Gastos fijos (luz, gas…)</span><span class="money">${money2(fijos)}</span></div>
      <div class="res"><span>Empaque</span><span class="money">${money2(Q.empaque)}</span></div>
      <div class="res total"><span>Te cuesta hacerlo</span><span>${money2(costo)}</span></div>
      <div class="res"><span>Ganancia (${Q.margen}%)</span><span class="money" style="color:var(--ok)">${money2(sug - costo)}</span></div>
      ${num(a.precio_persona) ? `<div class="res"><span>Con tu precio por persona (${money(a.precio_persona)} × ${Q.personas})</span><span class="money">${money(a.precio_persona * Q.personas)}</span></div>` : ''}
      <p class="mini muted" style="margin:8px 0 0">Sale a ${money2(sug / Q.personas)} por persona. Los ingredientes son el ${pctIng.toFixed(0)}% del precio
        ${pctIng > 40 ? ' — <b style="color:var(--alerta)">ojo: muy alto, tal vez estás cobrando poco</b>' : pctIng && pctIng < 20 ? ' — margen holgado' : ' — en rango normal (25–35%)'}.</p>
      <div class="res sug"><span>Precio sugerido</span><span>${money(sug)}${Q.envio ? ` <small style="font-size:14px">+ ${money(Q.envio)} envío</small>` : ''}</span></div>`;
  };
  $('main').addEventListener('input', e => { if (e.target.id === 'qhoras') Q.horasManual = true; calc(); });
  $('main').addEventListener('change', calc);
  $('#qaddx').onclick = () => { $('#qext').insertAdjacentHTML('beforeend', filaExtra({ insumo_id:'', cantidad:'' }, Date.now(), insOpts)); };
  $('#qext').addEventListener('click', e => { if (e.target.dataset.delx !== undefined){ e.target.closest('.qx').remove(); calc(); } });
  $$('[data-niv]').forEach(b => b.onclick = () => { Q.nivel = +b.dataset.niv; Q.horasManual = false; $$('[data-niv]').forEach(x => x.classList.toggle('on', x === b)); calc(); });
  calc();

  $('#qped').onclick = () => {
    const R = Q.resultado;
    if (Q.volverA){ S.borradorPedido = { ...(Q.borrador||{}), precio:R.sug, costo:Math.round(R.costo), personas:Q.personas, recetas:Q.recetas, envio:Q.envio, _precioFijo:true }; const v = Q.volverA; S.cotizacion = null; ir(v); return; }
    S.borradorPedido = { ...(Q.extra || {}), precio:R.sug, costo:Math.round(R.costo), personas:Q.personas, recetas:Q.recetas, producto_id:Q.producto_id, descripcion: prod ? prod.nombre : (Q.extra?.descripcion || ''), estado:'cotizacion', envio:Q.envio, _precioFijo:true };
    S.cotizacion = null; ir('#/pedido-nuevo');
  };
  $('#qwa').onclick = async () => {
    const R = Q.resultado;
    const txt = `🎂 *Cotización ${S.negocio.nombre || 'Hilda VelPer'}*\n${prod ? prod.nombre + '\n' : ''}Para ${Q.personas} personas: *${money(R.sug)}*${Q.envio ? `\nEnvío: ${money(Q.envio)}\nTotal: *${money(R.total)}*` : ''}\nSe aparta con anticipo. ¡Gracias por tu preferencia! 💜`;
    try { await navigator.clipboard.writeText(txt); toast('📋 Copiada, pégala en WhatsApp'); } catch(e){ prompt('Copia el texto:', txt); }
  };
  $('#qtam') && ($('#qtam').onclick = async () => {
    const precios = { ...(prod.precios || {}), [Q.personas]: Q.resultado.sug };
    await guardar(() => DB.upd('productos', prod.id, { precios }), `📏 Guardado: ${Q.personas} personas = ${money(Q.resultado.sug)}`); await recargar('productos');
  });
  $('#qprod') && ($('#qprod').onclick = async () => {
    await guardar(() => DB.upd('productos', prod.id, { precio:Q.resultado.sug, personas:Q.personas }), '✅ Precio actualizado en el catálogo'); await recargar('productos');
  });
});
function filaExtra(x, k, opts){
  return `<div class="row qx" style="margin-bottom:8px"><select class="i grow">${'<option value="">— material —</option>' + opts.replace(`value="${x.insumo_id}"`, `value="${x.insumo_id}" selected`)}</select>
    <input class="i" type="number" inputmode="decimal" placeholder="cant." style="width:90px" value="${x.cantidad}"><button type="button" class="btn peligro chico" data-delx>✕</button></div>`;
}

/* ---------- INSUMOS ---------- */
let busIns = '';
ruta('insumos', () => {
  if (soloAdmin()) return;
  let l = S.d.insumos.slice().sort((a,b) => a.nombre.localeCompare(b.nombre));
  if (busIns) l = l.filter(i => i.nombre.toLowerCase().includes(busIns.toLowerCase()));
  pagina('Materia prima', `
    <p class="muted">Anota cuánto te costó cada cosa, cuánto traía y cuánto tienes en la alacena. La app calcula el costo por gramo, mililitro o pieza.</p>
    <div class="row" style="margin-bottom:10px"><input class="i grow" placeholder="🔍 Buscar" value="${esc(busIns)}" oninput="busIns=this.value;clearTimeout(window._tb);window._tb=setTimeout(()=>{render();const i=document.querySelector('main input');i.focus();i.setSelectionRange(99,99)},350)">
      <button class="btn" onclick="modalInsumo()">＋ Nuevo</button></div>
    ${S.d.insumos.filter(i => !num(i.presentacion_precio)).length ? `<div class="nota">⚠️ ${S.d.insumos.filter(i => !num(i.presentacion_precio)).length} sin precio. Tócalas y pon lo que pagas.</div>` : ''}
    <button class="btn sec chico" style="margin-bottom:10px" onclick="cargarInsumosBase()">📦 Agregar lista básica de materia prima</button>
    <div class="card">${l.length ? l.map(i => `<div class="li" onclick="modalInsumo('${i.id}')" style="cursor:pointer">
      <div class="grow"><div class="t">${esc(i.nombre)} ${i.ejemplo ? '<span class="tag cotizacion">precio de ejemplo</span>' : ''}${!num(i.presentacion_precio) ? '<span class="tag cancelado">falta precio</span>' : ''}</div>
      <div class="muted mini">${num(i.presentacion_cantidad)} ${i.unidad} por ${money2(i.presentacion_precio)}${i.proveedor ? ' · ' + esc(i.proveedor) : ''} · <b style="color:${num(i.existencia) > 0 ? 'var(--ok)' : 'var(--gris)'}">tienes ${Math.round(num(i.existencia))} ${i.unidad}</b></div></div>
      <div class="money mini">${money2(costoUnit(i) * (i.unidad === 'pz' ? 1 : 100))}<div class="muted" style="font-weight:400">${i.unidad === 'pz' ? 'por pieza' : 'por 100 ' + i.unidad}</div></div></div>`).join('')
      : vacio('🥚','Agrega tu primera materia prima.')}</div>
  `, { atras:true, nav:'mas' });
});
function modalInsumo(id){
  const i = id ? byId('insumos', id) : { nombre:'', unidad:'g', presentacion_cantidad:1000, presentacion_precio:'', proveedor:'' };
  modal(`<h2>${id ? 'Editar' : 'Nueva'} materia prima</h2><form id="fi">
    <label class="f">Nombre</label><input class="i" name="nombre" required value="${esc(i.nombre)}" placeholder="Ej. Harina, Fondant, Caja 30x30">
    <label class="f">Se mide en</label><select class="i" name="unidad">${[['g','gramos (g)'],['ml','mililitros (ml)'],['pz','piezas']].map(([k,v]) => `<option value="${k}" ${k===i.unidad?'selected':''}>${v}</option>`).join('')}</select>
    <div class="grid2">
      <div><label class="f">¿Cuánto trae?</label><input class="i" name="presentacion_cantidad" type="number" step="any" inputmode="decimal" required value="${i.presentacion_cantidad}"></div>
      <div><label class="f">¿Cuánto costó?</label><input class="i" name="presentacion_precio" type="number" step="any" inputmode="decimal" required value="${i.presentacion_precio}"></div>
    </div>
    <p class="muted mini">Ej. bolsa de harina de 1000 g que costó $28 · cartón de 30 huevos (30 pz) en $95</p>
    <label class="f">¿Cuánto tienes en la alacena? (${i.unidad})</label><input class="i" name="existencia" type="number" step="any" inputmode="decimal" value="${num(i.existencia)}">
    <p class="muted mini">Se suma solo al palomear compras y se descuenta al entregar pedidos.</p>
    <label class="f">¿Dónde lo compras? (opcional)</label><input class="i" name="proveedor" value="${esc(i.proveedor)}">
    <button class="btn full" style="margin-top:14px">Guardar</button>
    ${id ? '<button type="button" class="btn peligro full" style="margin-top:8px" id="bi">Eliminar</button>' : ''}</form>`, m => {
    $('#fi', m).onsubmit = async e => { e.preventDefault(); const f = formData(e.target); f.ejemplo = false;
      if (id && num(f.presentacion_precio) !== num(i.presentacion_precio)){ f.precio_anterior = num(i.presentacion_precio); f.precio_cambio = new Date().toISOString(); }
      if (!LOCAL) delete f.ejemplo; f.actualizado = new Date().toISOString();
      await guardar(() => id ? DB.upd('insumos', id, f) : DB.ins('insumos', f), '✅ Guardado'); await recargar('insumos'); closeModal(); render(); };
    $('#bi', m) && ($('#bi', m).onclick = async () => { if (!await confirmar('¿Eliminar?')) return; await guardar(() => DB.del('insumos', id), 'Eliminado'); await recargar('insumos','receta_insumos'); closeModal(); render(); });
  });
}

/* ---------- RECETAS ---------- */
ruta('recetas', () => {
  if (soloAdmin()) return;
  pagina('Recetas', `
    <p class="muted">Cada receta dice para cuántas personas rinde. El cotizador la escala al tamaño del pastel.</p>
    <a class="btn" href="#/receta-editar" style="margin-bottom:12px">＋ Nueva receta</a>
    ${Object.entries(TIPOS_REC).map(([t, lab]) => { const rs = S.d.recetas.filter(r => r.tipo === t); if (!rs.length) return '';
      return `<div class="card"><h2>${lab}</h2>${rs.map(r => { const c = costoReceta(r.id); return `<a class="li" href="#/receta-editar/${r.id}" style="text-decoration:none;color:inherit">
        <div class="grow"><div class="t">${esc(r.nombre)}</div><div class="muted mini">Rinde ${r.rinde_personas} personas · ${r.horas} h</div></div>
        <div style="text-align:right"><div class="money">${money2(c)}</div><div class="muted mini">${money2(c / Math.max(1, num(r.rinde_personas)))} / persona</div></div></a>`; }).join('')}</div>`; }).join('')
      || vacio('📒','Todavía no hay recetas.')}
  `, { atras:true, nav:'mas' });
});
ruta('receta-editar', id => {
  if (soloAdmin()) return;
  const r = id ? byId('recetas', id) : { nombre:'', tipo:'base', rinde_personas:20, horas:1, notas:'' };
  const filas = id ? S.d.receta_insumos.filter(x => x.receta_id === id) : [];
  const opts = S.d.insumos.slice().sort((a,b) => a.nombre.localeCompare(b.nombre)).map(i => `<option value="${i.id}">${esc(i.nombre)} (${i.unidad})</option>`).join('');
  const fila = x => `<div class="row ri" style="margin-bottom:8px"><select class="i grow"><option value="">— ingrediente —</option>${opts.replace(`value="${x.insumo_id}"`, `value="${x.insumo_id}" selected`)}</select>
    <input class="i" type="number" step="any" inputmode="decimal" placeholder="cant." style="width:90px" value="${x.cantidad ?? ''}"><button type="button" class="btn peligro chico" data-del>✕</button></div>`;
  pagina(id ? 'Editar receta' : 'Nueva receta', `
  <form id="fr">
    <div class="card">
      <label class="f" style="margin-top:0">Nombre</label><input class="i" name="nombre" required value="${esc(r.nombre)}" placeholder="Ej. Pan de chocolate">
      <label class="f">Tipo</label><select class="i" name="tipo">${Object.entries(TIPOS_REC).map(([k,v]) => `<option value="${k}" ${k===r.tipo?'selected':''}>${v}</option>`).join('')}</select>
      <div class="grid2">
        <div><label class="f">Rinde (personas)</label><input class="i" name="rinde_personas" type="number" inputmode="numeric" required value="${r.rinde_personas}"></div>
        <div><label class="f">Horas de trabajo</label><input class="i" name="horas" type="number" step="0.25" inputmode="decimal" value="${r.horas}"></div>
      </div>
    </div>
    <div class="card"><h2>Ingredientes</h2>
      ${S.d.insumos.length ? '' : '<div class="nota">Primero da de alta tu materia prima en <a href="#/insumos">Materia prima</a>.</div>'}
      <div id="ris">${filas.map(fila).join('')}</div>
      <button type="button" class="btn sec chico" id="addri">＋ Ingrediente</button>
      <div class="res total" style="margin-top:10px"><span>Costo de la receta</span><span id="rcost">$0</span></div>
    </div>
    <div class="card"><label class="f" style="margin-top:0">Notas / procedimiento</label><textarea class="i" name="notas">${esc(r.notas)}</textarea></div>
    <button class="btn full">💾 Guardar receta</button>
    ${id ? '<button type="button" class="btn peligro full" style="margin-top:10px" id="br">Eliminar receta</button>' : ''}
  </form>`, { atras:true, nav:'mas' });
  const calc = () => { let c = 0; $$('.ri').forEach(rw => { const i = byId('insumos', $('select', rw).value); if (i) c += num($('input', rw).value) * costoUnit(i); });
    $('#rcost').textContent = money2(c) + ' · ' + money2(c / Math.max(1, num($('[name=rinde_personas]').value))) + '/pers.'; };
  $('#addri').onclick = () => { $('#ris').insertAdjacentHTML('beforeend', fila({})); };
  $('#ris').addEventListener('click', e => { if (e.target.dataset.del !== undefined){ e.target.closest('.ri').remove(); calc(); } });
  $('#fr').addEventListener('input', calc); $('#fr').addEventListener('change', calc); calc();
  $('#br') && ($('#br').onclick = async () => { if (!await confirmar('¿Eliminar receta?')) return; await guardar(() => DB.del('recetas', id), 'Eliminada');
    if (LOCAL) for (const x of filas) await DB.del('receta_insumos', x.id); await recargar('recetas','receta_insumos'); ir('#/recetas'); });
  $('#fr').onsubmit = async e => {
    e.preventDefault(); const f = formData(e.target);
    try {
      const row = { nombre:f.nombre, tipo:f.tipo, rinde_personas:f.rinde_personas, horas:f.horas || 0, notas:f.notas };
      const rec = id ? await DB.upd('recetas', id, row) : await DB.ins('recetas', row);
      await DB.delWhere('receta_insumos', 'receta_id', rec.id);
      for (const rw of $$('.ri')){ const iid = $('select', rw).value; const c = num($('input', rw).value); if (iid && c) await DB.ins('receta_insumos', { receta_id:rec.id, insumo_id:iid, cantidad:c }); }
      await recargar('recetas','receta_insumos'); toast('✅ Receta guardada'); ir('#/recetas');
    } catch(err){ toast('⚠️ ' + err.message, 4000); }
  };
});

/* ---------- LISTA DE COMPRAS ---------- */
let diasCompra = 7;
ruta('compras', () => {
  const h = hoy(); const lim = ymd(addDays(new Date(), diasCompra));
  const peds = activos().filter(p => { const d = ymd(new Date(p.fecha_entrega)); return d >= h && d <= lim; });
  const tot = {};
  peds.forEach(p => Object.entries(consumoPedido(p)).forEach(([iid, c]) => { tot[iid] = (tot[iid] || 0) + c; }));
  const marcado = JSON.parse(localStorage.getItem('hv_comprado') || '{}');
  const items = Object.entries(tot).map(([iid, cant]) => { const i = byId('insumos', iid); if (!i) return null;
      const tengo = num(i.existencia); const falta = Math.max(0, cant - tengo); const pres = Math.max(0.0001, num(i.presentacion_cantidad));
      return { i, cant, tengo, falta, paq: Math.ceil(falta / pres), pres }; })
    .filter(Boolean).sort((a,b) => (b.falta > 0) - (a.falta > 0) || a.i.nombre.localeCompare(b.i.nombre));
  const porComprar = items.filter(x => x.falta > 0);
  const costoTot = porComprar.reduce((s, x) => s + x.paq * num(x.i.presentacion_precio), 0);
  const tareasC = S.d.tareas.filter(t => t.tipo === 'comprar' && !t.hecho && t.fecha <= lim).sort((a,b) => a.fecha.localeCompare(b.fecha));
  const fmtCant = (c, u) => u === 'pz' ? Math.ceil(c) + ' pz' : c >= 1000 ? (c/1000).toFixed(2).replace(/\.?0+$/,'') + (u === 'g' ? ' kg' : ' L') : Math.round(c) + ' ' + u;
  S._listaTxt = `🛒 Lista de compras (${peds.length} pedidos, próximos ${diasCompra} días)\n` + porComprar.map(x => `• ${x.i.nombre}: ${x.paq} × ${fmtCant(x.pres, x.i.unidad)}`).join('\n');
  pagina('Lista de compras', `
    <div class="chips">${[7,14,30].map(d => `<button class="chip ${diasCompra===d?'on':''}" onclick="diasCompra=${d};render()">Próximos ${d} días</button>`).join('')}</div>
    ${tareasC.length ? `<div class="card"><h2>Cuándo comprar</h2>${tareasC.map(t => tareaHTML(t)).join('')}</div>` : ''}
    <div class="card"><div class="row between"><h2>Qué comprar</h2><span class="muted mini">${peds.length} pedido(s)</span></div>
      <p class="muted mini" style="margin-top:-6px">Ya resta lo que hay en la alacena. Palomea al comprar y se suma solo.</p>
      ${items.length ? items.map(x => { const k = x.i.id + '_' + lim;
        if (!x.falta && !marcado[k]) return `<div class="li"><div class="ic">✅</div><div class="grow"><div class="t">${esc(x.i.nombre)}</div>
          <div class="muted mini">Necesitas ${fmtCant(x.cant, x.i.unidad)} · tienes ${fmtCant(x.tengo, x.i.unidad)}: ya alcanza</div></div></div>`;
        return `<label class="li" style="cursor:pointer"><input type="checkbox" style="width:24px;height:24px;accent-color:var(--ok)" ${marcado[k]?'checked':''} onchange="marcarCompra('${k}',this.checked,'${x.i.id}',${x.paq * x.pres})">
          <div class="grow"><div class="t">${esc(x.i.nombre)}</div><div class="muted mini">Necesitas ${fmtCant(x.cant, x.i.unidad)}${x.tengo ? ` · tienes ${fmtCant(x.tengo, x.i.unidad)}` : ''} → <b>compra ${x.paq} × ${fmtCant(x.pres, x.i.unidad)}</b>${x.i.proveedor ? ' · ' + esc(x.i.proveedor) : ''}</div></div>
          ${isAdmin() ? `<span class="money mini">${money(x.paq * num(x.i.presentacion_precio))}</span>` : ''}</label>`; }).join('')
        : vacio('🛒', peds.length ? 'Los pedidos de estas fechas no tienen recetas marcadas.' : 'No hay entregas en estas fechas.')}
      ${porComprar.length && isAdmin() ? `<div class="res total"><span>Gasto aproximado</span><span>${money(costoTot)}</span></div>` : ''}
    </div>
    ${porComprar.length ? `<button class="btn verde full" onclick="compartirLista()">💬 Mandar lista por WhatsApp</button>` : ''}
    ${isAdmin() ? '<a class="btn sec full" style="margin-top:8px" href="#/insumos">🥚 Ver alacena y precios</a>' : ''}
  `, { atras:true, nav:'mas' });
});
async function marcarCompra(k, v, iid, cant){
  const m = JSON.parse(localStorage.getItem('hv_comprado') || '{}');
  const delta = v ? cant : -(m[k] || cant);
  if (v) m[k] = cant; else delete m[k];
  localStorage.setItem('hv_comprado', JSON.stringify(m));
  try { await sumarExistencia(iid, delta); await recargar('insumos'); toast(v ? '🥚 Sumado a la alacena' : 'Quitado de la alacena'); } catch(e){ toast('⚠️ ' + e.message, 4000); }
}
function compartirLista(){ window.open('https://wa.me/?text=' + encodeURIComponent(S._listaTxt), '_blank'); }

/* ---------- CUENTAS ---------- */
let mesCta = null;
const CAT_GASTO = ['Materia prima','Empaque','Gas','Luz','Transporte','Equipo y utensilios','Publicidad','Otro'];
ruta('cuentas', () => {
  if (soloAdmin()) return;
  const base = mesCta ? new Date(mesCta) : new Date(); base.setDate(1);
  const ym = ymd(base).slice(0,7);
  const resumen = k => {
    const pg = S.d.pagos.filter(p => (p.fecha||'').startsWith(k));
    const mv = S.d.movimientos.filter(m => (m.fecha||'').startsWith(k));
    const ing = pg.reduce((s,p) => s+num(p.monto),0) + mv.filter(m => m.tipo==='ingreso').reduce((s,m) => s+num(m.monto),0);
    const gas = mv.filter(m => m.tipo==='gasto').reduce((s,m) => s+num(m.monto),0);
    return { pg, mv, ing, gas, gan: ing - gas };
  };
  const R = resumen(ym);
  const entregados = S.d.pedidos.filter(p => p.estado === 'entregado' && ymd(new Date(p.fecha_entrega)).startsWith(ym)).length;
  const porCat = {}; R.mv.filter(m => m.tipo === 'gasto').forEach(m => porCat[m.categoria] = (porCat[m.categoria]||0) + num(m.monto));
  const lista = [
    ...R.pg.map(p => ({ f:p.fecha, t:'ingreso', c:'Pago de pedido', d:(byId('pedidos', p.pedido_id)?.cliente || '') + ' · ' + p.tipo, m:p.monto, id:null })),
    ...R.mv.map(m => ({ f:m.fecha, t:m.tipo, c:m.categoria, d:m.concepto, m:m.monto, id:m.id }))
  ].sort((a,b) => (b.f||'').localeCompare(a.f||''));
  const ult6 = [...Array(6)].map((_, k) => { const d = new Date(base); d.setMonth(d.getMonth() - k); const key = ymd(d).slice(0,7); return { key, lab: MESES[d.getMonth()].slice(0,3) + ' ' + String(d.getFullYear()).slice(2), ...resumen(key) }; });
  pagina('Cuentas', `
    <div class="row between card"><button class="btn sec chico" onclick="mesCta=new Date(${base.getFullYear()},${base.getMonth()-1},1);render()">‹</button>
      <h2 style="margin:0;text-transform:capitalize">${MESES[base.getMonth()]} ${base.getFullYear()}</h2>
      <button class="btn sec chico" onclick="mesCta=new Date(${base.getFullYear()},${base.getMonth()+1},1);render()">›</button></div>
    <div class="grid3" style="margin-bottom:12px">
      <div class="stat"><b style="color:var(--ok)">${money(R.ing)}</b><small>entró</small></div>
      <div class="stat"><b style="color:var(--error)">${money(R.gas)}</b><small>salió</small></div>
      <div class="stat"><b>${money(R.gan)}</b><small>ganancia</small></div>
    </div>
    <p class="muted mini" style="margin-top:-4px">${entregados} pedido(s) entregados este mes${entregados ? ` · ganancia promedio ${money(R.gan / entregados)} por pedido` : ''}.</p>
    <div class="grid2" style="margin-bottom:12px"><button class="btn" onclick="modalMov('gasto')">− Anotar gasto</button><button class="btn sec" onclick="modalMov('ingreso')">＋ Otro ingreso</button></div>
    ${Object.keys(porCat).length ? `<div class="card"><h2>¿En qué se fue el dinero?</h2>${Object.entries(porCat).sort((a,b) => b[1]-a[1]).map(([c,v]) => `<div class="res"><span>${esc(c)}</span><span class="money">${money(v)}</span></div>`).join('')}</div>` : ''}
    <div class="card"><h2>Movimientos</h2>
      ${lista.length ? lista.map(x => `<div class="li"><div class="ic" style="background:${x.t==='ingreso'?'#DDF3E8':'#fbe0e4'}">${x.t==='ingreso'?'💵':'🧾'}</div>
        <div class="grow"><div class="t">${esc(x.c)}</div><div class="muted mini">${fCorta(x.f)}${x.d ? ' · ' + esc(x.d) : ''}</div></div>
        <span class="money" style="color:${x.t==='ingreso'?'var(--ok)':'var(--error)'}">${x.t==='ingreso'?'+':'−'}${money(x.m)}</span>
        ${x.id ? `<button class="btn peligro chico" style="padding:3px 8px" onclick="borrarMov('${x.id}')">✕</button>` : ''}</div>`).join('') : vacio('🧾','Sin movimientos este mes.')}
      <p class="muted mini">Los pagos de pedidos (anticipos y saldos) se suman solos.</p></div>
    <div class="card"><h2>Últimos 6 meses</h2><table class="tabla"><tr><th>Mes</th><th class="r">Entró</th><th class="r">Salió</th><th class="r">Ganancia</th></tr>
      ${ult6.map(x => `<tr><td>${x.lab}</td><td class="r">${money(x.ing)}</td><td class="r">${money(x.gas)}</td><td class="r"><b style="color:${x.gan>=0?'var(--ok)':'var(--error)'}">${money(x.gan)}</b></td></tr>`).join('')}</table>
      <button class="btn sec chico" style="margin-top:10px" onclick="exportarCSV()">⬇️ Descargar para Excel</button></div>
  `, { atras:true, nav:'mas' });
});
function modalMov(tipo){
  modal(`<h2>${tipo === 'gasto' ? 'Anotar gasto' : 'Otro ingreso'}</h2><form id="fm">
    <label class="f">Monto</label><input class="i" name="monto" type="number" step="any" inputmode="decimal" required>
    ${tipo === 'gasto' ? `<label class="f">Categoría</label><select class="i" name="categoria">${CAT_GASTO.map(c => `<option>${c}</option>`).join('')}</select>`
      : `<label class="f">Categoría</label><select class="i" name="categoria"><option>Venta sin pedido</option><option>Curso / clase</option><option>Otro</option></select>`}
    <label class="f">Concepto</label><input class="i" name="concepto" placeholder="${tipo==='gasto'?'Ej. Compra en la central':'Ej. Venta de galletas en la feria'}">
    <label class="f">Fecha</label><input class="i" type="date" name="fecha" value="${hoy()}">
    <button class="btn full" style="margin-top:14px">Guardar</button></form>`, m => {
    $('#fm', m).onsubmit = async e => { e.preventDefault(); const f = formData(e.target);
      await guardar(() => DB.ins('movimientos', { tipo, ...f }), '✅ Anotado'); await recargar('movimientos'); closeModal(); render(); };
  });
}
async function borrarMov(id){ if (!await confirmar('¿Borrar este movimiento?')) return; await guardar(() => DB.del('movimientos', id), 'Borrado'); await recargar('movimientos'); render(); }
function exportarCSV(){
  const filas = [['fecha','tipo','categoria','concepto','monto']];
  S.d.pagos.forEach(p => filas.push([p.fecha, 'ingreso', 'Pago de pedido', (byId('pedidos', p.pedido_id)?.cliente || '') + ' ' + p.tipo, p.monto]));
  S.d.movimientos.forEach(m => filas.push([m.fecha, m.tipo, m.categoria, m.concepto, m.monto]));
  const csv = '﻿' + filas.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' })); a.download = 'cuentas-hilda-velper.csv'; a.click();
}

/* ---------- MÁS ---------- */
ruta('mas', () => {
  const it = (h, ic, t, d) => `<a class="li" href="${h}" style="text-decoration:none;color:inherit"><div class="ic">${ic}</div><div class="grow"><div class="t">${t}</div><div class="muted mini">${d}</div></div><span style="color:var(--lila)">›</span></a>`;
  pagina('Más', `
    <div class="card">
      ${it('#/pedidos" onclick="vistaPed=\'cal\'', '📅', 'Calendario', 'Entregas, compras y horneados del mes')}
      ${it('#/compras', '🛒', 'Lista de compras', 'Qué comprar (ya resta lo de la alacena)')}
      ${it('#/solicitudes', '📝', `Solicitudes${solNuevas().length ? ` <span class="pill-cnt">${solNuevas().length}</span>` : ''}`, 'Lo que piden los clientes desde el catálogo')}
      ${it('#/clientes', '👥', 'Clientes', 'Directorio, historial y cumpleaños')}
      ${isAdmin() ? it('#/estadisticas', '🏆', 'Estadísticas', 'Lo más vendido y mejores clientes') : ''}
      ${isAdmin() ? it('#/cuentas', '💰', 'Cuentas', 'Lo que entra, lo que sale y la ganancia') : ''}
      ${isAdmin() ? it('#/insumos', '🥚', 'Materia prima', 'Precios de ingredientes y material') : ''}
      ${isAdmin() ? it('#/recetas', '📒', 'Recetas', 'Lo que lleva cada pan, relleno y betún') : ''}
      ${isAdmin() ? it('#/alertas', '📈', 'Alerta de precios', 'Qué subió y qué pasteles dejan poca ganancia') : ''}
      ${it('#/simulador', '🎂', 'Simulador de pisos', 'Qué moldes y cuántos pisos según las personas')}
      ${it('#/editor', '📸', 'Crear publicación', 'Foto con logo para Facebook, Instagram y WhatsApp')}
      ${it('#/galeria', '🖼️', 'Antes y después', 'Pasteles terminados contra la foto que mandó el cliente')}
      ${it('#/temporadas', '📆', 'Temporadas', 'Fechas fuertes del año para preparar promociones')}
      <a class="li" href="javascript:void 0" onclick="modalTextos('')" style="text-decoration:none;color:inherit"><div class="ic">✍️</div><div class="grow"><div class="t">Textos para redes</div><div class="muted mini">Ideas de texto con hashtags para tus publicaciones</div></div><span style="color:var(--lila)">›</span></a>
    </div>
    <div class="card">
      ${it('#/compartir', '🔗', 'Catálogo para clientes', 'Link y código QR para compartir')}
      ${isAdmin() ? it('#/ajustes', '⚙️', 'Ajustes', 'Negocio, precios, tiempos y usuarios') : ''}
      ${isAdmin() ? it('#/arranque', '🚀', 'Primeros pasos', 'Lo que falta para usar la app con datos reales') : ''}
      ${isAdmin() ? it('#/metodo', '📝', 'Cuestionario de precios', 'Para que el cotizador calcule como Hilda') : ''}
      ${it('#/mejoras', '💡', 'Ideas y mejoras', 'Anota lo que le cambiarías a la app')}
      <a class="li" href="javascript:void 0" onclick="activarAvisos()" style="text-decoration:none;color:inherit"><div class="ic">🔔</div><div class="grow"><div class="t">Avisos en el celular</div>
        <div class="muted mini">${'Notification' in window && Notification.permission === 'granted' ? '✅ Activados en este celular' : 'Toca para activar los avisos de tareas'}</div></div><span style="color:var(--lila)">›</span></a>
      ${it('#/ayuda', '❓', 'Ayuda', 'Cómo usar la app')}
    </div>
    <div class="card"><h3 style="margin-top:0">🌙 Apariencia</h3><div class="chips">${[['claro','☀️ Claro'],['oscuro','🌙 Oscuro'],['auto','📱 Como el celular']]
      .map(([k,v]) => `<button class="chip ${(localStorage.getItem('hv_tema')||'claro')===k?'on':''}" onclick="cambiarTema('${k}')">${v}</button>`).join('')}</div></div>
    ${LOCAL ? `<div class="card lila"><h3>Modo demo</h3><p class="muted mini">Ver la app como:</p>
      <div class="chips" style="flex-wrap:wrap">${S.d.perfiles.map(u => `<button class="chip ${S.perfil.id===u.id?'on':''}" onclick="localStorage.setItem('hv_yo','${u.id}');location.reload()">${esc(u.nombre)} (${u.rol})</button>`).join('')}</div>
      <button class="btn peligro chico" onclick="if(confirm('¿Borrar todos los datos de prueba y empezar de cero?')){Object.keys(localStorage).filter(k=>k.startsWith('hv_')).forEach(k=>localStorage.removeItem(k));location.reload()}">Reiniciar demo</button></div>`
      : `<button class="btn sec full" onclick="salir()">Cerrar sesión (${esc(S.perfil?.nombre || '')})</button>`}
    <p class="muted mini" style="text-align:center;margin-top:16px">Hilda VelPer app · versión ${APP_VERSION}</p>
  `);
});

/* ---------- AJUSTES ---------- */
ruta('ajustes', () => {
  if (soloAdmin()) return;
  const a = A(); const n = { ...NEGOCIO_DEF, ...S.negocio };
  const campo = (name, lab, val, extra='') => `<div><label class="f">${lab}</label><input class="i" type="number" step="any" inputmode="decimal" name="${name}" value="${val ?? ''}" ${extra}></div>`;
  pagina('Ajustes', `
    <form id="fn" class="card"><h2>Negocio</h2>
      <label class="f">Nombre</label><input class="i" name="nombre" value="${esc(n.nombre)}">
      <label class="f">Lema</label><input class="i" name="lema" value="${esc(n.lema)}">
      <label class="f">WhatsApp del negocio (10 dígitos)</label><input class="i" name="whatsapp" type="tel" value="${esc(n.whatsapp)}">
      <label class="f">Link de Facebook</label><input class="i" name="facebook" value="${esc(n.facebook)}">
      <label class="f">Link de Instagram</label><input class="i" name="instagram" value="${esc(n.instagram)}">
      <label class="f">Mensaje del catálogo</label><textarea class="i" name="mensaje_catalogo">${esc(n.mensaje_catalogo)}</textarea>
      <label class="f">⭐ Link para reseñas de Google (opcional)</label><input class="i" name="resena_google" value="${esc(n.resena_google || '')}" placeholder="https://g.page/r/…/review">
      <label class="f">⭐ Link para reseñas de Facebook (opcional)</label><input class="i" name="resena_facebook" value="${esc(n.resena_facebook || '')}">
      <label class="f">🎂 Tus moldes (diámetro cm : porciones, separados por coma)</label><input class="i" name="moldes" value="${esc(n.moldes || '15:12,20:22,25:35,30:50')}">
      <p class="muted mini">Lo usa el simulador de pisos. Ej. 20:22 = molde de 20 cm da 22 porciones.</p>
      <button class="btn full" style="margin-top:12px">Guardar negocio</button></form>
    <form id="fa" class="card"><h2>Cómo calcular el precio</h2>
      <div class="nota">Provisional: lo ajustamos cuando Hilda explique su método.</div>
      <div class="grid2">
        ${campo('tarifa_hora','Tu hora de trabajo ($)',a.tarifa_hora)}
        ${campo('margen_pct','Ganancia (%)',a.margen_pct)}
        ${campo('gastos_fijos_mes','Gastos fijos al mes ($)',a.gastos_fijos_mes)}
        ${campo('pedidos_mes','Pedidos al mes (aprox.)',a.pedidos_mes)}
        ${campo('empaque_default','Empaque normal ($)',a.empaque_default)}
        ${campo('redondeo','Redondear a múltiplos de',a.redondeo)}
        ${campo('precio_persona','Precio por persona ($, opcional)',a.precio_persona)}
        ${campo('meta_mes','🎯 Meta de ventas del mes ($)',a.meta_mes)}
        ${campo('margen_minimo','Alertar si la ganancia baja de (%)',a.margen_minimo)}
        ${campo('anticipo_pct','Anticipo sugerido (%)',a.anticipo_pct)}
      </div>
      <label class="f">💳 Datos para transferencia (banco, CLABE, a nombre de…)</label><textarea class="i" name="pago_info" rows="3" placeholder="Ej. BBVA · CLABE 012 345 678901234567 · a nombre de Hilda …">${esc(a.pago_info || '')}</textarea>
      <label class="f">🔗 Link de pago (Mercado Pago u otro, opcional)</label><input class="i" name="link_pago" value="${esc(a.link_pago || '')}" placeholder="https://mpago.la/…">
      <label class="f">Tamaños de la tabla de precios (personas, separados por coma)</label><input class="i" name="tamanos" value="${esc(a.tamanos)}">
      <h2 style="margin-top:16px">Tiempos (días antes de la entrega)</h2>
      <div class="grid2">
        ${campo('dias_compra','Comprar material',a.dias_compra)}
        ${campo('dias_horneado','Preparar / hornear',a.dias_horneado)}
        ${campo('dias_decorado','Decorar',a.dias_decorado)}
        ${campo('umbral_grande','Pastel grande desde (personas)',a.umbral_grande)}
        ${campo('dias_extra_grande','Días extra si es grande',a.dias_extra_grande)}
        ${campo('capacidad_dia','Máximo de pedidos por día',a.capacidad_dia)}
        ${campo('aviso_temporada','Avisar temporadas (días antes)',a.aviso_temporada)}
      </div>
      <label class="check"><input type="checkbox" name="recalcular"> Recalcular las tareas de los pedidos activos con estos tiempos</label>
      <button class="btn full" style="margin-top:6px">Guardar precios y tiempos</button></form>
    <form id="fpl" class="card"><h2>💬 Mensajes de WhatsApp</h2>
      <p class="muted mini">Puedes usar: {cliente} {pastel} {personas} {fecha} {hora} {entrega} {total} {anticipo} {resta} {negocio}</p>
      ${Object.keys(PLANTILLAS_DEF).map(k => `<label class="f">${PLANTILLAS_DEF[k].t}</label><textarea class="i" name="${k}" rows="4">${esc(plantilla(k).txt)}</textarea>`).join('')}
      <div class="grid2" style="margin-top:12px"><button class="btn">Guardar mensajes</button><button type="button" class="btn sec" id="plReset">Restaurar originales</button></div></form>
    <div class="card"><h2>💾 Respaldo</h2><p class="muted mini">Descarga todo (pedidos, clientes, cuentas, recetas…) en un Excel. Hazlo una vez al mes y guárdalo en Drive.</p>
      <button class="btn sec" onclick="descargarRespaldo()">⬇️ Descargar respaldo en Excel</button>
      <p class="muted mini">Último: ${localStorage.getItem('hv_respaldo') ? fCorta(localStorage.getItem('hv_respaldo')) : 'nunca'}</p></div>
    <div class="card"><h2>Usuarios</h2>
      <p class="muted mini">Admin ve todo (cuentas, costos, precios). Ayudante ve pedidos, tareas, catálogo y lista de compras. Toca el nombre para cambiar cómo saluda la app.</p>
      ${S.d.perfiles.map(u => `<div class="li"><div class="grow"><input class="i" style="padding:6px 10px;font-weight:700" value="${esc(u.nombre)}" placeholder="Nombre" onchange="cambiarPerfil('${u.id}',{nombre:this.value.trim()})"><div class="muted mini" style="margin-top:3px">${esc(u.email || '')}</div></div>
        <select class="i" style="width:auto;padding:6px" onchange="cambiarPerfil('${u.id}',{rol:this.value})" ${u.id===S.perfil.id?'disabled':''}>
          <option value="admin" ${u.rol==='admin'?'selected':''}>Admin</option><option value="ayudante" ${u.rol==='ayudante'?'selected':''}>Ayudante</option></select>
        <label class="check" style="margin:0"><input type="checkbox" ${u.activo?'checked':''} ${u.id===S.perfil.id?'disabled':''} onchange="cambiarPerfil('${u.id}',{activo:this.checked})"> activo</label></div>`).join('')}
      ${LOCAL ? '' : '<p class="muted mini">Para agregar a alguien: que abra la app y toque "Crear cuenta"; luego aquí lo activas.</p>'}
    </div>
  `, { atras:true, nav:'mas' });
  $('#fpl').onsubmit = async e => { e.preventDefault(); S.ajustes = await guardar(() => DB.saveOne('ajustes', { plantillas: formData(e.target) }), '✅ Mensajes guardados'); };
  $('#plReset').onclick = async () => { if (!await confirmar('¿Regresar los mensajes originales?')) return; S.ajustes = await guardar(() => DB.saveOne('ajustes', { plantillas:{} }), 'Mensajes restaurados'); render(); };
  $('#fn').onsubmit = async e => { e.preventDefault(); S.negocio = await guardar(() => DB.saveOne('negocio', formData(e.target)), '✅ Negocio guardado'); };
  $('#fa').onsubmit = async e => {
    e.preventDefault(); const f = formData(e.target); const rec = f.recalcular; delete f.recalcular;
    S.ajustes = await guardar(() => DB.saveOne('ajustes', f), '✅ Guardado');
    if (rec){ for (const p of activos()) await regenerarTareas(p); toast('✅ Tareas recalculadas'); }
  };
});
async function cambiarPerfil(id, patch){ await guardar(() => DB.upd('perfiles', id, patch), '✅ Usuario actualizado'); await recargar('perfiles'); if (id === S.perfil.id) S.perfil = byId('perfiles', id) || S.perfil; }

/* ---------- COMPARTIR CATÁLOGO ---------- */
ruta('compartir', async () => {
  const link = location.origin + location.pathname + '?catalogo';
  const n = { ...NEGOCIO_DEF, ...S.negocio };
  pagina('Catálogo para clientes', `
    <div class="card" style="text-align:center">
      <p>Este es el link que puedes poner en Facebook, Instagram o mandar por WhatsApp. Los clientes ven los pasteles y te escriben directo.</p>
      <input class="i" readonly value="${esc(link)}" onclick="this.select()">
      <div class="row wrap" style="justify-content:center;margin-top:10px">
        <button class="btn" id="cop">📋 Copiar link</button><a class="btn sec" href="${esc(link)}" target="_blank">👀 Ver</a>
        <a class="btn verde" target="_blank" href="https://wa.me/?text=${encodeURIComponent('🎂 Mira el catálogo de ' + n.nombre + ': ' + link)}">💬 Mandar</a>
      </div>
      <div id="qr" style="margin:16px auto 6px;width:240px;min-height:240px;display:grid;place-items:center" class="muted">Generando QR…</div>
      <a class="btn sec chico" id="dqr" download="qr-catalogo-hilda-velper.png">⬇️ Descargar QR</a>
      ${!n.whatsapp && isAdmin() ? '<div class="nota" style="text-align:left">Falta poner el WhatsApp del negocio en <a href="#/ajustes">Ajustes</a> para que salga el botón "Pedir por WhatsApp".</div>' : ''}
      ${LOCAL ? '<div class="nota" style="text-align:left">En modo demo el link solo funciona en este celular. Cuando conectes Supabase, cualquiera lo podrá abrir.</div>' : ''}
    </div>
    <div class="card"><h3>Idea para WhatsApp Business</h3><p class="muted mini">En WhatsApp Business → Herramientas → Mensaje de bienvenida, pon algo como:</p>
      <div class="nota">¡Hola! Gracias por escribir a ${esc(n.nombre)} 🎂 Mientras te contestamos, mira nuestro catálogo aquí: ${esc(link)}</div></div>
  `, { atras:true, nav:'mas' });
  $('#cop').onclick = async () => { try { await navigator.clipboard.writeText(link); toast('📋 Link copiado'); } catch(e){ prompt('Copia el link:', link); } };
  try {
    if (!window.qrcode) await cargarScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js');
    const q = qrcode(0, 'M'); q.addData(link); q.make();
    const url = q.createDataURL(8, 3);
    $('#qr').innerHTML = `<img src="${url}" style="width:240px;image-rendering:pixelated">`;
    // QR con fondo blanco y nombre abajo para imprimir
    const img = await cargarImg(url); const c = document.createElement('canvas'); c.width = 600; c.height = 700; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0,0,600,700); x.imageSmoothingEnabled = false; x.drawImage(img, 50, 30, 500, 500);
    x.fillStyle = '#D61FC4'; x.textAlign = 'center'; x.font = '700 64px "Dancing Script", cursive'; x.fillText(n.nombre, 300, 610);
    x.fillStyle = '#7B4A9C'; x.font = '700 28px Nunito, sans-serif'; x.fillText('Escanea y mira nuestro catálogo', 300, 660);
    $('#dqr').href = c.toDataURL('image/png');
  } catch(e){ $('#qr').textContent = 'No se pudo generar el QR (¿sin internet?)'; }
});

/* ---------- IDEAS Y MEJORAS ---------- */
ruta('mejoras', () => {
  const l = S.d.mejoras.slice().sort((a,b) => (a.hecho - b.hecho) || (b.creado||'').localeCompare(a.creado||''));
  pagina('Ideas y mejoras', `
    <p class="muted">¿Algo que le cambiarías o agregarías a la app? Anótalo aquí. Luego Nacho copia la lista y se la pasa a Claude.</p>
    <form id="fme" class="row" style="margin-bottom:12px"><input class="i grow" name="texto" required placeholder="Ej. Que el cotizador incluya velitas"><button class="btn">＋</button></form>
    <div class="card">${l.length ? l.map(x => `<div class="li ${x.hecho?'hecho':''}"><input type="checkbox" style="width:22px;height:22px" ${x.hecho?'checked':''} onchange="DB.upd('mejoras','${x.id}',{hecho:this.checked}).then(()=>recargar('mejoras')).then(render)">
      <div class="grow"><div class="t">${esc(x.texto)}</div><div class="muted mini">${esc(x.autor || '')} · ${x.creado ? fCorta(x.creado) : ''}</div></div></div>`).join('') : vacio('💡','Sin ideas todavía.')}</div>
    ${l.some(x => !x.hecho) ? '<button class="btn sec full" id="cpm">📋 Copiar pendientes para Claude</button>' : ''}
  `, { atras:true, nav:'mas' });
  $('#fme').onsubmit = async e => { e.preventDefault(); const f = formData(e.target);
    await guardar(() => DB.ins('mejoras', { texto:f.texto, hecho:false, autor:S.perfil?.nombre || '' }), '💡 Anotada'); await recargar('mejoras'); render(); };
  $('#cpm') && ($('#cpm').onclick = async () => {
    const txt = `Mejoras pendientes para la app Hilda VelPer (v${APP_VERSION}):\n` + l.filter(x => !x.hecho).map((x,i) => `${i+1}. ${x.texto} (${x.autor})`).join('\n');
    try { await navigator.clipboard.writeText(txt); toast('📋 Copiado'); } catch(e){ prompt('Copia:', txt); }
  });
});

/* ---------- AYUDA ---------- */
ruta('ayuda', () => {
  const q = (t, d) => `<details class="card"><summary style="font-weight:800;color:var(--morado-o)">${t}</summary><p>${d}</p></details>`;
  pagina('Ayuda', `
    ${q('¿Cómo anoto un pedido nuevo?', 'En <b>Hoy</b> o <b>Pedidos</b> toca "＋ Pedido". Pon el cliente, la fecha y hora de entrega, las personas y el precio. Si te dejaron anticipo, anótalo ahí mismo. Al guardar, la app crea solita las tareas de comprar, hornear, decorar y entregar.')}
    ${q('¿Cómo saco el precio de un pastel?', 'En <b>Cotizar</b> pon las personas y marca las recetas que lleva (pan, relleno, betún, decoración). Agrega material extra si lleva figuras o toppers. La app te dice cuánto te cuesta hacerlo y el precio sugerido con tu ganancia.')}
    ${q('¿Cómo pongo los precios de mis ingredientes?', 'En <b>Más → Materia prima</b>. Para cada cosa anota cuánto trae el paquete y cuánto te costó (ej. harina 1000 g, $28). Cuando suban los precios, solo cambias ese número y todas las cotizaciones se actualizan.')}
    ${q('¿Cómo hago una imagen para Facebook o WhatsApp?', 'Abre un pastel del <b>Catálogo</b> y toca "Editar imagen para redes". Elige el formato (cuadrado, vertical o historia), acomoda la foto con el dedo, escribe el título y toca <b>Compartir</b>: te deja mandarla directo a WhatsApp, Facebook o Instagram.')}
    ${q('¿Cómo lo paso a mi Google Calendar?', 'En cada pedido hay un botón 📅. Te abre Google Calendar con la fecha y hora ya puestas; solo tocas Guardar. Cada tarea (comprar, hornear) también tiene su 📅.')}
    ${q('¿Quién ve las cuentas?', 'Solo Hilda y Nacho (admins). Papá y la hermana (ayudantes) ven pedidos, tareas, catálogo y la lista de compras, pero no las cuentas ni los costos.')}
    ${q('¿Qué son las solicitudes?', 'Los clientes pueden pedir cotización desde el catálogo público (botón "Pedir cotización") con foto de referencia. Te llegan a <b>Más → Solicitudes</b> y en Hoy. Desde ahí cotizas con su foto, las conviertes en pedido o les contestas por WhatsApp.')}
    ${q('¿Cómo funciona la alacena?', 'En <b>Materia prima</b> anota cuánto tienes de cada cosa. La lista de compras solo te pide lo que falta; al palomear lo comprado se suma, y cuando marcas un pedido como Entregado se descuenta lo que usaron sus recetas.')}
    ${q('¿Cómo pido que me paguen por transferencia?', 'Pon tu CLABE o link de pago en <b>Ajustes</b>. En cada pedido con saldo aparece "Mandar datos de pago": manda por WhatsApp el anticipo sugerido (o lo que resta) con tus datos. Al registrar el pago puedes subir la foto del comprobante.')}
    ${q('¿Cómo pongo el modo oscuro?', 'En <b>Más → Apariencia</b> elige Oscuro, o "Como el celular" para que cambie solo.')}
    ${q('¿Cómo instalo la app en el celular?', 'Abre el link en Chrome, toca los tres puntitos ⋮ y elige <b>"Agregar a la pantalla principal"</b> o "Instalar app". Queda como una app más con el logo.')}
  `, { atras:true, nav:'mas' });
});
