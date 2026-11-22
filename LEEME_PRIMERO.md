# Hilda VelPer · Pasteles y Postres — App v1.1.0

**Supabase:** proyecto `hilda-velper` · `https://hdwrcsozpimmxtjzzqug.supabase.co` (ya está puesto en `config.js`)
**GitHub Pages:** `https://nxchoramvel14.github.io/HildaVelPer/` (si el repo se llama `HildaVelPer`)

## Carpetas
| Carpeta | Qué es | Qué haces |
|---|---|---|
| `01_GITHUB_subir_todo/` | La app | Arrastra **todo su contenido** (no la carpeta) al repo de GitHub |
| `02_SUPABASE_correr_en_orden/` | Base de datos | Corre los `.sql` **en orden** en el SQL Editor |
| `03_DOCUMENTOS/` | Historial de versiones e imagen para instalar | Para ti y la familia |

---

## Instalación (solo la primera vez)

**1 · Base de datos**: en Supabase → **SQL Editor** → New query → pega todo `01_crear_base.sql` → **Run**. Debe decir *Success*.

**2 · Correo**: en **Authentication → Sign In / Providers → Email**, apaga **Confirm email**. Así nadie tiene que confirmar su correo.

**3 · GitHub**:
1. Crea el repositorio `HildaVelPer` (Public).
2. Ve a **Add file → Upload files** y arrastra el contenido de `01_GITHUB_subir_todo/`.
3. Haz **Commit**.
4. En **Settings → Pages** elige Branch `main` / root y guarda.

**4 · Cuentas**:
1. Abre la app y toca **Crear cuenta** (tú y tu mamá).
2. Pon sus correos en `02_hacer_admins.sql` y córrelo.
3. Papá y tu hermana crean su cuenta; los activas en **Más → Ajustes → Usuarios** como *Ayudante*.

**5 · Celulares**: manda `03_DOCUMENTOS/instalar-app-android.png` por WhatsApp.

## Actualizaciones (versiones nuevas)
1. Revisa `03_DOCUMENTOS/CAMBIOS.md`. Cada versión dice **qué archivos cambiaron** y si hay SQL nuevo.
2. Sube solo esos archivos a GitHub, encima de los anteriores.
3. En los celulares, cierra la app y vuelve a abrirla. La versión aparece al final de **Más**.
