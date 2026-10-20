// v11-world: isolated scene review; never exposed in production.
import { notFound } from 'next/navigation';
import { WorldPreview } from '@/hindsight/game/world11/WorldPreview';
export default function WorldScenePreviewPage(){if(process.env.NODE_ENV==='production')notFound();return <WorldPreview/>;}
