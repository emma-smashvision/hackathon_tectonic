// v9 shared contract: the village. Owned by W2 (model + progress store); W1 renders it, W3 shows it on Home and in the plain path.

export type PlotKind = "home" | "car" | "savings" | "pension" | "business" | "family";

/** One of max 5 buildings that stand for what the person has. Never sized by money. */
export type Plot = {
  id: string;
  kind: PlotKind;
  /** "Home" */
  title: string;
  /** "Rented flat · Leuven" */
  subtitle: string;
  /** plain banking overview shown when the building is tapped (no car words) */
  overview: { label: string; value: string }[];
};

/** The building you construct by learning the lessons of one road. */
export type Destination = {
  id: string;
  roadId: string;
  /** "New flat in Gent" */
  title: string;
  /** goal sentence on screen: "Learn 3 moving lessons to build your flat in Gent" */
  goal: string;
  /** lesson ids in road order; built floors = completed lessons */
  lessonIds: string[];
};

export type Village = {
  personaId: string;
  /** "Tom's village" */
  name: string;
  plots: Plot[];
  /** undefined for care-only / plain personas without a playable road */
  destination?: Destination;
  /** game allowed at all (false for care roads; Large & simple gets the plain path) */
  playable: boolean;
};

export type VillageProgress = {
  /** Explicit local world unlocks, shared with the existing lesson store. */
  unlocks?: import("../world/types").AreaUnlock[];
  personaId: string;
  /** completed lesson ids (each one = one floor + one paved bump + one stamp) */
  done: string[];
  /** saved step ids */
  saved: string[];
  /** note left for the next traveller (after road complete) */
  noteLeft?: boolean;
};
