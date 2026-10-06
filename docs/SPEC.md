# fazole.fit: spec

Formerly "Platit prosím"; protocol identifiers (the `platitprosim` app namespace, the `Platit prosím` device-authorization app name, the Evolu database name) keep the old name so existing installs keep working.

A payment terminal for Czech merchants, like qrterminal.cz but local-first. The merchant types an amount and the app shows a QR code. The customer pays by Czech bank transfer (SPD QR), by Lightning, or by Cashu (BIP-321 QR). Shops can have employees. There is no backend: data lives in Evolu, devices talk over Nostr, and money moves through a Cashu mint.

The sibling project `../linky` (`/Users/jarvis/workspace/linky`) is the reference for the stack, its patterns and the UI style. We consume its npm packages `@linky-fit/linkstr` (Nostr) and `@linky-fit/linkshu` (Cashu wallet).

## Stack

- bun workspaces monorepo, organised like linky:
  - `apps/web-app`: the PWA.
  - `apps/website`: the presentation site, with live mocks built from `@platitprosim/ui`.
  - `apps/ui-book`: component catalog, web only.
  - `packages/ui`: Tamagui design system.
  - `packages/core`: pure TS domain logic.
- React 19, Vite 7, TypeScript strict, Effect 3 (same major as linkstr/linkshu), Tamagui + react-native-web (same versions as linky), vite-plugin-pwa, Vitest.
- No `any`. Follow linky's lint and prettier conventions. The app uses no DOM elements, `className` or `style`; it uses UI components only.
- i18n: Czech (default) and English. Every user-facing string goes through translations.
- Brand: fazole.fit (in Czech, fazole means beans, and it was also the name of the first online money on the Czech internet). Warm bean-cream and black-bean neutrals with a green-bean accent; a cream bean with a red hilum as the logo; Bricolage Grotesque for headings and amounts; pill-shaped controls. Phone-first. It must also work on desktop: centred column, max width about 480px for the terminal.

## Storage rules

- All app data lives in Evolu. Nothing goes in localStorage, sessionStorage or IndexedDB directly. The Evolu owner secret is the one thing Evolu persists itself.
- Evolu creates its own AppOwner. Its 24-word mnemonic (Evolu 7's native 32-byte owner secret) is the single backup of a device identity. Everything is restorable: restoring the mnemonic on a new device brings back the shop, the history, the wallet proofs, the employees and the membership.
- Keys come from the BIP-39 seed of that mnemonic:
  - Nostr key: NIP-06 `m/44'/1237'/0'/0/0`.
  - Cashu wallet: linkshu `bip39Seed`, which is the BIP-39 seed itself.
- linkstr's outbox/inbox-cursor ports and linkshu's KeyValue/Proof/Operation ports are implemented on Evolu tables.
- Defaults are the same as linky: mint `https://cashu.cz`, linky's recommended Nostr relays, and Evolu relays `wss://evolu.linky.fit` and `wss://evolu.eu.freedomrelay.dev`. Env overrides for local dev:
  - `VITE_NOSTR_RELAYS`
  - `VITE_EVOLU_SERVER_URLS`
  - `VITE_MAIN_MINT_URL`
  - `VITE_LINKY_URL` (default `https://nightly.app.linky.fit`)
  - `VITE_ALLOW_INSECURE_LOCALHOST_RELAYS`

## Roles

One install is either an **owner** (it has a `shop` row) or an **employee** (it has a `membership` row). Each install has its own Evolu identity.

### Owner onboarding

1. The owner chooses "Set up a shop", then enters the shop name and a Czech bank account (`[prefix-]number/bankCode`). The account is validated (mod-11 checks) and converted to an IBAN.
2. The app creates the identity and shows the backup phrase. The owner can skip this step, and the phrase stays available in Settings.
3. The owner lands on the terminal.

### Restore

"I have a backup phrase": the user enters the 24 words, the app calls `evolu.restoreAppOwner`, the data syncs, and the app routes by role.

### Adding an employee

1. On the Employees screen the owner scans the employee's Linky profile QR, or pastes their npub. The scanner accepts an `npub`, an `nprofile`, `nostr:` URIs and `https://linky.fit/p/<npub>` links.
2. The app reads the kind-0 profile name. The owner can edit the name.
3. The employee is stored in the owner's Evolu as `{pubkey, name, addedAt, removedAt?}`.

### Employee login

1. The employee chooses "I'm an employee" and taps "Log in with Linky". This is a NIP-46 nostrconnect login using the `${VITE_LINKY_URL}/#nostrconnect://…` deep link, plus a QR for a second device. peaurla.cz `src/client/shared/nostr-connect.ts` is a reference.
2. Linky signs an attestation that binds the employee npub to this install's device pubkey.
3. The device publishes that attestation (see Protocol).
4. The owner's app, which is assumed to be always online, sees it, checks that the npub is an active employee, and sends a gift-wrapped `ShopConfig` to the device pubkey.
5. The employee device stores a membership and opens the terminal.
6. Until then the device shows "Waiting for the shop owner to add you" along with the employee's npub.

## Terminal

- A big amount display in CZK, a numeric keypad (0-9, comma for haléře, backspace) and a primary "Request payment" button. It must be minimal and thumb-friendly.
- The payment screen has a segmented switch: **Bank** | **Bitcoin**.
  - **Bank**: an SPD QR built as `SPD*1.0*ACC:<IBAN>*AM:<amount>*CC:CZK*X-VS:<vs>*MSG:<shop name>`, with the amount, VS and account shown in text. The VS is unique per payment (numeric, ≤10 digits). The merchant confirms with "Mark as paid"; there is no automatic check. "Cancel" is also offered.
  - **Bitcoin**: the CZK amount is converted to sats with the linkshu fiat rate, which is shown along with the rate. The sats are raised a sat at a time until no other open request of the device (unpaid, also cancelled, from the last 24 hours) asks the same amount, because Linky's tokens name no request. Below a minimum the mint's fees allow (10 sat, scaled for mints charging over 1 sat per proof) the tab shows "Bitcoin from X Kč" instead and the bank leg still works. The device:
    1. creates a mint quote on the shop mint (bolt11, NUT-20 locked to the device key);
    2. shows the BIP-321 URI `bitcoin:?lightning=<bolt11>&creq=<creqA…>`. The creq is NUT-18: amount, `sat`, single use, the shop mint, and a nostr transport to the device nprofile, the same format linky builds.
  - Detection is automatic: either the quote is paid (the device then mints the proofs), or a Cashu token for this request arrives over Nostr (the device then receives it, which swaps and validates it). Then the payment becomes `paid` and the app shows a success overlay. A NUT-18 payload matches its request by id; a bare token matches the one open request at its mint asking exactly its amount. A cancelled request can still be paid this way. A token that matches no request, or several, is kept as an unassigned receipt.
- Money flow: customer → device wallet → owner.
  - On an employee device, after the device receives the funds, it sends a P2PK (NUT-11) token locked to the owner's pubkey, gift-wrapped to the owner. The record keeps `forwardedAt`, and failed forwards retry. Sats that paid no payment are forwarded the same way (a `LockedToken` with no payment ids), and leaving the shop stays blocked while the device holds any sats or a forward is on its way.
  - On the owner's device the proofs stay in the owner's wallet.

## History

- A list of payments, each with time, amount in CZK (plus sats), method (bank/lightning/cashu), status (pending/paid/cancelled) and who created it.
- The owner sees every payment: their own and every employee's, labelled with the employee name, with a filter by employee and a total for the day.
- An employee sees only their own payments.
- Every payment an employee creates or changes is stored in the employee's Evolu and sent to the owner as a `PaymentRecord` message. The owner upserts it under that employee.

## Owner wallet

- Shows the balance in sats and in CZK. Locked tokens from employees are received automatically (unlocked with the owner key).
- Activity lists what actually moved: Lightning payments, Cashu receipts net of the mint's input fee (assigned or unassigned), employees' forwards, and withdrawals including every fee (shown as secondary text). Its sum equals the balance.
- A Lightning withdrawal's review shows the most it can cost (amount, fee reserve and mint input fees, linkshu `Melt.cost`), the melt never debits more, and the withdrawal records the fee actually paid.
- Withdraw: to a Lightning address (LNURL-pay melt), or "Send to Linky", which takes an npub or a scanned Linky profile and sends the token as a NIP-17 chat message, the way linky sends tokens.

## Settings

Language (cs/en), shop details (owner), backup phrase, restore, and a "reset this device" action behind a confirmation.

## Protocol (Nostr)

- Device keys are the NIP-06 keys of each install. Messages are gift wrapped (NIP-17/59, NIP-44) through linkstr.
- App messages are JSON with `{v:1, type, …}` and are validated with Effect Schema in `packages/core`:
  - `ShopConfig` (owner → employee device): `shopId`, `shopName`, `iban`, `accountDisplay`, `ownerPubkey`, `mintUrl`, `employeeName`, `updatedAt` (when the owner last changed the shop or the employee). The device applies only a config newer than the one it holds, and none from an owner who removed it, because the inbox replays old ones in any order.
  - `EmployeeRemoved` (owner → employee device).
  - `PaymentRecord` (employee device → owner): `paymentId`, `amountCzk` (haléře int), `sats?`, `method`, `status`, `vs?`, `createdAt`, `updatedAt`, `paidAt?`.
  - `LockedToken` (employee device → owner): `paymentIds` (every payment the token's sats come from), `token` (P2PK-locked to the owner).
- Employee attestation: over NIP-46, Linky signs a **kind 24138** event with tags exactly `[["linky","device_authorization"],["p",<device pubkey hex>],["app","Platit prosím"]]` and empty content. The nostrconnect URI must request `sign_event:24138` (`DEVICE_AUTHORIZATION_PERMISSION`) and carry `name=Platit prosím`. The device publishes it as NIP-78 (kind 30078, `d=platitprosim:employee-device`, `p=<employee pubkey>`), authored by the device key, with the signed event as content. The owner watches `#p=[active employee pubkeys]` and accepts the event only if `verifyDeviceAuthorization(content)` returns `{author, device, app}` with `device === event author`, `app === "Platit prosím"` and `author` an active employee.
- Because the attestation is public, any owner who lists the same employee could send that device a `ShopConfig`. The employee device therefore shows "Join <shop name>?" and stores the membership only after the employee confirms.

## Local dev

`docker-compose.dev.yml` runs a nostr relay, an Evolu relay and a FakeWallet nutshell mint, the same images as linky but on ports **7787 / 4011 / 3348**, so they don't clash with linky stacks. `bun run dev` starts the services and the web app. For end-to-end testing, a local linky web-app dev server, pointed at the same services, acts as the employee's Linky (NIP-46 signer) and as the customer wallet.
