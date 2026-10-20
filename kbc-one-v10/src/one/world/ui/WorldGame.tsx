"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { type Lesson } from "@/one/learning";
import { WorldScene } from "@/hindsight/game/world11";
import { PEOPLE } from "@/one/people";
import { buildPlaces, createDemoState, moveToGoal } from "@/one/places";
import { placeForArea, withPlaceProgress } from "./placeProgress";
import { catalogueRoad } from "@/one/crowd";
import type { Note8 } from "@/one/notes8/types";
import { NotesFeed } from "./NotesFeed";
import { useWorldProgress, worldFor, worldAhead, worldLessonById, exploreArea } from "..";
import type { AreaId, WorldStorm, UnlockKey, UnlockGoal } from "../types";
import { Icon } from "./Icon";
import { Panel } from "./Panel";
import { WorldLesson } from "./WorldLesson";
import { CareContent } from "./CareContent";
import { AreaContent } from "./AreaContent";
import { StormContent } from "./StormContent";
import { ExploreContent } from "./ExploreContent";
import { AheadContent } from "./AheadContent";
import { KidsContent } from "./KidsContent";
import { SignpostContent } from "./SignpostContent";
import type { WorldGameProps } from "./types";
import styles from "./world.module.css";

type View = { kind: "area" } | { kind: "explore" } | { kind: "lesson"; lesson: Lesson; back: "area" | "storm" | "kids"; stormId?: string } | { kind: "storm"; stormId: string } | { kind: "ahead" } | { kind: "signposts" } | { kind: "kids" };
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function WorldGame(props: WorldGameProps) { return <WorldSession key={props.personaId} {...props} />; }
function WorldSession({ personaId, onExit, onDrive, onPlain }: WorldGameProps) {
  const progress = useWorldProgress(personaId);
  const calm = personaId === "margaret";
  const [careOptIn, setCareOptIn] = useState(false);
  const person = PEOPLE[personaId] ?? PEOPLE.tom;
  const [placeDemo, setPlaceDemo] = useState(() => createDemoState(person));
  const places = useMemo(() => buildPlaces(person, placeDemo), [person, placeDemo]);
  const move = (accountId: string, goalId: string, amount: number) => {
    const result = moveToGoal(placeDemo, accountId, goalId, amount);
    if (!result.error) setPlaceDemo(result.state);
    return result.error;
  };
  const [notesByRoad, setNotesByRoad] = useState<Record<string, Note8[]>>({});
  const updateNotes = useCallback((roadId: string, notes: Note8[]) => {
    setNotesByRoad(previous => JSON.stringify(previous[roadId]) === JSON.stringify(notes) ? previous : { ...previous, [roadId]: notes });
  }, []);
  const notes = useMemo(() => [...new Map(Object.values(notesByRoad).flat().map(note => [note.id, note])).values()], [notesByRoad]);
  const world = useMemo(() => withPlaceProgress(worldFor(personaId, progress, { notes, careOptIn }), places), [personaId, progress.done, progress.saved, progress.unlocks, notes, places, careOptIn]);
  const publicRoads = [...new Set(world.areas.filter(a => a.active && a.id !== "kids" && !a.care).flatMap(a => a.quests.map(q => q.roadId)).filter(id => !!catalogueRoad(id)))];
  const [areaId, setAreaId] = useState<AreaId | null>(null);
  const [view, setView] = useState<View>({ kind: "area" });
  const [unlockNotice, setUnlockNotice] = useState("");
  const returnTarget = useRef<HTMLElement | null>(null);
  const area = world.areas.find(a => a.id === areaId);
  const panelOpen = !!area;
  const storm = view.kind === "storm" || view.kind === "lesson" && view.stormId ? world.storms.find(s => s.id === view.stormId) : undefined;
  const alert = calm ? undefined : world.storms.find(s => !s.prepared && s.status !== "preview") ?? world.storms.find(s => !s.prepared) ?? world.storms[0];
  const ahead = useMemo(() => areaId && view.kind === "ahead" ? worldAhead(personaId, areaId) : null, [personaId, areaId, view.kind]);
  const preview = useMemo(() => areaId && view.kind === "explore" ? exploreArea(personaId, areaId) : null, [personaId, areaId, view.kind]);
  const goals = world.areas.flatMap(a => a.goals.map(g => ({ ...g, areaId: a.id }))).filter((goal, i, all) => all.findIndex(g => g.id === goal.id) === i);
  const closePanel = useCallback(() => { setAreaId(null); setView({ kind: "area" }); requestAnimationFrame(() => returnTarget.current?.focus({ preventScroll: true })); }, []);
  const back = useCallback(() => {

    if (view.kind === "lesson" && view.back === "storm" && view.stormId) setView({ kind: "storm", stormId: view.stormId });
    else if (view.kind === "lesson" && view.back === "kids") setView({ kind: "kids" });
    else if (view.kind !== "area") setView({ kind: "area" });
    else closePanel();
  }, [view, closePanel]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && panelOpen) { event.preventDefault(); event.stopImmediatePropagation(); back(); } };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [back, panelOpen]);
  const openArea = (id: string) => {
    const next = world.areas.find(a => a.id === id);
    if (!next) return;
    returnTarget.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAreaId(next.id); setView({ kind: "area" });
  };
  const openStorm = (next: WorldStorm) => { openArea(next.areaId); setView({ kind: "storm", stormId: next.id }); };
  const openLesson = (lesson: Lesson, origin: "area" | "storm" | "kids" = "area") => { setView({ kind: "lesson", lesson, back: origin, stormId: origin === "storm" ? storm?.id : undefined }); };
  const unlock = (key: UnlockKey, goal?: UnlockGoal) => {
    if (!area) return;
    progress.unlockArea(area.id, key, goal);
    const crowd = exploreArea(personaId, area.id)?.crowd.find(item => item.denominator.shown && item.denominator.value !== null)?.denominator;
    setUnlockNotice(`${area.title} is open.${crowd?.shown && crowd.value !== null ? ` ${crowd.value.toLocaleString("nl-BE")} people walked this road before you.` : " Make it yours."}`);
    setView({ kind: "area" });
  };
  useEffect(() => {
    if (!unlockNotice) return;
    const timeout = window.setTimeout(() => setUnlockNotice(""), 6500);
    return () => window.clearTimeout(timeout);
  }, [unlockNotice]);
  const openKids = () => { if (!world.kids) return; openArea("kids"); setView({ kind: "kids" }); };
  const fallback = <div className={styles.fallback}><h2>Your world, in plain view</h2><p>{world.mode === "care" ? "Choose what you would like to see, at your own pace." : "Your areas and lessons are also available without the 3D view."}</p><button type="button" className={styles.primary} onClick={onPlain}>Open plain view</button><button type="button" className={styles.button} onClick={onExit}>Back to app</button></div>;
  if (!world.playable) return <section className={styles.game} aria-label="Your world">{fallback}<footer className={styles.footer}>{world.disclosure}</footer></section>;
  const title = view.kind === "lesson" ? view.lesson.title : view.kind === "explore" ? `Explore ${area?.title ?? "this area"}` : view.kind === "storm" ? storm?.title ?? "Prepare your area" : view.kind === "ahead" ? "A world 2 years ahead" : view.kind === "kids" ? world.kids?.title ?? "Kids mini-world" : view.kind === "signposts" ? "Signposts & lanterns" : area?.title ?? "Your world";
  return <section className={`${styles.game} ${panelOpen ? styles.withPanel : ""}`} aria-label={world.name} data-testid="world-game" data-persona={personaId} data-visiting={!!ahead} data-lesson-open={view.kind === "lesson"} data-calm={calm} data-care-open={area?.care || undefined}>
    {publicRoads.map(roadId => <NotesFeed key={roadId} roadId={roadId} personaId={personaId} onNotes={updateNotes} />)}
    <div className={styles.scene}><SceneBoundary fallback={fallback}><WorldScene calm={calm} storms={calm || area?.care ? [] : undefined} world={world} onArea={openArea} focus={areaId} ahead={ahead} onOverview={closePanel} /></SceneBoundary></div>
    <header className={styles.hud}><div className={styles.identity}><span className={styles.mark}><Icon name="world" size={25} /></span><div><p>KBC One · {calm ? "Calm world" : "Your world"}</p><h1>{world.name}</h1><div className={styles.worldStats}><span>{world.areas.filter(a => a.active).length} areas</span><span>{progress.done.length} {progress.done.length === 1 ? "blueprint" : "blueprints"}</span><span><Icon name="lantern" size={12} />{world.lanterns} {world.lanterns === 1 ? "lantern" : "lanterns"}</span></div></div></div><nav className={styles.toolbar} aria-label="World controls"><button type="button" className={styles.button} onClick={() => { progress.reset(); setPlaceDemo(createDemoState(person)); setCareOptIn(false); setUnlockNotice(""); closePanel(); }} aria-label="Reset world demo"><Icon name="ahead" size={17} /><span className={styles.plainLabel}>Reset demo</span></button><button type="button" className={styles.button} onClick={onPlain} aria-label="Open plain view"><Icon name="book" size={17} /><span className={styles.plainLabel}>Plain view</span></button><button type="button" className={styles.button} onClick={onExit}><Icon name="close" size={17} /><span>Exit</span></button></nav></header>
    <div className={styles.goals} aria-label="Your goals">{goals.slice(0, 3).map(goal => <button type="button" className={styles.goal} key={goal.id} onClick={() => openArea(goal.areaId)}><Icon name="savings" size={19} /><span><strong>{goal.label}</strong><span className={styles.progress} aria-hidden="true"><span style={{ width: `${goal.percent}%` }} /></span><small>Your own goal</small></span><b>{goal.percent}%</b></button>)}</div>
    {alert && <button type="button" className={styles.stormChip} data-prepared={alert.prepared} onClick={() => openStorm(alert)} aria-label={`${alert.prepared ? "Prepared" : "Prepare"}: ${alert.title}`}><Icon name={alert.prepared ? "shield" : "storm"} size={27} /><span><strong>{alert.prepared ? "Your shield is ready" : alert.title}</strong><small>{alert.daysAway !== null ? alert.daysAway >= 0 ? `In ${alert.daysAway} days` : "A repair quest is ready" : "Explore · no personal date"} · {world.areas.find(a => a.id === alert.areaId)?.title}</small></span></button>}
    {!panelOpen && alert && <section className={styles.nextCard} data-prepared={alert.prepared}><span className={styles.nextLabel}>{alert.prepared ? "Ready for what comes next" : "Next for your world"}</span><h2>{alert.prepared ? "A useful step. A stronger world." : `Build a shield for ${world.areas.find(a => a.id === alert.areaId)?.title}`}</h2><p>{alert.prepared ? "Your blueprint and preparation step are saved. There is always another area to explore." : "Learn from the people ahead. One blueprint and one saved step prepare this area."}</p><button type="button" className={styles.primary} onClick={() => openStorm(alert)}><Icon name={alert.prepared ? "shield" : "book"} size={18} />{alert.prepared ? "See my preparation" : "Prepare this area"}</button></section>}
    <div className={styles.orientation} data-overview={!panelOpen}><h2>{area ? area.title : "A world that grows with you"}</h2><p>{area ? area.locked ? "Explore at your own pace." : `${area.completed} ${area.completed === 1 ? "blueprint" : "blueprints"} learned. Every useful step builds something.` : "Choose an area. Learn from those who went before."}</p></div>
    <nav className={styles.areaRail} aria-label="World areas">{world.areas.map(item => <button type="button" key={item.id} className={styles.areaButton} data-locked={item.locked} aria-pressed={areaId === item.id} onClick={() => openArea(item.id)} aria-label={`${item.title}${item.locked ? " · unlock or explore" : " · open area"}`} title={item.locked ? item.unlock.hint : item.finance.summary}><span><Icon name={item.id} size={21} />{item.locked ? <Icon name="key" size={14} /> : !item.care && <small>{item.stage}/4</small>}</span><strong>{item.title}</strong>{item.locked && <small className={styles.unlockHint}>{item.unlock.hint}</small>}</button>)}</nav>
    {unlockNotice && <div className={styles.unlockNotice} role="status"><Icon name="key" />{unlockNotice}</div>}
    {ahead?.available && <div className={styles.visitBanner}>Visiting a shared world · your world is unchanged</div>}
    {area && <Panel wide={view.kind === "lesson"} title={title} subtitle={view.kind === "area" ? area.locked ? "Explore an area" : "Your world" : area.title} onClose={closePanel} onBack={view.kind !== "area" ? back : undefined}>
      {view.kind === "area" && !area.care && <AreaContent key={area.id} calm={calm} place={placeForArea(places, area.id)} onMoveToGoal={move} onClose={closePanel} area={area} personaId={personaId} done={progress.done} onLesson={openLesson} onDrive={onDrive} onStorm={openStorm} onAhead={() => setView({ kind: "ahead" })} onSignposts={() => setView({ kind: "signposts" })} onKids={world.kids && ["kids", "family"].includes(area.id) ? openKids : undefined} onPlain={onPlain} onUnlock={unlock} onExplore={() => setView({ kind: "explore" })} />}
      {view.kind === "area" && area.care && <CareContent personaId={personaId} accepted={careOptIn} onAccept={() => setCareOptIn(true)} onClose={closePanel} />}
      {view.kind === "explore" && preview && <ExploreContent preview={preview} onReturn={() => setView({ kind: "area" })} />}
      {view.kind === "lesson" && <WorldLesson plain={calm} key={view.lesson.id} lesson={view.lesson} onReturn={back} returnLabel={view.back === "storm" ? "See my preparation" : view.back === "kids" ? "See our mini-world" : "See my area grow"} />}
      {view.kind === "storm" && storm && <StormContent storm={storm} lesson={worldLessonById(storm.lessonId)} done={progress.done} saved={progress.saved} onLesson={lesson => openLesson(lesson, "storm")} onPrepare={() => progress.prepareStorm(storm.id)} onReturn={() => setView({ kind: "area" })} />}
      {view.kind === "ahead" && ahead && <AheadContent ahead={ahead} onReturn={() => setView({ kind: "area" })} />}
      {view.kind === "kids" && world.kids && <KidsContent kids={world.kids} done={progress.done} onLesson={lesson => openLesson(lesson, "kids")} />}
      {view.kind === "signposts" && <SignpostContent area={area} personaId={personaId} done={progress.done} />}
    </Panel>}
    <footer className={styles.footer}>{world.disclosure}</footer>
  </section>;
}
