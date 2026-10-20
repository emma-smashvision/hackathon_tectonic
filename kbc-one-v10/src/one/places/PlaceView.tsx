'use client';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { money, type Place, type PlaceGoal, type PlaceLesson } from './model';
import styles from './places.module.css';
export type PlaceViewProps = {
  place: Place;
  onClose: () => void;
  /** Fill an existing world panel instead of overlaying its canvas. */
  embedded?: boolean;
  closeLabel?: string;
  /** Host action label; embedded hosts can route every local lesson into their lesson flow. */
  lessonLabel?: string;
  /** Returns a readable validation error, or undefined on success. Local demo only. */
  onMoveToGoal?: (accountId: string, goalId: string, amount: number) => string | undefined;
  onLesson?: (lesson: PlaceLesson) => void;
};
export function PlaceView({ place, onClose, onMoveToGoal, onLesson, embedded = false, closeLabel = 'Back on the road', lessonLabel }: PlaceViewProps) {
  const titleId = useId(), panel = useRef<HTMLElement>(null);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  useEffect(() => {
    // Embedded hosts own focus, scrolling and Escape for their outer panel.
    if (embedded) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); onClose(); }
      if (!embedded && e.key === 'Tab') {
        const items = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]') ?? [])];
        const first = items[0], last = items.at(-1);
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    // Capture on the dialog itself allows native form keys and blocks city controls.
    const element = panel.current;
    element?.addEventListener('keydown', keys);
    return () => { element?.removeEventListener('keydown', keys); previous?.isConnected && previous.focus(); };
  }, [onClose, embedded]);
  return <div className={`${styles.backdrop} ${embedded ? styles.embedded : ''}`} data-place-view={place.id} style={{ '--place-color': place.color } as CSSProperties}>
    <section ref={panel} tabIndex={-1} className={styles.panel} role={embedded ? "region" : "dialog"} aria-modal={embedded ? undefined : true} aria-labelledby={titleId}>
      <header className={styles.header}><div><span className={styles.parked}>{embedded ? 'Your place' : 'P · Parked at your place'}</span><h1 id={titleId}>{place.title}</h1><p>{place.subtitle}</p></div><button className={styles.close} onClick={onClose}>{closeLabel} <span aria-hidden>↗</span></button></header>
      <div className={styles.body}>
        <main className={styles.main}>
          {place.progress && <section className={styles.construction} aria-label={place.progress.label}>
            <div className={styles.progressTitle}><h2>{place.progress.label}</h2><strong>{Math.round(place.progress.percent)}<small>%</small></strong></div>
            {place.progress.payments !== undefined ? <div className={styles.house} role="img" aria-label={`${place.progress.payments} payments made; ${Math.round(place.progress.percent)}% of principal repaid`}>
              <div className={styles.roof}/><div className={styles.bricks}>{Array.from({ length: place.progress.totalPayments ?? 300 }, (_, i) => <i key={i} data-paid={i >= (place.progress!.totalPayments ?? 300) - place.progress!.payments!}/>)}</div><span>{place.progress.payments} payments. Each one a brick.</span>
            </div> : <div className={styles.progressTrack} role="progressbar" aria-label={place.progress.label} aria-valuenow={Math.round(place.progress.percent)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${place.progress.percent}%` }}/></div>}
            <p className={styles.progressDetail}>{place.progress.detail}</p>
          </section>}
          {place.goals.length > 0 && <section className={styles.vault} aria-label="Goal vault"><div className={styles.vaultHeader}><h2>{place.id === 'savings' ? 'Inside your vault' : 'Your goals'}</h2><span>Filled by your savings</span></div><div className={styles.tanks}>{place.goals.map(goal => <GoalTank key={goal.id} goal={goal}/>)}</div></section>}
          {place.id === 'savings' && place.goals.length === 0 && <p>No saved goals in this demo. Your accounts are shown below.</p>}
          {place.accounts.length > 0 && <section className={styles.accounts}><h2>Your accounts</h2>{place.accounts.map(account => <div key={account.id}><span>{account.label}<small>{account.locked ? 'Separate account' : account.monthly ? `${money(account.monthly)}/month standing order` : 'No monthly standing order'}</small></span><strong>{money(account.balance)}</strong></div>)}</section>}
          {place.attachments.length > 0 && <section className={styles.attachments} aria-label="Your cover">{place.attachments.map(a => <div key={a.label} data-state={a.state}><span className={styles.shield} aria-hidden>{a.state === 'ok' ? '✓' : '!'}</span><div><h3>{a.label}{a.state === 'gap' ? ' · gap' : ''}</h3><p>{a.detail}</p></div></div>)}</section>}
          {place.facts.length > 0 && <dl className={styles.facts}>{place.facts.map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}
        </main>
        <aside className={styles.side}>
          {place.id === 'savings' && onMoveToGoal && place.goals.length > 0 && <MoveForm place={place} onMove={onMoveToGoal}/>}
          <section className={styles.lessons}><h2>Learn here</h2>{place.lessons.map(l => <div className={styles.lesson} key={l.id}>
            <h3>{l.title}</h3><p>{l.line}</p>
            <button onClick={() => setActiveLesson(activeLesson === l.id ? null : l.id)} aria-expanded={activeLesson === l.id}>{activeLesson === l.id ? 'Close lesson' : 'Open lesson'} <span aria-hidden>↗</span></button>
            {activeLesson === l.id && <div className={styles.lessonContent}><ol>{l.steps.map(step => <li key={step}>{step}</li>)}</ol>{onLesson && (l.missionId || embedded || lessonLabel) && <button onClick={() => onLesson(l)}>{lessonLabel ?? (embedded ? 'Explore this lesson' : 'Drive this mission')}</button>}<small>A demo lesson, at your own pace.</small></div>}
          </div>)}</section>
        </aside>
      </div>
      <footer className={styles.footer}>Your demo numbers · Synthetic persona data · Goal moves stay in this session and are not real transfers.</footer>
    </section>
  </div>;
}
function GoalTank({ goal }: { goal: PlaceGoal }) {
  return <article className={styles.goal}>
    <div className={styles.tank} role="progressbar" aria-label={goal.label} aria-valuenow={Math.round(goal.percent)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${money(goal.saved)} of ${money(goal.target)} · ${Math.round(goal.percent)}%`}>
      <div className={styles.fill} style={{ height: `${goal.percent}%` }}/><div className={styles.ticks}/><strong>{Math.round(goal.percent)}<small>%</small></strong>
    </div><div className={styles.goalText}><h3>{goal.label}</h3><p><b>{money(goal.saved)}</b> of {money(goal.target)}</p><span>{money(goal.monthly)}/month standing order</span></div>
  </article>;
}
function MoveForm({ place, onMove }: { place: Place; onMove: NonNullable<PlaceViewProps['onMoveToGoal']> }) {
  const [account, setAccount] = useState(place.accounts.find(a => a.id !== 'current' && !a.locked && a.balance > 0)?.id ?? 'current');
  const [goal, setGoal] = useState(place.goals[0]?.id ?? '');
  const [amount, setAmount] = useState('50'), [notice, setNotice] = useState('');
  return <form className={styles.move} onSubmit={event => { event.preventDefault(); const error = onMove(account, goal, Number(amount)); setNotice(error ?? `${money(Number(amount))} moved in this demo. No real transfer was made.`); }}>
    <h2>Move € to a goal</h2><p className={styles.demoBadge}>Demo only · no real transfer</p>
    <label>From account<select value={account} onChange={e => { setAccount(e.target.value); setNotice(''); }}>{place.accounts.filter(a => !a.locked).map(a => <option key={a.id} value={a.id}>{a.label} · {money(a.balance)}</option>)}</select></label>
    <label>To goal<select value={goal} onChange={e => { setGoal(e.target.value); setNotice(''); }}>{place.goals.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
    <label>Amount in euros<input inputMode="decimal" type="number" min="0.01" step="0.01" required value={amount} onChange={e => { setAmount(e.target.value); setNotice(''); }}/></label>
    <button type="submit">Move in demo</button><p className={styles.notice} role="status">{notice || 'Watch your goal fill. Changes stay in this demo session.'}</p>
  </form>;
}
