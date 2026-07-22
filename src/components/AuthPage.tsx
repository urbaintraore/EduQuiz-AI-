/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Cpu, GraduationCap, Laptop, BookOpen, AlertCircle, ShieldAlert } from "lucide-react";
import { User, UserRole } from "../types";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth as firebaseAuth, getApiUrl } from "../firebase";

interface AuthPageProps {
  onSuccess: (user: User) => void;
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [university, setUniversity] = useState("");
  const [schoolClass, setSchoolClass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Quick helper to prefill login details for rapid testing
  const setDemoAccount = (roleSelection: "teacher" | "student") => {
    setEmail(roleSelection === "teacher" ? "enseignant@eduquiz.fr" : "etudiant@eduquiz.fr");
    setPassword("password123");
    setRole(roleSelection);
    setIsLogin(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Veuillez renseigner tous les champs obligatoires.");
      setLoading(false);
      return;
    }

    // Validations directes
    if (!isLogin && role === "student") {
      if (!university) {
        setError("L'Établissement / Université est requis pour les étudiants.");
        setLoading(false);
        return;
      }
      if (!schoolClass) {
        setError("Votre classe / promotion est obligatoire.");
        setLoading(false);
        return;
      }
    }

    try {
      let firebaseUid = null;
      try {
        if (firebaseAuth) {
          if (isLogin) {
            // Attempt Firebase login first
            const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
            firebaseUid = userCredential.user.uid;
          } else {
            // Attempt Firebase register first
            const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
            firebaseUid = userCredential.user.uid;
          }
        }
      } catch (fbError: any) {
        // We gracefully fallback to local auth if Firebase fails (e.g., invalid API key, iframe constraints)
        // We only throw if it's a specific user-facing error like wrong password when they actually exist in Firebase
        if (fbError.code === "auth/email-already-in-use") {
            throw new Error("Cet email est déjà utilisé sur Firebase. Essayez de vous connecter.");
        } else if (fbError.code === "auth/wrong-password" || fbError.code === "auth/user-not-found" || fbError.code === "auth/invalid-credential") {
            // If they are strictly using Firebase and have the wrong password, we should probably let them fallback to local auth check just in case,
            // but if they really mistyped, the local auth check will also fail them.
            console.debug("Firebase auth failed with invalid credentials, falling back to local check.");
        }
      }

      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? { email, password, firebaseUid, role }
        : {
            email,
            password,
            role,
            university: university || "Université d'études",
            schoolClass: role === "student" ? schoolClass : "",
            firebaseUid
          };

      const response = await fetch(getApiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("Server returned non-JSON response:", text.substring(0, 200));
          if (text.includes("Bad Gateway") || text.includes("ECONNREFUSED") || text.includes("502")) {
             throw new Error("Impossible de se connecter au serveur backend. Si vous êtes en local, assurez-vous d'avoir lancé l'application avec 'npm run dev' (qui démarre le backend sur le port 3000) et non juste 'vite'.");
          }
          throw new Error("Erreur inattendue du serveur (la réponse n'est pas au format JSON). Le serveur backend n'est peut-être pas démarré correctement.");
        }
      } catch (e: any) {
        throw new Error(e.message || "Erreur inattendue du serveur.");
      }

      if (!response.ok) {
        throw new Error(data?.error || "Une erreur est survenue lors de l'authentification serveur.");
      }

      const user = data.user || data;
      if (data.token) {
        localStorage.setItem("eduquiz_token", data.token);
      } else {
        localStorage.setItem("eduquiz_token", "mock_jwt_token_" + user.id);
      }
      localStorage.setItem("eduquiz_user", JSON.stringify(user));

      onSuccess(user);
    } catch (err: any) {
      setError(err.message || "Impossible de se connecter.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-container" className="min-h-screen bg-slate-50 flex flex-col justify-center sm:py-12 px-4">
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-indigo-600 px-6 py-8 text-center text-white relative">
          <div className="absolute top-4 right-4 bg-indigo-500 text-indigo-100 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border border-indigo-400">
            v1.2.0
          </div>
          <div className="mx-auto w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-3">
            <Cpu className="w-8 h-8 text-indigo-100" />
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">EduQuiz AI</h1>
          <p className="text-sm text-indigo-100 mt-1">Plateforme intelligente d'examen de type Moodle</p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-600 rounded-r-xl flex items-start space-x-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Logins Buttons block */}
          <div className="mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-[10px] tracking-wider font-mono font-bold text-slate-400 uppercase block mb-2">
              🚀 COMPTES DE TEST RAPIDES
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoAccount("teacher")}
                className="text-xs bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 py-1.5 px-2 rounded-md font-medium text-center transition flex justify-center items-center space-x-1"
              >
                <span>👨‍🏫 Enseignant</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount("student")}
                className="text-xs bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 py-1.5 px-2 rounded-md font-medium text-center transition flex justify-center items-center space-x-1"
              >
                <span>👨‍🎓 Étudiant</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@eduquiz.fr");
                  setPassword("password123");
                  setIsLogin(true);
                }}
                className="text-xs bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-200 text-slate-700 py-1.5 px-2 rounded-md font-medium text-center transition flex justify-center items-center space-x-1"
              >
                <span>🛡️ Admin</span>
              </button>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-100 mb-6">
            <button
              onClick={() => {
                setIsLogin(true);
                setError("");
              }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-all ${
                isLogin
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Se Connecter
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError("");
              }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-all ${
                !isLogin
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Créer un Compte
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selection on both login and signup */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Sélectionnez votre rôle
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1.5 ${
                    role === "teacher"
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-700"
                      : "border-slate-200 hover:border-slate-300 text-slate-500"
                  }`}
                >
                  <Laptop className="w-5 h-5" />
                  <span className="text-xs font-bold">Enseignant</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1.5 ${
                    role === "student"
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-700"
                      : "border-slate-200 hover:border-slate-300 text-slate-500"
                  }`}
                >
                  <GraduationCap className="w-5 h-5" />
                  <span className="text-xs font-bold">Étudiant</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Adresse Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@universite.fr"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Mot de Passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {/* University & Class Details based on selection */}
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Établissement / Université {role === "teacher" && "(optionnel)"}
                  </label>
                  <input
                    type="text"
                    required={role === "student"}
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="ex. Sorbonne Université, Lycée Blaise-Pascal"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {role === "student" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Classe / Promotion <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={schoolClass}
                      onChange={(e) => setSchoolClass(e.target.value)}
                      placeholder="ex. L3 Informatique, M1 Management"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition-all text-sm disabled:opacity-50"
            >
              {loading ? "Veuillez patienter..." : isLogin ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
