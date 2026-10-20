// v9-w2: isolated dev-only mount for the owned learning component story.
import { notFound } from "next/navigation";
import { LearningPreview } from "../../../one/learning/LearningPreview";

export default async function LearningPreviewPage({ searchParams }: { searchParams: Promise<{ p?: string; variant?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const query = await searchParams;
  return <LearningPreview initialPersona={query.p} initialVariant={query.variant === "plain" ? "plain" : "game"} />;
}
