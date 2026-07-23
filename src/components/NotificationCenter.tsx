import React, { useState, useEffect } from "react";
import { Bell, BellOff, CheckCircle, Sparkles } from "lucide-react";
import { Exam, Submission } from "../types";

interface NotificationCenterProps {
  userId: string;
  userRole: string;
  allExams: (Exam & { courseTitle?: string })[];
  studentSubmissions: Submission[];
  triggerToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export function NotificationCenter({
  userId,
  userRole,
  allExams,
  studentSubmissions,
  triggerToast
}: NotificationCenterProps) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default"
  );

  // Request browser desktop notification permission
  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      triggerToast(
        "Les notifications de bureau ne sont pas prises en charge par ce navigateur.",
        "warning"
      );
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        triggerToast("Notifications de bureau activées avec succès !", "success");
        // Test notification
        new Notification("🔔 EduQuiz AI Notifications", {
          body: "Vous recevrez désormais des alertes pour les nouveaux examens et corrections disponibles.",
          icon: "/favicon.ico"
        });
      } else if (result === "denied") {
        triggerToast(
          "Permission refusée. Vous pouvez l'autoriser dans les paramètres de votre navigateur.",
          "warning"
        );
      }
    } catch (e) {
      console.error(e);
      triggerToast("Erreur lors de la demande de permission.", "error");
    }
  };

  // Test notification button
  const handleTestNotification = () => {
    if (!("Notification" in window)) {
      triggerToast("Notifications non supportées par ce navigateur.", "warning");
      return;
    }

    if (Notification.permission === "granted") {
      new Notification("🧪 Test de Notification EduQuiz", {
        body: "Alerte de test ! Le système de notifications de bureau fonctionne parfaitement.",
        icon: "/favicon.ico"
      });
      triggerToast("Notification de test envoyée sur votre bureau !", "info");
    } else {
      handleRequestPermission();
    }
  };

  // Monitor new published exams and new corrected submissions
  useEffect(() => {
    if (userRole !== "student" || !userId || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (Notification.permission !== "granted") return;

    // Load known IDs from localStorage
    const examStorageKey = `eduquiz_seen_exams_${userId}`;
    const correctionStorageKey = `eduquiz_seen_corrections_${userId}`;

    let seenExams: string[] = [];
    let seenCorrections: string[] = [];

    try {
      seenExams = JSON.parse(localStorage.getItem(examStorageKey) || "[]");
      seenCorrections = JSON.parse(localStorage.getItem(correctionStorageKey) || "[]");
    } catch (_) {}

    // Check for newly published exams
    let updatedExams = false;
    allExams.forEach((ex) => {
      if (ex.status === "published" && !seenExams.includes(ex.id)) {
        seenExams.push(ex.id);
        updatedExams = true;

        new Notification("📝 Nouvel Examen Publié !", {
          body: `L'examen "${ex.title}" est désormais disponible dans le cours "${ex.courseTitle || "Votre cours"}".`,
          icon: "/favicon.ico"
        });
      }
    });

    if (updatedExams) {
      localStorage.setItem(examStorageKey, JSON.stringify(seenExams));
    }

    // Check for newly available corrections / grades
    let updatedCorrections = false;
    studentSubmissions.forEach((sub) => {
      if (sub.score !== null && sub.score !== undefined && !seenCorrections.includes(sub.id)) {
        seenCorrections.push(sub.id);
        updatedCorrections = true;

        new Notification("🎉 Correction Disponible !", {
          body: `Votre note pour l'examen "${sub.examTitle || "Évaluation"}" est disponible : ${sub.score} / 20.`,
          icon: "/favicon.ico"
        });
      }
    });

    if (updatedCorrections) {
      localStorage.setItem(correctionStorageKey, JSON.stringify(seenCorrections));
    }
  }, [allExams, studentSubmissions, userId, userRole]);

  if (userRole !== "student") return null;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center space-x-3">
        <div className={`p-2.5 rounded-xl ${permission === "granted" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"}`}>
          {permission === "granted" ? <Bell className="w-5 h-5 text-emerald-400 animate-bounce" /> : <BellOff className="w-5 h-5 text-indigo-400" />}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold text-slate-100">
              Notifications de Bureau
            </h4>
            {permission === "granted" ? (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>Activées</span>
              </span>
            ) : (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                Inactives
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {permission === "granted"
              ? "Alerte automatique en temps réel lors de la publication d'un examen ou d'une correction de note."
              : "Activez les alertes pour recevoir une notification sur votre écran dès qu'un examen est publié ou corrigé."}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end shrink-0">
        {permission !== "granted" ? (
          <button
            type="button"
            onClick={handleRequestPermission}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Activer les alertes</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleTestNotification}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer flex items-center space-x-1.5"
            title="Tester l'envoi d'une alerte de bureau"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tester l'alerte</span>
          </button>
        )}
      </div>
    </div>
  );
}
