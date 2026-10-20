"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as T from "three";
import type { Village } from "../../one/village/types";
import type { Lesson } from "../../one/learning/types";
import { roadViewFor } from "../../one/crowd";

// Stable plot locations; geometry is never scaled by account balances.
export const PLOTS: [number, number][] = [
  [-9, -5],
  [-11, 4],
  [-4, 7],
  [4, -4],
  [-2, -7],
];
const plotPosition = (kind: string): [number, number] =>
  ({
    home: PLOTS[0],
    car: PLOTS[3],
    savings: PLOTS[1],
    pension: PLOTS[2],
    family: PLOTS[4],
    business: PLOTS[4],
  })[kind] ?? PLOTS[4];
export const bumpX = (index: number) => 17 + index * 8;
export type SceneProps = {
  onReady?: () => void;
  village: Village;
  lessons: Lesson[];
  done: string[];
  paved: string[];
  activeIndex: number;
  mode: "village" | "travel" | "lesson";
  reduced: boolean;
  onPlot: (id: string) => void;
  onLabels: (
    positions: Record<string, { x: number; y: number; visible: boolean }>,
  ) => void;
  onArrive: () => void;
};
function Box({
  at,
  size,
  color,
  glow = 0,
  opacity = 1,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
  glow?: number;
  opacity?: number;
}) {
  return (
    <mesh position={at} castShadow={size[1] > 1.2} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.83}
        emissive={color}
        emissiveIntensity={glow}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
function Roof({
  height = 4,
  color = "#c86343",
  width = 4,
  depth = 4,
}: {
  height?: number;
  color?: string;
  width?: number;
  depth?: number;
}) {
  const geo = useMemo(() => {
    const s = new T.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(0, 1.8);
    s.lineTo(width / 2, 0);
    s.closePath();
    return new T.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  }, [width, depth]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[0, height, -depth / 2]} castShadow>
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}
function House({
  kind = "home",
  floors = 2,
}: {
  kind?: string;
  floors?: number;
}) {
  const h = kind === "home" ? 4.5 : kind === "family" ? 3 : 2.3;
  if (kind === "savings")
    return (
      <group>
        <Box at={[0, 1.15, 0]} size={[4, 2.3, 3.4]} color="#b3dfd5" />
        <Box at={[0, 2.5, 0]} size={[4.5, 0.35, 4]} color="#83cbd2" />
        {[-1.5, 0, 1.5].map((x) => (
          <Box
            key={x}
            at={[x, 1.2, 1.75]}
            size={[0.12, 2.3, 0.1]}
            color="#fff1d1"
          />
        ))}
        <Box at={[0, 0.5, 2.5]} size={[2, 0.8, 0.8]} color="#f6c54a" />
      </group>
    );
  if (kind === "pension")
    return (
      <group>
        <Box at={[0, 0.8, 0]} size={[3, 1.6, 2.5]} color="#f3e4bd" />
        <Roof height={1.6} width={3.6} depth={3} color="#638d93" />
        <Tree x={1.5} z={-1.5} scale={1.65} />
      </group>
    );
  return (
    <group>
      <Box
        at={[0, h / 2, 0]}
        size={[4, h, 3.6]}
        color={kind === "car" ? "#c1d0d0" : "#f2dcbc"}
      />
      {kind === "car" ? (
        <>
          <Box at={[0, h + 0.15, 0]} size={[4.6, 0.3, 4.2]} color="#65858c" />
          <Box at={[0, 1, 1.83]} size={[2.9, 1.7, 0.1]} color="#6897a0" />
          {[0.5, 0.9, 1.3].map((y) => (
            <Box
              key={y}
              at={[0, y, 1.91]}
              size={[2.7, 0.04, 0.03]}
              color="#c5e8df"
            />
          ))}
        </>
      ) : (
        <Roof
          height={h}
          color={kind === "business" ? "#498b9e" : "#d56e49"}
          width={4.6}
          depth={4.2}
        />
      )}
      {kind !== "car" &&
        Array.from({ length: floors }, (_, j) =>
          [-1.1, 1.1].map((x) => (
            <group key={j + ":" + x}>
              <Box
                at={[x, 0.95 + j * 1.8, 1.83]}
                size={[0.8, 1.1, 0.08]}
                color="#ffdb79"
                glow={0.65}
              />
              <Box
                at={[2.03, 0.95 + j * 1.8, x * 0.7]}
                size={[0.08, 1.1, 0.7]}
                color="#ffe29a"
                glow={0.5}
              />
            </group>
          )),
        )}
      <Box at={[0.1, 0.7, 1.85]} size={[0.65, 1.4, 0.1]} color="#6b8a89" />
    </group>
  );
}
function Tree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <Box at={[0, 0.8, 0]} size={[0.22, 1.6, 0.22]} color="#86664b" />
      <mesh position={[0, 2, 0]} castShadow>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial color="#5cad80" flatShading />
      </mesh>
      <mesh position={[-0.3, 2.3, 0.3]}>
        <icosahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial color="#8aca8b" flatShading />
      </mesh>
    </group>
  );
}
function Lamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box at={[0, 1.6, 0]} size={[0.1, 3.2, 0.1]} color="#455e66" />
      <mesh position={[0, 3.25, 0]}>
        <sphereGeometry args={[0.23, 8, 6]} />
        <meshBasicMaterial color="#ffe6a3" />
      </mesh>
      <mesh position={[0, 3.25, 0]}>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshBasicMaterial
          color="#ffe6a3"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <circleGeometry args={[1.6, 20]} />
        <meshBasicMaterial
          color="#ffe09a"
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
function Car({ ghost = false }: { ghost?: boolean }) {
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <Box
        at={[0, 0.45, 0]}
        size={[1.25, 0.6, 2.25]}
        color={ghost ? "#d7eef5" : "#28b6ed"}
        opacity={ghost ? 0.62 : 1}
      />
      <Box
        at={[0, 0.95, -0.15]}
        size={[1.05, 0.55, 1.25]}
        color="#c5effa"
        opacity={ghost ? 0.5 : 1}
      />
      {[-0.65, 0.65].flatMap((x) =>
        [-0.65, 0.65].map((z) => (
          <Box
            key={x + ":" + z}
            at={[x, 0.26, z]}
            size={[0.18, 0.5, 0.5]}
            color="#294655"
            opacity={ghost ? 0.4 : 1}
          />
        )),
      )}
      {[-0.4, 0.4].map((x) => (
        <Box
          key={x}
          at={[x, 0.58, -1.14]}
          size={[0.3, 0.18, 0.03]}
          color="#ff745c"
          glow={0.3}
        />
      ))}
      {ghost && (
        <Box
          at={[0, 0.08, -2.8]}
          size={[0.9, 0.025, 3.2]}
          color="#c1f2fb"
          glow={0.3}
          opacity={0.16}
        />
      )}
    </group>
  );
}
function Ghost({
  index,
  reduced,
  start,
}: {
  index: number;
  reduced: boolean;
  start: number;
}) {
  const ref = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.position.x =
        start +
        index * 6.5 +
        (reduced ? 0 : Math.sin(clock.elapsedTime * 0.4) * 1.2);
  });
  return (
    <group ref={ref} position={[start + index * 6.5, 0.08, 6.1]}>
      <Car ghost />
    </group>
  );
}
function PaveBurst({ active, reduced }: { active: boolean; reduced: boolean }) {
  const ref = useRef<T.Group>(null);
  const elapsed = useRef(2);
  useEffect(() => {
    if (active) elapsed.current = 0;
  }, [active]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    elapsed.current += dt;
    const t = Math.min(1, elapsed.current / 1.3);
    ref.current.visible = active && !reduced && t < 1;
    ref.current.children.forEach((child, i) => {
      if (i === 0) {
        child.scale.set(1 + t * 2, 1 + t * 2, 1);
        (
          child as T.Mesh<T.RingGeometry, T.MeshBasicMaterial>
        ).material.opacity = (1 - t) * 0.6;
      } else {
        const a = i * 2.4;
        child.position.set(
          Math.cos(a) * t * 2.3,
          0.2 + Math.sin(t * Math.PI) * 1.6,
          Math.sin(a) * t * 2,
        );
        child.scale.setScalar((1 - t) * 0.18);
        child.rotation.set(t * 4, a + t * 3, 0);
      }
    });
  });
  return (
    <group ref={ref}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.5, 0.7, 32]} />
        <meshBasicMaterial color="#9cffe0" transparent depthWrite={false} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={i % 2 ? "#9affdc" : "#ffe79a"} />
        </mesh>
      ))}
    </group>
  );
}
function Bump({
  index,
  paved,
  animate,
  reduced,
}: {
  index: number;
  paved: boolean;
  animate: boolean;
  reduced: boolean;
}) {
  const ref = useRef<T.Group>(null);
  const scale = useRef(paved ? 0.08 : 1);
  useFrame((_, dt) => {
    if (!ref.current) return;
    scale.current = T.MathUtils.damp(scale.current, paved ? 0.08 : 1, 5, dt);
    ref.current.scale.y = reduced ? (paved ? 0.08 : 1) : scale.current;
  });
  return (
    <group position={[bumpX(index), 0.17, 7]}>
      <PaveBurst active={animate} reduced={reduced} />
      <group ref={ref}>
        {[-0.45, 0, 0.45].map((x) => (
          <Box
            key={x}
            at={[x, 0.14, 0]}
            size={[0.21, 0.28, 3.65]}
            color={paved ? "#61e6b3" : "#ffc447"}
            glow={paved ? 0.35 : 0.1}
          />
        ))}
      </group>
      {paved && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[2.8, 3.7]} />
          <meshBasicMaterial color="#64e8b9" transparent opacity={0.42} />
        </mesh>
      )}
    </group>
  );
}
function Destination({
  count,
  total,
  reduced,
}: {
  count: number;
  total: number;
  reduced: boolean;
}) {
  const crane = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    if (crane.current && !reduced)
      crane.current.rotation.y = Math.sin(clock.elapsedTime * 0.23) * 0.16;
  });
  return (
    <group position={[5, 0, 5]}>
      <Box at={[0, 0.04, 0]} size={[5.4, 0.1, 5]} color="#e4d4ae" />
      {Array.from({ length: total }, (_, i) => (
        <Floor key={i} level={i} built={i < count} reduced={reduced} />
      ))}
      {count === total ? (
        <Roof
          height={total * 1.6 + 0.2}
          color="#428ca6"
          width={4.8}
          depth={4.5}
        />
      ) : (
        <>
          <group ref={crane} position={[3.4, 0, -2.3]}>
            <Box at={[0, 4, 0]} size={[0.22, 8, 0.22]} color="#ffc94f" />
            {Array.from({ length: 7 }, (_, i) => (
              <Box
                key={i}
                at={[0.35, i + 1, 0]}
                size={[0.6, 0.08, 0.08]}
                color="#f3c449"
              />
            ))}
            <Box at={[-2, 8, 0]} size={[8, 0.2, 0.25]} color="#ffd364" />
            <Box at={[-3.4, 6.5, 2.3]} size={[0.05, 3, 0.05]} color="#dfecdf" />
            <Box at={[1.5, 7.7, 0]} size={[1.4, 0.65, 0.6]} color="#d5ab3d" />
          </group>
          {[-2.3, 2.3].flatMap((x) =>
            [-2, 2].map((z) => (
              <Box
                key={x + ":" + z}
                at={[x, total * 0.8 + 0.2, z]}
                size={[0.07, total * 1.6 + 0.4, 0.07]}
                color="#f4f1d6"
              />
            )),
          )}
        </>
      )}
    </group>
  );
}
function Floor({
  level,
  built,
  reduced,
}: {
  level: number;
  built: boolean;
  reduced: boolean;
}) {
  const ref = useRef<T.Group>(null);
  const y = useRef(level * 1.6);
  const wasBuilt = useRef(built);
  useEffect(() => {
    if (built && !wasBuilt.current) y.current = level * 1.6 + 3.5;
    wasBuilt.current = built;
  }, [built, level]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    y.current = T.MathUtils.damp(y.current, level * 1.6, 3, dt);
    ref.current.position.y = reduced ? level * 1.6 : y.current;
  });
  return built ? (
    <group ref={ref} position={[0, level * 1.6, 0]}>
      <Box at={[0, 0.8, 0]} size={[4.2, 1.6, 3.8]} color="#f4e1bc" />
      <Box at={[0, 1.6, 0]} size={[4.4, 0.12, 4]} color="#fff0d6" />
      {[-1.15, 1.15].map((x) => (
        <Box
          key={x}
          at={[x, 0.85, 1.93]}
          size={[0.8, 0.9, 0.06]}
          color="#ffdb77"
          glow={0.8}
        />
      ))}
      <Box
        at={[2.13, 0.85, 0]}
        size={[0.06, 0.9, 1]}
        color="#ffdf8c"
        glow={0.6}
      />
    </group>
  ) : (
    <group position={[0, level * 1.6 + 0.1, 0]}>
      {[-2, 2].map((x) => (
        <Box
          key={x}
          at={[x, 1.55, 0]}
          size={[0.07, 0.07, 4]}
          color="#fff1cf"
          opacity={0.65}
        />
      ))}
      {[-2, 2].map((z) => (
        <Box
          key={z}
          at={[0, 1.55, z]}
          size={[4, 0.07, 0.07]}
          color="#fff1cf"
          opacity={0.65}
        />
      ))}
    </group>
  );
}
function HomeTrace({ reduced }: { reduced: boolean }) {
  const ref = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.visible = !reduced && t < 4.5;
    const p = Math.min(1, Math.max(0, (t - 0.4) / 2.3));
    ref.current.scale.x = Math.max(0.01, p);
  });
  return (
    <group ref={ref} position={[-9, 0.32, 0]}>
      <Box
        at={[10, 0, 0]}
        size={[20, 0.035, 0.12]}
        color="#ffe68e"
        glow={1.4}
      />
    </group>
  );
}
function World(props: SceneProps) {
  const { camera, invalidate, gl } = useThree();
  const frames = useRef({ start: 0, count: 0 });
  const ready = useRef(false);
  // Most geometry is static. Refresh the sun shadow when the village changes,
  // rather than rendering the same shadow map on every ghost-car frame.
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    invalidate();
    const timer = setTimeout(() => {
      gl.shadowMap.needsUpdate = true;
      invalidate();
    }, 1600);
    return () => clearTimeout(timer);
  }, [gl, invalidate, props.done.length, props.mode]);

  const car = useRef<T.Group>(null);
  const started = useRef(0);
  const carX = useRef(10);
  const arrived = useRef(false);
  const look = useRef(new T.Vector3(0, 0, 0));
  const lastLabels = useRef(0);
  const road = useMemo(
    () =>
      roadViewFor(props.village.personaId, props.village.destination?.roadId),
    [props.village],
  );
  const ghosts =
    road?.ghostGroups
      .filter((g) => g.count.shown && g.density.shown)
      .slice(0, 4) ?? [];
  useEffect(() => {
    if (props.reduced) return;
    const t = setInterval(invalidate, 1000 / 30);
    return () => clearInterval(t);
  }, [invalidate, props.reduced]);
  useEffect(() => {
    arrived.current = false;
  }, [props.mode, props.activeIndex]);
  useFrame(({ clock }, delta) => {
    if (!ready.current) {
      ready.current = true;
      // Let the first WebGL frame paint before fading out the Home illustration.
      requestAnimationFrame(() => {
        gl.domElement.dataset.worldReady = "true";
        props.onReady?.();
      });
    }
    frames.current.count++;
    if (clock.elapsedTime - frames.current.start > 2) {
      gl.domElement.dataset.worldFps = String(
        Math.round(
          frames.current.count / (clock.elapsedTime - frames.current.start),
        ),
      );
      gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
      frames.current = { start: clock.elapsedTime, count: 0 };
    }
    if (!started.current) started.current = clock.elapsedTime;
    const elapsed = clock.elapsedTime - started.current;
    const intro = props.reduced ? 1 : Math.min(1, elapsed / 2.4);
    const swoop = props.reduced
      ? 0
      : Math.sin(Math.min(1, Math.max(0, (elapsed - 0.7) / 3.3)) * Math.PI);
    const to = bumpX(props.activeIndex) - 3.8;
    if (props.mode === "travel") {
      carX.current = T.MathUtils.damp(carX.current, to, 2.6, delta);
      if (
        (Math.abs(carX.current - to) < 0.08 || props.reduced) &&
        !arrived.current
      ) {
        arrived.current = true;
        carX.current = to;
        props.onArrive();
      }
    }
    if (props.mode === "lesson") carX.current = to;
    if (car.current) car.current.position.x = carX.current;
    const roadMode = props.mode !== "village";
    const pos = roadMode
      ? new T.Vector3(carX.current - 13, 9, 10)
      : new T.Vector3(
          27 - swoop * 4,
          27 + (1 - intro) * 12 - swoop * 8,
          34 - swoop * 5,
        );
    const target = roadMode
      ? new T.Vector3(carX.current + 9, 0, 11)
      : new T.Vector3(-2 + swoop * 8, 0, swoop * 3);
    camera.position.lerp(pos, props.reduced ? 1 : 1 - Math.exp(-delta * 2.6));
    look.current.lerp(target, props.reduced ? 1 : 1 - Math.exp(-delta * 2.6));
    camera.lookAt(look.current);
    camera.updateMatrixWorld();
    if (clock.elapsedTime - lastLabels.current > 0.07) {
      lastLabels.current = clock.elapsedTime;
      const labels: Record<string, { x: number; y: number; visible: boolean }> =
        {};
      props.village.plots.forEach((p, i) => {
        const [x, z] = plotPosition(p.kind);
        const v = new T.Vector3(x, p.kind === "home" ? 7.2 : 4.3, z).project(
          camera,
        );
        const shift: Record<string, [number, number]> = {
          home: [-3, 3],
          savings: [-5, -1],
          pension: [-5, 4],
          car: [5, 0],
          family: [3, -5],
          business: [3, -5],
        };
        const [dx, dy] = shift[p.kind] ?? [0, 0];
        labels[p.id] = {
          x: (v.x + 1) * 50 + dx,
          y: Math.max(27, (1 - v.y) * 50 + dy),
          visible: !roadMode && v.z < 1,
        };
      });
      const v = new T.Vector3(5, props.lessons.length * 1.6 + 2.7, 5).project(
        camera,
      );
      labels.destination = {
        x: (v.x + 1) * 50 + 2,
        y: (1 - v.y) * 50 + 6,
        visible: !roadMode,
      };
      props.onLabels(labels);
    }
  });
  return (
    <>
      <fog attach="fog" args={["#637eaa", 80, 180]} />
      <ambientLight intensity={0.8} />
      <hemisphereLight args={["#c7e5ff", "#67825d", 1.1]} />
      <directionalLight
        position={[-25, 45, 15]}
        intensity={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-35}
        shadow-camera-right={40}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-normalBias={0.05}
      />
      <Box at={[-3, -0.7, 0]} size={[34, 1.3, 28]} color="#639989" />
      <Box at={[-3, -0.2, 0]} size={[33, 0.45, 27]} color="#8cc28a" />
      <Box at={[-3, 0.04, 0]} size={[29, 0.12, 23]} color="#58687d" />
      <Box at={[-3, 0.12, 0]} size={[23, 0.16, 17]} color="#98c98c" />
      {[-13, 13].map((z) => (
        <Box
          key={z}
          at={[-3, 0.05, z]}
          size={[33, 0.15, 0.22]}
          color="#c2d7ac"
        />
      ))}
      {Array.from({ length: 15 }, (_, i) => (
        <group key={i}>
          <Box
            at={[-16 + i * 1.9, 0.12, 10]}
            size={[0.75, 0.03, 0.09]}
            color="#e5e5cb"
          />
          <Box
            at={[-16 + i * 1.9, 0.12, -10]}
            size={[0.75, 0.03, 0.09]}
            color="#e5e5cb"
          />
        </group>
      ))}
      {[-16, 10].map((x) =>
        Array.from({ length: 9 }, (_, i) => (
          <Box
            key={x + ":" + i}
            at={[x, 0.12, -8 + i * 2]}
            size={[0.09, 0.03, 0.8]}
            color="#e5e5cb"
          />
        )),
      )}
      <Box at={[-2, 0.23, 0]} size={[6, 0.12, 5.7]} color="#eadfc1" />
      <Box at={[-3, 0.2, 0]} size={[23, 0.08, 1.4]} color="#e5d5b3" />
      <Box at={[-2, 0.2, 0]} size={[1.4, 0.08, 17]} color="#e5d5b3" />
      <Tree x={-2} z={0} scale={1.3} />
      {props.village.plots.map((p, i) => (
        <group
          key={p.id}
          position={[plotPosition(p.kind)[0], 0.25, plotPosition(p.kind)[1]]}
          onClick={(e) => {
            e.stopPropagation();
            props.onPlot(p.id);
          }}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}
        >
          <Box at={[0, 0.03, 0]} size={[5.3, 0.12, 5]} color="#bfd5a3" />
          <House kind={p.kind} floors={p.kind === "home" ? 2 : 1} />
        </group>
      ))}
      {(
        [
          [-17, -11],
          [-13, 9],
          [-7, -11],
          [0, -11],
          [9, -8],
          [11, 0],
          [9, 11],
          [-7, 11],
          [-18, 1],
          [-18, 7],
        ] as [number, number][]
      ).map(([x, z], i) => (
        <Tree key={i} x={x} z={z} scale={0.7 + (i % 3) * 0.13} />
      ))}
      {!props.village.plots.some(
        (p) => p.kind === "family" || p.kind === "business",
      ) && (
        <group position={[-2, 0.2, -7]}>
          <Box at={[0, 0.03, 0]} size={[5.3, 0.12, 5]} color="#a9ce93" />
          <Tree x={1} z={-1} scale={0.8} />
          <Box at={[-1, 0.5, 1]} size={[2, 0.14, 0.65]} color="#c8a76d" />
          <Box at={[-1, 0.85, 1.3]} size={[2, 0.6, 0.12]} color="#c8a76d" />
          {[-1.7, -0.3].map((x) => (
            <Box
              key={x}
              at={[x, 0.25, 1]}
              size={[0.1, 0.5, 0.5]}
              color="#586b61"
            />
          ))}
        </group>
      )}
      <HomeTrace reduced={props.reduced} />
      <Destination
        count={props.done.length}
        total={props.lessons.length}
        reduced={props.reduced}
      />
      {/* A continuous grassy peninsula carries the road and its houses. */}
      <Box at={[33, -0.7, 7]} size={[46, 1.3, 28]} color="#639989" />
      <Box at={[33, -0.12, 7]} size={[46, 0.2, 28]} color="#8cc28a" />
      <Box at={[33, -0.3, 7]} size={[46, 0.65, 5.3]} color="#aac2af" />
      <Box at={[33, 0.08, 7]} size={[46, 0.12, 4.4]} color="#596a81" />
      {Array.from({ length: 22 }, (_, i) => (
        <Box
          key={i}
          at={[11 + i * 2, 0.16, 7]}
          size={[0.85, 0.04, 0.09]}
          color="#edf0de"
        />
      ))}
      {props.lessons.map((l, i) => (
        <Bump
          key={l.id}
          index={i}
          paved={props.done.includes(l.id) || props.paved.includes(l.id)}
          animate={props.paved.includes(l.id)}
          reduced={props.reduced}
        />
      ))}
      {ghosts.map((g, i) => (
        <Ghost
          key={g.id}
          index={i}
          reduced={props.reduced}
          start={Math.max(20, bumpX(props.activeIndex) + 3)}
        />
      ))}
      <mesh position={[48, 3, 7]}>
        <sphereGeometry args={[2, 12, 8]} />
        <meshBasicMaterial color="#ffdf9b" transparent opacity={0.16} />
      </mesh>
      <group ref={car} position={[10, 0.14, 7.9]}>
        <Car />
      </group>
      {(
        [
          [-5, -1],
          [3, 1],
          [12, 10],
          [19, 4],
          [27, 10],
          [35, 4],
        ] as [number, number][]
      ).map(([x, z], i) => (
        <Lamp key={i} x={x} z={z} />
      ))}
      {props.mode !== "village" &&
        [29, 40, 49].map((x, i) => (
          <group key={x} position={[x, 0, i % 2 ? -1 : 15]}>
            <House kind={i % 2 ? "family" : "home"} floors={i % 2 ? 1 : 2} />
            <Tree x={3} z={2} scale={0.7} />
          </group>
        ))}
    </>
  );
}
export function VillageScene(props: SceneProps) {
  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [35, 45, 43], fov: 43, near: 0.1, far: 240 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      aria-label="An island village with a crane, lesson bumps, and cars from the synthetic crowd"
    >
      <World {...props} />
    </Canvas>
  );
}
