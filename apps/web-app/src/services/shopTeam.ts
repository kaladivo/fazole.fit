import { AppData, AppDataIdentifier, AppDataQuery } from "@linky-fit/linkstr";
import type { AppDataEvent } from "@linky-fit/linkstr";
import {
  EMPLOYEE_DEVICE_IDENTIFIER,
  encodeAppMessage,
} from "@platitprosim/core";
import { Effect, Stream } from "effect";
import {
  employeeDevicesQuery,
  employeesQuery,
  isActive,
  isTrusted,
  linkEmployeeDevice,
  loadEmployeeDevices,
  loadEmployees,
  loadOwnShop,
  markConfigSent,
  markEmployeeRemoved,
  revokeEmployeeDevice,
  shopQuery,
  upsertReportedPayment,
  watchQueries,
} from "../storage";
import type { AppEvolu, Employee } from "../storage";
import { shopConfigFor, verifyDeviceLink } from "../team/team";
import type { Nostr } from "./nostr";
import { serialQueue } from "./serial";

/** Owner install: links employees' devices, keeps them configured and collects their payments. */
export interface ShopTeam {
  /** Ends the employee's access and tells each of their devices. */
  readonly removeEmployee: (employee: Employee) => Promise<void>;
  /** Watches the shop's employees for device attestations while the app runs; once. */
  readonly start: () => void;
}

const identifier = AppDataIdentifier.make(EMPLOYEE_DEVICE_IDENTIFIER);

export const createShopTeam = ({
  evolu,
  nostr,
}: {
  readonly evolu: AppEvolu;
  readonly nostr: Nostr;
}): ShopTeam => {
  const serially = serialQueue("shop team");

  /** Queues the current `ShopConfig` to every device of an active employee that has not got it. */
  const syncConfigs = () =>
    serially(async () => {
      const shop = await loadOwnShop(evolu);
      if (shop === null) return;
      const employees = await loadEmployees(evolu);
      for (const device of (await loadEmployeeDevices(evolu)).filter(
        isTrusted,
      )) {
        const employee = employees.find(({ id }) => id === device.employeeId);
        if (employee === undefined || !isActive(employee)) continue;
        const config = shopConfigFor(shop, nostr.pubkey, employee);
        const json = encodeAppMessage(config);
        if (device.configSent === json) continue;
        await nostr.sendAppMessage(
          device.pubkey,
          config,
          `shopConfig:${device.pubkey}`,
        );
        await markConfigSent(evolu, device.id, json);
      }
    });

  const linkDevice = (event: AppDataEvent) =>
    serially(async () => {
      const link = verifyDeviceLink(event, await loadEmployees(evolu));
      if (link === null) return;
      const linked = (await loadEmployeeDevices(evolu)).find(
        (device) => device.pubkey === link.device,
      );
      if (
        linked &&
        (!isTrusted(linked) || linked.employeeId === link.employee.id)
      ) {
        return;
      }
      await linkEmployeeDevice(evolu, {
        employeeId: link.employee.id,
        pubkey: link.device,
      });
    }).then(syncConfigs);

  let watched: { readonly key: string; readonly stop: () => void } | null =
    null;
  const rewatchSerially = serialQueue("employee device watch");
  /** One NIP-78 subscription for the active employees, replaced when they change. */
  const rewatch = () =>
    rewatchSerially(async () => {
      const shop = await loadOwnShop(evolu);
      const pubkeys =
        shop === null
          ? []
          : (await loadEmployees(evolu))
              .filter(isActive)
              .map(({ pubkey }) => pubkey)
              .sort();
      const key = pubkeys.join(",");
      if (watched?.key === key) return;
      watched?.stop();
      watched = null;
      if (pubkeys.length === 0) return;
      const stop = nostr.fork(
        Effect.scoped(
          Effect.gen(function* () {
            const appData = yield* AppData;
            const events = yield* appData.watch(
              new AppDataQuery({
                identifiers: [identifier],
                taggedPubkeys: pubkeys,
              }),
            );
            yield* Stream.runForEach(events, (event) =>
              Effect.promise(() => linkDevice(event)),
            );
          }),
        ),
        "employee device watch",
      );
      watched = { key, stop };
    });

  nostr.onAppMessage(async (message, event) => {
    if (message.type !== "PaymentRecord") return;
    const device = (await loadEmployeeDevices(evolu)).find(
      ({ pubkey }) => pubkey === event.from,
    );
    const employee =
      device &&
      (await loadEmployees(evolu)).find(({ id }) => id === device.employeeId);
    if (!device || !isTrusted(device) || !employee || !isActive(employee)) {
      return;
    }
    await upsertReportedPayment(evolu, {
      device: device.pubkey,
      employeeId: employee.id,
      record: message,
    });
  });

  let started = false;

  return {
    removeEmployee: async (employee) => {
      await markEmployeeRemoved(evolu, employee.id);
      const devices = (await loadEmployeeDevices(evolu)).filter(
        (device) => device.employeeId === employee.id && isTrusted(device),
      );
      for (const device of devices) {
        await nostr.sendAppMessage(
          device.pubkey,
          { v: 1, type: "EmployeeRemoved", shopId: nostr.pubkey },
          `employeeRemoved:${device.pubkey}`,
        );
        await revokeEmployeeDevice(evolu, device.id);
      }
    },
    start: () => {
      if (started) return;
      started = true;
      watchQueries(
        evolu,
        [shopQuery(evolu), employeesQuery(evolu), employeeDevicesQuery(evolu)],
        () => {
          void rewatch();
          void syncConfigs();
        },
      );
    },
  };
};
