/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Trash2,
  FileDown,
  ChevronRight,
  UserCheck,
  CheckCircle,
  HelpCircle,
  FileText,
  Save,
  Check,
  Play,
  Share2,
  ListFilter,
  Flame,
  AlertTriangle,
  Download,
  Award,
  ChevronLeft,
  X,
  Edit3,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  Eye,
  UploadCloud,
  FolderOpen,
  FolderClosed,
  Tag,
  MessageSquare,
  Send,
  Search,
  Link,
  ShieldAlert,
  TrendingUp,
  Radio,
  BarChart2,
  Brain
} from "lucide-react";
import Navbar from "./components/Navbar";
import AuthPage from "./components/AuthPage";
import { AdminDashboard } from "./components/AdminDashboard";
import Toast, { ToastType } from "./components/Toast";
import { User, Course, Exam, Question, QuestionType, Submission, MonitoringConfig } from "./types";
import { getApiUrl } from "./firebase";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from "recharts";
import katex from "katex";
import "katex/dist/katex.min.css";
import { ScientificRichEditor } from "./components/ScientificRichEditor";
import MoodleEditor from "./components/MoodleEditor";

// Premium LaTeX parser and math rendering engine using KaTeX
interface MathRendererProps {
  text: string;
  className?: string;
}

export function MathRenderer({ text, className = "" }: MathRendererProps) {
  if (!text) return null;

  // Split by block math double dollars: $$
  const parts = text.split(/(\$\$.*?\$\$)/gs);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const formula = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
            return (
              <span
                key={index}
                className="block my-3 overflow-x-auto text-center font-serif text-[15px] text-slate-800 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/50"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return <code key={index} className="block my-2 text-red-500">{formula}</code>;
          }
        } else {
          // Split by single dollar inline math: $
          const inlineParts = part.split(/(\$.*?\$)/g);
          return (
            <span key={index}>
              {inlineParts.map((subPart, subIndex) => {
                if (subPart.startsWith("$") && subPart.endsWith("$")) {
                  const formula = subPart.slice(1, -1).trim();
                  try {
                    const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
                    return (
                      <span
                        key={subIndex}
                        className="inline-block px-1 align-middle overflow-x-auto max-w-full font-serif text-slate-800 text-[13px]"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    );
                  } catch (e) {
                    return <code key={subIndex} className="text-red-500 font-mono text-xs">${formula}$</code>;
                  }
                }
                // render newlines as <br /> for readability
                const textWithNewlines = subPart.split("\n").map((line, lIdx, arr) => (
                  <React.Fragment key={lIdx}>
                    {line}
                    {lIdx < arr.length - 1 && <br />}
                  </React.Fragment>
                ));
                return <span key={subIndex}>{textWithNewlines}</span>;
              })}
            </span>
          );
        }
      })}
    </span>
  );
}

// Helper to determine the theme/category of a question
const getQuestionTheme = (q: any) => {
  if (q.type === "mcq") return "Théorie & Concepts";
  if (q.type === "true_false") return "Logique & Diagnostic";
  if (q.type === "matching" || q.type === "cloze") return "Appariement & Syntaxe";
  if (q.type === "numerical" || q.type === "short_answer") return "Calculs & Analyse";
  if (q.type === "essay") return "Démonstration & Rédaction";
  return "Général";
};

const safeConfirm = (msg: string): boolean => {
  try {
    return window.confirm(msg);
  } catch (e) {
    console.warn("window.confirm call was blocked in sandboxed environment, auto-approving.", e);
    return true;
  }
};

function StudentExamsListView({ courses, onStartExam, studentSubmissions }: { courses: Course[], onStartExam: (exam: Exam) => void, studentSubmissions: any[] }) {
  const [courseExamsMap, setCourseExamsMap] = useState<Record<string, Exam[]>>({});
  const [loadingExams, setLoadingExams] = useState(true);

  useEffect(() => {
    async function loadExams() {
      const map: Record<string, Exam[]> = {};
      for (const c of courses) {
        try {
          const res = await fetch(`/api/courses/${c.id}/exams`);
          if (res.ok) {
            const data = await res.json();
            map[c.id] = data;
          } else {
            map[c.id] = [];
          }
        } catch {
          map[c.id] = [];
        }
      }
      setCourseExamsMap(map);
      setLoadingExams(false);
    }
    if (courses.length > 0) {
      loadExams();
    } else {
      setLoadingExams(false);
    }
  }, [courses]);

  if (loadingExams) {
    return <p className="text-xs text-slate-400 py-4 text-center">Chargement des sessions d'examens...</p>;
  }

  const allExams = courses.flatMap(c => (courseExamsMap[c.id] || []).map(ex => ({ ...ex, courseTitle: c.title })));

  if (allExams.length === 0) {
    return (
      <div className="text-center py-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-500">Aucun examen n'est actuellement publié pour vos cours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allExams.map(ex => {
        const isSubmitted = studentSubmissions.some(sub => sub.examId === ex.id);
        return (
          <div key={ex.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md font-bold">{ex.courseTitle}</span>
                <span className="text-[10px] text-slate-400">⏱️ {ex.duration || 30} min</span>
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-1">{ex.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{ex.subjectText ? ex.subjectText.substring(0, 80) + "..." : "Évaluation Moodle surveillée"}</p>
            </div>
            <div>
              {isSubmitted ? (
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
                  ✓ Déjà Soumis
                </span>
              ) : (
                <button
                  onClick={() => onStartExam(ex)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Commencer l'Examen</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExamQuestionEditor({ exam, onUpdateExam, triggerToast }: { exam: Exam, onUpdateExam: (exam: Exam) => void, triggerToast: any }) {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Éditeur de Questions — {exam.title}</h4>
        <button
          onClick={() => {
            const newQ = {
              id: "q-" + Date.now(),
              examId: exam.id,
              type: "mcq" as const,
              statement: "Nouvelle question d'évaluation",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option A",
              points: 2,
              explanation: "Explication de la réponse correcte."
            };
            const updated = {
              ...exam,
              questions: [...(exam.questions || []), newQ]
            };
            onUpdateExam(updated);
            triggerToast("Question ajoutée avec succès.", "success");
          }}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ajouter une question</span>
        </button>
      </div>
      <div className="space-y-3">
        {(!exam.questions || exam.questions.length === 0) ? (
          <p className="text-xs text-slate-400 py-6 text-center">Aucune question configurée pour cet examen.</p>
        ) : (
          exam.questions.map((q, idx) => (
            <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Question {idx + 1} ({q.points} pts)</span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">{q.statement}</p>
              </div>
              <button
                onClick={() => {
                  const updated = {
                    ...exam,
                    questions: exam.questions?.filter(item => item.id !== q.id)
                  };
                  onUpdateExam(updated);
                  triggerToast("Question supprimée.", "info");
                }}
                className="text-slate-400 hover:text-rose-600 p-1.5 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ExamMonitoringView({ exam, course, triggerToast }: { exam: Exam, course: Course | null, triggerToast: any }) {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>Supervision en Direct — {exam.title}</span>
        </h4>
        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-200/50">
          Système Actif (Anti-triche Moodle)
        </span>
      </div>
      <p className="text-xs text-slate-500">Aucun étudiant n'a encore démarré cette session d'examen en direct.</p>
    </div>
  );
}

export default function App() {
  // Authentication & Global context
  const [user, setUser] = useState<User | null>(null);

  const [chatMessages, setChatMessages] = useState<{role: "user" | "assistant", content: string}[]>([
    {
      role: "assistant",
      content: "Bonjour ! Je suis l'assistant académique EduQuiz AI. 🤖 Comment puis-je vous aider aujourd'hui à configurer vos cours, créer des examens, ou à structurer au mieux vos documents sources (PDF, TXT) pour obtenir d'excellentes questions automatiques d'IA ?"
    }
  ]);

  // Dark mode state with check for previous configurations
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // Client-side connectivity status checker
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });

  // Apply visual theme to standard application structure
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    const newMode = !darkMode; setDarkMode(newMode); localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  // Dynamic AI Chat initial state according to current user role
  useEffect(() => {
    if (user) {
      if (user.role === "student") {
        setChatMessages([
          {
            role: "assistant",
            content: "Bonjour ! Je suis votre tuteur IA universitaire personnel EduQuiz. 🤖\n\nBesoin d'aide pour comprendre un cours, réviser un chapitre ou décrypter les résultats d'une évaluation passée ? Posez-moi toutes vos questions !"
          }
        ]);
      } else {
        setChatMessages([
          {
            role: "assistant",
            content: "Bonjour ! Je suis l'assistant académique EduQuiz AI. 🤖 Comment puis-je vous aider aujourd'hui à configurer de nouveaux cours, éditer des sujets d'examens, ou structurer au mieux vos documents sources (PDF, TXT) pour l'IA ?"
          }
        ]);
      }
    }
  }, [user]);

  // Connectivity side-effects and notifications
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerToast("Connexion Internet rétablie ! Vous êtes à nouveau en ligne.", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      triggerToast("Vous avez perdu la connexion Internet. Vos réponses sont sauvegardées localement en continu.", "error");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("courses"); // For teacher
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);

  // Navigation History Stack for Back button
  const [navHistory, setNavHistory] = useState<Array<{
    activeTab: string;
    activeCourse: Course | null;
    activeExam: Exam | null;
  }>>([]);

  const pushHistory = () => {
    setNavHistory(prev => [
      ...prev,
      { activeTab, activeCourse, activeExam }
    ]);
  };

  const handleGoBack = () => {
    if (navHistory.length === 0) return;
    const last = navHistory[navHistory.length - 1];
    setNavHistory(prev => prev.slice(0, prev.length - 1));
    setActiveTab(last.activeTab);
    setActiveCourse(last.activeCourse);
    setActiveExam(last.activeExam);
  };

  useEffect(() => {
    if (user && user.role !== "teacher" && activeTab === "moodle_editor") {
      setActiveTab("courses");
    }
  }, [user, activeTab]);
  // Lists & Resource States
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");
  const [newCourseCategory, setNewCourseCategory] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [editingCourseForCategory, setEditingCourseForCategory] = useState<Course | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("");
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  const [teacherSelectedSub, setTeacherSelectedSub] = useState<any | null>(null);
  const [printSubmission, setPrintSubmission] = useState<any | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examDuration, setExamDuration] = useState("30");
  const [examStartDate, setExamStartDate] = useState("");
  const [examSubject, setExamSubject] = useState("");
  const [examSolution, setExamSolution] = useState("");
  const subjectFileRef = useRef<HTMLInputElement>(null);
  const solutionFileRef = useRef<HTMLInputElement>(null);
  const [examGradingScale, setExamGradingScale] = useState("Sur 20 points");
  const [examMonitoringConfig, setExamMonitoringConfig] = useState<MonitoringConfig>({
    active: true, requireCamera: false, periodicCaptures: false, detectNoFace: false, detectMultipleFaces: false,
    requireScreenShare: true, monitorWindowBlur: true, monitorTabChange: true, monitorFullscreenExit: true,
    preventCopyPaste: true, preventRightClick: true, preventShortcuts: true, requireMicrophone: false,
    detectAbnormalNoise: false, detectConversation: false, thresholdTabChanges: 3, thresholdFullscreenExits: 2,
    thresholdNoFaceTime: 30, alertScoreThreshold: 50
  });
  const [joinCode, setJoinCode] = useState("");
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQType, setNewQType] = useState<QuestionType>("mcq");
  const [newQStatement, setNewQStatement] = useState("");
  const [newQOptions, setNewQOptions] = useState<string[]>(["", "", ""]);
  const [newQTargets, setNewQTargets] = useState<string[]>(["", "", ""]);
  const [newQCorrectAnswer, setNewQCorrectAnswer] = useState("");
  const [newQPoints, setNewQPoints] = useState("2");
  const [newQExplanation, setNewQExplanation] = useState("");
  const [newQDifficulty, setNewQDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");

  const [questionSearchQuery, setQuestionSearchQuery] = useState("");

  // Share Exam modal details
  const [sharedCodeModal, setSharedCodeModal] = useState<{
    courseCode: string;
    examId: string;
    examTitle: string;
    courseTitle: string;
  } | null>(null);

  // Keyboard shortcuts cheat sheet modal & Only Hard Questions quick toggle
  const [showShortcutsCheatSheet, setShowShortcutsCheatSheet] = useState(false);
  const [showOnlyHardQuestions, setShowOnlyHardQuestions] = useState(false);

  // Computed filtered list of questions based on keyword search & difficulty quick toggle
  const filteredQuestions = questions.filter((q) => {
    if (showOnlyHardQuestions && q.difficulty !== "Hard") return false;
    if (!questionSearchQuery.trim()) return true;
    return q.statement.toLowerCase().includes(questionSearchQuery.toLowerCase());
  });

  // Interactive Question editing row IDs
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // AI Generation status
  const [aiGenerating, setAiGenerating] = useState(false);
  const [teacherExamTab, setTeacherExamTab] = useState<'editor'|'monitoring'|'analytics'>('editor');
  const [studentTab, setStudentTab] = useState<'activities' | 'analytics'>('activities');
  const [studentAnalytics, setStudentAnalytics] = useState<any>(null);
  const [loadingStudentAnalytics, setLoadingStudentAnalytics] = useState<boolean>(false);

  // Student active taking states
  const [activeQuizExam, setActiveQuizExam] = useState<Exam | null>(null);
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Question[]>([]);
  const [studentQuizAnswers, setStudentQuizAnswers] = useState<Record<string, any>>({});
  const [quizTimeRemaining, setQuizTimeRemaining] = useState<number>(0); // remaining in seconds
  const [quizTimerIntervalId, setQuizTimerIntervalId] = useState<any>(null);
  const [isFullscreenOn, setIsFullscreenOn] = useState(false);
  const [focusLossCount, setFocusLossCount] = useState<number>(0);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState<boolean>(false);
  const [examToStart, setExamToStart] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<number>(1);

  const logMonitoringEvent = async (type: string, details?: any) => {
    if (!activeQuizExam || !user) return;
    try {
      await fetch(`/api/exams/${activeQuizExam.id}/monitoring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: user.id, eventData: { type, details } })
      });
    } catch (e) {
      console.error("Failed to log monitoring event", e);
    }
  };

  // Listen for global and active quiz keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle shortcuts cheat sheet with '?' if pressed outside input states
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        activeEl.getAttribute("contenteditable") === "true"
      );

      // '?' key opens the cheat sheet
      if (e.key === "?") {
        if (!isTyping) {
          e.preventDefault();
          setShowShortcutsCheatSheet((prev) => !prev);
        }
      }

      // Quiz specific shortcuts helper
      if (activeQuizExam) {
        // Arrow Keys to navigate questions
        if (!isTyping) {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setCurrentQuestionIndex((prev) => {
              if (prev > 0) {
                setSlideDirection(-1);
                return prev - 1;
              }
              return prev;
            });
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setCurrentQuestionIndex((prev) => {
              if (prev < activeQuizQuestions.length - 1) {
                setSlideDirection(1);
                return prev + 1;
              }
              return prev;
            });
          }
        }

        // Ctrl + Enter to submit
        if (e.ctrlKey && e.key === "Enter") {
          e.preventDefault();
          submitStudentQuiz(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeQuizExam, activeQuizQuestions, currentQuestionIndex]);

  // Tab switching / Window Blur warnings during active quiz
  useEffect(() => {
    if (!activeQuizExam) {
      setFocusLossCount(0);
      return;
    }

    const handleVisibilityAndFocusChange = () => {
      if (document.hidden) {
        logMonitoringEvent("TAB_CHANGED");
        setFocusLossCount((prev) => {
          const next = prev + 1;
          triggerToast(`Alerte sécurité : Changement d'onglet ou réduction détectés (Signalement #${next}). Restez concentré sur votre examen !`, "error");
          return next;
        });
      }
    };

    const handleWindowBlur = () => {
      logMonitoringEvent("WINDOW_BLUR");
      setFocusLossCount((prev) => {
        const next = prev + 1;
        triggerToast(`Alerte focus : Vous perdez le focus de l'évaluation (Signalement #${next}). Veillez à ne pas quitter cet écran !`, "error");
        return next;
      });
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logMonitoringEvent("COPY_ATTEMPT");
      triggerToast("Le copier-coller est désactivé pendant l'examen.", "error");
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logMonitoringEvent("PASTE_ATTEMPT");
      triggerToast("Le copier-coller est désactivé pendant l'examen.", "error");
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logMonitoringEvent("RIGHT_CLICK_ATTEMPT");
      triggerToast("Le clic droit est désactivé pendant l'examen par mesure de sécurité.", "error");
    };

    const handleKeyDownForbidden = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        logMonitoringEvent("DEVTOOLS_ATTEMPT");
        triggerToast("L'ouverture des outils de développement est interdite pendant l'évaluation.", "error");
      }
      // Inspect shortcuts
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C" || e.key === "i" || e.key === "j" || e.key === "c")) {
        e.preventDefault();
        logMonitoringEvent("DEVTOOLS_ATTEMPT");
        triggerToast("L'inspection d'éléments est interdite pendant l'évaluation.", "error");
      }
      // View Source shortcut
      if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        logMonitoringEvent("DEVTOOLS_ATTEMPT");
        triggerToast("L'affichage du code source est interdit.", "error");
      }
      // Print shortcuts block
      if (e.ctrlKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        triggerToast("L'impression de la page est interdite.", "error");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityAndFocusChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDownForbidden, { capture: true });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityAndFocusChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDownForbidden, { capture: true });
    };
  }, [activeQuizExam, user]);

  // Auto-save student answers to localStorage in real-time
  useEffect(() => {
    if (user && activeQuizExam && Object.keys(studentQuizAnswers).length > 0) {
      localStorage.setItem(
        `eduquiz_answers_${user.id}_${activeQuizExam.id}`,
        JSON.stringify(studentQuizAnswers)
      );
    }
  }, [studentQuizAnswers, activeQuizExam, user]);

  // Student history & submissions state
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);

  // Detailed modal or reports
  const [selectedSubReport, setSelectedSubReport] = useState<any | null>(null);
  const [selectedSubReportQuestions, setSelectedSubReportQuestions] = useState<any[]>([]);
  const [proctoringReports, setProctoringReports] = useState<any[]>([]);
  const [aiExplanationText, setAiExplanationText] = useState<string>("");
  const [loadingAiExplanation, setLoadingAiExplanation] = useState<boolean>(false);
  const [loadingSubReport, setLoadingSubReport] = useState<boolean>(false);

  // Toast Alerts
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const triggerToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
  };

  // Synchronise full screen events (Esc key, exit fullscreen natively)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreenOn(isFull);
      if (!isFull && activeQuizExam) {
        logMonitoringEvent("FULLSCREEN_EXIT");
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [activeQuizExam, user]);

  const toggleFullscreen = () => {
    const el = document.getElementById("active-quiz-frame");
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen()
        .then(() => setIsFullscreenOn(true))
        .catch((err) => {
          triggerToast(`Échec du mode plein écran : ${err?.message || err}`, "error");
        });
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreenOn(false))
        .catch((err) => {
          triggerToast(`Échec du retour : ${err?.message || err}`, "error");
        });
    }
  };

  // Student exam summary manual PDF downloads
  const handleDownloadPDF = async (sub: any) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      
      // Header Banner color slate-900 (deep dark blue)
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 40, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("EduQuiz AI - Rapport d'Evaluation", 15, 25);
      
      doc.setTextColor(199, 210, 254);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Plateforme Integree d'Evaluations Academiques", 15, 33);
      
      // Document Metadata Info
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.text(`Rapport genere le : ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}`, 15, 50);
      
      // Academic details card
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(15, 55, 180, 52, "FD");
      
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("INFORMATIONS ACADEMIQUES", 20, 65);
      
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Identifiant Candidat : ${user?.email || "N/A"}`, 20, 74);
      doc.text(`Etablissement : ${user?.university || "Université Sorbonne Nouvelle"}`, 20, 80);
      doc.text(`Promotion / Classe : ${user?.schoolClass || "N/A"}`, 20, 86);
      doc.text(`Intitule du cours : ${sub.courseTitle || "N/A"}`, 20, 92);
      doc.text(`Examen : ${sub.examTitle || "N/A"}`, 20, 98);
      
      // Score block
      doc.setFillColor(240, 253, 250); // Emerald-50
      doc.setDrawColor(204, 251, 241);
      if (sub.score === null) {
        doc.setFillColor(255, 251, 235); // Amber-50
        doc.setDrawColor(253, 230, 138);
      }
      doc.rect(15, 114, 180, 45, "FD");
      
      doc.setTextColor(13, 148, 136); // Teal-600
      if (sub.score === null) {
        doc.setTextColor(217, 119, 6); // Amber-600
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("RESULTAT OBTENU", 20, 124);
      
      const statusText = sub.score === null ? "Correction en cours..." : "Copie corrigee & Validee";
      const scoreStr = sub.score === null ? "En attente de notation manuelle" : `${sub.score} / ${sub.totalPoints || 20} points`;
      
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Statut de correction : ${statusText}`, 20, 134);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`Note finale calculee : ${scoreStr}`, 20, 144);
      
      // Summary / Footer Message
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 175, 195, 175);
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Ce document constitue un justificatif officiel d'evaluation compile par la plateforme d'examens.", 15, 185);
      doc.text("Pour toute reclamation, veuillez contacter directement votre enseignant referent.", 15, 190);
      
      // Save
      doc.save(`Rapport_Examen_${(sub.examTitle || "Examen").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
      triggerToast("Votre récapitulatif PDF a été téléchargé avec succès !", "success");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      triggerToast("Une erreur est survenue lors de la génération du PDF", "error");
    }
  };

  // Export statistical report as a PDF for active exam
  const handleDownloadStatsPDF = async () => {
    if (!activeExam) return;
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      
      // Header Panel Slate (deep midnight shade)
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 40, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("EduQuiz AI - Rapport Statistique Examen", 15, 25);
      
      doc.setTextColor(199, 210, 254);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Donnes d'evaluation et distribution de reussite de promotion", 15, 33);
      
      // Metadata Details Group
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.text(`Genere le : ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}`, 15, 48);

      // Main stat board
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(15, 53, 180, 52, "FD");

      doc.setTextColor(79, 70, 229); // Indigo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("INFORMATIONS LIEES A L'EVALUATION", 20, 63);

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Examen : ${activeExam.title}`, 20, 72);
      doc.text(`Cours associe : ${activeCourse?.title || "N/A"}`, 20, 78);
      doc.text(`Duree reglementaire : ${activeExam.duration} minutes`, 20, 84);
      doc.text(`Statut actuel : ${activeExam.status === "published" ? "Publie en ligne" : "Brouillon"}`, 20, 90);
      doc.text(`Nombre total d'eleves inscrits : ${submissions.length}`, 20, 96);

      // Summary Statistics (Calculations)
      const totalSubs = submissions.length;
      const scores = submissions.map(s => s.score || 0);
      const avgScore = totalSubs > 0 ? (scores.reduce((a, b) => a + b, 0) / totalSubs) : 0;
      const highestScore = totalSubs > 0 ? Math.max(...scores) : 0;
      const lowestScore = totalSubs > 0 ? Math.min(...scores) : 0;
      
      // Count success rate (score >= 10/20)
      const successCount = scores.filter(s => s >= 10).length;
      const successPct = totalSubs > 0 ? ((successCount / totalSubs) * 100) : 0;

      // Stats numbers card
      doc.setFillColor(240, 253, 250); // Emerald fill
      doc.setDrawColor(204, 251, 241);
      doc.rect(15, 112, 180, 40, "FD");

      doc.setTextColor(13, 148, 136); // Teal-600
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("INDICATEURS GLOBAUX DE REUSSITE", 20, 122);

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Moyenne de classe : ${avgScore.toFixed(2)} / 20 pts`, 20, 131);
      doc.text(`Note maximale : ${highestScore.toFixed(1)} / 20 pts`, 20, 137);
      doc.text(`Note minimale : ${lowestScore.toFixed(1)} / 20 pts`, 20, 143);

      doc.text(`Taux d'admission (>= 10/20) : ${successPct.toFixed(1)}% (${successCount} admis)`, 110, 131);

      // Draw beautiful dynamic graphical bar for success rate
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(226, 232, 240);
      doc.rect(110, 136, 75, 6, "F"); // Background grey bar
      
      // Active progress colored bar (Teal representing green)
      doc.setFillColor(16, 185, 129); // Emerald-500
      const progressWidth = (successPct / 100) * 75;
      doc.rect(110, 136, progressWidth, 6, "F");

      // Student Listings Table Header
      let currentY = 162;
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("LISTE DETAILLEE DES APPRENANTS ET COMPOSITIONS", 15, currentY);
      
      currentY += 6;
      doc.setFillColor(15, 23, 42);
      doc.rect(15, currentY, 180, 8, "F"); // Header row background

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text("Etudiant (Identifiant)", 18, currentY + 5.5);
      doc.text("Date et Heure", 85, currentY + 5.5);
      doc.text("Score", 145, currentY + 5.5);
      doc.text("Statut", 170, currentY + 5.5);

      currentY += 8;
      
      // Rows represent active submissions
      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "normal");
      
      if (submissions.length === 0) {
        doc.text("Aucune composition n'a encore ete enregistree pour cet examen.", 18, currentY + 8);
      } else {
        submissions.forEach((sub, index) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }
          // Alternate backgrounds for striping
          if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(15, currentY, 180, 8, "F");
          }
          doc.setTextColor(30, 41, 59);
          doc.text(String(sub.studentEmail || sub.studentId || "Anonyme"), 18, currentY + 5.5);
          doc.text(sub.submittedAt ? new Date(sub.submittedAt).toLocaleString("fr-FR") : "En cours", 85, currentY + 5.5);
          
          const scoreStr = sub.score !== null ? `${sub.score.toFixed(1)} / 20` : "Correction requise";
          doc.text(scoreStr, 145, currentY + 5.5);
          
          const statusStr = sub.score !== null ? "Evalue" : "En attente";
          doc.text(statusStr, 170, currentY + 5.5);
          
          currentY += 8;
        });
      }

      doc.save(`EduQuiz_Stats_${activeExam.title.replace(/\s+/g, "_")}.pdf`);
      triggerToast("Le rapport de statistiques de l'examen a été généré en format PDF.", "success");
    } catch (err) {
      console.error("PDF statistical generation failed:", err);
      triggerToast("Echec de la generation du rapport PDF.", "error");
    }
  };

  // On initialization, read potential cached user from session
  useEffect(() => {
    const saved = localStorage.getItem("eduquiz_user");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setUser(u);
      } catch {
        localStorage.removeItem("eduquiz_user");
      }
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    localStorage.setItem("eduquiz_user", JSON.stringify(authenticatedUser));
    triggerToast(`Ravi de vous revoir ! Connecté en tant que ${authenticatedUser.email}`, "success");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("eduquiz_user");
    setActiveCourse(null);
    setActiveExam(null);
    setActiveQuizExam(null);
    triggerToast("Déconnexion réussie. À bientôt !", "info");
  };

  // Load teacher or student general data when user or tabs change
  useEffect(() => {
    if (!user) return;
    if (user.role === "teacher") {
      fetchCoursesForTeacher();
    } else {
      fetchStudentCourses();
      fetchStudentSubmissionsData();
      fetchStudentAnalytics();
    }
  }, [user]);

  // Load active exam context (questions, submissions) if selected
  useEffect(() => {
    if (!activeExam) return;
    fetchQuestionsForExam(activeExam.id);
    fetchSubmissionsForExam(activeExam.id);
  }, [activeExam]);

  // Handle active countdown timer when quiz is running
  useEffect(() => {
    if (activeQuizExam && quizTimeRemaining > 0) {
      const interval = setInterval(() => {
        setQuizTimeRemaining((p) => {
          if (p <= 1) {
            clearInterval(interval);
            triggerQuizAutoSubmit();
            return 0;
          }
          return p - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeQuizExam, quizTimeRemaining]);

  const fetchCoursesForTeacher = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/courses?teacherId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStudentCourses = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/courses/student/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStudentSubmissionsData = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/students/${user.id}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setStudentSubmissions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStudentAnalytics = async () => {
    if (!user) return;
    setLoadingStudentAnalytics(true);
    try {
      const res = await fetch(`/api/students/${user.id}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setStudentAnalytics(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudentAnalytics(false);
    }
  };

  const handleViewSubmissionDetails = async (sub: any) => {
    setLoadingSubReport(true);
    setSelectedSubReport(null);
    setSelectedSubReportQuestions([]);
    setAiExplanationText("");
    try {
      const res = await fetch(`/api/submissions/${sub.id}/details`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSubReport(data.submission);
        setSelectedSubReportQuestions(data.questions || []);
        
        // Auto-fetch tutor AI explanation right away
        handleFetchAiExplanation(sub.id);

        // Smooth scroll to the submission detailed analysis card
        setTimeout(() => {
          const card = document.getElementById("submission-detail-card");
          if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 150);
      } else {
        triggerToast("Impossible de charger les détails du rapport.", "error");
      }
    } catch {
      triggerToast("Erreur de réseau lors de la récupération du rapport.", "error");
    } finally {
      setLoadingSubReport(false);
    }
  };

  const handleFetchAiExplanation = async (subId: string) => {
    setLoadingAiExplanation(true);
    setAiExplanationText("");
    try {
      const res = await fetch(`/api/submissions/${subId}/ai-explain`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setAiExplanationText(data.explanation || "Aucune explication générée par l'IA.");
        triggerToast("Explication IA générée !", "success");
      } else {
        triggerToast("Erreur réseau du tuteur IA.", "error");
      }
    } catch {
      triggerToast("Erreur réseau.", "error");
    } finally {
      setLoadingAiExplanation(false);
    }
  };

  const fetchQuestionsForExam = async (examId: string) => {
    try {
      const res = await fetch(`/api/exams/${examId}/questions`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubmissionsForExam = async (examId: string) => {
    try {
      const res = await fetch(`/api/exams/${examId}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
      const procRes = await fetch(`/api/exams/${examId}/monitoring`);
      if (procRes.ok) {
        const procData = await procRes.json();
        setProctoringReports(procData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportGradesCSV = async () => {
    if (!activeCourse) return;
    try {
      const res = await fetch(`/api/courses/${activeCourse.id}/grades-export`);
      if (!res.ok) {
        triggerToast("Erreur lors de la récupération des notes.", "error");
        return;
      }
      const data = await res.json();
      const exams = data.exams || [];
      const students = data.students || [];

      // CSV columns mapping with French headers
      const headers = [
        "Etudiant ID",
        "Adresse Email",
        "Etablissement",
        "Classe_Section",
        "Moyenne_Generale_Sur_20",
        "Theorie_Concepts_Pct",
        "Logique_Diagnostic_Pct",
        "Appariement_Syntaxe_Pct",
        "Calculs_Analyse_Pct",
        "Demonstration_Redaction_Pct"
      ];

      // Add headers for individual exams
      exams.forEach((ex: any) => {
        headers.push(`Examen_${ex.title.replace(/[^a-zA-Z0-9]/g, "_")}`);
      });

      // Construct rows array
      const csvRows = [headers.join(",")];

      students.forEach((st: any) => {
        const row = [
          `"${st.id}"`,
          `"${st.email}"`,
          `"${st.university}"`,
          `"${st.schoolClass}"`,
          st.overallAverage !== null ? st.overallAverage : "N/A",
          st.themes["Théorie & Concepts"] !== null ? `${st.themes["Théorie & Concepts"]}%` : "N/A",
          st.themes["Logique & Diagnostic"] !== null ? `${st.themes["Logique & Diagnostic"]}%` : "N/A",
          st.themes["Appariement & Syntaxe"] !== null ? `${st.themes["Appariement & Syntaxe"]}%` : "N/A",
          st.themes["Calculs & Analyse"] !== null ? `${st.themes["Calculs & Analyse"]}%` : "N/A",
          st.themes["Démonstration & Rédaction"] !== null ? `${st.themes["Démonstration & Rédaction"]}%` : "N/A"
        ];

        // Individual exam scores
        exams.forEach((ex: any) => {
          const score = st.examScores[ex.id];
          if (score === "PENDING") {
            row.push('"Correction en cours"');
          } else if (score === null || score === undefined) {
            row.push('"Absent"');
          } else {
            row.push(score);
          }
        });

        csvRows.push(row.join(","));
      });

      // Join with standard newline & prepend BOM for French Excel compatibility
      const csvContent = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${activeCourse.title.replace(/[^a-zA-Z0-9]/g, "_")}_Notes_Matiere.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      triggerToast("Notes exportées au format CSV avec succès !", "success");
    } catch (e) {
      console.error(e);
      triggerToast("Erreur réseau lors de l'export des notes.", "error");
    }
  };

  // Create Course (Teacher)
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: user?.id,
          title: newCourseTitle,
          description: newCourseDesc,
          category: newCourseCategory,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCourses((prev) => [data, ...prev]);
        setIsCreatingCourse(false);
        setNewCourseTitle("");
        setNewCourseDesc("");
        setNewCourseCategory("");
        triggerToast(`Cours "${data.title}" créé ! Code d'accès : ${data.code}`, "success");
      } else {
        triggerToast("Échec de la création du cours.", "error");
      }
    } catch {
      triggerToast("Erreur serveur.", "error");
    }
  };

  // Update Course Folder Tag / Category
  const handleUpdateCourseCategory = async (courseId: string, categoryVal: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryVal }),
      });

      if (res.ok) {
        const updatedCourse = await res.json();
        setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, category: updatedCourse.category } : c)));
        if (activeCourse && activeCourse.id === courseId) {
          setActiveCourse((p) => (p ? { ...p, category: updatedCourse.category } : null));
        }
        setEditingCourseForCategory(null);
        setEditingCategoryValue("");
        triggerToast("Dossier / Catégorie mis à jour !", "success");
      } else {
        triggerToast("Échec de la mise à jour.", "error");
      }
    } catch {
      triggerToast("Erreur serveur.", "error");
    }
  };

  // Floating Assistant AI Chat widget action
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((p) => [...p, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, { role: "user", content: userMsg }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((p) => [...p, { role: "assistant", content: data.text }]);
      } else {
        triggerToast("Échec de connexion avec l'assistant.", "error");
      }
    } catch {
      triggerToast("Erreur serveur de communication.", "error");
    } finally {
      setChatLoading(false);
    }
  };

  // Create Exam (Teacher)
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim() || !activeCourse) return;

    // Durations validation
    const parsedDuration = parseInt(examDuration, 10);
    if (!examDuration || isNaN(parsedDuration) || parsedDuration <= 0) {
      triggerToast("La durée de composition est invalide. Veuillez saisir un nombre de minutes positif supérieur à zéro.", "error");
      return;
    }
    if (parsedDuration < 5) {
      triggerToast("La durée de composition minimale autorisée est de 5 minutes.", "error");
      return;
    }

    // Start date in the past validation
    if (examStartDate) {
      const selectedDate = new Date(examStartDate);
      const now = new Date();
      // Allow a small 1-minute buffer for user action latency
      if (selectedDate.getTime() < now.getTime() - 60000) {
        triggerToast("La date et l'heure de début programmée ne peuvent pas se situer dans le passé.", "error");
        return;
      }
    }

    try {
      const res = await fetch(`/api/courses/${activeCourse.id}/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: examTitle,
          duration: examDuration,
          startDate: examStartDate || new Date().toISOString(),
          subjectText: examSubject,
          solutionText: examSolution,
          gradingScaleText: examGradingScale,
          monitoringConfig: examMonitoringConfig
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExams((prev) => [data, ...prev]);
        setIsCreatingExam(false);
        // auto open generated exam details
        setActiveExam(data);

        const subjText = examSubject;
        setExamTitle("");
        setExamSubject("");
        setExamSolution("");

        if (subjText.trim()) {
          triggerToast("Examen configuré ! Génération automatique du Quiz par l'IA en cours...", "info");
          try {
            const genRes = await fetch(`/api/exams/${data.id}/generate`, {
              method: "POST"
            });
            const genData = await genRes.json();
            if (genRes.ok) {
              setQuestions(genData.questions || []);
              triggerToast(genData.message || "Quiz généré avec succès !", "success");
              const checkExam = await fetch(`/api/exams/${data.id}`);
              if (checkExam.ok) {
                const freshEx = await checkExam.json();
                setActiveExam(freshEx);
              }
            } else {
              triggerToast(genData.error || "Échec de la génération automatique du quiz.", "error");
            }
          } catch (e) {
            triggerToast("Erreur de connexion lors de la génération automatique.", "error");
          }
        } else {
          triggerToast("Examen configuré ! Vous pouvez maintenant générer le quiz.", "success");
        }
      } else {
        triggerToast("Erreur lors de la configuration de l'examen.", "error");
      }
    } catch (e) {
      triggerToast("Erreur de connexion.", "error");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>, extractionType: "subject" | "solution" = "subject") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain" || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setter(evt.target?.result as string);
        triggerToast("Fichier texte chargé avec succès.", "success");
      };
      reader.readAsText(file);
    } else {
      triggerToast("Extraction du contenu en cours...", "info");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", extractionType);

      try {
        const res = await fetch("/api/extract-text", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setter(data.text || "");
          triggerToast("Contenu extrait et chargé avec succès.", "success");
        } else {
          const err = await res.json();
          triggerToast(err.error || "Erreur lors de l'extraction.", "error");
        }
      } catch (err) {
        triggerToast("Erreur de connexion lors de l'extraction.", "error");
      }
    }
    // reset target value so the same file can be uploaded again if needed
    e.target.value = "";
  };

  // Launch AI Moodle-like question generator
  const handleAiGeneration = async () => {
    if (!activeExam) return;
    setAiGenerating(true);
    triggerToast("Analyse des documents sémantiques par l'IA en cours... (Génération de questions complexes Moodle)", "info");

    try {
      const res = await fetch(`/api/exams/${activeExam.id}/generate`, {
        method: "POST"
      });

      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions || []);
        triggerToast(data.message || "Génération réussie !", "success");
        // refresh exam statistics
        const checkExam = await fetch(`/api/exams/${activeExam.id}`);
        if (checkExam.ok) {
          const freshEx = await checkExam.json();
          setActiveExam(freshEx);
        }
      } else {
        triggerToast(data.error || "L'IA a échoué à structurer l'examen.", "error");
      }
    } catch (e) {
      triggerToast("Une erreur critique est survenue lors de l'appel IA.", "error");
    } finally {
      setAiGenerating(false);
    }
  };

  // Join Course (Student) & Quick Direct-Link assessment support
  const handleJoinCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputCode = joinCode.trim();
    if (!inputCode) return;

    // Direct assessment code structure: COURSECODE-EXAMID
    const parts = inputCode.split("-");
    let targetCourseCode = inputCode;
    let targetExamId: string | null = null;

    if (parts.length >= 2 && parts[1].startsWith("exam_")) {
      targetCourseCode = parts[0];
      targetExamId = parts.slice(1).join("-");
    }

    try {
      const res = await fetch("/api/courses/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user?.id,
          code: targetCourseCode,
        }),
      });

      const data = await res.json();
      const alreadyJoined = res.status === 400 && data.error && data.error.includes("déjà inscrit");

      if (res.ok || alreadyJoined) {
        if (res.ok) {
          triggerToast(data.message || "Inscription au cours réussie !", "success");
        }
        setJoinCode("");
        fetchStudentCourses();

        // If exam direct joining code was presented
        if (targetExamId) {
          try {
            const examRes = await fetch(`/api/exams/${targetExamId}?studentId=${user?.id}`);
            if (examRes.ok) {
              const examObj = await examRes.json();
              if (examObj.status !== "published") {
                triggerToast("Cette évaluation est actuellement au format Brouillon et indisponible.", "error");
                return;
              }
              triggerToast(`Accès direct : ${examObj.title}`, "success");
              await proceedStartExamQuiz(examObj);
            } else {
              const errObj = await examRes.json();
              triggerToast(errObj.error || "Activité d'évaluation indisponible ou accès refusé.", "error");
            }
          } catch {
            triggerToast("Erreur lors de l'accès à l'évaluation.", "error");
          }
        }
      } else {
        triggerToast(data.error || "Impossible de s'inscrire.", "error");
      }
    } catch {
      triggerToast("Erreur serveur de jointure.", "error");
    }
  };

  // Manual Question Addition
  const handleManualAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExam) return;

    // Serialize options or answers if needed depending on type
    let cleanOptions = newQOptions.filter((o) => o.trim() !== "");
    let cleanTargets = newQTargets.filter((o) => o.trim() !== "");

    try {
      const res = await fetch(`/api/exams/${activeExam.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newQType,
          statement: newQStatement,
          options: cleanOptions,
          matchingTargets: cleanTargets,
          correctAnswer: newQCorrectAnswer,
          points: newQPoints,
          explanation: newQExplanation,
          difficulty: newQDifficulty,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuestions((prev) => [...prev, data]);
        setIsAddingQuestion(false);
        setNewQStatement("");
        setNewQCorrectAnswer("");
        setNewQExplanation("");
        setNewQDifficulty("Medium");
        triggerToast("Nouvelle question ajoutée !", "success");
      } else {
        triggerToast("Erreur d'ajout.", "error");
      }
    } catch (err) {
      triggerToast("Erreur.", "error");
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (qId: string) => {
    if (!safeConfirm("Voulez-vous vraiment supprimer cette question ?")) return;

    try {
      const res = await fetch(`/api/questions/${qId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== qId));
        triggerToast("Question supprimée.", "info");
      }
    } catch (e) {
      triggerToast("Erreur lors de la suppression.", "error");
    }
  };

  // Edit inline question update
  const handleSaveQuestionEdit = async (updatedQ: Question) => {
    try {
      const res = await fetch(`/api/questions/${updatedQ.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedQ),
      });

      if (res.ok) {
        const data = await res.json();
        setQuestions((p) => p.map((q) => (q.id === data.id ? data : q)));
        setEditingQuestionId(null);
        triggerToast("Modifications de la question enregistrées !", "success");
      } else {
        triggerToast("Erreur lors de la mise à jour.", "error");
      }
    } catch {
      triggerToast("Erreur.", "error");
    }
  };

  // Update Exam settings (Publish or Draft state)
  const handleToggleExamStatus = async (status: "draft" | "published") => {
    if (!activeExam) return;
    try {
      const res = await fetch(`/api/exams/${activeExam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveExam((p) => (p ? { ...p, status: data.status } : null));
        triggerToast(status === "published" ? "Examen publié avec succès aux élèves !" : "Examen repassé en brouillon.", "success");
      }
    } catch {
      triggerToast("Une erreur est survenue.", "error");
    }
  };

  // Select active course to view exams inside it
  const selectCourse = async (course: Course) => {
    setActiveCourse(course);
    setActiveExam(null);
    try {
      const res = await fetch(`/api/courses/${course.id}/exams`);
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteExam = async (examId: string) => {
    if (!safeConfirm("Voulez-vous supprimer définitivement cet examen ainsi que toutes ses questions et copies associées ?")) return;
    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setExams(prev => prev.filter(e => e.id !== examId));
        setActiveExam(null);
        triggerToast("Examen effacé définitivement.", "info");
      }
    } catch (e) {
      console.error("[Quiz System] startExamQuiz fatal error:", e);
      triggerToast(`Erreur au démarrage : ${e instanceof Error ? e.message : 'Une erreur est survenue.'}`, "error");
    }
  }

  // STUDENT EXAM PASSATION LOGIC
  const startExamQuiz = (examObj: Exam) => {
    setExamToStart(examObj);
  };

  const proceedStartExamQuiz = async (examObj: Exam) => {
    try {
      const res = await fetch(`/api/exams/${examObj.id}/questions?studentId=${user?.id}`);
      if (res.ok) {
        const qList = await res.json();
        if (qList.length === 0) {
          triggerToast("Cet examen ne comporte pas encore de questions. Veuillez contacter votre enseignant.", "error");
          return;
        }

        // Initialize state
        setActiveQuizExam(examObj);
        setActiveQuizQuestions(qList);
        setQuizTimeRemaining(examObj.duration * 60);
        setCurrentQuestionIndex(0);
        setSlideDirection(1);

        // Check for auto-saved progress
        let savedAnswers = {};
        if (user) {
          const savedStr = localStorage.getItem(`eduquiz_answers_${user.id}_${examObj.id}`);
          if (savedStr) {
            try {
              savedAnswers = JSON.parse(savedStr);
              triggerToast("Copie restaurée ! Vos réponses précédentes ont été récupérées.", "success");
            } catch (e) {
              console.error("Failed to parse saved answers", e);
            }
          }
        }
        setStudentQuizAnswers(savedAnswers);
        setIsFullscreenOn(true); // default premium look
        triggerToast("Examen commencé ! Bon courage !", "info");
      } else {
        const errObj = await res.json();
        triggerToast(errObj.error || "Accès refusé. Seuls les étudiants inscrits dans le cours ont accès à cet examen.", "error");
      }
    } catch (e) {
      console.error("[Quiz System] startExamQuiz fatal error:", e);
      triggerToast(`Erreur au démarrage : ${e instanceof Error ? e.message : 'Une erreur est survenue.'}`, "error");
    }
  };

  const isQuestionAnswered = (q: Question) => {
    const ans = studentQuizAnswers[q.id];
    if (ans === undefined || ans === null) return false;
    if (typeof ans === "string" && ans.trim() === "") return false;
    if (q.type === "matching") {
      const opts = q.options || [];
      if (opts.length === 0) return false;
      const subAnswers = ans || {};
      return opts.every((opt) => subAnswers[opt] && subAnswers[opt].trim() !== "");
    }
    return true;
  };

  const getUnansweredQuestions = () => {
    return activeQuizQuestions.filter((q) => !isQuestionAnswered(q));
  };

  const triggerQuizAutoSubmit = () => {
    triggerToast("Temps écoulé ! Votre copie va être soumise automatiquement...", "info");
    submitStudentQuiz(true);
  };

  const submitStudentQuiz = async (force = false) => {
    if (!activeQuizExam) return;

    if (!force) {
      setShowSubmitConfirmation(true);
      return;
    }

    try {
      setShowSubmitConfirmation(false);
      const res = await fetch(`/api/exams/${activeQuizExam.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user?.id,
          answers: studentQuizAnswers,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (user && activeQuizExam) {
          localStorage.removeItem(`eduquiz_answers_${user.id}_${activeQuizExam.id}`);
        }
        triggerToast("Votre examen a été transmis et corrigé avec succès !", "success");
        setSelectedSubReport(data);
        setSelectedSubReportQuestions(questions || []);
        setAiExplanationText("");
        setActiveQuizExam(null);
        setIsFullscreenOn(false);
        fetchStudentSubmissionsData(); // refresh history
        fetchStudentAnalytics(); // refresh analytics
      } else {
        triggerToast(data.error || "Échec de la soumission.", "error");
      }
    } catch {
      triggerToast("Erreur réseau.", "error");
    }
  };

  const handleStudentAnswerChange = (qId: string, value: any) => {
    setStudentQuizAnswers((prev) => ({
      ...prev,
      [qId]: value,
    }));
  };

  // TEACHER EVALUATES / GRADES ESSAYS (Composition)
  const submitTeacherEssayGrade = async (submissionId: string, questionId: string, pointsClaimed: number, gradeComment: string) => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          score: pointsClaimed,
          comment: gradeComment,
        }),
      });

      if (res.ok) {
        const updatedSub = await res.json();
        // Update local arrays
        setSubmissions((prev) => prev.map((s) => (s.id === updatedSub.id ? { ...s, ...updatedSub } : s)));
        setTeacherSelectedSub((prev: any) => (prev && prev.id === updatedSub.id ? { ...prev, ...updatedSub } : prev));
        triggerToast("Note de composition enregistrée et barème recalculé !", "success");
      } else {
        triggerToast("Échec de l'enregistrement de la note.", "error");
      }
    } catch {
      triggerToast("Erreur serveur.", "error");
    }
  };

  const renderTeacherAnalytics = () => {
    if (!activeExam) return null;
    const examSubmissions = submissions.filter(s => s.examId === activeExam.id);
    const gradedSubmissions = examSubmissions.filter(s => s.score !== null);
    const examQuestions = questions.filter(q => q.type !== 'description');
    const totalPoints = examQuestions.reduce((sum, q) => sum + (q.points || 1), 0);
    const normalizedScores = gradedSubmissions.map(s => (s.score / (totalPoints || 1)) * 20);
    const classAverage = normalizedScores.length > 0 ? parseFloat((normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length).toFixed(1)) : 0;
    const maxScore = normalizedScores.length > 0 ? parseFloat(Math.max(...normalizedScores).toFixed(1)) : 0;
    const minScore = normalizedScores.length > 0 ? parseFloat(Math.min(...normalizedScores).toFixed(1)) : 0;
    const passRate = normalizedScores.length > 0 ? parseFloat(((normalizedScores.filter(s => s >= 10).length / normalizedScores.length) * 100).toFixed(1)) : 0;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-xs text-slate-400 font-semibold uppercase">Moyenne de classe</span>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">{classAverage} <span className="text-sm font-normal text-slate-400">/ 20</span></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-xs text-slate-400 font-semibold uppercase">Note maximale</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{maxScore} <span className="text-sm font-normal text-slate-400">/ 20</span></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-xs text-slate-400 font-semibold uppercase">Note minimale</span>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">{minScore} <span className="text-sm font-normal text-slate-400">/ 20</span></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-xs text-slate-400 font-semibold uppercase">Taux de réussite</span>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">{passRate}%</div>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return <AuthPage onSuccess={handleAuthSuccess} />;
  }

  if (user.role === "admin") {
    return <AdminDashboard user={user} onLogout={handleLogout} darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-all">
      <div className="print:hidden pb-[1px]">
        <Navbar
          user={user}
          onLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            pushHistory();
            setActiveTab(tab);
          }}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      </div>

      {/* Navigation History Back Button Banner */}
      {navHistory.length > 0 && user && (
        <div className="max-w-7xl w-full mx-auto px-4 pt-4 print:hidden">
          <button
            type="button"
            onClick={handleGoBack}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-850 transition cursor-pointer"
            title="Revenir à l'écran précédent"
          >
            <ChevronLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Précédent ({navHistory.length})</span>
          </button>
        </div>
        )}
      
      {/* Toast Alert bar */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Auth Screen fallback if no active session */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 print:hidden">
          <div className="flex-1 flex flex-col space-y-6">
          {/* ========================================================
              STUDENT ACTIVE ISOLATED FULLSCALE EXAM TAKING VIEW 
             ======================================================== */}
          {activeQuizExam && (
            <div id="active-quiz-frame" className="bg-white rounded-2xl shadow-xl border-t-4 border-indigo-600 overflow-hidden my-4 max-w-7xl mx-auto relative min-h-[500px]">
              {/* Mandatory Fullscreen Proctoring Overlay */}
              {!isFullscreenOn && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-8 text-center text-white">
                  <div className="max-w-md space-y-6 animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/30">
                      <ShieldAlert className="w-8 h-8 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tight">Mode Plein Écran Obligatoire</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Pour garantir l'équité et l'intégrité de l'évaluation, vous devez impérativement rester en mode plein écran.
                        La sortie du plein écran ou le changement d'onglet est enregistré comme une anomalie par le système d'E-Proctoring.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 mx-auto hover:scale-105 active:scale-95 duration-150"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Réactiver le mode Plein Écran</span>
                    </button>
                  </div>
                </div>
               )}
              {/* Header with Progress Bar */}
              <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-[10px] bg-indigo-500 font-mono tracking-wider text-indigo-50 px-2 py-0.5 rounded-md font-bold uppercase shrink-0">
                      Examen en cours
                    </span>
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-300 font-extrabold px-2.5 py-0.5 rounded-md border border-slate-700 hover:border-slate-600 transition flex items-center gap-1 cursor-pointer focus:outline-none shrink-0"
                    >
                      {isFullscreenOn ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                      <span>{isFullscreenOn ? "Quitter Plein" : "Plein Écran"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowShortcutsCheatSheet(true)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-md border border-slate-700 hover:border-slate-600 transition flex items-center gap-1 cursor-pointer focus:outline-none shrink-0"
                      title="Afficher les raccourcis clavier (?)"
                    >
                      <span>⌨️ Raccourcis (?)</span>
                    </button>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight mt-1">{activeQuizExam.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Veillez à ne pas quitter ou fermer l'onglet. Cliquez sur ⌨️ pour les raccourcis.</p>
                </div>

                {(() => {
                  const totalQuizSecs = activeQuizExam ? activeQuizExam.duration * 60 : 1;
                  const remainingPercent = Math.min(100, Math.max(0, (quizTimeRemaining / totalQuizSecs) * 100));

                  let barColorClass = "bg-emerald-400";
                  if (quizTimeRemaining <= 60) {
                    barColorClass = "bg-rose-600 animate-pulse";
                  } else if (quizTimeRemaining <= 300) {
                    barColorClass = "bg-orange-500";
                  } else if (quizTimeRemaining <= 900) {
                    barColorClass = "bg-amber-400";
                  }

                  return (
                    <div className="flex flex-col space-y-2 w-full md:w-64">
                      {/* Dynamic Visual Progress Bar */}
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
                        <span>TEMPS RESTANT</span>
                        <span className="text-indigo-400">{Math.round(remainingPercent)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700 p-[1px]">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColorClass}`}
                          style={{ width: `${remainingPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center space-x-3 bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-700 font-mono justify-center">
                        <Clock className={`w-4 h-4 text-indigo-400 ${quizTimeRemaining <= 300 ? "animate-pulse text-rose-500 font-bold" : "animate-spin"}`} />
                        <div className="text-right flex items-center gap-2">
                          <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">RESTANT :</p>
                          <span className={`text-sm font-bold ${quizTimeRemaining <= 60 ? "text-rose-500 font-extrabold" : "text-slate-100"}`}>
                            {Math.floor(quizTimeRemaining / 60)}m {quizTimeRemaining % 60}s
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Instructions Bar */}
              <div className="bg-amber-50 text-amber-900 border-b border-amber-100 p-4 shrink-0 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Consignes importantes :</strong> Les questions ci-dessous sont issues du sujet et barème officiels. Votre progression est enregistrée en continu. Lorsque le chronomètre atteindra 00:00, vos réponses seront archivées d'office.
                </div>
              </div>

              {/* Main Content Grid: Left=Questions, Right=Side feedback panel */}
              <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8 items-start">
                
                {/* Questions Iteration passation on Left (complex layout, gets 2/3 of space) */}
                <div className="flex-1 space-y-8 divide-y divide-slate-100 w-full lg:max-w-4xl">
                  
                  {/* Warning banner inside the active quiz panel if tab focused out */}
                  {focusLossCount > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3 text-rose-900 text-xs animate-fade-in mb-6">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold uppercase tracking-wider text-rose-900">⚠️ Signalement : Activité suspecte détectée</span>
                        <p className="mt-1 leading-relaxed text-rose-800">
                          La fenêtre d'évaluation a perdu le focus ou un changement d'onglet est survenu <strong>{focusLossCount} fois</strong>.
                          Pour préserver l'équité intellectuelle des résultats d'examens, ces déviations sont enregistrées de façon permanente dans le rapport de correction.
                          Veuillez rester sur l'onglet d'évaluation pour éviter toute pénalité.
                        </p>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const q = activeQuizQuestions[currentQuestionIndex];
                    if (!q) return null;
                    return (
                      <div className="w-full">
                        <div className="relative overflow-hidden w-full min-h-[360px]">
                          <AnimatePresence initial={false} mode="wait" custom={slideDirection}>
                            <motion.div
                              key={currentQuestionIndex}
                              custom={slideDirection}
                              variants={{
                                enter: (dir: number) => ({
                                  x: dir > 0 ? 160 : -160,
                                  opacity: 0
                                }),
                                center: {
                                  x: 0,
                                  opacity: 1
                                },
                                exit: (dir: number) => ({
                                  x: dir > 0 ? -160 : 160,
                                  opacity: 0
                                })
                              }}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{
                                x: { type: "tween", duration: 0.22, ease: "easeInOut" },
                                opacity: { duration: 0.18 }
                              }}
                              className="w-full"
                            >
                              <div className="pt-2">
                                <div className="flex justify-between items-start mb-3">
                                  <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                                    Question {currentQuestionIndex + 1} / {activeQuizQuestions.length}
                                  </span>
                                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                                    {q.points} pt{q.points > 1 ? "s" : ""}
                                  </span>
                                </div>

                                <div className="text-sm md:text-base font-semibold text-slate-905 mb-4 leading-relaxed">
                                  <MathRenderer text={q.statement} />
                                </div>

                                {/* Render Interactive Fields according to Question Type */}
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-4 shadow-2xs">
                                  {/* MCQ Type */}
                                  {q.type === "mcq" && (
                                    <div className="space-y-2">
                                      {(q.options || []).map((opt) => (
                                        <label
                                          key={opt}
                                          className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                                            studentQuizAnswers[q.id] === opt
                                              ? "bg-indigo-50/75 border-indigo-300 text-indigo-900 font-semibold"
                                              : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`q_${q.id}`}
                                            checked={studentQuizAnswers[q.id] === opt}
                                            onChange={() => handleStudentAnswerChange(q.id, opt)}
                                            className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                                          />
                                          <span className="text-sm"><MathRenderer text={opt} /></span>
                                        </label>
                                      ))}
                                    </div>
                                 )}

                                  {/* True or False */}
                                  {q.type === "true_false" && (
                                    <div className="flex space-x-3">
                                      {[
                                        { value: "true", label: "VRAI" },
                                        { value: "false", label: "FAUX" },
                                      ].map((tf) => (
                                        <button
                                          key={tf.value}
                                          type="button"
                                          onClick={() => handleStudentAnswerChange(q.id, tf.value)}
                                          className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold tracking-wider transition cursor-pointer ${
                                            studentQuizAnswers[q.id] === tf.value
                                              ? tf.value === "true"
                                                ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                                                : "bg-rose-500 text-white border-rose-600 shadow-sm"
                                              : "bg-white text-slate-600 hover:text-slate-950 hover:bg-slate-100 border-slate-200"
                                          }`}
                                        >
                                          {tf.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {/* Matching Type */}
                                  {q.type === "matching" && (
                                    <div className="space-y-3">
                                      <p className="text-xs text-slate-400 font-mono mb-2">Reliez chaque concept de gauche à sa cible de droite correspondante :</p>
                                      {(q.options || []).map((keyItem) => {
                                        const currentChoice = studentQuizAnswers[q.id]?.[keyItem] || "";
                                        return (
                                          <div key={keyItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-100">
                                            <span className="text-sm font-semibold text-slate-800">{keyItem}</span>
                                            <select
                                              value={currentChoice}
                                              onChange={(e) => {
                                                const nextMatches = { ...(studentQuizAnswers[q.id] || {}) };
                                                nextMatches[keyItem] = e.target.value;
                                                handleStudentAnswerChange(q.id, nextMatches);
                                              }}
                                              className="text-xs border border-slate-200 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500 max-w-xs"
                                            >
                                              <option value="">Sélectionner l'appariement...</option>
                                              {(q.matchingTargets || []).map((target) => (
                                                <option key={target} value={target}>
                                                  {target}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Short Answer */}
                                  {q.type === "short_answer" && (
                                    <div>
                                      <input
                                        type="text"
                                        placeholder="Saisissez votre réponse courte ici..."
                                        value={studentQuizAnswers[q.id] || ""}
                                        onChange={(e) => handleStudentAnswerChange(q.id, e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
                                      />
                                    </div>
                                  )}

                                  {/* Numerical */}
                                  {q.type === "numerical" && (
                                    <div>
                                      <input
                                        type="number"
                                        placeholder="Entrez une valeur numérique..."
                                        value={studentQuizAnswers[q.id] || ""}
                                        onChange={(e) => handleStudentAnswerChange(q.id, e.target.value)}
                                        className="w-full max-w-xs px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                                      />
                                    </div>
                                  )}

                                  {/* Cloze (Texte à trous) */}
                                  {q.type === "cloze" && (
                                    <div className="space-y-3">
                                      <p className="text-xs font-mono text-slate-400 mb-2">Examinez le texte ci-dessous et remplissez les valeurs manquantes :</p>
                                      <div className="bg-white p-4 rounded-lg border border-slate-100 text-sm leading-relaxed text-slate-800">
                                        {/* Parse curly brackets inline choice */}
                                        {q.statement.includes("{") ? (
                                          <span>
                                            {q.statement.split(new RegExp("({[^}]+})", "g")).map((chunk, cidx) => {
                                              if (chunk.startsWith("{") && chunk.endsWith("}")) {
                                                // Extract internal options list
                                                const optsInside = chunk.slice(1, -1).split("|");
                                                return (
                                                  <select
                                                    key={cidx}
                                                    value={studentQuizAnswers[q.id] || ""}
                                                    onChange={(e) => handleStudentAnswerChange(q.id, e.target.value)}
                                                    className="mx-1 p-1 border border-indigo-200 bg-indigo-50 text-indigo-900 rounded font-bold text-xs"
                                                  >
                                                    <option value="">[...]</option>
                                                    {optsInside.map((o) => (
                                                      <option key={o} value={o}>
                                                        {o}
                                                      </option>
                                                    ))}
                                                  </select>
                                                );
                                              }
                                              return chunk;
                                            })}
                                          </span>
                                        ) : (
                                          <div className="space-y-2">
                                            <span className="block text-xs text-slate-400 mb-1">Mot clé de remplacement :</span>
                                            <input
                                              type="text"
                                              placeholder="Mot manquant..."
                                              value={studentQuizAnswers[q.id] || ""}
                                              onChange={(e) => handleStudentAnswerChange(q.id, e.target.value)}
                                              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Essay (Composition) */}
                                  {q.type === "essay" && (
                                    <div>
                                      <textarea
                                        rows={6}
                                        placeholder="Rédigez votre démonstration ou développement complet ici..."
                                        value={studentQuizAnswers[q.id] || ""}
                                        onChange={(e) => handleStudentAnswerChange(q.id, e.target.value)}
                                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
                                      />
                                      <p className="text-[10px] text-slate-400 font-mono mt-1">
                                        * Ce type de question ouverte sera corrigé manuellement par votre enseignant selon le barème officiel.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        </div>

                        {/* Navigation Actions Footer */}
                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={currentQuestionIndex === 0}
                            onClick={() => {
                              setSlideDirection(-1);
                              setCurrentQuestionIndex((prev) => prev - 1);
                            }}
                            className="bg-white hover:bg-slate-105 text-slate-700 border border-slate-200 hover:border-slate-300 text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition duration-150 disabled:opacity-30 disabled:pointer-events-none flex items-center space-x-1 cursor-pointer focus:outline-hidden"
                          >
                            <span>&larr; Précédent</span>
                          </button>

                          <div className="flex items-center space-x-1.5 overflow-x-auto max-w-[200px] sm:max-w-md px-1 py-1">
                            {activeQuizQuestions.map((_, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setSlideDirection(idx > currentQuestionIndex ? 1 : -1);
                                  setCurrentQuestionIndex(idx);
                                }}
                                className={`w-2 h-2 rounded-full transition-all duration-200 shrink-0 cursor-pointer ${
                                  idx === currentQuestionIndex
                                    ? "bg-indigo-600 w-4 rounded-md"
                                    : "bg-slate-300 hover:bg-slate-400"
                                }`}
                                title={`Aller à la question ${idx + 1}`}
                              />
                            ))}
                          </div>

                          <button
                            type="button"
                            disabled={currentQuestionIndex === activeQuizQuestions.length - 1}
                            onClick={() => {
                              setSlideDirection(1);
                              setCurrentQuestionIndex((prev) => prev + 1);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition duration-150 disabled:opacity-30 disabled:pointer-events-none flex items-center space-x-1 cursor-pointer focus:outline-hidden"
                          >
                            <span>Suivant &rarr;</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Résumé des réponses Right Sidebar (collapsible / responsive, gets 1/3 of space on lg) */}
                <div className="w-full lg:w-80 shrink-0">
                  <div className="sticky top-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 mb-3 border-b border-slate-200 pb-2.5">
                      <ListFilter className="w-4 h-4 text-indigo-600 animate-pulse" />
                      Résumé des réponses
                    </h4>

                    <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                      Cliquez sur une pastille de question ci-dessous pour y accéder instantanément avec une transition animée.
                    </p>

                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 gap-2">
                      {activeQuizQuestions.map((q, idx) => {
                        const answered = isQuestionAnswered(q);
                        const isActive = idx === currentQuestionIndex;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              setSlideDirection(idx > currentQuestionIndex ? 1 : -1);
                              setCurrentQuestionIndex(idx);
                            }}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-150 transform hover:scale-105 hover:shadow-xs active:scale-95 cursor-pointer ${
                              isActive
                                ? "bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-200 font-extrabold"
                                : answered
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/85"
                                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            <span className="text-[10px] font-mono font-bold leading-none">Q{idx + 1}</span>
                            <div className="mt-1.5">
                              {answered ? (
                                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-200" />
                              ) : (
                                <span className="flex h-2.5 w-2.5 rounded-full bg-slate-300" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 space-y-2 pt-4 border-t border-slate-200 text-xs text-slate-600">
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="font-medium text-slate-500">Remplies :</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {activeQuizQuestions.filter(isQuestionAnswered).length} / {activeQuizQuestions.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="font-medium text-slate-500">Restantes :</span>
                        <span className="font-mono font-bold text-rose-500">
                          {activeQuizQuestions.filter((q) => !isQuestionAnswered(q)).length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Submit footer panel */}
              <div className="bg-slate-50 border-t border-slate-100 p-6 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (safeConfirm("Voulez-vous abandonner l'examen ? Vos réponses actuelles seront perdues.")) {
                      setActiveQuizExam(null);
                      setIsFullscreenOn(false);
                    }
                  }}
                  className="px-4 py-2 text-xs border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-55 rounded-xl font-semibold transition"
                >
                  Abandonner
                </button>
                <button
                  type="button"
                  onClick={() => submitStudentQuiz(false)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-bold text-xs flex items-center space-x-1.5 hover:scale-105 transition duration-200"
                >
                  <Check className="w-4 h-4" />
                  <span>Soumettre ma copie définitive</span>
                </button>
              </div>
            </div>
          )}
          {/* ========================================================
              QUIZ SUBMISSION CONFIRMATION MODAL
             ======================================================== */}
          {showSubmitConfirmation && activeQuizExam && (
            <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 transform scale-100 transition-all flex flex-col gap-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Info className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Confirmation de soumission</h3>
                      <p className="text-xs text-slate-400">Examen : {activeQuizExam.title}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSubmitConfirmation(false)} 
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {(() => {
                  const unansweredList = getUnansweredQuestions();
                  if (unansweredList.length === 0) {
                    return (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start space-x-2.5 text-slate-850">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Toutes les questions sont complétées !</h4>
                          <p className="text-xs text-emerald-800 mt-1">
                            Bravo, chaque énoncé de l'examen a reçu une tentative de réponse. Vous pouvez valider l'examen l'esprit tranquille.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // Group by theme
                  const countByTheme: Record<string, number> = {};
                  unansweredList.forEach((q) => {
                    const theme = getQuestionTheme(q) || "Général";
                    countByTheme[theme] = (countByTheme[theme] || 0) + 1;
                  });

                  return (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-slate-800 space-y-3">
                      <div className="flex items-start space-x-2.5">
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">Des questions obligatoires restent sans réponse !</h4>
                          <p className="text-xs text-rose-800 mt-1 font-medium">
                            Il vous reste encore <strong className="text-rose-600 font-extrabold">{unansweredList.length} question(s)</strong> sans réponse (ou incomplètes). Nous vous conseillons de les renseigner avant la validation définitive.
                          </p>
                        </div>
                      </div>

                      {/* Smart validation categorization warning */}
                      <div className="bg-rose-100/50 p-3 rounded-xl border border-rose-200/40 text-xs text-rose-900 space-y-1 sm:space-y-1.5">
                        <p className="font-extrabold text-[10px] uppercase tracking-wider text-rose-950 flex items-center space-x-1">
                          <span>🔍 Validation Intelligente :</span>
                        </p>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-900 leading-relaxed font-sans">
                          {Object.entries(countByTheme).map(([theme, count]) => (
                            <li key={theme}>
                              <span className="font-extrabold">{count}</span> {count > 1 ? "questions" : "question"} du thème <span className="underline font-bold">{theme}</span> {count > 1 ? "sont manquantes !" : "est manquante !"}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {activeQuizQuestions.map((q, idx) => {
                          const unanswered = !isQuestionAnswered(q);
                          if (!unanswered) return null;
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => {
                                setShowSubmitConfirmation(false);
                                setSlideDirection(idx > currentQuestionIndex ? 1 : -1);
                                setCurrentQuestionIndex(idx);
                              }}
                              className="bg-white hover:bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-mono font-bold py-1 px-2.5 rounded-lg transition shrink-0 cursor-pointer"
                              title={`Aller à la question ${idx + 1}`}
                            >
                              Q{idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  <strong>Rappel important :</strong> Une fois validée, vous ne pourrez plus modifier vos choix et la copie sera immédiatement envoyée pour calcul de votre note de synthèse.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirmation(false)}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Retourner à l'examen
                  </button>
                  <button
                    type="button"
                    onClick={() => submitStudentQuiz(true)}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Soumettre ma copie</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STUDENT WORKSPACE: COURSES, JOINING, HISTORY 
              ======================================================== */}
          {examToStart && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
                <div className="flex items-center space-x-3 text-indigo-600">
                  <div className="p-3 bg-indigo-50 rounded-2xl">
                    <Play className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-500">Validation Requise</span>
                    <h3 className="font-bold text-slate-950 text-base">Prêt à démarrer l'épreuve ?</h3>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-2">
                  <p>
                    Vous allez commencer l'examen : <strong className="text-slate-900 font-extrabold">« {examToStart.title} »</strong>
                  </p>
                  <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-100/50">
                    <span className="font-medium text-slate-500">Durée autorisée :</span>
                    <span className="font-bold text-indigo-600 font-mono">{examToStart.duration} minutes</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed italic">
                    ⚠️ Le chronomètre démarrera dès que vous aurez confirmé. Les règles de surveillance (Webcam, plein écran, anti-triche) s'appliqueront immédiatement.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setExamToStart(null)}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ex = examToStart;
                      if (ex) {
                        const el = document.documentElement;
                        if (el.requestFullscreen) {
                          el.requestFullscreen()
                            .then(() => setIsFullscreenOn(true))
                            .catch((err) => console.log("Fullscreen request failed", err));
                        }
                        setExamToStart(null);
                        proceedStartExamQuiz(ex);
                      }
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <span>Démarrer maintenant</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {user.role === "student" && !activeQuizExam && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Connection Status Bar */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
                isOnline 
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 shadow-xs"
                  : "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 shadow-md animate-pulse"
              }`}>
                <div className="flex items-center space-x-3">
                  <div className="relative flex h-3.5 w-3.5">
                    {isOnline ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                      </>
                    ) : (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                      </>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider block">
                      Statut de Connexion
                    </span>
                    <p className="text-xs font-semibold">
                      {isOnline 
                        ? "Connecté — Synchronisation en temps réel active avec le serveur" 
                        : "En attente de connexion — Vos modifications et réponses sont stockées localement"}
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block text-right">
                  <span className="text-[10px] font-mono font-bold bg-white/60 dark:bg-black/20 px-2.5 py-1 rounded-md border border-current">
                    {isOnline ? "RÉSEAU OK" : "HORS-LIGNE"}
                  </span>
                </div>
              </div>

              {/* Dynamic stats tracker for student */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
                  <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Cours Inscrits</p>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900">{courses.length}</h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
                  <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Examens Terminés</p>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900">{studentSubmissions.length}</h3>
                  </div>
                </div>

                {/* CONSULTER IA DIRECT CONNECT BUTTON CARD */}
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  className="bg-white hover:bg-slate-50 border border-slate-100 hover:border-indigo-100 p-6 rounded-2xl shadow-xs flex items-center space-x-4 text-left transition cursor-pointer group focus:outline-none"
                  title="Consulter l'Assistant IA pour vos révisions et cours"
                  id="student-dashboard-consult-ai-btn"
                >
                  <div className="p-3.5 bg-indigo-600 text-white rounded-xl group-hover:scale-105 transition shadow-xs">
                    <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-indigo-600 font-extrabold flex items-center gap-1">
                      <span>Service Actif</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </p>
                    <h3 className="text-base font-bold tracking-tight text-slate-900 mt-0.5">Consulter IA</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Soutien académique & révision</p>
                  </div>
                </button>

                {/* Form component to join a course instantly */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xs flex flex-col justify-center">
                  <form onSubmit={handleJoinCourse} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-indigo-300 font-mono tracking-widest font-bold uppercase">REJOINDRE UN COURS</span>
                      <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder="Ex: IA2026"
                        className="flex-1 bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-400/50 uppercase font-mono tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-1.5 rounded-xl font-bold transition shrink-0"
                      >
                        Rejoindre
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Detailed Result Card after finishing quiz */}
              {selectedSubReport && (
                <div id="submission-detail-card" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative space-y-6">
                  {/* Exit report */}
                  <button
                    onClick={() => {
                      setSelectedSubReport(null);
                      setSelectedSubReportQuestions([]);
                      setAiExplanationText("");
                    }}
                    className="absolute top-4 right-4 p-1.5 bg-slate-100 text-slate-600 hover:text-slate-950 rounded-full transition"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Rapport de Résultat d'Évaluation</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Copie d'examen enregistrée avec succès
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                      {selectedSubReport.score !== null ? (
                        <div className="text-right">
                          <p className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest leading-none">score obtenu</p>
                          <p className="text-xl font-black text-indigo-600 mt-1">
                            {selectedSubReport.score} <span className="text-xs font-semibold text-slate-400">/ 20</span>
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-xs text-amber-700 font-semibold px-2">
                          <span>🖋️ Écrit en attente de notation manuelle</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TWO-COLUMN GRID: 1st side is student's question review. 2nd side is AI tutor panel */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                    
                    {/* LEFT COLUMN: Questions list & answers review */}
                    <div className="lg:col-span-7 space-y-4">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Détail des questions & réponses</h5>
                      
                      {loadingSubReport ? (
                        <div className="text-center py-12 text-slate-400">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                          <p className="text-xs">Chargement du corrigé personnalisé...</p>
                        </div>
                      ) : selectedSubReportQuestions.length === 0 ? (
                        <p className="text-xs text-slate-505 italic bg-slate-50 p-4 rounded-xl">Sélectionnez une évaluation dans l'historique ci-dessous pour inspecter vos réponses questions par questions.</p>
                      ) : (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                          {selectedSubReportQuestions.map((q, idx) => {
                            if (q.type === "description") return null;

                            const studentAns = selectedSubReport.answers[q.id];
                            let isCorrect = false;
                            let essayGrade = null;

                            if (q.type === "essay") {
                              const fb = selectedSubReport.essayFeedbacks?.[q.id];
                              essayGrade = fb ? fb.score : 0;
                              isCorrect = essayGrade >= (q.points || 0) / 2;
                            } else if (studentAns === undefined || studentAns === null) {
                              isCorrect = false;
                            } else if (q.type === "mcq" || q.type === "true_false" || q.type === "numerical" || q.type === "short_answer" || q.type === "cloze") {
                              isCorrect = String(q.correctAnswer).trim().toLowerCase() === String(studentAns).trim().toLowerCase();
                            } else if (q.type === "matching") {
                              try {
                                const matchingMap = typeof studentAns === "string" ? JSON.parse(studentAns) : studentAns;
                                let matches = 0;
                                const opts = q.options || [];
                                const targets = q.matchingTargets || [];
                                opts.forEach((key: string, i: number) => {
                                  if (matchingMap && matchingMap[key] === targets[i]) matches++;
                                });
                                isCorrect = matches === opts.length;
                              } catch {
                                isCorrect = false;
                              }
                            }

                            return (
                              <div
                                key={q.id}
                                className={`p-4 rounded-xl border text-xs transition ${
                                  isCorrect 
                                    ? "bg-slate-50/50 border-slate-100" 
                                    : "bg-rose-50/20 border-rose-100"
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-bold text-slate-800">
                                    Q{idx + 1}. <MathRenderer text={q.statement} />
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                                    isCorrect ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-rose-50 text-rose-800 border border-rose-100"
                                  }`}>
                                    {q.type === "essay" 
                                      ? `${essayGrade} / ${q.points || 0} pts` 
                                      : (isCorrect ? `+${q.points || 1} pt` : "0 pt")}
                                  </span>
                                </div>

                                <div className="mt-3 space-y-2">
                                  <div className="flex items-center space-x-1.5 text-slate-600">
                                    <span className="font-semibold">Votre réponse :</span>
                                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200/50 font-medium text-slate-900">
                                      {studentAns === undefined || studentAns === null
                                        ? "Non répondu" 
                                        : (typeof studentAns === "object" ? JSON.stringify(studentAns) : <MathRenderer text={String(studentAns)} />)}
                                    </span>
                                  </div>

                                  {q.type !== "essay" && (
                                    <div className="flex items-center space-x-1.5 text-emerald-700">
                                      <span className="font-semibold">Réponse attendue :</span>
                                      <span className="bg-emerald-50/60 px-2 py-0.5 rounded border border-emerald-100 font-bold">
                                        <MathRenderer text={String(q.correctAnswer)} />
                                      </span>
                                    </div>
                                  )}

                                  {q.type === "essay" && selectedSubReport.essayFeedbacks?.[q.id] && (
                                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-indigo-950 dark:text-indigo-200 mt-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="font-bold text-[10px] uppercase tracking-wider text-indigo-800 dark:text-indigo-300">Commentaire correcteur :</p>
                                        {selectedSubReport.essayFeedbacks?.[q.id]?.similarityPct !== undefined && (
                                          <span className="text-[9px] font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-300">
                                            Simil. Levenshtein : {selectedSubReport.essayFeedbacks?.[q.id]?.similarityPct}%
                                          </span>
                                        )}
                                      </div>
                                      <p className="font-medium italic">"{selectedSubReport.essayFeedbacks[q.id].comment}"</p>
                                    </div>
                                  )}

                                  {q.explanation && (
                                    <p className="text-slate-500 mt-1 pl-2 border-l-2 border-slate-200 italic">
                                      Explication : <MathRenderer text={q.explanation} />
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: AI Explanation & Tutoring */}
                    <div className="lg:col-span-5 bg-gradient-to-br from-indigo-50/40 to-slate-50 rounded-2xl p-5 border border-indigo-100/40 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center space-x-1.5 text-indigo-950 font-bold text-xs uppercase tracking-wider">
                          <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                          <span className="font-sans">Tutorat Explication IA</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Obtenez instantanément un diagnostic personnalisé de vos erreurs et un plan de révisions par Gemini.
                        </p>
                      </div>

                      {loadingAiExplanation ? (
                        <div className="flex-1 py-12 flex flex-col items-center justify-center text-center space-y-3">
                          <div className="relative">
                            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <Sparkles className="w-4 h-4 text-amber-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700 animate-pulse">Génération du feedback personnalisé...</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Gemini étudie votre copie d'examen</p>
                          </div>
                        </div>
                      ) : aiExplanationText ? (
                        <div className="flex-1 bg-white p-4 rounded-xl border border-indigo-100/40 text-[11px] text-slate-850 overflow-y-auto max-h-[350px] whitespace-pre-line leading-relaxed font-sans custom-scrollbar">
                          {aiExplanationText}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center space-y-3 bg-white/60 rounded-xl border border-slate-100">
                          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                            <Sparkles className="w-6 h-6 stroke-1" />
                          </div>
                          <p className="text-xs font-medium text-slate-500 max-w-[200px] leading-relaxed">
                            Besoin de comprendre vos erreurs de raisonnement ?
                          </p>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={loadingAiExplanation}
                          onClick={() => handleFetchAiExplanation(selectedSubReport.id)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl text-xs transition duration-150 flex items-center justify-center space-x-1.5 shadow-xs"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>{aiExplanationText ? "Régénérer l'Explication" : "Générer Explication IA"}</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* STUDENT TAB BAR SELECTOR */}
              <div className="flex space-x-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setStudentTab('activities')}
                  className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
                    studentTab === 'activities' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📋 Mes Évaluations & Cours
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudentTab('analytics');
                    fetchStudentAnalytics();
                  }}
                  className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
                    studentTab === 'analytics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span>📊 Mon Tableau de Bord & Progression IA</span>
                </button>
              </div>

              {studentTab === 'activities' && (
                  <motion.div
                    key="student-activities"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                  {/* Enrolled Courses & Exams Lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Courses block for Student */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                      <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        <span>Mes Cours Actifs</span>
                      </h3>

                      {courses.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <BookOpen className="w-12 h-12 mx-auto stroke-1 mb-2 text-slate-300" />
                          <p className="text-xs">Aucun cours inscrit actuellement. Entrez un code de cours ci-dessus pour y adhérer.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {courses.map((course) => (
                            <div
                              key={course.id}
                              className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition"
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">{course.title}</h4>
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{course.description}</p>
                                </div>
                                <span className="text-[10px] bg-slate-200/60 font-mono tracking-wider font-bold text-slate-600 px-2 py-0.5 rounded uppercase">
                                  Code: {course.code}
                                </span>
                              </div>

                              <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-between items-center text-[11px] text-slate-400">
                                <span>Cours géré par {course.teacherName}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Available Exams for student */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                      <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
                        <Play className="w-5 h-5 text-emerald-600" />
                        <span>Sessions d'Examens Moodle Disponibles</span>
                      </h3>

                      {courses.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <p className="text-xs">Inscrivez-vous à un cours pour visualiser les devoirs programmés.</p>
                        </div>
                      ) : (
                        <StudentExamsListView courses={courses} onStartExam={startExamQuiz} studentSubmissions={studentSubmissions} />
                      )}
                    </div>
                  </div>

                  {/* Historiques des examens passés */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
                      <Award className="w-5 h-5 text-indigo-600" />
                      <span>Historique des Évaluations & Notes Moodle</span>
                    </h3>

                    {studentSubmissions.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">Aucun examen n'a encore été soumis.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[9px] tracking-wider border-b border-slate-100">
                            <tr>
                              <th className="p-3 font-bold">Examen</th>
                              <th className="p-3 font-bold">Cours</th>
                              <th className="p-3 font-bold">Date de Remise</th>
                              <th className="p-3 font-bold text-center">Statut Correction</th>
                              <th className="p-3 font-bold text-right">Note de Synthèse</th>
                              <th className="p-3 font-bold text-center">Rapport PDF</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {studentSubmissions.map((sub) => (
                              <tr key={sub.id} className="hover:bg-slate-50 transition">
                                <td className="p-3 font-semibold text-slate-950">{sub.examTitle}</td>
                                <td className="p-3 text-slate-500">{sub.courseTitle}</td>
                                <td className="p-3 font-mono text-slate-400">
                                  {new Date(sub.submittedAt).toLocaleDateString("fr-FR")} {new Date(sub.submittedAt).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="p-3 text-center">
                                  {sub.score === null ? (
                                    <span className="bg-amber-50 text-amber-800 border border-amber-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                                      🖋️ Correction en cours
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                                      ✓ Corrigé & Notifié
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-bold text-slate-900 text-sm">
                                  {sub.score === null ? (
                                    <span className="text-slate-400 font-mono">En attente</span>
                                  ) : (
                                    <span>{sub.score} pt{sub.score > 1 ? "s" : ""}</span>
                                  )}
                                </td>
                                <td className="p-3 text-center flex items-center justify-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleViewSubmissionDetails(sub)}
                                    className="inline-flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg transition cursor-pointer"
                                    title="Consulter la copie de l'évaluation avec explications IA"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Consulter & IA</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadPDF(sub)}
                                    className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-slate-200/80 text-slate-705 font-bold py-1.5 px-3 rounded-lg border border-slate-200 transition cursor-pointer"
                                    title="Télécharger le récapitulatif officiel au format PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Télécharger</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  </motion.div>
                )}

                {studentTab === 'analytics' && (
                  <motion.div
                    key="student-analytics"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-8"
                  >
                  {loadingStudentAnalytics ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-2xs">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <Sparkles className="w-5 h-5 text-indigo-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">Analyse de vos performances académiques...</p>
                        <p className="text-xs text-slate-400 mt-1">L'IA EduQuiz compile vos réponses et statistiques de surveillance</p>
                      </div>
                    </div>
                  ) : !studentAnalytics || studentAnalytics.stats?.examsTaken === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-2xs">
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full">
                        <TrendingUp className="w-10 h-10 stroke-1" />
                      </div>
                      <div className="max-w-md">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Votre tableau de bord est prêt !</h3>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          Une fois votre première évaluation Moodle validée, vous découvrirez ici votre courbe de progression, vos forces thématiques, et des conseils personnalisés par IA.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Student Analytics Metrics Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-slate-800 dark:to-slate-800/40 p-5 rounded-2xl border border-indigo-100/80 dark:border-slate-700/80">
                          <span className="text-[10px] font-mono font-bold text-indigo-500 dark:text-indigo-400 uppercase">MA MOYENNE GENERALE</span>
                          <div className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                            {studentAnalytics.stats.avgScore} <span className="text-sm font-normal text-slate-500">/ 20</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Moyenne de toutes vos épreuves</p>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-slate-800 dark:to-slate-800/40 p-5 rounded-2xl border border-emerald-100/80 dark:border-slate-700/80">
                          <span className="text-[10px] font-mono font-bold text-emerald-500 dark:text-emerald-400 uppercase">TAUX DE REUSSITE</span>
                          <div className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                            {studentAnalytics.stats.passingRate}%
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Examens avec note &ge; 10/20</p>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-slate-800 dark:to-slate-800/40 p-5 rounded-2xl border border-amber-100/80 dark:border-slate-700/80">
                          <span className="text-[10px] font-mono font-bold text-amber-500 dark:text-amber-400 uppercase">MEILLEURE NOTE</span>
                          <div className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                            {studentAnalytics.stats.bestScore} <span className="text-sm font-normal text-slate-500">/ 20</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Votre plus grand succès !</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-slate-800 dark:to-slate-800/40 p-5 rounded-2xl border border-purple-100/80 dark:border-slate-700/80">
                          <span className="text-[10px] font-mono font-bold text-purple-500 dark:text-purple-400 uppercase">INDICE DE FOCUS</span>
                          <div className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                            {100 - (studentAnalytics.proctoring?.avgSuspicionScore || 0)}%
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {studentAnalytics.proctoring?.avgSuspicionScore < 20 
                              ? "Excellent focus (Intégrité OK)" 
                              : studentAnalytics.proctoring?.avgSuspicionScore < 50 
                                ? "Focus modéré (Intégrité OK)" 
                                : "Attention aux distractions !"}
                          </p>
                        </div>
                      </div>

                      {/* Charts row */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Line progression chart */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1 flex items-center space-x-1.5">
                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                            <span>📈 Courbe de progression des notes</span>
                          </h3>
                          <p className="text-xs text-slate-400 dark:text-slate-400 mb-4">Évolution de vos résultats (notes normalisées sur 20)</p>
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={studentAnalytics.progress}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="examTitle" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                <YAxis domain={[0, 20]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="normalizedScore" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} name="Note obtenue" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Radar competency profile */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1 flex items-center space-x-1.5">
                            <Award className="w-4 h-4 text-emerald-600" />
                            <span>🕸️ Mon profil de compétences thématiques</span>
                          </h3>
                          <p className="text-xs text-slate-400 dark:text-slate-400 mb-4">Pourcentage de maîtrise par catégorie de questions</p>
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={studentAnalytics.themes.map((t: any) => ({ ...t, A: t.percentage }))}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={9} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={8} />
                                <Radar name="Ma Maîtrise" dataKey="A" stroke="#10b981" fill="#34d399" fillOpacity={0.3} />
                                <Tooltip />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* AI Recommendations box */}
                      <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
                          <Brain className="w-72 h-72" />
                        </div>

                        <div className="relative z-10 space-y-4">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-indigo-500/30 border border-indigo-400/30 text-amber-300 rounded-lg">
                              <Sparkles className="w-5 h-5 animate-pulse" />
                            </div>
                            <h3 className="text-lg font-bold">Conseils & Recommandations d'Apprentissage IA</h3>
                          </div>
                          <p className="text-xs text-indigo-200 leading-relaxed max-w-2xl">
                            Notre système d'intelligence artificielle a analysé l'intégralité de vos réponses pour identifier vos forces thématiques et concevoir un programme de soutien personnalisé.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {studentAnalytics.recommendations.map((rec: string, index: number) => {
                              const text = rec.replace(/\*\*/g, '');
                              return (
                                <div key={index} className="bg-white/10 backdrop-blur-xs border border-white/10 p-4 rounded-2xl flex items-start space-x-3">
                                  <div className="mt-0.5 text-base shrink-0">
                                    {text.startsWith('💡') ? '💡' : text.startsWith('🏆') ? '🏆' : text.startsWith('🧠') ? '🧠' : '📖'}
                                  </div>
                                  <p className="text-xs text-white/90 leading-relaxed">
                                    {text.replace(/^[💡🏆🧠📖]\s*/, '')}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  </motion.div>
                )}

            </div>
          )}

          {/* ========================================================
              TEACHER WORKSPACE: ACTIVE COURSES & GENERATORS 
             ======================================================== */}
          {user.role === "teacher" && activeTab === "moodle_editor" && (
            <div className="space-y-8">
              <MoodleEditor
                courses={courses}
                exams={exams}
                activeCourse={activeCourse}
                onUpdateExams={setExams}
                onSelectExam={setActiveExam}
                triggerToast={triggerToast}
                darkMode={darkMode}
              />
            </div>
          )}

                    {user.role === "teacher" && activeTab !== "moodle_editor" && (
            <div className="space-y-8">
              {!activeCourse ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      <span>Mes Cours Gérés</span>
                    </h3>
                    <button
                      onClick={() => setIsCreatingCourse(true)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Créer un cours</span>
                    </button>
                  </div>
                  {courses.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <BookOpen className="w-12 h-12 mx-auto stroke-1 mb-2 text-slate-300" />
                      <p className="text-xs mb-4">Aucun cours créé pour le moment.</p>
                      <button
                        onClick={() => setIsCreatingCourse(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Créer mon premier cours</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.map((course) => (
                        <div
                          key={course.id}
                          onClick={() => setActiveCourse(course)}
                          className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition cursor-pointer flex flex-col justify-between space-y-4"
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="text-sm font-bold text-slate-900">{course.title}</h4>
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-mono font-bold px-2.5 py-0.5 rounded-full">
                                {course.code}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{course.description}</p>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-200/50 text-xs font-semibold text-indigo-600">
                            <span>Gérer les évaluations ({exams.filter(e => e.courseId === course.id).length})</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Course Navigation Header */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 px-4 flex items-center justify-between shadow-xs mb-4">
                    <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                      <button
                        onClick={() => { setActiveCourse(null); setActiveExam(null); }}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 font-semibold transition cursor-pointer"
                        title="Retour à la liste des cours"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Mes Cours</span>
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      {activeExam ? (
                        <button
                          onClick={() => setActiveExam(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 font-semibold transition cursor-pointer"
                          title="Retour à la liste des examens de ce cours"
                        >
                          {activeCourse.title}
                        </button>
                      ) : (
                        <span className="text-slate-900 dark:text-slate-100 font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg">
                          {activeCourse.title}
                        </span>
                      )}
                      {activeExam && (
                        <>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-900 dark:text-slate-100 font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg truncate max-w-[200px]">
                            {activeExam.title}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {activeExam && (
                        <button
                          onClick={() => setActiveExam(null)}
                          className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold px-3 py-1.5 rounded-xl transition flex items-center space-x-1 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Retour aux examens</span>
                        </button>
                      )}
                      <button
                        onClick={() => { setActiveCourse(null); setActiveExam(null); }}
                        className="text-xs bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-xl transition flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Liste des cours</span>
                      </button>
                    </div>
                  </div>

                  {activeExam ? (
                    <div className="space-y-6">
                      {/* Detailed Exam Header bar */}
                      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setActiveExam(null)}
                              className="flex items-center space-x-1 text-xs text-indigo-600 font-semibold"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span>Retour à la liste</span>
                            </button>
                            <span className="text-slate-300">/</span>
                            <span className="text-xs text-slate-400 font-mono uppercase">{activeCourse.title}</span>
                          </div>

                          <h2 className="text-lg md:text-xl font-bold text-slate-950 mt-2 flex items-center space-x-2">
                            <span>{activeExam.title}</span>
                          </h2>

                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-[10px] bg-slate-100 font-semibold text-slate-600 px-2 py-0.5 rounded flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              <span>{activeExam.duration} minutes</span>
                            </span>
                            <span className="text-[10px] bg-slate-100 font-semibold text-slate-600 px-2 py-0.5 rounded flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              <span>Composition début: {new Date(activeExam.startDate).toLocaleDateString("fr-FR")}</span>
                            </span>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                              {activeExam.gradingScaleText || "Note brute"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => {
                              setSharedCodeModal({
                                courseCode: activeCourse.code,
                                examId: activeExam.id,
                                examTitle: activeExam.title,
                                courseTitle: activeCourse.title
                              });
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs py-2 px-3 rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Partager le lien</span>
                          </button>
                        </div>
                      </div>

                      {/* Teacher Exam Sub-Tabs: editor | monitoring | analytics */}
                      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                        <button
                          onClick={() => setTeacherExamTab("editor")}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                            teacherExamTab === "editor"
                              ? "bg-indigo-600 text-white shadow-md"
                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>Éditeur de Questions ({activeExam.questions?.length || 0})</span>
                        </button>
                        <button
                          onClick={() => setTeacherExamTab("monitoring")}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer relative ${
                            teacherExamTab === "monitoring"
                              ? "bg-indigo-600 text-white shadow-md"
                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                          <span>Supervision en Direct</span>
                        </button>
                        <button
                          onClick={() => setTeacherExamTab("analytics")}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                            teacherExamTab === "analytics"
                              ? "bg-indigo-600 text-white shadow-md"
                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <BarChart2 className="w-4 h-4" />
                          <span>Analyses & Statistiques</span>
                        </button>
                      </div>

                      {teacherExamTab === "editor" && (
                        <div className="space-y-6">
                          <ExamQuestionEditor
                            exam={activeExam}
                            onUpdateExam={(updated) => {
                              setActiveExam(updated);
                              setExams(exams.map(e => e.id === updated.id ? updated : e));
                            }}
                            triggerToast={triggerToast}
                          />
                        </div>
                      )}

                      {teacherExamTab === "monitoring" && (
                        <div className="space-y-6">
                          <ExamMonitoringView
                            exam={activeExam}
                            course={activeCourse}
                            triggerToast={triggerToast}
                          />
                        </div>
                      )}

                      {teacherExamTab === "analytics" && renderTeacherAnalytics()}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {exams.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-lg mx-auto">
                          <Clock className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-2" />
                          <h4 className="text-slate-900 font-bold text-sm">Générez un Quiz d'évaluation de type Moodle</h4>
                          <p className="text-xs text-slate-400 mt-1">
                            Saisissez le sujet de votre devoir et observez l ia extraire les concepts clefs et bâtir un modèle sur mesure compatible.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                          <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                            LISTE DES SESSIONS ET EXAMENS DISPONIBLES
                          </div>
                          <div className="divide-y divide-slate-100">
                            {exams.map((ex) => (
                              <div key={ex.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                      ex.status === "published"
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                                        : "bg-amber-50 text-amber-800 border-amber-100"
                                    }`}>
                                      {ex.status === "published" ? "◉ Actif & Publié" : "Brouillon"}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">
                                      {ex.duration} Mins
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-extrabold text-slate-900 mt-1">{ex.title}</h4>
                                  <p className="text-[11px] text-slate-500 mt-1">
                                    {ex.subjectText ? `${ex.subjectText.substring(0, 100)}...` : "Aucun document lié."}
                                  </p>
                                </div>

                                <div className="flex items-center space-x-2 w-full md:w-auto shrink-0">
                                  <button
                                    onClick={() => setActiveExam(ex)}
                                    className="flex-1 md:flex-none text-xs bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold py-1.5 px-3 rounded-lg transition"
                                  >
                                    Configurer & Voir Quiz
                                  </button>
                                  <button
                                    onClick={() => deleteExam(ex.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 border border-slate-100 rounded-lg transition hover:bg-rose-50"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

      {/* EXAM SHARE DIRECT LINK DIALOG MODAL */}
      <AnimatePresence>
        {sharedCodeModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-md w-full space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2 text-emerald-600">
                  <Share2 className="w-5 h-5 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">Partager l'évaluation</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSharedCodeModal(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                  {sharedCodeModal.examTitle}
                </h4>
                <p className="text-[11px] text-slate-400">
                  Matière : <span className="font-semibold text-slate-600 dark:text-slate-300">{sharedCodeModal.courseTitle}</span>
                </p>
              </div>

              <hr className="border-slate-100 dark:border-slate-850" />

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-755 dark:text-slate-200 leading-relaxed">
                  Fournissez ce code direct-link d'inscription unique aux étudiants pour qu'ils s'enregistrent instantanément et soient redirigés vers ce devoir :
                </p>

                {/* The Code Display field */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 font-mono">
                  <div className="text-xs text-slate-800 dark:text-slate-200 break-all select-all font-bold">
                    {sharedCodeModal.courseCode}-{sharedCodeModal.examId}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${sharedCodeModal.courseCode}-${sharedCodeModal.examId}`);
                      triggerToast("Code de partage copié dans le presse-papiers !", "success");
                    }}
                    className="shrink-0 bg-slate-900 hover:bg-slate-950 text-white font-bold text-[10px] py-1.5 px-2.5 rounded-lg transition uppercase tracking-wider font-sans select-none flex items-center space-x-1 cursor-pointer"
                  >
                    <Link className="w-3 h-3" />
                    <span>Copier</span>
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900">
                  <p className="font-bold uppercase text-slate-500 mb-0.5">💡 Comment l'utiliser ?</p>
                  Les étudiants n'ont qu'à copier-coller ce code complet dans la case <span className="font-bold">Rejoindre un cours</span> de leur tableau de bord élève. Notre infrastructure se chargera du reste !
                </div>
                </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSharedCodeModal(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 text-xs font-bold py-2 px-4 rounded-xl transition cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE COURSE DIALOG MODAL */}
      <AnimatePresence>
        {isCreatingCourse && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-md w-full space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                  <BookOpen className="w-5 h-5 shrink-0" />
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">Créer un nouveau cours</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingCourse(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Titre du cours *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="Ex: M1 Informatique - Intelligence Artificielle"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    value={newCourseDesc}
                    onChange={(e) => setNewCourseDesc(e.target.value)}
                    placeholder="Description, objectifs pédagogiques, etc."
                    rows={3}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Dossier / Catégorie
                  </label>
                  <input
                    type="text"
                    value={newCourseCategory}
                    onChange={(e) => setNewCourseCategory(e.target.value)}
                    placeholder="Ex: Informatique, Management, Langues"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2 flex space-x-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreatingCourse(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
                  >
                    Créer le cours
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KEYBOARD SHORTCUTS CHEAT SHEET DIALOG MODAL */}
      <AnimatePresence>
        {showShortcutsCheatSheet && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-md w-full space-y-4 font-sans text-slate-900 dark:text-slate-100"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                  <span className="text-lg">⌨️</span>
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">Raccourcis Clavier</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShortcutsCheatSheet(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Améliorez votre efficacité durant vos épreuves d'évaluation grâce aux raccourcis clavier intégrés :
                </p>

                <div className="space-y-2.5">
                  {/* Shortcut row 1 */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Question suivante</span>
                    <span className="flex items-center space-x-1">
                      <kbd className="px-2 py-1 text-[10px] font-bold font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg shadow-2xs">
                        &rarr;
                      </kbd>
                      <span className="text-[10px] text-slate-400 font-medium font-sans">ou</span>
                      <kbd className="px-2 py-1 text-[10px] font-bold font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg shadow-2xs">
                        Fleche Droite
                      </kbd>
                    </span>
                  </div>

                  {/* Shortcut row 2 */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Question précédente</span>
                    <span className="flex items-center space-x-1">
                      <kbd className="px-2 py-1 text-[10px] font-bold font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg shadow-2xs">
                        &larr;
                      </kbd>
                      <span className="text-[10px] text-slate-400 font-medium font-sans">ou</span>
                      <kbd className="px-2 py-1 text-[10px] font-bold font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg shadow-2xs">
                        Fleche Gauche
                      </kbd>
                    </span>
                  </div>

                  {/* Shortcut row 3 */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Soumettre la copie</span>
                    <div className="flex items-center space-x-1 font-mono">
                      <kbd className="px-2 py-1 text-[10px] font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg shadow-2xs">
                        Ctrl
                      </kbd>
                      <span className="text-[10px] text-slate-450 font-bold font-sans">+</span>
                      <kbd className="px-2 py-1 text-[10px] font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg shadow-2xs">
                        Entrée
                      </kbd>
                    </div>
                  </div>

                  {/* Shortcut row 4 */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Ouvrir cet aide-mémoire</span>
                    <kbd className="px-2 py-1 text-[10px] font-bold font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg shadow-2xs">
                      ?
                    </kbd>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900">
                  <span className="font-bold">⚠️ Note d'utilisation :</span> Les flèches de direction ne changent de question que lorsque vous n'êtes pas en train d'écrire activement dans une réponse rédigée (zone de texte).
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowShortcutsCheatSheet(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 text-xs font-bold py-2 px-4 rounded-xl transition cursor-pointer"
                >
                  Compris
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
          </div>

        <div className="fixed bottom-6 right-6 flex flex-col items-end space-y-3 z-50">
          <>
            {/* Chat bubble overlay */}
            <AnimatePresence>
              {chatOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.95 }}
                  className="w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-850 shadow-2xl flex flex-col h-[460px] overflow-hidden"
                >
                  {/* Header widget */}
                  <div className="bg-indigo-600 dark:bg-indigo-950 p-4 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse animate-duration-1000" />
                      <div>
                        <h4 className="text-xs font-bold font-sans">
                          {user.role === "student" ? "Tuteur Personnel IA EduQuiz" : "Assistant Académique EduQuiz"}
                        </h4>
                        <p className="text-[10px] text-indigo-200">En ligne • Support et tutorat actif</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChatOpen(false)}
                      className="text-white hover:bg-white/15 p-1 rounded-full transition cursor-pointer"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {/* Messages stream */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950 font-sans">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white rounded-br-none"
                              : "bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none shadow-xs"
                          }`}
                        >
                          <p className="whitespace-pre-line font-medium font-sans">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 text-slate-400 rounded-2xl px-3 py-2.5 text-xs flex items-center space-x-2 rounded-bl-none">
                          <span className="animate-bounce">●</span>
                          <span className="animate-bounce delay-100">●</span>
                          <span className="animate-bounce delay-200">●</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form fields */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendChatMessage();
                    }}
                    className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2 shrink-0 bg-white dark:bg-slate-900"
                  >
                    <input
                      type="text"
                      required
                      placeholder={
                        user.role === "student"
                          ? "Posez une question de cours ou d'exercices à l'IA..."
                          : "Posez vos questions de structure d'examen..."
                      }
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="text-xs px-3 py-2 border border-slate-200 dark:border-slate-705 rounded-xl flex-1 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-hidden font-sans"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer disabled:opacity-40 shrink-0 flex items-center justify-center font-bold"
                      title="Envoyer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sparkles toggle button */}
            <button
              type="button"
              onClick={() => setChatOpen(!chatOpen)}
              className="p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl hover:scale-105 transition duration-200 flex items-center justify-center cursor-pointer z-50 shrink-0 border border-indigo-500/20"
              title="Consulter l IA EduQuiz"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </>
        </div>
      </div>
    </div>
  );
}