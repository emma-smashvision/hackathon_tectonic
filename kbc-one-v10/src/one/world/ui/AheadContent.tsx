import type { WorldAhead } from "../types";
import { Icon } from "./Icon";
import { crowdPercent } from "./presentation";
import styles from "./world.module.css";

export function AheadContent({ ahead, onReturn }: { ahead: WorldAhead; onReturn: () => void }) {
  return <>
    <p className={styles.muted}>A shared picture from people further along this road. Explore it, then return to your own pace.</p>
    {!ahead.available ? <p className={styles.notice}>{ahead.reason ?? "There is not a large enough group to show this view."}</p> : <>
      {ahead.denominator.shown && ahead.denominator.value !== null && <div className={styles.metric}><Icon name="world" size={28} /><strong>{new Intl.NumberFormat("en-GB").format(ahead.denominator.value)}</strong><span>people in this synthetic group<br />No individual world is shown</span></div>}
      <p className={styles.small}>{ahead.basis}</p>
      <h3>What the demo group built first</h3>
      {ahead.buildOrder.length ? <ol className={styles.aheadList}>{ahead.buildOrder.map(item => <li key={`${item.areaId}:${item.order}`}><strong>{item.title}</strong>{item.share.shown && <p>{crowdPercent(item.share)} of this demo group</p>}</li>)}</ol> : <p className={styles.muted}>The source does not record build order yet.</p>}
      <h3>Where storms caught people out</h3>
      {ahead.stormHits.length ? <div>{ahead.stormHits.map(hit => <div className={styles.metric} key={`${hit.roadId}:${hit.stopId}`}><Icon name="storm" /><span>{hit.title}{hit.denominator.shown && hit.denominator.value !== null && <small style={{ display: "block" }}>{new Intl.NumberFormat("en-GB").format(hit.denominator.value)} people on this road</small>}</span>{hit.share.shown && hit.share.value !== null && <strong>{crowdPercent(hit.share)}</strong>}</div>)}</div> : <p className={styles.muted}>There are no crowd figures for storms here yet.</p>}
    </>}
    <button type="button" className={styles.primary} onClick={onReturn}><Icon name="back" />Return to my world</button>
    <p className={styles.small}>Visiting changes nothing in your own world.</p>
  </>;
}
