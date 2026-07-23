let expressApp: any = null;
let initError: any = null;

try {
  // Safe require of bundled CJS server module
  // @ts-ignore
  const serverModule = require("../dist/server.cjs");
  expressApp = typeof serverModule === "function" 
    ? serverModule 
    : (serverModule?.default || serverModule);
} catch (err: any) {
  console.error("🚨 Fatal Error loading dist/server.cjs in Vercel Serverless Function:", err);
  initError = err;
}

export default function handler(req: any, res: any) {
  if (initError || !expressApp || typeof expressApp !== "function") {
    console.error("🚨 Vercel Handler Initialization Error:", initError);
    return res.status(500).json({
      error: "Une erreur critique de démarrage du serveur est survenue sur Vercel.",
      details: initError?.message || String(initError) || "Express app module could not be loaded properly.",
      stack: process.env.NODE_ENV !== "production" ? initError?.stack : undefined
    });
  }

  try {
    return expressApp(req, res);
  } catch (err: any) {
    console.error("🚨 Vercel Express Execution Exception:", err);
    return res.status(500).json({
      error: "Erreur serveur lors de la gestion de la requête.",
      details: err?.message || String(err),
      stack: process.env.NODE_ENV !== "production" ? err?.stack : undefined
    });
  }
}

