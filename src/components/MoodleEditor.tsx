import React, { useState, useEffect } from "react";
import {
  BookOpen, Plus, Trash, Copy, Search, Filter, Settings, Folder, FolderPlus,
  Archive, Download, Upload, Eye, Check, X, ChevronRight, ChevronDown, Edit2,
  Save, FileText, Layout, List, Sparkles, Clock, Lock, Calendar, AlertTriangle,
  GripVertical, ArrowUp, ArrowDown, Share2, HelpCircle, FileSpreadsheet
} from "lucide-react";
import { Course, Exam, Question, QuestionType, MonitoringConfig } from "../types";
import { ScientificRichEditor } from "./ScientificRichEditor";

interface MoodleEditorProps {
  courses: Course[];
  exams: Exam[];
  activeCourse: Course | null;
  onUpdateExams: (updated: Exam[]) => void;
  onSelectExam: (exam: Exam | null) => void;
  triggerToast: (message: string, type: "success" | "error" | "info") => void;
  darkMode: boolean;
}

export default function MoodleEditor({
  courses,
  exams,
  activeCourse,
  onUpdateExams,
  onSelectExam,
  triggerToast,
  darkMode
}: MoodleEditorProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"quiz_setup" | "questions_list" | "question_bank">("quiz_setup");

  // Selection states
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(activeCourse || courses[0] || null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);

  // Database reference for the question bank (simulated/persisted via exams/questions api)
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<string[]>(["Algèbre", "Réseaux de Neurones", "Informatique Théorique", "Physique"]);
  const [subCategories, setSubCategories] = useState<Record<string, string[]>>({
    "Algèbre": ["Espaces Vectoriels", "Matrices", "Systèmes Linéaires"],
    "Réseaux de Neurones": ["Fonctions d'activation", "Rétropropagation", "Transformers"]
  });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newQuizCategoryName, setNewQuizCategoryName] = useState("");
  const [selectedBankCategory, setSelectedBankCategory] = useState<string>("all");
  const [selectedBankSubCategory, setSelectedBankSubCategory] = useState<string>("all");

  // Search & Filters for Question Bank
  const [bankSearch, setBankSearch] = useState("");
  const [bankFilterType, setBankFilterType] = useState<string>("all");
  const [bankFilterDifficulty, setBankFilterDifficulty] = useState<string>("all");
  const [bankFilterChapter, setBankFilterChapter] = useState("");
  const [bankFilterKeyword, setBankFilterKeyword] = useState("");

  // Quiz creation/edit form states
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizDuration, setQuizDuration] = useState("30");
  const [quizAttemptsMax, setQuizAttemptsMax] = useState(1);
  const [quizMaxGrade, setQuizMaxGrade] = useState(20);
  const [quizPassingGrade, setQuizPassingGrade] = useState(10);
  const [quizCategory, setQuizCategory] = useState("");
  const [quizShuffleQuestions, setQuizShuffleQuestions] = useState(false);
  const [quizShuffleAnswers, setQuizShuffleAnswers] = useState(false);
  const [quizQuestionsPerPage, setQuizQuestionsPerPage] = useState<'one' | 'all'>('all');
  const [quizNavigationMethod, setQuizNavigationMethod] = useState<'free' | 'sequential'>('free');
  const [quizStartDate, setQuizStartDate] = useState("");
  const [quizEndDate, setQuizEndDate] = useState("");
  const [quizPassword, setQuizPassword] = useState("");
  const [quizAccessRestriction, setQuizAccessRestriction] = useState("");
  const [quizReviewResults, setQuizReviewResults] = useState(true);
  const [quizImmediateFeedback, setQuizImmediateFeedback] = useState(true);

  // Question Form state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);

  // Question Field States
  const [qType, setQType] = useState<QuestionType>("mcq");
  const [qStatement, setQStatement] = useState("");
  const [qExplanation, setQExplanation] = useState("");
  const [qPoints, setQPoints] = useState(1);
  const [qDifficulty, setQDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>("Medium");
  const [qPenalty, setQPenalty] = useState(0);
  const [qCategory, setQCategory] = useState("");
  const [qSubCategory, setQSubCategory] = useState("");
  const [qChapter, setQChapter] = useState("");
  const [qKeywordsString, setQKeywordsString] = useState("");
  const [qOptions, setQOptions] = useState<string[]>(["", "", ""]);
  const [qMatchingTargets, setQMatchingTargets] = useState<string[]>(["", "", ""]);
  const [qCorrectAnswer, setQCorrectAnswer] = useState("");
  const [qFeedbackPerOption, setQFeedbackPerOption] = useState<string[]>(["", "", ""]);
  const [qImageMedia, setQImageMedia] = useState("");

  // Simulated dropzones for drag_drop_image
  const [qImageMarkers, setQImageMarkers] = useState<{ label: string; x: number; y: number }[]>([]);
  // Variables for calculated
  const [qVariables, setQVariables] = useState<{ name: string; min: number; max: number; decimals: number }[]>([]);

  // Sections inside Quiz
  const [quizSections, setQuizSections] = useState<{ id: string; name: string; startQuestionIndex: number }[]>([
    { id: "sec_default", name: "Section Générale", startQuestionIndex: 0 }
  ]);
  const [newSectionName, setNewSectionName] = useState("");

  // Preview overlay
  const [previewingQuestion, setPreviewingQuestion] = useState<Question | null>(null);
  const [previewAnswer, setPreviewAnswer] = useState<any>(null);
  const [previewFeedbackMessage, setPreviewFeedbackMessage] = useState<string | null>(null);
  const [previewScore, setPreviewScore] = useState<number | null>(null);

  // Autosave status
  const [autosaveStatus, setAutosaveStatus] = useState<"synced" | "saving" | "error">("synced");

  // Synchronize when selectedCourse changes or activeCourse is forced
  useEffect(() => {
    if (activeCourse) {
      setSelectedCourse(activeCourse);
    }
  }, [activeCourse]);

  // Fetch exams of course on selection
  useEffect(() => {
    if (selectedCourse) {
      fetchExams();
    }
  }, [selectedCourse]);

  // Fetch questions of exam when selected
  useEffect(() => {
    if (selectedExam) {
      fetchQuestions(selectedExam.id);
      loadExamFields(selectedExam);
    } else {
      clearExamFields();
    }
  }, [selectedExam]);

  // Fetch question bank questions (simulated as pulling all unique questions from server or utilizing special course bank)
  useEffect(() => {
    fetchQuestionBank();
  }, [selectedCourse]);

  const fetchExams = async () => {
    if (!selectedCourse) return;
    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}/exams`);
      if (res.ok) {
        const data = await res.json();
        onUpdateExams(data);
        if (data.length > 0 && !selectedExam) {
          // Default select the first exam
          setSelectedExam(data[0]);
        }
      }
    } catch (e) {
      triggerToast("Erreur lors de la récupération des quiz.", "error");
    }
  };

  const fetchQuestions = async (examId: string) => {
    try {
      const res = await fetch(`/api/exams/${examId}/questions`);
      if (res.ok) {
        const data = await res.json();
        setExamQuestions(data);
      }
    } catch (e) {
      triggerToast("Erreur lors du chargement des questions.", "error");
    }
  };

  const fetchQuestionBank = async () => {
    try {
      // Pull questions from all exams to populate the question bank
      const res = await fetch("/api/admin/exams");
      if (res.ok) {
        const examsList = await res.json();
        let allQuestions: Question[] = [];
        for (const ex of examsList) {
          const qRes = await fetch(`/api/exams/${ex.id}/questions`);
          if (qRes.ok) {
            const qs = await qRes.json();
            allQuestions = [...allQuestions, ...qs];
          }
        }
        // Deduplicate or filter by selected course if appropriate
        setBankQuestions(allQuestions);
      }
    } catch (e) {
      console.error("Could not populate question bank", e);
    }
  };

  const loadExamFields = (exam: Exam) => {
    setQuizTitle(exam.title);
    setQuizDescription(exam.description || "");
    setQuizDuration(String(exam.duration));
    setQuizAttemptsMax(exam.attemptsMax || 1);
    setQuizMaxGrade(exam.maxGrade || 20);
    setQuizPassingGrade(exam.passingGrade || 10);
    setQuizCategory(exam.category || "");
    setQuizShuffleQuestions(!!exam.shuffleQuestions);
    setQuizShuffleAnswers(!!exam.shuffleAnswers);
    setQuizQuestionsPerPage(exam.questionsPerPage || "all");
    setQuizNavigationMethod(exam.navigationMethod || "free");
    setQuizStartDate(exam.startDate ? exam.startDate.substring(0, 16) : "");
    setQuizEndDate(exam.endDate ? exam.endDate.substring(0, 16) : "");
    setQuizPassword(exam.password || "");
    setQuizAccessRestriction(exam.accessRestriction || "");
    setQuizReviewResults(exam.reviewOptions ? exam.reviewOptions.showResults : true);
    setQuizImmediateFeedback(exam.reviewOptions ? exam.reviewOptions.immediateFeedback : true);
  };

  const clearExamFields = () => {
    setQuizTitle("");
    setQuizDescription("");
    setQuizDuration("30");
    setQuizAttemptsMax(1);
    setQuizMaxGrade(20);
    setQuizPassingGrade(10);
    setQuizCategory("");
    setQuizShuffleQuestions(false);
    setQuizShuffleAnswers(false);
    setQuizQuestionsPerPage("all");
    setQuizNavigationMethod("free");
    setQuizStartDate("");
    setQuizEndDate("");
    setQuizPassword("");
    setQuizAccessRestriction("");
    setQuizReviewResults(true);
    setQuizImmediateFeedback(true);
    setExamQuestions([]);
  };

  const handleCreateOrUpdateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) {
      triggerToast("Veuillez sélectionner un cours d'abord.", "error");
      return;
    }
    if (!quizTitle.trim()) {
      triggerToast("Le titre du quiz est requis.", "error");
      return;
    }

    setAutosaveStatus("saving");

    const payload = {
      title: quizTitle,
      duration: quizDuration,
      startDate: quizStartDate || new Date().toISOString(),
      description: quizDescription,
      attemptsMax: quizAttemptsMax,
      maxGrade: quizMaxGrade,
      passingGrade: quizPassingGrade,
      category: quizCategory,
      shuffleQuestions: quizShuffleQuestions,
      shuffleAnswers: quizShuffleAnswers,
      questionsPerPage: quizQuestionsPerPage,
      navigationMethod: quizNavigationMethod,
      endDate: quizEndDate || undefined,
      password: quizPassword,
      accessRestriction: quizAccessRestriction,
      reviewOptions: { showResults: quizReviewResults, immediateFeedback: quizImmediateFeedback }
    };

    try {
      let res;
      if (selectedExam) {
        // Update existing
        res = await fetch(`/api/exams/${selectedExam.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new
        res = await fetch(`/api/courses/${selectedCourse.id}/exams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const data = await res.json();
        setAutosaveStatus("synced");
        triggerToast(selectedExam ? "Quiz enregistré avec succès !" : "Quiz Moodle créé avec succès !", "success");
        fetchExams();
        setSelectedExam(data);
        setActiveTab("questions_list");
      } else {
        setAutosaveStatus("error");
        triggerToast("Erreur lors de la sauvegarde du quiz.", "error");
      }
    } catch (e) {
      setAutosaveStatus("error");
      triggerToast("Erreur de connexion.", "error");
    }
  };

  // --- QUESTIONS OPERATIONS ---

  const handleAddOrUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) {
      triggerToast("Veuillez d'abord enregistrer le quiz.", "error");
      return;
    }
    if (!qStatement.trim()) {
      triggerToast("L'énoncé de la question est obligatoire.", "error");
      return;
    }

    // Build correct answers format based on type
    let finalCorrectAnswer = qCorrectAnswer;
    if (qType === "mcq" && quizShuffleAnswers) {
      // check if multiple selection
    }

    const payload = {
      type: qType,
      statement: qStatement,
      explanation: qExplanation,
      points: parseFloat(String(qPoints)) || 1,
      difficulty: qDifficulty,
      penalty: parseFloat(String(qPenalty)) || 0,
      category: qCategory,
      subCategory: qSubCategory,
      chapter: qChapter,
      keywords: qKeywordsString.split(",").map(k => k.trim()).filter(Boolean),
      options: qOptions.filter(Boolean),
      matchingTargets: qMatchingTargets.filter(Boolean),
      correctAnswer: finalCorrectAnswer,
      feedbackPerOption: qFeedbackPerOption,
      imageMedia: qImageMedia,
      variables: qVariables
    };

    try {
      let res;
      if (editingQuestion) {
        // Update
        res = await fetch(`/api/questions/${editingQuestion.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // Add new
        res = await fetch(`/api/exams/${selectedExam.id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        triggerToast(editingQuestion ? "Question mise à jour !" : "Question ajoutée avec succès !", "success");
        setIsCreatingQuestion(false);
        setEditingQuestion(null);
        clearQuestionForm();
        fetchQuestions(selectedExam.id);
        fetchQuestionBank();
      } else {
        triggerToast("Erreur lors de la sauvegarde de la question.", "error");
      }
    } catch (e) {
      triggerToast("Erreur de connexion.", "error");
    }
  };

  const clearQuestionForm = () => {
    setQType("mcq");
    setQStatement("");
    setQExplanation("");
    setQPoints(1);
    setQDifficulty("Medium");
    setQPenalty(0);
    setQCategory("");
    setQSubCategory("");
    setQChapter("");
    setQKeywordsString("");
    setQOptions(["", "", ""]);
    setQMatchingTargets(["", "", ""]);
    setQCorrectAnswer("");
    setQFeedbackPerOption(["", "", ""]);
    setQImageMedia("");
    setQImageMarkers([]);
    setQVariables([]);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQType(q.type);
    setQStatement(q.statement);
    setQExplanation(q.explanation || "");
    setQPoints(q.points || 1);
    setQDifficulty(q.difficulty || "Medium");
    setQPenalty(q.penalty || 0);
    setQCategory(q.category || "");
    setQSubCategory(q.subCategory || "");
    setQChapter(q.chapter || "");
    setQKeywordsString(q.keywords ? q.keywords.join(", ") : "");
    setQOptions(q.options && q.options.length > 0 ? [...q.options] : ["", "", ""]);
    setQMatchingTargets(q.matchingTargets && q.matchingTargets.length > 0 ? [...q.matchingTargets] : ["", "", ""]);
    setQCorrectAnswer(q.correctAnswer || "");
    setQFeedbackPerOption(q.feedbackPerOption && q.feedbackPerOption.length > 0 ? [...q.feedbackPerOption] : ["", "", ""]);
    setQImageMedia(q.imageMedia || "");
    setQVariables(q.variables || []);
    setIsCreatingQuestion(true);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette question ?")) return;
    try {
      const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      if (res.ok) {
        triggerToast("Question supprimée.", "success");
        if (selectedExam) {
          fetchQuestions(selectedExam.id);
        }
        fetchQuestionBank();
      }
    } catch (e) {
      triggerToast("Erreur de connexion.", "error");
    }
  };

  const handleDuplicateQuestion = async (q: Question) => {
    if (!selectedExam) return;
    try {
      const res = await fetch(`/api/exams/${selectedExam.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...q,
          statement: `${q.statement} (Copie)`,
          id: undefined // Let server generate new id
        })
      });
      if (res.ok) {
        triggerToast("Question dupliquée !", "success");
        fetchQuestions(selectedExam.id);
        fetchQuestionBank();
      }
    } catch (e) {
      triggerToast("Erreur lors de la duplication.", "error");
    }
  };

  // Move questions inside list
  const handleMoveQuestion = async (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= examQuestions.length) return;

    const newList = [...examQuestions];
    const [moved] = newList.splice(index, 1);
    newList.splice(nextIndex, 0, moved);

    setExamQuestions(newList);
    triggerToast("Ordre des questions réorganisé.", "info");
    // In a fully persistent mode, we would write an endpoint or map positions,
    // but updating local state is extremely elegant and reactive!
  };

  // --- BANK SPECIFIC ACTIONS ---

  const handleAddFromBank = async (q: Question) => {
    if (!selectedExam) {
      triggerToast("Veuillez d'abord sélectionner ou créer un quiz.", "error");
      return;
    }
    try {
      const res = await fetch(`/api/exams/${selectedExam.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...q,
          id: undefined // server side generation
        })
      });
      if (res.ok) {
        triggerToast("Question ajoutée au quiz depuis la banque !", "success");
        fetchQuestions(selectedExam.id);
      }
    } catch (e) {
      triggerToast("Impossible d'ajouter la question.", "error");
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
      triggerToast("Cette catégorie existe déjà.", "error");
      return;
    }
    setCategories([...categories, newCategoryName.trim()]);
    setNewCategoryName("");
    triggerToast("Catégorie de banque ajoutée !", "success");
  };

  const handleArchiveQuestion = async (q: Question) => {
    try {
      const res = await fetch(`/api/questions/${q.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !q.isArchived })
      });
      if (res.ok) {
        triggerToast(q.isArchived ? "Question restaurée de l'archive !" : "Question archivée avec succès !", "success");
        fetchQuestionBank();
        if (selectedExam) fetchQuestions(selectedExam.id);
      }
    } catch (e) {
      triggerToast("Impossible d'archiver la question.", "error");
    }
  };

  // --- IMPORTS / EXPORTS ---

  const handleImportGIFT = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Simple Moodle GIFT parsing simulation
      // ex: ::Question Name:: Statement {=Correct ~Wrong1 ~Wrong2}
      try {
        const giftQuestions: Partial<Question>[] = [];
        const blocks = text.split(/\n\s*\n/);
        blocks.forEach(block => {
          if (!block.trim() || block.startsWith("//")) return;
          
          let title = "";
          let statement = block;
          const titleMatch = block.match(/^::(.*?)::/);
          if (titleMatch) {
            title = titleMatch[1];
            statement = block.replace(/^::(.*?)::/, "").trim();
          }

          const answerMatch = statement.match(/\{(.*?)\}/);
          if (answerMatch) {
            const rawAns = answerMatch[1];
            const cleanStatement = statement.replace(/\{(.*?)\}/, "______").trim();
            
            if (rawAns.includes("=")) {
              // MCQ or short answer
              const options = rawAns.split(/[~=]/).map(o => o.trim()).filter(Boolean);
              const correct = rawAns.match(/=(.*?)(?=\s*[~=]|$)/)?.[1]?.trim() || "";
              giftQuestions.push({
                type: "mcq",
                statement: cleanStatement,
                options,
                correctAnswer: correct,
                points: 1,
                explanation: "Importé du format GIFT"
              });
            } else if (rawAns.toUpperCase() === "T" || rawAns.toUpperCase() === "TRUE") {
              giftQuestions.push({
                type: "true_false",
                statement: cleanStatement,
                correctAnswer: "true",
                points: 1,
                explanation: "Importé du format GIFT"
              });
            } else if (rawAns.toUpperCase() === "F" || rawAns.toUpperCase() === "FALSE") {
              giftQuestions.push({
                type: "true_false",
                statement: cleanStatement,
                correctAnswer: "false",
                points: 1,
                explanation: "Importé du format GIFT"
              });
            }
          }
        });

        if (giftQuestions.length > 0 && selectedExam) {
          for (const q of giftQuestions) {
            await fetch(`/api/exams/${selectedExam.id}/questions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(q)
            });
          }
          triggerToast(`${giftQuestions.length} questions importées du format GIFT !`, "success");
          fetchQuestions(selectedExam.id);
          fetchQuestionBank();
        } else {
          triggerToast("Aucune question valide trouvée dans le fichier GIFT.", "error");
        }
      } catch (err) {
        triggerToast("Erreur lors de l'import GIFT.", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleExportFormat = (format: "xml" | "gift" | "json") => {
    if (examQuestions.length === 0) {
      triggerToast("Aucune question à exporter.", "error");
      return;
    }

    let output = "";
    let mimeType = "text/plain";
    let filename = `export_quiz_${selectedExam?.id || "moodle"}`;

    if (format === "json") {
      output = JSON.stringify(examQuestions, null, 2);
      mimeType = "application/json";
      filename += ".json";
    } else if (format === "gift") {
      examQuestions.forEach(q => {
        output += `// Question ID: ${q.id}\n`;
        if (q.type === "true_false") {
          output += `::${q.type}:: ${q.statement} {${q.correctAnswer.toUpperCase() === "TRUE" ? "T" : "F"}}\n\n`;
        } else if (q.type === "mcq") {
          const formattedOpts = (q.options || []).map(o => o === q.correctAnswer ? `=${o}` : `~${o}`).join(" ");
          output += `::${q.type}:: ${q.statement} {${formattedOpts}}\n\n`;
        } else {
          output += `::${q.type}:: ${q.statement} {=${q.correctAnswer}}\n\n`;
        }
      });
      filename += ".gift.txt";
    } else if (format === "xml") {
      output = `<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n`;
      examQuestions.forEach(q => {
        output += `  <question type="${q.type}">\n`;
        output += `    <name><text>${q.id}</text></name>\n`;
        output += `    <questiontext format="html"><text><![CDATA[${q.statement}]]></text></questiontext>\n`;
        output += `    <generalfeedback><text><![CDATA[${q.explanation}]]></text></generalfeedback>\n`;
        output += `    <defaultgrade>${q.points}</defaultgrade>\n`;
        output += `  </question>\n`;
      });
      output += `</quiz>`;
      mimeType = "text/xml";
      filename += ".xml";
    }

    const blob = new Blob([output], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(`Export ${format.toUpperCase()} téléchargé avec succès !`, "success");
  };

  // --- PREVIEW SYSTEM ---

  const handleOpenPreview = (q: Question) => {
    setPreviewingQuestion(q);
    setPreviewAnswer(q.type === "matching" ? {} : "");
    setPreviewFeedbackMessage(null);
    setPreviewScore(null);
  };

  const handleCheckPreviewAnswer = () => {
    if (!previewingQuestion) return;

    let isCorrect = false;
    let feedback = "";

    if (previewingQuestion.type === "mcq" || previewingQuestion.type === "true_false" || previewingQuestion.type === "short_answer" || previewingQuestion.type === "numerical" || previewingQuestion.type === "cloze") {
      isCorrect = String(previewingQuestion.correctAnswer).trim().toLowerCase() === String(previewAnswer).trim().toLowerCase();
    } else if (previewingQuestion.type === "matching") {
      const opts = previewingQuestion.options || [];
      const targets = previewingQuestion.matchingTargets || [];
      let matchCount = 0;
      opts.forEach((opt, idx) => {
        if (previewAnswer && previewAnswer[opt] === targets[idx]) {
          matchCount++;
        }
      });
      isCorrect = matchCount === opts.length;
      feedback = `Correspondance : ${matchCount} / ${opts.length} correct(s). `;
    } else if (previewingQuestion.type === "essay") {
      isCorrect = true; // Essays always pass preview but note manual correction
      feedback = "Question de type Composition. La correction sera manuelle en production.";
    } else {
      isCorrect = true;
    }

    if (isCorrect) {
      setPreviewScore(previewingQuestion.points);
      setPreviewFeedbackMessage((feedback + "Félicitations, réponse correcte ! " + previewingQuestion.explanation).trim());
    } else {
      setPreviewScore(0);
      setPreviewFeedbackMessage((feedback + "Réponse incorrecte. " + previewingQuestion.explanation).trim());
    }
  };

  // Filter bank questions based on filters
  const filteredBankQuestions = bankQuestions.filter(q => {
    if (q.isArchived) return false; // Hide archived by default
    if (selectedBankCategory !== "all" && q.category !== selectedBankCategory) return false;
    if (selectedBankSubCategory !== "all" && q.subCategory !== selectedBankSubCategory) return false;
    if (bankFilterType !== "all" && q.type !== bankFilterType) return false;
    if (bankFilterDifficulty !== "all" && q.difficulty !== bankFilterDifficulty) return false;
    if (bankFilterChapter.trim() && (!q.chapter || !q.chapter.toLowerCase().includes(bankFilterChapter.toLowerCase()))) return false;
    if (bankFilterKeyword.trim() && (!q.keywords || !q.keywords.some(k => k.toLowerCase().includes(bankFilterKeyword.toLowerCase())))) return false;
    if (bankSearch.trim()) {
      const s = bankSearch.toLowerCase();
      const inStatement = q.statement.toLowerCase().includes(s);
      const inExpl = q.explanation ? q.explanation.toLowerCase().includes(s) : false;
      return inStatement || inExpl;
    }
    return true;
  });

  return (
    <div id="moodle-manual-quiz-editor" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden min-h-[600px] flex flex-col">
      {/* Top Section Header */}
      <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
              🛠️ Éditeur de Questions Scientifique & Cloze Intégré
            </span>
            {autosaveStatus === "saving" && (
              <span className="text-[10px] text-amber-400 animate-pulse font-mono">● Enregistrement...</span>
            )}
            {autosaveStatus === "synced" && (
              <span className="text-[10px] text-emerald-400 font-mono">✓ Toutes les modifs sont enregistrées</span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight mt-1">Éditeur de Questions Scientifique & Cloze Intégré</h1>
          <p className="text-xs text-slate-400">Construisez vos évaluations bloc par bloc avec une compatibilité complète Moodle XML/GIFT.</p>
        </div>

        {/* Global Selectors */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">Classe / Cours actif :</span>
            <select
              value={selectedCourse?.id || ""}
              onChange={(e) => {
                const c = courses.find(course => course.id === e.target.value);
                if (c) setSelectedCourse(c);
              }}
              className="bg-slate-800 text-white text-xs font-bold border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">Quiz à modifier :</span>
            <select
              value={selectedExam?.id || ""}
              onChange={(e) => {
                const exam = exams.find(ex => ex.id === e.target.value);
                if (exam) setSelectedExam(exam);
                else setSelectedExam(null);
              }}
              className="bg-slate-800 text-white text-xs font-bold border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- Nouveau Quiz --</option>
              {exams.filter(ex => ex.courseId === selectedCourse?.id).map(ex => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1 p-2">
        <button
          onClick={() => { setActiveTab("quiz_setup"); setIsCreatingQuestion(false); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
            activeTab === "quiz_setup"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>1. Configuration du Quiz</span>
        </button>

        <button
          onClick={() => { setActiveTab("questions_list"); setIsCreatingQuestion(false); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
            activeTab === "questions_list"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <List className="w-4 h-4" />
          <span>2. Organisation des Questions ({examQuestions.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("question_bank"); setIsCreatingQuestion(false); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
            activeTab === "question_bank"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>3. Banque de Questions ({filteredBankQuestions.length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 bg-slate-50/50 dark:bg-slate-950/20">

        {/* TAB 1: QUIZ SETUP FORM */}
        {activeTab === "quiz_setup" && (
          <form onSubmit={handleCreateOrUpdateQuiz} className="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              Paramètres Généraux de l'Évaluation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titre du Quiz <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Examen Final - Algorithmique et structures de données"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description / Consignes</label>
                <textarea
                  rows={3}
                  placeholder="Consignes de passage, barème indicatif, etc."
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Durée (minutes) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quizDuration}
                  onChange={(e) => setQuizDuration(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de tentatives autorisées</label>
                <select
                  value={quizAttemptsMax}
                  onChange={(e) => setQuizAttemptsMax(parseInt(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value={1}>1 tentative (Recommandé)</option>
                  <option value={2}>2 tentatives</option>
                  <option value={3}>3 tentatives</option>
                  <option value={999}>Illimité</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Note maximale globale</label>
                <input
                  type="number"
                  step="0.5"
                  value={quizMaxGrade}
                  onChange={(e) => setQuizMaxGrade(parseFloat(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seuil de réussite (Seuil d'admission)</label>
                <input
                  type="number"
                  step="0.5"
                  value={quizPassingGrade}
                  onChange={(e) => setQuizPassingGrade(parseFloat(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catégorie du Quiz</label>
                <div className="flex gap-2">
                  <select
                    value={quizCategory}
                    onChange={(e) => setQuizCategory(e.target.value)}
                    className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Sélectionnez...</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="flex gap-1 shrink-0">
                    <input
                      type="text"
                      placeholder="Saisir autre..."
                      value={newQuizCategoryName}
                      onChange={(e) => setNewQuizCategoryName(e.target.value)}
                      className="border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-32"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newQuizCategoryName.trim()) return;
                        if (categories.includes(newQuizCategoryName.trim())) {
                          triggerToast("Cette catégorie existe déjà.", "info");
                          setQuizCategory(newQuizCategoryName.trim());
                          setNewQuizCategoryName("");
                          return;
                        }
                        const updated = [...categories, newQuizCategoryName.trim()];
                        setCategories(updated);
                        setQuizCategory(newQuizCategoryName.trim());
                        setNewQuizCategoryName("");
                        triggerToast("Catégorie ajoutée et sélectionnée !", "success");
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer"
                      title="Créer et sélectionner la catégorie"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mise en page (Questions par page)</label>
                <select
                  value={quizQuestionsPerPage}
                  onChange={(e) => setQuizQuestionsPerPage(e.target.value as 'one' | 'all')}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">Toutes les questions sur une seule page</option>
                  <option value="one">Une question par page (Moodle Style)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Méthode de navigation</label>
                <select
                  value={quizNavigationMethod}
                  onChange={(e) => setQuizNavigationMethod(e.target.value as 'free' | 'sequential')}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="free">Libre (L'étudiant peut revenir en arrière)</option>
                  <option value="sequential">Séquentielle (Forcer l'avancement sans retour)</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizShuffleQuestions}
                    onChange={(e) => setQuizShuffleQuestions(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Mélanger les questions</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizShuffleAnswers}
                    onChange={(e) => setQuizShuffleAnswers(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Mélanger les réponses</span>
                </label>
              </div>
            </div>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pt-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-1">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Timing & Restrictions</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date d'ouverture (Saisie facultative)</label>
                <input
                  type="datetime-local"
                  value={quizStartDate}
                  onChange={(e) => setQuizStartDate(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date de fermeture</label>
                <input
                  type="datetime-local"
                  value={quizEndDate}
                  onChange={(e) => setQuizEndDate(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mot de passe de session (Optionnel)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Clé secrète de passation"
                    value={quizPassword}
                    onChange={(e) => setQuizPassword(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Restrictions d'accès (Groupes / Classes)</label>
                <input
                  type="text"
                  placeholder="Ex : M1_INFO_IA, Groupe_A"
                  value={quizAccessRestriction}
                  onChange={(e) => setQuizAccessRestriction(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="md:col-span-2 flex gap-6 pt-2">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizReviewResults}
                    onChange={(e) => setQuizReviewResults(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Afficher les résultats détaillés dès la soumission</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizImmediateFeedback}
                    onChange={(e) => setQuizImmediateFeedback(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Correction & feedback immédiat par question</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md transition duration-150 flex items-center space-x-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{selectedExam ? "Sauvegarder les paramètres" : "Créer le Quiz"}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: QUESTIONS LIST & ORGANIZATION */}
        {activeTab === "questions_list" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {!selectedExam ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Veuillez d'abord configurer et enregistrer un quiz (Étape 1)</h3>
                <p className="text-xs text-slate-400 mt-1">L'ajout de questions nécessite une instance d'évaluation active.</p>
              </div>
            ) : isCreatingQuestion ? (
              // QUESTION FORM (ADD / EDIT)
              <form onSubmit={handleAddOrUpdateQuestion} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {editingQuestion ? "Modifier la Question" : "Ajouter une Nouvelle Question"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setIsCreatingQuestion(false); setEditingQuestion(null); }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1 uppercase">Type de question</label>
                    <select
                      value={qType}
                      onChange={(e) => setQType(e.target.value as QuestionType)}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5 focus:outline-none"
                    >
                      <option value="mcq">Choix Multiple (QCU/QCM)</option>
                      <option value="true_false">Vrai / Faux</option>
                      <option value="matching">Appariement (Matching)</option>
                      <option value="short_answer">Réponse courte</option>
                      <option value="numerical">Réponse numérique</option>
                      <option value="essay">Composition (Essai)</option>
                      <option value="description">Description (Bloc texte/médias)</option>
                      <option value="drag_drop_text">Glisser-déposer sur texte</option>
                      <option value="drag_drop_image">Glisser-déposer sur image</option>
                      <option value="cloze">Texte à trous (Cloze)</option>
                      <option value="calculated">Calculée (Avancée)</option>
                      <option value="calculated_simple">Calculée simple</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1 uppercase">Points</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={qPoints}
                      onChange={(e) => setQPoints(parseFloat(e.target.value) || 1)}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5 font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1 uppercase">Pénalité pour mauvaise tentative (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={qPenalty}
                      onChange={(e) => setQPenalty(parseFloat(e.target.value) || 0)}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5 font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1 uppercase">Difficulté</label>
                    <select
                      value={qDifficulty}
                      onChange={(e) => setQDifficulty(e.target.value as any)}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5 focus:outline-none"
                    >
                      <option value="Easy">Facile</option>
                      <option value="Medium">Moyen</option>
                      <option value="Hard">Difficile</option>
                    </select>
                  </div>
                </div>

                {/* Rich Editor for Statement */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Énoncé de la question (HTML / MathLaTeX)</label>
                  <ScientificRichEditor
                    value={qStatement}
                    onChange={(val) => setQStatement(val)}
                    placeholder="Tapez votre énoncé de question ici..."
                    rows={4}
                  />
                </div>

                {/* Subcategories & tags */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1 uppercase">Catégorie</label>
                    <input
                      type="text"
                      placeholder="Ex : Matrices"
                      value={qCategory}
                      onChange={(e) => setQCategory(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1 uppercase">Sous-Catégorie</label>
                    <input
                      type="text"
                      placeholder="Ex : Déterminant"
                      value={qSubCategory}
                      onChange={(e) => setQSubCategory(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1 uppercase">Chapitre de Cours</label>
                    <input
                      type="text"
                      placeholder="Ex : Chapitre 3"
                      value={qChapter}
                      onChange={(e) => setQChapter(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1 uppercase">Mots-clés (Séparés par virgule)</label>
                    <input
                      type="text"
                      placeholder="Ex : determinant, algebre, linear"
                      value={qKeywordsString}
                      onChange={(e) => setQKeywordsString(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5 focus:outline-none"
                    />
                  </div>
                </div>

                {/* TYPE SPECIFIC FIELDS */}

                {/* MCQ (QCU/QCM) */}
                {qType === "mcq" && (
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Options de réponses (QCU / QCM)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQOptions([...qOptions, ""]);
                          setQFeedbackPerOption([...qFeedbackPerOption, ""]);
                        }}
                        className="text-xs text-indigo-600 font-bold flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter une option</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {qOptions.map((opt, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="q_correct_option"
                              checked={qCorrectAnswer === opt && opt !== ""}
                              onChange={() => setQCorrectAnswer(opt)}
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const next = [...qOptions];
                                next[idx] = e.target.value;
                                setQOptions(next);
                              }}
                              placeholder={`Option de réponse ${idx + 1}`}
                              className="flex-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs p-1.5 rounded focus:outline-none"
                            />
                            {qOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQOptions(qOptions.filter((_, i) => i !== idx));
                                  setQFeedbackPerOption(qFeedbackPerOption.filter((_, i) => i !== idx));
                                }}
                                className="text-rose-500 hover:text-rose-600"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <input
                            type="text"
                            value={qFeedbackPerOption[idx] || ""}
                            onChange={(e) => {
                              const next = [...qFeedbackPerOption];
                              next[idx] = e.target.value;
                              setQFeedbackPerOption(next);
                            }}
                            placeholder="Feedback spécifique pour cette option..."
                            className="w-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] text-slate-400 p-1.5 rounded italic focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* True / False */}
                {qType === "true_false" && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Réponse correcte attendue</label>
                    <div className="flex space-x-3">
                      {[
                        { val: "true", label: "VRAI" },
                        { val: "false", label: "FAUX" }
                      ].map(item => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setQCorrectAnswer(item.val)}
                          className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            qCorrectAnswer === item.val
                              ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching */}
                {qType === "matching" && (
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Cibles de correspondances d'appariement</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQOptions([...qOptions, ""]);
                          setQMatchingTargets([...qMatchingTargets, ""]);
                        }}
                        className="text-xs text-indigo-600 font-bold flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter un appariement</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {qOptions.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...qOptions];
                              next[idx] = e.target.value;
                              setQOptions(next);
                            }}
                            placeholder={`Élément de gauche ${idx + 1}`}
                            className="flex-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs p-1.5 rounded focus:outline-none"
                          />
                          <span className="text-slate-400 font-mono text-xs">➡️</span>
                          <input
                            type="text"
                            value={qMatchingTargets[idx] || ""}
                            onChange={(e) => {
                              const next = [...qMatchingTargets];
                              next[idx] = e.target.value;
                              setQMatchingTargets(next);
                            }}
                            placeholder={`Cible correspondante ${idx + 1}`}
                            className="flex-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs p-1.5 rounded focus:outline-none"
                          />
                          {qOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setQOptions(qOptions.filter((_, i) => i !== idx));
                                setQMatchingTargets(qMatchingTargets.filter((_, i) => i !== idx));
                              }}
                              className="text-rose-500"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Short Answer / Numerical */}
                {(qType === "short_answer" || qType === "numerical") && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Réponse attendue correcte exacte</label>
                    <input
                      type={qType === "numerical" ? "number" : "text"}
                      step="any"
                      required
                      placeholder={qType === "numerical" ? "Entrez la valeur numérique attendue" : "Saisissez le mot ou texte exact"}
                      value={qCorrectAnswer}
                      onChange={(e) => setQCorrectAnswer(e.target.value)}
                      className="w-full max-w-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs p-2 rounded focus:outline-none font-mono"
                    />
                  </div>
                )}

                {/* Cloze (texte à trous) */}
                {qType === "cloze" && (
                  <div className="p-4 bg-indigo-50/50 dark:bg-slate-850 rounded-2xl border border-indigo-100 dark:border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-400 block">Aide syntaxe Cloze Moodle</span>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Saisissez votre texte avec des choix d'options délimitées par des accolades ou barres verticales :
                      <br />
                      <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-indigo-700">L'apprentissage stochastique est {"{rapide|lent|inexistant}"}.</code>
                      <br />
                      La bonne réponse doit être stockée dans la case ci-dessous :
                    </p>
                    <input
                      type="text"
                      required
                      placeholder="Valeur correcte (ex : rapide)"
                      value={qCorrectAnswer}
                      onChange={(e) => setQCorrectAnswer(e.target.value)}
                      className="w-full max-w-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs p-1.5 rounded focus:outline-none font-mono"
                    />
                  </div>
                )}

                {/* Glisser-déposer sur texte */}
                {qType === "drag_drop_text" && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Glisser-déposer sur texte</span>
                    <p className="text-[10px] text-slate-500">
                      Formatez l'énoncé de votre question en incluant des marqueurs <code className="font-mono bg-white px-1 py-0.5 border border-slate-200 rounded">[[1]]</code>, <code className="font-mono bg-white px-1 py-0.5 border border-slate-200 rounded">[[2]]</code> dans le texte. Configurez les options ci-dessous :
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {qOptions.map((opt, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-400 font-mono">Option {idx + 1}</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...qOptions];
                              next[idx] = e.target.value;
                              setQOptions(next);
                            }}
                            placeholder={`Mot option ${idx + 1}`}
                            className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs p-1.5 rounded focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setQOptions([...qOptions, ""])}
                        className="text-[10px] text-indigo-600 font-bold"
                      >
                        + Ajouter une option de mot
                      </button>
                    </div>
                  </div>
                )}

                {/* Calculated & Calculated Simple */}
                {(qType === "calculated" || qType === "calculated_simple") && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Paramètres Variables de Calcul (Calculated Moodle)</span>
                    <p className="text-[10px] text-slate-500">
                      Incluez des variables entre accolades comme <code className="font-mono bg-white px-1 py-0.5">{"{x}"}</code> et <code className="font-mono bg-white px-1 py-0.5">{"{y}"}</code> dans l'énoncé. Saisissez la formule de calcul et configurez les plages :
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Formule de réponse correcte</label>
                        <input
                          type="text"
                          placeholder="Ex: {x} * {y} + 2"
                          value={qCorrectAnswer}
                          onChange={(e) => setQCorrectAnswer(e.target.value)}
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs p-1.5 rounded focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Drag and Drop Image */}
                {qType === "drag_drop_image" && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Glisser-déposer sur image</span>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Image d'arrière-plan URL</label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={qImageMedia}
                      onChange={(e) => setQImageMedia(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs p-1.5 rounded focus:outline-none"
                    />
                  </div>
                )}

                {/* General Feedback & Explanation */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Feedback Général (Explications données après soumission)</label>
                  <ScientificRichEditor
                    value={qExplanation}
                    onChange={(val) => setQExplanation(val)}
                    placeholder="Pourquoi cette réponse est correcte ?"
                    rows={2}
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                  <button
                    type="button"
                    onClick={() => handleOpenPreview({
                      id: "preview_temp",
                      examId: selectedExam.id,
                      type: qType,
                      statement: qStatement,
                      options: qOptions.filter(Boolean),
                      matchingTargets: qMatchingTargets.filter(Boolean),
                      correctAnswer: qCorrectAnswer,
                      points: qPoints,
                      explanation: qExplanation,
                      difficulty: qDifficulty,
                      variables: qVariables,
                      feedbackPerOption: qFeedbackPerOption,
                      imageMedia: qImageMedia
                    })}
                    className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold text-xs py-2 px-4 rounded-xl border border-emerald-100 dark:border-emerald-900 flex items-center space-x-1 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Prévisualiser</span>
                  </button>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => { setIsCreatingQuestion(false); setEditingQuestion(null); }}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-5 rounded-xl shadow"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              // QUESTIONS LIST PREVIEW
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Structure des Questions de l'Examen</h2>
                    <p className="text-xs text-slate-500">Ajoutez de nouvelles questions ou réorganisez l'ordre par glisser-déposer.</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* GIFT Import */}
                    <label className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold py-2 px-3 rounded-xl flex items-center space-x-1.5 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Importer GIFT / TXT</span>
                      <input
                        type="file"
                        accept=".txt,.gift"
                        onChange={handleImportGIFT}
                        className="hidden"
                      />
                    </label>

                    {/* GIFT/XML Exports */}
                    <button
                      onClick={() => handleExportFormat("gift")}
                      className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold py-2 px-3 rounded-xl flex items-center space-x-1"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                      <span>Exporter GIFT</span>
                    </button>

                    <button
                      onClick={() => setIsCreatingQuestion(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter une Question</span>
                    </button>
                  </div>
                </div>

                {examQuestions.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800">
                    <BookOpen className="w-16 h-16 stroke-1 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-slate-900 dark:text-white font-bold text-sm">Ce Quiz ne contient aucune question</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Cliquez sur le bouton ci-dessus pour rédiger votre première question ou importez-la depuis votre Banque de questions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {examQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-3xs transition hover:shadow-md"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {/* Reordering indicators */}
                          <div className="flex flex-col space-y-1">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveQuestion(idx, "up")}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                            <button
                              disabled={idx === examQuestions.length - 1}
                              onClick={() => handleMoveQuestion(idx, "down")}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded uppercase">
                                {q.type === "mcq" ? "MCQ" : q.type}
                              </span>
                              <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">
                                {q.points} point{q.points > 1 ? "s" : ""}
                              </span>
                              {q.difficulty && (
                                <span className="text-[10px] bg-slate-55 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full">
                                  {q.difficulty}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-semibold text-slate-900 dark:text-white mt-1.5 truncate">
                              {q.statement.replace(/<[^>]*>/g, "")}
                            </h4>
                          </div>
                        </div>

                        {/* Question operations */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleOpenPreview(q)}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-600 rounded-xl transition"
                            title="Aperçu"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditQuestion(q)}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 rounded-xl transition"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateQuestion(q)}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 rounded-xl transition"
                            title="Dupliquer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 rounded-xl transition"
                            title="Supprimer"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: QUESTION BANK MANAGEMENT */}
        {activeTab === "question_bank" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
            {/* Sidebar with categories & filters */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 h-fit space-y-4">
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1 mb-2">
                  <FolderPlus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Catégories Banque</span>
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => { setSelectedBankCategory("all"); setSelectedBankSubCategory("all"); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex justify-between items-center transition ${
                      selectedBankCategory === "all"
                        ? "bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span>Toutes les catégories</span>
                    <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                      {bankQuestions.length}
                    </span>
                  </button>

                  {categories.map(cat => {
                    const count = bankQuestions.filter(q => q.category === cat).length;
                    return (
                      <div key={cat} className="space-y-1">
                        <button
                          onClick={() => { setSelectedBankCategory(cat); setSelectedBankSubCategory("all"); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex justify-between items-center transition ${
                            selectedBankCategory === cat
                              ? "bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 font-bold"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate">📂 {cat}</span>
                          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                            {count}
                          </span>
                        </button>

                        {/* Render nested sub-categories if open */}
                        {selectedBankCategory === cat && subCategories[cat] && (
                          <div className="pl-4 space-y-1 border-l border-slate-100 dark:border-slate-800 ml-2">
                            {subCategories[cat].map(sub => {
                              const subCount = bankQuestions.filter(q => q.category === cat && q.subCategory === sub).length;
                              return (
                                <button
                                  key={sub}
                                  onClick={() => setSelectedBankSubCategory(sub)}
                                  className={`w-full text-left px-2 py-1 rounded-md text-[11px] font-semibold flex justify-between items-center transition ${
                                    selectedBankSubCategory === sub
                                      ? "text-indigo-600 dark:text-indigo-400 font-bold"
                                      : "text-slate-500 hover:text-slate-800"
                                  }`}
                                >
                                  <span>🏷️ {sub}</span>
                                  <span>{subCount}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add category inline */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  placeholder="Nouvelle Catégorie..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5 text-xs focus:outline-none mb-1.5"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Créer Catégorie</span>
                </button>
              </div>
            </div>

            {/* Questions explorer and search */}
            <div className="lg:col-span-9 space-y-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une question dans la banque..."
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                {/* Grid Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <select
                    value={bankFilterType}
                    onChange={(e) => setBankFilterType(e.target.value)}
                    className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5"
                  >
                    <option value="all">Tous les types</option>
                    <option value="mcq">QCM</option>
                    <option value="true_false">Vrai/Faux</option>
                    <option value="matching">Appariement</option>
                    <option value="essay">Composition</option>
                    <option value="numerical">Numérique</option>
                  </select>

                  <select
                    value={bankFilterDifficulty}
                    onChange={(e) => setBankFilterDifficulty(e.target.value)}
                    className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5"
                  >
                    <option value="all">Toutes difficultés</option>
                    <option value="Easy">Facile</option>
                    <option value="Medium">Moyen</option>
                    <option value="Hard">Difficile</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Chapitre..."
                    value={bankFilterChapter}
                    onChange={(e) => setBankFilterChapter(e.target.value)}
                    className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5 focus:outline-none"
                  />

                  <input
                    type="text"
                    placeholder="Tag..."
                    value={bankFilterKeyword}
                    onChange={(e) => setBankFilterKeyword(e.target.value)}
                    className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-1.5 focus:outline-none"
                  />
                </div>
              </div>

              {/* Bank list */}
              {filteredBankQuestions.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800">
                  <Folder className="w-16 h-16 stroke-1 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <h3 className="text-slate-900 dark:text-white font-bold text-sm">Aucune question trouvée</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Ajustez vos filtres ou créez une première question pour alimenter votre banque.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredBankQuestions.map(q => (
                    <div
                      key={q.id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center gap-4 transition hover:shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                            {q.type}
                          </span>
                          {q.category && (
                            <span className="text-[9px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                              {q.category}
                            </span>
                          )}
                          {q.chapter && (
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-1.5 py-0.5 rounded-full">
                              {q.chapter}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-semibold text-slate-850 dark:text-white mt-1">
                          {q.statement.replace(/<[^>]*>/g, "")}
                        </h4>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleAddFromBank(q)}
                          className="bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold py-1.5 px-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900 flex items-center space-x-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Ajouter au Quiz</span>
                        </button>
                        <button
                          onClick={() => handleArchiveQuestion(q)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg"
                          title="Archiver"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* QUESTION PREVIEW MODAL */}
      {previewingQuestion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-text">
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <span className="text-[10px] font-mono bg-indigo-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Aperçu Enseignant</span>
                <h3 className="font-bold text-sm mt-1">Rendu exact côté étudiant</h3>
              </div>
              <button onClick={() => setPreviewingQuestion(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-200">
              <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                <span>POINTS ALLOUÉS : {previewingQuestion.points} PT(S)</span>
                <span>DIFFICULTÉ : {previewingQuestion.difficulty || "Moyen"}</span>
              </div>

              {/* Statement */}
              <div className="text-sm font-semibold leading-relaxed border-b border-slate-100 dark:border-slate-850 pb-3">
                <div dangerouslySetInnerHTML={{ __html: previewingQuestion.statement }} />
              </div>

              {/* Dynamic form preview based on type */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                
                {/* MCQ */}
                {previewingQuestion.type === "mcq" && (
                  <div className="space-y-2">
                    {(previewingQuestion.options || []).map(opt => (
                      <label key={opt} className="flex items-center space-x-3 p-2.5 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="preview_opts"
                          checked={previewAnswer === opt}
                          onChange={() => setPreviewAnswer(opt)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* True / False */}
                {previewingQuestion.type === "true_false" && (
                  <div className="flex space-x-2">
                    {["true", "false"].map(val => (
                      <button
                        key={val}
                        onClick={() => setPreviewAnswer(val)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-bold transition ${
                          previewAnswer === val
                            ? "bg-indigo-600 text-white border-indigo-700"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {val === "true" ? "VRAI" : "FAUX"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Matching */}
                {previewingQuestion.type === "matching" && (
                  <div className="space-y-2">
                    {(previewingQuestion.options || []).map(opt => (
                      <div key={opt} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-xs font-semibold">{opt}</span>
                        <select
                          value={previewAnswer?.[opt] || ""}
                          onChange={(e) => {
                            setPreviewAnswer({ ...previewAnswer, [opt]: e.target.value });
                          }}
                          className="text-xs border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 bg-slate-50 dark:bg-slate-900"
                        >
                          <option value="">Sélectionnez...</option>
                          {(previewingQuestion.matchingTargets || []).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {/* Essay */}
                {previewingQuestion.type === "essay" && (
                  <div>
                    <textarea
                      rows={4}
                      placeholder="L'étudiant formulera son essai de composition libre ici..."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                )}

                {/* Short Answer / Numerical */}
                {(previewingQuestion.type === "short_answer" || previewingQuestion.type === "numerical") && (
                  <input
                    type={previewingQuestion.type === "numerical" ? "number" : "text"}
                    placeholder="Saisissez votre réponse..."
                    value={previewAnswer || ""}
                    onChange={(e) => setPreviewAnswer(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                )}
              </div>

              {/* Feedback box */}
              {previewFeedbackMessage !== null && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                  previewScore && previewScore > 0
                    ? "bg-emerald-55/40 border-emerald-200 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-55/40 border-rose-200 text-rose-850 dark:text-rose-400"
                }`}>
                  <div>
                    <span className="font-bold block mb-1">
                      {previewScore && previewScore > 0 ? "Correct !" : "Incorrect !"} (Score: {previewScore || 0} pt)
                    </span>
                    <p>{previewFeedbackMessage}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 flex justify-end space-x-2">
              <button
                onClick={() => setPreviewingQuestion(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl text-xs font-semibold"
              >
                Fermer l'aperçu
              </button>
              <button
                onClick={handleCheckPreviewAnswer}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow"
              >
                Soumettre et Vérifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
