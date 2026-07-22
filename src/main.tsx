import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './firebase.ts';
import App from './App.tsx';

const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const token = localStorage.getItem("eduquiz_token");
  if (token && typeof input === "string" && input.startsWith("/api/")) {
    init = init || {};
    init.headers = {
      ...init.headers,
      Authorization: `Bearer ${token}`
    };
  }
  const response = await originalFetch(input, init);
  if (response.status === 401 && typeof input === "string" && input.startsWith("/api/") && !input.includes("/auth/")) {
    console.warn("⚠️ Received 401 Unauthorized. Clearing session and reloading...");
    localStorage.removeItem("eduquiz_user");
    localStorage.removeItem("eduquiz_token");
    if (!window.location.pathname.includes("login")) {
      window.location.reload();
    }
  }
  return response;
};

import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
