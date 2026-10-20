"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { MarketInfo, Place } from "../../engine/world";
import { HALF_W, pointAt, ROAD_W, type Path } from "../network";
import { useStore } from "../../components/store";
import { LANDMARK_SCALE, SIGN_X } from "../streetTour";
import { nextStreetJourney } from "../neighbourhood";
import { useGame } from "../runtime";
import { MARKET_X1, marketX, type Spot, STREET_Z } from "../streets";

// Your own world inside the ring: Home Street (home, garage, the vault's silos, the pension tree) and
// Market Mile (a tower per investment, standing where you bought it). Built from simple shapes in the
// city's night style. There is deliberately no text here (the label layer draws every word) and
// nothing moves: towers change once a month, at the month's close, never live.

const FLOOR_H = 3.4;
const EPC_COLOR: Record<string, string> = { A: "#3fae49", B: "#8cc63f", C: "#d7df23", D: "#fff200", E: "#f7a51c", F: "#ed1c24" };

function Edges({ w, h, d, y, color, opacity = 0.9 }: { w: number; h: number; d: number; y: number; color: string; opacity?: number }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), [w, h, d]);
  return (
    <lineSegments geometry={geo} position={[0, y, 0]}>
      <lineBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </lineSegments>
  );
}

function Ghost({ w, h, d, y, color }: { w: number; h: number; d: number; y: number; color: string }) {
  if (h <= 0.05) return null;
  return (
    <group>
      <mesh position={[0, y, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} toneMapped={false} />
      </mesh>
      <Edges w={w} h={h} d={d} y={y} color={color} opacity={0.75} />
    </group>
  );
}

/** A gable roof: a triangular prism along x. */
function Gable({ w, d, h, y, solid, color }: { w: number; d: number; h: number; y: number; solid: boolean; color: string }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-d / 2, 0);
    s.lineTo(d / 2, 0);
    s.lineTo(0, h);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
    g.translate(0, 0, -w / 2);
    g.rotateY(Math.PI / 2);
    return g;
  }, [w, d, h]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  return (
    <group position={[0, y, 0]}>
      <mesh geometry={geo}>
        {solid ? (
          <meshStandardMaterial color="#3a2a33" roughness={0.8} emissive="#1a0f14" />
        ) : (
          <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} toneMapped={false} />
        )}
      </mesh>
      {!solid && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={color} transparent opacity={0.75} toneMapped={false} />
        </lineSegments>
      )}
    </group>
  );
}

/** Insurance: a faint dome over what it covers, with a bright ring on the ground. */
function Shield({ r, color = "#7FD6A8" }: { r: number; color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[r - 0.35, r, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Lot({ s, accent }: { s: Spot; accent: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[s.width, s.depth]} />
        <meshStandardMaterial color="#0f2032" roughness={1} />
      </mesh>
      {/* a short path from the street to the door */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, s.depth / 2 + 1.6]}>
        <planeGeometry args={[2.2, 3.2]} />
        <meshBasicMaterial color={accent} transparent opacity={0.35} toneMapped={false} />
      </mesh>
    </group>
  );
}

function House({ p }: { p: Place }) {
  const W = 14;
  const D = 11;
  const H = 8;
  const built = H * Math.max(0.08, Math.min(1, p.fill));
  const done = p.fill >= 0.999;
  return (
    <group>
      <mesh position={[0, built / 2, 0]}>
        <boxGeometry args={[W, built, D]} />
        <meshStandardMaterial color="#6e91a6" roughness={0.75} emissive="#1e4356" />
      </mesh>
      {[2.4, 5.6].map((y) =>
        y + 0.8 < built
          ? [-4.2, 4.2].map((x) => (
              <mesh key={`${x}:${y}`} position={[x, y, D / 2 + 0.06]}>
                <boxGeometry args={[2.2, 1.6, 0.1]} />
                <meshBasicMaterial color="#BDEFF7" toneMapped={false} />
              </mesh>
            ))
          : null,
      )}
      <mesh position={[0, 1.3, D / 2 + 0.06]}>
        <boxGeometry args={[1.8, 2.6, 0.12]} />
        <meshBasicMaterial color="#F6E7B8" toneMapped={false} />
      </mesh>
      <Ghost w={W} h={H - built} d={D} y={built + (H - built) / 2} color={p.accent} />
      <Gable w={W} d={D + 0.6} h={4.6} y={H} solid={done} color={p.accent} />
      {p.epc && (
        <mesh position={[-W / 2 + 1.4, 2.6, D / 2 + 0.1]}>
          <boxGeometry args={[1.4, 1, 0.12]} />
          <meshBasicMaterial color={EPC_COLOR[p.epc] ?? "#9FB0C6"} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function Flat({ p }: { p: Place }) {
  const W = 12;
  const D = 10;
  const floors = 4;
  return (
    <group>
      <mesh position={[0, (floors * 3.2) / 2, 0]}>
        <boxGeometry args={[W, floors * 3.2, D]} />
        <meshStandardMaterial color="#506d88" roughness={0.8} emissive="#173146" />
      </mesh>
      {Array.from({ length: floors }, (_, f) => (
        <mesh key={f} position={[0, f * 3.2 + 1.8, D / 2 + 0.06]}>
          <boxGeometry args={[W - 1.6, 1.3, 0.1]} />
          <meshBasicMaterial color={f === 1 ? "#fff0b9" : "#74bad3"} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, floors * 3.2 + 0.3, 0]}>
        <boxGeometry args={[W + 0.4, 0.6, D + 0.4]} />
        <meshStandardMaterial color="#1a2740" />
      </mesh>
      {/* A large, unmistakable key: this home is rented, not a partly paid loan. */}
      <group position={[0, 8, D / 2 + 0.45]}>
        <mesh><torusGeometry args={[1.25, 0.3, 6, 12]} /><meshBasicMaterial color="#ffdc80" toneMapped={false} /></mesh>
        <mesh position={[0, -2.5, 0]}><boxGeometry args={[0.5, 3.1, 0.5]} /><meshBasicMaterial color="#ffdc80" toneMapped={false} /></mesh>
        {[-3.2, -4].map((y) => <mesh key={y} position={[0.55, y, 0]}><boxGeometry args={[1.2, 0.45, 0.5]} /><meshBasicMaterial color="#ffdc80" toneMapped={false} /></mesh>)}
      </group>
      {/* the rental deposit: a small safe by the door */}
      <group position={[W / 2 - 1.2, 0, D / 2 + 1.6]}>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[1.6, 1.6, 1.4]} />
          <meshStandardMaterial color="#3b4a62" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.85, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.1, 16]} />
          <meshBasicMaterial color="#D8C27A" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Plot({ p }: { p: Place }) {
  const W = 15;
  const D = 12;
  const h = 0.3 + 1.9 * Math.min(1, p.fill);
  return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[W, 0.2, D]} />
        <meshStandardMaterial color="#3a4250" roughness={1} />
      </mesh>
      {/* the foundations grow with the house fund */}
      {[
        [0, D / 2 - 0.3, W, 0.6],
        [0, -D / 2 + 0.3, W, 0.6],
        [W / 2 - 0.3, 0, 0.6, D],
        [-W / 2 + 0.3, 0, 0.6, D],
      ].map(([x, z, w, d]) => (
        <mesh key={`${x}:${z}`} position={[x, 0.2 + h / 2, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#7FD6A8" emissive="#1f5a45" emissiveIntensity={0.6} roughness={0.7} />
        </mesh>
      ))}
      <Ghost w={W - 1} h={8 - h} d={D - 1} y={0.2 + h + (8 - h) / 2} color={p.accent} />
      <Gable w={W - 1} d={D - 0.4} h={4.4} y={8.2} solid={false} color={p.accent} />
      {/* a crane: it's being built */}
      <group position={[-W / 2 - 1.5, 0, -D / 2 + 1]}>
        <mesh position={[0, 11, 0]}>
          <boxGeometry args={[0.7, 22, 0.7]} />
          <meshStandardMaterial color="#F3A93C" emissive="#7a4a0c" />
        </mesh>
        <mesh position={[6, 21.6, 0]}>
          <boxGeometry args={[15, 0.6, 0.6]} />
          <meshStandardMaterial color="#F3A93C" emissive="#7a4a0c" />
        </mesh>
        <mesh position={[11, 17, 0]}>
          <boxGeometry args={[0.08, 9, 0.08]} />
          <meshBasicMaterial color="#C9C2AE" />
        </mesh>
      </group>
    </group>
  );
}

function CarModel({ color }: { color: string }) {
  return (
    <group position={[0, 0.55, 0]}>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[2.2, 0.75, 4.4]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.35} emissive={color} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, 0.98, -0.25]}>
        <boxGeometry args={[1.8, 0.6, 2.2]} />
        <meshStandardMaterial color="#0b1626" metalness={0.6} roughness={0.2} />
      </mesh>
      {[-0.65, 0.65].map((x) => <mesh key={x} position={[x, 0.4, 2.22]}><boxGeometry args={[0.5, 0.25, 0.08]} /><meshBasicMaterial color="#fff5dc" toneMapped={false} /></mesh>)}
      {[
        [-1.05, 1.35],
        [1.05, 1.35],
        [-1.05, -1.35],
        [1.05, -1.35],
      ].map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, 0.05, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.55, 0.55, 0.4, 14]} />
          <meshStandardMaterial color="#05080d" />
        </mesh>
      ))}
    </group>
  );
}

function Garage({ p }: { p: Place }) {
  const W = 8;
  const D = 8;
  const H = 4.2;
  return (
    <group>
      <mesh position={[0, H / 2, -D / 2]}>
        <boxGeometry args={[W, H, 0.4]} />
        <meshStandardMaterial color="#22324d" />
      </mesh>
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <mesh key={`${x}:${z}`} position={[x * W / 2, H / 2, z * D / 2]}>
        <boxGeometry args={[0.55, H, 0.55]} /><meshStandardMaterial color="#7694ab" metalness={0.5} roughness={0.35} />
      </mesh>))}
      <mesh position={[0, H + 0.2, -1.4]}>
        <boxGeometry args={[W + 0.6, 0.4, D - 2]} />
        <meshStandardMaterial color="#6799ad" transparent opacity={0.65} metalness={0.3} roughness={0.2} />
      </mesh>
      <mesh position={[0, H - 0.3, D / 2]}>
        <boxGeometry args={[W, 0.4, 0.3]} />
        <meshBasicMaterial color={p.accent} toneMapped={false} />
      </mesh>
      <group position={[0, 0, 1.6]} scale={1.55}><CarModel color={p.alert ? "#f3ad46" : "#52c5ed"} /></group>
      {p.alert && <pointLight position={[0, 2, 4]} color="#ffb547" intensity={45} distance={18} />}
      <mesh position={[0, 0.05, 1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[W + 1, D + 1]} /><meshBasicMaterial color={p.alert ? "#f3a93c" : p.accent} transparent opacity={0.15} toneMapped={false} /></mesh>
      {p.alert && (
        <group position={[W / 2 + 1.2, 0, D / 2]}>
          <mesh position={[0, 2.4, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 4.8, 6]} />
            <meshStandardMaterial color="#2a3a55" />
          </mesh>
          <mesh position={[0, 5.1, 0]}>
            <sphereGeometry args={[0.6, 12, 8]} />
            <meshBasicMaterial color="#F3A93C" toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function Silo({ p }: { p: Place }) {
  const R = 3;
  const H = 13;
  const f = Math.max(0.04, Math.min(1, p.fill));
  return (
    <group>
      <mesh position={[0, (H * f) / 2, 0]}>
        <cylinderGeometry args={[R - 0.3, R - 0.3, H * f, 24]} />
        <meshStandardMaterial color="#28b9d3" emissive="#27bed8" emissiveIntensity={0.45} roughness={0.3} />
      </mesh>
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[R, R, H, 12, 1, true]} />
        <meshBasicMaterial color="#BDEFF7" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {[0.05, H * 0.25, H * 0.5, H * 0.75, H].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[R - 0.1, R + 0.12, 24]} />
          <meshBasicMaterial color={p.accent} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, H * f + 0.1, 0]}><cylinderGeometry args={[R - 0.3, R - 0.3, 0.25, 12]} /><meshStandardMaterial color="#e6c86b" metalness={0.6} roughness={0.3} emissive="#8f6f25" emissiveIntensity={0.4} /></mesh>
      <mesh position={[0, 2.7, R + 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.4, 1.4, 0.4, 12]} /><meshStandardMaterial color="#b9cbd7" metalness={0.75} roughness={0.2} /></mesh>
      <mesh position={[0, 2.7, R + 0.4]}><torusGeometry args={[0.7, 0.12, 6, 12]} /><meshBasicMaterial color="#fff0b9" toneMapped={false} /></mesh>
      <mesh position={[0, H + 1.2, 0]}>
        <coneGeometry args={[R + 0.2, 2.4, 24, 1, true]} />
        <meshBasicMaterial color="#BDEFF7" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function PensionTree({ p }: { p: Place }) {
  const k = p.scale ?? 1;
  const fruits = Math.round(Math.min(1, p.fill) * 6);
  return (
    <group scale={[k, k, k]}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.45, 0.7, 4, 8]} />
        <meshStandardMaterial color="#9a7952" roughness={1} />
      </mesh>
      {[[0, 6.8, 0, 3.2], [-2.2, 5.5, 0.5, 2.4], [2.1, 5.8, 0.2, 2.7], [0.5, 7, -1.8, 2.4]].map(([x, y, z, r], i) => <mesh key={i} position={[x, y, z]}>
        <icosahedronGeometry args={[r, 0]} /><meshStandardMaterial color={i % 2 ? "#4eaa83" : "#2d8b69"} roughness={0.85} emissive="#12533b" emissiveIntensity={0.4} flatShading />
      </mesh>)}
      {[-1, 1].map((side) => <mesh key={side} position={[side * 1.1, 3.5, 0]} rotation={[0, 0, -side * 0.7]}><cylinderGeometry args={[0.25, 0.45, 3, 6]} /><meshStandardMaterial color="#927452" /></mesh>)}
      {Array.from({ length: fruits }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        return (
          <mesh key={i} position={[Math.cos(a) * 3.1, 5.2 + (i % 2) * 1.6, Math.sin(a) * 3.1]}>
            <sphereGeometry args={[0.45, 10, 8]} />
            <meshBasicMaterial color="#F1E3B0" toneMapped={false} />
          </mesh>
        );
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[4, 4.4, 40]} />
        <meshBasicMaterial color={p.accent} transparent opacity={0.7} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ChildAccount({ p }: { p: Place }) {
  return (
    <group>
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[5, 3.6, 5]} />
        <meshStandardMaterial color="#3a2f45" roughness={0.9} emissive="#1a1220" />
      </mesh>
      <mesh position={[0, 4.6, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[4.1, 2.4, 4]} />
        <meshStandardMaterial color={p.accent} emissive={p.accent} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 7.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.25, 20]} />
        <meshBasicMaterial color="#F1E3B0" toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.2, 2.56]}>
        <boxGeometry args={[1.2, 2, 0.1]} />
        <meshBasicMaterial color="#F8D9C4" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A tower per investment: stone floors = what you put in, lit floors = growth, scaffolding = below what you put in. */
function Tower({ p }: { p: Place }) {
  const t = p.tower;
  if (!t) return null;
  const W = 10;
  const stoneH = t.stone * FLOOR_H;
  const litH = t.lit * FLOOR_H;
  const scafH = t.scaffold * FLOOR_H;
  const top = stoneH + litH + scafH;
  return (
    <group>
      <mesh position={[0, stoneH / 2, 0]}>
        <boxGeometry args={[W, stoneH, W]} />
        <meshStandardMaterial color="#a39a86" roughness={0.95} emissive="#3a352b" />
      </mesh>
      {Array.from({ length: t.stone }, (_, i) => (
        <mesh key={`s${i}`} position={[0, (i + 1) * FLOOR_H - 0.06, 0]}>
          <boxGeometry args={[W + 0.12, 0.12, W + 0.12]} />
          <meshBasicMaterial color="#4d483e" />
        </mesh>
      ))}
      {t.lit > 0 && (
        <group>
          <mesh position={[0, stoneH + litH / 2, 0]}>
            <boxGeometry args={[W, litH, W]} />
            <meshStandardMaterial color="#D8C27A" emissive="#F1E3B0" emissiveIntensity={0.55} roughness={0.6} />
          </mesh>
          {Array.from({ length: t.lit }, (_, i) => (
            <mesh key={`l${i}`} position={[0, stoneH + (i + 1) * FLOOR_H - 0.06, 0]}>
              <boxGeometry args={[W + 0.12, 0.12, W + 0.12]} />
              <meshBasicMaterial color="#8a7a45" />
            </mesh>
          ))}
          <mesh position={[0, top + 2.2, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 4.4, 6]} />
            <meshStandardMaterial color="#9FB0C6" />
          </mesh>
          <mesh position={[0, top + 4.6, 0]}>
            <sphereGeometry args={[0.55, 12, 8]} />
            <meshBasicMaterial color="#F1E3B0" toneMapped={false} />
          </mesh>
        </group>
      )}
      {t.scaffold > 0 && (
        <group>
          <Edges w={W + 0.8} h={scafH} d={W + 0.8} y={stoneH + scafH / 2} color="#F3A93C" />
          {[-1, 0, 1].flatMap((i) =>
            [-1, 1].map((k) => (
              <mesh key={`${i}:${k}`} position={[(i * (W + 0.8)) / 2, stoneH + scafH / 2, (k * (W + 0.8)) / 2]}>
                <boxGeometry args={[0.18, scafH, 0.18]} />
                <meshBasicMaterial color="#F3A93C" toneMapped={false} />
              </mesh>
            )),
          )}
          {Array.from({ length: t.scaffold + 1 }, (_, i) => (
            <mesh key={`p${i}`} position={[0, stoneH + i * FLOOR_H, (W + 0.8) / 2]}>
              <boxGeometry args={[W + 0.8, 0.16, 0.9]} />
              <meshStandardMaterial color="#7a5a2a" />
            </mesh>
          ))}
          {/* a crane: under repair */}
          <mesh position={[W / 2 - 1, top + 5, -W / 2 + 1]}>
            <boxGeometry args={[0.5, 10, 0.5]} />
            <meshStandardMaterial color="#F3A93C" emissive="#7a4a0c" />
          </mesh>
          <mesh position={[0, top + 9.8, -W / 2 + 1]}>
            <boxGeometry args={[W + 4, 0.45, 0.45]} />
            <meshStandardMaterial color="#F3A93C" emissive="#7a4a0c" />
          </mesh>
        </group>
      )}
      {/* plaque at the door, and the news board beside it (the words are in the label layer) */}
      <mesh position={[0, 1.4, W / 2 + 0.15]}>
        <boxGeometry args={[3, 1.6, 0.2]} />
        <meshStandardMaterial color="#8a7a45" metalness={0.6} roughness={0.3} emissive="#3a3018" />
      </mesh>
      <group position={[W / 2 + 2.6, 0, W / 2 + 1.2]} rotation={[0, -0.35, 0]}>
        {[-1.9, 1.9].map((x) => (
          <mesh key={x} position={[x, 2.2, 0]}>
            <boxGeometry args={[0.2, 4.4, 0.2]} />
            <meshStandardMaterial color="#2a3a55" />
          </mesh>
        ))}
        <mesh position={[0, 4.6, 0]}>
          <boxGeometry args={[4.6, 2.6, 0.25]} />
          <meshStandardMaterial color="#0d1a2c" emissive="#13304a" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 5.95, 0]}>
          <boxGeometry args={[4.6, 0.12, 0.3]} />
          <meshBasicMaterial color={p.accent} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Kiosk({ p }: { p: Place }) {
  return (
    <group>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[4, 3.2, 3]} />
        <meshStandardMaterial color="#22324d" emissive="#0c1a2c" />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[5, 0.4, 4]} />
        <meshBasicMaterial color={p.accent} toneMapped={false} />
      </mesh>
    </group>
  );
}

function PlaceModel({ p, s }: { p: Place; s: Spot }) {
  const rot = s.side === 1 ? Math.PI : 0;
  return (
    <group position={[s.x, 0, s.z]} rotation={[0, rot, 0]}>
      {p.kind !== "tower" && p.kind !== "kiosk" && <Lot s={s} accent={p.accent} />}
      <group scale={p.street === "home" ? LANDMARK_SCALE : 1}>
      {p.kind === "house" && <House p={p} />}
      {p.kind === "flat" && <Flat p={p} />}
      {p.kind === "plot" && <Plot p={p} />}
      {p.kind === "garage" && <Garage p={p} />}
      {p.kind === "silo" && <Silo p={p} />}
      {p.kind === "tree" && <PensionTree p={p} />}
      {p.kind === "child" && <ChildAccount p={p} />}
      {p.kind === "tower" && <Tower p={p} />}
      {p.kind === "kiosk" && <Kiosk p={p} />}
      </group>
    </group>
  );
}

/** A gantry over each end of a street, in its colour (its name is in the label layer). */
function StreetGates({ path, color }: { path: Path; color: string }) {
  return (
    <>
      {[16, path.length - 16].map((at) => {
        const { p, tan } = pointAt(path, at);
        const perp = { x: -tan.z, z: tan.x };
        return (
          <group key={at}>
            {[-1, 1].map((k) => (
              <mesh key={k} position={[p.x + perp.x * (HALF_W + 0.6) * k, 3.5, p.z + perp.z * (HALF_W + 0.6) * k]}>
                <boxGeometry args={[0.5, 7, 0.5]} />
                <meshStandardMaterial color="#22385A" />
              </mesh>
            ))}
            <mesh position={[p.x, 6.8, p.z]} rotation={[0, Math.atan2(tan.x, tan.z), 0]}>
              <boxGeometry args={[ROAD_W + 1.6, 0.45, 0.45]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** Market Mile's time: a post per year, a line at today, fog beyond it, and the market's weather. */
function MarketDressing({ market }: { market: MarketInfo }) {
  const inner = -(STREET_Z - HALF_W - 2.2);
  const weather = market.weather?.kind;
  const rain = useMemo(() => {
    if (weather !== "rain") return null;
    const pts: number[] = [];
    for (let i = 0; i < 160; i++) {
      const x = -60 + ((i * 37) % 140);
      const z = -40 - ((i * 13) % 40);
      const y = 20 + ((i * 7) % 58);
      pts.push(x, y, z, x - 0.4, y - 4, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [weather]);
  return (
    <group>
      {market.years.map((y) => (
        <group key={y.label} position={[marketX(y.t, market.span), 0, inner]}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 4, 6]} />
            <meshStandardMaterial color="#2a3a55" />
          </mesh>
          <mesh position={[0, 4.2, 0]}>
            <boxGeometry args={[0.9, 0.5, 0.9]} />
            <meshBasicMaterial color="#D8C27A" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {market.years.length > 0 && (
        <>
          {/* today: a bright line across the street */}
          <mesh position={[MARKET_X1 - 7, 0.06, -STREET_Z]}>
            <boxGeometry args={[0.8, 0.06, ROAD_W]} />
            <meshBasicMaterial color="#EDE7D7" toneMapped={false} />
          </mesh>
          {/* beyond today: fog */}
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[MARKET_X1 - 16 - i * 12, 9, -STREET_Z - 8]}>
              <boxGeometry args={[11.5, 18, 34]} />
              <meshBasicMaterial color="#1a2a40" transparent opacity={0.16 + i * 0.1} depthWrite={false} toneMapped={false} />
            </mesh>
          ))}
        </>
      )}
      {weather && weather !== "clear" && (
        <group>
          {[-35, -5, 25, 55].map((x, i) => (
            <mesh key={x} position={[x, 84 + (i % 2) * 6, -52 - (i % 2) * 10]} scale={[14, 4, 9]}>
              <sphereGeometry args={[1, 16, 10]} />
              <meshStandardMaterial color={weather === "rain" ? "#1c2333" : "#2a3448"} roughness={1} transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
      )}
      {rain && (
        <lineSegments geometry={rain}>
          <lineBasicMaterial color="#6f86a8" transparent opacity={0.4} />
        </lineSegments>
      )}
    </group>
  );
}

export function Places() {
  const { places, spots, net, travelTo, hud, mapView } = useGame();
  const { road } = useStore();
  const nextId = nextStreetJourney(places, road).id;
  if (!net.streets.length) return null;
  const home = net.streets.find((s) => s.street === "home");
  const mile = net.streets.find((s) => s.street === "market");
  return (
    <group>
      {home && <StreetGates path={home} color="#5ED4E8" />}
      {mile && <StreetGates path={mile} color="#D8C27A" />}
      {places.filter((p) => p.street === "home" || hud.street === "market" || mapView).map((p) => {
        const s = spots.find((x) => x.id === p.id);
        return s ? <group key={p.id} onClick={(event) => { event.stopPropagation(); travelTo({ kind: "place", id: p.id }); }}><PlaceModel p={p} s={s} /></group> : null;
      })}
      <group position={[SIGN_X, 0, STREET_Z + 11]} onClick={(event) => { event.stopPropagation(); travelTo({ kind: "journey", id: nextId }); }}>
        <mesh position={[0, 5, 0]}><boxGeometry args={[0.8, 10, 0.8]} /><meshStandardMaterial color="#7994ad" /></mesh>
        <mesh position={[0, 12, 0]}><boxGeometry args={[16, 7, 1.2]} /><meshStandardMaterial color="#124360" emissive="#1c9ed0" emissiveIntensity={hud.tourFinished ? 1.6 : 0.5} /></mesh>
        <mesh position={[0, 12, -0.65]}><boxGeometry args={[8, 0.8, 0.1]} /><meshBasicMaterial color="#bdefff" toneMapped={false} /></mesh>
        <mesh position={[4.3, 12, -0.65]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[2, 3, 3]} /><meshBasicMaterial color="#bdefff" toneMapped={false} /></mesh>
        {hud.tourFinished && <pointLight position={[0, 12, -4]} color="#45cfff" intensity={80} distance={35} />}
      </group>
    </group>
  );
}
