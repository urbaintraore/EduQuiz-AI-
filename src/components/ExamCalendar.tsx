import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  CheckCircle2,
  Play,
  Eye,
  X,
  AlertCircle,
  Tag
} from "lucide-react";
import { Course, Exam, Submission } from "../types";

interface ExamCalendarProps {
  courses: Course[];
  allExams: (Exam & { courseTitle?: string })[];
  studentSubmissions: Submission[];
  onStartExam: (exam: Exam) => void;
  onViewSubmission?: (sub: Submission) => void;
}

export function ExamCalendar({
  courses,
  allExams,
  studentSubmissions,
  onStartExam,
  onViewSubmission
}: ExamCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayExams, setSelectedDayExams] = useState<{
    date: Date;
    exams: (Exam & { courseTitle?: string })[];
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month
  const firstDayOfMonth = new Date(year, month, 1);
  // Total days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Determine starting weekday (0 = Sunday, convert so Monday = 0)
  const startingDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

  // Total days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNamesFR = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre"
  ];

  const weekDaysFR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to parse dates safely
  const getExamDates = (ex: Exam) => {
    let start: Date;
    let end: Date;

    if (ex.startDate) {
      start = new Date(ex.startDate);
    } else if (ex.createdAt) {
      start = new Date(ex.createdAt);
    } else {
      start = new Date();
    }

    if (ex.endDate) {
      end = new Date(ex.endDate);
    } else {
      // Default end date is start + duration in minutes
      const durMinutes = ex.duration || 60;
      end = new Date(start.getTime() + durMinutes * 60 * 1000);
    }

    return { start, end };
  };

  // Helper to check if a specific calendar day falls within start and end date
  const getExamsForDay = (dayDate: Date) => {
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59);

    return allExams.filter((ex) => {
      const { start, end } = getExamDates(ex);
      // Exam overlaps with day if start <= dayEnd and end >= dayStart
      return start <= dayEnd && end >= dayStart;
    });
  };

  const today = new Date();
  const isToday = (d: number) => {
    return (
      today.getDate() === d &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  // Build grid items
  const calendarCells = [];

  // Previous month trailing days
  for (let i = startingDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const dayExams = getExamsForDay(prevDate);
    calendarCells.push({
      date: prevDate,
      dayNum,
      isCurrentMonth: false,
      exams: dayExams
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDate = new Date(year, month, d);
    const dayExams = getExamsForDay(dayDate);
    calendarCells.push({
      date: dayDate,
      dayNum: d,
      isCurrentMonth: true,
      exams: dayExams
    });
  }

  // Next month leading days to complete 35 or 42 grid cells
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const nextDate = new Date(year, month + 1, d);
    const dayExams = getExamsForDay(nextDate);
    calendarCells.push({
      date: nextDate,
      dayNum: d,
      isCurrentMonth: false,
      exams: dayExams
    });
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Calendrier Mensuel des Examens
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualisez les fenêtres de début et de fin de vos épreuves Moodle
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            Aujourd'hui
          </button>
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer rounded-lg hover:bg-white dark:hover:bg-slate-700"
              title="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[120px] text-center">
              {monthNamesFR[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer rounded-lg hover:bg-white dark:hover:bg-slate-700"
              title="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 dark:border-slate-800 pb-2">
        {weekDaysFR.map((wd) => (
          <div
            key={wd}
            className="text-[11px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar Month Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {calendarCells.map((cell, idx) => {
          const isTodayCell = cell.isCurrentMonth && isToday(cell.dayNum);
          const hasExams = cell.exams.length > 0;

          return (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.01 }}
              onClick={() => {
                if (hasExams) {
                  setSelectedDayExams({ date: cell.date, exams: cell.exams });
                }
              }}
              className={`min-h-[85px] sm:min-h-[95px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition-all ${
                hasExams ? "cursor-pointer" : "cursor-default"
              } ${
                cell.isCurrentMonth
                  ? isTodayCell
                    ? "bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-500 shadow-xs ring-1 ring-indigo-500/30"
                    : "bg-slate-50/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  : "bg-slate-100/30 dark:bg-slate-950/30 border-slate-100 dark:border-slate-850 opacity-40"
              }`}
            >
              <div className="flex justify-between items-center">
                <span
                  className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                    isTodayCell
                      ? "bg-indigo-600 text-white"
                      : cell.isCurrentMonth
                      ? "text-slate-700 dark:text-slate-300"
                      : "text-slate-400 dark:text-slate-600"
                  }`}
                >
                  {cell.dayNum}
                </span>

                {hasExams && (
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-full font-bold">
                    {cell.exams.length}
                  </span>
                )}
              </div>

              {/* Exam Badges inside day cell */}
              <div className="mt-1 space-y-1 overflow-hidden max-h-[52px]">
                {cell.exams.slice(0, 2).map((ex) => {
                  const isSubmitted = studentSubmissions.some(
                    (s) => s.examId === ex.id
                  );
                  return (
                    <div
                      key={ex.id}
                      className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded truncate flex items-center space-x-1 border ${
                        isSubmitted
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900"
                          : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-900"
                      }`}
                      title={`${ex.title} (${ex.courseTitle || ""})`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current"></span>
                      <span className="truncate">{ex.title}</span>
                    </div>
                  );
                })}
                {cell.exams.length > 2 && (
                  <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 pl-1">
                    +{cell.exams.length - 2} autre(s)
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Day Exams Modal */}
      <AnimatePresence>
        {selectedDayExams && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-lg w-full space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Examens du {selectedDayExams.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {selectedDayExams.exams.length} épreuve(s) programmée(s)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayExams(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {selectedDayExams.exams.map((ex) => {
                  const { start, end } = getExamDates(ex);
                  const isSubmitted = studentSubmissions.some(
                    (s) => s.examId === ex.id
                  );
                  const sub = studentSubmissions.find(
                    (s) => s.examId === ex.id
                  );

                  return (
                    <div
                      key={ex.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md">
                            {ex.courseTitle || "Cours"}
                          </span>
                          <h5 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mt-1">
                            {ex.title}
                          </h5>
                        </div>
                        {isSubmitted ? (
                          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Soumis</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold border border-amber-200 dark:border-amber-800 shrink-0">
                            ⚡ Ouvert
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">Début</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {start.toLocaleDateString("fr-FR")} {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">Fin estimée</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {end.toLocaleDateString("fr-FR")} {end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Durée de composition : <strong>{ex.duration || 30} minutes</strong></span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        {isSubmitted ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDayExams(null);
                              if (sub && onViewSubmission) {
                                onViewSubmission(sub);
                              }
                            }}
                            className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Consulter la copie & Notes</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDayExams(null);
                              onStartExam(ex);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Démarrer la session</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedDayExams(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
