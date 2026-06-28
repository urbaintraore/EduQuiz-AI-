/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'teacher' | 'student' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  email: string;
  password?: string; // Stored securely/simply
  university?: string;
  schoolClass?: string; // Obligatoire pour étudiant
}

export interface Course {
  id: string;
  teacherId: string;
  title: string;
  description: string;
  code: string; // Course joining code
  teacherName?: string;
  category?: string;
}

export type QuestionType =
  | 'mcq'            // QCM / QCU
  | 'true_false'     // Vrai / Faux
  | 'matching'       // Appariement
  | 'short_answer'   // Réponse courte
  | 'numerical'      // Numérique
  | 'drag_drop_text' // Glisser-déposer sur texte
  | 'cloze'          // Texte à trous (Cloze)
  | 'essay'          // Composition (correction manuelle)
  | 'description';   // Bloc description (non noté)

export interface Question {
  id: string;
  examId: string;
  type: QuestionType;
  statement: string; // Question text
  options?: string[]; // Used for MCQ choices or Matching left items
  matchingTargets?: string[]; // Used for Matching right items (target matching)
  correctAnswer: string; // Answer string or serialized JSON for complex answers
  points: number;
  explanation: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  // Dynamic variables for calculated questions if applicable
  variables?: { name: string; min: number; max: number; decimals: number }[];
}

export interface Exam {
  id: string;
  courseId: string;
  title: string;
  duration: number; // in minutes
  startDate: string; // ISO datetime string
  status: 'draft' | 'published';
  subjectText?: string;
  solutionText?: string;
  gradingScaleText?: string;
  createdAt: string;
  monitoringConfig?: MonitoringConfig;
}

export interface MonitoringConfig {
  active: boolean; // Is monitoring enabled?
  requireCamera: boolean;
  periodicCaptures: boolean;
  detectNoFace: boolean;
  detectMultipleFaces: boolean;
  requireScreenShare: boolean;
  monitorWindowBlur: boolean;
  monitorTabChange: boolean;
  monitorFullscreenExit: boolean;
  preventCopyPaste: boolean;
  preventRightClick: boolean;
  preventShortcuts: boolean;
  requireMicrophone: boolean;
  detectAbnormalNoise: boolean;
  detectConversation: boolean;
  thresholdTabChanges: number;
  thresholdFullscreenExits: number;
  thresholdNoFaceTime: number; // in seconds
  alertScoreThreshold: number;
}

export type MonitoringEventType = 
  | 'TAB_SWITCH' 
  | 'WINDOW_BLUR' 
  | 'FULLSCREEN_EXIT' 
  | 'SCREENSHARE_STOPPED' 
  | 'CAMERA_DISABLED' 
  | 'MICROPHONE_DISABLED' 
  | 'NO_FACE_DETECTED' 
  | 'MULTIPLE_FACES' 
  | 'COPY_ATTEMPT' 
  | 'PASTE_ATTEMPT' 
  | 'RIGHT_CLICK_ATTEMPT' 
  | 'NETWORK_DISCONNECTION' 
  | 'LONG_INACTIVITY';

export interface MonitoringEvent {
  id: string;
  examId: string;
  studentId: string;
  timestamp: string;
  eventType: MonitoringEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
}

export interface MonitoringReport {
  examId: string;
  studentId: string;
  suspicionScore: number;
  riskLevel: 'Faible' | 'Moyenne' | 'Élevée' | 'Très élevée';
  events: MonitoringEvent[];
  generatedAt: string;
}

export interface Submission {
  id: string;
  studentId: string;
  examId: string;
  answers: Record<string, any>; // questionId -> student response
  score: number | null; // null if manual evaluation is pending
  submittedAt: string;
  gradedAt: string | null;
  essayFeedbacks?: Record<string, { score: number; comment: string }>; // questionId -> teacher feedback
}

export interface CourseWithDetails extends Course {
  teacherName: string;
}

export interface ExamWithCourse extends Exam {
  courseTitle: string;
  questionCount: number;
  totalPoints: number;
}
