import { notFound } from 'next/navigation';
import { MissionsPreview } from '@/hindsight/game/city10/missions/MissionsPreview';
// v10-missions: development-only real-engine driving verification.
export default async function Page({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return <MissionsPreview personaId={(await searchParams).p ?? 'tom'} />;
}
