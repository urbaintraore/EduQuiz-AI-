/// <reference types="vite/client" />

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseAppletConfig from '../firebase-applet-config.json';

const getValidEnv = (val: string | undefined, fallback: string) => {
  if (!val || val.startsWith("re_") || val.includes("PLACEHOLDER")) return fallback;
  return val;
};

const firebaseConfig = {
  apiKey: getValidEnv(import.meta.env.VITE_FIREBASE_API_KEY, firebaseAppletConfig.apiKey),
  authDomain: getValidEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, firebaseAppletConfig.authDomain),
  projectId: getValidEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, firebaseAppletConfig.projectId),
  storageBucket: getValidEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, firebaseAppletConfig.storageBucket),
  messagingSenderId: getValidEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, firebaseAppletConfig.messagingSenderId),
  appId: getValidEnv(import.meta.env.VITE_FIREBASE_APP_ID, firebaseAppletConfig.appId),
  measurementId: getValidEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, firebaseAppletConfig.measurementId)
};

// Initialize Firebase
let app: any = null;
let analytics: any = null;
let auth: any = null;
let db: any = null;

try {
  app = initializeApp(firebaseConfig);
  
  // We disable Analytics to prevent the "Installations: Create Installation request failed" 
  // error when API key is restricted or invalid in the preview environment.
  // analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
  
  auth = getAuth(app);
  
  const dbId = (firebaseAppletConfig as any).firestoreDatabaseId;
  db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  
  // Handle third-party cookie blocking in iframes gracefully
  setPersistence(auth, browserLocalPersistence).catch(() => {
    setPersistence(auth, inMemoryPersistence).catch(console.warn);
  });
  
  db = getFirestore(app, firebaseAppletConfig.firestoreDatabaseId || "(default)");
} catch (e) {
  console.warn("⚠️ Firebase failed to initialize on client:", e);
}

export { analytics, auth, db };

import { getApiUrl } from "./config/api";
export { getApiUrl };

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

      // If the URL is a relative API path, resolve it using getApiUrl
      if (urlStr.startsWith("/api/")) {
        const resolvedUrl = getApiUrl(urlStr);
        try {
          let response: Response;
          if (resolvedUrl !== urlStr) {
            if (typeof input === "string") {
              response = await originalFetch(resolvedUrl, init);
            } else if (input instanceof URL) {
              response = await originalFetch(new URL(resolvedUrl), init);
            } else {
              const newRequest = new Request(resolvedUrl, {
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
              response = await originalFetch(newRequest, init);
            }
          } else {
            response = await originalFetch(input, init);
          }

          if (!response.ok) {
            console.warn(`⚠️ API Error on ${resolvedUrl}: HTTP ${response.status} ${response.statusText}`);
          }
          return response;
        } catch (err: any) {
          const errorMsg = err?.message || String(err);
          let statusText = "Erreur Réseau (Network Error)";
          let cause = "Le serveur de l'API est injoignable, ou la requête a été bloquée par le navigateur (CORS/SSL/Incompatibilité).";
          let solution = "1. Vérifiez que votre connexion internet est active.\n2. Si vous êtes sur Vercel, assurez-vous que les variables d'environnement (comme FIREBASE_SERVICE_ACCOUNT) sont correctement configurées dans la console Vercel.\n3. Vérifiez les logs de la fonction serverless sur Vercel pour identifier un crash au démarrage.";
          
          if (resolvedUrl.includes("localhost") || resolvedUrl.includes("127.0.0.1")) {
            cause = "L'application tente de contacter un serveur local (localhost), mais aucun serveur ne tourne localement sur le port configuré.";
            solution = "Démarrez votre serveur local avec 'npm run dev', ou configurez la variable d'environnement VITE_API_URL dans votre déploiement de production pour pointer vers votre backend en ligne.";
          } else if (resolvedUrl.startsWith("https://ais-pre-")) {
            cause = "L'application tente de contacter l'environnement de prévisualisation temporaire d'AI Studio, mais celui-ci est actuellement arrêté ou inaccessible.";
            solution = "Si l'application est déployée en production (sur Vercel), elle devrait utiliser des routes relatives (/api/...) ou avoir une variable d'environnement VITE_API_URL configurée vers sa propre API de production.";
          }

          const detailedMessage = `🚨 Impossible de joindre l'API :
• URL appelée : ${resolvedUrl}
• Détail technique : ${errorMsg}
• Cause probable : ${cause}
• Solution proposée : ${solution}`;

          console.error(detailedMessage);
          throw new Error(detailedMessage);
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
