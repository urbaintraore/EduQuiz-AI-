/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { GraduationCap, LogOut, Cpu, BookOpen, Layers, Sun, Moon } from "lucide-react";
import { User } from "../types";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Navbar({
  user,
  onLogout,
  activeTab,
  setActiveTab,
  darkMode,
  onToggleDarkMode,
}: NavbarProps) {
  return (
    <header id="app-header" className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 sticky top-0 z-40 transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 dark:bg-indigo-500 text-white p-2 rounded-xl flex items-center justify-center shadow-sm">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-sans font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <span>EduQuiz AI</span>
                <span className="text-xs bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium border border-indigo-100 dark:border-indigo-900">
                  Moodle Gen
                </span>
              </span>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono tracking-wider">
                {user ? (user.role === "teacher" ? "ESPACE ENSEIGNANT" : "PORTAIL ÉTUDIANT") : "E-LEARNING"}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          {user && (
            <div className="flex items-center space-x-6">
              {/* Optional dynamic tabs for teachers */}
              {user.role === "teacher" && setActiveTab && activeTab && (
                <div className="hidden md:flex space-x-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-lg text-sm">
                  <button
                    onClick={() => setActiveTab("courses")}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                      activeTab === "courses"
                        ? "bg-white dark:bg-slate-700 text-slate-950 dark:text-slate-50 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-105"
                    }`}
                  >
                    <span className="flex items-center space-x-1">
                      <BookOpen className="w-4 h-4" />
                      <span>Mes Cours & Examens</span>
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("moodle_editor")}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                      activeTab === "moodle_editor"
                        ? "bg-white dark:bg-slate-700 text-slate-950 dark:text-slate-50 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-105"
                    }`}
                  >
                    <span className="flex items-center space-x-1">
                      <Layers className="w-4 h-4" />
                      <span>Éditeur de Questions Scientifique & Cloze Intégré</span>
                    </span>
                  </button>
                </div>
              )}

              {/* User details or university badge */}
              <div className="hidden lg:flex items-center space-x-2 text-right">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 block truncate max-w-[180px]">
                  {user.email}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-mono bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-2 py-0.5 rounded-md">
                  {user.university || "Hors campus"}
                </span>
              </div>

              {/* Theme toggle & Logout Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent transition-all cursor-pointer"
                  title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 px-3 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 transition-all font-medium cursor-pointer"
                  title="Se déconnecter"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Quitter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

