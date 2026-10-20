import type { CityApi, Vec2 } from '../api';
import { catalogueRoad } from '@/one/crowd';
import { engineRoadId, missionsFor, pickupsFor, type Mission } from './catalogue';

export type Phase = 'roam' | 'intro' | 'convoy' | 'collect' | 'prepare' | 'cross' | 'rewind' | 'pave' | 'passed';
export type MissionState = { phase: Phase; mission?: Mission; collected: number[]; choice?: string; prepared: boolean; paused: boolean; toast?: string; toastUntil: number; ghostT: number; pave: number; rewinds: number };
type Frame = { at: number; pos: Vec2; heading: number };
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
export const route = { marker: .12, convoy: .22, pickups: [.34, .48, .62], preparation: .75, bump: .86, finish: .92 };

/** Deterministic game rules; CityApi is the sole boundary to driving/scene code. */
export class MissionController {
  readonly missions: Mission[];
  private state: MissionState = { phase: 'roam', collected: [], prepared: false, paused: false, toastUntil: 0, ghostT: route.convoy, pave: 0, rewinds: 0 };
  private listeners = new Set<() => void>();
  private history: Frame[] = [];
  private disposers: (() => void)[] = [];
  private done: string[] = [];
  private selected = new Map<string, string>();
  private lastAt = 0;
  private phaseAt = 0;
  private driveTime = 0;
  private followedFor = 0;
  private generation = 0;
  private navigationTarget?: string;
  constructor(readonly api: CityApi, readonly personaId: string) { this.missions = missionsFor(personaId); }
  snapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private update(patch: Partial<MissionState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  point(t: number, mission = this.state.mission) { return this.api.pointOn(engineRoadId(mission?.roadId ?? this.missions[0]?.roadId ?? 'everyday'), t); }
  setDone(done: string[]) {
    this.done = done;
    for (const [road, id] of this.selected) {
      if (this.missions.some(m => m.id === id && done.includes(m.lesson.id))) this.selected.delete(road);
    }
    this.publishMarkers();
  }
  private publishMarkers() {
    const api = this.api as CityApi & { setMissionMarkers?: (markers: { id: string; label: string; at: Vec2; roadId: string; testDrive: boolean; passed: boolean }[]) => void };
    api.setMissionMarkers?.([...this.markers().map(m => ({ id: m.id, label: m.lesson.title, at: this.point(route.marker, m).pos, roadId: m.roadId, testDrive: m.testDrive, passed: this.done.includes(m.lesson.id) })), ...this.informationMarkers().map(m => ({ ...m, testDrive: false, passed: false }))]);
  }
  markers() { return [...new Set(this.missions.map(m => m.roadId))].map(id => this.missions.find(m => m.id === this.selected.get(id)) ?? this.missions.find(m => m.roadId === id && !this.done.includes(m.lesson.id)) ?? this.missions.find(m => m.roadId === id)!); }
  informationMarkers() {
    const live = new Set(this.missions.map(m => m.roadId));
    return this.api.districts().filter(d => !d.roadIds.some(id => live.has(id))).map(d => {
      const roadId = d.roadIds[0] ?? d.id;
      return { id: `district:${d.id}`, roadId, at: this.api.pointOn(roadId, route.marker).pos,
        label: catalogueRoad(roadId)?.care ? 'Support at your pace · Back to app for care' : 'This road is under review' };
    });
  }
  attach() {
    this.disposers = this.markers().map(m => this.api.onEnter({ id: `mission:${m.roadId}`, at: this.point(route.marker, m).pos, radius: 6 }, () => {
      if (this.state.phase === 'roam' && !this.state.paused && (!this.navigationTarget || this.missions.find(target => target.id === this.navigationTarget)?.roadId === m.roadId)) void this.start(this.markers().find(marker => marker.roadId === m.roadId)!);
    }));
    this.informationMarkers().forEach(marker => this.disposers.push(this.api.onEnter({ id: marker.id, at: marker.at, radius: 6 }, () => {
      if (this.state.phase === 'roam') this.update({ toast: marker.label, toastUntil: this.lastAt + 5000 });
    })));
    return () => { this.generation++; this.disposers.forEach(fn => fn()); this.disposers = []; this.api.freeze(false); this.timeScale(1); };
  }
  navigate(mission: Mission) { this.navigationTarget = mission.id; this.selected.set(mission.roadId, mission.id); this.publishMarkers(); this.api.setWaypoint(this.point(route.marker, mission).pos); this.update({ paused: false }); this.api.freeze(false); }
  async start(mission: Mission) {
    if (this.state.phase !== 'roam' || !this.missions.includes(mission)) return;
    const token = ++this.generation; this.navigationTarget = undefined;
    this.api.setAutopilot(null); this.api.freeze(true); this.history = []; this.driveTime = 0; this.followedFor = 0;
    this.update({ phase: 'intro', mission, collected: [], choice: undefined, prepared: false, ghostT: route.convoy, pave: 0, rewinds: 0, toast: undefined });
    try { await this.api.cinematic({ target: this.point(route.bump, mission).pos, from: this.point(route.marker, mission).pos, ms: 2600 }); }
    finally { if (token === this.generation) { this.api.freeze(this.state.paused); this.api.setWaypoint(this.point(route.convoy).pos); this.update({ phase: 'convoy' }); } }
  }
  pause() { const paused = !this.state.paused; this.update({ paused }); this.api.freeze(paused || ['intro', 'prepare', 'rewind', 'passed'].includes(this.state.phase)); }
  choose(id: string) {
    if (this.state.phase !== 'prepare' || this.state.paused || this.state.collected.length !== 3) return;
    const choice = this.state.mission!.lesson.apply.choices.find(c => c.id === id);
    if (!choice) return;
    this.update({ phase: 'cross', choice: id, prepared: !!choice.correct, toast: 'Preparation packed. Drive over the bump.', toastUntil: this.lastAt + 2800 });
    this.api.setWaypoint(this.point(route.bump).pos); this.api.freeze(false);
  }
  driveForMe() {
    const s = this.state;
    if (!['convoy', 'collect', 'cross', 'pave'].includes(s.phase) || s.paused) return;
    // Continue through the meeting point: stopping there can end motion before the follow timer completes.
    const target = s.phase === 'convoy' ? route.pickups[0] : s.phase === 'cross' || s.phase === 'pave' ? route.finish
      : route.pickups.find((_, i) => !s.collected.includes(i)) ?? route.preparation;
    this.api.setAutopilot(this.point(target).pos);
  }
  rewind() {
    if (this.state.phase !== 'rewind') return;
    const frame = this.history.find(f => f.at >= this.driveTime - 5000) ?? this.history[0];
    const fallback = this.point(route.preparation - .04);
    this.api.teleport(frame?.pos ?? fallback.pos, frame?.heading ?? fallback.heading);
    this.api.setAutopilot(null); this.api.freeze(false); this.timeScale(1);
    this.update({ phase: 'collect', choice: undefined, prepared: false, rewinds: this.state.rewinds + 1, toast: 'Hindsight kept. Try another preparation.', toastUntil: this.lastAt + 3000 });
    this.api.setWaypoint(this.point(route.preparation).pos);
  }
  roam() { this.navigationTarget = undefined; this.generation++; this.api.freeze(false); this.api.setAutopilot(null); this.api.setWaypoint(null); this.timeScale(1); this.update({ phase: 'roam', mission: undefined, collected: [], paused: false, toast: undefined, pave: 0 }); }
  private reducedMotion() { return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }
  private timeScale(scale: number) { (this.api as CityApi & { setTimeScale?: (n: number) => void }).setTimeScale?.(scale); }
  tick(at: number, mapOpen = false) {
    const dt = this.lastAt ? Math.min(.1, (at - this.lastAt) / 1000) : 0; this.lastAt = at;
    const s = this.state;
    if (s.paused || mapOpen) { this.phaseAt += dt * 1000; return; }
    if (s.toast && at > s.toastUntil) this.update({ toast: undefined });
    if (!s.mission || ['roam', 'intro', 'prepare', 'rewind', 'passed'].includes(s.phase)) return;
    const car = this.api.car();
    if (s.phase !== 'pave') { this.driveTime += dt * 1000; this.history.push({ at: this.driveTime, pos: { ...car.pos }, heading: car.heading }); this.history = this.history.filter(f => f.at >= this.driveTime - 6000); }
    if (s.phase === 'convoy') {
      const gap = distance(car.pos, this.point(s.ghostT).pos);
      if (gap < 24) {
        if (Math.abs(car.speed) > 1) this.followedFor += dt;
        this.update({ ghostT: Math.min(route.pickups[0], s.ghostT + dt * .055) });
      }
      if (this.followedFor >= .65 && gap < 24) {
        this.update({ phase: 'collect' }); this.api.setWaypoint(this.point(route.pickups[0]).pos);
      }
    }
    if (s.phase === 'collect') {
      const index = route.pickups.findIndex((t, i) => !s.collected.includes(i) && distance(car.pos, this.point(t).pos) < 7);
      if (index >= 0) {
        const collected = [...s.collected, index]; const p = pickupsFor(s.mission.lesson)[index];
        this.update({ collected, toast: `${p.label}${p.share === undefined ? '' : ` · ${p.share}% avoided buffer strain`}${p.by ? ` ${p.by}` : ''}`, toastUntil: at + 4800 });
        this.api.setWaypoint(this.point(route.pickups.find((_, i) => !collected.includes(i)) ?? route.preparation).pos);
      }
      if (s.collected.length === 3 && distance(car.pos, this.point(route.preparation).pos) < 8) { this.api.freeze(true); this.api.setAutopilot(null); this.update({ phase: 'prepare', toast: undefined }); }
    }
    if (s.phase === 'cross' && distance(car.pos, this.point(route.bump).pos) < 7) {
      this.phaseAt = at;
      if (s.prepared) { (this.api as CityApi & { boost?: (ms: number) => void }).boost?.(900); this.timeScale(this.reducedMotion() ? 1 : .25); this.api.setWaypoint(this.point(route.finish).pos); this.update({ phase: 'pave', pave: 0, toast: undefined });
        if (!this.reducedMotion()) void this.api.cinematic({ target: this.point(route.bump).pos, from: { x: this.point(route.bump).pos.x + 14, z: this.point(route.bump).pos.z - 10 }, ms: 1800 }); }
      else { (this.api as CityApi & { jolt?: () => void }).jolt?.(); this.api.freeze(true); this.api.setAutopilot(null); this.update({ phase: 'rewind', toast: undefined }); }
    }
    if (s.phase === 'pave') {
      const pave = this.reducedMotion() ? 1 : Math.min(1, (at - this.phaseAt) / 1800); this.update({ pave });
      const bump = this.point(route.bump);
      const crossed = (car.pos.x - bump.pos.x) * Math.sin(bump.heading) + (car.pos.z - bump.pos.z) * Math.cos(bump.heading) >= 2;
      if (pave === 1 && crossed) { this.timeScale(1); this.api.freeze(true); this.api.setAutopilot(null); this.update({ phase: 'passed' }); }
    }
  }
}
