// v10-look: isolated art review route; never published in production.
import { notFound } from 'next/navigation';
import { LookPreview } from '@/hindsight/game/city10/scene/LookPreview';
export default function LookPage(){if(process.env.NODE_ENV==='production')notFound();return <LookPreview/>;}
