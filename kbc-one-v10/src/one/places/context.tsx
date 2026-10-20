'use client';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PersonRoad } from '../people';
import { buildPlaces, createDemoState, moveToGoal, type PlaceId } from './model';
function useSession(person: PersonRoad) {
  const [demo, setDemo] = useState(() => createDemoState(person));
  const [activeId, setActiveId] = useState<PlaceId | null>(null);
  const places = useMemo(() => buildPlaces(person, demo), [person, demo]);
  return { places, activeId, activePlace: places.find(p => p.id === activeId), open: setActiveId,
    move: (accountId: string, goalId: string, amount: number) => {
      const next = moveToGoal(demo, accountId, goalId, amount);
      if (!next.error) setDemo(next.state);
      return next.error;
    },
  };
}
export const PlacesContext = createContext<ReturnType<typeof useSession> | null>(null);
/** Key the provider by person.key to reset local demo state on persona changes. */
export function PlacesProvider({ person, children }: { person: PersonRoad; children: ReactNode }) {
  const session = useSession(person);
  return <PlacesContext.Provider value={session}>{children}</PlacesContext.Provider>;
}
export const usePlaces = () => useContext(PlacesContext);
