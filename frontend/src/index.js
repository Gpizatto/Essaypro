import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BrandingProvider } from "@/contexts/BrandingContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ThemeProvider>
  <BrandingProvider>
  <React.StrictMode>
    <App />
  </React.StrictMode>
  </BrandingProvider>
  </ThemeProvider>,
);
