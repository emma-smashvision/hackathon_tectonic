// v9 shared contract: lessons. Owned by W2 (learning); W1 (world) and W3 (entry/plain) import only from here and index.ts.

export type Choice = {
  id: string;
  label: string;
  /** the answer the lesson teaches; guesses are never scored, apply answers get feedback */
  correct?: boolean;
  /** one sentence shown after picking this choice */
  why?: string;
};

export type LessonStep = "guess" | "reveal" | "helped" | "apply" | "save" | "done";

export type Lesson = {
  /** stable, e.g. "tom:energy-new-address" */
  id: string;
  personaId: string;
  /** crowd catalogue road id, e.g. "moving-house" */
  roadId: string;
  /** crowd stop id, e.g. "moving-house:energy-new-address" (or the fork id) */
  stopId: string;
  /** order on the road (1-based); bump n on the 3D road */
  order: number;
  title: string;
  /** road month of the stop, for the label "Month 3" */
  month: number;
  guess: { question: string; choices: Choice[] };
  /** built from stopEvidenceFor / forkEvidenceFor; only gated (shown) numbers */
  reveal: {
    headline: string;
    detail?: string;
    withheld?: string;
    /** Optional compact comparison; cells are formatted only after crowd gates. */
    table?: { caption: string; columns: string[]; rows: string[][] };
  };
  /** outcome-ranked; share is a gated percentage or omitted */
  helped: { label: string; share?: number }[];
  note?: { text: string; by: string };
  apply: { question: string; choices: Choice[]; explain: string };
  /** optional saved step; uses the crowd action pick id when one exists */
  save?: { id: string; label: string; pick?: string };
  /** what completing the lesson builds */
  reward: { label: string };
  stamp: { icon: string; label: string };
  synthetic: true;
};

export type LessonProgress = {
  lessonId: string;
  step: LessonStep;
  guessed?: string;
  applied?: string;
  saved?: boolean;
};
