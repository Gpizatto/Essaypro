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

// U-08: Registrar Service Worker para cache offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        // Verificar se há nova versão disponível
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão disponível — notificar usuário de forma discreta
              console.info('Nova versão da plataforma disponível. Recarregue para atualizar.');
            }
          });
        });
      })
      .catch((err) => {
        console.warn('Service Worker não pôde ser registrado:', err);
      });
  });
}
