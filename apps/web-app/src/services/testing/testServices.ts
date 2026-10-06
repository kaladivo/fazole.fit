import { loadIdentity } from "../../storage";
import type { AppEvolu } from "../../storage";
import { createAppServices } from "../appServices";
import type { RuntimeConfig } from "../runtimes";

/** Services over no relays, never started: nothing reaches the network unless a test drives it. */
export const createTestServices = async (
  evolu: AppEvolu,
  config: Partial<RuntimeConfig> = {},
) =>
  createAppServices(evolu, await loadIdentity(evolu), {
    relays: [],
    allowInsecureLocalhostRelays: false,
    ...config,
  });
