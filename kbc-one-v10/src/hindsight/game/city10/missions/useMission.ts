'use client';
import { useContext, useSyncExternalStore } from 'react';
import { CityApiContext, type CityApi } from '../api';
import { MissionController } from './controller';
const sessions = new WeakMap<CityApi, Map<string, MissionController>>();
export function useMission(personaId: string) {
  const api = useContext(CityApiContext);
  if (!api) throw new Error('Missions must be inside CityApiContext');
  if (!sessions.has(api)) sessions.set(api, new Map());
  const byPerson = sessions.get(api)!;
  if (!byPerson.has(personaId)) byPerson.set(personaId, new MissionController(api, personaId));
  const controller = byPerson.get(personaId)!;
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot);
  return { controller, state, api };
}
