/* =====================================================================
   Hilda VelPer · núcleo: utilidades, base de datos, sesión y rutas
   ===================================================================== */
const APP_VERSION = '1.1.1';
const LOCAL = !(window.CONFIG && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY);
const TABLAS = ['perfiles','productos','insumos','recetas','receta_insumos','pedidos','pedido_recetas','pagos','tareas','movimientos','mejoras'];
const CATEGORIAS = ['Pasteles','Cupcakes','Gelatinas','Galletas','Postres','Otros'];
const ESTADOS = {cotizacion:'Cotización',confirmado:'Confirmado',en_proceso:'En proceso',listo:'Listo',entregado:'Entregado',cancelado:'Cancelado'};
const TIPO_TAREA = {comprar:['🛒','Comprar material'],hornear:['🔥','Preparar / hornear'],decorar:['🎨','Decorar'],entregar:['🚗','Entregar'],otro:['📝','Pendiente']};

const S = { user:null, perfil:null, d:{}, ajustes:{}, negocio:{}, sb:null };

/* ---------- utilidades ---------- */
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const money = n => '$' + Math.round(num(n)).toLocaleString('es-MX');
const money2 = n => '$' + num(n).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
const pad = n => String(n).padStart(2,'0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const hoy = () => ymd(new Date());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const parseYmd = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const DIAS = ['dom','lun','mar','mié','jue','vie','sáb'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const fCorta = d => { d = typeof d === 'string' && d.length === 10 ? parseYmd(d) : new Date(d); return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}`; };
const fLarga = d => { d = new Date(d); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}, ${hm(d)} h`; };
const toLocalInput = iso => { const d = new Date(iso); return `${ymd(d)}T${hm(d)}`; };
const isAdmin = () => S.perfil && S.perfil.rol === 'admin';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
const byId = (t, id) => (S.d[t] || []).find(r => r.id === id);
const nombrePerfil = id => (byId('perfiles', id) || {}).nombre || '';

function toast(msg, ms=2400){
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}
function modal(html, onMount){
  closeModal();
  const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.id = 'modal';
  bg.innerHTML = `<div class="modal">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeModal(); });
  document.body.appendChild(bg);
  if (onMount) onMount(bg.firstElementChild);
  return bg.firstElementChild;
}
function closeModal(){ const m = $('#modal'); if (m) m.remove(); }
function confirmar(msg){ return Promise.resolve(window.confirm(msg)); }
function formData(form){
  const o = {};
  for (const el of form.elements){
    if (!el.name) continue;
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.type === 'radio'){ if (el.checked) o[el.name] = el.value; }
    else if (el.type === 'file') continue;
    else if (el.type === 'number') o[el.name] = el.value === '' ? null : num(el.value);
    else o[el.name] = el.value;
  }
  return o;
}
function telWa(t){ let d = String(t||'').replace(/\D/g,''); if (d.length === 10) d = '52' + d; return d; }
function waLink(tel, texto){ const t = telWa(tel); return `https://wa.me/${t}?text=${encodeURIComponent(texto)}`; }
function gcalLink({titulo, inicio, fin, detalles='', lugar='', todoElDia=false}){
  let dates;
  if (todoElDia){ const a = parseYmd(inicio); dates = `${ymd(a).replace(/-/g,'')}/${ymd(addDays(a,1)).replace(/-/g,'')}`; }
  else { const f = d => new Date(d).toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z'; dates = `${f(inicio)}/${f(fin)}`; }
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + `&text=${encodeURIComponent(titulo)}&dates=${dates}&details=${encodeURIComponent(detalles)}&location=${encodeURIComponent(lugar)}&ctz=America/Mexico_City`;
}

/* Comprime una foto del celular antes de subirla */
function comprimir(file, max=1600, calidad=0.85){
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth*k); c.height = Math.round(img.naturalHeight*k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? res(b) : rej(new Error('No se pudo procesar la foto')), 'image/jpeg', calidad);
    };
    img.onerror = () => rej(new Error('No se pudo leer la foto'));
    img.src = url;
  });
}
const blobToDataURL = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });

/* =====================================================================
   BASE DE DATOS: Supabase o modo demo (localStorage)
   ===================================================================== */
const DB = {
  async all(t){
    if (LOCAL) return JSON.parse(localStorage.getItem('hv_'+t) || '[]');
    const { data, error } = await S.sb.from(t).select('*');
    if (error) throw error; return data || [];
  },
  async one(t){
    if (LOCAL) return JSON.parse(localStorage.getItem('hv_'+t) || '{}');
    const { data, error } = await S.sb.from(t).select('*').eq('id',1).maybeSingle();
    if (error) throw error; return data || {};
  },
  async saveOne(t, patch){
    if (LOCAL){ const o = {...await DB.one(t), ...patch}; localStorage.setItem('hv_'+t, JSON.stringify(o)); return o; }
    const { data, error } = await S.sb.from(t).update(patch).eq('id',1).select().single();
    if (error) throw error; return data;
  },
  async ins(t, row){
    if (LOCAL){
      const rows = await DB.all(t); const r = { id: uid(), creado: new Date().toISOString(), ...row };
      if (t === 'pedidos'){ const n = num(localStorage.getItem('hv_folio')) + 1; localStorage.setItem('hv_folio', n); r.folio = n; }
      rows.push(r); localStorage.setItem('hv_'+t, JSON.stringify(rows)); return r;
    }
    const { data, error } = await S.sb.from(t).insert(row).select().single();
    if (error) throw error; return data;
  },
  async upd(t, id, patch){
    if (LOCAL){ const rows = await DB.all(t); const i = rows.findIndex(r => r.id === id); if (i >= 0){ rows[i] = {...rows[i], ...patch}; localStorage.setItem('hv_'+t, JSON.stringify(rows)); return rows[i]; } return null; }
    const { data, error } = await S.sb.from(t).update(patch).eq('id', id).select().single();
    if (error) throw error; return data;
  },
  async del(t, id){
    if (LOCAL){ const rows = (await DB.all(t)).filter(r => r.id !== id); localStorage.setItem('hv_'+t, JSON.stringify(rows)); return; }
    const { error } = await S.sb.from(t).delete().eq('id', id); if (error) throw error;
  },
  async delWhere(t, campo, valor, extra){
    if (LOCAL){ const rows = (await DB.all(t)).filter(r => !(r[campo] === valor && (!extra || extra(r)))); localStorage.setItem('hv_'+t, JSON.stringify(rows)); return; }
    let q = S.sb.from(t).delete().eq(campo, valor);
    if (t === 'tareas' && extra) q = q.eq('auto', true).eq('hecho', false);
    const { error } = await q; if (error) throw error;
  },
  async subir(blob, carpeta='productos'){
    if (LOCAL){
      const c = await comprimir(blob, 1080, 0.78);
      return await blobToDataURL(c);
    }
    const path = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
    const { error } = await S.sb.storage.from('fotos').upload(path, blob, { contentType:'image/jpeg', upsert:false });
    if (error) throw error;
    return S.sb.storage.from('fotos').getPublicUrl(path).data.publicUrl;
  }
};

async function recargar(...tablas){
  const ts = tablas.length ? tablas : TABLAS;
  await Promise.all(ts.map(async t => {
    if (t === 'movimientos' && !isAdmin()){ S.d[t] = []; return; }
    try { S.d[t] = await DB.all(t); } catch(e){ console.warn(t, e); S.d[t] = []; }
  }));
}
async function cargarTodo(){
  [S.ajustes, S.negocio] = await Promise.all([DB.one('ajustes'), DB.one('negocio')]);
  await recargar();
}
async function guardar(fn, okMsg){
  try { const r = await fn(); if (okMsg) toast(okMsg); return r; }
  catch(e){ console.error(e); toast('⚠️ ' + (e.message || 'Error al guardar'), 4000); throw e; }
}

/* =====================================================================
   MODO DEMO: datos de ejemplo
   ===================================================================== */
const AJUSTES_DEF = { tarifa_hora:60, gastos_fijos_mes:800, pedidos_mes:8, margen_pct:30, empaque_default:40, precio_persona:0, redondeo:10,
  dias_compra:3, dias_horneado:2, dias_decorado:1, umbral_grande:40, dias_extra_grande:1 };
const NEGOCIO_DEF = { nombre:'Hilda VelPer', lema:'Pasteles y Postres', whatsapp:'', facebook:'', instagram:'',
  mensaje_catalogo:'Pasteles caseros, cupcakes, gelatinas, galletas caseras… ¡y más!' };

function sembrarDemo(){
  if (localStorage.getItem('hv_sembrado')) return;
  const L = (t, v) => localStorage.setItem('hv_'+t, JSON.stringify(v));
  L('ajustes', AJUSTES_DEF); L('negocio', NEGOCIO_DEF);
  const P = [
    {nombre:'Hilda',rol:'admin'},{nombre:'Nacho',rol:'admin'},{nombre:'Papá',rol:'ayudante'},{nombre:'Hermana',rol:'ayudante'}
  ].map(p => ({ id: uid(), email:'', activo:true, ...p }));
  L('perfiles', P);
  const prods = [
    ['Pastel Unicornio','Pasteles','Forrado en fondant con orejitas, cuerno dorado y flores de betún.',20,'unicornio',true],
    ['Pastel Asador','Pasteles','Parrilla con carne, salchichas y brochetas modeladas en fondant.',20,'asador',true],
    ['Pastel Norteño personalizado','Pasteles','Acordeón, sombrero y guitarra en fondant, con nombre.',25,'nortenio',false],
    ['Pastel temático Inuyasha','Pasteles','Dos pisos con temática de Inuyasha: traje rojo, rosario y detalles en fondant.',30,'inuyasha',false],
    ['Pastel Acuarela + Cupcakes','Pasteles','Betún efecto acuarela con torre de cupcakes para evento.',40,'acuarela-cupcakes',true],
    ['Pastel Panda','Pasteles','Betún de estrellita blanco con carita de panda.',20,'panda',false],
    ['Pastel Calabaza','Pasteles','Temporada de Halloween, betún naranja de estrellita.',15,'calabaza',false],
    ['Pastel de Flores','Pasteles','Dos pisos con rosas de betún.',35,'flores-azul',false],
    ['Cupcakes Baby Shower','Cupcakes','Betún rosa con bebé y figuritas de fondant.',12,'cupcake-baby',false],
    ['Cupcakes Feliz Cumple','Cupcakes','Chocolate con letras de fondant y chispas.',6,'cupcakes-cumple',false],
    ['Gelatina de Frutos Rojos','Gelatinas','Con fruta natural y flor de fresa y piña.',20,'gelatina-frutos',false],
    ['Gelatina Floral','Gelatinas','Mosaico de rosas de leche y colores.',20,'gelatina-floral',false]
  ].map((p,i) => ({ id:uid(), nombre:p[0], categoria:p[1], descripcion:p[2], personas:p[3], foto_url:`img/ejemplos/${p[4]}.jpg`,
     destacado:p[5], precio:null, precio_desde:true, publico:true, orden:i+1, creado:new Date().toISOString() }));
  L('productos', prods);
  // Insumos de ejemplo (precios inventados para que se vea el cotizador: Hilda los cambia por los reales)
  const ins = [
    ['Harina de trigo','g',1000,28],['Azúcar','g',1000,30],['Huevo','pz',30,95],['Mantequilla','g',90,22],['Leche','ml',1000,28],
    ['Polvo para hornear','g',110,24],['Vainilla','ml',250,45],['Crema para batir','ml',1000,85],['Mermelada de fresa','g',1000,70],
    ['Fondant','g',1000,140],['Colorante en gel','pz',1,35],['Base de cartón','pz',1,15],['Caja para pastel','pz',1,30]
  ].map(r => ({ id:uid(), nombre:r[0], unidad:r[1], presentacion_cantidad:r[2], presentacion_precio:r[3], proveedor:'', ejemplo:true }));
  L('insumos', ins);
  const iid = n => ins.find(x => x.nombre === n).id;
  const recs = [
    { r:{nombre:'Pan de vainilla',tipo:'base',rinde_personas:20,horas:1.5,notas:'Ejemplo: cambia cantidades por la receta de Hilda'},
      i:[['Harina de trigo',500],['Azúcar',400],['Huevo',8],['Mantequilla',180],['Leche',250],['Polvo para hornear',15],['Vainilla',10]] },
    { r:{nombre:'Relleno de mermelada de fresa',tipo:'relleno',rinde_personas:20,horas:0.3,notas:''}, i:[['Mermelada de fresa',400]] },
    { r:{nombre:'Betún de crema chantilly',tipo:'betun',rinde_personas:20,horas:1,notas:''}, i:[['Crema para batir',900],['Azúcar',120],['Vainilla',5]] },
    { r:{nombre:'Forrado y figuras de fondant',tipo:'decoracion',rinde_personas:20,horas:3,notas:''}, i:[['Fondant',800],['Colorante en gel',2]] }
  ];
  const R = [], RI = [];
  recs.forEach(x => { const id = uid(); R.push({ id, ...x.r }); x.i.forEach(([n,c]) => RI.push({ id:uid(), receta_id:id, insumo_id:iid(n), cantidad:c })); });
  L('recetas', R); L('receta_insumos', RI);
  // Un par de pedidos de ejemplo
  const e1 = addDays(new Date(), 4); e1.setHours(17,0,0,0);
  const e2 = addDays(new Date(), 9); e2.setHours(13,0,0,0);
  const peds = [
    { id:uid(), folio:1, cliente:'Ejemplo: Mariana López', telefono:'4770000000', producto_id:prods[0].id, descripcion:'Pastel Unicornio rosa con nombre "Sofi"', personas:25,
      sabor:'Vainilla', relleno:'Fresa', decoracion:'Fondant unicornio', fecha_entrega:e1.toISOString(), tipo_entrega:'recoge', direccion:'', envio:0, precio:950,
      estado:'confirmado', notas:'Pedido de ejemplo, se puede borrar', creado:new Date().toISOString() },
    { id:uid(), folio:2, cliente:'Ejemplo: Don Adolfo', telefono:'4770000001', producto_id:prods[2].id, descripcion:'Pastel norteño con acordeón', personas:50,
      sabor:'Chocolate', relleno:'Cajeta', decoracion:'Fondant', fecha_entrega:e2.toISOString(), tipo_entrega:'domicilio', direccion:'San Francisco del Rincón', envio:0, precio:1600,
      estado:'confirmado', notas:'Pastel grande: se hornea un día antes de lo normal', creado:new Date().toISOString() }
  ];
  L('pedidos', peds); localStorage.setItem('hv_folio', 2);
  L('pedido_recetas', peds.flatMap(p => R.map(r => ({ id:uid(), pedido_id:p.id, receta_id:r.id, factor:+(p.personas / r.rinde_personas).toFixed(2) }))));
  L('pagos', [{ id:uid(), pedido_id:peds[0].id, monto:400, tipo:'anticipo', metodo:'efectivo', fecha:hoy(), creado:new Date().toISOString() }]);
  L('movimientos', [{ id:uid(), tipo:'gasto', categoria:'Materia prima', concepto:'Ejemplo: compra en la central', monto:620, fecha:hoy(), creado:new Date().toISOString() }]);
  L('mejoras', []);
  // tareas automáticas de ejemplo
  S.ajustes = AJUSTES_DEF;
  const T = []; peds.forEach(p => planTareas(p).forEach(t => T.push({ id:uid(), pedido_id:p.id, hecho:false, auto:true, asignado_a:null, ...t })));
  L('tareas', T);
  localStorage.setItem('hv_yo', P[0].id);
  localStorage.setItem('hv_sembrado', '1');
}

/* Calcula las fechas de compra, horneado, decorado y entrega de un pedido */
function planTareas(p){
  const A = {...AJUSTES_DEF, ...S.ajustes};
  const e = new Date(p.fecha_entrega);
  const extra = num(p.personas) >= num(A.umbral_grande) ? num(A.dias_extra_grande) : 0;
  const quien = p.cliente || 'pedido';
  return [
    { tipo:'comprar', titulo:`Comprar material · ${quien}`, fecha: ymd(addDays(e, -(num(A.dias_compra) + extra))) },
    { tipo:'hornear', titulo:`Preparar / hornear · ${quien}`, fecha: ymd(addDays(e, -(num(A.dias_horneado) + extra))) },
    { tipo:'decorar', titulo:`Decorar · ${quien}`, fecha: ymd(addDays(e, -num(A.dias_decorado))) },
    { tipo:'entregar', titulo:`Entregar · ${quien}`, fecha: ymd(e), hora: hm(e) }
  ];
}
async function regenerarTareas(p){
  const viejas = S.d.tareas.filter(t => t.pedido_id === p.id && t.auto);
  const asignado = {}; viejas.forEach(t => { if (t.asignado_a) asignado[t.tipo] = t.asignado_a; });
  const hechas = new Set(viejas.filter(t => t.hecho).map(t => t.tipo));
  await DB.delWhere('tareas', 'pedido_id', p.id, t => t.auto && !t.hecho);
  if (!['cotizacion','cancelado','entregado'].includes(p.estado)){
    for (const t of planTareas(p)){
      if (hechas.has(t.tipo)) continue;
      await DB.ins('tareas', { ...t, pedido_id:p.id, auto:true, hecho:false, asignado_a: asignado[t.tipo] || null });
    }
  }
  await recargar('tareas');
}

/* =====================================================================
   SESIÓN
   ===================================================================== */
async function iniciar(){
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
  const publico = new URLSearchParams(location.search).has('catalogo');
  if (LOCAL){
    sembrarDemo();
    if (publico){ S.negocio = await DB.one('negocio'); S.d.productos = await DB.all('productos'); return vistaPublica(); }
    await cargarTodo();
    S.perfil = byId('perfiles', localStorage.getItem('hv_yo')) || S.d.perfiles[0];
    return arrancarRutas();
  }
  await cargarScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
  S.sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
  if (publico){
    S.negocio = await DB.one('negocio').catch(() => NEGOCIO_DEF);
    S.d.productos = (await DB.all('productos').catch(() => [])).filter(p => p.publico);
    return vistaPublica();
  }
  const { data:{ session } } = await S.sb.auth.getSession();
  if (!session) return vistaLogin();
  await entrar(session.user);
}
async function entrar(user){
  S.user = user;
  const { data:perfil } = await S.sb.from('perfiles').select('*').eq('id', user.id).maybeSingle();
  S.perfil = perfil;
  if (!perfil || !perfil.activo) return vistaEspera();
  await cargarTodo();
  arrancarRutas();
}
function cargarScript(src){
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Sin internet: no se pudo cargar ' + src)); document.head.appendChild(s); });
}
function vistaLogin(modo='entrar'){
  $('#app').innerHTML = `
  <div class="login">
    <img class="logo" src="img/logo.jpg" alt="Hilda VelPer">
    <div class="card">
      <div class="chips"><button class="chip ${modo==='entrar'?'on':''}" data-m="entrar">Entrar</button><button class="chip ${modo==='registro'?'on':''}" data-m="registro">Crear cuenta</button></div>
      <form id="fl">
        ${modo==='registro' ? `<label class="f">Tu nombre</label><input class="i" name="nombre" required placeholder="Ej. Hilda">` : ''}
        <label class="f">Correo</label><input class="i" name="email" type="email" required autocomplete="email">
        <label class="f">Contraseña</label><input class="i" name="pass" type="password" required minlength="6" autocomplete="${modo==='registro'?'new-password':'current-password'}">
        <button class="btn full" style="margin-top:14px">${modo==='registro' ? 'Crear cuenta' : 'Entrar'}</button>
      </form>
      ${modo==='registro' ? '<p class="muted">Al crear tu cuenta, Hilda o Nacho tienen que aprobarla para que puedas entrar.</p>' : ''}
    </div>
  </div>`;
  $$('[data-m]').forEach(b => b.onclick = () => vistaLogin(b.dataset.m));
  $('#fl').onsubmit = async e => {
    e.preventDefault(); const f = formData(e.target); const btn = e.target.querySelector('button'); btn.disabled = true;
    try {
      if (modo === 'registro'){
        const { data, error } = await S.sb.auth.signUp({ email:f.email, password:f.pass, options:{ data:{ nombre:f.nombre } } });
        if (error) throw error;
        if (!data.session){ toast('Revisa tu correo para confirmar la cuenta', 5000); btn.disabled = false; return; }
        await entrar(data.user);
      } else {
        const { data, error } = await S.sb.auth.signInWithPassword({ email:f.email, password:f.pass });
        if (error) throw error; await entrar(data.user);
      }
    } catch(err){ toast('⚠️ ' + (err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : err.message), 4000); btn.disabled = false; }
  };
}
function vistaEspera(){
  $('#app').innerHTML = `<div class="login"><img class="logo" src="img/logo.jpg" alt="">
    <div class="card" style="text-align:center"><h2>¡Ya casi!</h2><p>Tu cuenta está creada. Pídele a Hilda o a Nacho que la aprueben en <b>Más → Ajustes → Usuarios</b>.</p>
    <button class="btn" onclick="location.reload()">Ya me aprobaron</button> <button class="btn sec" id="salir">Salir</button></div></div>`;
  $('#salir').onclick = salir;
}
async function salir(){ if (!LOCAL) await S.sb.auth.signOut(); location.hash = ''; location.reload(); }

/* =====================================================================
   RUTAS Y ESQUELETO
   ===================================================================== */
const RUTAS = {};
function ruta(nombre, fn){ RUTAS[nombre] = fn; }
function ir(h){ location.hash = h; }
function arrancarRutas(){
  window.onhashchange = render;
  if (!location.hash) location.hash = '#/hoy';
  render();
}
function render(){
  closeModal();
  const partes = location.hash.replace(/^#\//,'').split('/');
  const nombre = partes[0] || 'hoy';
  const fn = RUTAS[nombre] || RUTAS.hoy;
  window.scrollTo(0,0);
  try { fn(...partes.slice(1).map(decodeURIComponent)); }
  catch(e){ console.error(e); pagina('Ups', `<div class="card">Algo falló: ${esc(e.message)}</div>`); }
}
const NAV = [['hoy','🏠','Hoy'],['pedidos','📋','Pedidos'],['catalogo','🎂','Catálogo'],['cotizar','🧮','Cotizar'],['mas','☰','Más']];
function pagina(titulo, html, { atras=false, nav } = {}){
  const actual = nav || (location.hash.replace(/^#\//,'').split('/')[0] || 'hoy');
  const navItems = NAV.filter(n => n[0] !== 'cotizar' || isAdmin());
  $('#app').innerHTML = `
    ${LOCAL ? '<div class="demo-band">MODO DEMO · los datos solo se guardan en este celular</div>' : ''}
    <header class="top">
      ${atras ? '<button class="back" onclick="history.back()" aria-label="Atrás">‹</button>' : '<img src="img/logo.jpg" alt="">'}
      <div class="t"><b>${esc(titulo)}</b><small>Hilda VelPer · Pasteles y Postres</small></div>
    </header>
    <main>${html}</main>
    <nav class="bottom"><div class="in">${navItems.map(n => `<a href="#/${n[0]}" class="${actual===n[0]?'on':''}"><span class="ic">${n[1]}</span>${n[2]}</a>`).join('')}</div></nav>`;
}
function vacio(emoji, texto, boton=''){ return `<div class="vacio"><div class="e">${emoji}</div><p>${texto}</p>${boton}</div>`; }

window.addEventListener('DOMContentLoaded', () => iniciar().catch(e => {
  console.error(e); $('#app').innerHTML = `<div class="login"><div class="card"><h2>No se pudo abrir la app</h2><p>${esc(e.message)}</p><button class="btn" onclick="location.reload()">Reintentar</button></div></div>`;
}));
