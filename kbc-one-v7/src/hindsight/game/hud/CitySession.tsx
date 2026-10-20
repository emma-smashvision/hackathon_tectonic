"use client";

import { createContext, useContext } from "react";
export type RoadProgress = { id: string; title: string; ready: number | null };
export const CitySession = createContext<{
  updateRoads: (roads: RoadProgress[]) => void;
  requestExit: () => void;
  exiting: boolean;
} | null>(null);
export const useCitySession = () => useContext(CitySession);
