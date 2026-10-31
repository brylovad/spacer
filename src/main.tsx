import "@fontsource/righteous/400.css";
import "@fontsource/rubik/400.css";
import "@fontsource/rubik/500.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./design/tokens.css";
import "./design/components.css";
import { applySystemTheme } from "./design/theme";
import "./styles.css";

applySystemTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
