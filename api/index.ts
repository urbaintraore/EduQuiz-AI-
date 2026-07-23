import app from "../server";

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error("🚨 Vercel Express Execution Exception:", err?.stack || err);
    return res.status(500).json({
      error: "Erreur serveur lors de la gestion de la requête.",
      details: err?.message || String(err),
      stack: process.env.NODE_ENV !== "production" ? err?.stack : undefined
    });
  }
}


