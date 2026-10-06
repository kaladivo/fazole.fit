import { verifyDeviceAuthorization } from "@linky-fit/linkstr";
import type { Pubkey } from "@linky-fit/linkstr";
import { DEVICE_AUTHORIZATION_APP } from "@platitprosim/core";
import type { ShopConfig } from "@platitprosim/core";
import type { Employee, OwnShop } from "../storage";

/** A device attestation that passed every check: whose it is and which key it links. */
export interface DeviceLink {
  readonly employee: Employee;
  readonly device: Pubkey;
}

/**
 * Accepts a NIP-78 employee-device event only when its content is a Linky
 * device authorization for this app, naming the key that published it, by
 * an employee who is still active.
 */
export const verifyDeviceLink = (
  event: { readonly author: Pubkey; readonly content: string },
  employees: readonly Employee[],
): DeviceLink | null => {
  const authorization = verifyDeviceAuthorization(event.content);
  if (
    authorization === null ||
    authorization.app !== DEVICE_AUTHORIZATION_APP ||
    authorization.device !== event.author
  ) {
    return null;
  }
  const employee = employees.find(
    (candidate) =>
      candidate.pubkey === authorization.author &&
      candidate.removedAtMs === null,
  );
  return employee ? { employee, device: authorization.device } : null;
};

/** What the owner tells an employee device; the shop is identified by the owner's key. */
export const shopConfigFor = (
  shop: OwnShop,
  ownerPubkey: Pubkey,
  employee: Employee,
): ShopConfig => ({
  v: 1,
  type: "ShopConfig",
  shopId: ownerPubkey,
  shopName: shop.name,
  iban: shop.iban,
  accountDisplay: shop.accountDisplay,
  ownerPubkey,
  mintUrl: shop.mintUrl,
  employeeName: employee.name ?? "",
  updatedAt: Math.max(shop.updatedAtMs, employee.updatedAtMs),
});

/**
 * How much of a mint balance a P2PK sweep can lock: the swap spends every
 * proof and pays the mint's input fee on each, so the device keeps nothing.
 */
export const sweepAmount = ({
  balance,
  proofs,
  inputFeePpk,
}: {
  readonly balance: number;
  readonly proofs: number;
  readonly inputFeePpk: number | null;
}): number =>
  Math.max(0, balance - Math.ceil((proofs * (inputFeePpk ?? 0)) / 1000));
