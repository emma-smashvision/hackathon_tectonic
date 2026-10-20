// v11-ui: isolated WorldGame story; shell navigation belongs to WD.
import { notFound } from "next/navigation";
import { WorldPreview } from "@/one/world/ui/WorldPreview";
export default async function WorldPreviewPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const query = await searchParams;
  return <WorldPreview personaId={query.p} />;
}
