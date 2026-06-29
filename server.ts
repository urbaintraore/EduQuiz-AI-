/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
import multer from "multer";
import * as pdfParseModule from "pdf-parse";
import * as mammothModule from "mammoth";
import * as tesseractModule from "tesseract.js";

// Safe helper to extract callable function for CommonJS modules under ESM/CJS interop environments
function getCallable(mod: any) {
  if (!mod) return mod;
  if (typeof mod === "function") return mod;
  if (mod.default && typeof mod.default === "function") return mod.default;
  if (mod.default && mod.default.default && typeof mod.default.default === "function") return mod.default.default;
  return mod;
}

const pdfParse = getCallable(pdfParseModule);
const mammoth = getCallable(mammothModule);
const Tesseract = getCallable(tesseractModule);

dotenv.config();

const __filename = typeof window === "undefined" && typeof import.meta?.url === "string"
  ? fileURLToPath(import.meta.url)
  : "";

const __dirname = typeof window === "undefined" && __filename
  ? path.dirname(__filename)
  : "";

const app = express();
const PORT = 3000;

// Custom robust CORS middleware to allow external hosting (like Vercel) to reach the API on Cloud Run
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const upload = multer({ storage: multer.memoryStorage() });

// Use robust middleware for large files or raw documents
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

const DB_FILE = process.env.VERCEL 
  ? path.join("/tmp", "db.json") 
  : path.join(process.cwd(), "db.json");

// Lazy database initialization middleware
app.use(async (req, res, next) => {
  try {
    if (!dbMemory) {
      await initializeDatabaseState();
    }
  } catch (err) {
    console.error("Error during lazy database initialization:", err);
  }
  next();
});

// Define structure for our local database
interface DBStructure {
  users: any[];
  courses: any[];
  enrollments: { studentId: string; courseId: string; enrolledAt: string }[];
  exams: any[];
  questions: any[];
  submissions: any[];
  monitoringEvents: any[];
  monitoringReports: any[];
}

// Prepopulated clean data to make the app interactive out-of-the-box
const INITIAL_DB: DBStructure = {
  users: [
    {
      id: "usr_admin",
      role: "admin",
      email: "admin@eduquiz.fr",
      password: "password123",
      university: "Administration",
      schoolClass: ""
    },
    {
      id: "usr_teacher",
      role: "teacher",
      email: "enseignant@eduquiz.fr",
      password: "password123",
      university: "Université Sorbonne Nouvelle",
      schoolClass: ""
    },
    {
      id: "usr_student",
      role: "student",
      email: "etudiant@eduquiz.fr",
      password: "password123",
      university: "Université Sorbonne Nouvelle",
      schoolClass: "M1 Informatique - IA"
    }
  ],
  courses: [
    {
      id: "crs_ia",
      teacherId: "usr_teacher",
      title: "Algorithmique & Intelligence Artificielle 101",
      description: "Introduction aux concepts de base de l'informatique théorique et de la recherche IA.",
      code: "IA2026"
    }
  ],
  enrollments: [
    {
      studentId: "usr_student",
      courseId: "crs_ia",
      enrolledAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
    }
  ],
  exams: [
    {
      id: "exm_demo",
      courseId: "crs_ia",
      title: "Devoir Survélé sur l'IA et les Réseaux de Neurones",
      duration: 30,
      startDate: new Date(Date.now() + 3600000 * 24).toISOString(), // Tomorrow
      status: "published",
      subjectText: "Sujet sur les réseaux de neurones artificiels, le deep learning, l'architecture transformeur et la descente de gradient.",
      solutionText: "Directives de correction détaillées fournies par le professeur.",
      gradingScaleText: "Barème indicatif: QCM (2pts), Vrai/Faux (2pts), Appariement (3pts), Question ouverte (5pts)",
      createdAt: new Date().toISOString(),
      monitoringConfig: {
        active: true,
        requireCamera: false,
        periodicCaptures: false,
        detectNoFace: false,
        detectMultipleFaces: false,
        requireScreenShare: true,
        monitorWindowBlur: true,
        monitorTabChange: true,
        monitorFullscreenExit: true,
        preventCopyPaste: true,
        preventRightClick: true,
        preventShortcuts: true,
        requireMicrophone: false,
        detectAbnormalNoise: false,
        detectConversation: false,
        thresholdTabChanges: 3,
        thresholdFullscreenExits: 2,
        thresholdNoFaceTime: 30,
        alertScoreThreshold: 50
      }
    }
  ],
  questions: [
    {
      id: "q_1",
      examId: "exm_demo",
      type: "mcq",
      statement: "Quelle fonction d'activation est couramment utilisée pour introduire de la non-linéarité dans les réseaux multicouches en évitant la saturation rapide ?",
      options: ["Sigmoïde", "ReLU (Rectified Linear Unit)", "Tangente Hyperbolique", "Identité linéaire"],
      correctAnswer: "ReLU (Rectified Linear Unit)",
      points: 2,
      explanation: "ReLU retourne max(0, x), ce qui évite la saturation pour des entrées positives et accélère l'apprentissage en préservant le gradient."
    },
    {
      id: "q_2",
      examId: "exm_demo",
      type: "true_false",
      statement: "La rétropropagation du gradient (backpropagation) calcule les dérivées de la fonction de coût par rapport aux poids en partant de la couche d'entrée vers la couche de sortie.",
      correctAnswer: "false",
      points: 2,
      explanation: "Faux. Elle se fait dans le sens inverse : de la couche de sortie vers l'entrée (d'où le nom de rétropropagation)."
    },
    {
      id: "q_3",
      examId: "exm_demo",
      type: "matching",
      statement: "Associez chaque concept d'apprentissage profond à son rôle principal.",
      options: ["Descente de gradient", "Précision d'évaluation", "Architecture Transformer", "Fonction de perte"],
      matchingTargets: ["Optimisation des poids", "Mesure du taux de réussite", "Mécanisme d'attention", "Écart prédiction-réalité"],
      correctAnswer: "Optimisation des poids", // Standard correct string fallback, representation parsed live in client
      points: 3,
      explanation: "Descente de gradient -> Optimisation, Transformer -> Attention, Fonction de perte -> Écart."
    },
    {
      id: "q_4",
      examId: "exm_demo",
      type: "cloze",
      statement: "Le composant central des Transformers qui leur permet de traiter tous les mots d'une phrase en parallèle s'appelle le mécanisme d'{attention_visuelle|attention|auto-attention}.",
      correctAnswer: "attention",
      points: 3,
      explanation: "Le mécanisme d'attention (ou auto-attention) capture les dependances à longue distance de manière hautement parallélisable."
    },
    {
      id: "q_5",
      examId: "exm_demo",
      type: "numerical",
      statement: "Si une couche d'entrée a 3 neurones et que la couche suivante (complètement connectée) en contient 4, combien de biais individuels (bias) possèdera au total cette seconde couche ?",
      correctAnswer: "4",
      points: 2,
      explanation: "Chaque neurone de la couche de destination possède exactement un biais independant, donc 4 biais."
    },
    {
      id: "q_6",
      examId: "exm_demo",
      type: "essay",
      statement: "Expliquez l'intérêt majeur de l'algorithme d'optimisation de descente de gradient stochastique (SGD) par rapport à la descente de gradient classique (Batch Gradient Descent) sur d'immenses volumes de données.",
      correctAnswer: "Le SGD calcule le gradient sur un seul échantillon ou mini-lot à la fois, évitant ainsi de charger des millions d'entrées en mémoire à chaque pas.",
      points: 6,
      explanation: "Le SGD évite la saturation mémoire et propose une convergence souvent plus rapide grâce au bruit intrinsèque du mini-lot."
    }
  ],
  submissions: [
    {
      id: "sub_demo_1",
      studentId: "usr_student",
      examId: "exm_demo",
      answers: {
        "q_1": "ReLU (Rectified Linear Unit)",
        "q_2": "false",
        "q_3": JSON.stringify({
          "Descente de gradient": "Optimisation des poids",
          "Précision d'évaluation": "Mesure du taux de réussite",
          "Architecture Transformer": "Mécanisme d'attention",
          "Fonction de perte": "Écart prédiction-réalité"
        }),
        "q_4": "attention",
        "q_5": "4",
        "q_6": "SGD permet de faire des mises à jour des poids beaucoup plus fréquemment sans avoir à stocker tout le dataset lourd. C'est idéal pour le Big Data car cela requiert beaucoup moins de mémoire vive."
      },
      score: 18, // Total scored for display (simulation graded)
      submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      gradedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
      essayFeedbacks: {
        "q_6": { score: 6, comment: "Excellente réponse claire et précise." }
      }
    }
  ],
  monitoringEvents: [],
  monitoringReports: []
};

// Initialize Firebase Admin securely from config file or environment
let dbFirestore: Firestore | null = null;
try {
  let appInitialized = false;
  let useSandbox = false;

  const isSandboxContainer = !process.env.FIREBASE_SERVICE_ACCOUNT && 
                             (process.env.GOOGLE_CLOUD_PROJECT === "yodeling-magpie-607pf" || 
                              (process.env.K_SERVICE && !process.env.VERCEL));
  
  if (isSandboxContainer) {
    useSandbox = true;
  }

  // If already initialized (warm start), we are set
  if (getApps().length > 0) {
    appInitialized = true;
  }
  
  // If running on Vercel and no Service Account is provided, bypass Firestore initialization completely to prevent network timeouts/hangs
  const isVercelWithoutCredentials = !!(process.env.VERCEL && !process.env.FIREBASE_SERVICE_ACCOUNT);
  if (isVercelWithoutCredentials) {
    console.warn("⚠️ Running on Vercel without FIREBASE_SERVICE_ACCOUNT. Disabling Firestore to prevent connection timeouts.");
    appInitialized = false;
  } else {
    // 1. First try FIREBASE_SERVICE_ACCOUNT base64 from environment
    if (!appInitialized && process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountStr.trim().startsWith('{')) {
          serviceAccountStr = Buffer.from(serviceAccountStr, 'base64').toString('utf8');
        }
        const serviceAccount = JSON.parse(serviceAccountStr);
        if (getApps().length === 0) {
          initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id
          });
          appInitialized = true;
          console.log("🔥 Firebase Admin initialized via Service Account for project:", serviceAccount.project_id);
        }
      } catch (e) {
        console.error("⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT as JSON, falling back:", e);
      }
    } 
    
    // 2. Next try our AI Studio provisioned config file
    if (!appInitialized) {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      let projectId = "eduquiz-632c5"; // Default to user's project

      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
          if (useSandbox) {
            projectId = "yodeling-magpie-607pf";
            console.log("🛠️ AI Studio sandbox container detected. Using sandboxed project ID: yodeling-magpie-607pf");
          } else if (config.projectId) {
            projectId = config.projectId;
            console.log("🌐 External/Vercel environment. Using project ID from config:", projectId);
          }
        } catch (e) {
          console.error("❌ Failed to parse config file:", e);
        }
      }
      
      try {
        if (getApps().length === 0) {
          initializeApp({
            projectId: projectId
          });
        }
        appInitialized = true;
        console.log("🔥 Firebase Admin initialized successfully for project:", projectId);
      } catch (e) {
        console.error("❌ Failed to initialize Firebase Admin:", e);
      }
    }
  }

  // Set up firestore if app was initialized
  if (appInitialized) {
    let dbId = "(default)"; // Default to user's database ID
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
          if (useSandbox) {
            dbId = "ai-studio-eduquizai-495bc204-9e63-4640-903e-b91ff9e217ca";
          } else if (config.firestoreDatabaseId) {
            dbId = config.firestoreDatabaseId;
          }
        } catch (_) {}
    }
    dbFirestore = getFirestore(getApp(), dbId);
    console.log("🔥 Firestore initialized using Database ID:", dbId);
  } else {
    console.warn("⚠️ Warning: No Firebase credentials found. Falling back to local db.json storage.");
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error);
}

let dbMemory: DBStructure | null = null;

// Warm up DB state on startup from Firestore or local fallback
async function initializeDatabaseState() {
  if (dbFirestore) {
    try {
      console.log("📥 Syncing database with Firestore (parallel format)...");
      const collRef = dbFirestore.collection("eduquiz_state");
      const keys: (keyof DBStructure)[] = [
        "users",
        "courses",
        "enrollments",
        "exams",
        "questions",
        "submissions",
        "monitoringEvents",
        "monitoringReports"
      ];
      
      const loadedData: Partial<DBStructure> = {};
      let hasData = false;

      // Wrap the entire sync and seed logic in a 2500ms timeout
      const syncTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: Firestore operation exceeded 2500ms")), 2500)
      );

      const syncAndSeedPromise = (async () => {
        // Load all keys in parallel
        await Promise.all(
          keys.map(async (key) => {
            const docSnap = await collRef.doc(key).get();
            if (docSnap.exists) {
              loadedData[key] = docSnap.data()?.data || [];
              hasData = true;
            } else {
              loadedData[key] = INITIAL_DB[key];
            }
          })
        );

        if (hasData) {
          dbMemory = loadedData as DBStructure;
          try {
            fs.writeFileSync(DB_FILE, JSON.stringify(dbMemory, null, 2), "utf8");
          } catch (_) {}
          console.log("✅ Synced successfully from Firestore in parallel! Database cache established.");
        } else {
          console.log("🆕 Firestore is empty. Seeding initial mockup database in parallel...");
          dbMemory = { ...INITIAL_DB };
          
          await Promise.all(
            keys.map(key => collRef.doc(key).set({ data: INITIAL_DB[key] }))
          );
          
          try {
            fs.writeFileSync(DB_FILE, JSON.stringify(dbMemory, null, 2), "utf8");
          } catch (_) {}
          console.log("✅ Firestore database successfully seeded in parallel.");
        }
      })();

      await Promise.race([syncAndSeedPromise, syncTimeout]);
      return;
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes("PERMISSION_DENIED") || msg.includes("permission-denied") || msg.includes("unauthenticated") || msg.includes("credential") || msg.includes("Timeout")) {
        console.warn("⚠️ Firestore access permission denied or timed out during startup. Disabling cloud sync, falling back to local storage.");
      } else {
        console.error("❌ Firestore read/write error during startup, falling back to local storage:", e);
      }
      dbFirestore = null;
    }
  }

  // Local fallback
  try {
    if (!fs.existsSync(DB_FILE)) {
      const rootDbPath = path.join(process.cwd(), "db.json");
      if (fs.existsSync(rootDbPath)) {
        try {
          fs.copyFileSync(rootDbPath, DB_FILE);
          console.log("📝 Seeded /tmp/db.json from project root db.json");
        } catch (copyErr) {
          console.error("Failed to copy db.json to /tmp:", copyErr);
        }
      }
    }

    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), "utf8");
      dbMemory = { ...INITIAL_DB };
    } else {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      dbMemory = JSON.parse(raw);
    }
    console.log("💾 Database cache established from local file storage.");
  } catch (err) {
    console.error("Critical error building database cache:", err);
    dbMemory = { ...INITIAL_DB };
  }
}

// Database utility functions
function getDB(): DBStructure {
  if (dbMemory) {
    return dbMemory;
  }
  try {
    if (!fs.existsSync(DB_FILE)) {
      const rootDbPath = path.join(process.cwd(), "db.json");
      if (fs.existsSync(rootDbPath)) {
        try {
          fs.copyFileSync(rootDbPath, DB_FILE);
        } catch (_) {}
      }
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), "utf8");
      dbMemory = { ...INITIAL_DB };
      return INITIAL_DB;
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    dbMemory = JSON.parse(raw);
    return dbMemory!;
  } catch (err) {
    console.error("Error reading db.json, returning initial mockup state:", err);
    return INITIAL_DB;
  }
}

// Background sync writer function
function saveDB(db: DBStructure) {
  dbMemory = db;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("Could not write to database file:", err);
  }

  // Background async dump to Firestore
  if (dbFirestore) {
    const collRef = dbFirestore.collection("eduquiz_state");
    const keys: (keyof DBStructure)[] = [
      "users",
      "courses",
      "enrollments",
      "exams",
      "questions",
      "submissions",
      "monitoringEvents",
      "monitoringReports"
    ];

    Promise.all(
      keys.map(key => 
        collRef.doc(key).set({ data: db[key] || [] })
          .catch(err => {
            const msg = err?.message || String(err);
            if (msg.includes("PERMISSION_DENIED") || msg.includes("permission-denied") || msg.includes("unauthenticated")) {
              console.warn(`⚠️ Firestore sync permission denied for key '${key}'. Disabling background Firestore sync to prevent console spam.`);
              dbFirestore = null;
            } else {
              console.error(`Failed to sync table '${key}' to Firestore:`, err);
            }
          })
      )
    ).catch(err => {
      console.error("Failed background sync to Firestore:", err);
    });
  }
}

// Lazy initialize Gemini clients safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("⚠️ Warning: No valid GEMINI_API_KEY provided inside secrets. Generative features will operate using state-of-the-art simulations.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Lazy helper to send teacher email notification on new essay submissions
async function sendTeacherNotificationEmail(teacherEmail: string, studentEmail: string, examTitle: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.mailtrap.io",
      port: parseInt(process.env.SMTP_PORT || "2525"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "mock_user",
        pass: process.env.SMTP_PASS || "mock_pass",
      },
    });

    const mailOptions = {
      from: '"EduQuiz AI Notification" <noreply@eduquiz.fr>',
      to: teacherEmail,
      subject: `🚨 Nouvelle copie à corriger : ${studentEmail}`,
      text: `Bonjour, \n\nL'étudiant ${studentEmail} vient de soumettre sa copie pour l'examen "${examTitle}".\n\nCet examen contient des compositions d'expression libre (type rédactionnel) requérant une correction manuelle pour calculer la note finale.\n\nRendez-vous sur votre espace professeur pour attribuer la note et feedback.\n\nCordialement,\nL'équipe EduQuiz AI.`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          <div style="background-color: #4f46e5; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Copie Soumise En Attente de Correction</h2>
          </div>
          <div style="padding: 20px 10px;">
            <p>Bonjour,</p>
            <p>Nous vous informons que l'étudiant <strong>${studentEmail}</strong> a terminé sa composition pour l'examen de synthèse :</p>
            <blockquote style="margin: 15px 0; padding: 10px 15px; border-left: 4px solid #4f46e5; background-color: #f8fafc; font-weight: bold; color: #4f46e5;">
              ${examTitle}
            </blockquote>
            <p>Puisque cette évaluation comprend des **rédactions de composition d'expression libre (Essays)**, elle nécessite une notation manuelle de votre part pour calculer le score d'examen global.</p>
            <p style="margin-top: 25px; text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Accéder au Tableau de Bord Enseignant
              </a>
            </p>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">Notification automatisée émise par le service d'examens EduQuiz AI.</p>
        </div>
      `,
    };

    console.log(`[SMTP EMAIL] Notification dispatch: ${studentEmail} -> ${teacherEmail} on "${examTitle}"`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP EMAIL] Sent! MessageId: ${info.messageId}`);
    return true;
  } catch (err) {
    console.warn(`[SMTP EMAIL WARNING] Could not transmit actual email notification via SMTP (Console fallback: ${studentEmail} submitted essay exam "${examTitle}" for ${teacherEmail}):`, err);
    return false;
  }
}

// Helper to extract embedded JPEG images from web/physical stream scans in a raw PDF buffer
function extractJpegsFromPdf(pdfBuffer: Buffer): Buffer[] {
  const images: Buffer[] = [];
  let pos = 0;
  
  while (pos < pdfBuffer.length) {
    // Look for JPEG Start of Image (SOI) marker (0xFFD8)
    const startIdx = pdfBuffer.indexOf(Buffer.from([0xFF, 0xD8]), pos);
    if (startIdx === -1) break;
    
    // Look for JPEG End of Image (EOI) marker (0xFFD9)
    const endIdx = pdfBuffer.indexOf(Buffer.from([0xFF, 0xD9]), startIdx);
    if (endIdx === -1) {
      pos = startIdx + 2;
      continue;
    }
    
    // Grab the JPEG stream subarray
    const jpegBuffer = pdfBuffer.subarray(startIdx, endIdx + 2);
    // Ignore small icons or noise metadata elements under 8KB
    if (jpegBuffer.length > 8192) {
      images.push(jpegBuffer);
    }
    pos = endIdx + 2;
    
    // Restrict to maximum 4 pages of OCR to prevent container memory hogging or timeouts
    if (images.length >= 4) break;
  }
  
  return images;
}

// --- FILE EXTRACTION API ---
app.post("/api/extract-text", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });

  try {
    const { mimetype, buffer, originalname } = req.file;
    const extension = originalname ? path.extname(originalname).toLowerCase() : "";
    let text = "";
    const ai = getGeminiClient();

    const isPDF = mimetype === "application/pdf" || extension === ".pdf";
    const isWord = mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                   mimetype === "application/msword" ||
                   extension === ".docx" ||
                   extension === ".doc";
    const isImage = mimetype.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"].includes(extension);
    const isText = mimetype.startsWith("text/") || [".txt", ".md", ".csv", ".json"].includes(extension);

    if (isPDF) {
      let rawText = "";
      let localParseSuccess = false;
      let ocrSucceededLocal = false;

      // 1. Try to parse PDF locally with pdf-parse first
      try {
        console.log("[Extraction PDF] Essai d'extraction locale avec pdf-parse...");
        const data = await pdfParse(buffer);
        rawText = data?.text || "";
        if (rawText.trim().length > 150) {
          localParseSuccess = true;
          console.log("[Extraction PDF] Succès de la lecture de couche texte locale.");
        }
      } catch (err) {
        console.error("[Extraction PDF] Échec du parseur local pdf-parse:", err);
      }

      // 2. Fallback to extracting embedded JPEGs and running Tesseract local OCR if little text found
      if (!localParseSuccess) {
        try {
          console.log("[Extraction PDF] Analyse profonde de flux d'images pour PDF scanné...");
          const extractedJpegs = extractJpegsFromPdf(buffer);
          if (extractedJpegs.length > 0) {
            console.log(`[Extraction PDF] Trouvé ${extractedJpegs.length} page(s) imageée(s) dans le PDF scanné. Traitement local Tesseract...`);
            let accumulatedOcr = "";
            for (let i = 0; i < extractedJpegs.length; i++) {
              console.log(`[Extraction PDF - Tesseract] OCR en cours sur page ${i + 1}/${extractedJpegs.length}...`);
              const ocrResult = await Tesseract.recognize(extractedJpegs[i], "fra");
              const recognizedText = ocrResult?.data?.text || "";
              if (recognizedText.trim().length > 0) {
                accumulatedOcr += `\n--- PAGE ${i + 1} (OCR local via Tesseract) ---\n${recognizedText}\n`;
              }
            }
            if (accumulatedOcr.trim().length > 50) {
              rawText = accumulatedOcr;
              localParseSuccess = true;
              ocrSucceededLocal = true;
              console.log("[Extraction PDF] OCR local Tesseract terminé de manière satisfaisante !");
            }
          }
        } catch (ocrErr) {
          console.error("[Extraction PDF] Échec lors de l'OCR Tesseract local:", ocrErr);
        }
      }

      // 3. Coordinate formatted output through Gemini AI or local raw text
      if (ai) {
        if (localParseSuccess && rawText.trim().length > 150) {
          try {
            console.log("[Extraction PDF] Formatage esthétique académique et équations LaTeX par Gemini.");
            const response = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: `Vous êtes un transcripteur professionnel spécialisé dans les sujets d'examens mathématiques et scientifiques durs (Mathématiques, Physique, Chimie, etc.). Votre rôle est de nettoyer ce texte extrait d'un fichier PDF. Restituez TOUTES les formules mathématiques, symboles, fractions, intégrales, dérivées de manière standardisée LaTeX délimitée par des $...$ pour les lignes et $$...$$ pour les gros morceaux indépendants. Conservez rigoureusement toute la structure d'origine et les questions. Ne résumez pas, ne commentez pas.\n\nContenu brut extrait :\n${rawText}`
            });
            text = response.text || rawText;
          } catch (err) {
            console.error("[Extraction PDF] Échec du formatage IA par Gemini, utilisation du texte brut:", err);
            text = rawText + "\n\n(Note: L'amélioration mathématique par l'IA a échoué. Le texte brut extrait localement a été conservé.)";
          }
        } else {
          // Absolute Vision fallback (Sends PDF binary directly)
          try {
            console.log("[Extraction PDF] Option Vision Active. Envoi binaire PDF direct à Gemini.");
            const response = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: "Vous êtes un assistant IA expert en OCR de documents académiques par vision. Ce document PDF est constitué de pages ou d'images scannées contenant des formules mathématiques, des notations physiques ou chimiques et des tableaux complexes. Veuillez exécuter un processus d'OCR par vision assistée pour extraire tout le texte d'origine. Restituez rigoureusement toutes les expressions scientifiques et mathématiques en formule LaTeX délimitées par $ pour la notation en ligne, et par $$ pour les formules indépendantes centrées. Reconstruisez aussi fidèlement les tableaux complexes au format de tableau Markdown. Ne faites aucun commentaire supplémentaire, donnez uniquement la transcription brute authentique." },
                    { inlineData: { data: buffer.toString("base64"), mimeType: "application/pdf" } }
                  ]
                }
              ]
            });
            text = response.text || "";
          } catch (err) {
            console.error("[Extraction PDF] Échec de l'OCR direct par l'IA:", err);
            text = (rawText || "") + "\n\n🚨 Impossible d'extraire le texte de ce document PDF scanné par l'IA.\n💡 Conseil : Si le fichier provient d'un scanner ou de photos de mauvaise qualité, essayez plutôt de le convertir au format image (PNG/JPEG) avant de l'uploader, ou assurez-vous que votre clé GEMINI_API_KEY est valide.";
          }
        }
      } else {
        // No AI available
        console.log("[Extraction PDF] Aucun service IA Gemini configuré. Restitution brute.");
        text = rawText;
        if (!text || text.trim().length === 0) {
          text = "Aucun texte n'a pu être extrait avec le parseur local d'un document qui semble être scanné ou composé d'images.\n\n💡 RECOMMANDATION : Ce PDF semble être une image scannée sans couche de texte. Pour extraire l'intégralité des expressions mathématiques et des images scannées de façon ultra-précise via vision artificielle, veuillez configurer votre 'GEMINI_API_KEY' dans les secrets de l'application.";
        } else {
          if (ocrSucceededLocal) {
            text += "\n\n💡 RECOMMANDATION : Le contenu ci-dessus est issu de l'OCR local de vos pages scannées. Pour une conversion haut de gamme et re-génération automatique de l'ensemble d'un sujet d'examen en LaTeX de qualité supérieure, connectez votre clé client 'GEMINI_API_KEY'.";
          } else {
            text += "\n\n💡 ASTUCE : Pour une précision d'extraction de formules mathématiques et mise en forme LaTeX haut de gamme, configurez votre clé 'GEMINI_API_KEY' dans les secrets de l'application.";
          }
        }
      }
    } else if (isWord) {
      // Extraction Word robuste: mammoth extrait le texte brut d'abord, puis Gemini recrée le LaTeX universitaire
      let rawText = "";
      try {
        console.log("[Extraction Word] Mammoth extrait le texte brut ou docx.");
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value || "";
      } catch (err) {
        console.error("Mammoth local extraction error:", err);
      }

      if (ai && rawText.trim().length > 0) {
        try {
          console.log("[Extraction Word] Traitement du texte extrait par Gemini pour corriger et formater LaTeX.");
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: `Vous êtes un expert en formatage académique de sujets d'examens et d'équations mathématiques. Votre rôle est de nettoyer ce texte extrait d'un fichier Word (.docx). Restituez toutes les formules mathématiques, les symboles scientifiques et les équations complexes sous forme standardisée LaTeX délimitée par des $...$ pour les lignes et $$...$$ pour les morceaux d'équations indépendants. Conservez la structure complète de l'énoncé original, des consignes et des questions sans commentaires ni politesse.\n\nContenu brut extrait :\n${rawText}`
          });
          text = response.text || rawText;
        } catch (err) {
          console.error("Gemini failed to format Word text, using raw mammoth text:", err);
          text = rawText + "\n\n(Note: Une erreur est survenue lors du formatage IA. Seul le texte Word brut local est disponible.)";
        }
      } else {
        console.log("[Extraction Word] Pas d'IA ou texte brut vide. Utilisation du texte mammoth brut.");
        text = rawText;
        if (!text || text.trim().length === 0) {
          text = "Le document Word local n'a pas pu être extrait.\n\n💡 RECOMMANDATION : Veuillez configurer une clé 'GEMINI_API_KEY' pour un support de transcription haute précision de vos fichiers DOCX.";
        } else {
          text += "\n\n💡 ASTUCE : Pour un rendu et une correction parfaite de vos équations mathématiques complexes en LaTeX à partir du document Word, configurez votre clé 'GEMINI_API_KEY' dans les secrets.";
        }
      }
    } else if (isImage) {
      if (ai) {
        console.log("[Extraction Image] Utilisation de l'IA pour l'OCR mathématique.");
        const determinedMime = mimetype.startsWith("image/") ? mimetype : "image/jpeg";
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  { text: "Vous êtes un expert en OCR de documents mathématiques, d'images d'exercices scientifiques et de formules complexes. Extrayez l'intégralité du texte et des équations de cette image. Restituez les notations mathématiques de manière parfaitement ordonnée en utilisant la notation d'équation standard LaTeX entourée de $...$ pour le texte ou $$...$$ pour les blocs autonomes. Ne faites aucun commentaire, donnez uniquement la transcription brute du sujet d'examen." },
                  { inlineData: { data: buffer.toString("base64"), mimeType: determinedMime } }
                ]
              }
            ]
        });
        text = response.text || "";
      } else {
        console.log("[Extraction Image] Pas d'IA détectée. Utilisation du moteur d'OCR local Tesseract.js...");
        try {
          const tesseractResult = await Tesseract.recognize(buffer, "fra");
          text = tesseractResult.data.text || "";
          if (text.trim().length > 0) {
            text += "\n\n(Note: Texte extrait par le moteur d'OCR local hors-ligne Tesseract.js. Configurez votre clé GEMINI_API_KEY dans les secrets pour traduire les notations complexes en syntaxe LaTeX d'examen.)";
          } else {
            text = "Aucun texte n'a pu être extrait de l'image par OCR local avec Tesseract.js.";
          }
        } catch (ocrErr: any) {
          console.error("[OCR Tesseract.js Error]:", ocrErr);
          text = "🚨 Échec du moteur OCR Tesseract.js local : " + (ocrErr.message || String(ocrErr));
        }
      }
    } else if (isText) {
       text = buffer.toString("utf-8");
    } else {
      return res.status(400).json({ error: "Format de fichier non supporté." });
    }

    res.json({ text });
  } catch (error) {
    console.error("Erreur d'extraction de texte:", error);
    res.status(500).json({ error: "Échec de l'extraction de texte." });
  }
});

// --- API AUTH ENDPOINTS ---

app.post("/api/auth/register", (req, res) => {
  const { email, password, role, university, schoolClass, firebaseUid } = req.body;
  
  if (!email || !role) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  const db = getDB();
  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    if (firebaseUid) {
        // If already exists locally but registering via firebase, just return the user
        const { password: _, ...userSafe } = existing;
        return res.status(200).json(userSafe);
    }
    return res.status(400).json({ error: "Cet email est déjà enregistré." });
  }

  if (role === 'student' && !schoolClass) {
    return res.status(400).json({ error: "La classe/promotion est obligatoire pour les étudiants." });
  }

  const newUser = {
    id: firebaseUid || ("usr_" + Math.random().toString(36).substring(2, 11)),
    email: email.toLowerCase(),
    password: password || "",
    role,
    university: university || "Université d'études",
    schoolClass: role === 'student' ? schoolClass : ""
  };

  db.users.push(newUser);
  saveDB(db);

  // Return user omitting password
  const { password: _, ...userSafe } = newUser;
  res.status(201).json(userSafe);
});

app.post("/api/auth/login", (req, res) => {
  const { email, password, firebaseUid } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Veuillez fournir l'email." });
  }

  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ error: "Aucun compte trouvé avec cet email localement." });
  }

  // If client provides firebaseUid, it implies they successfully authenticated on firebase client SDK
  if (firebaseUid) {
    if (user.id !== firebaseUid) {
      // Just in case we need to update the id to match firebase
      user.id = firebaseUid;
      saveDB(db);
    }
    const { password: _, ...userSafe } = user;
    return res.json(userSafe);
  }

  // Fallback to local password check (for demo accounts)
  if (user.password !== password) {
    return res.status(401).json({ error: "Identifiants de connexion invalides." });
  }

  const { password: _, ...userSafe } = user;
  res.json(userSafe);
});

// --- API COURSES ENDPOINTS ---

app.get("/api/courses", (req, res) => {
  const { teacherId } = req.query;
  const db = getDB();

  let courses = db.courses;
  if (teacherId) {
    courses = courses.filter(c => c.teacherId === teacherId);
  }

  // Map courses adding teacher info
  const enriched = courses.map(course => {
    const teacher = db.users.find(u => u.id === course.teacherId);
    return {
      ...course,
      teacherName: teacher ? teacher.email : "Enseignant Inconnu"
    };
  });

  res.json(enriched);
});

app.post("/api/courses", (req, res) => {
  const { teacherId, title, description, category } = req.body;
  if (!teacherId || !title) {
    return res.status(400).json({ error: "Le titre et l'ID de l'enseignant sont requis." });
  }

  const db = getDB();
  // Generate simple 6-char course code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const newCourse = {
    id: "crs_" + Math.random().toString(36).substring(2, 11),
    teacherId,
    title,
    description: description || "",
    category: category || "",
    code
  };

  db.courses.push(newCourse);
  saveDB(db);

  res.status(201).json(newCourse);
});

app.put("/api/courses/:id", (req, res) => {
  const { id } = req.params;
  const { title, description, category } = req.body;
  const db = getDB();
  const cIndex = db.courses.findIndex(c => c.id === id);
  if (cIndex === -1) {
    return res.status(404).json({ error: "Cours non trouvé." });
  }

  db.courses[cIndex] = {
    ...db.courses[cIndex],
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(category !== undefined && { category })
  };

  saveDB(db);
  res.json(db.courses[cIndex]);
});

app.post("/api/courses/join", (req, res) => {
  const { studentId, code } = req.body;
  if (!studentId || !code) {
    return res.status(400).json({ error: "L'ID étudiant et le code de cours sont requis." });
  }

  const db = getDB();
  const targetCourse = db.courses.find(c => c.code.trim().toUpperCase() === code.trim().toUpperCase());
  if (!targetCourse) {
    return res.status(404).json({ error: "Aucun cours trouvé avec ce code." });
  }

  const alreadyJoined = db.enrollments.some(e => e.studentId === studentId && e.courseId === targetCourse.id);
  if (alreadyJoined) {
    return res.status(400).json({ error: "Vous êtes déjà inscrit à ce cours." });
  }

  db.enrollments.push({
    studentId,
    courseId: targetCourse.id,
    enrolledAt: new Date().toISOString()
  });

  saveDB(db);
  res.json({ message: "Inscription réussie !", course: targetCourse });
});

// Get enrolled courses for student
app.get("/api/courses/student/:studentId", (req, res) => {
  const { studentId } = req.params;
  const db = getDB();

  const activeEnrolledIds = db.enrollments
    .filter(e => e.studentId === studentId)
    .map(e => e.courseId);

  const matched = db.courses.filter(c => activeEnrolledIds.includes(c.id));
  const enriched = matched.map(course => {
    const teacher = db.users.find(u => u.id === course.teacherId);
    return {
      ...course,
      teacherName: teacher ? teacher.email : "Enseignant Inconnu"
    };
  });

  res.json(enriched);
});

// --- API EXAMS ENDPOINTS ---

app.get("/api/courses/:courseId/exams", (req, res) => {
  const { courseId } = req.params;
  const db = getDB();

  const exams = db.exams.filter(e => e.courseId === courseId);
  res.json(exams);
});

app.post("/api/courses/:courseId/exams", (req, res) => {
  const { courseId } = req.params;
  const { title, duration, startDate, subjectText, solutionText, gradingScaleText, monitoringConfig } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Veuillez donner un titre à l'examen." });
  }

  const db = getDB();
  const newExam = {
    id: "exm_" + Math.random().toString(36).substring(2, 11),
    courseId,
    title,
    duration: parseInt(duration) || 60,
    startDate: startDate || new Date().toISOString(),
    status: "draft",
    subjectText: subjectText || "",
    solutionText: solutionText || "",
    gradingScaleText: gradingScaleText || "Sur 20 points",
    monitoringConfig,
    createdAt: new Date().toISOString()
  };

  db.exams.push(newExam);
  saveDB(db);

  res.status(201).json(newExam);
});

app.get("/api/exams/:id", (req, res) => {
  const { id } = req.params;
  const db = getDB();

  const exam = db.exams.find(e => e.id === id);
  if (!exam) return res.status(404).json({ error: "Examen introuvable." });

  // Enrich with course and stats
  const course = db.courses.find(c => c.id === exam.courseId);
  const questions = db.questions.filter(q => q.examId === id);
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  res.json({
    ...exam,
    courseTitle: course ? course.title : "Cours",
    questionCount: questions.length,
    totalPoints
  });
});

app.put("/api/exams/:id", (req, res) => {
  const { id } = req.params;
  const { title, duration, startDate, status, subjectText, solutionText, gradingScaleText, monitoringConfig } = req.body;

  const db = getDB();
  const index = db.exams.findIndex(e => e.id === id);
  if (index === -1) return res.status(404).json({ error: "Examen introuvable." });

  const existing = db.exams[index];
  db.exams[index] = {
    ...existing,
    title: title !== undefined ? title : existing.title,
    duration: duration !== undefined ? parseInt(duration) : existing.duration,
    startDate: startDate !== undefined ? startDate : existing.startDate,
    status: status !== undefined ? status : existing.status,
    subjectText: subjectText !== undefined ? subjectText : existing.subjectText,
    solutionText: solutionText !== undefined ? solutionText : existing.solutionText,
    gradingScaleText: gradingScaleText !== undefined ? gradingScaleText : existing.gradingScaleText,
    monitoringConfig: monitoringConfig !== undefined ? monitoringConfig : existing.monitoringConfig,
  };

  saveDB(db);
  res.json(db.exams[index]);
});

app.delete("/api/exams/:id", (req, res) => {
  const { id } = req.params;
  const db = getDB();

  db.exams = db.exams.filter(e => e.id !== id);
  db.questions = db.questions.filter(q => q.examId !== id);
  db.submissions = db.submissions.filter(s => s.examId !== id);

  saveDB(db);
  res.json({ message: "Examen supprimé définitivement." });
});

// --- QUESTIONS ENDPOINTS ---

app.get("/api/exams/:examId/questions", (req, res) => {
  const { examId } = req.params;
  const db = getDB();

  const questions = db.questions.filter(q => q.examId === examId);
  res.json(questions);
});

app.post("/api/exams/:examId/questions", (req, res) => {
  const { examId } = req.params;
  const { type, statement, options, matchingTargets, correctAnswer, points, explanation, difficulty } = req.body;

  if (!type || !statement) {
    return res.status(400).json({ error: "Le type et l'énoncé sont requis." });
  }

  const db = getDB();
  const newQuestion = {
    id: "q_" + Math.random().toString(36).substring(2, 11),
    examId,
    type,
    statement,
    options: options || [],
    matchingTargets: matchingTargets || [],
    correctAnswer: correctAnswer || "",
    points: parseFloat(points) || 1,
    explanation: explanation || "",
    difficulty: difficulty || "Medium"
  };

  db.questions.push(newQuestion);
  saveDB(db);

  res.status(201).json(newQuestion);
});

app.put("/api/questions/:id", (req, res) => {
  const { id } = req.params;
  const { statement, options, matchingTargets, correctAnswer, points, explanation, type, difficulty } = req.body;

  const db = getDB();
  const idx = db.questions.findIndex(q => q.id === id);
  if (idx === -1) return res.status(404).json({ error: "Question introuvable." });

  const existing = db.questions[idx];
  db.questions[idx] = {
    ...existing,
    type: type !== undefined ? type : existing.type,
    statement: statement !== undefined ? statement : existing.statement,
    options: options !== undefined ? options : existing.options,
    matchingTargets: matchingTargets !== undefined ? matchingTargets : existing.matchingTargets,
    correctAnswer: correctAnswer !== undefined ? correctAnswer : existing.correctAnswer,
    points: points !== undefined ? parseFloat(points) : existing.points,
    explanation: explanation !== undefined ? explanation : existing.explanation,
    difficulty: difficulty !== undefined ? difficulty : existing.difficulty,
  };

  saveDB(db);
  res.json(db.questions[idx]);
});

app.delete("/api/questions/:id", (req, res) => {
  const { id } = req.params;
  const db = getDB();

  db.questions = db.questions.filter(q => q.id !== id);
  saveDB(db);
  res.json({ message: "Question supprimée avec succès." });
});

// --- CORE AI MODULE: AUTOMATIC QUIZ GENERATION VIA GEMINI ---

app.post("/api/exams/:examId/generate", async (req, res) => {
  const { examId } = req.params;
  const db = getDB();

  const exam = db.exams.find(e => e.id === examId);
  if (!exam) return res.status(404).json({ error: "Examen introuvable." });

  const subject = exam.subjectText || "";
  const solutions = exam.solutionText || "";
  const gradingScale = exam.gradingScaleText || "";

  if (!subject) {
    return res.status(400).json({ error: "Le sujet de l'examen est nécessaire afin de générer des questions intelligentes." });
  }

  const aiClient = getGeminiClient();

  if (!aiClient) {
    // Premium Simulated Fallback Output when API Key isn't configured
    console.log("No API key available. Running high-fidelity offline backup generator...");
    const mockedGenerated = [
      {
        id: "gen_1",
        examId,
        type: "mcq",
        statement: `[Simulé par l'IA] Selon le sujet fourni, quel est le pilier d'analyse central développé dans ce cours ?`,
        options: ["Concept Principal A", "Alternative B", "Méthodologie C", "Synthèse D"],
        correctAnswer: "Concept Principal A",
        points: 2,
        explanation: "Explication extraite du corrigé simulé: Le concept principal A structure l'ensemble de la démonstration algorithmique."
      },
      {
        id: "gen_2",
        examId,
        type: "true_false",
        statement: `[Simulé par l'IA] L'affirmation principale mentionnée dans le sujet est valide en toutes circonstances.`,
        correctAnswer: "false",
        points: 2,
        explanation: "Faux car la méthodologie possède d'importantes limites aux extrêmes mentionnés dans la section barème."
      },
      {
        id: "gen_3",
        examId,
        type: "matching",
        statement: `[Simulé par l'IA] Associez chaque terme analytique à sa définition correspondante issue du corrigé.`,
        options: ["Terme Alpha", "Indicateur Bêta", "Variable Gamma"],
        matchingTargets: ["Définition Alpha", "Définition Bêta", "Définition Gamma"],
        correctAnswer: "Définition Alpha",
        points: 3,
        explanation: "Associez chaque élément avec sa définition correspondante selon le plan d'étude."
      },
      {
        id: "gen_4",
        examId,
        type: "short_answer",
        statement: `[Simulé par l'IA] Quel terme technique désigne le processus de mise à jour évoqué dans la première partie du corrigé ?`,
        correctAnswer: "optimisation",
        points: 3,
        explanation: "Le terme 'optimisation' est explicitement recherché pour l'autocomplétion."
      },
      {
        id: "gen_5",
        examId,
        type: "cloze",
        statement: `[Simulé par l'IA] L'impact sur la formule finale se traduit par un coefficient de {correction|redondance|perte} supérieur à 1.`,
        correctAnswer: "correction",
        points: 3,
        explanation: "La correction compense les écarts structurants démontrés."
      }
    ];

    // Delete existing questions of this exam first before saving generated ones
    db.questions = db.questions.filter(q => q.examId !== examId);
    db.questions.push(...mockedGenerated);
    saveDB(db);

    return res.json({
      message: "Examen généré par le moteur simulé localement ! (Aucune clé GEMINI_API_KEY renseignée)",
      questions: mockedGenerated
    });
  }

  // Real Gemini Call using 3.5-flash with structured output scheme
  try {
    const userPrompt = `
Sujet d'Examen original:
---
${subject}
---

Corrigé fourni par le professeur (s'il y en a un):
---
${solutions}
---

Barème ou consigne de notation (s'il y en a un):
---
${gradingScale}
---

Génère une liste de questions variées et fidèles de type Moodle basées sur le sujet et corrigé.
Tu dois renvoyer exactement une liste de questions de types différents. Exploite au mieux les informations fournies pour concevoir :
- Des questions QCM (type 'mcq') avec 4 options (la bonne réponse doit être l'une des options).
- Des questions Vrai / Faux (type 'true_false') avec 'true' ou 'false' en correctAnswer.
- Des questions d'Appariement (type 'matching') où 'options' contient les clés de gauche (par ex: ['X', 'Y']), et 'matchingTargets' contient les correspondances de droite correspondantes dans le même ordre exacte (par ex: ['A', 'B']). L'étudiant devra associer correctement.
- Des réponses courtes (type 'short_answer') réclammant un mot exact ou une expression courte en correctAnswer.
- Des questions numériques (type 'numerical') acceptant un nombre brut en string correctAnswer.
- Des questions à trous Cloze (type 'cloze') où le texte contient des marqueurs d'options formatées, par exemple: "Le ciel est {bleu|vert|jaune}." avec correctAnswer égal à "bleu".
- Des rédactions ouvertes (type 'essay') réclammant une composition texte libre (sera notée manuellement).

Génère entre 5 et 10 questions équilibrées et intelligentes. Distribue les points de façon cohérente avec le barème.
`;

    const result = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: "Tu es un assistant universitaire expert en ingénierie pédagogique LMS Moodle. Ta tâche est de lire des devoirs, corrigés et barèmes pour en faire des Quiz Moodle parfaits. Tu dois retourner uniquement un tableau JSON valide contenant des questions conformes au schéma défini.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: "Le type de question: 'mcq' | 'true_false' | 'matching' | 'short_answer' | 'numerical' | 'cloze' | 'essay' | 'description'"
              },
              statement: {
                type: Type.STRING,
                description: "L'énoncé de la question de manière claire et adaptée"
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Facultatif. Tableau de choix pour QCM ou termes de gauche à associer pour 'matching'."
              },
              matchingTargets: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Facultatif. Tableau de cibles de droite correspondantes à associer pour 'matching' (dans l'ordre correct)."
              },
              correctAnswer: {
                type: Type.STRING,
                description: "La bonne réponse exacte. Vrai/faux: 'true'/'false'. MCQ: l'option textuelle correspondante exacte. Matching: un descriptif d'association. Cloze: la bonne option. Question ouverte: directives de réponses clefs."
              },
              points: {
                type: Type.NUMBER,
                description: "Points alloués à la question."
              },
              explanation: {
                type: Type.STRING,
                description: "Explication ou justification pédagogique issue du corrigé officiel."
              }
            },
            required: ["type", "statement", "correctAnswer", "points", "explanation"]
          }
        }
      }
    });

    const textOutput = result.text;
    if (!textOutput) {
      throw new Error("Gemini a retourné une réponse vide.");
    }

    const parsedQuestions = JSON.parse(textOutput.trim());

    // Allocate continuous random IDs to generated questions and push to DB
    const questionsToInsert = parsedQuestions.map((q: any) => ({
      ...q,
      id: "q_" + Math.random().toString(36).substring(2, 11),
      examId,
      options: q.options || [],
      matchingTargets: q.matchingTargets || []
    }));

    // Erase old exam questions and save generated
    db.questions = db.questions.filter(q => q.examId !== examId);
    db.questions.push(...questionsToInsert);
    saveDB(db);

    res.json({
      message: "Examen généré avec succès par l'IA Gemini !",
      questions: questionsToInsert
    });

  } catch (error: any) {
    console.error("Gemini Generation failed:", error);
    res.status(500).json({ error: "L'intelligence artificielle n'a pas pu traiter vos documents. " + error.message });
  }
});

// --- SUBMISSIONS & GRADING SYSTEM ---

app.get("/api/exams/:examId/submissions", (req, res) => {
  const { examId } = req.params;
  const db = getDB();

  const subs = db.submissions.filter(s => s.examId === examId);
  const enriched = subs.map(sub => {
    const student = db.users.find(u => u.id === sub.studentId);
    return {
      ...sub,
      studentEmail: student ? student.email : "Étudiant",
      studentClass: student ? student.schoolClass : "N/A"
    };
  });

  res.json(enriched);
});

// Helper functions for Levenshtein text similarity
function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  const lenA = a.length;
  const lenB = b.length;

  for (let i = 0; i <= lenA; i++) {
    tmp[i] = [i];
  }

  for (let j = 0; j <= lenB; j++) {
    tmp[0][j] = j;
  }

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }

  return tmp[lenA][lenB];
}

function getTextSimilarityPct(a: string, b: string): number {
  const strA = (a || "").trim().toLowerCase();
  const strB = (b || "").trim().toLowerCase();
  
  if (strA.length === 0 && strB.length === 0) return 100;
  if (strA.length === 0 || strB.length === 0) return 0;
  
  const distance = getLevenshteinDistance(strA, strB);
  const maxLen = Math.max(strA.length, strB.length);
  const similarity = (1 - distance / maxLen) * 100;
  return parseFloat(similarity.toFixed(1));
}

// Submit Quiz and AUTO-GRADE standard questions instantly
app.post("/api/exams/:examId/submit", (req, res) => {
  const { examId } = req.params;
  const { studentId, answers } = req.body; // Record<questionId, any>

  if (!studentId || !answers) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  const db = getDB();
  const exam = db.exams.find(e => e.id === examId);
  if (!exam) return res.status(404).json({ error: "Examen introuvable." });

  // Get active exam questions
  const examQuestions = db.questions.filter(q => q.examId === examId);

  let totalScore = 0;
  let hasEssay = false;
  const essayFeedbacks: Record<string, { score: number; comment: string; similarityPct?: number }> = {};

  // Auto grade
  for (const question of examQuestions) {
    const studentAns = answers[question.id];

    if (question.type === "essay") {
      // Manual grading required, set essay initial feedback using Levenshtein distance check
      hasEssay = true;
      const promptText = question.statement || "";
      const answerText = String(studentAns || "").trim();
      const similarityPct = getTextSimilarityPct(promptText, answerText);

      essayFeedbacks[question.id] = { 
        score: 0, 
        comment: `En attente de correction par l'enseignant. (Similarité avec le sujet original : ${similarityPct}%)`,
        similarityPct
      };
      continue;
    }

    if (question.type === "description") {
      continue; // Not rated
    }

    let isCorrect = false;

    if (!studentAns) {
      isCorrect = false;
    } else if (question.type === "mcq" || question.type === "true_false" || question.type === "numerical" || question.type === "short_answer" || question.type === "cloze") {
      // Trim comparison
      const normCorrect = String(question.correctAnswer).trim().toLowerCase();
      const normStudent = String(studentAns).trim().toLowerCase();
      isCorrect = normCorrect === normStudent;
    } else if (question.type === "matching") {
      // studentAns is dictionary of option -> matchingTarget
      // We check if student matching dictionary is correct
      try {
        let matchingMap: Record<string, string> = {};
        if (typeof studentAns === "string") {
          matchingMap = JSON.parse(studentAns);
        } else {
          matchingMap = studentAns;
        }

        // Compare with correct map order
        let totalMatches = 0;
        const keys = question.options || [];
        const targets = question.matchingTargets || [];

        keys.forEach((key: string, idx: number) => {
          if (matchingMap[key] === targets[idx]) {
            totalMatches++;
          }
        });

        if (keys.length > 0) {
          const ratio = totalMatches / keys.length;
          totalScore += ratio * (question.points || 0);
          continue; // Scored proportionally
        }
      } catch (e) {
        console.error("Error evaluating matching type question:", e);
      }
    }

    if (isCorrect) {
      totalScore += (question.points || 0);
    }
  }

  const submissionId = "sub_" + Math.random().toString(36).substring(2, 11);
  const newSubmission = {
    id: submissionId,
    studentId,
    examId,
    answers,
    score: hasEssay ? null : parseFloat(totalScore.toFixed(2)), // null signals grading pending
    submittedAt: new Date().toISOString(),
    gradedAt: hasEssay ? null : new Date().toISOString(),
    essayFeedbacks: hasEssay ? essayFeedbacks : undefined
  };

  db.submissions.push(newSubmission);
  saveDB(db);

  // Email notifications logic if manual essay correction is pending
  if (hasEssay) {
    const studentUser = db.users.find(u => u.id === studentId);
    const courseObj = db.courses.find(c => c.id === exam.courseId);
    const teacherUser = courseObj ? db.users.find(u => u.id === courseObj.teacherId) : null;

    const studentEmail = studentUser ? studentUser.email : "etudiant@eduquiz.fr";
    const teacherEmail = teacherUser ? teacherUser.email : "enseignant@eduquiz.fr";

    // Call asynchronously so it doesn't block client response
    sendTeacherNotificationEmail(teacherEmail, studentEmail, exam.title);
  }

  res.status(201).json(newSubmission);
});

// Teacher manually grades an Essay / composition question
app.post("/api/submissions/:submissionId/grade", (req, res) => {
  const { submissionId } = req.params;
  const { questionId, score, comment } = req.body;

  const db = getDB();
  const subIdx = db.submissions.findIndex(s => s.id === submissionId);
  if (subIdx === -1) return res.status(404).json({ error: "Soumission introuvable." });

  const submission = db.submissions[subIdx];
  const question = db.questions.find(q => q.id === questionId);
  if (!question) return res.status(404).json({ error: "Question introuvable." });

  if (!submission.essayFeedbacks) {
    submission.essayFeedbacks = {};
  }

  submission.essayFeedbacks[questionId] = {
    score: parseFloat(score) || 0,
    comment: comment || ""
  };

  // Reevaluate total score
  const examId = submission.examId;
  const questions = db.questions.filter(q => q.examId === examId);

  let totalScore = 0;
  let allGraded = true;

  for (const q of questions) {
    if (q.type === "essay") {
      const feed = submission.essayFeedbacks[q.id];
      if (feed && feed.comment !== "En attente de correction par l'enseignant.") {
        totalScore += feed.score;
      } else {
        allGraded = false;
        totalScore += (feed?.score || 0);
      }
    } else if (q.type === "description") {
      // no marks
    } else {
      // Read saved auto-graded items
      const studentAns = submission.answers[q.id];
      let isCorrect = false;

      if (!studentAns) {
        isCorrect = false;
      } else if (q.type === "mcq" || q.type === "true_false" || q.type === "numerical" || q.type === "short_answer" || q.type === "cloze") {
        isCorrect = String(q.correctAnswer).trim().toLowerCase() === String(studentAns).trim().toLowerCase();
      } else if (q.type === "matching") {
        try {
          const matchingMap = typeof studentAns === "string" ? JSON.parse(studentAns) : studentAns;
          let totalMatches = 0;
          const options = q.options || [];
          const targets = q.matchingTargets || [];
          options.forEach((key: string, idx: number) => {
            if (matchingMap[key] === targets[idx]) totalMatches++;
          });
          if (options.length > 0) {
            totalScore += (totalMatches / options.length) * (q.points || 0);
            continue;
          }
        } catch { /* skip */ }
      }

      if (isCorrect) {
        totalScore += (q.points || 0);
      }
    }
  }

  submission.score = allGraded ? parseFloat(totalScore.toFixed(2)) : null;
  submission.gradedAt = new Date().toISOString();

  db.submissions[subIdx] = submission;
  saveDB(db);

  res.json(submission);
});

// Get submissions of specific student
app.get("/api/students/:studentId/submissions", (req, res) => {
  const { studentId } = req.params;
  const db = getDB();

  const subs = db.submissions.filter(s => s.studentId === studentId);
  const enriched = subs.map(sub => {
    const exam = db.exams.find(e => e.id === sub.examId);
    const course = exam ? db.courses.find(c => c.id === exam.courseId) : null;
    return {
      ...sub,
      examTitle: exam ? exam.title : "Examen supprimé",
      courseTitle: course ? course.title : "Cours",
      duration: exam ? exam.duration : 0,
      totalPoints: exam ? db.questions.filter(q => q.examId === exam.id).reduce((sum, q) => sum + q.points, 0) : 0
    };
  });

  res.json(enriched);
});

// Get detailed submission, including questions and exam info
app.post("/api/gemini/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "L'historique des messages est requis." });
  }

  const aiClient = getGeminiClient();
  if (!aiClient) {
    // Elegant fully contextual mock simulator
    const lastUserMsg = (messages[messages.length - 1]?.content || "").toLowerCase();
    let reply = "Bonjour ! Je suis l'assistant académique EduQuiz AI. 🤖\n\n*(Note : Clé d'API inactive, fonctionnement en simulation intelligente)*\n\n";

    if (lastUserMsg.includes("structure") || lastUserMsg.includes("document") || lastUserMsg.includes("pdf") || lastUserMsg.includes("txt")) {
      reply += "Pour obtenir de parfaits examens générés par l'IA :\n\n" +
               "1. **Option QCM** : Listez chaque énoncé suivi immédiatement de choix étiquetés `A)`, `B)`, `C)`, `D)`. Indiquez clairement la bonne réponse.\n" +
               "2. **Option Composition (Rédaction)** : N'hésitez pas à intégrer un barème de correction (critères, points clés, corrigé idéal). Cela permettra au système intelligent d'analyser la copie de l'étudiant de manière beaucoup plus juste et d'en déduire des commentaires d'évaluation précis.\n" +
               "3. **Format des titres** : Divisez vos rubriques d'exercices à l'aide de titres clairs (ex: `# Partie I : Fondements`) afin d'aider notre modèle à segmenter les questions.";
    } else if (lastUserMsg.includes("param") || lastUserMsg.includes("réglage") || lastUserMsg.includes("config") || lastUserMsg.includes("brouillon") || lastUserMsg.includes("publi")) {
      reply += "Voici comment naviguer dans les options d'EduQuiz AI :\n\n" +
               "- **Statuts Brouillon vs Publié** : Un examen en statut 'Brouillon' est modifiable et vos questions n'apparaissent pas aux étudiants. Une fois publié ('Published'), les étudiants inscrits au cours peuvent démarrer le test en direct.\n" +
               "- **Espace Étudiant** : Pour qu'un étudiant voie vos tests, il lui suffit de renseigner le **Code d'Accès** à 6 caractères généré pour votre cours (ex. `crs_XXXXXX`). Vous pouvez copier ce code depuis votre tableau de bord.\n" +
               "- **Exportation** : Dans chaque cours, vous pouvez cliquer sur 'Exporter les notes' pour obtenir un tableur CSV des compositions, ou exporter vos examens sous format standard Moodle XML.";
    } else if (lastUserMsg.includes("catégor") || lastUserMsg.includes("dossier") || lastUserMsg.includes("tag") || lastUserMsg.includes("filtr")) {
      reply += "Vous pouvez organiser vos matières dans des dossiers ou tags de catégorie :\n\n" +
               "1. Lors de la création d'un cours, remplissez le champ optionnel **Catégorie / Dossier**.\n" +
               "2. Un filtre latéral à gauche de votre espace de cours vous permettra d'isoler instantanément un dossier (ex: 'Mathématiques', 'Master 1').\n" +
               "3. Vous pouvez à tout moment éditer la catégorie d'un cours existant en cliquant sur le bouton d'édition (crayon) lié à cette matière.";
    } else {
      reply += "Je suis formé pour vous guider sur :\n" +
               "- La **structure optimale des documents** d'examens (PDF/sources) pour de meilleurs résultats par l'IA.\n" +
               "- Le fonctionnement de la **correction par IA** (levenshtein, feedbacks).\n" +
               "- La navigation sur la plateforme (gestion de dossiers, statuts d'examens).\n\n" +
               "Posez-moi une question sur ces thèmes !";
    }
    return res.json({ text: reply });
  }

  try {
    const formattedContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || "" }]
    }));

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: `Vous êtes l'assistant IA intégré de la plateforme académique "EduQuiz AI" (interface Enseignant).
Votre mission consiste à accompagner l'enseignant pour :
1. Structurer au mieux ses documents de cours/examens (PDF, TXT, QCM) pour que le générateur automatique d'IA donne les meilleurs résultats (proposer des balises claires, d'insérer des corrigés types ou critères de notation détaillés pour guider l'évaluation automatique).
2. Prendre en main et naviguer dans l'interface (création de matières avec Dossiers/Tags, statuts Brouillon/Publié, correction des compositions avec score de similarité de Levenshtein, export Moodle XML et CSV).
3. Configurer l'écosystème EduQuiz AI.

Répondez de manière structurée avec du Markdown clair (puces, gras, listes), professionnelle et en français.`
      }
    });

    return res.json({ text: response.text || "Désolé, je n'ai pas pu générer de réponse." });
  } catch (error: any) {
    console.error("[Teacher Chat AI Error]", error);
    return res.status(500).json({ error: error.message || "Erreur interne" });
  }
});

// Get detailed submission, including questions and exam info
app.get("/api/submissions/:submissionId/details", (req, res) => {
  const { submissionId } = req.params;
  const db = getDB();

  const submission = db.submissions.find(s => s.id === submissionId);
  if (!submission) return res.status(404).json({ error: "Soumission introuvable" });

  const exam = db.exams.find(e => e.id === submission.examId);
  const questions = db.questions.filter(q => q.examId === submission.examId);

  res.json({
    submission,
    exam,
    questions
  });
});

// Generate tutoring explanation using Gemini on student mistakes
app.post("/api/submissions/:submissionId/ai-explain", async (req, res) => {
  const { submissionId } = req.params;
  const db = getDB();

  const sub = db.submissions.find(s => s.id === submissionId);
  if (!sub) return res.status(404).json({ error: "Soumission introuvable." });

  const exam = db.exams.find(e => e.id === sub.examId);
  if (!exam) return res.status(401).json({ error: "Examen introuvable." });

  const questions = db.questions.filter(q => q.examId === sub.examId);
  const student = db.users.find(u => u.id === sub.studentId);
  const course = exam ? db.courses.find(c => c.id === exam.courseId) : null;

  const mistakes: any[] = [];
  const correctBreakdown: any[] = [];

  questions.forEach(q => {
    if (q.type === "description") return;

    const studentAns = sub.answers[q.id];
    let isCorrect = false;
    let pointsObtained = 0;

    if (q.type === "essay") {
      const fb = sub.essayFeedbacks?.[q.id];
      const comment = fb ? fb.comment : "Pas de commentaire";
      const score = fb ? fb.score : 0;
      pointsObtained = score;
      isCorrect = score >= (q.points || 0) / 2;

      const record = {
        question: q.statement,
        type: "Composition rédigée",
        studentAnswer: studentAns || "Non fourni",
        points: `${score} / ${q.points || 0}`,
        comment
      };
      if (score < (q.points || 0)) {
        mistakes.push(record);
      } else {
        correctBreakdown.push(record);
      }
      return;
    }

    if (!studentAns) {
      isCorrect = false;
    } else if (q.type === "mcq" || q.type === "true_false" || q.type === "numerical" || q.type === "short_answer" || q.type === "cloze") {
      isCorrect = String(q.correctAnswer).trim().toLowerCase() === String(studentAns).trim().toLowerCase();
    } else if (q.type === "matching") {
      try {
        const matchingMap = typeof studentAns === "string" ? JSON.parse(studentAns) : studentAns;
        let totalMatches = 0;
        const opts = q.options || [];
        const targets = q.matchingTargets || [];
        opts.forEach((key: string, idx: number) => {
          if (matchingMap[key] === targets[idx]) totalMatches++;
        });
        isCorrect = totalMatches === opts.length;
        pointsObtained = opts.length > 0 ? (totalMatches / opts.length) * (q.points || 0) : 0;
      } catch {
        isCorrect = false;
      }
    }

    const rec = {
      question: q.statement,
      type: q.type,
      studentAnswer: studentAns ? (typeof studentAns === "object" ? JSON.stringify(studentAns) : studentAns) : "Non répondu",
      correctAnswer: q.correctAnswer || "Non spécifié",
      explanation: q.explanation || "",
      points: q.points || 1
    };

    if (isCorrect) {
      correctBreakdown.push(rec);
    } else {
      mistakes.push(rec);
    }
  });

  const aiClient = getGeminiClient();

  if (aiClient) {
    try {
      const prompt = `Voici les détails de l'évaluation d'un étudiant sur la plateforme EduQuiz AI :
Examen : "${exam.title}"
Matière : "${course ? course.title : "N/A"}"
Score de l'étudiant : ${sub.score !== null ? `${sub.score} points` : "Correction en cours"}

Questions sur lesquelles l'étudiant a commis des erreurs :
${mistakes.length === 0 ? "Aucune erreur majeure, score parfait !" : JSON.stringify(mistakes, null, 2)}

Questions réussies :
${JSON.stringify(correctBreakdown, null, 2)}

Rédige un feedback et des explications personnalisées d'un ton de tuteur bienveillant et encourageant en français (Format Markdown).
Explique les erreurs de façon pédagogique en clarifiant les concepts de cours, encourage l'étudiant et propose un plan de révision succinct.`;

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Tu es un tuteur universitaire français, bienveillant, clair et très pédagogue.",
          temperature: 0.7,
        }
      });

      return res.json({ explanation: response.text });
    } catch (err: any) {
      console.error("Gemini tutoring fail, fallback to simulator", err);
    }
  }

  // High-Fidelity simulated tutoring fallback response
  let markdownExplanation = `### 🎓 Tutorat IA Pédagogique (Mode Simulé)\n\n`;
  markdownExplanation += `Bonjour ! J'ai passé en revue vos réponses pour l'évaluation **"${exam.title}"**.\n\n`;

  if (mistakes.length === 0) {
    markdownExplanation += `### 🎉 Performance Parfaite !\nVous avez répondu correctement à toutes les questions. Votre rigueur et votre assimilation du sujet sont idéales. Félicitations !\n`;
  } else {
    markdownExplanation += `Voici des explications pédagogiques personnalisées sur vos erreurs pour consolider vos compétences:\n\n`;
    mistakes.forEach((m, idx) => {
      markdownExplanation += `#### 🔍 Question : "${m.question}"\n`;
      markdownExplanation += `- **Votre réponse** : \`${m.studentAnswer}\`\n`;
      if (m.correctAnswer) {
        markdownExplanation += `- **Solution correcte** : \`${m.correctAnswer}\`\n`;
      }
      if (m.comment) {
        markdownExplanation += `- **Remarques de correction** : *${m.comment}*\n`;
      }
      markdownExplanation += `- **Clarification Conceptuelle** : `;
      if (m.type === "mcq" || m.type === "true_false") {
        markdownExplanation += `Ce type de question teste la précision théorique. Une lecture trop rapide peut vous faire manquer des conditions d'application de ces notions. Prenez soin d'isoler chaque terme d'un énoncé.\n\n`;
      } else if (m.type === "Composition rédigée") {
        markdownExplanation += `Pour les exercices rédigés ou de composition, attachez-vous à expliciter votre cheminement logique pas à pas. Le correcteur cherche à évaluer votre structuration de pensée autant que le résultat d'ensemble.\n\n`;
      } else {
        markdownExplanation += `Assurez-vous de bien maitriser la logique de résolution correspondante. Relisez la fiche de cours associée à cet exercice.\n\n`;
      }
    });

    markdownExplanation += `### 💡 Plan de révision conseillé :\n`;
    markdownExplanation += `1. **Reprenez les énoncés** de ces questions à tête reposée sans regarder la correction d'abord.\n`;
    markdownExplanation += `2. **Consultez les thèmes d'erreurs** ci-dessus et reprenez les chapitres correspondants du cours.\n`;
  }

  res.json({ explanation: markdownExplanation });
});

// Export Grades of all students enrolled in a selected course with Theme breakdowns
app.get("/api/courses/:courseId/grades-export", (req, res) => {
  const { courseId } = req.params;
  const db = getDB();

  const course = db.courses.find(c => c.id === courseId);
  if (!course) return res.status(404).json({ error: "Cours non trouvé" });

  const exams = db.exams.filter(e => e.courseId === courseId);
  const examIds = exams.map(e => e.id);

  const courseQuestions = db.questions.filter(q => examIds.includes(q.examId));
  const submissions = db.submissions.filter(s => examIds.includes(s.examId));
  const enrollments = db.enrollments.filter(en => en.courseId === courseId);

  // Take any enrolled students plus anyone with a submission
  const studentIds = Array.from(new Set([
    ...enrollments.map(en => en.studentId),
    ...submissions.map(sub => sub.studentId)
  ]));

  const studentsList = studentIds.map(stId => {
    const studentUser = db.users.find(u => u.id === stId);
    if (!studentUser) return null;

    const studentSubmissions = submissions.filter(s => s.studentId === stId);

    const examScores: Record<string, any> = {};
    let totalScoreSum = 0;
    let attemptedCount = 0;

    exams.forEach(ex => {
      const sub = studentSubmissions.find(s => s.examId === ex.id);
      if (sub) {
        if (sub.score === null) {
          examScores[ex.id] = "PENDING";
        } else {
          examScores[ex.id] = sub.score;
          totalScoreSum += sub.score;
          attemptedCount++;
        }
      } else {
        examScores[ex.id] = null; // No submission
      }
    });

    const overallAverage = attemptedCount > 0 ? parseFloat((totalScoreSum / attemptedCount).toFixed(2)) : null;

    // Theme categories
    const themes = ["Théorie & Concepts", "Logique & Diagnostic", "Appariement & Syntaxe", "Calculs & Analyse", "Démonstration & Rédaction"];
    const themeAverages: Record<string, any> = {};

    themes.forEach(theme => {
      let obtainedThemePoints = 0;
      let totalThemeMaxPoints = 0;

      studentSubmissions.forEach(sub => {
        const subExamQuestions = courseQuestions.filter(q => q.examId === sub.examId);
        
        subExamQuestions.forEach(q => {
          let category = "Général";
          if (q.type === "mcq") category = "Théorie & Concepts";
          else if (q.type === "true_false") category = "Logique & Diagnostic";
          else if (q.type === "matching" || q.type === "cloze") category = "Appariement & Syntaxe";
          else if (q.type === "numerical" || q.type === "short_answer") category = "Calculs & Analyse";
          else if (q.type === "essay") category = "Démonstration & Rédaction";

          if (category !== theme) return;

          const pointsPossible = q.points || 0;
          totalThemeMaxPoints += pointsPossible;

          const studentAns = sub.answers[q.id];
          if (q.type === "essay") {
            const feedback = sub.essayFeedbacks?.[q.id];
            if (feedback && feedback.comment !== "En attente de correction par l'enseignant.") {
              obtainedThemePoints += feedback.score || 0;
            }
          } else if (q.type === "description") {
            // zero points
          } else {
            let isCorrect = false;
            if (!studentAns) {
              isCorrect = false;
            } else if (q.type === "mcq" || q.type === "true_false" || q.type === "numerical" || q.type === "short_answer" || q.type === "cloze") {
              isCorrect = String(q.correctAnswer).trim().toLowerCase() === String(studentAns).trim().toLowerCase();
            } else if (q.type === "matching") {
              try {
                const matchingMap = typeof studentAns === "string" ? JSON.parse(studentAns) : studentAns;
                let totalMatches = 0;
                const opts = q.options || [];
                const targets = q.matchingTargets || [];
                opts.forEach((key: string, idx: number) => {
                  if (matchingMap[key] === targets[idx]) totalMatches++;
                });
                if (opts.length > 0) {
                  obtainedThemePoints += (totalMatches / opts.length) * pointsPossible;
                  return;
                }
              } catch { /* ignore */ }
            }

            if (isCorrect) {
              obtainedThemePoints += pointsPossible;
            }
          }
        });
      });

      themeAverages[theme] = totalThemeMaxPoints > 0 ? parseFloat(((obtainedThemePoints / totalThemeMaxPoints) * 100).toFixed(1)) : null;
    });

    return {
      id: studentUser.id,
      email: studentUser.email,
      university: studentUser.university || "Sorbonne Nouvelle",
      schoolClass: studentUser.schoolClass || "N/A",
      examScores,
      overallAverage,
      themes: themeAverages
    };
  }).filter(Boolean);

  res.json({
    course: course.title,
    exams: exams.map(e => ({ id: e.id, title: e.title })),
    students: studentsList
  });
});

// --- ADVANCED FEATURE: MOODLE XML EXPORT FORMATTER ---

app.get("/api/exams/:id/moodle-xml", (req, res) => {
  const { id } = req.params;
  const db = getDB();

  const exam = db.exams.find(e => e.id === id);
  if (!exam) return res.status(404).send("Examen non trouvé");

  const questions = db.questions.filter(q => q.examId === id);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n`;

  // General category
  xml += `  <question type="category">\n    <category>\n      <text>$course$/EduQuiz/${exam.title.replace(/[&<>'"]/g, "")}</text>\n    </category>\n  </question>\n\n`;

  for (const q of questions) {
    const escapedText = q.statement.replace(/[&<>'"]/g, (m) => {
      switch (m) { case '&': return '&amp;'; case '<': return '&lt;'; case '>': return '&gt;'; case '\'': return '&apos;'; default: return '&quot;'; }
    });
    const escapedExplanation = q.explanation.replace(/[&<>'"]/g, (m) => {
      switch (m) { case '&': return '&amp;'; case '<': return '&lt;'; case '>': return '&gt;'; case '\'': return '&apos;'; default: return '&quot;'; }
    });

    switch (q.type) {
      case "mcq":
        xml += `  <question type="multichoice">\n`;
        xml += `    <name><text>${escapedText.substring(0, 30)}...</text></name>\n`;
        xml += `    <questiontext format="html">\n      <text><![CDATA[<p>${escapedText}</p>]]></text>\n    </questiontext>\n`;
        xml += `    <generalfeedback format="html">\n      <text><![CDATA[<p>${escapedExplanation}</p>]]></text>\n    </generalfeedback>\n`;
        xml += `    <defaultgrade>${q.points || 1}</defaultgrade>\n`;
        xml += `    <single>true</single>\n    <shuffleanswers>true</shuffleanswers>\n`;
        
        const opts = q.options || [];
        for (const opt of opts) {
          const isCorrect = opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
          const p = isCorrect ? "100" : "0";
          xml += `    <answer fraction="${p}">\n      <text><![CDATA[${opt}]]></text>\n    </answer>\n`;
        }
        xml += `  </question>\n\n`;
        break;

      case "true_false":
        xml += `  <question type="truefalse">\n`;
        xml += `    <name><text>${escapedText.substring(0, 30)}...</text></name>\n`;
        xml += `    <questiontext format="html">\n      <text><![CDATA[<p>${escapedText}</p>]]></text>\n    </questiontext>\n`;
        xml += `    <generalfeedback format="html">\n      <text><![CDATA[<p>${escapedExplanation}</p>]]></text>\n    </generalfeedback>\n`;
        xml += `    <defaultgrade>${q.points || 1}</defaultgrade>\n`;
        
        const isTrue = q.correctAnswer.trim().toLowerCase() === "true";
        xml += `    <answer fraction="${isTrue ? "100" : "0"}">\n      <text>true</text>\n    </answer>\n`;
        xml += `    <answer fraction="${!isTrue ? "100" : "0"}">\n      <text>false</text>\n    </answer>\n`;
        xml += `  </question>\n\n`;
        break;

      case "short_answer":
        xml += `  <question type="shortanswer">\n`;
        xml += `    <name><text>${escapedText.substring(0, 30)}...</text></name>\n`;
        xml += `    <questiontext format="html">\n      <text><![CDATA[<p>${escapedText}</p>]]></text>\n    </questiontext>\n`;
        xml += `    <generalfeedback format="html">\n      <text><![CDATA[<p>${escapedExplanation}</p>]]></text>\n    </generalfeedback>\n`;
        xml += `    <defaultgrade>${q.points || 1}</defaultgrade>\n`;
        xml += `    <usecase>0</usecase>\n`;
        xml += `    <answer fraction="100">\n      <text>${q.correctAnswer}</text>\n    </answer>\n`;
        xml += `  </question>\n\n`;
        break;

      case "numerical":
        xml += `  <question type="numerical">\n`;
        xml += `    <name><text>${escapedText.substring(0, 30)}...</text></name>\n`;
        xml += `    <questiontext format="html">\n      <text><![CDATA[<p>${escapedText}</p>]]></text>\n    </questiontext>\n`;
        xml += `    <generalfeedback format="html">\n      <text><![CDATA[<p>${escapedExplanation}</p>]]></text>\n    </generalfeedback>\n`;
        xml += `    <defaultgrade>${q.points || 1}</defaultgrade>\n`;
        xml += `    <answer fraction="100">\n      <text>${q.correctAnswer}</text>\n      <tolerance>0</tolerance>\n    </answer>\n`;
        xml += `  </question>\n\n`;
        break;

      case "essay":
        xml += `  <question type="essay">\n`;
        xml += `    <name><text>${escapedText.substring(0, 30)}...</text></name>\n`;
        xml += `    <questiontext format="html">\n      <text><![CDATA[<p>${escapedText}</p>]]></text>\n    </questiontext>\n`;
        xml += `    <generalfeedback format="html">\n      <text><![CDATA[<p>${escapedExplanation}</p>]]></text>\n    </generalfeedback>\n`;
        xml += `    <defaultgrade>${q.points || 1}</defaultgrade>\n`;
        xml += `    <graderinfo format="html">\n      <text><![CDATA[<p>Guide du corrigé alternatif: ${q.correctAnswer}</p>]]></text>\n    </graderinfo>\n`;
        xml += `  </question>\n\n`;
        break;

      default: // Cloze or matching formats fallback as simple descriptions or cloze syntax
        xml += `  <question type="cloze">\n`;
        xml += `    <name><text>${escapedText.substring(0, 30)}...</text></name>\n`;
        xml += `    <questiontext format="html">\n      <text><![CDATA[<p>${escapedText} (Intégration Cloze : réponse attendue: ${q.correctAnswer})</p>]]></text>\n    </questiontext>\n`;
        xml += `    <generalfeedback format="html">\n      <text><![CDATA[<p>${escapedExplanation}</p>]]></text>\n    </generalfeedback>\n`;
        xml += `    <defaultgrade>${q.points || 1}</defaultgrade>\n`;
        xml += `  </question>\n\n`;
        break;
    }
  }

  xml += `</quiz>`;

  res.setHeader("Content-Disposition", `attachment; filename="moodle-quiz-${id}.xml"`);
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

// CSV Grade Exports for Excel
app.get("/api/exams/:id/export-grades", (req, res) => {
  const { id } = req.params;
  const db = getDB();

  const exam = db.exams.find(e => e.id === id);
  if (!exam) return res.status(404).send("Examen non trouvé");

  const subs = db.submissions.filter(s => s.examId === id);

  let csv = "ID Etudiant;Email;Classe;Date de soumission;Statut de correction;Note finale\n";

  for (const s of subs) {
    const student = db.users.find(u => u.id === s.studentId);
    const email = student ? student.email : "Etudiant Inconnu";
    const sClass = student ? student.schoolClass : "N/A";
    const dateStr = new Date(s.submittedAt).toLocaleString("fr-FR");
    const statusStr = s.score === null ? "En attente de notation manuelle" : "Corrigé";
    const finalScore = s.score === null ? "N/A" : s.score;

    csv += `${s.studentId};${email};${sClass};${dateStr};${statusStr};${finalScore}\n`;
  }

  res.setHeader("Content-Disposition", `attachment; filename="notes-examen-${id}.csv"`);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.send("\uFEFF" + csv); // Adding BOM for proper Excel accents parsing in French
});

// --- E-PROCTORING API ENDPOINTS ---

app.post("/api/exams/:examId/monitoring", (req, res) => {
  const { examId } = req.params;
  const { studentId, eventType, severity, details, timestamp } = req.body;

  if (!studentId || !eventType) {
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  }

  const db = getDB();
  const eventId = "evt_" + Math.random().toString(36).substring(2, 11);
  const newEvent = {
    id: eventId,
    examId,
    studentId,
    timestamp: timestamp || new Date().toISOString(),
    eventType,
    severity: severity || 'low',
    details: details || ''
  };

  if (!db.monitoringEvents) db.monitoringEvents = [];
  db.monitoringEvents.push(newEvent);
  
  // Auto-calculate suspicion score and risk level (simple weighted logic)
  const studentEvents = db.monitoringEvents.filter((e: any) => e.examId === examId && e.studentId === studentId);
  
  let score = 0;
  studentEvents.forEach((ev: any) => {
    switch(ev.eventType) {
      case 'TAB_SWITCH': score += 5; break;
      case 'WINDOW_BLUR': score += 3; break;
      case 'FULLSCREEN_EXIT': score += 10; break;
      case 'CAMERA_DISABLED': score += 20; break;
      case 'SCREENSHARE_STOPPED': score += 25; break;
      case 'NO_FACE_DETECTED': score += 15; break; // Assumes 1 event represents an extended period
      case 'MULTIPLE_FACES': score += 20; break;
      case 'COPY_ATTEMPT': score += 5; break;
      case 'PASTE_ATTEMPT': score += 15; break;
      case 'RIGHT_CLICK_ATTEMPT': score += 2; break;
    }
  });

  let riskLevel = 'Faible';
  if (score > 100) riskLevel = 'Très élevée';
  else if (score > 50) riskLevel = 'Élevée';
  else if (score > 20) riskLevel = 'Moyenne';

  // Find or create report
  if (!db.monitoringReports) db.monitoringReports = [];
  const existingReportIdx = db.monitoringReports.findIndex((r: any) => r.examId === examId && r.studentId === studentId);
  
  if (existingReportIdx >= 0) {
    db.monitoringReports[existingReportIdx].suspicionScore = score;
    db.monitoringReports[existingReportIdx].riskLevel = riskLevel;
    db.monitoringReports[existingReportIdx].events = studentEvents;
    db.monitoringReports[existingReportIdx].generatedAt = new Date().toISOString();
  } else {
    db.monitoringReports.push({
      id: "mrep_" + Math.random().toString(36).substring(2, 11),
      examId,
      studentId,
      suspicionScore: score,
      riskLevel,
      events: studentEvents,
      generatedAt: new Date().toISOString()
    });
  }

  saveDB(db);
  res.status(201).json({ success: true, event: newEvent, suspicionScore: score });
});

app.get("/api/exams/:examId/monitoring", (req, res) => {
  const { examId } = req.params;
  const db = getDB();

  const reports = (db.monitoringReports || []).filter((r: any) => r.examId === examId);
  
  const enriched = reports.map((r: any) => {
    const student = db.users.find((u: any) => u.id === r.studentId);
    return {
      ...r,
      studentEmail: student ? student.email : "Étudiant",
      studentName: student ? student.email.split('@')[0] : "Inconnu"
    };
  });

  res.json(enriched);
});

app.get("/api/exams/:examId/monitoring/:studentId", (req, res) => {
  const { examId, studentId } = req.params;
  const db = getDB();

  const report = (db.monitoringReports || []).find((r: any) => r.examId === examId && r.studentId === studentId);
  
  if (!report) {
    return res.json({
      examId, studentId, suspicionScore: 0, riskLevel: 'Faible', events: [], generatedAt: new Date().toISOString()
    });
  }
  
  const student = db.users.find((u: any) => u.id === studentId);
  res.json({
    ...report,
    studentEmail: student ? student.email : "Étudiant"
  });
});


// --- ADMIN API ENDPOINTS ---

app.get("/api/admin/users", (req, res) => {
  const db = getDB();
  res.json(db.users);
});

app.delete("/api/admin/users/:id", (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: "Utilisateur non trouvé." });
  
  // Prevent deleting the main admin to avoid lockouts
  if (db.users[index].role === 'admin') {
     const allAdmins = db.users.filter(u => u.role === 'admin');
     if (allAdmins.length <= 1) {
         return res.status(400).json({ error: "Impossible de supprimer le dernier administrateur." });
     }
  }

  db.users.splice(index, 1);
  saveDB(db);
  res.json({ success: true });
});

app.get("/api/admin/courses", (req, res) => {
  const db = getDB();
  res.json(db.courses);
});

app.delete("/api/admin/courses/:id", (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const index = db.courses.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ error: "Cours non trouvé." });
  
  db.courses.splice(index, 1);
  saveDB(db);
  res.json({ success: true });
});

app.get("/api/admin/exams", (req, res) => {
  const db = getDB();
  res.json(db.exams);
});

app.delete("/api/admin/exams/:id", (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const index = db.exams.findIndex(e => e.id === id);
  if (index === -1) return res.status(404).json({ error: "Examen non trouvé." });
  
  db.exams.splice(index, 1);
  saveDB(db);
  res.json({ success: true });
});

// Robust Error Handling Middleware to catch any unexpected runtime crashes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("🚨 UNHANDLED SERVER EXCEPTION DETECTED:", err);
  res.status(500).json({
    error: "Une erreur interne du serveur est survenue.",
    message: err?.message || String(err),
    stack: process.env.NODE_ENV !== "production" ? err?.stack : undefined
  });
});

// --- CLIENT-SIDE VITE PIPELINE AND DEV RUNNER ---

// Register production static files synchronously at load time for robust serverless performance
if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const startServer = async () => {
  // Warm up Firestore database state
  await initializeDatabaseState();

  // Vite setup for development asset compiling & livereload (local development only)
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 EduQuiz AI server booting securely on port ${PORT}`);
      console.log(`🔗 Running dev server at http://localhost:${PORT}`);
    });
  }
};

// In Vercel serverless environments, we export 'app' without calling 'startServer()' synchronously.
// The database lazy-initialization middleware will automatically set up dbMemory on the first API request.
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
  });
}

export default app;
