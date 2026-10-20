"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { Hud } from "./hud/Hud";
import { WorldLabels } from "./hud/WorldLabels";
import { GameProvider } from "./runtime";
import { Ghosts } from "./scene/Ghosts";
import { Landmarks } from "./scene/Landmarks";
import { Places } from "./scene/Places";
import { Player } from "./scene/Player";
import { Stops } from "./scene/Stops";
import { MapOverlay, World } from "./scene/World";

function Scene({ effects }: { effects: boolean }) {
  return (
    <>
      <color attach="background" args={["#060d18"]} />
      <fog attach="fog" args={["#0a1526", 40, 460]} />
      <ambientLight intensity={0.55} color="#7f95c2" />
      <hemisphereLight args={["#4a6a9a", "#05080f", 0.7]} />
      <directionalLight position={[-300, 400, 200]} intensity={0.9} color="#a9bdf0" />
      <World />
      <Places />
      <Landmarks />
      <MapOverlay />
      <Stops />
      <Ghosts />
      <Player />
      {effects && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.2} intensity={0.85} />
          <Vignette offset={0.25} darkness={0.55} />
        </EffectComposer>
      )}
    </>
  );
}

export function City() {
  // wait for the web fonts so canvas-drawn signs use them
  const [ready, setReady] = useState(false);
  const [effects, setEffects] = useState(true);
  useEffect(() => {
    let done = false;
    const go = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    if (document.fonts?.ready) document.fonts.ready.then(go);
    const t = window.setTimeout(go, 1500);
    try {
      if (new URLSearchParams(window.location.search).get("fx") === "0") setEffects(false);
    } catch {
      /* ignore */
    }
    return () => window.clearTimeout(t);
  }, []);

  return (
    <GameProvider>
      <div className="city">
        {ready && (
          <Canvas
            className="city-canvas"
            dpr={[1, 1.75]}
            camera={{ fov: 58, near: 0.5, far: 4000, position: [0, 30, -60] }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.05;
            }}
          >
            <Suspense fallback={null}>
              <Scene effects={effects} />
            </Suspense>
          </Canvas>
        )}
        {ready && <WorldLabels />}
        <Hud />
      </div>
    </GameProvider>
  );
}
