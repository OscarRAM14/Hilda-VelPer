# Historial de versiones · Hilda VelPer

Formato: **MAYOR.MENOR.ARREGLO**
- MAYOR: cambio grande. Hay que subir todo y puede traer SQL nuevo.
- MENOR: funciones nuevas.
- ARREGLO: correcciones chicas.

---

## v1.1.0 · 22 nov 2026 · Conexión a Supabase y orden de carpetas
- Conectada al proyecto `hilda-velper` de Supabase (`config.js`).
- Paquete ordenado en carpetas: `01_GITHUB`, `02_SUPABASE` y `03_DOCUMENTOS`.
- Los estilos se movieron a `css/estilos.css`.
- Los archivos llevan `?v=1.1.0`, para que los celulares no se queden con la versión vieja.
- SQL dividido en `01_crear_base.sql` y `02_hacer_admins.sql`.
- SQL: se agregaron permisos para proyectos nuevos de Supabase y se corrigieron las reglas de fotos.

**Archivos que cambiaron:** TODOS (primera subida a GitHub).
**SQL:** correr `01_crear_base.sql` y luego `02_hacer_admins.sql`.

## v1.0.1 · 21 nov 2026
- El pastel "Típico Mexicano" ahora se llama "Pastel temático Inuyasha" (foto `inuyasha.jpg`).

## v1.0.0 · 21 nov 2026 · Primera versión
- Hoy, pedidos con calendario, tareas automáticas, pagos y anticipos, WhatsApp y Google Calendar.
- Catálogo con editor de imágenes para redes, y catálogo público con QR.
- Cotizador provisional, materia prima, recetas, lista de compras y cuentas.
- Usuarios admin y ayudante, ideas y mejoras, ayuda.

---
### Pendiente para próximas versiones
- [ ] Ajustar el cotizador al método de precios de Hilda.
- [ ] Confirmar los días reales de compra y horneado.
- [ ] Cargar las fotos originales de los pasteles (más resolución).
