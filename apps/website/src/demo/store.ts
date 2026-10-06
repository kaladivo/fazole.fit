import type { PaymentStatus } from "@platitprosim/ui";
import { createContext, useContext } from "react";
import { halereToSats } from "./money";

export type PaymentMethod = "bank" | "lightning" | "cashu";

export const ownerId = "owner";

export interface DemoPayment {
  id: string;
  halere: number;
  sats?: number;
  method: PaymentMethod;
  status: PaymentStatus;
  /** An employee id, or `ownerId`. */
  createdBy: string;
  at: Date;
}

export interface DemoEmployee {
  id: string;
  name: string;
  addedToday: boolean;
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

export const seedEmployees: DemoEmployee[] = [
  { id: "tereza", name: "Tereza Malá", addedToday: false },
  { id: "martin", name: "Martin Novák", addedToday: false },
];

const seedPayment = (
  id: string,
  halere: number,
  method: PaymentMethod,
  createdBy: string,
  minutes: number,
  status: PaymentStatus = "paid",
): DemoPayment => ({
  id,
  halere,
  method,
  status,
  createdBy,
  at: minutesAgo(minutes),
  ...(method === "bank" ? {} : { sats: halereToSats(halere) }),
});

export const seedPayments = (): DemoPayment[] => [
  seedPayment("p1", 125_000, "bank", "tereza", 4),
  seedPayment("p2", 8_900, "lightning", "martin", 13),
  seedPayment("p3", 42_000, "bank", ownerId, 26),
  seedPayment("p4", 6_500, "cashu", "tereza", 38),
  seedPayment("p5", 189_000, "bank", "martin", 52, "cancelled"),
  seedPayment("p6", 34_050, "bank", "tereza", 71),
  seedPayment("p7", 15_500, "lightning", ownerId, 96),
  seedPayment("p8", 230_000, "bank", "martin", 131),
];

/** A new employee for the "scan a Linky profile" demo. */
export const scannedProfile = {
  name: "Jana Svobodová",
  link: "https://linky.fit/p/npub1demo0platitprosim0employee0profile",
};

export interface DemoState {
  payments: DemoPayment[];
  employees: DemoEmployee[];
  balanceSats: number;
  addPayment: (payment: Omit<DemoPayment, "id" | "at" | "createdBy">) => void;
  addEmployee: (name: string) => void;
  spend: (sats: number) => void;
}

export const DemoContext = createContext<DemoState | undefined>(undefined);

export const useDemo = (): DemoState => {
  const demo = useContext(DemoContext);
  if (!demo) throw new Error("useDemo needs a DemoProvider");
  return demo;
};
