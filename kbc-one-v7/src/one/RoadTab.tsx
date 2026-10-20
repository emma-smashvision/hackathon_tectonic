"use client";

import { type CSSProperties, useState } from "react";
import { useStore } from "../hindsight/components/store";
import { Icon } from "../hindsight/components/ui";
import { MONTH_SHORT } from "../hindsight/engine/everyday";
import { euro } from "../hindsight/engine/format";
import { slotsFor, todayWhen, whenLabel } from "../hindsight/engine/plan";
import { maskMoney } from "../hindsight/engine/world";
import { PEOPLE } from "./people";
import {
  type Asset,
  type ComingItem,
  assetsFor,
  comingUp,
  progress,
  plainPlanText,
} from "./yourroad/model";
import { roadmapFor } from "./roadmap/model";
import { MapRoad } from "./roadmap/MapRoad";
import { PlanSheet, Sheet } from "./yourroad/Sheet";

export function RoadTab({
  themeStyle,
  light,
  large,
  onCity,
}: {
  themeStyle: CSSProperties;
  light: boolean;
  large: boolean;
  onCity?: (focus?: string) => void;
}) {
  const s = useStore();
  const { road, life, person, journey } = s;
  const simple = large || !!person?.noGame;
  const care = road.care;
  const map = !simple && !care && person && PEOPLE[person.key] ? roadmapFor(PEOPLE[person.key], s) : null;
  const [asset, setAsset] = useState<Asset | null>(null);
  const [advisor, setAdvisor] = useState(false);
  const [notice, setNotice] = useState("");
  const [showAll, setShowAll] = useState(false);
  const assets = assetsFor(person ? PEOPLE[person.key] : undefined, life);
  const items = comingUp(life, road, s.plan, simple ? 3 : 5);
  const nextJourney = items.find((item) => item.kind === "journey");
  const shown =
    simple || showAll
      ? items
      : nextJourney && !items.slice(0, 3).includes(nextJourney)
        ? [...items.slice(0, 2), nextJourney]
        : items.slice(0, 3);
  const visibleComing = !care || journey.careOptIn;
  const money = (value: string) => (s.hideAmounts ? maskMoney(value) : value);
  const tell = (text: string) => setNotice(text);
  const prepare = (item: ComingItem) => {
    if (item.action) {
      s.toggleAction(item.action.key, item.action.id);
      tell(`${item.action.label}. Added to your plan.`);
    } else if (item.reminder && item.ready < 100) {
      s.addPlanItem(item.reminder);
      tell(`Reminder set for ${item.title}. Your payments stay the same.`);
    }
  };
  const firstAction = items.find(
    (item) => item.action || (item.reminder && item.ready < 100),
  );
  const advisorName = s.advisor?.name ?? "KBC Live";
  return (
    <div
      className={`hs road-layer yr ${light ? "light" : ""} ${simple ? "yr-simple" : ""} ${care ? "care" : ""}`}
      style={themeStyle}
    >
      <div className="phone road-phone">
        <div className={`phone-body yr-body ${map ? "rm-body" : ""}`}>
          {map ? <MapRoad map={map} assets={assets} onAsset={setAsset} onCity={onCity} /> : <>
          <header className="yr-heading">
            <div>
              <h1>
                Your road{simple ? `, ${road.persona.name.split(" ")[0]}` : ""}
              </h1>
              <p>
                {care
                  ? "One thing at a time. We're here to help."
                  : "What you have. What's coming next."}
              </p>
            </div>
            {s.plan.length > 0 ? (
              <button
                className="yr-link"
                onClick={() => {
                  setNotice("");
                  s.go({ name: "route" });
                }}
              >
                Your plan ({s.plan.length})
              </button>
            ) : (
              !simple &&
              !care && (
                <span className="yr-orbit" aria-hidden="true">
                  <Icon name="road" size={25} />
                </span>
              )
            )}
          </header>
          {care && (
            <section className="yr-advisor">
              <Icon name="heart" size={25} />
              <div>
                <h2>You can start with a person</h2>
                <p>{advisorName} can help with the next steps, at your pace.</p>
                <button className="yr-button" onClick={() => setAdvisor(true)}>
                  Talk to {advisorName}
                </button>
              </div>
            </section>
          )}
          <section className="yr-section" aria-labelledby="yr-have">
            <h2 id="yr-have">What you have</h2>
            <div className="yr-assets">
              {assets.map((a) =>
                simple ? (
                  <div className="yr-sentence" key={a.id}>
                    <p>{money(a.sentence)}</p>
                  </div>
                ) : (
                  <button
                    className={`yr-asset yr-asset-${a.id}`}
                    key={a.id}
                    onClick={() => setAsset(a)}
                    aria-label={`${a.title}: ${money(a.value)}. View details`}
                  >
                    <span className="yr-asset-name">
                      <Icon
                        name={
                          a.id === "home"
                            ? "home"
                            : a.id === "car"
                              ? "shield"
                              : a.id === "pension"
                                ? "heart"
                                : "bank"
                        }
                        size={16}
                      />
                      {a.title}
                      <span className="yr-chevron" aria-hidden="true">
                        ›
                      </span>
                    </span>
                    <strong>{money(a.value)}</strong>
                    <span className="yr-value-label">{a.label}</span>
                    <span className="yr-product">{money(a.summary)}</span>
                  </button>
                ),
              )}
            </div>
            {!simple && !care && (
              <p className="yr-buffer">
                <Icon name="shield" size={14} />
                <span>
                  Buffer: <b>{Math.max(0, life.fuel).toFixed(1)} months</b> of
                  bills and everyday costs
                </span>
              </p>
            )}
          </section>
          {visibleComing ? (
            <section className="yr-section" aria-labelledby="yr-coming">
              <div className="yr-section-head">
                <h2 id="yr-coming">
                  {simple ? "Next three things" : "Coming up on your road"}
                </h2>
                {!simple && items.length > 3 && (
                  <button
                    className="yr-link"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? "Show 3" : `See all ${items.length}`}
                  </button>
                )}
              </div>
              {simple ? (
                <ol className="yr-simple-next">
                  {shown.map((item) => (
                    <li key={item.id}>
                      <b>
                        {item.when.day} {MONTH_SHORT[item.when.month]}.
                      </b>{" "}
                      {item.title}
                      {item.amount != null
                        ? `, ${money(euro(Math.abs(item.amount)))}`
                        : ""}
                      .
                    </li>
                  ))}
                </ol>
              ) : (
                <ol className="yr-timeline">
                  {shown.map((item) => (
                    <li key={item.id}>
                      <time
                        dateTime={`${item.when.year}-${String(item.when.month + 1).padStart(2, "0")}-${String(item.when.day).padStart(2, "0")}`}
                      >
                        <b>{item.when.day}</b>
                        {MONTH_SHORT[item.when.month]}
                      </time>
                      <div className="yr-event">
                        <h3>{item.title}</h3>
                        <p>
                          {item.amount != null
                            ? `${money(euro(Math.abs(item.amount)))} · `
                            : ""}
                          {item.amountLabel || "Your journey"}
                        </p>
                        <div className="yr-event-foot">
                          <span className={item.ready >= 100 ? "yr-ready" : ""}>
                            {Math.round(item.ready)}% ready
                            {item.kind === "bill" && item.ready === 100
                              ? " · reminder set"
                              : ""}
                          </span>
                          {(item.action || item.reminder) && (
                            <button
                              disabled={!item.action && item.ready >= 100}
                              onClick={() => prepare(item)}
                              aria-label={`${item.action?.label ?? "Set reminder"} for ${item.title}`}
                            >
                              {item.action
                                ? "Prepare"
                                : item.ready >= 100
                                  ? "Prepared ✓"
                                  : "Remind me"}
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {!items.length && (
                <p className="yr-muted">
                  Nothing needs your attention right now.
                </p>
              )}
            </section>
          ) : (
            <button className="yr-button yr-secondary" onClick={s.optInCare}>
              Show the next steps when I'm ready
            </button>
          )}
          {life.goals.length > 0 && (
            <section className="yr-section" aria-labelledby="yr-goals">
              <h2 id="yr-goals">Your goals</h2>
              <div className="yr-goals">
                {life.goals.map((g) => (
                  <div className="yr-goal" key={g.id}>
                    <div>
                      <h3>{g.label}</h3>
                      <span>{progress(g.saved, g.target)}%</span>
                    </div>
                    <progress
                      value={Math.min(g.saved, g.target)}
                      max={g.target || 1}
                      aria-label={`${g.label} progress`}
                    />
                    <p>
                      {money(`${euro(g.saved)} of ${euro(g.target)}`)}
                      {g.eta
                        ? ` · ${MONTH_SHORT[g.eta.month]} ${g.eta.year}`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
          </>}
        </div>
        {!map && <footer className="yr-footer">
          {simple && (
            <div className="yr-big-actions">
              <button
                className="yr-button"
                disabled={!firstAction}
                onClick={() => firstAction && prepare(firstAction)}
              >
                {firstAction
                  ? firstAction.action
                    ? "Prepare the next step"
                    : `Remind me about ${firstAction.title}`
                  : "Your reminders are set"}
              </button>
              <button
                className="yr-button yr-secondary"
                onClick={() => setAdvisor(true)}
              >
                Talk to {advisorName}, my advisor
              </button>
            </div>
          )}
          {!simple && !care && (
            <button
              className="yr-city"
              onClick={() => s.testDrive(road.id, journey.month)}
            >
              <Icon name="atlas" size={22} />
              <span>
                Explore it in your city
                <small>A different view of the same story</small>
              </span>
              <span aria-hidden="true">↗</span>
            </button>
          )}
        </footer>}
        {notice && (
          <div className="yr-notice" role="status">
            <Icon name="check" size={18} />
            <span>{money(notice)}</span>
            <button
              aria-label="Dismiss confirmation"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}
        {s.screen.name === "route" && (
          <PlanSheet onClose={() => s.go({ name: "today" })} />
        )}
        {asset && (
          <Sheet title={asset.title} onClose={() => setAsset(null)}>
            <p className="yr-detail-value">
              {money(asset.value)} <span>{asset.label}</span>
            </p>
            <p>{money(asset.sentence)}</p>
            <h3>Your products</h3>
            <ul className="yr-products">
              {asset.products.map((p, i) => (
                <li key={`${p.name}-${i}`}>
                  <b>{p.name}</b>
                  <span>{money(p.detail)}</span>
                </li>
              ))}
            </ul>
            <h3>Next step</h3>
            <button
              className="yr-button"
              onClick={() => {
                if (asset.coverId) {
                  if (!(journey.cover ?? []).includes(asset.coverId))
                    s.checkCover(asset.coverId);
                  tell("Your home cover is marked as reviewed in your plan.");
                  setAsset(null);
                } else {
                  setAsset(null);
                  setAdvisor(true);
                }
              }}
            >
              {asset.next}
            </button>
          </Sheet>
        )}
        {advisor && (
          <Sheet
            title={`Talk to ${advisorName}`}
            onClose={() => setAdvisor(false)}
          >
            <p>
              {care
                ? "A quiet conversation, when you want it. Choose a time that suits you."
                : "Choose a time to review your next steps together."}
            </p>
            <div className="yr-slots">
              {slotsFor(s.advisor, todayWhen(life)).map((slot) => (
                <button
                  className="yr-button yr-secondary"
                  key={slot.id}
                  onClick={() => {
                    s.addPlanItem(
                      {
                        id: `yourroad:advisor:${person?.key ?? road.id}`,
                        source: {
                          scope: "place",
                          roadId: road.id,
                          key: "advisor",
                        },
                        spec: {
                          kind: care ? "talk" : "book",
                          title: `Talk with ${slot.with}`,
                          detail: "Review your next steps together.",
                          topic: care ? "Life events" : "Your plan",
                        },
                      },
                      slot,
                    );
                    setAdvisor(false);
                    tell(`Booked: ${whenLabel(slot.when)} with ${slot.with}.`);
                  }}
                >
                  <span>{slot.with}</span>
                  <small>{whenLabel(slot.when)}</small>
                </button>
              ))}
            </div>
          </Sheet>
        )}
      </div>
    </div>
  );
}
