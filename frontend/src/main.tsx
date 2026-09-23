import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MarketProvider } from "./context/MarketContext";
import { PortfolioProvider } from "./context/PortfolioContext";
import { ToastProvider } from "./context/ToastContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <MarketProvider>
          <PortfolioProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </PortfolioProvider>
        </MarketProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
