import type { Place } from "@/one/places";
import type { AreaId, World } from "../types";

export function placeForArea(places: Place[], areaId: AreaId): Place | undefined {
  return places.find(place => place.id === (areaId === "work" ? "business" : areaId === "family" ? "kids" : areaId));
}

/** Local goal moves also fill the district. Source PEOPLE and persisted lessons stay unchanged. */
export function withPlaceProgress(world: World, places: Place[]): World {
  return { ...world, areas: world.areas.map(area => {
    const place = placeForArea(places, area.id);
    if (!place?.goals.length) return area;
    const goals = area.finance.goals.map(goal => {
      const live = place.goals.find(item => goal.id === item.id || goal.id === `${world.personaId}:${item.id}`);
      return live ? { ...goal, saved: live.saved, percent: Math.round(live.percent) } : goal;
    });
    if (goals.every((goal, index) => goal.saved === area.finance.goals[index].saved)) return area;
    const percent = goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.percent, 0) / goals.length) : area.finance.percent;
    const personalGoals = area.goals.map(goal => goals.find(item => item.id === goal.id) ?? goal);
    const ownGoalStage = Math.min(4, Math.floor((percent ?? 0) / 100 * 4)) as 0 | 1 | 2 | 3 | 4;
    const usesGoals = !area.finance.mortgage && !area.finance.pension;
    return { ...area, goals: personalGoals, goalPercent: personalGoals.length ? percent : area.goalPercent,
      stage: usesGoals && !area.locked ? Math.max(area.stage, ownGoalStage) as typeof area.stage : area.stage,
      finance: { ...area.finance, goals, ...(usesGoals ? { percent, stage: ownGoalStage, summary: place.label } : {}) } };
  }) };
}
