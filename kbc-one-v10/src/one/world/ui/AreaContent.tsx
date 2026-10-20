"use client";

import { PlaceView, type Place, type PlaceLesson } from "@/one/places";
import { useMemo } from "react";
import { missionsFor } from "@/hindsight/game/city10/missions/catalogue";
import type { Lesson } from "@/one/learning";
import type { WorldArea, WorldStorm } from "../types";
import { UnlockContent } from "./UnlockContent";
import type { UnlockGoal, UnlockKey } from "../types";
import { Icon } from "./Icon";
import { humanDates, stormStory } from "./presentation";
import styles from "./world.module.css";

export function Stage({ stage }: { stage: number }) {
  return <div className={styles.stage}><span className={styles.stageBars} aria-hidden="true">{[1, 2, 3, 4].map(n => <i key={n} data-lit={n <= stage} />)}</span><span>Stage {stage} of 4</span></div>;
}

export function QuestPath({ quests, done, onLesson, onDrive, personaId }: {
  quests: Lesson[]; done: string[]; onLesson: (lesson: Lesson) => void; onDrive: (id: string) => void; personaId: string;
}) {
  const drivable = useMemo(() => new Set(missionsFor(personaId).filter(m => !m.testDrive).map(m => m.lesson.id)), [personaId]);
  return <ol className={styles.quests}>{quests.map((quest, index) => <li className={styles.quest} key={quest.id} data-done={done.includes(quest.id)}>
    <span className={styles.questNumber}>{done.includes(quest.id) ? <Icon name="check" size={16} /> : index + 1}</span>
    <div className={styles.questBody}><h4>{quest.title}</h4><p>{done.includes(quest.id) ? "Blueprint earned · replay any time" : quest.reward.label}</p>
      <div className={styles.questActions}><button type="button" className={done.includes(quest.id) ? styles.button : styles.primary} onClick={() => onLesson(quest)}><Icon name="book" size={15} />{done.includes(quest.id) ? "Revisit lesson" : "Start lesson"}</button>
        {drivable.has(quest.id) && <button type="button" className={styles.button} onClick={() => onDrive(quest.id)}><Icon name="car" size={15} />Drive this road</button>}</div>
    </div>
  </li>)}</ol>;
}

export function StormSummary({ storm, onOpen }: { storm: WorldStorm; onOpen: () => void }) {
  return <section className={styles.stormCard} data-prepared={storm.prepared}>
    <header><Icon name={storm.prepared ? "shield" : "storm"} size={27} /><h3>{storm.prepared ? "Your shield is ready" : storm.title}</h3></header>
    <p className={styles.stormDate}>{humanDates(storm.dateLabel)}</p>
    {stormStory(storm) && <p>{stormStory(storm)}</p>}
    <button className={styles.textAction} type="button" onClick={onOpen}>{storm.prepared ? "View preparation" : storm.status === "repair" ? "Open repair quest" : "Prepare this area"}<Icon name="arrow" size={16} /></button>
  </section>;
}

export function AreaContent({ area, personaId, done, onLesson, onDrive, onStorm, onAhead, onSignposts, onKids, onPlain, onUnlock, onExplore, place, onMoveToGoal, onClose, calm = false }: {
  calm?: boolean; place?: Place; onMoveToGoal: (accountId: string, goalId: string, amount: number) => string | undefined; onClose: () => void;
  area: WorldArea; personaId: string; done: string[];
  onLesson: (lesson: Lesson) => void; onDrive: (id: string) => void; onStorm: (storm: WorldStorm) => void;
  onAhead: () => void; onSignposts: () => void; onKids?: () => void; onPlain: () => void;
  onUnlock: (key: UnlockKey, goal?: UnlockGoal) => void; onExplore: () => void;
}) {
  if (area.care) return <><p className={styles.muted}>Some moments need space and a person who listens.</p><p className={styles.notice}>The care garden is optional. It has no quests, scores or rewards.</p><button type="button" className={styles.primary} onClick={onPlain}>Continue in plain view</button></>;
  if (area.locked) {
    const life = area.unlock.keys.find(key => key.key === "life-event");
    const goal = area.unlock.keys.find(key => key.key === "goal");
    const holding = area.unlock.keys.find(key => key.key === "existing-product");
    return <UnlockContent title={area.title} hint={area.unlock.hint} lifeEvent={life?.hint ?? "Tell us about your plans"} goal={goal?.hint ?? "Set your own goal"} holding={holding?.hint ?? "An existing account opens its area"}
      onLifeEvent={life?.available ? () => onUnlock("life-event") : undefined}
      onGoal={goal?.available ? amount => onUnlock("goal", { label: `${area.title} goal`, target: amount }) : undefined}
      onExplore={onExplore} />;
  }
  const placeLesson = (selected: PlaceLesson) => {
    const exact = area.quests.find(quest => quest.id === selected.missionId);
    const quest = exact ?? area.quests.find(quest => !done.includes(quest.id)) ?? area.quests[0];
    if (quest) onLesson(quest);
  };
  return <>
    <div className={styles.areaIntro}><p className={styles.muted}>{area.subtitle}</p>{!calm && <Stage stage={area.stage} />}{area.guide && <p className={styles.stage}><Icon name="lantern" size={16} />Guide · Your signpost helped someone</p>}<p className={styles.small}>Built through learning, your own goals and preparation.</p></div>
    <section className={styles.financeSummary} aria-label="Your demo numbers"><p className={styles.small}>{area.finance.label}</p><p>{humanDates(area.finance.summary)}</p></section>
    {place && <PlaceView place={place} embedded closeLabel="Back to world" onClose={onClose} lessonLabel={calm ? "Read this lesson" : "Learn in your world"} onMoveToGoal={onMoveToGoal} onLesson={area.quests.length ? placeLesson : undefined} />}
    {!place && area.goals.map(goal => <div key={goal.id} className={styles.goal}><Icon name="savings" /><span><strong>{goal.label}</strong><span className={styles.progress} role="progressbar" aria-label={goal.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={goal.percent}><span style={{ width: `${goal.percent}%` }} /></span></span><b>{goal.percent}%</b></div>)}
    {area.storms[0] && <StormSummary storm={area.storms.find(s => !s.prepared) ?? area.storms[0]} onOpen={() => onStorm(area.storms.find(s => !s.prepared) ?? area.storms[0])} />}
    <div className={styles.questHeading}><h3>{calm ? "Lessons for this area" : "Hindsight blueprints"}</h3><small>{area.completed} / {area.quests.length} learned</small></div>
    <QuestPath quests={area.quests} personaId={personaId} done={done} onLesson={onLesson} onDrive={onDrive} />
    {area.educationOnly && <p className={styles.notice}>Your buildings reflect what you learn. Buying or trading never earns progress.</p>}
    <hr className={styles.divider} />
    {area.id !== "kids" && <><button type="button" className={styles.button} onClick={onAhead}><Icon name="ahead" />Visit a world ahead<Icon name="arrow" size={16} /></button>
    <button type="button" className={styles.button} onClick={onSignposts}><Icon name="signpost" />Signposts & lanterns{area.lanterns > 0 && <span>{area.lanterns}</span>}</button></>}
    {onKids && <button type="button" className={styles.button} onClick={onKids}><Icon name="kids" />Build a kids mini-world together</button>}
  </>;
}
