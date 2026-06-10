export type QuizChoice = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  color: "red" | "blue" | "yellow" | "green";
  order_index: number;
};

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  question_text: string;
  time_limit: number;
  points: number;
  order_index: number;
  choices?: QuizChoice[];
  quiz_choices?: QuizChoice[];
};

export type Quiz = {
  id: string;
  prof_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  questions?: QuizQuestion[];
  quiz_questions?: QuizQuestion[];
};

export type SessionStatus =
  | "waiting"
  | "countdown"
  | "question"
  | "reveal"
  | "leaderboard"
  | "finished";

export type QuizSession = {
  id: string;
  quiz_id: string;
  prof_id: string;
  join_code: string;
  status: SessionStatus;
  current_question_index: number;
  question_started_at: string | null;
  created_at: string;
  quiz?: Quiz;
};

export type SessionPlayer = {
  id: string;
  session_id: string;
  user_id: string | null;
  player_name: string;
  avatar_color: string;
  score: number;
  streak: number;
  joined_at: string;
};

export type PlayerAnswer = {
  id: string;
  session_id: string;
  question_id: string;
  player_id: string;
  choice_id: string | null;
  answered_at: string;
  response_ms: number | null;
  points_earned: number;
};

export const CHOICE_COLORS: Record<
  QuizChoice["color"],
  { bg: string; shadow: string; glow: string; icon: string }
> = {
  red:    { bg: "linear-gradient(135deg, #f87171, #ef4444)", shadow: "#b91c1c", glow: "rgba(239,68,68,0.5)",   icon: "▲" },
  blue:   { bg: "linear-gradient(135deg, #60a5fa, #3b82f6)", shadow: "#1d4ed8", glow: "rgba(59,130,246,0.5)",  icon: "◆" },
  yellow: { bg: "linear-gradient(135deg, #fbbf24, #f59e0b)", shadow: "#b45309", glow: "rgba(245,158,11,0.5)",  icon: "●" },
  green:  { bg: "linear-gradient(135deg, #4ade80, #22c55e)", shadow: "#15803d", glow: "rgba(34,197,94,0.5)",   icon: "■" },
};

export const AVATAR_COLORS = [
  "#7c3aed", "#ef4444", "#f97316", "#22c55e",
  "#3b82f6", "#ec4899", "#f59e0b", "#06b6d4",
];
