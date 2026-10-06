# Platit prosím

A payment terminal in your phone for Czech merchants. Type an amount, and the customer scans a QR code to pay by bank transfer, Lightning or Cashu. There is no server and no account: data lives on your devices in [Evolu](https://evolu.dev), devices talk over Nostr, and Bitcoin settles through a Cashu mint.

- App: https://app.platit.twoballers.dev
- Website: https://platit.twoballers.dev

Built on the same stack as [Linky](https://linky.fit), using its [`@linky-fit/linkstr`](https://www.npmjs.com/package/@linky-fit/linkstr) (Nostr) and [`@linky-fit/linkshu`](https://www.npmjs.com/package/@linky-fit/linkshu) (Cashu) packages.

## How it works

- **Bank**: an SPD QR code with your account, the amount and a unique variable symbol. You confirm the payment by tapping "Zaplaceno".
- **Bitcoin**: one BIP-321 QR code carries a Lightning invoice and a Cashu payment request. Either is detected automatically. A "Lightning only" QR code is available for wallets that struggle with dense codes.
- **Team**: the owner adds employees by scanning their Linky profile. An employee logs in with Linky, which links their device to the shop. Employees see only their own payments. Every payment syncs to the owner over encrypted Nostr messages. Bitcoin an employee receives is forwarded to the owner as Cashu locked to the owner's key (NUT-11).
- **Wallet**: the owner withdraws to a Lightning address or invoice, or sends to a Linky user.
- **Backup**: a 24-word phrase restores everything on a new device: shop, history, team and wallet.

## Screenshots

| | | | |
|---|---|---|---|
| ![Welcome](docs/screenshots/01-welcome.png) | ![Set up a shop](docs/screenshots/02-setup-shop.png) | ![Backup phrase](docs/screenshots/03-backup-phrase.png) | ![Terminal](docs/screenshots/04-terminal.png) |
| ![Bank QR](docs/screenshots/05-bank-qr.png) | ![Bitcoin QR](docs/screenshots/06-bitcoin-qr.png) | ![Paid](docs/screenshots/07-payment-success.png) | ![Owner history](docs/screenshots/08-history-owner.png) |
| ![Team](docs/screenshots/09-team.png) | ![Employee login](docs/screenshots/10-employee-login.png) | ![Linky approval](docs/screenshots/11-linky-approval.png) | ![Join the shop](docs/screenshots/12-employee-join.png) |
| ![Employee terminal](docs/screenshots/13-employee-terminal.png) | ![Employee history](docs/screenshots/14-employee-history.png) | ![Wallet](docs/screenshots/15-wallet.png) | ![Withdraw](docs/screenshots/16-withdraw.png) |
| ![Send to Linky](docs/screenshots/17-send-to-linky.png) | ![Settings](docs/screenshots/18-settings.png) | ![Restore](docs/screenshots/19-restore.png) | ![Terminal, English, dark](docs/screenshots/24-terminal-en-dark.png) |

![Desktop terminal, dark](docs/screenshots/20-desktop-terminal-dark.png)
![Desktop history](docs/screenshots/21-desktop-history.png)
![Website](docs/screenshots/23-website-desktop.png)

## Repository

| Path | What |
|---|---|
| `apps/web-app` | The PWA (React 19, Vite, Evolu, Effect) |
| `apps/website` | The presentation website, with live mocks built from the real UI components |
| `apps/ui-book` | Component catalog |
| `packages/ui` | Tamagui design system (react-native-web on the web) |
| `packages/core` | Domain logic: Czech accounts and IBAN, SPD, variable symbols, money, keys, the Nostr message protocol |
| `packages/config` | Shared TypeScript, ESLint and Prettier config |
| `docs/SPEC.md` | Product spec and protocol |

## Development

Requires [bun](https://bun.sh) and Docker.

```sh
bun install
bun run dev            # local nostr relay, Evolu relay and FakeWallet mint (ports 7787/4011/3348) + the app on :5280
bun run website:dev    # website on :5300
bun run ui:dev         # component catalog on :5290
bun run check-code     # typecheck, eslint, prettier
bun run test
```

`bun run mint:pay <bolt11>` pays a local invoice, and `bun run mint:token <sats>` prints a local Cashu token. AGENTS.md explains how to run a local Linky against the same services.

Employee login opens Linky at https://nightly.app.linky.fit. Set `VITE_LINKY_URL` to point it elsewhere.

## Deploy

`scripts/deploy.sh web-app` and `scripts/deploy.sh website` build locally and publish to Vercel.
