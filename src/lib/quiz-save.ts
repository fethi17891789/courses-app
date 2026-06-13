import type { QuestionType } from "@/types/quiz";

const VALID_COLORS = ["red", "blue", "yellow", "green"] as const;
const FALLBACK_COLORS = ["red", "blue", "yellow", "green"] as const;

export function normalizeType(value: unknown): QuestionType {
  return value === "multiple" || value === "true_false" ? value : "single";
}

type IncomingChoice = { text: string; is_correct?: boolean; color?: string };

// Build the quiz_choices rows for a question. Colors come from the editor
// (true/false uses green/red), with an index fallback for safety.
export function buildChoices(choices: IncomingChoice[], questionId: string) {
  return choices.slice(0, 4).map((c, ci) => ({
    question_id: questionId,
    text: c.text,
    is_correct: !!c.is_correct,
    color: (VALID_COLORS as readonly string[]).includes(c.color ?? "")
      ? c.color
      : FALLBACK_COLORS[ci] ?? "red",
    order_index: ci,
  }));
}
