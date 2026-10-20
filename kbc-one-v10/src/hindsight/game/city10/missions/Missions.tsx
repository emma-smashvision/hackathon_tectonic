'use client';
import { useEffect, useRef } from 'react';
import { lessonsFor, useVillageProgress } from '@/one/learning';
import { catalogue } from '@/one/crowd';
import { LessonCinema, LessonReward, formatLessonDate } from '@/one/lessonfx';
import { useMission } from './useMission';
import styles from './missions.module.css';

export type MissionsProps = { personaId: string; onExit: () => void; onReset?: () => void; onSound?: (kind: 'pickup' | 'pave') => void; focusLessonId?: string };
export function Missions(props: MissionsProps) {
  if (!['tom', 'karim', 'sofie', 'lina'].includes(props.personaId)) return null;
  return <MissionHud key={props.personaId} {...props} />;
}
function MissionHud({ personaId, onExit, onReset, onSound, focusLessonId }: MissionsProps) {
  const { controller, state: s } = useMission(personaId);
  const progress = useVillageProgress(personaId);
  const lesson = s.mission?.lesson;
  const modal = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const soundCount = useRef(0);
  const soundPhase = useRef(s.phase);
  useEffect(() => controller.attach(), [controller]);
  useEffect(() => {
    const target = controller.missions.find(m => focusLessonId && [m.lesson.id, m.lesson.stopId, m.roadId].includes(focusLessonId))
      ?? controller.missions.find(m => !m.testDrive && !progress.done.includes(m.lesson.id));
    if (target) controller.navigate(target);
    // Read current progress once on entry; completing a mission must leave free roam intact.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, focusLessonId]);
  useEffect(() => { controller.setDone(progress.done); }, [controller, progress.done]);
  useEffect(() => {
    let frame = 0; const loop = (at: number) => { controller.tick(at, !!document.querySelector('.c10-map, [data-city-map-open="true"]')); frame = requestAnimationFrame(loop); };
    frame = requestAnimationFrame(loop); return () => cancelAnimationFrame(frame);
  }, [controller]);
  useEffect(() => {
    if (s.phase === 'passed' && lesson && !s.mission?.testDrive) progress.complete(lesson.id);
  }, [s.phase, lesson, s.mission?.testDrive, progress.complete]);
  useEffect(() => {
    if (s.collected.length > soundCount.current) { onSound?.('pickup'); window.dispatchEvent(new CustomEvent('city10:sound', { detail: 'pickup' })); }
    if (s.phase === 'pave' && soundPhase.current !== 'pave') { onSound?.('pave'); window.dispatchEvent(new CustomEvent('city10:sound', { detail: 'pave' })); }
    soundCount.current = s.collected.length; soundPhase.current = s.phase;
  }, [s.collected.length, s.phase, onSound]);
  const isModal = s.paused || ['prepare', 'rewind', 'passed'].includes(s.phase);
  useEffect(() => {
    if (!isModal) return;
    previousFocus.current = document.activeElement as HTMLElement;
    modal.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { previousFocus.current?.focus(); };
  }, [isModal, s.phase, s.paused]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // The full map owns its keys; Esc closes it before opening mission pause.
      if (document.querySelector('.c10-map, [data-city-map-open="true"]')) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); controller.pause(); return; }
      if (isModal && event.key === 'Tab') {
        const buttons = [...(modal.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary, [tabindex="0"]') ?? [])];
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
      if (isModal && (event.target as HTMLElement)?.closest('[data-lessonfx-step]')) return;
      if (isModal && ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'm', 'M'].includes(event.key)) event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true);
  }, [controller, isModal]);
  const objective = s.phase === 'roam' ? 'Find a beam. Make it your next road.' : s.phase === 'convoy' ? 'Follow the earlier movers' : s.phase === 'collect' ? s.collected.length === 3 ? 'Meet the bump. Choose your preparation.' : `Collect hindsight · ${s.collected.length}/3` : s.phase === 'cross' ? 'Drive over the bump' : s.phase === 'pave' ? 'Hindsight makes a smoother road.' : '';
  const next = controller.missions.find(m => !m.testDrive && !progress.done.includes(m.lesson.id)) ?? controller.missions.find(m => !m.testDrive);
  // v10-shell: stable frame hooks for the compact landscape HUD.
  return <div className={`${styles.hud} ${s.phase === 'rewind' ? styles.jolt : ''}`} data-mission-phase={s.phase} data-mission-id={lesson?.id} data-pickups={s.collected.length}>
    {!s.paused && s.phase !== 'intro' && !isModal && <section data-city-hud="objective" className={styles.objective} aria-live="polite">
      <span className={styles.eyebrow}>{s.mission ? `${s.mission.testDrive ? 'TEST DRIVE' : 'YOUR MISSION'} / ${s.mission.name}` : 'FREE ROAM'}</span>
      <h2>{objective}</h2>
      {s.phase === 'roam' && next && <button onClick={() => controller.navigate(next)}>GPS · {next.lesson.title}</button>}
      {s.phase === 'collect' && <div className={styles.dots} aria-label={`${s.collected.length} of 3 hindsight pickups`}>{[0, 1, 2].map(i => <i key={i} data-collected={s.collected.includes(i)} />)}</div>}
    </section>}
    {!s.paused && <button className={styles.pauseButton} onClick={() => controller.pause()} aria-label="Pause missions">Ⅱ <span>Esc</span></button>}
    {s.phase === 'intro' && !s.paused && lesson && <div className={styles.cinematic} role="status"><div /><section><span>{`${s.mission!.name.toUpperCase()} · ${s.mission!.testDrive ? 'TEST DRIVE · ' : ''}MISSION ${lesson.order}/${s.mission!.count}`}</span><h1>{lesson.title}</h1><p>{s.mission!.drivers ? `${s.mission!.drivers} drove this road` : 'Follow the people ahead'}</p></section><div /></div>}
    {s.toast && !isModal && <aside className={styles.toast} role="status"><span className={styles.eyebrow}>{s.phase === 'roam' ? 'DISTRICT' : s.phase === 'cross' ? 'PREPARATION PACKED' : 'HINDSIGHT COLLECTED'}</span><p>{s.toast}</p></aside>}
    {s.phase === 'pave' && <div className={styles.pave} role="status"><span>The road changes with you</span><strong>One less bump ahead.</strong><small>Your next floor is taking shape.</small></div>}
    {isModal && <div className={styles.backdrop}><section ref={modal} className={`${styles.panel} ${s.paused ? styles.pausePanel : s.phase === 'prepare' ? styles.cinemaPanel : ''}`} role="dialog" aria-modal="true" aria-label={s.paused ? 'City paused' : s.phase === 'prepare' ? 'Choose your preparation' : s.phase === 'rewind' ? 'Rewind 5 seconds' : 'Lesson passed'}>
      {s.paused ? <>
        <span className={styles.eyebrow}>CITY PAUSED</span><h1>Your roads. Your pace.</h1>
        <div className={styles.actions}><button onClick={() => controller.pause()}>Resume</button><button onClick={() => { controller.roam(); onExit(); }}>Back to app</button>{onReset && <button onClick={() => { controller.roam(); progress.reset(); onReset(); }}>Reset demo</button>}</div>
        <div className={styles.pauseGrid}><section><h2>Missions by road</h2><div className={styles.roadList}>{catalogue.map(road => {
          const missions = controller.missions.filter(m => m.roadId === road.id);
          return <div key={road.id}><h3>{road.name}</h3>{missions.length ? missions.map(m => <button key={m.id} onClick={() => { controller.roam(); controller.navigate(m); }}><span>{m.testDrive ? 'Test drive' : progress.done.includes(m.lesson.id) ? 'Passed · replay' : `Mission ${m.lesson.order}`} · {m.lesson.title}</span><b>↗</b></button>) : <p>{road.care ? 'Support at your pace · back to app' : 'Road under review'}</p>}</div>;
        })}</div></section><section><h2>Passport · {progress.done.length}/{lessonsFor(personaId).length}</h2><p>Each passed mission builds your block.</p><div className={styles.stamps}>{lessonsFor(personaId).map(l => <div key={l.id} data-earned={progress.done.includes(l.id)}><span>{progress.done.includes(l.id) ? l.stamp.icon : '○'}</span><strong>{l.stamp.label}</strong><small>{progress.done.includes(l.id) ? l.reward.label : 'Ready when you are'}</small></div>)}</div></section></div>
      </> : s.phase === 'prepare' && lesson ? <>
        <LessonCinema lesson={lesson} initialStep={s.rewinds ? 'apply' : 'guess'} onChoose={id => controller.choose(id)} />
      </> : s.phase === 'rewind' && lesson ? <>
        <span className={styles.eyebrow}>A BUMP. A SECOND CHANCE.</span><h1>Rewind 5 s</h1><p>{lesson.apply.choices.find(c => c.id === s.choice)?.why ?? lesson.apply.explain}</p><p className={styles.muted}>Your hindsight stays with you.</p><button aria-label="Rewind 5 s" onClick={() => controller.rewind()}>↶ Rewind 5 s</button>
      </> : lesson ? <>
        <h1 className={styles.passedTitle}>{s.mission?.testDrive ? 'TEST DRIVE COMPLETE' : 'LESSON PASSED'}</h1><h2>{lesson.title}</h2>
        {s.mission?.testDrive ? <><p>Another road. A new perspective.</p><p className={styles.muted}>Your block and passport stay as they were.</p></> : <><LessonReward lesson={lesson} /><p>{lesson.apply.explain}</p>{lesson.save && <small className={styles.muted}>{formatLessonDate(lesson.save.label)}</small>}</>}
        <div className={styles.actions}>{!s.mission?.testDrive && lesson.save && <button disabled={progress.saved.includes(lesson.save.id)} onClick={() => progress.save(lesson.save!.id)}>{progress.saved.includes(lesson.save.id) ? 'Reminder saved ✓' : 'Save reminder'}</button>}<button onClick={() => controller.roam()}>Keep driving</button></div>
      </> : null}
    </section></div>}
    {!isModal && s.phase !== 'intro' && <div data-city-hud="prompt" className={styles.prompt}>WASD / arrows · Drive <span>Space · Brake</span>{s.phase !== 'roam' && <button onClick={() => controller.driveForMe()}>Drive for me</button>}</div>}
  </div>;
}
