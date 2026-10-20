"use client";

import { type ReactNode, useMemo } from "react";
import * as THREE from "three";
import type { Landmark } from "../landmarks";
import { useGame } from "../runtime";

// A landmark per road and five civic buildings on the Everyday Road, from simple shapes in the
// city's night style, with silhouettes that read from the bird's eye. No text here: names are in
// the label layer. Local +z faces the road.

type V3 = [number, number, number];

function B({ p, s, c, e, ei = 0.5, r = 0 }: { p: V3; s: V3; c: string; e?: string; ei?: number; r?: number }) {
  return (
    <mesh position={p} rotation={[0, r, 0]}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.85} emissive={e ?? "#000000"} emissiveIntensity={e ? ei : 0} />
    </mesh>
  );
}

/** A glowing part: windows, signs, lights. */
function G({ p, s, c, r = 0 }: { p: V3; s: V3; c: string; r?: number }) {
  return (
    <mesh position={p} rotation={[0, r, 0]}>
      <boxGeometry args={s} />
      <meshBasicMaterial color={c} toneMapped={false} />
    </mesh>
  );
}

function Cyl({ p, r, h, c, e, seg = 16 }: { p: V3; r: number; h: number; c: string; e?: string; seg?: number }) {
  return (
    <mesh position={p}>
      <cylinderGeometry args={[r, r, h, seg]} />
      <meshStandardMaterial color={c} roughness={0.8} emissive={e ?? "#000000"} emissiveIntensity={e ? 0.5 : 0} />
    </mesh>
  );
}

const WALL = "#1d2c45";
const WARM = "#F6E7B8";

/** Rows of lit windows on the front face (local +z). */
function Windows({ w, d, rows, y0 = 2.4, step = 3.2, c = WARM, cols = 4 }: { w: number; d: number; rows: number; y0?: number; step?: number; c?: string; cols?: number }) {
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let i = 0; i < cols; i++) {
      const x = -w / 2 + (w / cols) * (i + 0.5);
      out.push(<G key={`${r}:${i}`} p={[x, y0 + r * step, d / 2 + 0.06]} s={[(w / cols) * 0.5, 1.3, 0.1]} c={c} />);
    }
  return <>{out}</>;
}

function Office({ a }: { a: string }) {
  return (
    <group>
      <B p={[0, 22, 0]} s={[12, 44, 12]} c="#1a3550" e="#0e2a40" />
      <Windows w={12} d={12} rows={12} c="#BDEFF7" cols={5} />
      <G p={[0, 44.4, 0]} s={[12.4, 0.8, 12.4]} c={a} />
      <B p={[0, 2, 9]} s={[16, 4, 4]} c={WALL} />
      <G p={[0, 4.2, 11.1]} s={[16, 0.4, 0.2]} c={a} />
    </group>
  );
}

function Studio({ a }: { a: string }) {
  return (
    <group>
      <B p={[0, 4, 0]} s={[18, 8, 12]} c="#2a2d38" />
      {[-6, 0, 6].map((x) => (
        <mesh key={x} position={[x, 9.3, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[3.6, 3.6, 11.6]} />
          <meshStandardMaterial color="#3a3f4d" />
        </mesh>
      ))}
      <G p={[0, 3.5, 6.06]} s={[14, 3.6, 0.1]} c="#F1E3B0" />
      {/* the late payers' clock tower */}
      <B p={[11, 9, -3]} s={[3.6, 18, 3.6]} c={WALL} />
      <mesh position={[11, 16, -1.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.2, 24]} />
        <meshBasicMaterial color={a} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A triangular pediment over the columns. */
function Pediment({ w, h, d, p }: { w: number; h: number; d: number; p: V3 }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, h);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return g;
  }, [w, h, d]);
  return (
    <mesh geometry={geo} position={p}>
      <meshStandardMaterial color="#C9C2AE" emissive="#4a463c" emissiveIntensity={0.5} />
    </mesh>
  );
}

function Notary({ a }: { a: string }) {
  return (
    <group>
      <B p={[0, 0.6, 0]} s={[18, 1.2, 13]} c="#3a3f4d" />
      <B p={[0, 6, -1.5]} s={[16, 10, 9]} c="#2c3346" />
      {[-6, -2, 2, 6].map((x) => (
        <Cyl key={x} p={[x, 5.6, 4.2]} r={0.6} h={9} c="#C9C2AE" e="#4a463c" />
      ))}
      <Pediment w={17} h={3.2} d={2} p={[0, 10.2, 3.4]} />
      <G p={[0, 3, 3.06]} s={[2.4, 4, 0.1]} c={WARM} />
      <G p={[0, 10.3, 5]} s={[12, 0.3, 0.3]} c={a} />
    </group>
  );
}

function Van({ p, c }: { p: V3; c: string }) {
  return (
    <group position={p}>
      <B p={[0, 1.8, 0]} s={[2.6, 3, 6]} c={c} e={c} ei={0.15} />
      <B p={[0, 1.4, 3.6]} s={[2.4, 2.2, 1.4]} c="#0b1626" />
      <G p={[0, 1.2, 4.32]} s={[2, 0.3, 0.05]} c="#fffbe8" />
    </group>
  );
}

function Depot({ a }: { a: string }) {
  return (
    <group>
      <B p={[0, 5, -2]} s={[20, 10, 12]} c="#252f42" />
      {[-5.5, 0, 5.5].map((x) => (
        <G key={x} p={[x, 3.2, 4.06]} s={[4, 6, 0.1]} c="#33445e" />
      ))}
      <G p={[0, 9, 4.1]} s={[20, 0.6, 0.2]} c={a} />
      <Van p={[-5.5, 0, 8]} c="#E8E4D8" />
      <Van p={[1, 0, 8.5]} c="#E8E4D8" />
      {/* moving boxes */}
      <B p={[7, 0.8, 8]} s={[1.6, 1.6, 1.6]} c="#a07a4a" />
      <B p={[8.4, 0.7, 9.2]} s={[1.4, 1.4, 1.4]} c="#a07a4a" />
      <B p={[7.6, 2.2, 8.4]} s={[1.2, 1.2, 1.2]} c="#a07a4a" />
    </group>
  );
}

function Installer({ a }: { a: string }) {
  return (
    <group>
      <B p={[0, 3.5, -2]} s={[16, 7, 10]} c="#24313f" />
      {/* solar panels on the roof */}
      {[-5, 0, 5].map((x) => (
        <mesh key={x} position={[x, 7.8, -2]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[4.4, 0.2, 8]} />
          <meshStandardMaterial color="#1b3a6a" emissive="#20457a" emissiveIntensity={0.5} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* heat pump units in the yard */}
      {[-5, 0, 5].map((x) => (
        <group key={x} position={[x, 0, 7]}>
          <B p={[0, 1.4, 0]} s={[3.2, 2.8, 1.6]} c="#d9dde4" e="#3a4250" ei={0.4} />
          <mesh position={[0, 1.4, 0.82]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1, 1, 0.08, 20]} />
            <meshBasicMaterial color={a} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Hospital({ a }: { a: string }) {
  return (
    <group>
      <B p={[0, 11, -2]} s={[16, 22, 10]} c="#2a3a52" e="#16243a" />
      <Windows w={16} d={6} rows={6} y0={2.6} c="#E8F1F8" cols={6} />
      {/* the cross */}
      <G p={[0, 18, 3.1]} s={[5, 1.6, 0.2]} c={a} />
      <G p={[0, 18, 3.1]} s={[1.6, 5, 0.2]} c={a} />
      {/* the crèche next door: small and colourful */}
      <group position={[11, 0, 4]}>
        <B p={[0, 2, 0]} s={[6, 4, 6]} c="#3a2f45" />
        <G p={[-1.6, 1.4, 3.06]} s={[1.2, 1.2, 0.1]} c="#F3A93C" />
        <G p={[0, 1.4, 3.06]} s={[1.2, 1.2, 0.1]} c="#7FD6A8" />
        <G p={[1.6, 1.4, 3.06]} s={[1.2, 1.2, 0.1]} c="#5ED4E8" />
        <mesh position={[0, 5.2, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[4.6, 2.4, 4]} />
          <meshStandardMaterial color={a} emissive={a} emissiveIntensity={0.25} />
        </mesh>
      </group>
    </group>
  );
}

function Harbour({ a }: { a: string }) {
  return (
    <group>
      {/* control tower */}
      <Cyl p={[-6, 13, -3]} r={1.4} h={26} c="#2a3a52" />
      <mesh position={[-6, 27.5, -3]}>
        <cylinderGeometry args={[3.4, 2.6, 3.2, 12]} />
        <meshStandardMaterial color="#0e2236" emissive="#2a5f8a" emissiveIntensity={0.8} />
      </mesh>
      <G p={[-6, 29.6, -3]} s={[0.6, 0.6, 0.6]} c="#ff5a4a" />
      {/* containers */}
      {[
        [3, 1.3, 2, "#c4553a"],
        [3, 3.9, 2, "#2f6f9a"],
        [8, 1.3, 2, "#d0a43a"],
        [3, 1.3, 6, "#3a8a6a"],
        [8, 1.3, 6, "#c4553a"],
      ].map(([x, y, z, c]) => (
        <B key={`${x}:${y}:${z}`} p={[x as number, y as number, z as number]} s={[4.6, 2.6, 2.4]} c={c as string} e={c as string} ei={0.12} />
      ))}
      {/* a harbour crane */}
      <B p={[10, 9, -4]} s={[0.8, 18, 0.8]} c="#F3A93C" e="#7a4a0c" />
      <B p={[6, 17.6, -4]} s={[12, 0.7, 0.7]} c="#F3A93C" e="#7a4a0c" />
      <G p={[0, 0.08, 9.5]} s={[22, 0.1, 1]} c={a} />
    </group>
  );
}

function CareHome({ a }: { a: string }) {
  return (
    <group>
      <B p={[0, 3.5, -3]} s={[20, 7, 8]} c="#2c2a40" />
      <Windows w={20} d={2} rows={2} y0={2} step={3} c="#DCD8F0" cols={7} />
      <mesh position={[0, 7.8, -3]}>
        <boxGeometry args={[21, 0.8, 9]} />
        <meshStandardMaterial color="#3a3550" />
      </mesh>
      {/* the garden and a bench */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 5]}>
        <planeGeometry args={[18, 6]} />
        <meshStandardMaterial color="#1c3a30" />
      </mesh>
      <B p={[4, 0.6, 5]} s={[3, 0.3, 1]} c="#7a5a3a" />
      <Cyl p={[-5, 2.4, 5]} r={1.8} h={0.2} c={a} e={a} />
    </group>
  );
}

function Park({ a }: { a: string }) {
  return (
    <group>
      {/* the pension office: a pavilion */}
      <B p={[0, 0.5, -4]} s={[14, 1, 8]} c="#3a3f4d" />
      {[-5, -1.7, 1.7, 5].map((x) => (
        <Cyl key={x} p={[x, 4, -1]} r={0.4} h={6} c="#D8C27A" e="#5a4a20" />
      ))}
      <B p={[0, 7.4, -4]} s={[15, 1, 9]} c="#4a4433" />
      <G p={[0, 4, -7.5]} s={[10, 4, 0.2]} c={WARM} />
      {/* the fountain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 6]}>
        <ringGeometry args={[3, 4, 32]} />
        <meshStandardMaterial color="#C9C2AE" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 6]}>
        <circleGeometry args={[3, 32]} />
        <meshBasicMaterial color="#1f4a5c" toneMapped={false} />
      </mesh>
      <mesh position={[0, 2, 6]}>
        <cylinderGeometry args={[0.15, 0.5, 4, 8]} />
        <meshBasicMaterial color={a} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      {[-8, 8].map((x) => (
        <group key={x} position={[x, 0, 5]}>
          <Cyl p={[0, 1.4, 0]} r={0.4} h={2.8} c="#4a3a2a" />
          <mesh position={[0, 4.2, 0]}>
            <sphereGeometry args={[2.4, 12, 10]} />
            <meshStandardMaterial color="#1f5a45" emissive="#0d3a2c" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SmallHouse({ p, lit, c = "#2c2a40" }: { p: V3; lit: boolean; c?: string }) {
  return (
    <group position={p}>
      <B p={[0, 2.5, 0]} s={[6, 5, 6]} c={c} />
      <mesh position={[0, 6.3, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[4.6, 2.6, 4]} />
        <meshStandardMaterial color="#3a3550" />
      </mesh>
      <G p={[1.4, 2.8, 3.06]} s={[1.2, 1.2, 0.1]} c={lit ? WARM : "#2a2f3d"} />
      <G p={[-1.4, 2.8, 3.06]} s={[1.2, 1.2, 0.1]} c="#2a2f3d" />
    </group>
  );
}

function Mediation({ a }: { a: string }) {
  return (
    <group>
      <SmallHouse p={[-6, 0, -2]} lit />
      <SmallHouse p={[6, 0, -2]} lit />
      {/* one calm path between them */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 2]}>
        <planeGeometry args={[12, 1.4]} />
        <meshBasicMaterial color={a} transparent opacity={0.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ParentHouse({ a }: { a: string }) {
  return (
    <group>
      <SmallHouse p={[0, 0, 0]} lit c="#2a2838" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[6, 6.3, 40]} />
        <meshBasicMaterial color={a} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      {/* the notary, a little further */}
      <B p={[11, 4, -4]} s={[6, 8, 6]} c="#2c3346" />
      {[9.6, 12.4].map((x) => (
        <Cyl key={x} p={[x, 3.4, -0.6]} r={0.35} h={6.4} c="#C9C2AE" e="#4a463c" />
      ))}
    </group>
  );
}

function JobCentre({ a }: { a: string }) {
  return (
    <group>
      <B p={[0, 7, -3]} s={[16, 14, 9]} c="#262b40" />
      <Windows w={16} d={3} rows={3} y0={3} step={3.4} c="#DCD8F0" cols={5} />
      {/* a bridge back to work */}
      <mesh position={[0, 0, 6]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[6, 0.5, 8, 24, Math.PI]} />
        <meshBasicMaterial color={a} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Bank({ a }: { a: string }) {
  return (
    <group>
      <B p={[0, 6, -2]} s={[14, 12, 9]} c="#173048" e="#0e2236" />
      <Windows w={14} d={5} rows={3} y0={2.6} c="#BDEFF7" cols={4} />
      <G p={[0, 11, 2.6]} s={[10, 1.2, 0.2]} c={a} />
      {/* the cash machine */}
      <B p={[6.4, 1.4, 3]} s={[1.6, 2.8, 1]} c="#2a3a55" />
      <G p={[6.4, 1.8, 3.52]} s={[1, 0.7, 0.05]} c="#5ED4E8" />
    </group>
  );
}

function TaxOffice({ a }: { a: string }) {
  return (
    <group>
      <B p={[0, 8, -2]} s={[16, 16, 10]} c="#2c3040" />
      <Windows w={16} d={6} rows={4} y0={2.6} c="#D8C9A3" cols={6} />
      <G p={[0, 16.4, 0]} s={[16.4, 0.6, 10.4]} c={a} />
    </group>
  );
}

function Travel({ a }: { a: string }) {
  return (
    <group>
      <B p={[0, 2, 0]} s={[6, 4, 4]} c="#22324d" />
      <G p={[0, 2.4, 2.06]} s={[4.4, 1.8, 0.1]} c={a} />
      {/* a parasol and a suitcase */}
      <Cyl p={[6, 2.2, 2]} r={0.12} h={4.4} c="#C9C2AE" />
      <mesh position={[6, 4.6, 2]}>
        <coneGeometry args={[2.6, 1.2, 12]} />
        <meshStandardMaterial color="#F3A93C" emissive="#7a4a0c" emissiveIntensity={0.5} />
      </mesh>
      <B p={[-5, 0.9, 3]} s={[2.2, 1.8, 0.9]} c="#8FB8E8" e="#2f4f7a" ei={0.4} />
    </group>
  );
}

function School({ a }: { a: string }) {
  return (
    <group>
      <B p={[0, 5, -3]} s={[18, 10, 8]} c="#2f2a38" />
      <Windows w={18} d={2} rows={2} y0={2.4} step={3.6} c={WARM} cols={6} />
      {/* the bell tower */}
      <B p={[0, 12, -3]} s={[3, 4, 3]} c="#3a3250" />
      <mesh position={[0, 15.2, -3]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.4, 2.4, 4]} />
        <meshStandardMaterial color={a} emissive={a} emissiveIntensity={0.25} />
      </mesh>
      {/* the playground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 5]}>
        <planeGeometry args={[16, 5]} />
        <meshStandardMaterial color="#3a2f2f" />
      </mesh>
    </group>
  );
}

function Shops({ a }: { a: string }) {
  return (
    <group>
      {[-6.5, 0, 6.5].map((x, i) => (
        <group key={x} position={[x, 0, -1]}>
          <B p={[0, 4, 0]} s={[6, 8, 8]} c={["#2a2d38", "#30283a", "#262f3a"][i]} />
          <G p={[0, 2.2, 4.06]} s={[5, 3, 0.1]} c={["#F1E3B0", "#F8D9C4", "#BDEFF7"][i]} />
          <mesh position={[0, 4.4, 4.6]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[5.6, 0.2, 1.6]} />
            <meshBasicMaterial color={i === 1 ? a : "#7FD6A8"} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* a string of December lights */}
      {Array.from({ length: 9 }, (_, i) => (
        <G key={i} p={[-9 + i * 2.25, 8.4 + (i % 2) * 0.4, 3.2]} s={[0.4, 0.4, 0.4]} c={i % 2 ? "#F3A93C" : "#fffbe8"} />
      ))}
    </group>
  );
}

const MODELS: Record<Landmark["kind"], (p: { a: string }) => ReactNode> = {
  office: Office,
  studio: Studio,
  notary: Notary,
  depot: Depot,
  installer: Installer,
  hospital: Hospital,
  harbour: Harbour,
  carehome: CareHome,
  park: Park,
  mediation: Mediation,
  parentHouse: ParentHouse,
  jobcentre: JobCentre,
  bank: Bank,
  tax: TaxOffice,
  school: School,
  shops: Shops,
  travel: Travel,
};

export function Landmarks() {
  const { landmarks } = useGame();
  return (
    <group>
      {landmarks.map((l) => {
        const Model = MODELS[l.kind];
        return (
          <group key={l.id} position={[l.x, 0, l.z]} rotation={[0, l.rot, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
              <circleGeometry args={[l.r + 1, 32]} />
              <meshStandardMaterial color="#0f2032" roughness={1} side={THREE.DoubleSide} />
            </mesh>
            <Model a={l.accent} />
          </group>
        );
      })}
    </group>
  );
}
