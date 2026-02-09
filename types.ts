
export enum Difficulty {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced'
}

export type Role = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  username: string; // This is the Roll Number
  name: string;
  role: Role;
  grades?: string[]; 
  bio?: string;
  points: number;
  streak: number;
  isFirstLogin: boolean;
  avatar?: string;
  // Enhanced Academic Bio Fields
  dob?: string;
  bloodGroup?: string;
  parentName?: string;
  phone?: string;
  address?: string;
}

export interface Classroom {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface Question {
  id: string;
  type: 'mcq' | 'coding';
  title?: string; 
  text: string;
  category: string;
  difficulty: Difficulty;
  options?: string[];
  correctOptionIndex?: number;
  starterCode?: string;
  testCases?: TestCase[];
  points: number;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  targetGrades: string[];
  questionBank: Question[];
  randomMcqCount: number; 
  randomCodingCount: number;
  durationMinutes: number;
  status: 'draft' | 'published';
  deadline?: number;
}

export interface LabExperiment {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  description: string;
  learningObjectives: string[];
  starterCode: string;
  testCases: TestCase[];
  targetGrades: string[]; 
  solutionHint?: string;
  createdBy?: string;
  status: 'draft' | 'published';
  deadline?: number;
}

export interface Submission {
  labId: string;
  classId: string; 
  userId: string;
  userName: string;
  code: string;
  status: 'pending' | 'submitted' | 'graded';
  submittedAt: number;
  feedback?: string;
  pointsAwarded?: number;
}

export interface AssessmentSubmission {
  assessmentId: string;
  userId: string;
  userName: string;
  classId: string;
  answers: { [questionId: string]: any }; 
  score: number;
  totalPoints: number;
  submittedAt: number;
  status: 'completed';
}

export type View = 'dashboard' | 'lab-hub' | 'lab' | 'assessment' | 'profile' | 'grading' | 'manage-labs' | 'manage-assessments' | 'manage-users' | 'manage-classes' | 'compiler' | 'ai-tutor';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
