"use client";
import { useEffect, useState } from "react";
import { NightCity, NightCar } from "../scene/NightCity";
import { CityGame } from "../CityGame";
/** Development harness; production entry belongs to LandscapeCity (W4). */
export function EnginePreview() {
  const [persona, setPersona] = useState('tom');
  const [night, setNight] = useState(false);
  useEffect(() => { setPersona(new URLSearchParams(location.search).get('persona') ?? 'tom'); setNight(new URLSearchParams(location.search).has('night')); }, []);
  return <main style={{ position: 'fixed', inset: 0 }}><CityGame world={night ? <NightCity personaId={persona} /> : undefined} carModel={night ? <NightCar /> : undefined} personaId={persona} onExit={() => location.assign('/')} onPlain={() => location.assign('/dev/learning')} /></main>;
}
