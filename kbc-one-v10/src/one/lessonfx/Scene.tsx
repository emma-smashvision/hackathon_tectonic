'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, Vector3, type Group } from 'three';
import { money, type CrowdBar, type CrowdLane, type LessonFxData } from './data';

export type CinemaStep = 'guess' | 'median' | 'reveal' | 'helped' | 'note' | 'apply' | 'reward';
type MotionProps = { reducedMotion?: boolean };
const mint = '#a2ffdf', blue = '#79dfff', amber = '#ffd18c', red = '#ff657b';

/** Canvas labels have a matching DOM equivalent in LessonCinema. No font/CDN request. */
function Label({ text, position, color = '#eafff9', width = 4 }: { text: string; position: [number, number, number]; color?: string; width?: number }) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!;
    ctx.font = '600 64px Arial';
    canvas.width = Math.min(1400, Math.max(190, Math.ceil(ctx.measureText(text).width + 48))); canvas.height = 128;
    ctx.font = '600 64px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#082630'; ctx.shadowBlur = 8; ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, 64, canvas.width - 32);
    return { texture: new CanvasTexture(canvas), aspect: canvas.width / canvas.height };
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={position} scale={[width, width / aspect, 1]}><spriteMaterial map={texture} transparent depthTest={false} /></sprite>;
}
function Glow({ position, size, color = mint, opacity = 1 }: { position: [number, number, number]; size: [number, number, number]; color?: string; opacity?: number }) {
  return <mesh position={position}><boxGeometry args={size} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.55} transparent={opacity < 1} opacity={opacity} /></mesh>;
}
export function GhostCar({ color = blue, opacity = .65 }: { color?: string; opacity?: number }) {
  return <group>
    <Glow position={[0, .35, 0]} size={[.95, .4, 1.85]} color={color} opacity={opacity} />
    <Glow position={[0, .68, -.12]} size={[.76, .32, .85]} color={color} opacity={opacity} />
    {[-.32, .32].map(x => <Glow key={x} position={[x, .4, .94]} size={[.2, .12, .03]} color="#fff6ce" />)}
    {[-.5, .5].flatMap(x => [-.57, .57].map(z => <mesh key={`${x}:${z}`} position={[x, .18, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.21, .21, .12, 10]} /><meshStandardMaterial color="#162734" /></mesh>))}
  </group>;
}
export function CrowdHistogram({ bars, median, guess, revealed = false, reducedMotion = false }: { bars: CrowdBar[]; median?: number; guess?: number; revealed?: boolean } & MotionProps) {
  const root = useRef<Group>(null), time = useRef(0);
  const published = bars.filter(b => b.share !== undefined);
  const maxShare = Math.max(.01, ...published.map(b => b.share!));
  const xFor = (value: number) => {
    const index = bars.findIndex(b => b.lower !== undefined && value >= b.lower && (b.upper === undefined || value <= b.upper));
    return ((index < 0 ? 0 : index) - (bars.length - 1) / 2) * 2.25;
  };
  useFrame((_, dt) => { time.current += dt; root.current?.children.forEach((g, i) => {
    const growth = reducedMotion ? 1 : Math.min(1, Math.max(0, (time.current - i * .1) / 1.1));
    g.scale.y = .025 + .975 * (1 - (1 - growth) ** 3);
  }); });
  return <group name="crowd-histogram">
    <group ref={root}>{bars.map((bar, i) => {
      const x = (i - (bars.length - 1) / 2) * 2.25, height = bar.share === undefined ? .08 : bar.share / maxShare * 5.5;
      return <group key={bar.id} position={[x, 0, 0]}>
        <Glow position={[0, height / 2, 0]} size={[1.65, height, 2.1]} color={bar.share === undefined ? '#516470' : blue} opacity={.55} />
        {bar.share !== undefined && <><Glow position={[0, height, 0]} size={[1.7, .06, 2.15]} /><Label text={`${Math.round(bar.share * 100)}%`} position={[0, height + .5, 0]} width={2.2} /></>}
        <Label text={bar.label} position={[0, .15, 2.2]} width={2.2} />
        {revealed && bar.share !== undefined && <FallingCrowd height={height} reducedMotion={reducedMotion} />}
      </group>;
    })}</group>
    {guess !== undefined && <group position={[xFor(guess), 0, 3.2]}><Glow position={[0, .1, 0]} size={[1.8, .07, 1.1]} color={amber} /><Glow position={[0, 1, 0]} size={[.04, 2, .04]} color={amber} /><Label text={`You · ${money(guess)}`} position={[0, 2.3, 0]} color={amber} width={3} /></group>}
    {revealed && median !== undefined && <group position={[xFor(median), 0, -1.8]}><Glow position={[0, 3.3, 0]} size={[.045, 6.6, .045]} /><Label text={`Typical · ${money(median)}`} position={[0, 6.5, 0]} width={3.5} color={mint} /></group>}
  </group>;
}
function FallingCrowd({ height, reducedMotion }: { height: number } & MotionProps) {
  const ref = useRef<Group>(null), t = useRef(0);
  useFrame((_, dt) => { t.current += dt; if (reducedMotion) return; ref.current?.children.forEach((p, i) => { p.position.y = height + 3 - ((t.current * 2 + i * .6) % (height + 3)); }); });
  return <group ref={ref}>{Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[Math.sin(i * 8) * .6, height + (reducedMotion ? .2 : i * .4), Math.cos(i * 6) * .8]}><sphereGeometry args={[.055, 5, 5]} /><meshBasicMaterial color={mint} /></mesh>)}</group>;
}
export function GhostConvoy({ rate, ratio, reducedMotion = false }: { rate?: number; ratio?: number } & MotionProps) {
  const root = useRef<Group>(null), time = useRef(0);
  const count = rate === undefined ? 0 : ratio ?? 100, affected = ratio ? 1 : Math.round((rate ?? 0) * 100);
  useFrame((_, dt) => { time.current += dt; root.current?.children.forEach((g, i) => {
    const t = reducedMotion ? .7 : Math.min(1, Math.max(0, (time.current - i * .12) / 2.5));
    g.position.z = -5 + t * 9 + (ratio ? 0 : Math.floor(i / 20) * 1.2);
    g.position.y = i < affected && !reducedMotion ? Math.sin(Math.max(0, Math.min(1, (t - .42) * 5)) * Math.PI) * 1.4 : 0;
    g.rotation.z = i < affected && !reducedMotion ? Math.sin(t * Math.PI * 6) * .15 * (t > .4 && t < .8 ? 1 : 0) : 0;
  }); });
  return <group name="ghost-proportion">
    <Glow position={[0, .13, 0]} size={[15, .26, .65]} color={amber} />
    <group ref={root}>{Array.from({ length: count }, (_, i) => <group key={i} position={ratio ? [(i - (count - 1) / 2) * 1.65, 0, -5] : [(i % 20 - 9.5) * .7, 0, Math.floor(i / 20) * .8]} scale={ratio ? 1 : .42}><GhostCar color={i < affected ? red : blue} /></group>)}</group>
    <Label text={ratio ? `1 in ${ratio}` : rate === undefined ? 'Outcome not published' : `${Math.round(rate * 100)} in 100`} position={[0, 4, -1]} color={mint} width={7} />
  </group>;
}
export function HelpedLanes({ lanes, selected = 0, onSelect, entering = false, reducedMotion = false }: { lanes: CrowdLane[]; selected?: number; onSelect?: (index: number) => void; entering?: boolean } & MotionProps) {
  const flow = useRef<Group>(null), player = useRef<Group>(null), t = useRef(0);
  const laneX = (selected - (lanes.length - 1) / 2) * 5;
  useFrame((_, dt) => { t.current += dt; if (player.current) { const blend = reducedMotion ? 1 : 1 - Math.exp(-dt * 8); player.current.position.x += (laneX - player.current.position.x) * blend; player.current.position.z += ((entering ? -3 : 3) - player.current.position.z) * blend; player.current.rotation.y = reducedMotion ? 0 : (laneX - player.current.position.x) * -.12; } if (!reducedMotion) flow.current?.children.forEach((g, i) => { g.position.z = 7 - ((t.current * 2.2 + i * 2.4) % 13); }); });
  return <group name="helped-lanes">
    {lanes.map((lane, i) => { const x = (i - (lanes.length - 1) / 2) * 5;
      return <group key={lane.id} position={[x, 0, 0]} onClick={e => { e.stopPropagation(); onSelect?.(i); }}>
        <Glow position={[0, .01, 0]} size={[4.2, .05, 16]} color={i === selected ? mint : blue} opacity={i === selected ? .2 : .06} />
        {[-2.1, 2.1].map(edge => <Glow key={edge} position={[edge, .06, 0]} size={[.055, .06, 16]} color={i === selected ? mint : blue} />)}
        <mesh position={[0, 2, -5]}><torusGeometry args={[1.5, .08, 8, 48]} /><meshBasicMaterial color="#325064" /></mesh>
        {lane.share !== undefined && <mesh position={[0, 2, -5]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[1.5, .1, 8, 48, lane.share / 100 * Math.PI * 2]} /><meshBasicMaterial color={mint} /></mesh>}
        <Label text={lane.share === undefined ? 'Explore' : `${lane.share}%`} position={[0, 2, -4.9]} width={2.2} />
      </group>;
    })}
    <group ref={flow}>{lanes.flatMap((lane, i) => Array.from({ length: 3 }, (_, j) => <group key={`${lane.id}-${j}`} position={[(i - (lanes.length - 1) / 2) * 5 + (j % 2 ? .65 : -.65), 0, j * 3 - 4]} scale={.65}><GhostCar color={i === selected ? mint : blue} opacity={.5} /></group>))}</group>
    <group ref={player} position={[0, .05, 3]}><GhostCar color={amber} opacity={1} /></group>
  </group>;
}
export function HologramSign({ reducedMotion = false }: MotionProps) {
  const ref = useRef<Group>(null), t = useRef(0);
  useFrame((_, dt) => { t.current += dt; if (ref.current) ref.current.position.y = reducedMotion ? 0 : Math.sin(t.current * 1.5) * .12; });
  return <group ref={ref} name="hologram-sign">
    <Glow position={[0, 1.8, 0]} size={[.14, 3.6, .14]} color={blue} />
    <Glow position={[0, 4, 0]} size={[10, 4.2, .12]} color={blue} opacity={.15} />
    {[-2.1, 2.1].map(y => <Glow key={y} position={[0, 4 + y, 0]} size={[10.2, .04, .08]} color={blue} />)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .02, 0]}><ringGeometry args={[1.8, 2, 48]} /><meshBasicMaterial color={blue} transparent opacity={.7} side={DoubleSide} /></mesh>
  </group>;
}
export function RewardBuild({ progress = 1, reducedMotion = false }: { progress?: number } & MotionProps) {
  const ref = useRef<Group>(null), t = useRef(0);
  useFrame((_, dt) => { t.current += dt; if (ref.current) ref.current.scale.y = reducedMotion ? 1 : Math.max(.01, Math.min(1, t.current / 1.8)); });
  return <group name="reward-floor"><Glow position={[0, .025, 3]} size={[8, .04, 14]} color={mint} opacity={Math.max(.05, progress * .3)} />
    <group ref={ref}>{[0, 1, 2].map(i => <group key={i} position={[0, i * 1.7, -3]}><Glow position={[0, .8, 0]} size={[6, 1.6, 4]} color="#436b78" />
      <Glow position={[0, 1.62, 0]} size={[6.3, .1, 4.3]} color={mint} />{[-2, -.7, .7, 2].map(x => <Glow key={x} position={[x, .85, 2.02]} size={[.7, .85, .04]} color={amber} />)}</group>)}</group>
  </group>;
}
function ForkWorld({ data }: { data: LessonFxData }) {
  const max = Math.max(1, ...data.forks.map(f => f.buffer ?? 0));
  return <group>{data.forks.map((f, i) => { const x = (i - (data.forks.length - 1) / 2) * 3.6, h = f.buffer === undefined ? .1 : f.buffer / max * 5;
    return <group key={f.id} position={[x, 0, 0]}><Glow position={[0, h / 2, 0]} size={[2.4, h, 2.4]} color={i % 2 ? mint : blue} opacity={.7} /><Label text={f.buffer === undefined ? 'Withheld' : money(f.buffer)} position={[0, h + .5, 0]} width={3.2} /><Label text={`Year ${f.horizon} · ${f.label}`} position={[0, .2, 2.5]} width={3.5} /></group>;
  })}</group>;
}
export type LessonSceneProps = { data: LessonFxData; step: CinemaStep; guess?: number; selectedLane?: number; onSelectLane?: (index: number) => void; controlCamera?: boolean; entering?: boolean } & MotionProps;
export function LessonScene({ data, step, guess, selectedLane = 0, onSelectLane, reducedMotion = false, controlCamera = false, entering = false }: LessonSceneProps) {
  const target = useMemo(() => new Vector3(0, step === 'guess' || step === 'median' ? 8 : 6.5, step === 'note' ? 14 : 11), [step]);
  useFrame(({ camera }, dt) => { if (controlCamera) { if (reducedMotion) camera.position.copy(target); else camera.position.lerp(target, 1 - Math.exp(-dt * 3)); camera.lookAt(0, step === 'guess' || step === 'median' ? 2.8 : 1.7, 0); } });
  return <group name="lesson-cinema-scene">
    <ambientLight intensity={.65} /><directionalLight position={[8, 15, 10]} intensity={1.2} color="#cbf7ff" />
    <mesh position={[0, -.15, 0]}><boxGeometry args={[27, .25, 36]} /><meshStandardMaterial color="#102b3b" roughness={.4} metalness={.5} /></mesh>
    {[-11, 11].map(x => <Glow key={x} position={[x, .025, 0]} size={[.06, .06, 36]} color={blue} opacity={.6} />)}
    {[-15, -11, -7, -3, 1, 5, 9, 13, 17].map(z => <Glow key={z} position={[0, .005, z]} size={[.08, .02, 1.4]} color="#91b8c7" opacity={.4} />)}
    {(step === 'guess' || step === 'median' || step === 'reveal' && data.rate === undefined) && (data.forks.length ? <ForkWorld data={data} /> : <CrowdHistogram bars={data.bars} median={data.median} guess={guess} revealed={step !== 'guess'} reducedMotion={reducedMotion} />)}
    {step === 'reveal' && data.rate !== undefined && <GhostConvoy rate={data.rate} ratio={data.ratio} reducedMotion={reducedMotion} />}
    {(step === 'helped' || step === 'apply') && <HelpedLanes lanes={data.lanes} selected={selectedLane} onSelect={onSelectLane} entering={entering} reducedMotion={reducedMotion} />}
    {step === 'note' && <HologramSign reducedMotion={reducedMotion} />}
    {step === 'reward' && <RewardBuild reducedMotion={reducedMotion} />}
  </group>;
}
