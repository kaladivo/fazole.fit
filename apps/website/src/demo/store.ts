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
  variableSymbol?: string;
  /** An employee id, or `ownerId`. */
  createdBy: string;
  at: Date;
  paidAt?: Date;
}

export interface DemoEmployee {
  id: string;
  name: string;
  npub: string;
  /** Whether the employee has logged in on a device yet. */
  linked: boolean;
}

export type WithdrawalKind = "lightning" | "linky";

export interface DemoWithdrawal {
  id: string;
  kind: WithdrawalKind;
  sats: number;
  at: Date;
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

export const seedEmployees: DemoEmployee[] = [
  {
    id: "tereza",
    name: "Tereza Malá",
    npub: "npub1t8rezq4m3lq0demo0employee0tereza0mala0platitprosim0x7k2",
    linked: true,
  },
  {
    id: "martin",
    name: "Martin Novák",
    npub: "npub1m4rtn0v4kq0demo0employee0martin0novak0platitprosim0q9fd",
    linked: true,
  },
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
  ...(status === "paid" ? { paidAt: minutesAgo(minutes - 1) } : {}),
  ...(method === "bank"
    ? { variableSymbol: String(4_820_130_000 + halere) }
    : { sats: halereToSats(halere) }),
});

const yesterday = 24 * 60;

export const seedPayments = (): DemoPayment[] => [
  seedPayment("p1", 125_000, "bank", "tereza", 4),
  seedPayment("p2", 8_900, "lightning", "martin", 13),
  seedPayment("p3", 42_000, "bank", ownerId, 26),
  seedPayment("p4", 6_500, "cashu", "tereza", 38),
  seedPayment("p5", 189_000, "bank", "martin", 52, "cancelled"),
  seedPayment("p6", 34_050, "bank", "tereza", 71),
  seedPayment("p7", 15_500, "lightning", ownerId, 96),
  seedPayment("p8", 230_000, "bank", "martin", yesterday + 45),
  seedPayment("p9", 12_900, "lightning", "tereza", yesterday + 120),
  seedPayment("p10", 56_000, "bank", ownerId, yesterday + 200),
];

export const seedWithdrawals = (): DemoWithdrawal[] => [
  { id: "w1", kind: "lightning", sats: 50_000, at: minutesAgo(yesterday + 30) },
];

/** A new employee for the "scan a Linky profile" demo. */
export const scannedProfile = {
  name: "Jana Svobodová",
  npub: "npub1j4n4sv0b0d0v4demo0employee0jana0svobodova0platitprosim0",
  link: "https://linky.fit/p/npub1j4n4sv0b0d0v4demo0employee0jana0svobodova0platitprosim0",
};

export type Settlement =
  | { status: "cancelled" }
  | { status: "paid"; method: "bank" }
  | { status: "paid"; method: "lightning"; sats: number };

export interface DemoActions {
  /** Opens a pending bank payment by the owner, like the app does on "Request payment". */
  requestPayment: (halere: number) => DemoPayment;
  settlePayment: (id: string, settlement: Settlement) => void;
  addEmployee: (name: string, npub: string) => void;
  withdraw: (kind: WithdrawalKind, sats: number) => void;
}

export interface DemoState extends DemoActions {
  payments: DemoPayment[];
  employees: DemoEmployee[];
  withdrawals: DemoWithdrawal[];
  balanceSats: number;
}

export const DemoContext = createContext<DemoState | undefined>(undefined);

export const useDemo = (): DemoState => {
  const demo = useContext(DemoContext);
  if (!demo) throw new Error("useDemo needs a DemoProvider");
  return demo;
};
