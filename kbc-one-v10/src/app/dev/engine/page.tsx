// v10-engine: isolated driving harness; never served in production.
import { notFound } from "next/navigation";
import { EnginePreview } from "../../../hindsight/game/city10/engine/Preview";
export default function EnginePage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <EnginePreview />;
}
