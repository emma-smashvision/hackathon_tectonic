"use client";
// v10-shell: the shell composes the engine, scene and mission slots in one place.
import { useState } from "react";
import { CityGame, type CityGameProps, useCityEngine } from "../hindsight/game/city10/CityGame";
import { NightCity, NightCar } from "../hindsight/game/city10/scene/NightCity";
import { Missions, MissionWorld } from "../hindsight/game/city10/missions";
import { useVillageProgress } from "./village";
import { CitySound } from "./CitySound";

export type CityExperienceProps = Pick<CityGameProps, "personaId" | "focusLessonId" | "onExit" | "onPlain" | "onReady"> & {
  // v11-shell: a completed drive can return to the island without closing the phone.
  onReturnToWorld?: () => void;
};
function ShellControls({ onPlain }: Pick<CityExperienceProps, "onPlain">) {
  const { api } = useCityEngine();
  return <>
    <CitySound speed={() => api.car().speed} />
    {onPlain && <button type="button" className="c10-plain-toggle" onClick={onPlain}>Plain lessons</button>}
  </>;
}
export function CityExperience(props: CityExperienceProps) {
  const progress = useVillageProgress(props.personaId);
  const [session, setSession] = useState(0);
  const reset = () => { progress.reset(); setSession(value => value + 1); };
  return <><CityGame key={session} {...props} compactHud showFooter={false}
    world={<NightCity personaId={props.personaId} />}
    carModel={<NightCar />}
    scene={<MissionWorld personaId={props.personaId} />}>
    <ShellControls onPlain={props.onPlain} />
    <Missions personaId={props.personaId} focusLessonId={props.focusLessonId} onExit={props.onExit} onReturnToWorld={props.onReturnToWorld} onReset={reset} />
  </CityGame>
    <small className="v10-city-footer">Synthetic demo crowd · not a forecast</small>
  </>;
}
