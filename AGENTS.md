# fazole.fit

Local-first payment terminal PWA for Czech merchants: bank (SPD QR), Lightning and Cashu. `docs/SPEC.md` is the product and protocol spec; read it before changing behaviour. `../linky` is the reference for stack, patterns and UI style.

Bun workspace: `bun` only. Before you declare a task done, run `bun run check-code` and fix what it reports; also run `bun run test` when you changed logic.

## Layout

- `apps/web-app`: the PWA (dev on port 5280, `bun run dev` also starts `docker-compose.dev.yml`).
- `apps/ui-book`: web catalog of every `@platitprosim/ui` component, light and dark (`bun run ui:dev`, port 5290).
- `apps/website`: the presentation site, built from `@platitprosim/ui` mocks.
- `packages/ui`: Tamagui design system, shipped as source; consumers add `platitprosimUi()` from `@platitprosim/ui/vite` before the React plugin and import `@platitprosim/ui/fonts.css` once.
- `packages/core`: pure TS domain logic (no React, no Evolu, no browser globals).
- `apps/web-app/src/services`: the one linkstr and one linkshu runtime per install (`createAppServices`, `useAppServices`). New Nostr or wallet behaviour registers a handler there (`nostr.onAppMessage`, `onInboxEvent`, `onOutboxResult`) before `start()`. Handlers must be idempotent, because the inbox replays unacknowledged events.
- `packages/config`: shared tsconfig, ESLint (including the `ui-only` rule) and Prettier.

## Rules

- All app data lives in Evolu. Browser storage (`localStorage`, `sessionStorage`, `indexedDB`) stays unused; ESLint enforces it.
- App code composes `@platitprosim/ui` components, icons and tokens. A missing element is added to `packages/ui` with an entry in `apps/ui-book` (a test checks every export has one); `platitprosim-ui/ui-only` rejects DOM elements, `className` and `style` in app `.tsx`.
- Every user-facing string goes through `apps/web-app/src/i18n` (Czech is the source dictionary, English mirrors its keys). Components take translated labels and formatted values; formatting CZK and sats is the caller's job.
- Style values are tokens (`$md`, `$accent`, `$control`); add a token to `packages/ui/src/tokens.ts` rather than writing a raw number.
- TypeScript is strict with no `any` and no type assertions; narrow `unknown` with guards and validate wire and stored JSON with Effect `Schema`.
- Comments explain unidiomatic code in one line; code that needs a comment to justify its complexity gets simplified instead.

## linky packages

`@linky-fit/linkshu` and `@linky-fit/linkstr` come from npm (`docs/linky-api.md`). Employee login opens Linky at `VITE_LINKY_URL` (default `https://nightly.app.linky.fit`, `http://localhost:5174` in dev).

## Paying locally

The dev mint's FakeWallet settles nothing by itself (`FAKEWALLET_BRR: "false"`), so a Lightning payment completes only once someone pays it:

- `bun run mint:pay <bolt11>` marks an invoice of the local mint paid, like an external Lightning payment.
- `bun run mint:token <sats>` prints a fresh Cashu token from the local mint. Paste it into a wallet to fund it, or send it to the terminal device.
- A wallet on the same mint (the local linky at `:5174`) pays an invoice for real: the mint settles the melt internally. Linky pays a terminal's `bitcoin:` URI through its `creq` leg (a Cashu token over Nostr), and pays a bare `lnbc…` invoice over Lightning.

## Deploy

`scripts/deploy.sh web-app` (https://app.fazole.fit) and `scripts/deploy.sh website` (https://fazole.fit). The script builds locally and deploys a prebuilt static output to Vercel.
