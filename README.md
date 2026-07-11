# Black Horse Shoe — Commerce OS

Production-grade commerce operating system for **Black Horse Shoe**, a premium Nepali footwear brand.

One source of truth for products, stock, pricing, orders, customers and analytics.

## Structure

```
apps/
  api/        NestJS + Prisma + PostgreSQL — centralized API (this is the source of truth)
  web/        Next.js storefront — home, product pages, cart, checkout (npm run web)
  desktop/    Electron ERP — dashboard + POS (npm run desktop)
  bot/        Telegraf admin bot — /today /orders /lowstock /bestsellers (npm run bot)
design/       High-fidelity HTML mockups + logo.svg (open in a browser)
```

Both frontends fall back to fixture data when the API is down, so they
always render; once the API + database are live they serve real data
with zero changes.

Figma file: https://www.figma.com/design/zARc01F4NiGuPgwt3vZvpB

## Design system

| Token     | Value                    |
|-----------|--------------------------|
| Primary   | `#111111`                |
| Secondary | `#FFFFFF`                |
| Neutral   | `#F5F5F5`                |
| Accent    | `#2B2B2B`                |
| Type      | Inter / Manrope          |

## Getting started

```bash
cp .env.example .env          # fill in DATABASE_URL + JWT_SECRET (also copy to apps/api/.env)
npm install
npm run db:migrate            # creates the schema in PostgreSQL
npm run db:seed               # owner admin + starter catalog with opening stock
npm run api                   # http://localhost:4000/api
npm run web                   # storefront on http://localhost:3000
npm run desktop               # Electron ERP
node scripts/smoke-test.mjs   # end-to-end verification of the whole business flow
```

On this machine the whole stack runs as Windows services (auto-start on
boot, auto-restart on crash): `postgresql-x64-17`, `Cloudflared` (tunnel
for bhandariventures.com), `blackhorse-api`, `blackhorse-web`,
`blackhorse-bot`. Check them with `.\start-all.ps1`. After code changes:
rebuild the workspace, then `nssm restart blackhorse-<api|web|bot>`.
Logs live in `logs\`.

## Core rules encoded in the API

- **Inventory is never overwritten.** Every stock change goes through
  `InventoryService.applyMovement()`, which writes an `InventoryMovement`
  ledger entry (previous qty, new qty, delta, type, reference, user) and
  updates the cached `stockQty` with an optimistic-concurrency check —
  all inside the caller's transaction.
- **Order flow**: `PENDING → CONFIRMED → PACKED → SHIPPED → DELIVERED`,
  with `CANCELLED / RETURNED / REFUNDED` exits. Illegal transitions are
  rejected; cancellations and returns restock automatically.
- **Money is Decimal**, prices are read from the database at order time —
  never trusted from the client.
- **Soft delete** (`deletedAt`) on catalog entities; **UUID** primary keys;
  **UTC** timestamps; every admin mutation is written to `AuditLog`.
