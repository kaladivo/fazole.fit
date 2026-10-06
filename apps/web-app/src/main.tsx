import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { appConfig } from "./config";
import { registerPwa } from "./pwa/register";
import { createAppServices, runtimeConfigFrom } from "./services";
import { loadIdentity, loadOwnServers, syncOwnEvoluServers } from "./storage";
import { createBrowserEvolu } from "./storage/browserEvolu";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  registerPwa();
  const evolu = createBrowserEvolu();
  syncOwnEvoluServers(evolu);
  const services = Promise.all([
    loadIdentity(evolu),
    loadOwnServers(evolu, "nostrRelays"),
  ]).then(([identity, ownRelays]) => {
    const started = createAppServices(
      evolu,
      identity,
      runtimeConfigFrom(appConfig, ownRelays),
    );
    started.start();
    return started;
  });
  createRoot(root).render(
    <StrictMode>
      <App evolu={evolu} services={services} />
    </StrictMode>,
  );
}
