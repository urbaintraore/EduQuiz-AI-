import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseAppletConfig from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
  measurementId: firebaseAppletConfig.measurementId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);

// Handle third-party cookie blocking in iframes gracefully
setPersistence(auth, browserLocalPersistence).catch(() => {
  setPersistence(auth, inMemoryPersistence).catch(console.warn);
});

export const db = getFirestore(app, firebaseAppletConfig.firestoreDatabaseId || "(default)");

// Helper to resolve API urls dynamically for external deployments (such as Vercel)
export const getApiUrl = (path: string): string => {
  if (path.startsWith("/api/")) {
    const isLocalOrRunApp = typeof window !== 'undefined' && (
      window.location.hostname === "localhost" || 
      window.location.hostname === "127.0.0.1" || 
      window.location.hostname.endsWith("run.app") ||
      (window.location.hostname.endsWith("vercel.app") && !(import.meta as any).env.VITE_API_URL)
    );
                            
    if (!isLocalOrRunApp) {
      const apiBase = (import.meta as any).env.VITE_API_URL || "https://ais-pre-mrwnyy47wnvgmlqqtnsin5-100691965662.europe-west2.run.app";
      const cleanBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
      return `${cleanBase}${path}`;
    }
  }
  return path;
};

// Global interceptor for relative fetch calls
if (typeof window !== 'undefined') {
  try {
    const originalFetch = window.fetch;
    const interceptedFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      let urlStr = "";
      if (typeof input === "string") {
        urlStr = input;
      } else if (input instanceof URL) {
        urlStr = input.toString();
      } else if (input instanceof Request) {
        urlStr = input.url;
      } else {
        urlStr = (input as any).url || "";
      }

      if (urlStr.startsWith("/api/")) {
        const isLocalOrRunApp = window.location.hostname === "localhost" || 
                                window.location.hostname === "127.0.0.1" || 
                                window.location.hostname.endsWith("run.app") ||
                                (window.location.hostname.endsWith("vercel.app") && !(import.meta as any).env.VITE_API_URL);
                                
        if (!isLocalOrRunApp) {
          const apiBase = (import.meta as any).env.VITE_API_URL || "https://ais-pre-mrwnyy47wnvgmlqqtnsin5-100691965662.europe-west2.run.app";
          const cleanBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
          urlStr = `${cleanBase}${urlStr}`;
          
          if (typeof input === "string") {
            return originalFetch(urlStr, init);
          } else if (input instanceof URL) {
            return originalFetch(new URL(urlStr), init);
          } else {
            const newRequest = new Request(urlStr, {
              method: input.method,
              headers: input.headers,
              body: input.body,
              mode: input.mode,
              credentials: input.credentials,
              cache: input.cache,
              redirect: input.redirect,
              referrer: input.referrer,
              integrity: input.integrity,
              keepalive: input.keepalive,
              signal: input.signal,
            });
            return originalFetch(newRequest, init);
          }
        }
      }

      return originalFetch(input, init);
    };

    try {
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: interceptedFetch
      });
    } catch (_) {
      // Direct assignment fallback
      window.fetch = interceptedFetch;
    }
  } catch (e) {
    console.warn("⚠️ Cannot hijack window.fetch due to iframe/browser constraints. Relative API calls fallback to original window.fetch.", e);
  }
}

export default app;
