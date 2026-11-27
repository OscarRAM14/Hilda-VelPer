/* =====================================================================
   v1.3.1 · Primeros pasos · Lista básica de materia prima
            Cuestionario de precios para Hilda
   ===================================================================== */

/* ---------- PRIMEROS PASOS (checklist en Hoy para admins) ---------- */
function pasosArranque(){
  const n = { ...NEGOCIO_DEF, ...S.negocio }, a = A();
  const conPrecio = S.d.insumos.filter(i => num(i.presentacion_precio) > 0 && !i.ejemplo).length;
  const prodsPrecio = S.d.productos.filter(p => preciosDe(p).length || num(p.precio) > 0).length;
  const activosN = S.d.perfiles.filter(u => u.activo).length;
  return [
    ['📱', 'WhatsApp del negocio', !!normTel(n.whatsapp), '#/ajustes', 'Para el botón "Pedir por WhatsApp" del catálogo'],
    ['💳', 'Datos de pago (CLABE o link)', !!(a.pago_info || a.link_pago), '#/ajustes', 'Para mandar el anticipo con un toque'],
    ['🎂', 'Tus moldes reales', (n.moldes || '') !== NEGOCIO_DEF.moldes, '#/ajustes', 'Diámetro y porciones de cada molde'],
    ['🥚', `Precios de materia prima (${conPrecio}/10)`, conPrecio >= 10, '#/insumos', 'Lo que pagas por harina, huevo, crema…'],
    ['📒', `Tus recetas (${S.d.recetas.length}/3)`, S.d.recetas.length >= 3, '#/recetas', 'Pan, relleno y betún con cantidades'],
    ['🏷️', `Catálogo con precio (${prodsPrecio}/5)`, prodsPrecio >= 5, '#/catalogo', 'Precio por tamaño de tus pasteles más pedidos'],
    ['👨‍👩‍👧', `Familia en la app (${activosN}/4)`, activosN >= 4, '#/ajustes', 'Que creen su cuenta y aquí los activas'],
    ['🔔', 'Avisos en este celular', 'Notification' in window && Notification.permission === 'granted', 'javascript:activarAvisos()', 'Para que te recuerde comprar y hornear'],
    ['📝', 'Cuestionario de precios', !!localStorage.getItem('hv_metodo_enviado'), '#/metodo', 'Para que el cotizador calcule como tú'],
    ['💾', 'Primer respaldo', !!localStorage.getItem('hv_respaldo'), 'javascript:descargarRespaldo().then(render)', 'Excel con todo, por si acaso']
  ];
}
function tarjetaArranque(){
  if (!isAdmin() || localStorage.getItem('hv_arranque_oculto')) return '';
  const p = pasosArranque(); const hechos = p.filter(x => x[2]).length;
  if (hechos === p.length) return '';
  const pct = Math.round(hechos / p.length * 100);
  const pend = p.filter(x => !x[2]);
  return `<div class="card" style="border:2px solid var(--lila)">
    <div class="row between"><h2 style="margin:0">🚀 Primeros pasos</h2><b style="color:var(--morado-o)">${hechos}/${p.length}</b></div>
    <div style="background:var(--linea);border-radius:999px;height:10px;margin:10px 0"><div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--lila),var(--fucsia));border-radius:999px"></div></div>
    ${pend.slice(0, 3).map(x => `<a class="li" href="${x[3]}" style="text-decoration:none;color:inherit"><div class="ic">${x[0]}</div>
      <div class="grow"><div class="t">${x[1]}</div><div class="muted mini">${x[4]}</div></div><span style="color:var(--lila)">›</span></a>`).join('')}
    <div class="row between" style="margin-top:6px"><a class="mini" href="#/arranque">Ver los ${p.length} pasos</a>
      <button class="btn sec chico" onclick="localStorage.setItem('hv_arranque_oculto','1');render()">Ocultar</button></div></div>`;
}
ruta('arranque', () => {
  const p = pasosArranque(); const hechos = p.filter(x => x[2]).length;
  pagina('Primeros pasos', `
    <p class="muted">Lo que falta para que la app trabaje con los datos reales de Hilda VelPer. Se palomean solos.</p>
    <div class="card"><b>${hechos} de ${p.length} listos</b>
      ${p.map(x => `<a class="li" href="${x[3]}" style="text-decoration:none;color:inherit;${x[2] ? 'opacity:.55' : ''}"><div class="ic">${x[2] ? '✅' : x[0]}</div>
        <div class="grow"><div class="t" style="${x[2] ? 'text-decoration:line-through' : ''}">${x[1]}</div><div class="muted mini">${x[4]}</div></div>${x[2] ? '' : '<span style="color:var(--lila)">›</span>'}</a>`).join('')}</div>
    ${localStorage.getItem('hv_arranque_oculto') ? `<button class="btn sec full" onclick="localStorage.removeItem('hv_arranque_oculto');toast('Se mostrará otra vez en Hoy')">Mostrar en Hoy</button>` : ''}
  `, { atras:true, nav:'mas' });
});

/* ---------- LISTA BÁSICA DE MATERIA PRIMA ---------- */
// Presentaciones comunes en México. Precio en 0: Hilda pone lo que ella paga y corrige la cantidad si su presentación es otra.
const INSUMOS_BASE = [
  ['Harina de trigo','g',1000],['Azúcar estándar','g',1000],['Azúcar glass','g',1000],['Huevo','pz',30],['Mantequilla','g',1000],['Margarina','g',1000],
  ['Aceite vegetal','ml',1000],['Leche entera','ml',1000],['Leche condensada','g',387],['Leche evaporada','g',360],['Media crema','g',225],
  ['Crema para batir','ml',1000],['Queso crema','g',190],['Polvo para hornear','g',110],['Bicarbonato','g',100],['Vainilla','ml',250],['Sal','g',1000],
  ['Cocoa','g',400],['Chocolate semiamargo','g',1000],['Cajeta','g',1000],['Mermelada de fresa','g',1000],['Fresa','g',1000],['Durazno en almíbar','g',820],
  ['Grenetina','g',250],['Gelatina de sabor','g',1000],['Fondant','g',1000],['Colorante en gel','pz',1],['Chispas de colores','g',1000],
  ['Capacillos','pz',100],['Base de cartón','pz',1],['Caja para pastel','pz',1],['Velitas','pz',1]
];
async function cargarInsumosBase(){
  const ya = new Set(S.d.insumos.map(i => i.nombre.trim().toLowerCase()));
  const nuevos = INSUMOS_BASE.filter(([n]) => !ya.has(n.toLowerCase()));
  if (!nuevos.length) return toast('Ya tienes toda la lista básica');
  if (!await confirmar(`¿Agregar ${nuevos.length} materias primas comunes? Llegan con precio $0 para que pongas lo que tú pagas.`)) return;
  toast('Agregando…');
  try {
    for (const [nombre, unidad, cant] of nuevos)
      await DB.ins('insumos', { nombre, unidad, presentacion_cantidad:cant, presentacion_precio:0, proveedor:'', existencia:0 });
    await recargar('insumos'); toast(`✅ ${nuevos.length} agregadas. Ahora ponles precio`); busIns = ''; render();
  } catch(e){ toast('⚠️ ' + e.message, 4000); }
}

/* ---------- CUESTIONARIO DE PRECIOS PARA HILDA ---------- */
const PREGUNTAS_METODO = [
  ['como', 'Hoy, ¿cómo sacas el precio de un pastel?', 'Ej. por persona, por kilo, por tamaño de molde, lo que gasto × 2, comparo con otras pastelerías…'],
  ['tabla', '¿Cuánto cobras hoy según el tamaño?', 'Ej. 10 personas $___ · 20 personas $___ · 30 personas $___ · 50 personas $___'],
  ['decoracion', '¿Cobras más por la decoración? ¿Cuánto?', 'Ej. betún sencillo normal, fondant +$200, figuras +$50 cada una, foto comestible +$80…'],
  ['sabores', '¿Algún sabor o relleno cuesta más?', 'Ej. chocolate +$50, tres leches +$80, relleno de fruta natural…'],
  ['tiempo', '¿Cuentas tu tiempo? ¿Cuánto crees que vale tu hora?', 'Ej. no lo cuento / $50 la hora…'],
  ['gastos', '¿Incluyes gas, luz, caja y base en el precio?', 'Ej. la caja la cobro aparte $30, el gas no lo cuento…'],
  ['anticipo', '¿Cuánto anticipo pides y cuándo?', 'Ej. 50% al apartar, el resto al entregar'],
  ['dias', '¿Con cuántos días compras y horneas? ¿Cambia si es grande?', 'Ej. compro 3 días antes; horneo 1 día antes, si es de 50+ personas 2 días'],
  ['moldes', '¿Qué moldes usas y cuántas rebanadas salen de cada uno?', 'Ej. 20 cm = 20 rebanadas, 25 cm = 30, rectangular = 50'],
  ['capacidad', '¿Cuántos pedidos puedes hacer como máximo en un día?', 'Ej. 3 pasteles o 2 si uno es grande'],
  ['ejemplo', 'Ejemplo real: un pastel que hiciste hace poco', 'Qué era, para cuántas personas, cuánto gastaste más o menos, cuántas horas te llevó y cuánto cobraste']
];
ruta('metodo', () => {
  const r = JSON.parse(localStorage.getItem('hv_metodo') || '{}');
  pagina('Cuestionario de precios', `
    <div class="nota">💜 Hilda: contesta con tus palabras, como se lo explicarías a alguien. Con esto el cotizador va a calcular <b>igual que tú</b>. No tienes que contestar todo de una vez: se guarda solo.</div>
    <form id="fmet">${PREGUNTAS_METODO.map(([k, q, ej], i) => `<div class="card"><label class="f" style="margin-top:0">${i+1}. ${q}</label>
      <textarea class="i" name="${k}" rows="3" placeholder="${esc(ej)}">${esc(r[k] || '')}</textarea></div>`).join('')}
      <button class="btn verde full" type="submit">💬 Mandar respuestas a Nacho</button>
      <button class="btn sec full" type="button" id="metCop" style="margin-top:8px">📋 Copiar respuestas</button></form>
    ${localStorage.getItem('hv_metodo_enviado') ? `<p class="muted mini" style="text-align:center">Enviado el ${fCorta(localStorage.getItem('hv_metodo_enviado'))}</p>` : ''}
  `, { atras:true, nav:'mas' });
  const form = $('#fmet');
  const texto = () => { const f = formData(form);
    return `📝 Método de precios de Hilda VelPer\n\n` + PREGUNTAS_METODO.map(([k, q], i) => `${i+1}. ${q}\n→ ${(f[k] || '').trim() || '(sin contestar)'}`).join('\n\n'); };
  form.addEventListener('input', () => { localStorage.setItem('hv_metodo', JSON.stringify(formData(form))); });
  form.onsubmit = e => { e.preventDefault(); localStorage.setItem('hv_metodo_enviado', hoy()); window.open('https://wa.me/?text=' + encodeURIComponent(texto()), '_blank'); };
  $('#metCop').onclick = async () => { try { await navigator.clipboard.writeText(texto()); localStorage.setItem('hv_metodo_enviado', hoy()); toast('📋 Copiado: pégalo en WhatsApp para Nacho'); } catch(e){ prompt('Copia:', texto()); } };
});
