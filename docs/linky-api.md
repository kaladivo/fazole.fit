# Linky package API used by Platit prosím

The source of truth is linky PR https://github.com/linky-fit/linky/pull/559 (branch `feat/platitprosim-support`, worktree `~/.worktrees/linky-platitprosim`). Until it is released, the app installs the packages as `file:` deps from:

- `/Users/jarvis/.worktrees/linky-platitprosim/packages/linkshu/dist`
- `/Users/jarvis/.worktrees/linky-platitprosim/packages/linkstr/dist`

To rebuild after changing the worktree: `cd ~/.worktrees/linky-platitprosim && bun run build:npm`. Read the package docs in that worktree (`packages/linkshu/docs/payment-requests.md`, `packages/linkstr/docs/`) for details.

## linkshu

- P2PK send: `send.send(new SendDraft({ mint, amount, produceAs: "pending", lockTo: parseP2pkPubkey(ownerNpub)! }))`. Fails with `LockingUnsupported` when the mint lacks NUT-11. Check first with `Mints.info(mint).supportsP2pk`.
- P2PK receive: `receive.receive(new ReceiveDraft({ text, automatic: true }), { unlockingKey: P2pkUnlockingKey.make(hexSecret) })`. Fails with `TokenLocked` when the key doesn't match.
- Payment request and BIP-321 (`@linky-fit/linkshu/payment-request`, no cashu-ts): `buildBip321PaymentUri({ lightning: bolt11, creq: encodeNostrPaymentRequest({ amount, mintUrls: [mint], recipientNprofile, requestId }) })`, plus `decodePaymentRequest`, `parseBip321Uri` and `decodePaymentRequestPayload`.
- Lightning: `Topup.start(new TopupDraft({ mint, amount }), { lockingKey })` returns a handle. `handle.quote.invoice` is the bolt11, and `handle.result` resolves once the invoice is paid and the proofs are minted. Run it under `Effect.scoped`.
- Cashu over Nostr: pass the chat message text to `Receive.receive`. It accepts a `cashuB…` token or raw NUT-18 `{id, mint, unit, proofs}` JSON. Linky's token messages carry no request id, so match them by mint and amount.
- CZK: `fetchFiatRates(signal)` gives `czkPerBtc`.

## linkstr

- App messages: `const ch = appMessageChannel(AppNamespace.make("platitprosim"), Schema)`.
  - Send: `AppMessages.send(ch.draft(to, value, { clientId? }))`, or enqueue `{ _tag: "appMessage", draft }` on the `Outbox` to get retries.
  - Receive: messages arrive in `WrapInbox` as `AppMessageReceived`. Decode with `ch.decode(event)`, which returns an `Option`.
  - Wire format: gift-wrapped kind 24137, sent to the recipient only, with no self copy.
- NIP-78:
  - `AppData.publish(new AppDataDraft({ identifier: AppDataIdentifier.make("platitprosim:employee-device"), tags: [["p", employee]], content }))`
  - `AppData.fetch(new AppDataQuery({ authors?, identifiers?, taggedPubkeys?, since? }))` and `AppData.watch(query)` (a scoped stream). Both yield `AppDataEvent {author, identifier, tags, content, createdAt, event}`.
- Incoming tokens to the device nprofile arrive as `ChatMessageReceived`. Linky sends a `TokenBody`; other wallets send a `TextBody` holding NUT-18 JSON.
- Sending a token to a Linky user is a chat token send, the way linky does it (`Chat.sendToken`).
- NIP-46 client:
  ```ts
  Effect.scoped(Effect.gen(function* () {
    const s = yield* (yield* NostrConnectClient).open(new NostrConnectClientDraft({ relays, perms: [DEVICE_AUTHORIZATION_PERMISSION], name: "Platit prosím", url }))
    show(`${linkyUrl}/#${s.uri}`) // and/or a QR of s.uri
    const signed = yield* s.signEvent(deviceAuthorizationTemplate({ device: devicePubkey, app: "Platit prosím" }))
  }))
  ```
  Errors: `NostrConnectSignerTimedOut`, `NostrConnectSignRefused`, `NostrConnectRequestNotDelivered`, `NostrConnectRelaysUnreachable`. Each link allows one signature.
- To verify an attestation, call `verifyDeviceAuthorization(content)`. It returns `{author, device, app}` or `null`.
