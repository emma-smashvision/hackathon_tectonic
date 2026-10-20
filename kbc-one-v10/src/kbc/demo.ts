/** Short, read-only presenter beats. Each beat points at visible Home content. */
export const DEMO_BEATS = [
  { persona: "tom", title: "Your day at a glance", caption: "Balance and everyday payments stay in the same place.", target: ".mix-hero" },
  { persona: "tom", title: "A timely suggestion", caption: "One tap opens a prepared split for Tom to review. Its details explain why it is here.", target: ".mix-moment" },
  { persona: "karim", title: "Details when you want them", caption: "Karim’s money is a few bubbles away. Tap one to see the details.", target: ".mix-field" },
] as const;
export const DEMO_BEAT_MS = 8_000;
/** Customers kept in the data but left out of the stage: they are not part of the finals pitch. */
export const OFF_STAGE: ReadonlySet<string> = new Set(["margaret", "nadia"]);
