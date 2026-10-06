/// <reference lib="webworker" />
import { Schema } from "effect";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope;

const ClientMessage = Schema.Struct({
  type: Schema.Literal("SKIP_WAITING", "CLIENT_COUNT"),
});
const decodeClientMessage = Schema.decodeUnknownOption(ClientMessage);

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

self.addEventListener("message", (event) => {
  const message = decodeClientMessage(event.data);
  if (message._tag === "None") return;
  if (message.value.type === "SKIP_WAITING") {
    void self.skipWaiting();
    return;
  }
  const [port] = event.ports;
  if (!port) return;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => port.postMessage({ count: clients.length })),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
