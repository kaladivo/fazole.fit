import type { LinkFailure } from "../services";
import type { EmployeeLogin, ShopOffer, StoredMembership } from "../storage";

/** Where an employee install stands, from what it has stored. */
export type EmployeeStep =
  | { readonly step: "login" }
  | { readonly step: "waiting"; readonly login: EmployeeLogin }
  | {
      readonly step: "offer";
      readonly login: EmployeeLogin;
      readonly offer: ShopOffer;
    }
  | { readonly step: "removed"; readonly shopName: string }
  | { readonly step: "member" };

/**
 * An active membership wins; an unanswered offer comes next, so an owner who
 * adds a removed employee back is asked about again; then the removal notice,
 * then waiting for an owner.
 */
export const employeeStep = ({
  login,
  offers,
  membership,
}: {
  readonly login: EmployeeLogin | null;
  readonly offers: readonly ShopOffer[];
  readonly membership: StoredMembership | null;
}): EmployeeStep => {
  if (membership !== null && !membership.removed) return { step: "member" };
  const offer = offers.find((candidate) => !candidate.declined);
  if (login !== null && offer !== undefined) {
    return { step: "offer", login, offer };
  }
  if (membership !== null) {
    return { step: "removed", shopName: membership.shopName };
  }
  return login === null ? { step: "login" } : { step: "waiting", login };
};

/** Steps that keep the install on the employee screen until they resolve. */
export const holdsEmployeeScreen = (step: EmployeeStep) =>
  step.step === "waiting" || step.step === "offer" || step.step === "removed";

/** The Linky login while it runs; once it succeeds the stored login takes over. */
export type LinkState =
  | { readonly status: "idle" }
  | { readonly status: "opening" }
  | { readonly status: "awaiting"; readonly uri: string }
  | { readonly status: "failed"; readonly failure: LinkFailure };

export type LinkEvent =
  | { readonly type: "start" }
  | { readonly type: "uri"; readonly uri: string }
  | { readonly type: "finished"; readonly failure: LinkFailure | null }
  | { readonly type: "cancel" };

export const linkReducer = (state: LinkState, event: LinkEvent): LinkState => {
  switch (event.type) {
    case "start":
      return state.status === "idle" || state.status === "failed"
        ? { status: "opening" }
        : state;
    case "uri":
      return state.status === "opening"
        ? { status: "awaiting", uri: event.uri }
        : state;
    case "finished":
      if (state.status !== "opening" && state.status !== "awaiting") {
        return state;
      }
      return event.failure === null
        ? { status: "idle" }
        : { status: "failed", failure: event.failure };
    case "cancel":
      return { status: "idle" };
  }
};
