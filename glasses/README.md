# glasses — MentraOS miniapp (Saint)

Wearable path: MentraOS session → transcript/HUD → `POST /api/glasses/ingest`.

MentraOS 3.0 miniapps run **on-device** (`@mentra/miniapp`), not as a cloud TPA.
Docs: https://docs.mentraglass.com/app-devs/getting-started/quickstart.md

## Scaffold (once, on a laptop with Bun)

```bash
cd glasses
bunx create-mentra-miniapp mmg-copilot
# target: display glasses (G1/G2/Z100) or Mentra Live if you have camera
```

Then:

1. Set `packageName` to `glass.mmg.copilot` in `miniapp.json`.
2. Add permission `MICROPHONE` and hardware `DISPLAY` + `MICROPHONE`.
3. Replace background with `src/background.example.ts`.
4. Point `NEXT_PUBLIC_MMG_API_URL` at the laptop running `npm run dev`
   (same Wi-Fi as the phone). Next listens on **3000**; put the miniapp on **3001**.

```bash
bun dev -- --port 3001
```

Phone: Mentra App → Settings → Miniapp Developer Settings → Scan QR.

## If glasses flake (hour 2)

Fall back immediately. The browser panel + laptop mic is the demo critical path.
See degraded modes in `docs/ARCHITECTURE.md`.
