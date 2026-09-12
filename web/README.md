# web — operator panel + APIs

Next.js 16 app. From repo root: `npm run dev` → http://localhost:3000

- Whisper-card UI: `src/app/page.tsx` (Luis)
- Memory API: `src/app/api/memory/*` (proxies Jake's sidecar)
- GPT Live SDP + delegate: `src/app/api/session`, `src/app/api/delegate` (Lisa)
- Glasses ingest: `src/app/api/glasses/ingest` (Saint)
- Enrichment: `src/app/api/enrich` (Lisa)

Put secrets in **`.env.local` in this folder**, copied from `../.env.example`.
