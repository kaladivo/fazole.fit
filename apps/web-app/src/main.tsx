import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createBrowserEvolu } from "./storage/browserEvolu";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App evolu={createBrowserEvolu()} />
    </StrictMode>,
  );
}
