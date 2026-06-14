# Ordenanza Tarifaria 5487/2025 — Tablero + Asistente

Tablero interactivo y asistente RAG de la **Ordenanza Tarifaria Municipal N° 5487/2025**
de la Municipalidad de San Miguel de Tucumán. Dirección IA SMT.

🔗 Producción: https://ordenanza-smt.vercel.app

## Qué hace

- **Mapa de bloques** — 12 bloques tributarios con sensibilidad ciudadana, gráficos interactivos (dona + barras con cross-filter).
- **Buscador** — filtrado instantáneo de los 105 conceptos relevados.
- **Simulador** — calculadoras (inmobiliario por zona, TEM por actividad, publicidad, construcción, conversor U↔$).
- **Asistente IA (RAG)** — chat que responde citando artículo y página, con nivel de **fundamentación** y **verificación contra la página escaneada** de la norma.
- **Normativa** — carga de nuevas normas (PDF/DOCX/TXT) con el mismo motor de RAG.

Cada dato (chat, fichas, buscador, simulador) enlaza a la **página original escaneada** de la ordenanza para verificación.

## Stack

- **Next.js 16** (App Router) en Vercel
- **Supabase** (Postgres + pgvector): `normativa_documentos`, `normativa_chunks`, `base_madre_5487`, RPC `match_normativa_chunks`
- **OpenRouter**: embeddings `text-embedding-3-small` (1536) + chat `gpt-4.1-mini`
- Tipografías: Bricolage Grotesque · Public Sans · Spline Sans Mono

## Variables de entorno

Ver `.env.example`. En Vercel se configuran en *Project Settings → Environment Variables*
(no se versiona `.env.local`).

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run setup:db   # aplica el esquema + carga base madre (requiere SUPABASE_DB_URL)
npm run ingest     # recarga base madre e indexa los chunks RAG (requiere OPENROUTER_API_KEY)
```

## Datos

- `src/data/base_madre.json` — 105 conceptos relevados de la ordenanza (base estructurada y auditable).
- `public/paginas/` — 48 páginas escaneadas de la ordenanza (verificación de fuente).
- `supabase/schema.sql` — esquema de la base (compatible con el ecosistema de normativa de la Dirección IA).

---

_El texto oficial de la ordenanza prevalece sobre este tablero. Herramienta de gestión, no fuente legal._
