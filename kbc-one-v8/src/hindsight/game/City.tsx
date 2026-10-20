"use client";
// Compatibility for the legacy presenter stage. The city itself was removed in v8.
import { useStore } from "../components/store";
import { DriveThisRoad } from "./DriveThisRoad";
import { PEOPLE } from "../../one/people";
export function City() {
  const s = useStore();
  const person = PEOPLE[s.person?.key ?? "sofie"];
  return <DriveThisRoad person={person} roadId={s.road.id} onExit={()=>s.setView("phone")}/>;
}
