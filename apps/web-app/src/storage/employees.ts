import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import { Pubkey } from "@linky-fit/linkstr";
import { Option, Schema } from "effect";
import type { AppEvolu } from "./evolu";
import { mutation, useAppEvolu } from "./evolu";
import { employeeDeviceIdFor, employeeIdFor } from "./schema";
import type { EmployeeDeviceId, EmployeeId } from "./schema";

const EmployeeFields = Schema.Struct({
  pubkey: Pubkey,
  name: Schema.NullOr(Schema.String),
  addedAtMs: Schema.Int,
  removedAtMs: Schema.NullOr(Schema.Int),
});
const decodeEmployee = Schema.decodeUnknownOption(EmployeeFields);

export type Employee = typeof EmployeeFields.Type & {
  readonly id: EmployeeId;
};

const DeviceFields = Schema.Struct({
  employeeId: Schema.String,
  pubkey: Pubkey,
  linkedAtMs: Schema.Int,
  configSent: Schema.NullOr(Schema.String),
  revokedAtMs: Schema.NullOr(Schema.Int),
});
const decodeDevice = Schema.decodeUnknownOption(DeviceFields);

export type EmployeeDevice = typeof DeviceFields.Type & {
  readonly id: EmployeeDeviceId;
};

const decodeRows =
  <A, Id>(decode: (row: unknown) => Option.Option<A>) =>
  (rows: ReadonlyArray<{ readonly id: Id } & Record<string, unknown>>) =>
    rows.flatMap((row) =>
      Option.toArray(
        Option.map(decode(row), (fields) => ({ ...fields, id: row.id })),
      ),
    );

const toEmployees = decodeRows<typeof EmployeeFields.Type, EmployeeId>(
  decodeEmployee,
);
const toDevices = decodeRows<typeof DeviceFields.Type, EmployeeDeviceId>(
  decodeDevice,
);

export const employeesQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("employee")
      .selectAll()
      .where("isDeleted", "is not", sqliteTrue)
      .orderBy("addedAtMs", "asc"),
  );

export const employeeDevicesQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("employeeDevice")
      .selectAll()
      .where("isDeleted", "is not", sqliteTrue)
      .orderBy("linkedAtMs", "asc"),
  );

/** Every employee ever added, removed ones too, so history keeps their names. */
export const useEmployees = (): Employee[] =>
  toEmployees(useQuery(employeesQuery(useAppEvolu())));

export const loadEmployees = async (evolu: AppEvolu): Promise<Employee[]> =>
  toEmployees(await evolu.loadQuery(employeesQuery(evolu)));

export const isActive = (employee: Employee) => employee.removedAtMs === null;

export const useEmployeeDevices = (): EmployeeDevice[] =>
  toDevices(useQuery(employeeDevicesQuery(useAppEvolu())));

export const loadEmployeeDevices = async (
  evolu: AppEvolu,
): Promise<EmployeeDevice[]> =>
  toDevices(await evolu.loadQuery(employeeDevicesQuery(evolu)));

/** Adds the employee, or brings a removed one back under the new name. */
export const addEmployee = (
  evolu: AppEvolu,
  { pubkey, name }: { readonly pubkey: Pubkey; readonly name: string },
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.upsert(
      "employee",
      {
        id: employeeIdFor(pubkey),
        pubkey,
        name: name.trim() === "" ? null : name.trim().slice(0, 100),
        addedAtMs: now,
        removedAtMs: null,
      },
      { onComplete },
    ),
  );

export const renameEmployee = (evolu: AppEvolu, id: EmployeeId, name: string) =>
  mutation((onComplete) =>
    evolu.update(
      "employee",
      { id, name: name.trim() === "" ? null : name.trim().slice(0, 100) },
      { onComplete },
    ),
  );

export const markEmployeeRemoved = (
  evolu: AppEvolu,
  id: EmployeeId,
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.update("employee", { id, removedAtMs: now }, { onComplete }),
  );

/** Links a verified device to its employee; a device already linked keeps its sent config. */
export const linkEmployeeDevice = (
  evolu: AppEvolu,
  { employeeId, pubkey }: { employeeId: EmployeeId; pubkey: Pubkey },
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.upsert(
      "employeeDevice",
      { id: employeeDeviceIdFor(pubkey), employeeId, pubkey, linkedAtMs: now },
      { onComplete },
    ),
  );

export const markConfigSent = (
  evolu: AppEvolu,
  id: EmployeeDeviceId,
  configSent: string,
) =>
  mutation((onComplete) =>
    evolu.update("employeeDevice", { id, configSent }, { onComplete }),
  );

export const revokeEmployeeDevice = (
  evolu: AppEvolu,
  id: EmployeeDeviceId,
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.update("employeeDevice", { id, revokedAtMs: now }, { onComplete }),
  );

/** A device that may take payments for the shop. */
export const isTrusted = (device: EmployeeDevice) =>
  device.revokedAtMs === null;
