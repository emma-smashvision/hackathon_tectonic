'use client';
import { Canvas } from '@react-three/fiber';
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Lesson } from '@/one/learning';
import { formatLessonDate, lessonFxData, money, type LessonFxData } from './data';
import { LessonScene, type CinemaStep } from './Scene';
import { useLessonMotion } from './motion';
import styles from './lessonfx.module.css';

export type LessonCinemaProps = {
  lesson: Lesson; onChoose: (choiceId: string) => void;
  variant?: 'cinema' | 'plain'; reducedMotion?: boolean; initialStep?: CinemaStep;
  /** Host normally owns the one shared footer. */
  showFooter?: boolean;
};
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function LessonCinema(props: LessonCinemaProps) { return <CinemaSession key={props.lesson.id} {...props} />; }
function CinemaSession({ lesson, onChoose, variant = 'cinema', reducedMotion, initialStep = 'guess', showFooter = false }: LessonCinemaProps) {
  const data = useMemo(() => lessonFxData(lesson), [lesson]);
  const still = useLessonMotion(reducedMotion), [plain, setPlain] = useState(variant === 'plain' || lesson.personaId === 'margaret');
  const [step, setStep] = useState<CinemaStep>(initialStep), [selected, setSelected] = useState(0), [committing, setCommitting] = useState(false);
  const min = Math.min(...data.bars.flatMap(b => b.lower === undefined ? [] : [b.lower]), data.median ?? 0);
  const max = Math.max(min + 1, ...data.bars.flatMap(b => b.upper === undefined ? b.lower === undefined ? [] : [b.lower * 1.25] : [b.upper]), data.median ?? 0);
  const [guess, setGuess] = useState(Math.round((min + max) / 2));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), heading = useRef<HTMLHeadingElement>(null), started = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (started.current) heading.current?.focus(); started.current = true; }, [step, plain]);
  const choose = (id: string, i: number) => { if (committing) return; setSelected(i); setCommitting(true); timer.current = setTimeout(() => onChoose(id), still || plain ? 0 : 650); };
  const isFork = data.forks.length > 0, hasBars = data.bars.some(b => b.share !== undefined);
  const next = () => {
    setSelected(0);
    setStep(step === 'guess' ? hasBars ? 'median' : 'reveal' : step === 'median' ? 'reveal' : step === 'reveal' ? 'helped' : step === 'helped' && lesson.note ? 'note' : 'apply');
  };
  const title = step === 'guess' ? isFork ? 'Two roads. Two time horizons.' : hasBars ? /setting-up|december/.test(lesson.stopId) ? 'What would you expect the cost to be?' : 'What would you expect the bill to be?' : lesson.guess.question || lesson.title
    : step === 'median' ? 'Your guess meets the crowd.' : step === 'reveal' ? isFork ? 'Time changes the picture.' : 'Meet the people behind the number.'
    : step === 'helped' ? 'What helped them through?' : step === 'note' ? 'Someone left you a note.' : 'Your turn. Choose a way forward.';
  const sceneData = step === 'apply' ? { ...data, lanes: lesson.apply.choices.map(c => ({ id: c.id, label: c.label })) } : data;
  const stageProps = { data: sceneData, step, guess: hasBars ? guess : undefined, selectedLane: selected, onSelectLane: setSelected, reducedMotion: still, controlCamera: true, entering: committing };
  return <section className={styles.cinema} data-lessonfx-step={plain ? 'plain' : step} data-reduced-motion={still} aria-label={lesson.title} onKeyDown={e => {
    if (e.key.startsWith('Arrow')) e.stopPropagation();
    if (e.target instanceof HTMLInputElement || plain || !['helped', 'apply'].includes(step)) return;
    const lanes = sceneData.lanes.length;
    if (lanes && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); setSelected(i => (i + (e.key === 'ArrowRight' ? 1 : -1) + lanes) % lanes); }
  }}>
    <header className={styles.header}><span>{lesson.title}</span><button type="button" onClick={() => setPlain(p => !p)}>{plain ? 'Show the road' : 'Plain lessons'}</button></header>
    {plain ? <PlainLesson lesson={lesson} data={data} onChoose={choose} disabled={committing} /> : <>
      <div className={styles.title}><h1 ref={heading} tabIndex={-1}>{title}</h1><p>{step === 'guess' && hasBars ? 'Move your marker. There is no score for guessing.' : step === 'helped' ? 'Each ring shows the share who avoided a strain on their buffer.' : step === 'apply' ? formatLessonDate(lesson.apply.question) : step === 'median' ? data.median === undefined ? 'The typical amount is not published.' : `Typical amount: ${money(data.median)}. Your guess: ${money(guess)}.` : step === 'reveal' ? data.headline : ''}</p></div>
      <div className={styles.stage} aria-hidden="true">
        <SceneBoundary fallback={<div className={styles.unavailable}>The road could not load. Use Plain lessons above.</div>}>
          <Canvas dpr={[1, 1.5]} camera={{ position: [0, 8, 11], fov: 43 }} gl={{ antialias: true, alpha: true }} frameloop={still ? 'demand' : 'always'}><LessonScene {...stageProps} /></Canvas>
        </SceneBoundary>
      </div>
      {step === 'note' && lesson.note && <HologramNote text={lesson.note.text} by={lesson.note.by} reducedMotion={still} />}
      <div className={styles.controls}>
        {step === 'guess' && hasBars && <label className={styles.guess}><span>Your marker <strong>{money(guess)}</strong></span><input aria-label="Your guess in euros" type="range" min={Math.floor(min)} max={Math.ceil(max)} step={1} value={guess} onChange={e => setGuess(+e.target.value)} /><span className={styles.range}><span>{money(min)}</span><span>{money(max)}</span></span></label>}
        {(step === 'guess' || step === 'median') && hasBars && <div className={styles.bands} aria-label="Published amount bands">{data.bars.map(b => <span key={b.id}>{b.label}{b.share === undefined ? '' : ` · ${Math.round(b.share * 100)}%`}</span>)}</div>}
        {isFork && ['guess', 'reveal'].includes(step) && <ForkTable lesson={lesson} />}
        {step === 'reveal' && data.withheld && <p className={styles.muted}>{data.withheld}</p>}
        {step === 'helped' && <div className={styles.lanes}>{data.lanes.map((lane, i) => <button key={lane.id} type="button" aria-pressed={i === selected} onClick={() => setSelected(i)}><span className={styles.ring}>{lane.share === undefined ? '↗' : `${lane.share}%`}</span><span>{lane.label}</span></button>)}</div>}
        {step === 'apply' ? <><div className={styles.lanes}>{lesson.apply.choices.map((c, i) => <button key={c.id} type="button" disabled={committing} aria-pressed={selected === i} onClick={() => choose(c.id, i)}><span className={styles.laneArrow} aria-hidden="true">↗</span><span>{formatLessonDate(c.label)}</span></button>)}</div><p className={styles.muted}>{committing ? 'Your choice is packed.' : 'Choose a lane, or use left / right then the button below.'}</p><button className={styles.next} disabled={committing} onClick={() => choose(lesson.apply.choices[selected].id, selected)}>Take this lane</button></>
          : <button type="button" className={styles.next} onClick={next}>{step === 'guess' ? hasBars ? 'Let the crowd arrive' : isFork ? 'Explore both horizons' : 'Meet the crowd' : step === 'median' ? 'Meet the crowd' : step === 'reveal' ? 'See what helped' : step === 'helped' && lesson.note ? 'Read the note' : 'Try it yourself'}</button>}
        {step === 'helped' && <small className={styles.association}>Associated with these actions, not proof of cause.</small>}
      </div>
    </>}
    {showFooter && <footer className={styles.footer}>Synthetic demo crowd · not a forecast</footer>}
  </section>;
}
export function HologramNote({ text, by, reducedMotion }: { text: string; by: string; reducedMotion?: boolean }) {
  const still = useLessonMotion(reducedMotion), copy = formatLessonDate(text), [length, setLength] = useState(0);
  useEffect(() => { setLength(0); if (still) return; const id = setInterval(() => setLength(n => { if (n >= copy.length) clearInterval(id); return Math.min(n + 3, copy.length); }), 24); return () => clearInterval(id); }, [copy, still]);
  return <blockquote className={styles.note}><span className={styles.srOnly}>{copy}</span><span aria-hidden="true">“{still ? copy : copy.slice(0, length)}<span className={styles.cursor} data-still={still || length === copy.length}>▏</span>”</span><cite>{formatLessonDate(by)}</cite></blockquote>;
}
function ForkTable({ lesson }: { lesson: Lesson }) {
  const table = lesson.reveal.table;
  return table ? <div className={styles.tableWrap}><table><caption>{table.caption}</caption><thead><tr>{table.columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j}>{formatLessonDate(cell)}</td>)}</tr>)}</tbody></table></div> : null;
}
function PlainLesson({ lesson, data, onChoose, disabled }: { lesson: Lesson; data: LessonFxData; onChoose: (id: string, i: number) => void; disabled: boolean }) {
  return <div className={styles.plain}>
    <h1>{lesson.title}</h1><p>{data.headline}</p>{data.median !== undefined && <p>Typical amount: {money(data.median)}.</p>}{lesson.reveal.detail && <p>{formatLessonDate(lesson.reveal.detail)}</p>}
    {data.bars.length > 0 && <details><summary>Amounts in the crowd</summary><ul>{data.bars.map(b => <li key={b.id}>{b.label}{b.share === undefined ? '' : `: ${Math.round(b.share * 100)}%`}</li>)}</ul></details>}
    <ForkTable lesson={lesson} />{data.withheld && <p>{data.withheld}</p>}
    <h2>What helped</h2><ul>{data.lanes.map(l => <li key={l.id}>{l.label}{l.share === undefined ? '' : ` — ${l.share}% avoided a strain on their buffer.`}</li>)}</ul><small>Associated with these actions, not proof of cause.</small>
    {lesson.note && <blockquote><p>“{formatLessonDate(lesson.note.text)}”</p><cite>{formatLessonDate(lesson.note.by)}</cite></blockquote>}
    <h2>{formatLessonDate(lesson.apply.question)}</h2><div className={styles.plainChoices}>{lesson.apply.choices.map((c, i) => <button key={c.id} disabled={disabled} onClick={() => onChoose(c.id, i)}>{formatLessonDate(c.label)}</button>)}</div>
  </div>;
}
export function LessonReward({ lesson, reducedMotion, testDrive = false }: { lesson: Lesson; reducedMotion?: boolean; testDrive?: boolean }) {
  const still = useLessonMotion(reducedMotion);
  return <div className={styles.reward} data-still={still}>
    {!testDrive && <><div className={styles.building} aria-hidden="true">{[0, 1, 2].map(i => <i key={i} style={{ animationDelay: `${i * .18}s` }} />)}</div><div className={styles.stamp}><span>{lesson.stamp.icon}</span><strong>{lesson.stamp.label}</strong><small>Lesson learned</small></div></>}
    <p>{testDrive ? 'A new perspective to take with you.' : lesson.reward.label}</p>
  </div>;
}
