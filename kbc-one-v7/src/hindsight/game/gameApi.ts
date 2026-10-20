import type { MapCrossing, MapStop, MapTrack, RoadMap } from '../../one/roadmap/types';
import type { Input } from './driving';
export type GameEvent = { seq: number; type: 'gateReached' | 'stepAdded' | 'forkReached' | 'minorPassed'; trackId: string; stopId?: string; crossingId?: string; actionId?: string };
export interface CityGameApi {
  roadmap: RoadMap;
  currentTrackId: string | null;
  currentTrack: MapTrack | null;
  nextGate: MapStop | null;
  currentGate: MapStop | null;
  currentFork: MapCrossing | null;
  readyByTrack: Record<string, number>;
  events: GameEvent[];
  previewBranch: {crossingId: string; branchId: string} | null;
  setInput: (input: Partial<Input>) => void;
  releaseInput: () => void;
  goToStop: (id: string) => void;
  goToTrack: (id: string) => void;
  chooseBranch: (crossingId: string, branchId: string) => void;
  prepare: (stopId: string, actionId: string) => boolean;
  dismissGate: () => void;
}
