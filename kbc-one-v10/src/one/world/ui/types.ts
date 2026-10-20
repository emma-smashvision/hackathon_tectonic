export type WorldGameProps = {
  personaId: string;
  onExit: () => void;
  /** Persona-scoped Lesson.id, never a raw stop ID. */
  onDrive: (lessonId: string) => void;
  onPlain: () => void;
};
