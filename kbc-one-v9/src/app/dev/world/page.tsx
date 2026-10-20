// v9-world: isolated, development-only phone turn and game verification.
import { notFound } from "next/navigation";
import { VillagePreview } from "../../../hindsight/game/VillagePreview";
export default function WorldPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <VillagePreview />;
}
