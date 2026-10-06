import { evoluWebDeps } from "@evolu/web";
import { flushSync } from "react-dom";
import { createAppEvolu } from "./evolu";

/** The persistent, synced instance of the web app; Evolu keeps its AppOwner in its own storage. */
export const createBrowserEvolu = () =>
  createAppEvolu({ ...evoluWebDeps, flushSync });
