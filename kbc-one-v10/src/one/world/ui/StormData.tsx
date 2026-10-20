"use client";

import { Canvas } from "@react-three/fiber";
import { ratioFor, StormHouses, useLessonMotion } from "@/one/lessonfx";
import type { WorldStorm } from "../types";
import { stormStory } from "./presentation";
import styles from "./world.module.css";

/** Shared lesson cinema, framed for the district panel. History stays unchanged when a dam grows. */
export function StormData({ storm, learned }: { storm: WorldStorm; learned: boolean }) {
  const still = useLessonMotion();
  const rate = storm.share.shown && storm.share.value !== null && Number.isFinite(storm.share.value) ? storm.share.value : undefined;
  if (rate === undefined) return <p className={styles.notice}>There is not enough crowd evidence to show this storm yet.</p>;
  const ratio = ratioFor(rate), count = ratio ?? 100, affected = ratio ? 1 : Math.round(rate * 100);
  const dam = storm.prepared ? 1 : learned ? .5 : 0;
  return <figure className={styles.stormData} data-storm-houses={count} data-storm-affected={affected} data-dam={dam}>
    <div aria-hidden="true"><Canvas dpr={[1, 1.5]} frameloop={still ? "demand" : "always"} camera={{ position: [0, 7, 19], fov: 40 }} gl={{ alpha: true }} onCreated={({ camera }) => camera.lookAt(0, 2.1, 0)}>
      <ambientLight intensity={1.5} /><directionalLight position={[4, 9, 6]} intensity={2} />
      <StormHouses rate={rate} prepared={dam} reducedMotion={still} />
    </Canvas></div>
    <figcaption><strong>{stormStory(storm)}</strong><span>{storm.prepared ? "Your lesson and saved step built this dam." : learned ? "Your blueprint is ready. Save a step to finish the dam." : "Each house stands for part of the crowd. Preparation builds your dam."}</span></figcaption>
  </figure>;
}
