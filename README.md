# Wardrobe

Your closet as a catalog. Upload photos of your clothes, the background is removed automatically, and everything is browsable and filterable like a shopping site.

## What works today

- Accounts (email + password, sessions stored server-side)
- Batch photo upload from desktop or phone (photos are downscaled on the device first)
- Automatic background removal on the server, with the garment cropped and centred
- Colour detection from the cutout (snapped to a named palette)
- Catalog with category, colour, weather, style and status filters, search, sorting, favourites
- Item page with tags: category, type, colours, pattern, dress code, weather, style, laundry status, brand, size, notes, wear count
- Outfit builder: pick pieces by slot, see a flat-lay preview and a live style check, save and log wears
- Outfit ideas: rule-based suggestions (structure, colour harmony, one statement pattern, matching dress code, shared style), filterable by dress code and style, or built around one piece. Rules live in `src/lib/outfits/engine.ts`

## Planned next

Weather-aware suggestions, Google Calendar, chat-driven outfit design, and sharing a closet with friends. The schema already has a `closet_shares` table for sharing.

## Running it

Requires Node 22+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Data (SQLite database and photos) lives in `./data`, or wherever `DATA_DIR` points. Migrations run automatically on start.

### Tests

```bash
npm test           # outfit rule unit tests
npm run test:e2e   # builds, starts on :3123, runs desktop + mobile flows
```

Set `PW_CHROMIUM_PATH` to use an already-installed Chromium instead of `npx playwright install`.

## Stack

- Next.js 16 (App Router, Cache Components) + TypeScript + Tailwind 4
- SQLite via Drizzle ORM (`src/db/schema.ts`; `npm run db:generate` after schema changes)
- Background removal: [`@imgly/background-removal-node`](https://github.com/imgly/background-removal-js), runs locally, no API key. Note its licence is AGPL-3.0. Swap the single function in `src/lib/images/background.ts` to use a hosted API instead.
- Images processed with `sharp`; stored on local disk behind `src/lib/images/storage.ts` (swap for S3/R2 when deploying)

Background removal needs a regular Node server (not serverless), since the model is ~100 MB.
