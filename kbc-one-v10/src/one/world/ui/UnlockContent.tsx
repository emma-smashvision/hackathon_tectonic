"use client";

import { useId, useState } from "react";
import { Icon } from "./Icon";
import styles from "./world.module.css";

/** The parent resolves these labels and actions from the world's unlock rules. */
export type UnlockContentProps = {
  title: string;
  hint: string;
  lifeEvent: string;
  goal: string;
  holding: string;
  onLifeEvent?: () => void;
  onGoal?: (amount: number) => void;
  onExplore: () => void;
};

export function UnlockContent({ title, hint, lifeEvent, goal, holding, onLifeEvent, onGoal, onExplore }: UnlockContentProps) {
  const [choice, setChoice] = useState<"life" | "goal" | null>(null);
  const [amount, setAmount] = useState("");
  const inputId = useId();
  const validAmount = Number(amount) > 0 && Number.isFinite(Number(amount));
  return <section className={styles.unlock} aria-label={`Unlock ${title}`}>
    <div className={styles.unlockHeading}><Icon name="key" size={32} /><div><h3>A place for your next chapter</h3><p>{hint}</p></div></div>
    <p className={styles.muted}>An area opens when it fits your life. Choose a key, or have a look around first.</p>
    <ol className={styles.unlockKeys}>
      <li><Icon name="world" /><div><h4>A life event</h4><p>{lifeEvent}</p>{onLifeEvent && <button type="button" className={styles.textAction} onClick={() => setChoice(choice === "life" ? null : "life")}>This is in my plans<Icon name="arrow" size={16} /></button>}</div></li>
      <li><Icon name="savings" /><div><h4>A goal of your own</h4><p>{goal}</p>{onGoal && <button type="button" className={styles.textAction} onClick={() => setChoice(choice === "goal" ? null : "goal")}>Set a goal<Icon name="arrow" size={16} /></button>}</div></li>
      <li><Icon name="key" /><div><h4>What you already have</h4><p>{holding}</p><small>Matching accounts and products open their area automatically.</small></div></li>
    </ol>
    {choice === "life" && onLifeEvent && <div className={styles.unlockConfirm}><p>{lifeEvent}</p><p className={styles.small}>Confirm this plan for your demo world. You can clear it with Reset demo.</p><button type="button" className={styles.primary} onClick={onLifeEvent}>Confirm and open {title}</button></div>}
    {choice === "goal" && onGoal && <form className={styles.unlockConfirm} onSubmit={event => { event.preventDefault(); if (validAmount) onGoal(Number(amount)); }}><label htmlFor={inputId}>Your goal amount (€)</label><input id={inputId} type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Any amount" required /><p className={styles.small}>Any amount opens the area. Growth follows your own goal. This saves a demo plan; no money moves.</p><button type="submit" className={styles.primary} disabled={!validAmount}>Save goal and open {title}</button></form>}
    <button type="button" className={styles.button} onClick={onExplore}><Icon name="ahead" />Explore {title}<Icon name="arrow" size={16} /></button>
    <p className={styles.small}>Explore changes nothing in your world. You never need to buy a product to unlock an area.</p>
  </section>;
}
