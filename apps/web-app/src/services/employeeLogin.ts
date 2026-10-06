import {
  AppData,
  AppDataDraft,
  AppDataIdentifier,
  DEVICE_AUTHORIZATION_PERMISSION,
  deviceAuthorizationTemplate,
  NostrConnectClient,
  NostrConnectClientDraft,
  verifyDeviceAuthorization,
} from "@linky-fit/linkstr";
import type { RelayUrl } from "@linky-fit/linkstr";
import {
  DEVICE_AUTHORIZATION_APP,
  EMPLOYEE_DEVICE_IDENTIFIER,
} from "@platitprosim/core";
import { Effect, Either } from "effect";
import {
  declineShopOffer,
  loadEmployeeLogin,
  loadShopOffers,
  loadStoredMembership,
  markMembershipRemoved,
  saveEmployeeLogin,
  saveMembership,
  saveShopOffer,
} from "../storage";
import type { AppEvolu, EmployeeLogin } from "../storage";
import type { Nostr } from "./nostr";

/** Why a Linky login ended without a signed attestation. */
export type LinkFailure = "timeout" | "refused" | "unreachable" | "invalid";

/** Employee install: logging in with Linky and publishing the attestation for owners to find. */
export interface EmployeeLink {
  /**
   * Opens a `nostrconnect://` link, hands its URI to `onUri` once every relay
   * listens, and asks the signer for a device authorization of this device.
   * A valid one is stored as the login; `null` then, or why it failed.
   */
  readonly link: (
    onUri: (uri: string) => void,
    signal: AbortSignal,
  ) => Promise<LinkFailure | null>;
  /** Publishes the login's attestation as NIP-78 app data; `false` when no relay took it. */
  readonly publish: (login: EmployeeLogin) => Promise<boolean>;
}

const linkFailure = (tag: string): LinkFailure => {
  switch (tag) {
    case "NostrConnectSignerTimedOut":
      return "timeout";
    case "NostrConnectSignRefused":
      return "refused";
    default:
      return "unreachable";
  }
};

export const createEmployeeLink = ({
  evolu,
  nostr,
  relays,
}: {
  readonly evolu: AppEvolu;
  readonly nostr: Nostr;
  readonly relays: readonly RelayUrl[];
}): EmployeeLink => {
  const publish: EmployeeLink["publish"] = (login) =>
    nostr
      .run(
        Effect.flatMap(AppData, (appData) =>
          appData.publish(
            new AppDataDraft({
              identifier: AppDataIdentifier.make(EMPLOYEE_DEVICE_IDENTIFIER),
              tags: [["p", login.employeePubkey]],
              content: login.attestation,
            }),
          ),
        ),
      )
      .then(
        () => true,
        (error: unknown) => {
          console.warn("attestation not published", error);
          return false;
        },
      );

  const sign = (
    onUri: (uri: string) => void,
    [first, ...rest]: readonly [RelayUrl, ...RelayUrl[]],
  ) =>
    Effect.scoped(
      Effect.gen(function* () {
        const client = yield* NostrConnectClient;
        const session = yield* client.open(
          new NostrConnectClientDraft({
            relays: [first, ...rest],
            perms: [DEVICE_AUTHORIZATION_PERMISSION],
            name: DEVICE_AUTHORIZATION_APP,
            // The signer shows it next to the app name.
            url: globalThis.location.origin,
          }),
        );
        onUri(session.uri);
        return yield* session.signEvent(
          deviceAuthorizationTemplate({
            device: nostr.pubkey,
            app: DEVICE_AUTHORIZATION_APP,
          }),
        );
      }),
    );

  return {
    publish,
    link: async (onUri, signal) => {
      const [first, ...rest] = relays;
      if (first === undefined) return "unreachable";
      const signed = await nostr
        .run(Effect.either(sign(onUri, [first, ...rest])), { signal })
        .catch((error: unknown) => {
          // Aborting interrupts the run; the caller already moved on.
          if (signal.aborted) return null;
          throw error;
        });
      if (signed === null) return null;
      if (Either.isLeft(signed)) return linkFailure(signed.left._tag);
      const authorization = verifyDeviceAuthorization(signed.right);
      if (
        authorization === null ||
        authorization.device !== nostr.pubkey ||
        authorization.app !== DEVICE_AUTHORIZATION_APP
      ) {
        return "invalid";
      }
      const login: EmployeeLogin = {
        employeePubkey: authorization.author,
        attestation: JSON.stringify(authorization.event),
      };
      await saveEmployeeLogin(evolu, login);
      void publish(login);
      return null;
    },
  };
};

/**
 * Employee install: a `ShopConfig` from the shop it works for updates the
 * membership, one from another owner waits for the employee to accept it,
 * and `EmployeeRemoved` from its owner ends the membership. The inbox
 * replays old configs in any order, so only a newer one is applied, and
 * none from an owner who removed this device.
 */
export const receiveMembershipMessages = (evolu: AppEvolu, nostr: Nostr) =>
  nostr.onAppMessage(async (message, event) => {
    if (message.type === "ShopConfig") {
      if (event.from !== message.ownerPubkey) return;
      const login = await loadEmployeeLogin(evolu);
      if (login === null) return;
      const membership = await loadStoredMembership(evolu);
      if (membership?.ownerPubkey === event.from) {
        if (
          !membership.removed &&
          message.updatedAt > (membership.configUpdatedAtMs ?? 0)
        ) {
          await saveMembership(evolu, message, login.employeePubkey);
        }
        return;
      }
      if (membership !== null && !membership.removed) return;
      const offer = (await loadShopOffers(evolu)).find(
        ({ ownerPubkey }) => ownerPubkey === event.from,
      );
      if (
        offer?.declined ||
        message.updatedAt <= (offer?.config.updatedAt ?? 0)
      ) {
        return;
      }
      await saveShopOffer(evolu, event.from, message);
      return;
    }
    if (message.type === "EmployeeRemoved") {
      const membership = await loadStoredMembership(evolu);
      if (
        membership !== null &&
        !membership.removed &&
        membership.ownerPubkey === event.from
      ) {
        await markMembershipRemoved(evolu);
      }
      const offer = (await loadShopOffers(evolu)).find(
        (stored) => stored.ownerPubkey === event.from && !stored.declined,
      );
      if (offer) await declineShopOffer(evolu, offer.id);
    }
  });
