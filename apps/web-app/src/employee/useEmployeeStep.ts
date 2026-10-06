import {
  useEmployeeLogin,
  useShopOffers,
  useStoredMembership,
} from "../storage";
import { employeeStep } from "./employeeFlow";
import type { EmployeeStep } from "./employeeFlow";

export const useEmployeeStep = (): EmployeeStep =>
  employeeStep({
    login: useEmployeeLogin(),
    offers: useShopOffers(),
    membership: useStoredMembership(),
  });
