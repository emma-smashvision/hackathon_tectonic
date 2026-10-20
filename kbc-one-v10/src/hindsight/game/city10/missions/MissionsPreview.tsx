'use client';
import { useState } from 'react';
import { CityGame } from '../CityGame';
import { NightCity, NightCar } from '../scene/NightCity';
import { Missions } from './Missions';
import { MissionWorld } from './MissionWorld';

/** Owned development story uses the actual engine and keyboard input, never a fake car. */
export function MissionsPreview({ personaId = 'tom' }: { personaId?: string }) {
  const [version, setVersion] = useState(0);
  return <div style={{ position: 'fixed', inset: 0 }}><CityGame key={version} personaId={personaId} compactHud world={<NightCity personaId={personaId} />} carModel={<NightCar />} onExit={() => { location.href = '/'; }} scene={<MissionWorld personaId={personaId} />}>
    <Missions personaId={personaId} onExit={() => { location.href = '/'; }} onReset={() => setVersion(v => v + 1)} />
  </CityGame></div>;
}
